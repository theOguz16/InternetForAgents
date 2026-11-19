import { Router, type Request, type Response } from "express";
import { can } from "../identity/domain/principal.js";
import { principalOf } from "../identity/http/authenticate.js";
import { PRINCIPAL_HEADER, signPrincipal } from "../identity/infrastructure/principal-assertion.js";

/**
 * authenticate() middleware'inden sonra bağlanır. Tarayıcı uzak URL seçemez:
 * yalnız yapılandırılmış Registry'nin sabit işlemleri açılır. Principal, paylaşılan
 * secret varsa her istekte imzalanıp Registry'ye iletilir (C01); sahiplik ve
 * yaşam döngüsü kararını Registry verir. Secret yoksa başlık gönderilmez ve
 * Registry yalnız local-demo modunda değişiklik kabul eder.
 */
export function registryGateway(registryOrigin: string, options: { secret?: string } = {}) {
  const router = Router();
  router.use((_req, res, next) => { if (principalOf(res)) next(); else res.status(401).json({ error: "unauthenticated" }); });
  // Kayıt yalnız developer rolüne açıktır; erken red Registry'ye gereksiz ağ çağrısı yapmaz.
  router.post("/agents", (_req, res, next) => {
    if (can(principalOf(res), "registration.create")) next(); else res.status(403).json({ error: "forbidden" });
  });
  // Yol parametresi yalnız Registry'nin ürettiği UUID biçimindedir; başka yol enjekte edilemez.
  router.param("id", (_req, res, next, id: string) => {
    if (/^[0-9a-f-]{36}$/.test(id)) next(); else res.status(404).json({ error: "agent_not_found" });
  });

  const forward = (method: "GET" | "POST" | "DELETE", path: (req: Request) => string, failure: string) => async (req: Request, res: Response) => {
    const target = path(req);
    const headers: Record<string, string> = {};
    if (method === "POST") headers["Content-Type"] = "application/json";
    if (options.secret) headers[PRINCIPAL_HEADER] = signPrincipal(principalOf(res)!, options.secret, { method, path: target });
    try {
      const upstream = await fetch(new URL(target, registryOrigin), {
        method, headers, redirect: "error", signal: AbortSignal.timeout(5000),
        ...(method === "POST" ? { body: JSON.stringify(req.path === "/agents" ? req.body : {}) } : {}),
      });
      if (upstream.status === 204) { res.status(204).end(); return; }
      res.status(upstream.status).json(await upstream.json());
    } catch { res.status(503).json({ error: failure }); }
  };
  router.get("/agents", forward("GET", () => "/v1/agents", "Registry’ye ulaşılamadı."));
  router.post("/agents", forward("POST", () => "/v1/agents", "Registry’ye ulaşılamadı; kayıt durumu belirsiz olabilir."));
  router.get("/agents/:id", forward("GET", req => `/v1/agents/${req.params.id}`, "Registry’ye ulaşılamadı."));
  router.post("/agents/:id/suspend", forward("POST", req => `/v1/agents/${req.params.id}/suspend`, "Registry’ye ulaşılamadı; durum belirsiz olabilir."));
  router.post("/agents/:id/resume", forward("POST", req => `/v1/agents/${req.params.id}/resume`, "Registry’ye ulaşılamadı; durum belirsiz olabilir."));
  router.delete("/agents/:id", forward("DELETE", req => `/v1/agents/${req.params.id}`, "Registry’ye ulaşılamadı; silme durumu belirsiz olabilir."));
  return router;
}
