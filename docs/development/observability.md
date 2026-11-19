# Gözlemlenebilirlik: Trace, Metrik ve Yapısal Loglama (H02)

Personal servisinin iş yaşam döngüsü izlemesi (trace korelasyonu), sınırlı etiketli metrikleri ve izinli alan listeli (allowlist) JSON-satır loglaması. Tasarım tabanı: [S1.0 mimari](../stage-1/03-architecture.md#servis-içi-mimari), [tehdit TH06](../stage-1/04-security.md#tehditkontroltest-eşlemesi) ve [EVAL-1 K10/K12](../stage-1/08-evaluation.md#kpi-tanımları).

## Katman yerleşimi

- **Port (`services/personal/application/ports.ts`):** `Telemetry` (`event`, `metric`), `TraceEvent`, `MetricSample`, varsayılan sessiz `noopTelemetry` ve hata yutucu `safeEvent`/`safeMetric`.
- **Enstrümantasyon (`services/personal/application/job-service.ts`, `run-child.ts`):** İş kabulü, keşif, gönderim, uzak görev kimliği ve bitiş noktalarında yalnız `Telemetry` portuna yazar; somut log/metrik deposunu bilmez.
- **Altyapı (`services/personal/infrastructure/json-line-telemetry.ts`):** `JsonLineTelemetry` tek satır NDJSON (stdout) loglayıcısı ve bellek içi sayaç/histogram/gauge deposudur. `metricsSnapshot()` okuma görünümü sağlar; ayrı HTTP metrik uç noktası yoktur.
- **Bağlama (`services/main.ts`):** Yalnız `personal` composition root'unda bağlanır.
- **Domain ve router:** `services/personal/domain/**` ve `services/personal/router.ts` gözlemlenebilirlikten bağımsızdır; HTTP API ve SQLite şeması değişmez.

## Olay zinciri ve izinli alanlar (TH06)

Her kabul edilen iş için bir `traceId` üretilir ve paralel çalışan tüm adımlara aktarılır:

```text
job.accepted → step.discovered → step.dispatched → step.remote_task → step.finished → job.finished
```

- Gönderim öncesi keşif/bağlantı hatasında `step.dispatched` ve `step.remote_task` üretilmez; keşif hatası `step.discovered (outcome: "failed", errorCode)` ve `step.finished (outcome: "failed", errorCode)` ile kaydedilir.
- E10 genel maskeleme/audit katmanı henüz teslim edilmediğinden TH06 koruması **sıkı allowlist** ile uygulanır. `JsonLineTelemetry.event()` yalnız aşağıdaki 10 alana izin verir; bunun dışındaki hiçbir alan (`text`, `output`, `artifact`, `token`, `cookie`, `csrfToken`, `ownerId`, `principal`, `authorization`, `service` vb.) çıktıya girmez:

| Alan | Açıklama |
| --- | --- |
| `at` | ISO-8601 zaman damgası (`Clock` portundan) |
| `event` | `job.accepted`, `step.discovered`, `step.dispatched`, `step.remote_task`, `step.finished`, `job.finished` |
| `traceId` | İş bazlı korelasyon kimliği |
| `jobId` | Personal iş kimliği |
| `childId` | Adım beceri adı (`language`, `keywords`, `summary`) |
| `agentId` | Seçilen sağlayıcı kimliği |
| `remoteTaskId` | Uzak A2A görev kimliği |
| `outcome` | Olay veya terminal durum |
| `errorCode` | Bilinen hata kodu |
| `durationMs` | Negatif olmayan süre (ms) |

Dış servis kaynaklı kimliklerin log satırını şişirmemesi için metin alanları 256 karakterle sınırlandırılır. Telemetri yazım/serileştirme hataları iş akışını hiçbir koşulda kesmez.

## Metrikler ve cardinality sınırı

Yeni harici bağımlılık eklenmez; metrikler bellek içinde tutulur ve `metricsSnapshot()` ile savunmacı kopya olarak okunur:

| Metrik | Tür | Etiketler |
| --- | --- | --- |
| `personal_job_submissions_total` | counter | `outcome`, `errorCode` |
| `personal_jobs_total` | counter | `outcome` |
| `personal_job_duration_ms` | histogram | `outcome` |
| `personal_job_queue_wait_ms` | histogram | *(yok)* |
| `personal_jobs_running` | gauge | *(yok)* |
| `personal_steps_total` | counter | `skill`, `outcome`, `errorCode` |
| `personal_step_duration_ms` | histogram | `skill`, `outcome` |

- Yalnız `skill` (`profiles` anahtarları), `outcome` (durum enum'u) ve `errorCode` (bilinen hata kodları + `none`) etiket olabilir.
- Bilinmeyen her değer `"other"` olarak normalleştirilir; `jobId`, `agentId`, `traceId`, `ownerId` gibi yüksek cardinality alanlar etikete alınmaz.

## Sentetik trace örneği

```json
{"at":"2026-11-19T12:00:00.000Z","event":"job.accepted","traceId":"trace-1","jobId":"job-1","outcome":"accepted"}
{"at":"2026-11-19T12:00:00.015Z","event":"step.discovered","traceId":"trace-1","jobId":"job-1","childId":"language","agentId":"agent-text-language.v1","outcome":"selected","durationMs":15}
{"at":"2026-11-19T12:00:00.015Z","event":"step.dispatched","traceId":"trace-1","jobId":"job-1","childId":"language","agentId":"agent-text-language.v1","outcome":"dispatched"}
{"at":"2026-11-19T12:00:00.040Z","event":"step.remote_task","traceId":"trace-1","jobId":"job-1","childId":"language","agentId":"agent-text-language.v1","remoteTaskId":"task-text-language.v1-1","outcome":"identified"}
{"at":"2026-11-19T12:00:00.040Z","event":"step.finished","traceId":"trace-1","jobId":"job-1","childId":"language","agentId":"agent-text-language.v1","remoteTaskId":"task-text-language.v1-1","outcome":"completed","durationMs":40}
{"at":"2026-11-19T12:00:00.040Z","event":"job.finished","traceId":"trace-1","jobId":"job-1","outcome":"completed","durationMs":40}
```

## Mevcut davranışın korunması ve sınırlar

- `Job` domain modeli, HTTP yanıtları ve SQLite `SavedState` (v2) biçimi değişmediği için veri migration'ı gerekmez.
- `JobServiceDeps.telemetry` opsiyoneldir ve verilmediğinde `noopTelemetry` kullanılır; mevcut testler sessiz ve değişmeden çalışır.
- `traceId` SQLite'ta saklanmadığı için süreç yeniden başlatıldığında `recoverAfterRestart()` ile kapanan yarım işlerin önceki `traceId`'si korunmaz.
- Genel maskeleme ve güvenlik audit kaydı **E10** kapsamındadır. Doğrulama testleri: `tests/observability.test.cjs`.
