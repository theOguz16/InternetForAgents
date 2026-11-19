import type { Specialist, SpecialistResult } from "../../shared/contracts.js";

// Domain katmanı yalnız iş kurallarını taşır: Express, SQLite, A2A SDK veya ağ
// erişimi buraya girmez. Tür importları derlemede silinir; çalışma anı bağımlılığı yoktur.

export type ChildState = "discovering" | "working" | "completed" | "failed" | "unknown";
export type JobStatus = "running" | "completed" | "partial" | "failed" | "unknown";

export interface Child {
  skill: Specialist;
  state: ChildState;
  selectedAgent?: { id: string; name: string };
  selectionReason?: string;
  remoteTaskId?: string;
  output?: SpecialistResult;
  error?: string;
}
export interface Job {
  id: string;
  status: JobStatus;
  revision: number;
  createdAt: string;
  children: Child[];
}
export interface IdempotencyRecord { hash: string; jobId: string }
export interface SavedState {
  jobs: [string, Job][];
  keys: [string, IdempotencyRecord][];
}

export const JOB_RETENTION_MS = 86_400_000;
export const MAX_STORED_JOBS = 100;
export const MAX_RUNNING_JOBS = 8;

export function createJob(id: string, createdAt: Date, skills: readonly Specialist[]): Job {
  return { id, status: "running", revision: 0, createdAt: createdAt.toISOString(), children: skills.map(skill => ({ skill, state: "discovering" })) };
}

/** Tüm çocuklar bittikten sonra işin birleşik durumu. */
export function finalStatus(children: readonly Child[]): JobStatus {
  const completed = children.filter(child => child.state === "completed").length;
  return completed === children.length ? "completed" : completed > 0 ? "partial"
    : children.some(child => child.state === "unknown") ? "unknown" : "failed";
}

/**
 * Yeniden başlatmada yarım kalmış işi kapatır; değiştiyse true döner.
 * Uzak uzman çalışmaya devam etmiş olabilir. Yeni iş göndermeyiz; tamamlanan
 * çocukları koruyup yalnız yarım kalanları belirsiz olarak işaretleriz.
 */
export function recoverAfterRestart(job: Job): boolean {
  if (job.status !== "running") return false;
  for (const child of job.children) if (child.state === "discovering" || child.state === "working") {
    child.state = "unknown"; child.error = "personal_restarted";
  }
  const completed = job.children.filter(child => child.state === "completed").length;
  // Yarım kalan çocuk "failed" sayılmaz: sonucunu bilmiyoruz, bu yüzden en kötü durum "unknown".
  job.status = completed === job.children.length ? "completed" : completed > 0 ? "partial" : "unknown";
  job.revision++;
  return true;
}

export function isExpired(job: Job, now: Date): boolean {
  return job.status !== "running" && now.getTime() - Date.parse(job.createdAt) >= JOB_RETENTION_MS;
}

export function hasCapacity(jobs: Iterable<Job>): boolean {
  let total = 0, running = 0;
  for (const job of jobs) { total++; if (job.status === "running") running++; }
  return total < MAX_STORED_JOBS && running < MAX_RUNNING_JOBS;
}
