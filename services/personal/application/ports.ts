import type { SpecialistResult } from "../../shared/contracts.js";
import type { SavedState } from "../domain/job.js";
import type { ProviderCandidate } from "../domain/provider-selection.js";

// Uygulama katmanının dış dünyaya açılan portları. Somut uygulamalar
// infrastructure/ altındadır ve yalnız composition root'ta (services/main.ts) bağlanır.

/** DB portu: iş ve idempotency anahtarları tek yazımda birlikte saklanır. */
export interface JobRepository {
  load(): SavedState;
  save(state: SavedState): void;
}

/** Saat portu: süre sonu ve oluşturma zamanı testte sabitlenebilsin diye. */
export interface Clock { now(): Date }

export type DiscoveryCode = "discovery_failed" | "invalid_registry_response" | "no_provider";
export class DiscoveryError extends Error {
  constructor(readonly code: DiscoveryCode) { super(code); }
}

/** Network portu (keşif): profile uyan adayları döner; hata durumunda DiscoveryError atar. */
export interface ProviderDirectory {
  find(profile: string, signal: AbortSignal): Promise<ProviderCandidate[]>;
}

export interface RemoteOutcome {
  terminal: "completed" | "failed" | "unknown";
  result?: SpecialistResult;
}
export interface ExecutionHooks {
  /** Uzak görev kimliği öğrenildiği anda çağrılır; yayın yapmaz. */
  taskIdentified(remoteTaskId: string): void;
  /** Her akış olayının sonunda çağrılır; ilerleme yayını tetikler. */
  progressed(): void;
}
export interface SpecialistSession {
  /** Görevi gönderir. Buradan atılan her hata, işin uzakta başlamış olabileceği anlamına gelir. */
  execute(text: string, hooks: ExecutionHooks): Promise<RemoteOutcome>;
}
/** Network portu (yürütme): bağlantı kurma ve gönderme ayrıdır; bağlantı hatası işi göndermez. */
export interface SpecialistGateway {
  connect(provider: ProviderCandidate, profile: string, signal: AbortSignal): Promise<SpecialistSession>;
}

export type TraceEventName =
  | "job.accepted"
  | "step.discovered"
  | "step.dispatched"
  | "step.remote_task"
  | "step.finished"
  | "job.finished";

/**
 * İz olayının izinli alan sözleşmesi (TH06).
 * Kullanıcı metni, çıktı/artifact, token, cookie, CSRF veya ownerId buraya eklenmez.
 */
export interface TraceEvent {
  at: string;
  event: TraceEventName;
  traceId: string;
  jobId: string;
  childId?: string;
  agentId?: string;
  remoteTaskId?: string;
  outcome?: string;
  errorCode?: string;
  durationMs?: number;
}

export type MetricKind = "counter" | "histogram" | "gauge";
export type MetricName =
  | "personal_job_submissions_total"
  | "personal_jobs_total"
  | "personal_job_duration_ms"
  | "personal_job_queue_wait_ms"
  | "personal_jobs_running"
  | "personal_steps_total"
  | "personal_step_duration_ms";

/** Yalnız sınırlı kümeli etiketler kabul edilir; jobId/agentId etiket olmaz (cardinality). */
export interface MetricLabels {
  skill?: string;
  outcome?: string;
  errorCode?: string;
}

export interface MetricSample {
  name: MetricName;
  kind: MetricKind;
  value: number;
  labels?: MetricLabels;
}

/** Gözlemlenebilirlik portu: olay ve metrik kaydı. Somut uygulama infrastructure/ altındadır. */
export interface Telemetry {
  event(entry: TraceEvent): void;
  metric(sample: MetricSample): void;
}

/** Telemetri bağlanmayan testlerin sessiz ve değişmeden çalışması için boş uygulama. */
export const noopTelemetry: Telemetry = { event() {}, metric() {} };

/** Telemetri yazım/serileştirme hataları iş akışını hiçbir koşulda kesmemelidir. */
export function safeEvent(telemetry: Telemetry, entry: TraceEvent): void {
  try { telemetry.event(entry); } catch { /* gözlem yan etkisi iş akışını durdurmaz */ }
}

/** Metrik toplama hatası iş akışını hiçbir koşulda kesmemelidir. */
export function safeMetric(telemetry: Telemetry, sample: MetricSample): void {
  try { telemetry.metric(sample); } catch { /* gözlem yan etkisi iş akışını durdurmaz */ }
}
