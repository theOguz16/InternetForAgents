# Platform REST API tasarımı

Uygulanan yerel alt küme: [Registry/A2A](../development/registry-a2a.md). Aşağıdaki sahiplik, kalıcılık ve Personal API kapsamı henüz uygulanmadı.

Durum: Tasarım; endpoint'ler uygulanmadı. Registry ve Personal Agent ayrı origin/servistir. UI reverse proxy aynı origin altında /registry ve /personal prefix'lerini upstream'de kaldırır. A2A endpoint'leri bu tablolardan ayrı standart SDK arayüzüdür.

## Registry — /v1

| İşlem | Yetki | Başarı |
| --- | --- | --- |
| POST /agents | developer | 202 pending; agentId/revision |
| GET /agents?profile=... | personal/developer | 200 aday listesi |
| GET /agents/{id} | görünür kayıt için personal; owner | 200 snapshot, revision ve health |
| PUT /agents/{id}/registration | owner | 202 yeniden doğrulama; If-Match revision zorunlu |
| POST /agents/{id}/suspend | owner/operator | 200 suspended |
| POST /agents/{id}/resume | owner/operator | 202 pending doğrulama |
| DELETE /agents/{id} | owner/operator | 204 removed |

Registration body: cardUrl, healthUrl, profileBindings [{profileId, skillId}]. Owner token'dan gelir. İstemci active/healthy atayamaz. cardUrl ve healthUrl bağımsız ağ izninden geçer. GET arama max limit 50/default20, cursor; aday ve elenme açıklaması yalnız görünür kayıtlar içindir. Boş aday 200 []; DB kesintisi 503.

Registry'nin schema version'ı platform v1'dir; A2A protocolVersion 1.0 ile aynı kavram değildir.

## Personal Agent — /v1

| İşlem | Yetki | Başarı |
| --- | --- | --- |
| POST /jobs | user | 202 jobId; Idempotency-Key zorunlu |
| GET /jobs/{id}/events | job owner | 200 text/event-stream; snapshot ve güncellemeler |
| GET /jobs/{id} | job owner | 200 job, child durumları ve hazır sonuçlar |
| GET /jobs | user | 200 yalnız kendi son job'ları |

POST body: operation=`review`, `tests` veya `review-and-tests`; language=`python`; source ≤32 KiB. Serbest metin LLM planlama ilk sürümde yok. Aynı user+key+body, 24 saat aynı jobId; farklı body 409. Token/endpoint istemci payload'unda kabul edilmez. 60 saniyelik kullanıcı job bütçesi task-lifecycle belgesine göre işler.

Job görünümü: id, operation, status, createdAt, children. Her child: profile, selectedAgent {id,name,revision}, selectionReason, state, remoteTaskId (debug görünümünde), output, error. Kod ve credential trace paneline basılmaz.

## Ortak HTTP davranışı

400 bozuk JSON, 401 kimlik, 403 izin, 404 görünmeyen/bulunmayan kaynak, 409 revision veya idempotency çatışması, 413 boyut, 422 desteklenmeyen operation/profile, 429 kota, 503 bağımlılık. Hatalar RFC 9457 + uygulama code/traceId. Başarılı job creation sonradan oluşan child hatası nedeniyle HTTP 500'e çevrilmez; GET job bu durumları sunar.

/health/live süreç, /health/ready DB ve profile hazırlığı. Health yalnız Compose ağı/operatöre açık; secret veya içerik göstermez. Geliştirmede açık demo principal yalnız localhost izolasyonuyla mümkündür; paylaşılan mod bearer gerektirir.

## OpenAPI ve protokol dokümanı

Platform REST için OpenAPI 3.1 makine belgesi kod aşamasında üretilir. A2A için yeni özel OpenAPI uydurulmaz; resmi SDK/standart kullanılır. Payload profile JSON Schema dosyaları da implementation çıktısıdır.
