import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { SendMessageRequest, TaskState, Task } from '@a2a-js/sdk';
import { ClientFactory, JsonRpcTransportFactory } from '@a2a-js/sdk/client';
import { startAgent } from './agent.js';

assert.equal(Number(process.versions.node.split('.')[0]), 24, 'Use the pinned local Node 24 runtime');
const dir = await mkdtemp(join(tmpdir(), 'ifa-n01-'));
const db = join(dir, 'tasks.sqlite');
let agent = await startAgent(db);
const wire: { method: string; request: unknown; contentType: string; errorCode?: number }[] = [];
// SDK’nın gerçekten gönderdiği JSON’u ve yanıt türünü gözlemler; SSE gövdesini tüketmeyiz.
const observedFetch: typeof fetch = async (input, init) => {
  const response = await fetch(input, init);
  if (typeof init?.body === 'string') {
    const request = JSON.parse(init.body) as { method: string };
    const contentType = response.headers.get('content-type') ?? '';
    const reply = contentType.includes('json') ? await response.clone().json() as { error?: { code?: number } } : undefined;
    wire.push({ method: request.method, request, contentType, errorCode: reply?.error?.code });
  }
  return response;
};
const factory = new ClientFactory({ transports: [new JsonRpcTransportFactory({ fetchImpl: observedFetch })] });
const report: Record<string, unknown> = { verifiedOn: '2026-10-13', node: process.version, sdk: '1.3.0', protocol: '1.0' };
const timeout = AbortSignal.timeout(12000);
try {
  let client = await factory.createFromUrl(agent.baseUrl);
  const controller = new AbortController();
  let taskId = '';
  const events: string[] = [];
  const request = SendMessageRequest.fromJSON({ message: { messageId: randomUUID(), role: 'ROLE_USER',
    parts: [{ mediaType: 'application/json', data: { purpose: 'transport-check' } }] } });
  try {
    for await (const event of client.sendMessageStream(request, { signal: AbortSignal.any([timeout, controller.signal]) })) {
      events.push(event.payload?.$case ?? 'missing');
      if (event.payload?.$case === 'task') taskId = event.payload.value.id;
      if (taskId && event.payload?.$case === 'statusUpdate') {
        controller.abort(); // Sonuç üretilmeden gerçek HTTP/SSE bağlantısını keseriz.
        break;
      }
    }
  } catch (error) { if (!controller.signal.aborted) throw error; }
  assert.ok(taskId);
  assert.ok(controller.signal.aborted, 'Initial SSE connection was interrupted');
  let resumedSnapshot = false;
  let artifactSeen = false;
  let completed = false;
  // Yeni görev göndermeden aynı task kimliğiyle akışa yeniden abone oluruz.
  for await (const event of client.resubscribeTask({ id: taskId, tenant: '' }, { signal: timeout })) {
    if (!resumedSnapshot) {
      assert.equal(event.payload?.$case, 'task', 'First resubscribe event must be a snapshot');
      if (event.payload?.$case === 'task') assert.equal(event.payload.value.id, taskId);
      resumedSnapshot = true;
      agent.executor.complete();
    }
    if (event.payload?.$case === 'artifactUpdate') artifactSeen = true;
    if (event.payload?.$case === 'statusUpdate') completed = event.payload.value.status?.state === TaskState.TASK_STATE_COMPLETED;
  }
  assert.ok(resumedSnapshot && artifactSeen && completed);
  assert.equal(agent.executor.executions, 1, 'Reconnect must not execute another task');
  assert.ok(agent.closedStreams >= 1);
  const methodsBeforeRecovery = agent.calls.map(call => call.method);
  assert.deepEqual(methodsBeforeRecovery, ['SendStreamingMessage', 'SubscribeToTask']);
  assert.ok(agent.calls.every(call => call.version === '1.0'));
  // Tamamlanmış göreve abonelik reddedilir; sonucu tek GetTask ile alırız, polling yapmayız.
  let terminalRejected = false;
  try {
    for await (const _ of client.resubscribeTask({ id: taskId, tenant: '' }, { signal: timeout })) { /* Terminal görev için olay yerine hata beklenir. */ }
  } catch { terminalRejected = true; }
  assert.ok(terminalRejected);
  assert.equal(wire.at(-1)?.errorCode, -32004, 'Terminal subscription must fail with UnsupportedOperation');
  const terminal = await client.getTask({ id: taskId, tenant: '' }, { signal: timeout });
  assert.equal(terminal.status?.state, TaskState.TASK_STATE_COMPLETED);
  assert.equal(terminal.artifacts.length, 1);
  assert.equal(terminal.artifacts[0]?.parts[0]?.content?.$case, 'data');
  report.sse = { events, resumedSnapshot, artifactSeen, completed, executions: agent.executor.executions,
    methodsBeforeRecovery, allMethods: agent.calls.map(c => c.method), terminalRejected };
  // Sunucuyu ve depoyu yeniden açarak sonucun yalnızca bellekte kalmadığını kontrol ederiz.
  await agent.close();
  agent = await startAgent(db);
  client = await factory.createFromUrl(agent.baseUrl);
  const restored = await client.getTask({ id: taskId, tenant: '' }, { signal: timeout });
  assert.deepEqual(Task.toJSON(restored), Task.toJSON(terminal));
  report.persistence = { restoredAfterServerRestart: true, restartedExecutorCalls: agent.executor.executions };
  // Gerçek RPC endpoint’inde bilinmeyen metodun standart hata kodunu doğrularız.
  const invalid = await fetch(`${agent.baseUrl}/a2a`, { method: 'POST', headers: {
    'Content-Type': 'application/json', 'A2A-Version': '1.0'
  }, body: JSON.stringify({ jsonrpc: '2.0', id: 'bad', method: 'NotAMethod', params: {} }), signal: timeout });
  const body = await invalid.json() as { error?: { code?: number } };
  assert.equal(body.error?.code, -32601);
  report.rpcError = { methodNotFound: true };
  agent.executor.complete();
  const uninterrupted: string[] = [];
  for await (const event of client.sendMessageStream(request, { signal: timeout })) {
    uninterrupted.push(event.payload?.$case ?? 'missing');
  }
  assert.ok(uninterrupted.includes('artifactUpdate'));
  assert.equal(uninterrupted.at(-1), 'statusUpdate');
  const streamCalls = wire.filter(call => ['SendStreamingMessage', 'SubscribeToTask'].includes(call.method)
    && call.contentType.includes('text/event-stream'));
  assert.ok(streamCalls.length >= 3);
  // SDK’nın iç tiplerini değil, ağdaki A2A 1.0 alanlarını kontrol ederiz.
  const firstWire = wire.find(call => call.method === 'SendStreamingMessage')?.request as
    { params: { message: { role: string; parts: { data?: unknown; kind?: unknown }[] } } };
  assert.equal(firstWire.params.message.role, 'ROLE_USER');
  assert.ok(firstWire.params.message.parts[0]?.data);
  assert.equal(firstWire.params.message.parts[0]?.kind, undefined);
  report.uninterrupted = { events: uninterrupted, artifactReceived: true };
  report.wire = { streamingContentTypeVerified: true, role: firstWire.params.message.role, legacyKindAbsent: true };
  report.result = 'PASS';
  await writeFile(new URL('./evidence.json', import.meta.url), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
} finally {
  await agent.close();
  await rm(dir, { recursive: true, force: true });
}
