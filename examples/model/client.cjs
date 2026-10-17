// Agent handler'ı platform kaynaklarını import etmeden aynı HTTP sözleşmesini kullanır.
async function generate(prompt, { origin, token, signal = AbortSignal.timeout(95000) }) {
  const response = await fetch(new URL('/v1/generate', origin), { method: 'POST', redirect: 'error', signal,
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify({ prompt }) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? 'model_gateway_failed');
  return result;
}
module.exports = { generate };
