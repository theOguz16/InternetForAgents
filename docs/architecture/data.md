# Veri modeli ve sahiplik

Durum: MVP kararı. PostgreSQL tek kalıcı veri deposudur. ORM seçimi mimari karar değildir; migration ve transaction davranışını koruyan araç kod görevinde seçilir.

| Varlık | Sahibi | Temel alanlar ve kurallar |
| --- | --- | --- |
| CapabilityVersion | Catalog | id+version unique, input/output schema, semantics, effect, attributes, hash; immutable |
| Provider | Registry | id, ownerPrincipalId, status |
| Service | Registry | id, providerId, activeVersionId, status; kaldırma soft delete |
| ContractVersion | Registry | serviceId+version unique, canonical payload, hash, source URL, validation state, verifiedAt, validUntil; immutable payload |
| ValidationAttempt | Registry | versionId, timestamp, outcome, sanitized reason |
| Principal | Policy | id, role, scope, status; raw token yok |
| ApiToken | Policy | token hash, principalId, expiresAt/revokedAt |
| Invocation | Invocation | id, principalId, service/version/hash, state, inputHash, timestamps, errorCode |
| IdempotencyRecord | Invocation | principalId+key unique, requestHash, invocationId, expiresAt |
| InvocationResult | Invocation | invocationId, doğrulanmış çıktı veya sanitize hata, expiresAt |
| AuditEvent | Evidence | actor, action, target, time, traceId, outcome; secret/payload yok |

Transaction sınırları: aday kontratı aktive etme ve service aktif pointer'ı tek transaction; idempotency rezervasyonu ve accepted çağrı kaydı tek transaction. Ağ çağrısı açık DB transaction içinde tutulmaz. Güncelleme compare-and-swap ile çakışmada 409 verir. Ortak DB servisler arası tablo yazma izni anlamına gelmez.

## Saklama

MVP yalnızca sentetik örnek veri kullanır. Raw input saklanmaz; doğrulama sonrası hash tutulur. Yanıt/idempotency sonucu tekrar sunabilmek için 24 saat saklanır. Hassas olmayan çağrı metadata ve audit 30 gün tutulur. Kontrat sürümleri referansları yaşadığı sürece, en az son çağrıdan 30 gün sonra temizlenebilir. Cleanup günlük çalışır; kararlar retention config olarak izlenir. Demo dışı kişisel veri kullanımı ayrı veri koruma incelemesi gerektirir.

Sağlayıcı credential'ları DB kontratında saklanmaz; deployment secret ortamından provider/service referansıyla çözülür. Tokenlar hash'li tutulur; başlangıç operator token'ı güvenli provisioning ile verilir, loglanmaz. Arama için capabilityId/version, service status ve validUntil indeksleri kullanılır. Vektör DB ve Redis MVP'de yoktur.
