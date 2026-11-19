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
  /** İşi oluşturan principal. Sahip dışındaki herkes için iş yokmuş gibi davranılır. */
  ownerId: string;
  status: JobStatus;
  revision: number;
  createdAt: string;
  children: Child[];
}
export interface IdempotencyRecord { hash: string; jobId: string }
export interface SavedState {
  /** 2: işler sahipli, idempotency anahtarları sahibe göre ayrık. Yoksa E01 öncesi biçim. */
  version?: 2;
  jobs: [string, Job][];
  keys: [string, IdempotencyRecord][];
}

/** E01 öncesi kayıtlar anonim yerel demoda oluşturuldu; sahipleri local-demo principal'ıdır. */
export const LEGACY_OWNER_ID = "local-demo";

/**
 * Idempotency anahtarı çağıran principal'a göre ayrılır (TH05): iki kullanıcının
 * aynı anahtarı çatışmaz ve 409 yanıtı başkasının işinin varlığını sızdırmaz.
 * Anahtar karakter kümesi boşluk içermediği için ayraç belirsiz değildir.
 */
export function scopedKey(ownerId: string, key: string): string { return `${ownerId} ${key}`; }

/** Eski biçimdeki kaydı yerinde dönüştürür; zaten güncelse dokunmaz. */
export function migrateSavedState(state: SavedState): SavedState {
  if (state.version === 2) return state;
  return {
    version: 2,
    jobs: state.jobs.map(([id, job]) => [id, { ...job, ownerId: job.ownerId ?? LEGACY_OWNER_ID }]),
    keys: state.keys.map(([key, record]) => [scopedKey(LEGACY_OWNER_ID, key), record]),
  };
}

export const JOB_RETENTION_MS = 86_400_000;
export const MAX_STORED_JOBS = 100;
export const MAX_RUNNING_JOBS = 8;

export function createJob(id: string, ownerId: string, createdAt: Date, skills: readonly Specialist[]): Job {
  return { id, ownerId, status: "running", revision: 0, createdAt: createdAt.toISOString(), children: skills.map(skill => ({ skill, state: "discovering" })) };
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
