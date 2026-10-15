import { randomUUID } from 'node:crypto';
import { Artifact, SendMessageRequest, TaskState } from '@a2a-js/sdk';
import { ClientFactory } from '@a2a-js/sdk/client';
import { capability } from './config.js';

// Yalnız geliştiricinin seçtiği yerel agent'a yapılan örnek çağrıdır;
// platformun allowlist/auth uygulayan genel istemcisi değildir.
async function main() {
  const url = new URL(process.env.AGENT_URL ?? 'http://127.0.0.1:4201');
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('AGENT_URL yalnız origin olmalı');
  const client = await new ClientFactory().createFromUrl(url.origin);
  let terminal = TaskState.TASK_STATE_UNSPECIFIED;
  for await (const event of client.sendMessageStream(SendMessageRequest.fromJSON({ message: {
    messageId: randomUUID(), role: 'ROLE_USER', parts: [{ mediaType: 'application/json', data: {
      contract: 'ifa-call.v1', capability: { id: capability.id, version: capability.version },
      invocationId: randomUUID(), input: capability.examples[0].input,
    } }],
  } }), { signal: AbortSignal.timeout(10000) })) {
    const payload = event.payload;
    if (payload?.$case === 'artifactUpdate' && payload.value.artifact) console.log(JSON.stringify(Artifact.toJSON(payload.value.artifact), null, 2));
    if (payload?.$case === 'task') terminal = payload.value.status?.state ?? terminal;
    if (payload?.$case === 'statusUpdate') {
      terminal = payload.value.status?.state ?? terminal;
      console.log(JSON.stringify({ state: terminal }));
    }
  }
  if (terminal !== TaskState.TASK_STATE_COMPLETED) throw new Error('Agent tamamlanmış sonuç döndürmedi');
}
void main().catch(() => { console.error('Örnek çağrı başarısız; agent adresini ve sunucu durumunu kontrol edin.'); process.exitCode = 1; });
