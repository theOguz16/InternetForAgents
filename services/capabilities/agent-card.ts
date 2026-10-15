/** Registry'nin tükettiği kart alanları. Tam A2A uygunluk sertifikası değildir. */
export interface RegistryCard {
  name: string;
  skillIds: string[];
  endpoint: string;
}
export class CardValidationError extends Error {
  constructor(readonly code: string, readonly path: string) { super(`${code}: ${path}`); }
}
function fail(code: string, path: string): never { throw new CardValidationError(code, path); }
function object(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('invalid_card_object', path);
  return value as Record<string, unknown>;
}
function text(value: unknown, max: number, path: string): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max) fail('invalid_card_string', path);
  return value;
}
function list(value: unknown, max: number, path: string): unknown[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > max) fail('invalid_card_list', path);
  return value;
}

export function validateRegistryCard(value: unknown, cardUrl: URL): RegistryCard {
  const card = object(value, '/card');
  const name = text(card.name, 200, '/card/name');
  const capabilities = object(card.capabilities, '/card/capabilities');
  if (capabilities.streaming !== true) fail('streaming_required', '/card/capabilities/streaming');
  const seen = new Set<string>();
  const skillIds = list(card.skills, 16, '/card/skills').map((raw, index) => {
    const path = `/card/skills/${index}`;
    const skill = object(raw, path);
    const id = text(skill.id, 128, `${path}/id`);
    if (id !== id.trim()) fail('invalid_skill_id', `${path}/id`);
    if (seen.has(id)) fail('duplicate_skill_id', `${path}/id`);
    seen.add(id);
    // Eski kartlar yalnız ID taşıyabilir. İsteğe bağlı metaveri varsa tipini
    // doğrularız; farklı A2A uzantılarını gereksiz yere yasaklamayız.
    if (skill.name !== undefined) text(skill.name, 200, `${path}/name`);
    if (skill.description !== undefined) text(skill.description, 2000, `${path}/description`);
    if (skill.tags !== undefined) {
      if (!Array.isArray(skill.tags) || skill.tags.length > 32) fail('invalid_skill_tags', `${path}/tags`);
      skill.tags.forEach((tag, i) => text(tag, 128, `${path}/tags/${i}`));
    }
    return id;
  });
  const matches: URL[] = [];
  list(card.supportedInterfaces, 8, '/card/supportedInterfaces').forEach((raw, index) => {
    const path = `/card/supportedInterfaces/${index}`;
    const item = object(raw, path);
    const binding = text(item.protocolBinding, 32, `${path}/protocolBinding`);
    const version = text(item.protocolVersion, 32, `${path}/protocolVersion`);
    const address = text(item.url, 2048, `${path}/url`);
    let endpoint: URL;
    try { endpoint = new URL(address); } catch { fail('invalid_interface_url', `${path}/url`); }
    if (!['http:', 'https:'].includes(endpoint.protocol) || endpoint.username || endpoint.password || endpoint.hash) fail('invalid_interface_url', `${path}/url`);
    if (binding === 'JSONRPC' && version === '1.0') {
      if (endpoint.origin !== cardUrl.origin || endpoint.pathname !== '/a2a' || endpoint.search) fail('endpoint_not_allowed', `${path}/url`);
      matches.push(endpoint);
    }
  });
  // Birden fazla uygun arayüzde sıralamaya göre sessiz seçim yapmayız.
  if (matches.length !== 1) fail('ambiguous_or_missing_interface', '/card/supportedInterfaces');
  return { name, skillIds, endpoint: matches[0].href };
}
