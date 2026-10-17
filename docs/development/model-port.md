# B08 — Ortak yerel model portu

Issue #10. ModelBackend → ModelQueue → tek HTTP gateway. Agent handler'ı model
SDK'sını veya platform kaynaklarını import etmez; `examples/model/client.cjs`
ile aynı `{prompt}` isteğini gönderir. Fixture ve Ollama aynı response alanlarını
kullanır; `mode` değişir. Fixture sonucu kalite başarısı sayılmaz.

## Çalıştırma (Node 24, host üzerinde)

```sh
npm ci --ignore-scripts
npm run build:services
export MODEL_GATEWAY_TOKEN="$(openssl rand -hex 24)"
MODEL_BACKEND=fixture node dist/services/model/server.js
```

Gateway yalnız 127.0.0.1:4300 dinler. Token ekip/host ortamında secret olarak
sağlanır; git'e yazılmaz. İkinci terminal aynı token ile:

```sh
curl http://127.0.0.1:4300/v1/generate \
  -H "Authorization: Bearer $MODEL_GATEWAY_TOKEN" \
  -H 'Content-Type: application/json' -d '{"prompt":"hello"}'
```

Gerçek backend için aynı gateway komutu `MODEL_BACKEND=ollama`, `MODEL_NAME`
ve `MODEL_DIGEST` ile başlatılır. Tam 64 haneli digest `/api/tags` üzerinden
alınır; indirme/pull otomatik yapılmaz. `OLLAMA_ORIGIN` varsayılan
http://127.0.0.1:11434; yalnız loopback IP origin kabul edilir, redirect yoktur.
`MODEL_CONTEXT=2048`, `MODEL_MAX_TOKENS=512`, temperature=0, seed=42.
İstemci model/URL/options seçemez; bunlar operatör config'idir.

Her host'ta bir gateway ve ona ayrılmış Ollama instance'ı kullanılmalıdır.
Ollama başlatılırken `OLLAMA_NUM_PARALLEL=1`, `OLLAMA_MAX_LOADED_MODELS=1`
ayarlanmalıdır. Çalışan başka bir Ollama'yı sessizce yeniden yapılandırmayın.
Gateway'in dışından aynı modele gönderilen işler bu kuyruğa dahil değildir.
Bu teslim host üzerinde çalışır; Docker agent'larından host gateway'ine erişim
henüz açılmamıştır. Loopback binding'i gelişigüzel 0.0.0.0'a çevirmeyin;
servis kimliği/egress ve Docker ağı entegrasyonu ayrı review gerektirir.

## Sözleşme

POST /v1/generate: yalnız `{prompt: string}`, en fazla 16384 UTF-8 byte;
JSON gövdesi en fazla 32 KiB. Response: text, mode, model (name/digest/backendVersion),
usage (inputTokens/outputTokens), resources (modelBytes/vramBytes), timing
(queueMs/executionMs/totalMs). Text en fazla 32 KiB; Ollama yanıt gövdesi
262144 byte ile sınırlanır. Token metriği yoksa null; tahmini token üretilmez.
Çağıran agent sonucu kendi capability şemasıyla ayrıca doğrulamalıdır.

Yetkisiz 401; geçersiz girdi 400; büyük gövde 413; kuyruk dolu 429;
deadline 504; backend/pin/uzlaştırma hataları 503. Ham prompt, backend hatası
ve secret hata yanıtına/log'a yazılmaz. Health de bearer token ister.
Bu token yerel servis erişimidir; kullanıcı/tenant yetki sistemi değildir.

## Kuyruk ve iptal

Tek aktif inference ve en fazla 8 bekleyen iş; FIFO. 90 saniyelik bütçe kuyruğa
girişte başlar. Polling yok: tek istek/yanıt, iptalde AbortSignal.
Bekleyen işin iptali onu kuyruktan çıkarır. Aktif fixture iptalinde gerçek
promise bitene kadar slot tutulur. Aktif Ollama timeout/bağlantı kaybı/istemci
kopmasında uzak işin durduğu bilinmez: gateway blocked olur, bekleyen işleri
hata ile bitirir, otomatik retry veya yeni dispatch yapmaz.

Operatör backend'in işi bitirdiğini ya da ayrılmış Ollama sürecinin durduğunu
doğruladıktan sonra gateway'i yeniden başlatır. Gateway restart'ı tek başına
uzak işin bittiğini kanıtlamaz. Kuyruk kalıcı değildir; restart'ta işler kurtarılmaz.
Çoklu gateway/worker genel concurrency=1 garantisi vermez; I06 ayrı iştir.

## Ölçüm ve qualification

`node scripts/qualify-model.cjs MODEL DIGEST OUTPUT.json` on açık geliştirme
girdisini sırayla çağırır. Çıktı dosyası varsa üzerine yazılmaz. Fixture için
`fixture fixture-v1` kullanılabilir. Script gizli Q1 problemlerini okumaz.
Ham sonuçlar `docs/evaluation/` altında, dataset `tests/fixtures/model/` altında.
Bu küçük JSON/temel işlem deneyi backend uygunluğu içindir; Python doğruluğu,
review precision/recall veya mutation detection kanıtı değildir.

`/api/ps` yalnız sonuç sonunda bir kez okunur. modelBytes/vramBytes o andaki
backend raporudur; peak RAM/VRAM değildir. gatewayRssBytes ölçüm sürecine aittir,
model RSS değildir. İlk çağrı ayrı raporlanır; load_duration toplanmadığından cold olduğu doğrulanmaz. Eksik gözlem null kalır.
Arka plan programlarının etkisi izole edilmemiştir; küçük örneklem genellenmez.

## Kanıt ve uyumluluk

`tests/model-port.test.cjs`: model olmayan fixture, aynı HTTP sözleşmesi, yetki,
gövde limiti, FIFO/overload, kuyruk süresi, timeout, iptal, digest reddi,
redirect ve büyük backend yanıtı. Mevcut metin agent'ları ve B05 şablonu bu
servise otomatik taşınmaz; mevcut timeout ve handler davranışı korunur.
Yeni DB migration/dependency yoktur. S1.0 [EVAL-1](../stage-1/08-evaluation.md)
ve [TH03 kaynak sınırları](../stage-1/04-security.md) ile ilişkilidir.

API kaynakları (17 Ekim 2026 kontrolü):
[generate](https://docs.ollama.com/api/generate),
[ps](https://docs.ollama.com/api/ps), [parallelism](https://docs.ollama.com/faq).

## EVAL-M1 sabitlemesi ve gerçek sonuç

[EVAL-M1 revision 1](../evaluation/EVAL-M1.json) holdout kullanılmadan sabitlendi.
Aynı on açık örnekte llama3.2:3b **6/10**, qwen3:4b **0/10** strict JSON doğru
cevap verdi. Qwen cevaba düşünme metni ekledi; üç çıktısı token sınırında kesildi.
Llama dört örnekte yanlış değer/tür üretti. Bu sonuçları gizlemek için JSON
ayıklama veya yeniden deneme uygulanmadı. İlk geliştirme backend'i llama3.2:3b,
tam digest ve seçenekleri EVAL-M1'de kayıtlı. Model/quantization/prompt protokolü
değişirse yeni manifest revision ve yeni deney gerekir.

Önceden ilan edilen ilk kalite hedefleri EVAL-M1'de yer alır; bunlar mevcut
başarı ölçümü değildir ve küçük JSON qualification setinden istatistiksel olarak
türetilmemiştir. Gerçek generation/review/test ve bağımsız oracle ölçümleri
F02–F05/H06/H07 sonrasında yapılır. Bu hedefleri tutturamayan modelle kalite
kabulü verilmez. Değişiklik gerekirse sonuç görülmüş holdout üzerinde tuning
yapılmaz; ayrı deney sürümü ve yeni değerlendirme planı gerekir.

`node scripts/check-model-freeze.cjs` dataset/rapor hash'lerini ve seçilen model
ayarlarını kontrol eder. Bu kontrol insanların gizli verilere erişimini teknik
olarak engellemez. Holdout erişim kontrolü ve run manifesti benchmark ekibinin
sorumluluğundadır; bu PR holdout problemi/testi içermez.

## 17 Ekim 2026 teslim doğrulaması

Node24 temiz npm ci, build, 40/40 servis testi, 6/6 agent-template testi ve manifest CLI geçti. Gerçek bağımsız örnek istemci → HTTP gateway → Ollama çağrısı llama3.2 ile `{"answer":5}` döndürdü (yaklaşık 385 ms). Bu tek sıcak çağrı performans hedefi değildir. Docker/Compose uçtan uca, çoklu host ve uzun soak bu tur çalıştırılmadı. Mevcut Ollama ayarları/model dosyaları değiştirilmedi; ölçüm çağrıları aynı gateway kuyruğunda sırayla yapıldı.
