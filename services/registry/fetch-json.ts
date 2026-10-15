/** Boyut sınırı sıkıştırma açıldıktan sonra uygulanır; redirect yeni origin'e kaçamaz. */
export async function fetchJson(url: URL, maxBytes: number): Promise<unknown> {
  const response = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(3000), headers: { accept: "application/json" } });
  if (!response.ok || !response.headers.get("content-type")?.includes("application/json")) {
    await response.body?.cancel(); throw new Error("invalid_json_response");
  }
  const reader = response.body?.getReader(); if (!reader) throw new Error("empty_body");
  let size = 0; const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.byteLength; if (size > maxBytes) throw new Error("response_too_large");
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } finally { await reader.cancel(); }
}
