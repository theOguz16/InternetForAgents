import { Router } from "express";
import { can } from "../identity/domain/principal.js";
import { principalOf } from "../identity/http/authenticate.js";

/** authenticate() middleware'inden sonra bağlanır. */
export function registryGateway(registryOrigin: string) {
  const router = Router();
  router.use((_req, res, next) => { if (principalOf(res)) next(); else res.status(401).json({ error: "unauthenticated" }); });
  // Kayıt yalnız developer rolüne açıktır. Kaydın sahibine bağlanması ve başkasının
  // kaydını güncellemenin reddi Registry tarafında C01 kapsamındadır.
  router.post("/agents", (_req, res, next) => {
    if (can(principalOf(res), "registration.create")) next(); else res.status(403).json({ error: "forbidden" });
  });
  // Tarayıcı uzak URL seçemez: yalnız yapılandırılmış Registry'nin iki işlemi açılır.
  // Bu yerel demo geçididir; paylaşılan kurulumdan önce kullanıcı yetkisi eklenmelidir.
  router.route('/agents').get(async (_req, res) => {
    try {
      const upstream = await fetch(new URL('/v1/agents', registryOrigin), { redirect: 'error', signal: AbortSignal.timeout(5000) });
      res.status(upstream.status).json(await upstream.json());
    } catch { res.status(503).json({ error: 'Registry’ye ulaşılamadı.' }); }
  }).post(async (req, res) => {
    try {
      const upstream = await fetch(new URL('/v1/agents', registryOrigin), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(req.body), redirect: 'error', signal: AbortSignal.timeout(5000) });
      res.status(upstream.status).json(await upstream.json());
    } catch { res.status(503).json({ error: 'Registry’ye ulaşılamadı; kayıt durumu belirsiz olabilir.' }); }
  });
  return router;
}
