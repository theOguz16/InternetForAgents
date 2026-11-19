/** Registry'den gelen, henüz doğrulanmamış aday kaydı. */
export interface ProviderCandidate { id: string; name: string; endpoint: string; profiles: string[] }

export const SELECTION_REASON = "İzinli ve uyumlu adaylar arasında kimlik sırasındaki ilk sağlayıcı; kalite sıralaması değildir.";

/**
 * Aday listesinden çağrılacak sağlayıcıyı seçer. Registry yanıtı güvenilir kabul
 * edilmez: bozuk alanlı, izinli origin dışında veya kimlik bilgisi/sorgu taşıyan
 * adresler elenir. Sıralama deterministiktir; aynı liste hep aynı sağlayıcıyı seçer.
 */
export function selectProvider(candidates: readonly ProviderCandidate[], profile: string, allowedOrigins: ReadonlySet<string>): ProviderCandidate | undefined {
  return candidates.filter(candidate => {
    try {
      const endpoint = new URL(candidate.endpoint);
      return typeof candidate.id === "string" && typeof candidate.name === "string" && candidate.profiles.includes(profile)
        && allowedOrigins.has(endpoint.origin) && endpoint.pathname === "/a2a" && !endpoint.username && !endpoint.password && !endpoint.search && !endpoint.hash;
    } catch { return false; }
  }).sort((a, b) => a.id.localeCompare(b.id))[0];
}
