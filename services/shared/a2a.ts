import type { Express } from "express";
import { AgentCard, Message, Artifact, Task, TaskState, TaskStatusUpdateEvent, TaskArtifactUpdateEvent } from "@a2a-js/sdk";
import { AgentEvent, DefaultRequestHandler, InMemoryTaskStore, type AgentExecutor, type RequestContext, type ExecutionEventBus, type TaskStore } from "@a2a-js/sdk/server";
import { agentCardHandler, jsonRpcHandler, UserBuilder } from "@a2a-js/sdk/server/express";
import { profiles, validInput, validResult, type Specialist, type SpecialistHandler } from "./contracts.js";

export function mountSpecialist(app: Express, role: Specialist, baseUrl: string, business: SpecialistHandler, store: TaskStore = new InMemoryTaskStore()) {
  const profile = profiles[role];
  const executor: AgentExecutor = {
    async execute(ctx: RequestContext, bus: ExecutionEventBus) {
      const task = Task.fromJSON({ id: ctx.taskId, contextId: ctx.contextId, status: { state: TaskState.TASK_STATE_SUBMITTED } });
      bus.publish(AgentEvent.task(task));
      const status = (state: TaskState) => bus.publish(AgentEvent.statusUpdate(TaskStatusUpdateEvent.fromJSON({ taskId: task.id, contextId: task.contextId, status: { state } })));
      try {
        // SDK iç nesnesi yerine codec’in standart wire biçiminden DataPart okunur.
        const message = Message.toJSON(ctx.userMessage) as { parts?: { data?: unknown; mediaType?: string }[] };
        const parts = message.parts ?? [];
        if (parts.length !== 1 || parts[0].mediaType !== "application/json" || !validInput(profile, parts[0].data)) {
          status(TaskState.TASK_STATE_FAILED);
          return;
        }
        status(TaskState.TASK_STATE_WORKING);
        const result = await business.execute(parts[0].data);
        if (!validResult(profile, result) || result.mode !== business.mode) throw new Error("Geçersiz uzman çıktısı");
        const artifact = Artifact.fromJSON({ artifactId: `${task.id}-result`, name: profile, parts: [{ mediaType: "application/json", data: result }] });
        bus.publish(AgentEvent.artifactUpdate(TaskArtifactUpdateEvent.fromJSON({ taskId: task.id, contextId: task.contextId, artifact: Artifact.toJSON(artifact), lastChunk: true })));
        status(TaskState.TASK_STATE_COMPLETED);
      } catch {
        // Metin içeriğini veya model hatasının hassas ayrıntılarını loglamayız.
        status(TaskState.TASK_STATE_FAILED);
      } finally { bus.finished(); }
    },
    async cancelTask(_taskId, _bus) {
      // Gerçek iptal desteği eklenene kadar başarılı iptal iddiasında bulunmayız.
      throw new Error("Bu yerel adaptörde iptal henüz desteklenmiyor");
    },
  };
  // Karttaki çalışma modu gerçek handler ile aynı kaynaktan gelir; fixture yanlış tanıtılmaz.
  const description = business.mode === "fixture"
    ? "Development fixture; no real text analysis"
    : role === "language" ? "Rule-based Turkish/English detection; uncertain input returns und"
    : "Word-frequency keywords with Turkish/English stop-word filtering; no semantic model";
  const card = AgentCard.fromJSON({ name: `${role} ${business.mode} agent`, description, version: "0.2.0",
    supportedInterfaces: [{ url: `${baseUrl}/a2a`, protocolBinding: "JSONRPC", protocolVersion: "1.0" }],
    capabilities: { streaming: true, pushNotifications: false }, defaultInputModes: ["application/json"], defaultOutputModes: ["application/json"],
    skills: [{ id: profile, name: profile, description, tags: ["text", business.mode] }] });
  // Uygulama SQLite deposunu verir; izole testler bellekteki varsayılanı kullanabilir.
  const handler = new DefaultRequestHandler(card, store, executor);
  app.use("/.well-known/agent-card.json", agentCardHandler({ agentCardProvider: handler }));
  app.use("/a2a", jsonRpcHandler({ requestHandler: handler, userBuilder: UserBuilder.noAuthentication }));
}
