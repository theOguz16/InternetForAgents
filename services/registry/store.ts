import { DatabaseSync } from "node:sqlite";
import { capabilityDigest, type Manifest } from "../capabilities/manifest.js";
import { randomUUID } from "node:crypto";

export interface Entry {
  id: string;
  cardUrl: string;
  name: string;
  profiles: string[];
  endpoint: string;
  registeredAt: string;
  manifestUrl?: string;
  manifest?: Manifest;
  capabilityDigests?: Record<string, string>;
}
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
  save(value: Omit<Entry, "id">): { entry: Entry; created: boolean } {
    // Kartın ağdan okunması bittikten sonra kısa bir transaction açılır.
    // Aynı adres yeniden kaydedilirse kimlik korunur; UNIQUE ikinci kayıt oluşmasını engeller.
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const existing = this.db.prepare("SELECT id FROM agents WHERE card_url=?").get(value.cardUrl);
      if (!existing && Number(this.db.prepare("SELECT COUNT(*) AS total FROM agents").get()?.total) >= 100) throw new RegistryCapacityError();
      // Sürüm kaydı agent snapshot'ıyla aynı transaction'da saklanır; eski sürümün
      // başka içerikle tekrar tanıtılması güncelleme sırasında da engellenir.
      const digests: Record<string, string> = {};
      for (const cap of value.manifest?.capabilities ?? []) {
        const digest = capabilityDigest(cap);
        const prior = this.db.prepare("SELECT digest FROM capability_versions WHERE id=? AND version=?").get(cap.id, cap.version);
        if (prior && prior.digest !== digest) throw new CapabilityVersionConflict("capability_version_conflict");
        this.db.prepare("INSERT OR IGNORE INTO capability_versions VALUES (?, ?, ?)").run(cap.id, cap.version, digest);
        digests[`${cap.id}@${cap.version}`] = digest;
      }
      const entry: Entry = { ...value, ...(value.manifest ? { capabilityDigests: digests } : {}), id: existing ? String(existing.id) : randomUUID() };
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
