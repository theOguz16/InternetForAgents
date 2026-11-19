import type { Principal } from "../domain/principal.js";

export interface StoredPrincipal extends Principal {
  tokenHash: string;
  createdAt: string;
  revokedAt?: string;
}
export interface StoredSession {
  idHash: string;
  principalId: string;
  csrfToken: string;
  createdAt: string;
  expiresAt: string;
}

/** DB portu. Token ve session kimliği yalnız hash olarak saklanır. */
export interface IdentityRepository {
  insertPrincipal(principal: StoredPrincipal): void;
  findPrincipal(id: string): StoredPrincipal | undefined;
  findPrincipalByTokenHash(tokenHash: string): StoredPrincipal | undefined;
  listPrincipals(): StoredPrincipal[];
  replaceTokenHash(id: string, tokenHash: string): boolean;
  revokePrincipal(id: string, at: string): boolean;
  insertSession(session: StoredSession): void;
  findSession(idHash: string): StoredSession | undefined;
  deleteSession(idHash: string): void;
  deleteSessionsOf(principalId: string): void;
  deleteExpiredSessions(nowIso: string): void;
  /** Principal'ın oturumlarını eskiden yeniye döner. */
  sessionsOf(principalId: string): StoredSession[];
}

export interface Clock { now(): Date }
