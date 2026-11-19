import { DiscoveryError, type ProviderDirectory } from "../application/ports.js";
import type { ProviderCandidate } from "../domain/provider-selection.js";

/** ProviderDirectory'nin Registry HTTP uygulaması. Aday alanlarını seçim katmanı doğrular. */
export class RegistryDirectory implements ProviderDirectory {
  constructor(private readonly registryOrigin: string) {}

  async find(profile: string, signal: AbortSignal): Promise<ProviderCandidate[]> {
    const url = new URL("/v1/agents", this.registryOrigin);
    url.searchParams.set("profile", profile);
    const response = await fetch(url, { signal, redirect: "error" });
    if (!response.ok) throw new DiscoveryError("discovery_failed");
    const body = await response.json() as { agents?: ProviderCandidate[] };
    if (!Array.isArray(body.agents) || body.agents.length > 100) throw new DiscoveryError("invalid_registry_response");
    return body.agents;
  }
}
