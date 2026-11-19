import { Router, type Response } from "express";
import { RegistryStore, RegistryCapacityError, CapabilityVersionConflict, NotOwnerError, RegistrationSuspendedError, RegistrationChangedError, type Entry } from "./store.js";
import { validateManifest, ManifestError } from "../capabilities/manifest.js";
import { fetchJson } from "./fetch-json.js";
import { validateRegistryCard, CardValidationError } from "../capabilities/agent-card.js";
import { can, LOCAL_DEMO_PRINCIPAL } from "../identity/domain/principal.js";
import { registryPrincipalOf } from "./auth.js";
import { discoverable, mayManage, readable } from "./lifecycle.js";
import {
  createLegacyRegistration,
  createManifestRegistration,
  isManifestEntry,
  matchesProfileFilter,
  parseRegistrationRequest,
  RegistrationRequestError,
  type AgentRegistration,
  type RegistrationRequest,
} from "./registration.js";

/** Doğrulama hatası: kayıt anında 422 olarak döner, resume sırasında rejected nedeni olur. */
class ValidationFailure extends Error {
  constructor(readonly code: string, readonly path?: string) { super(code); }
}

// Yalnızca operatörün seçtiği sabit origin'lere erişilir; redirect takip edilmez.
// Yerel geliştirme politikasıdır; paylaşılan ağ için DNS/IP sabitleme ve kimlik gerekir.
// Kimlik registryPrincipal() middleware'inden gelir; bağlanmamışsa (eski çağrı
// biçimi) local-demo principal'ı kullanılır ki yerel testler ve demo değişmesin.
export function registryRouter(allowedOrigins: Set<string>, store: RegistryStore = new RegistryStore(":memory:")) {
  const router = Router();
  const principal = (res: Response) => res.locals.principalBound ? registryPrincipalOf(res) : registryPrincipalOf(res) ?? LOCAL_DEMO_PRINCIPAL;
  // Diskte kalmış kayıtlar da güncel ağ iznine uymalıdır. İzin kaldırılınca
  // kayıt saklanır ama keşifte ve tekil okumada görünmez; ağa istek gönderilmez.
  const visible = (entry: Entry) => {
    try { return allowedOrigins.has(new URL(entry.cardUrl).origin) && allowedOrigins.has(new URL(entry.endpoint).origin); }
    catch { return false; }
  };

  async function validate(request: RegistrationRequest): Promise<AgentRegistration> {
    try {
      const card = validateRegistryCard(await fetchJson(request.cardUrl, 65536), request.cardUrl);
      const registeredAt = new Date().toISOString();
      // Legacy metin kaydı ile manifest kaydı ayrı DTO kurucularıyla işlenir;
      // böylece manifest akışı eski profil listesine hiç dokunmaz.
      return request.kind === "manifest"
        ? createManifestRegistration(card, request.cardUrl, validateManifest(await fetchJson(request.manifestUrl, 131072), card.skillIds), request.manifestUrl, registeredAt)
        : createLegacyRegistration(card, request.cardUrl, registeredAt);
    } catch (error) {
      if (error instanceof ManifestError || error instanceof CardValidationError) throw new ValidationFailure(error.code, error.path);
      throw new ValidationFailure("card_validation_failed");
    }
  }
  function saveError(res: Response, error: unknown) {
    // Disk hatası kartın geçersiz olduğu anlamına gelmez; istemciye ayrı hata döneriz.
    if (error instanceof NotOwnerError) { res.status(403).json({ error: "not_owner" }); return; }
    if (error instanceof RegistrationSuspendedError) { res.status(409).json({ error: "registration_suspended" }); return; }
    if (error instanceof RegistrationChangedError) { res.status(409).json({ error: "registration_changed" }); return; }
    if (error instanceof RegistryCapacityError) { res.status(409).json({ error: "registry_capacity" }); return; }
    if (error instanceof CapabilityVersionConflict) { res.status(409).json({ error: "capability_version_conflict" }); return; }
    res.status(503).json({ error: "registry_storage_unavailable" });
  }
  /** Yönetilebilir kaydı bulur; görünmeyen veya yetkisiz kayıt için varlığını sızdırmadan 404/403 yazar. */
  function managed(res: Response, id: string): Entry | undefined {
    const actor = principal(res);
    if (!actor) { res.status(401).json({ error: "unauthenticated" }); return undefined; }
    let entry: Entry | undefined;
    try { entry = store.get(id); } catch { res.status(503).json({ error: "registry_storage_unavailable" }); return undefined; }
    if (!entry || !readable(actor, entry)) { res.status(404).json({ error: "agent_not_found" }); return undefined; }
    if (!mayManage(actor, entry)) { res.status(403).json({ error: "forbidden" }); return undefined; }
    return entry;
  }

  router.post("/agents", async (req, res) => {
    const actor = principal(res);
    if (!actor) { res.status(401).json({ error: "unauthenticated" }); return; }
    if (!can(actor, "registration.create")) { res.status(403).json({ error: "forbidden" }); return; }
    let request: RegistrationRequest;
    try {
      request = parseRegistrationRequest(req.body, allowedOrigins);
    } catch (error) {
      if (error instanceof RegistrationRequestError) { res.status(error.status).json({ error: error.code }); return; }
      res.status(422).json({ error: "card_validation_failed" }); return;
    }
    let registration: AgentRegistration;
    try { registration = await validate(request); }
    catch (error) {
      const failure = error as ValidationFailure;
      res.status(422).json(failure.path ? { error: failure.code, path: failure.path } : { error: failure.code }); return;
    }
    try {
      const { entry, created } = store.save(registration, actor);
      res.status(created ? 201 : 200).json(entry);
    } catch (error) { saveError(res, error); }
  });

  router.post("/agents/:id/suspend", (req, res) => {
    const entry = managed(res, req.params.id);
    if (!entry) return;
    if (entry.status === "suspended") { res.json(entry); return; }
    try { res.json(store.setStatus(entry.id, "suspended", principal(res)!, "suspended_by_" + principal(res)!.role)); }
    catch (error) { saveError(res, error); }
  });

  router.post("/agents/:id/resume", async (req, res) => {
    const entry = managed(res, req.params.id);
    if (!entry) return;
    const actor = principal(res)!;
    if (entry.status === "active") { res.json(entry); return; }
    // Yeniden etkinleştirme her zaman yeniden doğrulamadır: kayıt anındaki
    // adreslerden kart ve manifest tekrar okunur; eski snapshot güvenilir kabul edilmez.
    let registration: AgentRegistration;
    try {
      const request = parseRegistrationRequest(isManifestEntry(entry) ? { cardUrl: entry.cardUrl, manifestUrl: entry.manifestUrl } : { cardUrl: entry.cardUrl }, allowedOrigins);
      registration = await validate(request);
    } catch (error) {
      const code = error instanceof ValidationFailure || error instanceof RegistrationRequestError ? error.code : "card_validation_failed";
      let rejected: Entry | undefined;
      try { rejected = store.setStatus(entry.id, "rejected", actor, code); } catch (storeError) { saveError(res, storeError); return; }
      // Doğrulama sürerken kayıt silindiyse reddedilecek kayıt kalmamıştır.
      if (!rejected) { res.status(409).json({ error: "registration_changed" }); return; }
      res.status(422).json({ error: code, status: "rejected" }); return;
    }
    // Ağ doğrulaması await'ten sonra biter; aradaki silme/yeniden kayıt yeni kaydı
    // ezmesin diye yazma, yetkilendirilen kaydın kimliğiyle sınırlanır.
    try { res.json(store.save(registration, actor, { resume: { id: entry.id, ownerId: entry.ownerId } }).entry); }
    catch (error) { saveError(res, error); }
  });

  router.delete("/agents/:id", (req, res) => {
    const entry = managed(res, req.params.id);
    if (!entry) return;
    try { store.remove(entry.id, principal(res)!); res.status(204).end(); }
    catch (error) { saveError(res, error); }
  });

  router.get("/agents", (req, res) => {
    const profile = req.query.profile;
    if (profile !== undefined && (typeof profile !== "string" || profile.length < 1 || profile.length > 128)) { res.status(400).json({ error: "invalid_profile" }); return; }
    // Bu kayıt anındaki snapshot'tır; anlık erişilebilirlik veya güven puanı değildir.
    // Kapalı (askıda/reddedilmiş) kayıt keşifte hiç görünmez.
    try {
      res.json({ agents: store.list().filter(entry => visible(entry) && discoverable(entry) && (!profile || matchesProfileFilter(entry, profile))), storage: store.storage });
    } catch { res.status(503).json({ error: "registry_storage_unavailable" }); }
  });
  router.get("/agents/:id", (req, res) => {
    let entry: Entry | undefined;
    try { entry = store.get(req.params.id); }
    catch { res.status(503).json({ error: "registry_storage_unavailable" }); return; }
    if (!entry || !visible(entry) || !readable(principal(res), entry)) { res.status(404).json({ error: "agent_not_found" }); return; }
    res.json(entry);
  });
  return router;
}
