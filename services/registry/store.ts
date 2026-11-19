import { DatabaseSync } from "node:sqlite";
import { capabilityDigest } from "../capabilities/manifest.js";
import { randomUUID } from "node:crypto";
import { type AgentRegistration, type Entry, type LegacyAgentEntry, type ManifestAgentEntry } from "./registration.js";

export type { AgentRegistration, Entry, LegacyAgentEntry, ManifestAgentEntry };
export class CapabilityVersionConflict extends Error {}
export class RegistryCapacityError extends Error {}
export class RegistryStore {
  private db: DatabaseSync;
  readonly storage: "memory" | "sqlite";
  constructor(path: string) {
    this.storage = path === ":memory:" ? "memory" : "sqlite";
    this.db = new DatabaseSync(path);
    this.db.exec("PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=3000;");
    this.db.exec(`CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY, card_url TEXT NOT NULL UNIQUE, body TEXT NOT NULL
    )`);
    this.db.exec("CREATE TABLE IF NOT EXISTS capability_versions (id TEXT NOT NULL, version TEXT NOT NULL, digest TEXT NOT NULL, PRIMARY KEY(id, version))");
  }
  list(): Entry[] {
    return this.db.prepare("SELECT body FROM agents ORDER BY id").all().map(row => JSON.parse(String(row.body)));
  }
  get(id: string): Entry | undefined {
    const row = this.db.prepare("SELECT body FROM agents WHERE id=?").get(id);
    return row ? JSON.parse(String(row.body)) : undefined;
  }
  save(value: AgentRegistration): { entry: Entry; created: boolean } {
    // Tip sistemi dışından gelen çağrılarda eksik veya belirsiz kayıt türünü erken reddederiz.
    if (!value || (value.kind !== "legacy" && value.kind !== "manifest")) {
      throw new TypeError("invalid_registration_kind");
    }
    if (value.kind === "manifest" && (typeof value.manifestUrl !== "string" || !value.manifest || !Array.isArray(value.manifest.capabilities))) {
      throw new TypeError("invalid_manifest_registration");
    }
    // Kartın ağdan okunması bittikten sonra kısa bir transaction açılır.
    // Aynı adres yeniden kaydedilirse kimlik korunur; UNIQUE ikinci kayıt oluşmasını engeller.
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const existing = this.db.prepare("SELECT id FROM agents WHERE card_url=?").get(value.cardUrl);
      if (!existing && Number(this.db.prepare("SELECT COUNT(*) AS total FROM agents").get()?.total) >= 100) throw new RegistryCapacityError();
      const id = existing ? String(existing.id) : randomUUID();
      let entry: Entry;
      if (value.kind === "manifest") {
        // Sürüm kaydı agent snapshot'ıyla aynı transaction'da saklanır; eski sürümün
        // başka içerikle tekrar tanıtılması güncelleme sırasında da engellenir.
        const digests: Record<string, string> = {};
        for (const cap of value.manifest.capabilities) {
          const digest = capabilityDigest(cap);
          const prior = this.db.prepare("SELECT digest FROM capability_versions WHERE id=? AND version=?").get(cap.id, cap.version);
          if (prior && prior.digest !== digest) throw new CapabilityVersionConflict("capability_version_conflict");
          this.db.prepare("INSERT OR IGNORE INTO capability_versions VALUES (?, ?, ?)").run(cap.id, cap.version, digest);
          digests[`${cap.id}@${cap.version}`] = digest;
        }
        // profiller doğrudan manifest capability kimliklerinden türetilir; DTO ile manifest arasında kayma oluşmaz.
        entry = {
          id,
          cardUrl: value.cardUrl,
          name: value.name,
          profiles: value.manifest.capabilities.map(cap => cap.id),
          endpoint: value.endpoint,
          registeredAt: value.registeredAt,
          manifestUrl: value.manifestUrl,
          manifest: value.manifest,
          capabilityDigests: digests,
        };
      } else {
        // Legacy kayıtta manifest alanları bilinçli olarak yazılmaz; manifestli bir agent
        // legacy moda geri dönerse eski manifest/digest kalıntısı saklanmaz.
        entry = {
          id,
          cardUrl: value.cardUrl,
          name: value.name,
          profiles: [...value.profiles],
          endpoint: value.endpoint,
          registeredAt: value.registeredAt,
        };
      }
      this.db.prepare("INSERT INTO agents VALUES (?, ?, ?) ON CONFLICT(card_url) DO UPDATE SET body=excluded.body")
        .run(entry.id, entry.cardUrl, JSON.stringify(entry));
      this.db.exec("COMMIT");
      return { entry, created: !existing };
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }
  close() { this.db.close(); }
}
