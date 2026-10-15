const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { mkdtemp, cp, symlink, writeFile, appendFile, rm } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');
const net = require('node:net');
const { randomUUID } = require('node:crypto');
const { ClientFactory } = require('@a2a-js/sdk/client');
const { SendMessageRequest, TaskState, Artifact, Message } = require('@a2a-js/sdk');
const root = resolve(__dirname, '..');

async function availablePort() {
  const socket = net.createServer();
  await new Promise(resolve => socket.listen(0, '127.0.0.1', resolve));
  const port = socket.address().port;
  await new Promise(resolve => socket.close(resolve));
  return port;
}
async function start(t, replacement, configPatch) {
  let cwd = root;
  if (replacement) {
    cwd = await mkdtemp(join(tmpdir(), 'ifa-handler-fixture-'));
    await cp(join(root, 'dist'), join(cwd, 'dist'), { recursive: true });
    await symlink(join(root, 'node_modules'), join(cwd, 'node_modules'), 'dir');
    await writeFile(join(cwd, 'dist/handler.js'), replacement);
    if (configPatch) await appendFile(join(cwd, 'dist/config.js'), '\n' + configPatch);
    t.after(() => rm(cwd, { recursive: true, force: true }));
  }
  const port = await availablePort();
  const url = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, ['--env-file-if-exists=.env', 'dist/server.js'], { cwd, env: { ...process.env, HOST: '127.0.0.1', PORT: String(port), PUBLIC_BASE_URL: url }, stdio: ['ignore', 'pipe', 'pipe'] });
  let stderr = ''; child.stderr.on('data', chunk => { stderr += chunk; });
  t.after(async () => {
    if (child.exitCode !== null) return;
    await new Promise(resolve => {
      child.once('exit', resolve); child.kill('SIGTERM');
      const timer = setTimeout(() => child.kill('SIGKILL'), 6000); timer.unref();
      child.once('exit', () => clearTimeout(timer));
    });
  });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`startup timeout: ${stderr}`)), 7000);
    child.stdout.on('data', chunk => { if (chunk.toString().includes('listening')) { clearTimeout(timer); resolve(); } });
    child.once('exit', code => { clearTimeout(timer); reject(new Error(`startup ${code}: ${stderr}`)); });
  });
  return { url, client: await new ClientFactory().createFromUrl(url) };
}
function call(input = { text: 'abc' }) {
  return { contract: 'ifa-call.v1', capability: { id: 'team-example/text-length', version: '1.0.0' }, invocationId: randomUUID(), input };
}
async function invoke(client, data) {
  let state; let output; let error;
  for await (const event of client.sendMessageStream(SendMessageRequest.fromJSON({ message: {
    messageId: randomUUID(), role: 'ROLE_USER', parts: [{ mediaType: 'application/json', data }],
  } }), { signal: AbortSignal.timeout(10000) })) {
    const p = event.payload;
    if (p?.$case === 'artifactUpdate') output = Artifact.toJSON(p.value.artifact).parts[0].data;
    const status = p?.$case === 'statusUpdate' ? p.value.status : p?.$case === 'task' ? p.value.status : undefined;
    if (status) {
      state = status.state;
      if (status.message) error = Message.toJSON(status.message).parts[0].data?.error?.code;
    }
  }
  return { state, output, error };
}

test('Card/manifest eşleşir; bağımsız A2A Unicode sonucu üretir', async t => {
  const { url, client } = await start(t);
  const card = await (await fetch(`${url}/.well-known/agent-card.json`)).json();
  const manifest = await (await fetch(`${url}/ifa/capabilities.json`)).json();
  assert.equal(card.skills[0].id, manifest.capabilities[0].skillId);
  assert.equal(card.supportedInterfaces[0].url, `${url}/a2a`);
  for (const [text, length] of [['abc', 3], ['A😀ğ', 3], ['', 0], ['a'.repeat(8000), 8000]]) {
    const input = call({ text }); const result = await invoke(client, input);
    assert.equal(result.state, TaskState.TASK_STATE_COMPLETED);
    assert.equal(result.output.contract, 'ifa-result.v1');
    assert.equal(result.output.invocationId, input.invocationId);
    assert.deepEqual(result.output.output, { length });
  }
});
test('Bozuk çağrı/schema reddi ve aynı invocation tekrarının açık hatası', async t => {
  const { url, client } = await start(t);
  const invalid = [call({ text: 5 }), call({ text: 'a'.repeat(8001) }), call({ text: 'abc', extra: true }), { ...call(), contract: 'wrong' }, { ...call(), invocationId: 'wrong' }, { ...call(), capability: { id: 'other/skill', version: '1.0.0' } }];
  for (const data of invalid) {
    const result = await invoke(client, data);
    assert.equal(result.state, TaskState.TASK_STATE_FAILED);
    assert.equal(result.error, 'invalid_call'); assert.equal(result.output, undefined);
  }
  const repeated = call(); await invoke(client, repeated);
  assert.equal((await invoke(client, repeated)).error, 'duplicate_invocation_not_supported');
  const large = await fetch(`${url}/a2a`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ data: 'x'.repeat(40000) }) });
  assert.equal(large.status, 413);
});
test('Hatalı handler çıktısı başarılı artifact olmaz', async t => {
  const { client } = await start(t, 'exports.execute = async () => ({ length: "bad" });');
  const result = await invoke(client, call());
  assert.equal(result.error, 'invalid_output'); assert.equal(result.output, undefined);
});
test('Handler hatası hassas ayrıntıyı açığa çıkarmaz', async t => {
  const { client } = await start(t, 'exports.execute = async () => { throw new Error("SECRET_SENTINEL"); };');
  const result = await invoke(client, call());
  assert.equal(result.error, 'handler_failed'); assert.ok(!JSON.stringify(result).includes('SECRET_SENTINEL'));
});
test('Timeout işi bitirmeden slotu serbest bırakmaz', async t => {
  const { client } = await start(t, 'exports.execute = async () => new Promise(resolve => setTimeout(() => resolve({ length: 3 }), 6500));');
  const result = await invoke(client, call());
  assert.equal(result.error, 'handler_timeout'); assert.equal(result.output, undefined);
  assert.equal((await invoke(client, call())).error, 'agent_busy');
});

test('Yalnız config ve handler değişikliği yeni beceri oluşturur', async t => {
  const { url, client } = await start(t,
    'exports.execute = async input => ({ length: Array.from(input.text).length * 2 });',
    "exports.capability.id = 'team-example/double-length'; exports.capability.skillId = 'double-length'; exports.capability.outputSchema.properties.length.maximum = 16000; exports.capability.examples[0].output.length = 6;");
  const manifest = await (await fetch(`${url}/ifa/capabilities.json`)).json();
  assert.equal(manifest.capabilities[0].id, 'team-example/double-length');
  const data = call(); data.capability.id = 'team-example/double-length';
  const result = await invoke(client, data);
  assert.equal(result.state, TaskState.TASK_STATE_COMPLETED);
  assert.deepEqual(result.output.output, { length: 6 });
});
