import express from 'express';
import Ajv from 'ajv';
import { randomUUID } from 'node:crypto';
import { AgentCard, Message, Artifact, Task, TaskState, TaskStatusUpdateEvent, TaskArtifactUpdateEvent } from '@a2a-js/sdk';
import { AgentEvent, DefaultRequestHandler, InMemoryTaskStore, type AgentExecutor } from '@a2a-js/sdk/server';
import { agentCardHandler, jsonRpcHandler, UserBuilder } from '@a2a-js/sdk/server/express';
import { agent, capability } from './config.js';
import { execute, type Input } from './handler.js';

const port = Number(process.env.PORT ?? 4201);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT geçersiz');
const host = process.env.HOST ?? '127.0.0.1';
const base = new URL(process.env.PUBLIC_BASE_URL ?? `http://127.0.0.1:${port}`);
if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password || base.pathname !== '/' || base.search || base.hash) throw new Error('PUBLIC_BASE_URL yalnız origin olmalı');
const ajv = new Ajv({ strict: true, allErrors: false, validateFormats: false });
const validInput = ajv.compile<Input>(capability.inputSchema);
const validOutput = ajv.compile(capability.outputSchema);
for (const example of capability.examples) {
  if (!validInput(example.input) || !validOutput(example.output)) throw new Error('Config örneği şemayla uyuşmuyor');
}
const validCall = ajv.compile({
  type: 'object', additionalProperties: false, required: ['contract', 'capability', 'invocationId', 'input'],
  properties: {
    contract: { const: 'ifa-call.v1' },
    capability: { type: 'object', additionalProperties: false, required: ['id', 'version'], properties: { id: { const: capability.id }, version: { const: capability.version } } },
    invocationId: { type: 'string', pattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$' },
    input: capability.inputSchema,
  },
});
interface Call { invocationId: string; input: Input }
const manifest = { manifestVersion: 'ifa-manifest.v1', capabilities: [capability] };
const card = AgentCard.fromJSON({
  name: agent.name, version: agent.version, description: capability.description,
  supportedInterfaces: [{ url: `${base.origin}/a2a`, protocolBinding: 'JSONRPC', protocolVersion: '1.0' }],
  capabilities: { streaming: true, pushNotifications: false },
  defaultInputModes: ['application/json'], defaultOutputModes: ['application/json'],
  skills: [{ id: capability.skillId, name: capability.title, description: capability.description, tags: [capability.executionMode] }],
});
// Bu küçük örnek kalıcı/kimlik kapsamlı dedup sunmaz. Tekrarı reddetmek,
// bağlantı hatasında aynı işi fark etmeden yeniden yürütmekten kaçınır.
const seen = new Set<string>();
let active = false;
const executor: AgentExecutor = {
  async execute(ctx, bus) {
    const task = Task.fromJSON({ id: ctx.taskId, contextId: ctx.contextId, status: { state: TaskState.TASK_STATE_SUBMITTED } });
    bus.publish(AgentEvent.task(task));
    const status = (state: TaskState, code?: string) => bus.publish(AgentEvent.statusUpdate(TaskStatusUpdateEvent.fromJSON({
      taskId: task.id, contextId: task.contextId,
      status: { state, ...(code ? { message: Message.toJSON(Message.fromJSON({ messageId: randomUUID(), role: 'ROLE_AGENT', parts: [{ mediaType: 'application/json', data: { error: { code } } }] })) } : {}) },
    })));
    let ownsSlot = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const abort = new AbortController();
    try {
      const message = Message.toJSON(ctx.userMessage) as { parts?: { mediaType?: string; data?: unknown }[] };
      const parts = message.parts;
      if (!parts || parts.length !== 1 || parts[0].mediaType !== 'application/json' || !validCall(parts[0].data)) {
        status(TaskState.TASK_STATE_FAILED, 'invalid_call'); return;
      }
      const call = parts[0].data as Call;
      const invocation = call.invocationId.toLowerCase();
      if (seen.has(invocation)) { status(TaskState.TASK_STATE_FAILED, 'duplicate_invocation_not_supported'); return; }
      if (active) { status(TaskState.TASK_STATE_FAILED, 'agent_busy'); return; }
      active = true; ownsSlot = true; seen.add(invocation);
      status(TaskState.TASK_STATE_WORKING);
      // Timeout yalnız beklemeyi sınırlar. Handler signal'ı dikkate almalıdır;
      // güvenilmeyen veya CPU-bound kod için bu süreç bir sandbox değildir.
      const work = Promise.resolve().then(() => execute(call.input, abort.signal));
      void work.finally(() => { active = false; }).catch(() => undefined);
      ownsSlot = false; // Slot gerçek iş bitene kadar work tarafından tutulur.
      const output = await Promise.race([work, new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => { abort.abort(); reject(new Error('handler_timeout')); }, 5000);
      })]);
      if (Buffer.byteLength(JSON.stringify(output) ?? '') > 32768 || !validOutput(output)) {
        status(TaskState.TASK_STATE_FAILED, 'invalid_output'); return;
      }
      const result = { contract: 'ifa-result.v1', capability: { id: capability.id, version: capability.version }, invocationId: call.invocationId, mode: capability.executionMode, output };
      const artifact = Artifact.fromJSON({ artifactId: `${task.id}-result`, name: capability.id, parts: [{ mediaType: 'application/json', data: result }] });
      bus.publish(AgentEvent.artifactUpdate(TaskArtifactUpdateEvent.fromJSON({ taskId: task.id, contextId: task.contextId, artifact: Artifact.toJSON(artifact), lastChunk: true })));
      status(TaskState.TASK_STATE_COMPLETED);
    } catch {
      // Girdi, stack ve handler hatasını istemciye sızdırmadan sabit kod döneriz.
      status(TaskState.TASK_STATE_FAILED, abort.signal.aborted ? 'handler_timeout' : 'handler_failed');
    } finally {
      if (timer) clearTimeout(timer);
      if (ownsSlot) active = false;
      bus.finished();
    }
  },
  async cancelTask() { throw new Error('Bu yerel şablonda iptal desteklenmiyor'); },
};
const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '32kb' }));
app.get('/health', (_req, res) => res.json({ status: 'ok', mode: capability.executionMode, storage: 'memory', prototype: true }));
app.get('/ifa/capabilities.json', (_req, res) => res.json(manifest));
const requestHandler = new DefaultRequestHandler(card, new InMemoryTaskStore(), executor);
app.use('/.well-known/agent-card.json', agentCardHandler({ agentCardProvider: requestHandler }));
let requests = 0;
// InMemoryTaskStore'a sınırsız task/turn yazılmasını önleyen geliştirme bütçesi.
// Sayaç süreç ömrüne aittir; süreli rate limit veya üretim kotası değildir.
app.use('/a2a', (_req, res, next) => {
  if (requests >= 1000) { res.status(429).json({ error: 'demo_request_budget_exhausted' }); return; }
  requests += 1; next();
}, jsonRpcHandler({ requestHandler, userBuilder: UserBuilder.noAuthentication }));
app.use((_req, res) => res.status(404).json({ error: 'not_found' }));
app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const status = (error as { status?: number })?.status === 413 ? 413 : 400;
  res.status(status).json({ error: status === 413 ? 'request_too_large' : 'invalid_request' });
});
const server = app.listen(port, host, () => console.log(JSON.stringify({ event: 'listening', host, port })));
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => {
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5000).unref();
});
