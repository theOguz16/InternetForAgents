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
