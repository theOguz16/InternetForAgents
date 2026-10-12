# Veri modeli ve sahiplik

Karar: Her backend kendi SQLite dosyasını ve volume'unu kullanır; dosya başka servisle paylaşılmaz. Bir uygulama bir instance. SQLite WAL, foreign key kontrolü ve kısa transaction'lar hedeflenir; ağ isteği transaction içinde tutulmaz.

## Registry DB

| Varlık | Alanlar / invariant |
| --- | --- |
| DeveloperPrincipal | Kimlik, token hash, role, status; raw secret yok |
| AgentRegistration | agentId, ownerId, cardUrl, healthUrl, administrativeState, revision |
| CardSnapshot | agentId+revision, validatedAt, digest, card JSON, validUntil |
| ProfileBinding | agentId/revision, profileId, skillId; kartta skill bulunmalı |
| HealthObservation | agentId, checkedAt, outcome, consecutiveFailures; kısıtlı diagnostic |
| AuditEvent | actor, action, target, timestamp, traceId; payload yok |

Candidate revision doğrulanmadan current pointer değişmez. Sahip/operator suspend nedeni refresh ile kaldırılmaz. Yeni kart doğrulanamazsa eski snapshot yalnız TTL içinde, güvenlik engeli yoksa kalır; endpoint/security mutation açık incelemeye alınır.

## Personal DB

UserPrincipal; Job (owner, operation, inputHash, durum, deadline); JobInput (kod, expiresAt); ChildTask (profile, requestId, messageId, dispatchState, selected revision); TaskLink (agent+endpoint+remoteTaskId); ChildOutput; IdempotencyKey; AuditEvent.

Job ve child planı aynı transaction'da oluşur. Bir child gönderilmeden seçim ve kimlikleri kaydedilir. Task id geldiği anda saklanır. Aggregate child state'lerden hesaplanır ve tutarlı snapshot yazılır. Aynı job'u iki worker almaması için transaction içinde claim gerekir; yine de tek instance sınırı korunur.

## Uzman DB'leri

A2ATask; TaskInput; Artifact; DedupKey (caller/profile/requestId unique, hash, taskId). SDK persistent store adapter'ı ile kullanılır; port ihtiyacı spike'ta doğrulanır. Bellek içi store restart kabul senaryosunu karşılamaz. Sağlanan SDK store uygun değilse SQLite port adapter'ı yazılır; JSON-RPC protokolü yeniden yazılmaz.

## Saklama ve veri minimizasyonu

Kod, artifact ve dedup sonucu en fazla 24 saat; günlük cleanup. Payload içermeyen task/audit metadata 7 gün. Kartların eski revision'ları referanslı iş metadata'sı kadar tutulur. Registry kaynak kodunu tutmaz. Sonuç süresi dolduğunda metadata korunur ve outputExpired gösterilir; silinmiş sonucu başarıyla döndüğü iddia edilmez.

İlk demo sentetik/kamuya açık örnek kod kullanır. Gerçek özel kaynak kodu veya harici LLM seçimi ayrı veri paylaşımı değerlendirmesi gerektirir. Tokenlar hash veya deployment secret olarak saklanır; görev payload'una yazılmaz.
