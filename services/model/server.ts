import express from 'express';
import { FixtureBackend, ModelBackend, ModelError, checkRequest } from './port.js';
import { ModelQueue } from './queue.js';
import { OllamaBackend } from './ollama.js';
export function createModelApp(backend: ModelBackend, token: string, options: { capacity?: number; timeoutMs?: number } = {}) {
  if (token.length < 24) throw new Error('model_gateway_token_required');
  const queue = new ModelQueue(backend, options.capacity ?? 8, options.timeoutMs ?? 90000);
  const app = express(); app.disable('x-powered-by');
  app.use((req, res, next) => { if (req.get('authorization') !== `Bearer ${token}`) { res.status(401).json({ error: 'unauthorized' }); return; } next(); });
  app.use(express.json({ limit: '32kb' }));
  app.get('/health', (_req, res) => res.json(queue.status()));
  app.post('/v1/generate', async (req, res) => {
    const abort = new AbortController(); const disconnect = () => { if (!res.writableEnded) abort.abort(); };
    res.once('close', disconnect);
    try { const result = await queue.submit(checkRequest(req.body), abort.signal); res.json(result); }
    catch (e) {
      const code = e instanceof ModelError ? e.code : 'backend_failed';
      const status = code === 'invalid_request' ? 400 : code === 'queue_full' ? 429 : code === 'deadline_exceeded' ? 504 : 503;
      if (!res.destroyed) res.status(status).json({ error: code });
    } finally { res.removeListener('close', disconnect); }
  });
  app.use((_req, res) => res.status(404).json({ error: 'not_found' }));
  app.use((error: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => res.status(error?.status === 413 ? 413 : 400).json({ error: error?.status === 413 ? 'request_too_large' : 'invalid_request' }));
  return app;
}
if (require.main === module) {
  const mode = process.env.MODEL_BACKEND ?? 'fixture';
  if (!['fixture', 'ollama'].includes(mode)) throw new Error('unsupported_backend');
  const backend = mode === 'fixture' ? new FixtureBackend() : new OllamaBackend({ origin: process.env.OLLAMA_ORIGIN ?? 'http://127.0.0.1:11434', model: process.env.MODEL_NAME ?? '', digest: process.env.MODEL_DIGEST ?? '', context: Number(process.env.MODEL_CONTEXT ?? 2048), maxTokens: Number(process.env.MODEL_MAX_TOKENS ?? 512), seed: 42 });
  const port = Number(process.env.MODEL_PORT ?? 4300);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('invalid_port');
  const server = createModelApp(backend, process.env.MODEL_GATEWAY_TOKEN ?? '').listen(port, '127.0.0.1', () => console.log(JSON.stringify({ event: 'model_gateway_listening', port, mode })));
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => { server.close(); setTimeout(() => process.exit(1), 5000).unref(); });
}
