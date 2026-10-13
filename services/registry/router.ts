import { Router } from "express";
import { randomUUID } from "node:crypto";
import { profiles } from "../shared/contracts.js";

// Yalnızca operatörün seçtiği sabit origin'lere erişilir; redirect takip edilmez.
// Yerel geliştirme politikasıdır; paylaşılan ağ için DNS/IP sabitleme ve kimlik gerekir.
export function registryRouter(allowedOrigins: Set<string>) {
  const router = Router();
  type Entry = { id: string; cardUrl: string; name: string; profiles: string[]; endpoint: string; registeredAt: string };
  const entries = new Map<string, Entry>();
  router.post("/agents", async (req, res) => {
    const body = req.body;
    if (!body || typeof body.cardUrl !== "string" || Object.keys(body).some(key => key !== "cardUrl")) {
      res.status(400).json({ error: "invalid_registration" }); return;
    }
    try {
      const url = new URL(body.cardUrl);
      if (!allowedOrigins.has(url.origin) || url.username || url.password || url.pathname !== "/.well-known/agent-card.json" || url.search || url.hash) {
        res.status(422).json({ error: "card_url_not_allowed" }); return;
      }
      const response = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(3000), headers: { accept: "application/json" } });
      if (!response.ok || !response.headers.get("content-type")?.includes("application/json")) throw new Error("card_fetch_failed");
      // Kart gövdesini sınırsız belleğe almamak için akışı boyut sınırıyla okuruz.
      const reader = response.body?.getReader();
      if (!reader) throw new Error("empty_card");
      let size = 0; const chunks: Uint8Array[] = [];
      try {
        while (true) {
          const { done, value } = await reader.read(); if (done) break;
          size += value.byteLength;
          if (size > 65536) throw new Error("card_too_large");
          chunks.push(value);
        }
      } finally { await reader.cancel(); }
      const card = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      const endpoint = Array.isArray(card.supportedInterfaces) && card.supportedInterfaces.find((item: any) => item.protocolBinding === "JSONRPC" && item.protocolVersion === "1.0");
      const supported = Array.isArray(card.skills) ? [...new Set<string>(card.skills.map((skill: any) => skill.id).filter((id: unknown) => Object.values(profiles).includes(id as any)))] : [];
      if (typeof card.name !== "string" || !card.name.trim() || card.name.length > 200 || !endpoint || !supported.length || card.capabilities?.streaming !== true) throw new Error("incompatible_card");
      const rpc = new URL(endpoint.url);
      if (rpc.origin !== url.origin || rpc.username || rpc.password || rpc.pathname !== "/a2a" || rpc.search || rpc.hash) throw new Error("invalid_endpoint");
      const existing = [...entries.values()].find(entry => entry.cardUrl === url.href);
      if (!existing && entries.size >= 100) { res.status(409).json({ error: "registry_capacity" }); return; }
      const entry: Entry = { id: existing?.id ?? randomUUID(), cardUrl: url.href, name: card.name, profiles: supported, endpoint: rpc.href, registeredAt: new Date().toISOString() };
      entries.set(entry.id, entry);
      res.status(existing ? 200 : 201).json(entry);
    } catch {
      res.status(422).json({ error: "card_validation_failed" });
    }
  });
  router.get("/agents", (req, res) => {
    const profile = req.query.profile;
    if (profile !== undefined && (typeof profile !== "string" || !Object.values(profiles).includes(profile as any))) { res.status(400).json({ error: "invalid_profile" }); return; }
    // Bu kayıt anındaki snapshot'tır; anlık erişilebilirlik veya güven puanı değildir.
    res.json({ agents: [...entries.values()].filter(entry => !profile || entry.profiles.includes(profile)), storage: "memory" });
  });
  router.get("/agents/:id", (req, res) => {
    const entry = entries.get(req.params.id);
    if (!entry) { res.status(404).json({ error: "agent_not_found" }); return; }
    res.json(entry);
  });
  return router;
}
