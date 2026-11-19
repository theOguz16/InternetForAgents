import { randomUUID } from "node:crypto";
import { AgentCard, Artifact, SendMessageRequest, TaskState } from "@a2a-js/sdk";
import { ClientFactory, JsonRpcTransportFactory, type Client } from "@a2a-js/sdk/client";
import { validResult, type SpecialistResult } from "../../shared/contracts.js";
import type { ExecutionHooks, RemoteOutcome, SpecialistGateway, SpecialistSession } from "../application/ports.js";
import type { ProviderCandidate } from "../domain/provider-selection.js";

/** SpecialistGateway'in A2A JSONRPC + SSE uygulaması. SDK yalnız bu dosyada kullanılır. */
export class A2ASpecialistGateway implements SpecialistGateway {
  async connect(provider: ProviderCandidate, profile: string, signal: AbortSignal): Promise<SpecialistSession> {
    const guardedFetch: typeof fetch = (input, init) => {
      const target = new URL(input instanceof Request ? input.url : String(input));
      if (target.href !== provider.endpoint) throw new Error("endpoint_not_allowed");
      return fetch(input, { ...init, signal: AbortSignal.any([signal, ...(init?.signal ? [init.signal] : [])]), redirect: "error" });
    };
    const factory = new ClientFactory({ transports: [new JsonRpcTransportFactory({ fetchImpl: guardedFetch })] });
    // Registry'nin doğruladığı arayüz snapshot'ı kullanılır; uzak karttan yeni bir adres takip edilmez.
    const client = await factory.createFromAgentCard(AgentCard.fromJSON({ name: provider.name, version: "0.1.0",
      supportedInterfaces: [{ url: provider.endpoint, protocolBinding: "JSONRPC", protocolVersion: "1.0" }],
      capabilities: { streaming: true }, defaultInputModes: ["application/json"], defaultOutputModes: ["application/json"],
      skills: [{ id: profile, name: profile, description: profile, tags: ["text"] }] }));
    return { execute: (text, hooks) => execute(client, profile, text, signal, hooks) };
  }
}

async function execute(client: Client, profile: string, text: string, signal: AbortSignal, hooks: ExecutionHooks): Promise<RemoteOutcome> {
  let state = TaskState.TASK_STATE_UNSPECIFIED;
  let result: SpecialistResult | undefined;
  let remoteTaskId: string | undefined;
  const readArtifact = (artifact: Artifact) => {
    const wire = Artifact.toJSON(artifact) as { parts?: { data?: unknown }[] };
    if (wire.parts?.length !== 1 || !validResult(profile, wire.parts[0].data)) throw new Error("invalid_artifact");
    result = wire.parts[0].data;
  };
  try {
    for await (const event of client.sendMessageStream(SendMessageRequest.fromJSON({ message: {
      messageId: randomUUID(), role: "ROLE_USER", parts: [{ mediaType: "application/json", data: { profile, text } }],
    } }), { signal })) {
      const payload = event.payload;
      if (payload?.$case === "task") {
        remoteTaskId = payload.value.id; hooks.taskIdentified(remoteTaskId);
        state = payload.value.status?.state ?? state;
        for (const artifact of payload.value.artifacts) readArtifact(artifact);
      } else if (payload?.$case === "artifactUpdate") {
        if (payload.value.append || !payload.value.lastChunk || !payload.value.artifact) throw new Error("chunked_artifact_not_supported");
        readArtifact(payload.value.artifact);
      } else if (payload?.$case === "statusUpdate") {
        state = payload.value.status?.state ?? state;
      }
      hooks.progressed();
    }
  } catch {
    // Görev gönderilmiş olabilir. Kimlik biliniyorsa tek snapshot sorgularız;
    // periyodik polling veya otomatik tekrar yoktur.
    if (!remoteTaskId || signal.aborted) throw new Error("execution_unknown");
    const task = await client.getTask({ id: remoteTaskId, tenant: "" }, { signal });
    state = task.status?.state ?? TaskState.TASK_STATE_UNSPECIFIED;
    result = undefined;
    for (const artifact of task.artifacts) readArtifact(artifact);
  }
  if (state === TaskState.TASK_STATE_COMPLETED) return { terminal: "completed", result };
  if ([TaskState.TASK_STATE_FAILED, TaskState.TASK_STATE_CANCELED, TaskState.TASK_STATE_REJECTED].includes(state)) return { terminal: "failed" };
  return { terminal: "unknown" };
}
