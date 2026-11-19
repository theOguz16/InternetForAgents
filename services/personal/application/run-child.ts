import { profiles } from "../../shared/contracts.js";
import type { Child } from "../domain/job.js";
import { selectProvider, SELECTION_REASON } from "../domain/provider-selection.js";
import { DiscoveryError, noopTelemetry, safeEvent, safeMetric, type Clock, type ProviderDirectory, type SpecialistGateway, type Telemetry } from "./ports.js";

export interface ChildDeps {
  directory: ProviderDirectory;
  gateway: SpecialistGateway;
  allowedOrigins: ReadonlySet<string>;
  clock: Clock;
  telemetry?: Telemetry;
}

export interface TraceContext {
  traceId: string;
  jobId: string;
}

/** Tek uzman adımını yürütür: keşif → seçim → bağlantı → gönderim → sonuç eşleme. */
export async function runChild(child: Child, text: string, deps: ChildDeps, signal: AbortSignal, changed: () => void, trace: TraceContext) {
  const telemetry = deps.telemetry ?? noopTelemetry;
  const stepStart = deps.clock.now().getTime();
  // Gönderim sınırı hata anlamını belirler: öncesi kesin başarısızlık, sonrası belirsizlik.
  let submitted = false;
  let discovered = false;
  let selectedAgentId: string | undefined;
  try {
    const profile = profiles[child.skill];
    const selected = selectProvider(await deps.directory.find(profile, signal), profile, deps.allowedOrigins);
    if (!selected) throw new DiscoveryError("no_provider");
    discovered = true;
    selectedAgentId = selected.id;
    child.selectedAgent = { id: selected.id, name: selected.name };
    child.selectionReason = SELECTION_REASON;
    child.state = "working"; changed();
    const discoverNow = deps.clock.now();
    safeEvent(telemetry, {
      at: discoverNow.toISOString(),
      event: "step.discovered",
      traceId: trace.traceId,
      jobId: trace.jobId,
      childId: child.skill,
      agentId: selectedAgentId,
      outcome: "selected",
      durationMs: Math.max(0, discoverNow.getTime() - stepStart),
    });

    // Registry yalnızca adres buldurur. Görev verisi doğrudan seçilen uzmana gider.
    const session = await deps.gateway.connect(selected, profile, signal);
    submitted = true;
    safeEvent(telemetry, {
      at: deps.clock.now().toISOString(),
      event: "step.dispatched",
      traceId: trace.traceId,
      jobId: trace.jobId,
      childId: child.skill,
      agentId: selectedAgentId,
      outcome: "dispatched",
    });
    const outcome = await session.execute(text, {
      taskIdentified: id => {
        const isNew = child.remoteTaskId !== id;
        child.remoteTaskId = id;
        // Akış aynı görev kimliğini tekrar bildirirse yinelenen trace olayı üretmeyiz.
        if (isNew) {
          safeEvent(telemetry, {
            at: deps.clock.now().toISOString(),
            event: "step.remote_task",
            traceId: trace.traceId,
            jobId: trace.jobId,
            childId: child.skill,
            agentId: selectedAgentId,
            remoteTaskId: id,
            outcome: "identified",
          });
        }
      },
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
    if (!discovered) {
      // Keşif hatası bağlantı/yürütme hatasından ayrışsın diye step.discovered failed olarak yazılır.
      const failNow = deps.clock.now();
      safeEvent(telemetry, {
        at: failNow.toISOString(),
        event: "step.discovered",
        traceId: trace.traceId,
        jobId: trace.jobId,
        childId: child.skill,
        outcome: "failed",
        errorCode: child.error,
        durationMs: Math.max(0, failNow.getTime() - stepStart),
      });
    }
  } finally {
    changed();
    const endNow = deps.clock.now();
    const durationMs = Math.max(0, endNow.getTime() - stepStart);
    safeEvent(telemetry, {
      at: endNow.toISOString(),
      event: "step.finished",
      traceId: trace.traceId,
      jobId: trace.jobId,
      childId: child.skill,
      agentId: selectedAgentId,
      remoteTaskId: child.remoteTaskId,
      outcome: child.state,
      errorCode: child.error,
      durationMs,
    });
    safeMetric(telemetry, {
      name: "personal_steps_total",
      kind: "counter",
      value: 1,
      labels: { skill: child.skill, outcome: child.state, errorCode: child.error ?? "none" },
    });
    safeMetric(telemetry, {
      name: "personal_step_duration_ms",
      kind: "histogram",
      value: durationMs,
      labels: { skill: child.skill, outcome: child.state },
    });
  }
}
