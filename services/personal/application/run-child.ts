import { profiles } from "../../shared/contracts.js";
import type { Child } from "../domain/job.js";
import { selectProvider, SELECTION_REASON } from "../domain/provider-selection.js";
import { DiscoveryError, type ProviderDirectory, type SpecialistGateway } from "./ports.js";

export interface ChildDeps {
  directory: ProviderDirectory;
  gateway: SpecialistGateway;
  allowedOrigins: ReadonlySet<string>;
}

/** Tek uzman adımını yürütür: keşif → seçim → bağlantı → gönderim → sonuç eşleme. */
export async function runChild(child: Child, text: string, deps: ChildDeps, signal: AbortSignal, changed: () => void) {
  // Gönderim sınırı hata anlamını belirler: öncesi kesin başarısızlık, sonrası belirsizlik.
  let submitted = false;
  try {
    const profile = profiles[child.skill];
    const selected = selectProvider(await deps.directory.find(profile, signal), profile, deps.allowedOrigins);
    if (!selected) throw new DiscoveryError("no_provider");
    child.selectedAgent = { id: selected.id, name: selected.name };
    child.selectionReason = SELECTION_REASON;
    child.state = "working"; changed();

    // Registry yalnızca adres buldurur. Görev verisi doğrudan seçilen uzmana gider.
    const session = await deps.gateway.connect(selected, profile, signal);
    submitted = true;
    const outcome = await session.execute(text, {
      taskIdentified: id => { child.remoteTaskId = id; },
      progressed: changed,
    });
    if (outcome.terminal === "completed" && outcome.result) {
      child.state = "completed"; child.output = outcome.result;
    } else if (outcome.terminal === "failed") {
      child.state = "failed"; child.error = "provider_failed";
    } else {
      child.state = "unknown"; child.error = "terminal_result_unavailable";
    }
  } catch (error) {
    // Gönderilmiş görev başka sağlayıcıya yeniden gönderilmez; işi çoğaltabilir.
    child.state = submitted ? "unknown" : "failed";
    child.error = signal.aborted ? "deadline_exceeded"
      : submitted ? "execution_unknown"
      : error instanceof DiscoveryError ? error.code : "discovery_failed";
  } finally { changed(); }
}
