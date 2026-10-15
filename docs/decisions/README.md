# Karar kayıtları

Güncel hedef: [S1.0](../stage-1/README.md), 15 Ekim 2026. [ADR-025](0025-stage1-baseline.md) bu baseline’ın karar ve alternatif haritasıdır. Kabul edilmiş tasarım, uygulanmış özellik anlamına gelmez.

| Kayıt | Güncel ilişki |
| --- | --- |
| [013 Agent ağı](0013-agent-network.md) | Korunur, generic kayıtla genişler |
| [014 A2A](0014-a2a-jsonrpc.md) | A2A 1.0 korunur; SSE için 023 |
| [015 Profiller](0015-skill-profiles.md) | Sabit profil kapsamı 025/B02 ile değiştirilir |
| [016 TS/SQLite](0016-typescript-sqlite.md) | Tek-instance Teslim A için korunur |
| [017 Discovery](0017-discovery-health.md) | 023/025 güncellik politikasına göre |
| [018 Selection](0018-selection.md) | Policy-aware seçim yönünde genişler |
| [019 Polling](0019-task-polling.md) | Polling kısmı 023 tarafından geçersiz |
| [020 Security](0020-security-boundaries.md) | S1.0 threat/runner politikasıyla genişler |
| [021 Demo](0021-demo-scope.md) | 024 ve sonra 025 kapsam değişikliği |
| [022 Delivery](0022-delivery.md) | S1.0 kabul kapılarıyla somutlaşır |
| [023 SSE](0023-sse-no-polling.md) | Korunur; polling yok |
| [024 Metin agent’ları](0024-local-text-agents.md) | Metinler regresyon olarak kalır; ana demo 025 |
| [025 Baseline](0025-stage1-baseline.md) | Etkin: ürün/mimari/kontrat/context/security/ölçüm |
| [026 Kod demo kontrat paketi](0026-code-demo-contracts.md) | Issue #36 uygulaması; bağımsız paket, şema/semantik sınırı |
