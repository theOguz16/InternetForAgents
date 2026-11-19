import { type Manifest } from "../capabilities/manifest.js";
import { CardValidationError, type RegistryCard } from "../capabilities/agent-card.js";
import { profiles } from "../shared/contracts.js";

// Eski metin profilleri yalnızca manifestsiz legacy kayıt yoluna izole edilir;
// manifest kaydı ve keşif filtrelemesi bu sabit listeye bağlı değildir.
const LEGACY_TEXT_PROFILES: ReadonlySet<string> = new Set(Object.values(profiles));

export interface LegacyRegistrationRequest {
  readonly kind: "legacy";
  readonly cardUrl: URL;
}

export interface ManifestRegistrationRequest {
  readonly kind: "manifest";
  readonly cardUrl: URL;
  readonly manifestUrl: URL;
}

export type RegistrationRequest = LegacyRegistrationRequest | ManifestRegistrationRequest;

export interface LegacyAgentRegistration {
  readonly kind: "legacy";
  readonly cardUrl: string;
  readonly name: string;
  readonly endpoint: string;
  readonly profiles: string[];
  readonly registeredAt: string;
}

export interface ManifestAgentRegistration {
  readonly kind: "manifest";
  readonly cardUrl: string;
  readonly name: string;
  readonly endpoint: string;
  readonly profiles: string[];
  readonly registeredAt: string;
  readonly manifestUrl: string;
  readonly manifest: Manifest;
}

export type AgentRegistration = LegacyAgentRegistration | ManifestAgentRegistration;

export interface BaseAgentEntry {
  id: string;
  cardUrl: string;
  name: string;
  profiles: string[];
  endpoint: string;
  registeredAt: string;
}

export interface LegacyAgentEntry extends BaseAgentEntry {
  manifestUrl?: never;
  manifest?: never;
  capabilityDigests?: never;
}

export interface ManifestAgentEntry extends BaseAgentEntry {
  manifestUrl: string;
  manifest: Manifest;
  capabilityDigests: Record<string, string>;
}

export type Entry = LegacyAgentEntry | ManifestAgentEntry;

export class RegistrationRequestError extends Error {
  constructor(readonly status: 400 | 422, readonly code: string) {
    super(code);
  }
}

/**
 * Kayıt türünü diskten okunan mevcut snapshot'larla geriye uyumlu biçimde ayırır:
 * wire/SQLite JSON'una yeni bir discriminator alanı eklenmez.
 */
export function isManifestEntry(entry: Entry): entry is ManifestAgentEntry {
  return entry.manifest !== undefined;
}

/**
 * Gelen kayıt gövdesini ağ isteği yapmadan önce legacy veya manifest DTO'suna ayırır.
 * Böylece izin dışı origin/path kombinasyonları dış ağa çıkmadan reddedilir.
 */
export function parseRegistrationRequest(body: unknown, allowedOrigins: Set<string>): RegistrationRequest {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new RegistrationRequestError(400, "invalid_registration");
  }
  const record = body as Record<string, unknown>;
  if (typeof record.cardUrl !== "string" || Object.keys(record).some(key => !["cardUrl", "manifestUrl"].includes(key))) {
    throw new RegistrationRequestError(400, "invalid_registration");
  }
  let cardUrl: URL;
  try {
    cardUrl = new URL(record.cardUrl);
  } catch {
    throw new RegistrationRequestError(422, "card_validation_failed");
  }
  if (
    !allowedOrigins.has(cardUrl.origin)
    || cardUrl.username
    || cardUrl.password
    || cardUrl.pathname !== "/.well-known/agent-card.json"
    || cardUrl.search
    || cardUrl.hash
  ) {
    throw new RegistrationRequestError(422, "card_url_not_allowed");
  }
  if (record.manifestUrl === undefined) {
    return { kind: "legacy", cardUrl };
  }
  // Mevcut HTTP kontratıyla uyum için string olmayan veya geçersiz manifestUrl 422 döner.
  if (typeof record.manifestUrl !== "string") {
    throw new RegistrationRequestError(422, "card_validation_failed");
  }
  let manifestUrl: URL;
  try {
    manifestUrl = new URL(record.manifestUrl);
  } catch {
    throw new RegistrationRequestError(422, "card_validation_failed");
  }
  if (
    manifestUrl.origin !== cardUrl.origin
    || manifestUrl.username
    || manifestUrl.password
    || manifestUrl.pathname !== "/ifa/capabilities.json"
    || manifestUrl.search
    || manifestUrl.hash
  ) {
    throw new RegistrationRequestError(422, "card_validation_failed");
  }
  return { kind: "manifest", cardUrl, manifestUrl };
}

/**
 * Manifestsiz kayıt yalnızca eski metin profillerinin kesişimini kabul eder;
 * tanınmayan skill'ler manifestsiz genel keşfe açılmaz.
 */
export function createLegacyRegistration(card: RegistryCard, cardUrl: URL, registeredAt: string): LegacyAgentRegistration {
  const supported = card.skillIds.filter(id => LEGACY_TEXT_PROFILES.has(id));
  if (!supported.length) {
    throw new CardValidationError("no_supported_skill", "/card/skills");
  }
  return {
    kind: "legacy",
    cardUrl: cardUrl.href,
    name: card.name,
    endpoint: card.endpoint,
    profiles: supported,
    registeredAt,
  };
}

/**
 * Manifestli kayıtta desteklenen yetenekler yalnızca doğrulanmış manifestteki
 * capability kimliklerinden üretilir; karttaki ek skill'ler sızdırılmaz ve yeni
 * namespace'ler sabit listeye takılmadan korunur.
 */
export function createManifestRegistration(
  card: RegistryCard,
  cardUrl: URL,
  manifest: Manifest,
  manifestUrl: URL,
  registeredAt: string,
): ManifestAgentRegistration {
  return {
    kind: "manifest",
    cardUrl: cardUrl.href,
    name: card.name,
    endpoint: card.endpoint,
    profiles: manifest.capabilities.map(cap => cap.id),
    registeredAt,
    manifestUrl: manifestUrl.href,
    manifest,
  };
}

/**
 * Keşif filtrelemesi sabit profil listesine bağlı değildir: manifest kaydında
 * doğrudan manifest capability kimliği, legacy kayıtta kayıt anındaki profil listesi aranır.
 */
export function matchesProfileFilter(entry: Entry, profile: string): boolean {
  if (isManifestEntry(entry)) {
    return entry.manifest.capabilities.some(cap => cap.id === profile);
  }
  return entry.profiles.includes(profile);
}
