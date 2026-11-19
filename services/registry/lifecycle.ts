import { can, type Principal } from "../identity/domain/principal.js";

// Kayıt yaşam döngüsü kuralları (C01). Doğrulama eşzamanlıdır: başarılı kayıt
// doğrudan active olur; askıya alınan kayıt yeniden etkinleştirilirken kart ve
// manifest yeniden doğrulanır, başarısızsa rejected olur.
export type RegistrationStatus = "active" | "suspended" | "rejected";
export const LEGACY_OWNER_ID = "local-demo";

export interface Lifecycle {
  ownerId: string;
  status: RegistrationStatus;
  revision: number;
  statusReason?: string;
  statusChangedAt?: string;
}

/** Sahip kendi kaydını, operatör herkesinkini askıya alır/etkinleştirir/siler. */
export function mayManage(principal: Principal | undefined, entry: Lifecycle): boolean {
  return can(principal, "registration.update", { ownerId: entry.ownerId }) || can(principal, "registration.suspend", { ownerId: entry.ownerId });
}

/** Kart/manifest yenileme yalnız sahibine açıktır; operatör başkasının içeriğini yazamaz. */
export function mayRefresh(principal: Principal | undefined, entry: Lifecycle): boolean {
  return can(principal, "registration.update", { ownerId: entry.ownerId });
}

/** Kapalı (active olmayan) kayıt keşifte hiç görünmez. */
export function discoverable(entry: Lifecycle): boolean { return entry.status === "active"; }

/** Kapalı kayıt tekil okumada yalnız sahibine ve operatöre görünür; diğerlerine yokmuş gibi davranılır. */
export function readable(principal: Principal | undefined, entry: Lifecycle): boolean {
  return discoverable(entry) || mayManage(principal, entry);
}

/** C01 öncesi kayıtlar anonim yerel demoda oluşturuldu: sahipleri local-demo, durumları active. */
export function withLifecycle<T extends object>(raw: T & Partial<Lifecycle>): T & Lifecycle {
  return { ...raw, ownerId: raw.ownerId ?? LEGACY_OWNER_ID, status: raw.status ?? "active", revision: raw.revision ?? 1 };
}
