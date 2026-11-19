import { Router, type Response } from "express";
import type { IdentityService } from "../application/identity-service.js";
import { readCookie, SESSION_COOKIE } from "./authenticate.js";

export interface SessionCookieOptions { secure: boolean }

/**
 * Web oturumu: POST /session token'ı cookie'ye çevirir, GET /session mevcut
 * oturumu ve CSRF token'ını verir, DELETE /session çıkış yapar.
 *
 * Giriş isteği yalnız application/json kabul eder (express.json); siteler arası
 * düz form JSON gönderemez ve JSON istek CORS preflight'ına takılır. Böylece
 * saldırganın kurbanı kendi hesabına sokması (login CSRF) engellenir.
 */
export function sessionRouter(identity: IdentityService, cookie: SessionCookieOptions) {
  const router = Router();
  const attributes = (maxAgeSeconds: number) =>
    `Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAgeSeconds}${cookie.secure ? "; Secure" : ""}`;
  const clear = (res: Response) => res.append("Set-Cookie", `${SESSION_COOKIE}=; ${attributes(0)}`);
  router.use("/session", (_req, res, next) => { res.set("Cache-Control", "no-store"); next(); });

  router.post("/session", (req, res) => {
    const body = req.body as unknown;
    const token = body && typeof body === "object" && Object.keys(body).length === 1 ? (body as { token?: unknown }).token : undefined;
    const grant = identity.login(token);
    if (!grant) { res.status(401).json({ error: "invalid_token" }); return; }
    // Cookie ömrü sunucu oturumuyla aynıdır; asıl süre sonu sunucuda denetlenir.
    res.append("Set-Cookie", `${SESSION_COOKIE}=${grant.sessionId}; ${attributes(grant.ttlSeconds)}`);
    res.status(201).json({ principal: grant.principal, csrfToken: grant.csrfToken, expiresAt: grant.expiresAt.toISOString() });
  });

  router.get("/session", (req, res) => {
    const session = identity.resolveSession(readCookie(req.header("cookie"), SESSION_COOKIE));
    if (!session) { res.status(401).json({ error: "unauthenticated" }); return; }
    res.json({ principal: session.principal, csrfToken: session.csrfToken, expiresAt: session.expiresAt.toISOString() });
  });

  router.delete("/session", (req, res) => {
    const sessionId = readCookie(req.header("cookie"), SESSION_COOKIE);
    const session = identity.resolveSession(sessionId);
    // Geçerli oturum varsa çıkış da CSRF ister; yoksa yalnız cookie temizlenir.
    if (session && !identity.checkCsrf(session, req.header("x-csrf-token"))) { res.status(403).json({ error: "csrf_failed" }); return; }
    identity.logout(sessionId);
    clear(res);
    res.status(204).end();
  });
  return router;
}
