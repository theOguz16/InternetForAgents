# Çekirdek API tasarımı

Durum: MVP sözleşme tasarımı; endpoint'ler henüz uygulanmamıştır. Base path /v1. JSON istekler ve RFC 9457 hataları. Değişikliklerde gerekçe ADR'ye bağlanır.

| İşlem | Yetki | Başarı |
| --- | --- | --- |
| GET /v1/capabilities | agent:discover | 200 katalog; limit/cursor |
| POST /v1/discoveries | agent:discover | 200 alternatives ve gerekçeler |
| POST /v1/invocations | agent:invoke | 200 invocationId/state/output; Idempotency-Key zorunlu |
| GET /v1/invocations/{id} | Çağrının sahibi veya operator | 200 durum ve saklanan sonuç |
| POST /v1/providers | operator | 201 providerId; principal'a bağlama |
| POST /v1/services | provider:manage, sahibi | 201 pending kayıt; providerId ve contractUrl |
| POST /v1/services/{id}/versions | provider:manage, sahibi | 201 pending aday sürüm; contractUrl |
| GET /v1/services/{id} | Sahibi/operator veya görünür aktif kayıt için agent | 200 filtrelenmiş görünüm |
| POST /v1/services/{id}/suspend | Sahibi/operator | 200 suspended |
| POST /v1/services/{id}/resume | Sahibi/operator | 202 yeniden doğrulama bekliyor |
| DELETE /v1/services/{id} | Sahibi/operator | 204 kaldırıldı; soft delete |
| GET /health/live | Yerel/infra | 200 süreç çalışıyor |
| GET /health/ready | Yerel/infra | 200 veya 503; DB ve katalog hazırlığı |

POST discoveries: capabilityId, capabilityVersion, constraints nesnesi, preferences sıralı listesi, limit ve isteğe bağlı cursor. İş payload'u içermez. Ayrıntı Broker belgesinde.

POST invocations: serviceId, contractVersion, contractDigest, input. Principal token'dan türetilir; istemci ownerId belirleyemez. Endpoint veya secret alanı alınmaz. Input standardın inputSchema nesnesidir. Sonuç state ve output içerir; state=succeeded dışında normal başarı çıktısı yoktur. İş sonucunda 'teklif yok' gibi durumlar katalog şemasında tanımlanır.

Registry kayıtları pending olarak kalıcılaştırılır; aynı süreçte çalışan görev döngüsü doğrular. Başlangıçta pending kayıtlar tekrar alınır; aktive etme idempotent transaction'dır. İstemci GET service ile durumu izler. Aday sürüm aynı içerikle yeniden gönderilirse mevcut kayıt döner; aynı version farklı içerikle gelirse 409.

Auth: çekirdek bearer API token, tek operatör alanı, principal scope ve kaynak sahipliği. Sağlayıcı auth bağımsızdır. CORS varsayılan kapalı; aynı origin demo veya açık allowlist.

Koleksiyonlarda limit default 20/max 50. Kimlikler opaque; zamanlar offset içeren UTC ISO 8601. Makine OpenAPI belgesi uygulama görevinin çıktısıdır; bu dokümanla drift kabul edilmez.
