export class ModelError extends Error {
  constructor(readonly code: string) { super(code); }
}
export interface ModelRequest { prompt: string }
export interface ModelReply {
  text: string;
  mode: 'fixture' | 'model';
  model: { name: string; digest: string; backendVersion: string };
  usage: { inputTokens: number | null; outputTokens: number | null };
  resources: { modelBytes: number | null; vramBytes: number | null };
}
export interface ModelBackend {
  // HTTP iptali uzak inference'ın durduğunu kanıtlamaz.
  cancellationCertain: boolean;
  generate(input: ModelRequest, signal: AbortSignal): Promise<ModelReply>;
}
export function checkRequest(value: unknown): ModelRequest {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ModelError('invalid_request');
  const v = value as Record<string, unknown>;
  if (Object.keys(v).length !== 1 || typeof v.prompt !== 'string' || !v.prompt.trim() || Buffer.byteLength(v.prompt) > 16384) throw new ModelError('invalid_request');
  return { prompt: v.prompt };
}
export class FixtureBackend implements ModelBackend {
  cancellationCertain = true;
  async generate(_input: ModelRequest, signal: AbortSignal): Promise<ModelReply> {
    signal.throwIfAborted();
    return { text: '{"answer":"fixture"}', mode: 'fixture', model: { name: 'fixture', digest: 'fixture-v1', backendVersion: '1' }, usage: { inputTokens: null, outputTokens: null }, resources: { modelBytes: null, vramBytes: null } };
  }
}
