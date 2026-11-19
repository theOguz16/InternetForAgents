import type { NextFunction, Request, RequestHandler, Response } from "express";
import { LOCAL_DEMO_PRINCIPAL, type Principal } from "../domain/principal.js";
import type { IdentityService } from "../application/identity-service.js";

export type AuthMode = "required" | "local-demo";
export const SESSION_COOKIE = "ifa_session";
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function readCookie(header: string | undefined, name: string): string | undefined {
  for (const part of (header ?? "").split(";")) {
    const index = part.indexOf("=");
    if (index > 0 && part.slice(0, index).trim() === name) return part.slice(index + 1).trim();
  }
  return undefined;
}

export function principalOf(res: Response): Principal | undefined {
  return res.locals.principal as Principal | undefined;
}

function unauthorized(res: Response) {
  res.set("WWW-Authenticate", "Bearer").status(401).json({ error: "unauthenticated" });
}

/**
 * Kimliği res.locals.principal'a bağlar. Sıra: Bearer token (API istemcisi),
 * sonra session cookie (web). Gönderilmiş ama geçersiz kimlik bilgisi local-demo
 * modunda bile anonim kullanıcıya düşürülmez; aksi halde süresi dolan oturum
 * fark edilmeden demo principal'ı ile işlem yapardı.
 */
export function authenticate(identity: IdentityService, mode: AuthMode): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const authorization = req.header("authorization");
    if (authorization !== undefined) {
      const match = /^Bearer ([^\s]+)$/.exec(authorization);
      const principal = match ? identity.authenticateToken(match[1]) : undefined;
      if (!principal) { unauthorized(res); return; }
      // Tarayıcı Authorization başlığını kendiliğinden göndermez; CSRF denetimi gerekmez.
      res.locals.principal = principal; next(); return;
    }
    const sessionId = readCookie(req.header("cookie"), SESSION_COOKIE);
    if (sessionId !== undefined) {
      const session = identity.resolveSession(sessionId);
      if (!session) { unauthorized(res); return; }
      // Cookie her siteler arası istekte gönderilebilir; durum değiştiren istek
      // yalnız aynı origin'in okuyabildiği CSRF token'ı ile kabul edilir.
      if (!SAFE_METHODS.has(req.method) && !identity.checkCsrf(session, req.header("x-csrf-token"))) {
        res.status(403).json({ error: "csrf_failed" }); return;
      }
      res.locals.principal = session.principal; next(); return;
    }
    if (mode === "local-demo") { res.locals.principal = LOCAL_DEMO_PRINCIPAL; next(); return; }
    unauthorized(res);
  };
}
