import { createHash, randomUUID } from "node:crypto";
import { profiles, validInput, type Specialist } from "../../shared/contracts.js";
import { can, type Principal } from "../../identity/domain/principal.js";
import { createJob, finalStatus, hasCapacity, isExpired, migrateSavedState, recoverAfterRestart, scopedKey, type IdempotencyRecord, type Job } from "../domain/job.js";
import { noopTelemetry, safeEvent, safeMetric, type JobRepository, type Telemetry } from "./ports.js";
import { runChild, type ChildDeps } from "./run-child.js";

export type SubmitError = "forbidden" | "invalid_idempotency_key" | "invalid_job" | "invalid_text" | "idempotency_conflict" | "job_capacity";
export type SubmitOutcome =
  | { kind: "error"; code: SubmitError }
  | { kind: "existing"; job: Job }
  | { kind: "accepted"; job: Job };

export interface JobServiceDeps extends ChildDeps {
  repository: JobRepository;
  newId?: () => string;
  newTraceId?: () => string;
  deadlineMs?: number;
}

/**
 * Personal iş kullanım durumları: gönderim, okuma ve değişiklik aboneliği.
 * HTTP'den bağımsızdır; router yalnız sonucu durum koduna çevirir.
 */
export class JobService {
  private readonly jobs: Map<string, Job>;
  private readonly keys: Map<string, IdempotencyRecord>;
  private readonly listeners = new Map<string, Set<(job: Job) => void>>();
  private readonly telemetry: Telemetry;

  constructor(private readonly deps: JobServiceDeps) {
    this.telemetry = deps.telemetry ?? noopTelemetry;
    const saved = migrateSavedState(deps.repository.load());
    this.jobs = new Map(saved.jobs);
    this.keys = new Map(saved.keys);
    for (const job of this.jobs.values()) recoverAfterRestart(job);
    this.persist();
  }

  /** Görünmeyen iş ile olmayan iş ayırt edilmez; ikisi de undefined döner (404). */
  get(principal: Principal, id: string): Job | undefined {
    const job = this.jobs.get(id);
    return job && can(principal, "job.read", { ownerId: job.ownerId }) ? job : undefined;
  }

  /** Dinleyici her kalıcı revizyondan sonra çağrılır; dönen fonksiyon aboneliği kaldırır. */
  subscribe(id: string, listener: (job: Job) => void): () => void {
    const set = this.listeners.get(id) ?? new Set();
    set.add(listener); this.listeners.set(id, set);
    return () => { set.delete(listener); if (!set.size) this.listeners.delete(id); };
  }

  submit(principal: Principal, rawKey: string | undefined, body: unknown): SubmitOutcome {
    if (!can(principal, "job.create")) return this.rejectSubmit("forbidden");
    if (!rawKey || !/^[\x21-\x7e]{1,128}$/.test(rawKey)) return this.rejectSubmit("invalid_idempotency_key");
    const key = scopedKey(principal.id, rawKey);
    const request = parseRequest(body);
    if (!request) return this.rejectSubmit("invalid_job");
    const { skills } = request;
    const input = { profile: profiles[skills[0]], text: request.text };
    if (!validInput(input.profile, input)) return this.rejectSubmit("invalid_text");
    const { text } = input;
    // Metni job snapshot'ında saklamayız; idempotency karşılaştırmasında yalnız hash tutulur.
    const hash = createHash("sha256").update(JSON.stringify({ text, skills })).digest("hex");
    // Süre sonu temizliği istek sırasında yapılır; arka planda sorgulama döngüsü gerekmez.
    const now = this.deps.clock.now();
    for (const [id, job] of this.jobs) if (isExpired(job, now)) {
      this.jobs.delete(id);
      for (const [storedKey, value] of this.keys) if (value.jobId === id) this.keys.delete(storedKey);
    }
    this.persist();
    const existing = this.keys.get(key);
    if (existing) {
      if (existing.hash !== hash) return this.rejectSubmit("idempotency_conflict");
      safeMetric(this.telemetry, { name: "personal_job_submissions_total", kind: "counter", value: 1, labels: { outcome: "existing", errorCode: "none" } });
      return { kind: "existing", job: this.jobs.get(existing.jobId)! };
    }
    if (!hasCapacity(this.jobs.values())) return this.rejectSubmit("job_capacity");
    const job = createJob((this.deps.newId ?? randomUUID)(), principal.id, now, skills);
    const traceId = (this.deps.newTraceId ?? randomUUID)();
    this.jobs.set(job.id, job); this.keys.set(key, { hash, jobId: job.id });
    this.persist(); // Kabul yanıtından önce iş ve anahtar birlikte kalıcılaştırılır.
    safeEvent(this.telemetry, {
      at: now.toISOString(),
      event: "job.accepted",
      traceId,
      jobId: job.id,
      outcome: "accepted",
    });
    safeMetric(this.telemetry, { name: "personal_job_submissions_total", kind: "counter", value: 1, labels: { outcome: "accepted", errorCode: "none" } });
    safeMetric(this.telemetry, { name: "personal_jobs_running", kind: "gauge", value: this.runningCount() });
    // Yürütme bir sonraki mikro görevde başlar: çağıran kabul snapshot'ını
    // (revision 0) yürütme durumu değişmeden önce yanıtlayabilir.
    queueMicrotask(() => this.dispatch(job, text, traceId, now.getTime()));
    return { kind: "accepted", job };
  }

  private rejectSubmit(code: SubmitError): SubmitOutcome {
    safeMetric(this.telemetry, { name: "personal_job_submissions_total", kind: "counter", value: 1, labels: { outcome: "rejected", errorCode: code } });
    return { kind: "error", code };
  }

  private runningCount(): number {
    let running = 0;
    for (const job of this.jobs.values()) if (job.status === "running") running++;
    return running;
  }

  private dispatch(job: Job, text: string, traceId: string, acceptedAtMs: number) {
    const dispatchStart = this.deps.clock.now().getTime();
    safeMetric(this.telemetry, {
      name: "personal_job_queue_wait_ms",
      kind: "histogram",
      value: Math.max(0, dispatchStart - acceptedAtMs),
    });
    const signal = AbortSignal.timeout(this.deps.deadlineMs ?? 60000);
    // Bağımsız uzmanlar paralel çalışır; birinin hatası diğerinin sonucunu silmez.
    void Promise.allSettled(
      job.children.map(child => runChild(child, text, this.deps, signal, () => this.publish(job), { traceId, jobId: job.id })),
    ).then(() => {
      job.status = finalStatus(job.children);
      this.publish(job, () => {
        // Önce kalıcılaştırılır, sonra son iz ve metrik yazılır, en son abonelere bildirilir;
        // böylece abone tamamlanmayı gözlediğinde iz ve metrikler hazır olur.
        const endNow = this.deps.clock.now();
        const durationMs = Math.max(0, endNow.getTime() - acceptedAtMs);
        safeEvent(this.telemetry, {
          at: endNow.toISOString(),
          event: "job.finished",
          traceId,
          jobId: job.id,
          outcome: job.status,
          durationMs,
        });
        safeMetric(this.telemetry, { name: "personal_jobs_total", kind: "counter", value: 1, labels: { outcome: job.status } });
        safeMetric(this.telemetry, { name: "personal_job_duration_ms", kind: "histogram", value: durationMs, labels: { outcome: job.status } });
        safeMetric(this.telemetry, { name: "personal_jobs_running", kind: "gauge", value: this.runningCount() });
      });
    });
  }

  private publish(job: Job, afterPersist?: () => void) {
    job.revision++;
    this.persist(); // Önce diske yazılır; sonra dinleyiciye bildirilen revision kalıcıdır.
    afterPersist?.();
    for (const listener of [...this.listeners.get(job.id) ?? []]) listener(job);
  }

  private persist() { this.deps.repository.save({ version: 2, jobs: [...this.jobs], keys: [...this.keys] }); }
}

function parseRequest(body: unknown): { text: unknown; skills: Specialist[] } | undefined {
  if (!body || typeof body !== "object") return undefined;
  const value = body as Record<string, unknown>;
  if (Object.keys(value).some(name => !["text", "skills"].includes(name)) || !Array.isArray(value.skills)
    || value.skills.length < 1 || value.skills.length > 3 || new Set(value.skills).size !== value.skills.length
    || !value.skills.every(skill => typeof skill === "string" && Object.hasOwn(profiles, skill))) return undefined;
  return { text: value.text, skills: [...value.skills].sort() as Specialist[] };
}
