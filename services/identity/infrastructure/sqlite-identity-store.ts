import { DatabaseSync } from "node:sqlite";
import type { Role } from "../domain/principal.js";
import type { IdentityRepository, StoredPrincipal, StoredSession } from "../application/ports.js";

type Row = Record<string, unknown>;
const principal = (row: Row): StoredPrincipal => ({
  id: String(row.id), name: String(row.name), role: String(row.role) as Role, tokenHash: String(row.token_hash),
  createdAt: String(row.created_at), ...(row.revoked_at ? { revokedAt: String(row.revoked_at) } : {}),
});
const session = (row: Row): StoredSession => ({
  idHash: String(row.id_hash), principalId: String(row.principal_id), csrfToken: String(row.csrf_token),
  createdAt: String(row.created_at), expiresAt: String(row.expires_at),
});

/** IdentityRepository'nin SQLite uygulaması. */
export class SqliteIdentityStore implements IdentityRepository {
  private db: DatabaseSync;
  constructor(path: string) {
    this.db = new DatabaseSync(path);
    this.db.exec("PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=3000; PRAGMA foreign_keys=ON;");
    this.db.exec(`CREATE TABLE IF NOT EXISTS principals (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('user','developer','operator')),
      token_hash TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL, revoked_at TEXT)`);
    this.db.exec(`CREATE TABLE IF NOT EXISTS sessions (
      id_hash TEXT PRIMARY KEY, principal_id TEXT NOT NULL REFERENCES principals(id) ON DELETE CASCADE,
      csrf_token TEXT NOT NULL, created_at TEXT NOT NULL, expires_at TEXT NOT NULL)`);
  }
  insertPrincipal(p: StoredPrincipal) {
    this.db.prepare("INSERT INTO principals VALUES (?, ?, ?, ?, ?, ?)").run(p.id, p.name, p.role, p.tokenHash, p.createdAt, p.revokedAt ?? null);
  }
  findPrincipal(id: string) {
    const row = this.db.prepare("SELECT * FROM principals WHERE id=?").get(id);
    return row ? principal(row) : undefined;
  }
  findPrincipalByTokenHash(tokenHash: string) {
    const row = this.db.prepare("SELECT * FROM principals WHERE token_hash=?").get(tokenHash);
    return row ? principal(row) : undefined;
  }
  listPrincipals() { return this.db.prepare("SELECT * FROM principals ORDER BY created_at, id").all().map(principal); }
  replaceTokenHash(id: string, tokenHash: string) {
    return Number(this.db.prepare("UPDATE principals SET token_hash=? WHERE id=? AND revoked_at IS NULL").run(tokenHash, id).changes) === 1;
  }
  revokePrincipal(id: string, at: string) {
    return Number(this.db.prepare("UPDATE principals SET revoked_at=? WHERE id=? AND revoked_at IS NULL").run(at, id).changes) === 1;
  }
  insertSession(s: StoredSession) {
    this.db.prepare("INSERT INTO sessions VALUES (?, ?, ?, ?, ?)").run(s.idHash, s.principalId, s.csrfToken, s.createdAt, s.expiresAt);
  }
  findSession(idHash: string) {
    const row = this.db.prepare("SELECT * FROM sessions WHERE id_hash=?").get(idHash);
    return row ? session(row) : undefined;
  }
  deleteSession(idHash: string) { this.db.prepare("DELETE FROM sessions WHERE id_hash=?").run(idHash); }
  deleteSessionsOf(principalId: string) { this.db.prepare("DELETE FROM sessions WHERE principal_id=?").run(principalId); }
  deleteExpiredSessions(nowIso: string) { this.db.prepare("DELETE FROM sessions WHERE expires_at<=?").run(nowIso); }
  sessionsOf(principalId: string) {
    return this.db.prepare("SELECT * FROM sessions WHERE principal_id=? ORDER BY rowid").all(principalId).map(session);
  }
  close() { this.db.close(); }
}
