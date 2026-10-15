import { randomUUID } from "node:crypto";
import { AgentCard, Artifact, SendMessageRequest, TaskState } from "@a2a-js/sdk";
import { ClientFactory, JsonRpcTransportFactory } from "@a2a-js/sdk/client";
import { profiles, validResult, type Specialist, type SpecialistResult } from "../shared/contracts.js";

export interface Child {
  skill: Specialist;
  state: "discovering" | "working" | "completed" | "failed" | "unknown";
  selectedAgent?: { id: string; name: string };
  selectionReason?: string;
  remoteTaskId?: string;
  output?: SpecialistResult;
  error?: string;
}
interface Candidate { id: string; name: string; endpoint: string; profiles: string[] }

export async function runChild(child: Child, text: string, registryUrl: string, allowed: Set<string>, signal: AbortSignal, changed: () => void) {
  let submitted = false;
  try {
    const profile = profiles[child.skill];
    const url = new URL("/v1/agents", registryUrl);
    url.searchParams.set("profile", profile);
    const response = await fetch(url, { signal, redirect: "error" });
    if (!response.ok) throw new Error("discovery_failed");
    const body = await response.json() as { agents?: Candidate[] };
    if (!Array.isArray(body.agents) || body.agents.length > 100) throw new Error("invalid_registry_response");
    const candidates = body.agents.filter(candidate => {
      try {
        const endpoint = new URL(candidate.endpoint);
        return typeof candidate.id === "string" && typeof candidate.name === "string" && candidate.profiles.includes(profile)
          && allowed.has(endpoint.origin) && endpoint.pathname === "/a2a" && !endpoint.username && !endpoint.password && !endpoint.search && !endpoint.hash;
      } catch { return false; }
    }).sort((a, b) => a.id.localeCompare(b.id));
    const selected = candidates[0];
    if (!selected) throw new Error("no_provider");
    child.selectedAgent = { id: selected.id, name: selected.name };
    child.selectionReason = "İzinli ve uyumlu adaylar arasında kimlik sırasındaki ilk sağlayıcı; kalite sıralaması değildir.";
    child.state = "working"; changed();

    // Registry yalnızca adres buldurur. Görev verisi doğrudan seçilen uzmana gider.
    const guardedFetch: typeof fetch = (input, init) => {
      const target = new URL(input instanceof Request ? input.url : String(input));
      if (target.href !== selected.endpoint) throw new Error("endpoint_not_allowed");
      return fetch(input, { ...init, signal: AbortSignal.any([signal, ...(init?.signal ? [init.signal] : [])]), redirect: "error" });
    };
    const factory = new ClientFactory({ transports: [new JsonRpcTransportFactory({ fetchImpl: guardedFetch })] });
    // Registry'nin doğruladığı arayüz snapshot'ı kullanılır; uzak karttan yeni bir adres takip edilmez.
    const client = await factory.createFromAgentCard(AgentCard.fromJSON({ name: selected.name, version: "0.1.0",
      supportedInterfaces: [{ url: selected.endpoint, protocolBinding: "JSONRPC", protocolVersion: "1.0" }],
      capabilities: { streaming: true }, defaultInputModes: ["application/json"], defaultOutputModes: ["application/json"],
      skills: [{ id: profile, name: profile, description: profile, tags: ["text"] }] }));
    let state = TaskState.TASK_STATE_UNSPECIFIED;
    let result: SpecialistResult | undefined;
    const readArtifact = (artifact: Artifact) => {
      const wire = Artifact.toJSON(artifact) as { parts?: { data?: unknown }[] };
      if (wire.parts?.length !== 1 || !validResult(profile, wire.parts[0].data)) throw new Error("invalid_artifact");
      result = wire.parts[0].data;
    };
    submitted = true;
    try {
      for await (const event of client.sendMessageStream(SendMessageRequest.fromJSON({ message: {
        messageId: randomUUID(), role: "ROLE_USER", parts: [{ mediaType: "application/json", data: { profile, text } }],
      } }), { signal })) {
        const payload = event.payload;
        if (payload?.$case === "task") {
          child.remoteTaskId = payload.value.id;
          state = payload.value.status?.state ?? state;
          for (const artifact of payload.value.artifacts) readArtifact(artifact);
        } else if (payload?.$case === "artifactUpdate") {
          if (payload.value.append || !payload.value.lastChunk || !payload.value.artifact) throw new Error("chunked_artifact_not_supported");
          readArtifact(payload.value.artifact);
        } else if (payload?.$case === "statusUpdate") {
          state = payload.value.status?.state ?? state;
        }
        changed();
      }
    } catch {
      // Görev gönderilmiş olabilir: başka sağlayıcıya yeniden göndermek işi çoğaltabilir.
      // Kimlik biliniyorsa tek snapshot sorgularız; periyodik polling veya otomatik tekrar yoktur.
      if (!child.remoteTaskId || signal.aborted) throw new Error("execution_unknown");
      const task = await client.getTask({ id: child.remoteTaskId, tenant: "" }, { signal });
      state = task.status?.state ?? TaskState.TASK_STATE_UNSPECIFIED;
      result = undefined;
      for (const artifact of task.artifacts) readArtifact(artifact);
    }
    if (state === TaskState.TASK_STATE_COMPLETED && result) {
      child.state = "completed"; child.output = result;
    } else if ([TaskState.TASK_STATE_FAILED, TaskState.TASK_STATE_CANCELED, TaskState.TASK_STATE_REJECTED].includes(state)) {
      child.state = "failed"; child.error = "provider_failed";
    } else {
      child.state = "unknown"; child.error = "terminal_result_unavailable";
    }
  } catch (error) {
    child.state = submitted ? "unknown" : "failed";
    child.error = signal.aborted ? "deadline_exceeded" : !submitted && error instanceof Error && ["no_provider", "discovery_failed", "invalid_registry_response"].includes(error.message) ? error.message : submitted ? "execution_unknown" : "discovery_failed";
  } finally { changed(); }
}
