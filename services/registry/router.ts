import { Router } from "express";
import { RegistryStore, RegistryCapacityError, CapabilityVersionConflict, type Entry } from "./store.js";
import { validateManifest, ManifestError, type Manifest } from "../capabilities/manifest.js";
import { fetchJson } from "./fetch-json.js";
import { validateRegistryCard, CardValidationError } from "../capabilities/agent-card.js";
import { profiles } from "../shared/contracts.js";

// Yalnızca operatörün seçtiği sabit origin'lere erişilir; redirect takip edilmez.
// Yerel geliştirme politikasıdır; paylaşılan ağ için DNS/IP sabitleme ve kimlik gerekir.
export function registryRouter(allowedOrigins: Set<string>, store: RegistryStore = new RegistryStore(":memory:")) {
  const router = Router();
  // Diskte kalmış kayıtlar da güncel ağ iznine uymalıdır. İzin kaldırılınca
  // kayıt saklanır ama keşifte ve tekil okumada görünmez; ağa istek gönderilmez.
  const visible = (entry: Entry) => {
    try { return allowedOrigins.has(new URL(entry.cardUrl).origin) && allowedOrigins.has(new URL(entry.endpoint).origin); }
    catch { return false; }
  };
  router.post("/agents", async (req, res) => {
    const body = req.body;
    if (!body || typeof body.cardUrl !== "string" || Object.keys(body).some(key => !["cardUrl", "manifestUrl"].includes(key))) {
      res.status(400).json({ error: "invalid_registration" }); return;
    }
    try {
      const url = new URL(body.cardUrl);
      if (!allowedOrigins.has(url.origin) || url.username || url.password || url.pathname !== "/.well-known/agent-card.json" || url.search || url.hash) {
        res.status(422).json({ error: "card_url_not_allowed" }); return;
      }
      const card = validateRegistryCard(await fetchJson(url, 65536), url);
      let manifest: Manifest | undefined;
      let manifestUrl: string | undefined;
      if (body.manifestUrl !== undefined) {
        if (typeof body.manifestUrl !== "string") throw new Error("invalid_manifest_url");
        const target = new URL(body.manifestUrl);
        if (target.origin !== url.origin || target.username || target.password || target.pathname !== "/ifa/capabilities.json" || target.search || target.hash) throw new Error("invalid_manifest_url");
        manifest = validateManifest(await fetchJson(target, 131072), card.skillIds);
        manifestUrl = target.href;
      }
      const legacyProfiles: readonly string[] = Object.values(profiles);
      const supported = manifest ? manifest.capabilities.map(cap => cap.id) : card.skillIds.filter(id => legacyProfiles.includes(id));
      if (!supported.length) throw new CardValidationError("no_supported_skill", "/card/skills");
      try {
        const { entry, created } = store.save({ cardUrl: url.href, name: card.name, profiles: supported, endpoint: card.endpoint, registeredAt: new Date().toISOString(), ...(manifest ? { manifest, manifestUrl } : {}) });
        res.status(created ? 201 : 200).json(entry);
      } catch (error) {
        // Disk hatası kartın geçersiz olduğu anlamına gelmez; istemciye ayrı hata döneriz.
        res.status(error instanceof RegistryCapacityError || error instanceof CapabilityVersionConflict ? 409 : 503).json({ error: error instanceof RegistryCapacityError ? "registry_capacity" : error instanceof CapabilityVersionConflict ? "capability_version_conflict" : "registry_storage_unavailable" });
      }
    } catch (error) {
      if (error instanceof ManifestError || error instanceof CardValidationError) { res.status(422).json({ error: error.code, path: error.path }); return; }
      res.status(422).json({ error: "card_validation_failed" });
    }
  });
  router.get("/agents", (req, res) => {
    const profile = req.query.profile;
    if (profile !== undefined && (typeof profile !== "string" || profile.length < 1 || profile.length > 128)) { res.status(400).json({ error: "invalid_profile" }); return; }
    // Bu kayıt anındaki snapshot'tır; anlık erişilebilirlik veya güven puanı değildir.
    try {
      res.json({ agents: store.list().filter(entry => visible(entry) && (!profile || entry.profiles.includes(profile))), storage: store.storage });
    } catch { res.status(503).json({ error: "registry_storage_unavailable" }); }
  });
  router.get("/agents/:id", (req, res) => {
    let entry: Entry | undefined;
    try { entry = store.get(req.params.id); }
    catch { res.status(503).json({ error: "registry_storage_unavailable" }); return; }
    if (!entry || !visible(entry)) { res.status(404).json({ error: "agent_not_found" }); return; }
    res.json(entry);
  });
  return router;
}
