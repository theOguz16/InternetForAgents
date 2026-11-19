import { createHash, randomUUID } from "node:crypto";
import { profiles, validInput, type Specialist } from "../../shared/contracts.js";
import { createJob, finalStatus, hasCapacity, isExpired, recoverAfterRestart, type IdempotencyRecord, type Job } from "../domain/job.js";
import type { Clock, JobRepository } from "./ports.js";
import { runChild, type ChildDeps } from "./run-child.js";

export type SubmitError = "invalid_idempotency_key" | "invalid_job" | "invalid_text" | "idempotency_conflict" | "job_capacity";
export type SubmitOutcome =
  | { kind: "error"; code: SubmitError }
  | { kind: "existing"; job: Job }
  | { kind: "accepted"; job: Job };

export interface JobServiceDeps extends ChildDeps {
  repository: JobRepository;
  clock: Clock;
  newId?: () => string;
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

  constructor(private readonly deps: JobServiceDeps) {
    const saved = deps.repository.load();
    this.jobs = new Map(saved.jobs);
    this.keys = new Map(saved.keys);
    for (const job of this.jobs.values()) recoverAfterRestart(job);
    this.persist();
  }

  get(id: string): Job | undefined { return this.jobs.get(id); }

  /** Dinleyici her kalıcı revizyondan sonra çağrılır; dönen fonksiyon aboneliği kaldırır. */
  subscribe(id: string, listener: (job: Job) => void): () => void {
    const set = this.listeners.get(id) ?? new Set();
    set.add(listener); this.listeners.set(id, set);
    return () => { set.delete(listener); if (!set.size) this.listeners.delete(id); };
  }

  submit(key: string | undefined, body: unknown): SubmitOutcome {
    if (!key || !/^[\x21-\x7e]{1,128}$/.test(key)) return { kind: "error", code: "invalid_idempotency_key" };
    const request = parseRequest(body);
    if (!request) return { kind: "error", code: "invalid_job" };
    const { skills } = request;
    const input = { profile: profiles[skills[0]], text: request.text };
    if (!validInput(input.profile, input)) return { kind: "error", code: "invalid_text" };
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
      if (existing.hash !== hash) return { kind: "error", code: "idempotency_conflict" };
      return { kind: "existing", job: this.jobs.get(existing.jobId)! };
    }
    if (!hasCapacity(this.jobs.values())) return { kind: "error", code: "job_capacity" };
    const job = createJob((this.deps.newId ?? randomUUID)(), now, skills);
    this.jobs.set(job.id, job); this.keys.set(key, { hash, jobId: job.id });
    this.persist(); // Kabul yanıtından önce iş ve anahtar birlikte kalıcılaştırılır.
    // Yürütme bir sonraki mikro görevde başlar: çağıran kabul snapshot'ını
    // (revision 0) yürütme durumu değişmeden önce yanıtlayabilir.
    queueMicrotask(() => this.dispatch(job, text));
    return { kind: "accepted", job };
  }

  private dispatch(job: Job, text: string) {
    const signal = AbortSignal.timeout(this.deps.deadlineMs ?? 60000);
    // Bağımsız uzmanlar paralel çalışır; birinin hatası diğerinin sonucunu silmez.
    void Promise.allSettled(job.children.map(child => runChild(child, text, this.deps, signal, () => this.publish(job)))).then(() => {
      job.status = finalStatus(job.children);
      this.publish(job);
    });
  }

  private publish(job: Job) {
    job.revision++;
    this.persist(); // Önce diske yazılır; sonra dinleyiciye bildirilen revision kalıcıdır.
    for (const listener of [...this.listeners.get(job.id) ?? []]) listener(job);
  }

  private persist() { this.deps.repository.save({ jobs: [...this.jobs], keys: [...this.keys] }); }
}

function parseRequest(body: unknown): { text: unknown; skills: Specialist[] } | undefined {
  if (!body || typeof body !== "object") return undefined;
  const value = body as Record<string, unknown>;
  if (Object.keys(value).some(name => !["text", "skills"].includes(name)) || !Array.isArray(value.skills)
    || value.skills.length < 1 || value.skills.length > 3 || new Set(value.skills).size !== value.skills.length
    || !value.skills.every(skill => typeof skill === "string" && Object.hasOwn(profiles, skill))) return undefined;
  return { text: value.text, skills: [...value.skills].sort() as Specialist[] };
}
