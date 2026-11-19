import { DatabaseSync } from "node:sqlite";
import { capabilityDigest } from "../capabilities/manifest.js";
import { randomUUID } from "node:crypto";
import { LOCAL_DEMO_PRINCIPAL, type Principal } from "../identity/domain/principal.js";
import { type AgentRegistration, type Entry, type LegacyAgentEntry, type ManifestAgentEntry } from "./registration.js";
import { withLifecycle, type RegistrationStatus } from "./lifecycle.js";

export type { AgentRegistration, Entry, LegacyAgentEntry, ManifestAgentEntry };
export class CapabilityVersionConflict extends Error {}
export class RegistryCapacityError extends Error {}
export class NotOwnerError extends Error { constructor() { super("not_owner"); } }
export class RegistrationSuspendedError extends Error { constructor() { super("registration_suspended"); } }
/** Yeniden doğrulama sürerken kayıt silindi veya başka bir kayıtla değişti. */
export class RegistrationChangedError extends Error { constructor() { super("registration_changed"); } }

/** Resume'un yetkilendirildiği kaydın kimliği; transaction içinde hâlâ aynı kayıt olduğu doğrulanır. */
export interface ResumeTarget { id: string; ownerId: string }

export type AuditAction = "register" | "refresh" | "suspend" | "resume" | "reject" | "delete";
export interface AuditRecord {
  seq: number; at: string; actorId: string; actorRole: string; action: AuditAction;
  agentId: string; fromStatus?: RegistrationStatus; toStatus?: RegistrationStatus; reason?: string;
}

const parse = (body: unknown): Entry => withLifecycle(JSON.parse(String(body))) as Entry;

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
    // Yaşam döngüsü kayıtları yalnız eklenir; kayıt silinse bile izi kalır.
    // Token, kart veya manifest içeriği yazılmaz; yalnız kim, ne, hangi durumdan hangisine.
    this.db.exec(`CREATE TABLE IF NOT EXISTS audit_log (
      seq INTEGER PRIMARY KEY AUTOINCREMENT, at TEXT NOT NULL, actor_id TEXT NOT NULL, actor_role TEXT NOT NULL,
      action TEXT NOT NULL, agent_id TEXT NOT NULL, from_status TEXT, to_status TEXT, reason TEXT)`);
  }
  list(): Entry[] {
    return this.db.prepare("SELECT body FROM agents ORDER BY id").all().map(row => parse(row.body));
  }
  get(id: string): Entry | undefined {
    const row = this.db.prepare("SELECT body FROM agents WHERE id=?").get(id);
    return row ? parse(row.body) : undefined;
  }
  audit(agentId?: string): AuditRecord[] {
    const rows = agentId === undefined
      ? this.db.prepare("SELECT * FROM audit_log ORDER BY seq").all()
      : this.db.prepare("SELECT * FROM audit_log WHERE agent_id=? ORDER BY seq").all(agentId);
    return rows.map(r => ({
      seq: Number(r.seq), at: String(r.at), actorId: String(r.actor_id), actorRole: String(r.actor_role), action: String(r.action) as AuditAction,
      agentId: String(r.agent_id), ...(r.from_status ? { fromStatus: String(r.from_status) as RegistrationStatus } : {}),
      ...(r.to_status ? { toStatus: String(r.to_status) as RegistrationStatus } : {}), ...(r.reason ? { reason: String(r.reason) } : {}),
    }));
  }
  private record(actor: Principal, action: AuditAction, agentId: string, from: RegistrationStatus | undefined, to: RegistrationStatus | undefined, reason: string | undefined, at: string) {
    this.db.prepare("INSERT INTO audit_log (at, actor_id, actor_role, action, agent_id, from_status, to_status, reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .run(at, actor.id, actor.role, action, agentId, from ?? null, to ?? null, reason ?? null);
  }
  private transaction<T>(work: () => T): T {
    this.db.exec("BEGIN IMMEDIATE");
    try { const result = work(); this.db.exec("COMMIT"); return result; }
    catch (error) { this.db.exec("ROLLBACK"); throw error; }
  }

  /**
   * Kaydı oluşturur veya sahibi adına yeniler. Sahiplik kontrolü yazmayla aynı
   * transaction'dadır: kontrol ile yazma arasında başka geliştirici araya giremez.
   * `resume` yalnız askıdaki/reddedilmiş kaydı yeniden etkinleştirmek içindir ve
   * yetkilendirilen kaydın kimliğini taşır: ağ doğrulaması sürerken kayıt silinip
   * aynı adres başka biri tarafından kaydedildiyse yeni kayıt ezilmez (TOCTOU).
   * actor verilmezse local-demo kabul edilir; üretim router'ı her zaman actor verir.
   */
  save(value: AgentRegistration, actor: Principal = LOCAL_DEMO_PRINCIPAL, options: { resume?: ResumeTarget } = {}): { entry: Entry; created: boolean } {
    // Tip sistemi dışından gelen çağrılarda eksik veya belirsiz kayıt türünü erken reddederiz.
    if (!value || (value.kind !== "legacy" && value.kind !== "manifest")) {
      throw new TypeError("invalid_registration_kind");
    }
    if (value.kind === "manifest" && (typeof value.manifestUrl !== "string" || !value.manifest || !Array.isArray(value.manifest.capabilities))) {
      throw new TypeError("invalid_manifest_registration");
    }
    // Kartın ağdan okunması bittikten sonra kısa bir transaction açılır.
    // Aynı adres yeniden kaydedilirse kimlik korunur; UNIQUE ikinci kayıt oluşmasını engeller.
    return this.transaction(() => {
      const row = this.db.prepare("SELECT id, body FROM agents WHERE card_url=?").get(value.cardUrl);
      const previous = row ? parse(row.body) : undefined;
      // Resume hiçbir zaman yeni kayıt yaratmaz; bu yüzden kapasite sınırından önce
      // denetlenir ki silinmiş kayıt için doğru hata (registration_changed) dönsün.
      if (options.resume && (!previous || previous.id !== options.resume.id || previous.ownerId !== options.resume.ownerId)) {
        throw new RegistrationChangedError();
      }
      if (!previous && Number(this.db.prepare("SELECT COUNT(*) AS total FROM agents").get()?.total) >= 100) throw new RegistryCapacityError();
      if (previous && !options.resume) {
        if (previous.ownerId !== actor.id) throw new NotOwnerError();
        // Askıdaki kayıt içerik yenilemesiyle sessizce yeniden açılamaz; açık resume gerekir.
        if (previous.status === "suspended") throw new RegistrationSuspendedError();
      }
      const id = previous ? previous.id : randomUUID();
      const at = new Date().toISOString();
      const lifecycle = {
        ownerId: previous ? previous.ownerId : actor.id,
        status: "active" as const,
        revision: previous ? previous.revision + 1 : 1,
        statusChangedAt: previous?.status === "active" ? previous.statusChangedAt ?? at : at,
      };
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
          id, cardUrl: value.cardUrl, name: value.name, profiles: value.manifest.capabilities.map(cap => cap.id),
          endpoint: value.endpoint, registeredAt: value.registeredAt, ...lifecycle,
          manifestUrl: value.manifestUrl, manifest: value.manifest, capabilityDigests: digests,
        };
      } else {
        // Legacy kayıtta manifest alanları bilinçli olarak yazılmaz; manifestli bir agent
        // legacy moda geri dönerse eski manifest/digest kalıntısı saklanmaz.
        entry = { id, cardUrl: value.cardUrl, name: value.name, profiles: [...value.profiles], endpoint: value.endpoint, registeredAt: value.registeredAt, ...lifecycle };
      }
      this.db.prepare("INSERT INTO agents VALUES (?, ?, ?) ON CONFLICT(card_url) DO UPDATE SET body=excluded.body")
        .run(entry.id, entry.cardUrl, JSON.stringify(entry));
      this.record(actor, options.resume ? "resume" : previous ? "refresh" : "register", id, previous?.status, "active", undefined, at);
      return { entry, created: !previous };
    });
  }

  /** Durum değiştirir (askıya alma veya yeniden doğrulama reddi); içerik snapshot'ı korunur. */
  setStatus(id: string, to: "suspended" | "rejected", actor: Principal, reason?: string): Entry | undefined {
    return this.transaction(() => {
      const row = this.db.prepare("SELECT body FROM agents WHERE id=?").get(id);
      if (!row) return undefined;
      const previous = parse(row.body);
      const at = new Date().toISOString();
      const entry = { ...previous, status: to, revision: previous.revision + 1, statusChangedAt: at, ...(reason ? { statusReason: reason } : {}) } as Entry;
      if (!reason) delete (entry as { statusReason?: string }).statusReason;
      this.db.prepare("UPDATE agents SET body=? WHERE id=?").run(JSON.stringify(entry), id);
      this.record(actor, to === "suspended" ? "suspend" : "reject", id, previous.status, to, reason, at);
      return entry;
    });
  }

  /** Kaydı siler. Sürüm kilitleri (capability_versions) ve audit izi bilerek kalır. */
  remove(id: string, actor: Principal): boolean {
    return this.transaction(() => {
      const row = this.db.prepare("SELECT body FROM agents WHERE id=?").get(id);
      if (!row) return false;
      const previous = parse(row.body);
      this.db.prepare("DELETE FROM agents WHERE id=?").run(id);
      this.record(actor, "delete", id, previous.status, undefined, undefined, new Date().toISOString());
      return true;
    });
  }
  close() { this.db.close(); }
}
