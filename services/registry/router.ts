import { Router } from "express";
import { RegistryStore, RegistryCapacityError, CapabilityVersionConflict, type Entry } from "./store.js";
import { validateManifest, ManifestError } from "../capabilities/manifest.js";
import { fetchJson } from "./fetch-json.js";
import { validateRegistryCard, CardValidationError } from "../capabilities/agent-card.js";
import {
  createLegacyRegistration,
  createManifestRegistration,
  matchesProfileFilter,
  parseRegistrationRequest,
  RegistrationRequestError,
  type RegistrationRequest,
} from "./registration.js";

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
    let request: RegistrationRequest;
    try {
      request = parseRegistrationRequest(req.body, allowedOrigins);
    } catch (error) {
      if (error instanceof RegistrationRequestError) {
        res.status(error.status).json({ error: error.code });
        return;
      }
      res.status(422).json({ error: "card_validation_failed" });
      return;
    }
    try {
      const card = validateRegistryCard(await fetchJson(request.cardUrl, 65536), request.cardUrl);
      const registeredAt = new Date().toISOString();
      // Legacy metin kaydı ile manifest kaydı ayrı DTO kurucularıyla işlenir;
      // böylece manifest akışı eski profil listesine hiç dokunmaz.
      const registration = request.kind === "manifest"
        ? createManifestRegistration(
            card,
            request.cardUrl,
            validateManifest(await fetchJson(request.manifestUrl, 131072), card.skillIds),
            request.manifestUrl,
            registeredAt,
          )
        : createLegacyRegistration(card, request.cardUrl, registeredAt);
      try {
        const { entry, created } = store.save(registration);
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
      res.json({ agents: store.list().filter(entry => visible(entry) && (!profile || matchesProfileFilter(entry, profile))), storage: store.storage });
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
