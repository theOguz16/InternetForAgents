import express from 'express';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { AgentCard, Artifact, Task, TaskState, TaskStatusUpdateEvent, TaskArtifactUpdateEvent } from '@a2a-js/sdk';
import { AgentEvent, DefaultRequestHandler, type AgentExecutor, type ExecutionEventBus, type RequestContext } from '@a2a-js/sdk/server';
import { agentCardHandler, jsonRpcHandler, UserBuilder } from '@a2a-js/sdk/server/express';
import { SqliteTaskStore } from './store.js';

export class DemoExecutor implements AgentExecutor {
  executions = 0;
  private canceled = new Set<string>();
  private release!: () => void;
  // Sonucu istemci yeniden bağlanana kadar bekleterek ağ kopmasını kontrollü biçimde sınarız.
  private checkpoint = new Promise<void>(resolve => { this.release = resolve; });
  complete() { this.release(); }
  async execute(ctx: RequestContext, bus: ExecutionEventBus) {
    this.executions++;
    const task = Task.fromJSON({ id: ctx.taskId, contextId: ctx.contextId,
      status: { state: TaskState.TASK_STATE_SUBMITTED } });
    // A2A akışının ilk olayı görev kimliğini taşımalı; ilerleme olayları ardından gelir.
    bus.publish(AgentEvent.task(task));
    bus.publish(AgentEvent.statusUpdate(TaskStatusUpdateEvent.fromJSON({
      taskId: task.id, contextId: task.contextId, status: { state: TaskState.TASK_STATE_WORKING }
    })));
    // İstemci kontrol noktasına ulaşamazsa en fazla 8 saniye bekleyip devam ederiz.
    await Promise.race([this.checkpoint, delay(8000, undefined, { ref: false })]);
    if (this.canceled.has(task.id)) return;
    const artifact = Artifact.fromJSON({ artifactId: `${task.id}-result`, name: 'N01 result',
      parts: [{ mediaType: 'application/json', data: {
        engineMode: 'fixture', summary: 'SSE round-trip complete', executedCode: false
      } }] });
    bus.publish(AgentEvent.artifactUpdate(TaskArtifactUpdateEvent.fromJSON({
      taskId: task.id, contextId: task.contextId, artifact: Artifact.toJSON(artifact), lastChunk: true
    })));
    bus.publish(AgentEvent.statusUpdate(TaskStatusUpdateEvent.fromJSON({
      taskId: task.id, contextId: task.contextId, status: { state: TaskState.TASK_STATE_COMPLETED }
    })));
    bus.finished();
  }
  async cancelTask(taskId: string, bus: ExecutionEventBus) {
    this.canceled.add(taskId);
    bus.publish(AgentEvent.statusUpdate(TaskStatusUpdateEvent.fromJSON({
      taskId, status: { state: TaskState.TASK_STATE_CANCELED }
    })));
    this.complete();
    bus.finished();
  }
}

export async function startAgent(dbPath: string) {
  const store = new SqliteTaskStore(dbPath);
  const executor = new DemoExecutor();
  const app = express();
  const calls: { method: string; version: string | undefined }[] = [];
  let closedStreams = 0;
  app.use(express.json({ limit: '64kb' }));
  app.use('/a2a', (req, res, next) => {
    calls.push({ method: String(req.body?.method), version: req.header('A2A-Version') });
    res.once('close', () => { closedStreams++; });
    next();
  });
  // İşletim sistemi boş port seçer; kimlik doğrulamasız deneme yalnızca localhost üzerinde açılır.
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('No TCP address');
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const card = AgentCard.fromJSON({ name: 'N01 SSE fixture', description: 'Local transport experiment',
    version: '0.0.0', supportedInterfaces: [{ url: `${baseUrl}/a2a`, protocolBinding: 'JSONRPC', protocolVersion: '1.0' }],
    capabilities: { streaming: true, pushNotifications: false },
    defaultInputModes: ['application/json'], defaultOutputModes: ['application/json'],
    skills: [{ id: 'transport-check', name: 'Transport Check', description: 'Produces a fixed artifact; no analysis', tags: ['fixture'] }]
  });
  // Kart ve JSON-RPC/SSE taşımasını resmi SDK yönetir; executor yalnızca örnek sonucu üretir.
  const handler = new DefaultRequestHandler(card, store, executor);
  app.use('/.well-known/agent-card.json', agentCardHandler({ agentCardProvider: handler }));
  app.use('/a2a', jsonRpcHandler({ requestHandler: handler, userBuilder: UserBuilder.noAuthentication }));
  return { baseUrl, executor, calls, get closedStreams() { return closedStreams; }, async close() {
    executor.complete();
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    store.close();
  } };
}
