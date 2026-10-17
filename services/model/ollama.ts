import { ModelBackend, ModelError, ModelReply, ModelRequest } from './port.js';
export interface OllamaConfig { origin: string; model: string; digest: string; context: number; maxTokens: number; seed: number }
export async function boundedJson(response: Response): Promise<any> {
  if (!response.ok || !response.body) throw new ModelError('backend_http_error');
  const reader = response.body.getReader(); const chunks: Uint8Array[] = []; let size = 0;
  try {
    for (;;) { const { done, value } = await reader.read(); if (done) break; size += value.length;
      if (size > 262144) throw new ModelError('backend_response_too_large'); chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch { throw new ModelError('invalid_backend_response'); }
  finally { await reader.cancel().catch(() => undefined); reader.releaseLock(); }
}
const count = (n: unknown) => typeof n === 'number' && Number.isSafeInteger(n) && n >= 0 ? n : null;
export class OllamaBackend implements ModelBackend {
  cancellationCertain = false;
  private origin: string;
  constructor(private config: OllamaConfig) {
    const url = new URL(config.origin);
    // İlk artım yalnız yerel backend; uzak kullanıcı URL'si veya redirect kabul edilmez.
    if (url.protocol !== 'http:' || !['127.0.0.1', '[::1]'].includes(url.hostname) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('local_backend_required');
    if (!/^[a-zA-Z0-9._:/-]{1,128}$/.test(config.model) || !/^[a-f0-9]{64}$/.test(config.digest)) throw new Error('model_pin_required');
    if (!Number.isInteger(config.context) || config.context < 512 || config.context > 8192 || !Number.isInteger(config.maxTokens) || config.maxTokens < 1 || config.maxTokens > 2048 || !Number.isSafeInteger(config.seed)) throw new Error('invalid_model_options');
    this.origin = url.origin;
  }
  private get(path: string, signal: AbortSignal) { return fetch(this.origin + path, { signal, redirect: 'error' }).then(boundedJson); }
  async generate(input: ModelRequest, signal: AbortSignal): Promise<ModelReply> {
    let tags, version;
    try { tags = await this.get('/api/tags', signal); version = await this.get('/api/version', signal); }
    catch { throw new ModelError('backend_unavailable'); }
    const pinned = Array.isArray(tags?.models) ? tags.models.find((m: any) => m.name === this.config.model) : undefined;
    if (!pinned || pinned.digest !== this.config.digest) throw new ModelError('model_pin_mismatch');
    if (typeof version?.version !== 'string' || version.version.length > 100) throw new ModelError('invalid_backend_response');
    let reply;
    try {
      reply = await fetch(this.origin + '/api/generate', { method: 'POST', redirect: 'error', signal,
        headers: { 'content-type': 'application/json' }, body: JSON.stringify({ model: this.config.model, prompt: input.prompt,
          stream: false, think: false, keep_alive: '5m', options: { temperature: 0, seed: this.config.seed, num_ctx: this.config.context, num_predict: this.config.maxTokens } }) }).then(boundedJson);
    } catch { throw new ModelError('backend_outcome_unknown'); }
    if (reply?.done !== true || reply.model !== this.config.model || typeof reply.response !== 'string' || Buffer.byteLength(reply.response) > 32768) throw new ModelError('backend_outcome_unknown');
    if (reply.done_reason === 'length') throw new ModelError('output_truncated');
    // İstek sonunda tek gözlem: polling veya peak RAM/VRAM ölçümü değildir.
    let observed: any;
    try { const ps = await this.get('/api/ps', signal); observed = ps.models?.find((m: any) => m.digest === this.config.digest); } catch { /* Ölçüm yokluğu sıfır kaynak kullanımı değildir. */ }
    return { text: reply.response, mode: 'model', model: { name: this.config.model, digest: this.config.digest, backendVersion: version.version },
      usage: { inputTokens: count(reply.prompt_eval_count), outputTokens: count(reply.eval_count) },
      resources: { modelBytes: count(observed?.size), vramBytes: count(observed?.size_vram) } };
  }
}
