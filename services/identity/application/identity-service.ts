import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { ROLES, type Principal, type Role } from "../domain/principal.js";
import type { Clock, IdentityRepository, StoredPrincipal } from "./ports.js";

// Token 256 bit rastgele olduğundan kaba kuvvet pratik değildir; bu yüzden
// yavaş parola hash'i (scrypt) yerine SHA-256 yeterlidir ve hash ile arama yapılabilir.
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const secret = (prefix: string) => `${prefix}_${randomBytes(32).toString("base64url")}`;
const shape = (prefix: string) => new RegExp(`^${prefix}_[A-Za-z0-9_-]{43}$`);
const TOKEN = shape("ifa"), SESSION = shape("ifs");

export interface SessionGrant { sessionId: string; csrfToken: string; expiresAt: Date; ttlSeconds: number; principal: Principal }
export interface ResolvedSession { principal: Principal; csrfToken: string; expiresAt: Date }
export interface IdentityOptions { sessionTtlMs: number; maxSessionsPerPrincipal: number }

const DEFAULTS: IdentityOptions = { sessionTtlMs: 8 * 60 * 60 * 1000, maxSessionsPerPrincipal: 10 };
const view = ({ id, name, role }: StoredPrincipal): Principal => ({ id, name, role });

/** Principal yaşam döngüsü, token doğrulama ve web oturumu. HTTP'den bağımsızdır. */
export class IdentityService {
  private readonly options: IdentityOptions;
  constructor(private readonly repository: IdentityRepository, private readonly clock: Clock, options: Partial<IdentityOptions> = {}) {
    this.options = { ...DEFAULTS, ...options };
  }

  /** Token yalnız burada düz metin olarak döner; tekrar gösterilemez. */
  createPrincipal(name: string, role: Role): { principal: Principal; token: string } {
    if (typeof name !== "string" || !/^[\p{L}\p{N} ._-]{1,64}$/u.test(name) || !name.trim()) throw new Error("invalid_name");
    if (!ROLES.includes(role)) throw new Error("invalid_role");
    const token = secret("ifa");
    const stored: StoredPrincipal = { id: randomUUID(), name, role, tokenHash: hash(token), createdAt: this.clock.now().toISOString() };
    this.repository.insertPrincipal(stored);
    return { principal: view(stored), token };
  }

  list(): (Principal & { createdAt: string; revokedAt?: string })[] {
    return this.repository.listPrincipals().map(({ tokenHash: _hidden, ...rest }) => rest);
  }

  /** Yeni token üretir; eski token ve tüm açık oturumlar geçersiz olur. */
  rotateToken(id: string): string | undefined {
    const current = this.repository.findPrincipal(id);
    if (!current || current.revokedAt) return undefined;
    const token = secret("ifa");
    // Okuma ile yazma arasında principal iptal edilmiş olabilir; yazılmamış
    // bir token'ı geçerliymiş gibi döndürmeyiz. Oturumlar her durumda kapanır.
    const replaced = this.repository.replaceTokenHash(id, hash(token));
    this.repository.deleteSessionsOf(id);
    return replaced ? token : undefined;
  }

  revoke(id: string): boolean {
    const revoked = this.repository.revokePrincipal(id, this.clock.now().toISOString());
    if (revoked) this.repository.deleteSessionsOf(id);
    return revoked;
  }

  authenticateToken(token: unknown): Principal | undefined {
    if (typeof token !== "string" || !TOKEN.test(token)) return undefined;
    const found = this.repository.findPrincipalByTokenHash(hash(token));
    return found && !found.revokedAt ? view(found) : undefined;
  }

  login(token: unknown): SessionGrant | undefined {
    const principal = this.authenticateToken(token);
    if (!principal) return undefined;
    const now = this.clock.now();
    this.repository.deleteExpiredSessions(now.toISOString());
    // Oturum sayısı sınırlıdır; yeni giriş en eski oturumu kapatır, tablo sınırsız büyümez.
    const existing = this.repository.sessionsOf(principal.id);
    for (const old of existing.slice(0, Math.max(0, existing.length - this.options.maxSessionsPerPrincipal + 1))) this.repository.deleteSession(old.idHash);
    const sessionId = secret("ifs");
    const csrfToken = secret("ifc");
    const expiresAt = new Date(now.getTime() + this.options.sessionTtlMs);
    this.repository.insertSession({ idHash: hash(sessionId), principalId: principal.id, csrfToken, createdAt: now.toISOString(), expiresAt: expiresAt.toISOString() });
    return { sessionId, csrfToken, expiresAt, ttlSeconds: Math.floor(this.options.sessionTtlMs / 1000), principal };
  }

  resolveSession(sessionId: unknown): ResolvedSession | undefined {
    if (typeof sessionId !== "string" || !SESSION.test(sessionId)) return undefined;
    const idHash = hash(sessionId);
    const session = this.repository.findSession(idHash);
    if (!session) return undefined;
    if (Date.parse(session.expiresAt) <= this.clock.now().getTime()) { this.repository.deleteSession(idHash); return undefined; }
    const principal = this.repository.findPrincipal(session.principalId);
    if (!principal || principal.revokedAt) return undefined;
    return { principal: view(principal), csrfToken: session.csrfToken, expiresAt: new Date(session.expiresAt) };
  }

  /** CSRF token'ı oturumla sabit zamanlı karşılaştırılır. */
  checkCsrf(session: ResolvedSession, provided: unknown): boolean {
    if (typeof provided !== "string") return false;
    const a = Buffer.from(hash(provided)), b = Buffer.from(hash(session.csrfToken));
    return timingSafeEqual(a, b);
  }

  logout(sessionId: unknown) {
    if (typeof sessionId === "string" && SESSION.test(sessionId)) this.repository.deleteSession(hash(sessionId));
  }
}
