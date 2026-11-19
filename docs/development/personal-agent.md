# Personal Agent — ilk orkestrasyon

## Nasıl çalışır?

1. Kullanıcı metin ve istenen `skills` listesini gönderir.
2. Personal her beceriyi sürümlü profile çevirir: `language` → `text-language.v1`.
3. Registry’den o profile uyan adayları alır. İzinli endpoint’leri süzer ve kimliğe göre sıralayıp ilkini seçer. Bu seçim kalite/fiyat ölçümü değildir.
4. Resmi SDK ile doğrudan uzmana `SendStreamingMessage` gönderir; SSE olaylarını okur.
5. Artifact’i ortak çıktı şemasına göre doğrular. Üç görev bağımsız olarak ilerler.
6. Kullanıcıya job snapshot’ları ayrı bir SSE bağlantısıyla aktarılır. Tüm çocuklar bittiğinde toplam durum hesaplanır.

Registry adres rehberidir; kullanıcı metni Registry’ye gönderilmez. Personal, koordinatördür; dil/özet algoritmasını içermez. Uzmanlar iş mantığının sahibidir. Bu ayrım sayesinde sağlayıcıyı değiştirmek koordinasyon kodunu değiştirmeyi gerektirmez.

## Çalıştırma

Önce [Registry rehberindeki](registry-a2a.md) gibi servisleri açıp üç kartı kaydet. Docker dışında Personal için ayrı terminal:

```sh
AUTH_MODE=local-demo SERVICE_NAME=personal PORT=4002 npm run dev:service
```

Görev oluştur:

```sh
curl -X POST http://localhost:4002/v1/jobs \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: text-demo-1' \
  -d '{"text":"Agentlar ortak kontratlarla birlikte çalışır.","skills":["language","keywords","summary"]}'
```

Dönen `id` ile sonucu dinle:

```sh
curl -N http://localhost:4002/v1/jobs/JOB_ID/events
```

`JOB_ID` yerine gerçek kimlik yazılır. Görev tamamlanmış olsa bile son snapshot gelir, sonra bağlantı kapanır. `GET /v1/jobs/JOB_ID` tek seferlik durum okuma içindir; istemci bu endpoint’i periyodik sorgulamamalıdır.

## API davranışı

- `POST /v1/jobs`: yeni iş için 202. `skills`, language/keywords/summary içinden 1–3 farklı değer içerir. Bilinmeyen alanlar reddedilir.
- Aynı anahtar ve aynı içerik: 200 ile mevcut iş; farklı içerik: 409. Beceri sırası içerik farkı sayılmaz.
- `GET /v1/jobs/:id`: mevcut iş snapshot’ı veya 404.
- `GET /v1/jobs/:id/events`: SSE snapshot’ı ve değişiklikler. Yeniden bağlantıda olay geçmişi yerine güncel snapshot gelir; `Last-Event-ID` üzerinden geçmiş replay uygulanmaz.
- En fazla 8 çalışan, 100 saklanan iş ve 20 açık kullanıcı SSE bağlantısı. Kapasite dolunca 429. Tamamlanmış işler 24 saatten sonra yeni POST sırasında temizlenir.
- İş süresi bütçesi 60 saniyedir. Süre dolması uzak görevi iptal etmiş olduğumuz anlamına gelmez.

Job durumları: `running`, tümü başarılıysa `completed`, bazıları başarılıysa `partial`, hiçbiri başarılı değil ve belirsiz çocuk varsa `unknown`, diğer durumda `failed`. Çocuklar kendi sağlayıcı kimliğini, seçim gerekçesini, sonucu ve hata kodunu taşır. `partial` durumunda da çocukların belirsizliği ayrı görülebilir.

## SSE, polling ve belirsizlik

Uzman → Personal ve Personal → kullanıcı iki ayrı SSE akışıdır. İkinci akışta 15 saniyelik yorum satırı heartbeat’i yalnız açık bağlantıyı canlı tutar; sunucuya durum sorgusu göndermez. Bu yüzden polling değildir.

Uzman akışı hata verirse, görev kimliği biliniyor ve zaman bütçesi dolmamışsa bir kez `GetTask` yapılır. Bitmemiş görev `unknown` kalır. Bu ilk sürümde `SubscribeToTask` reconnect döngüsü henüz bağlanmadı. Otomatik yeniden gönderim/failover yapılmaz; aynı işi iki kez başlatma riski vardır.

## Sınırlar

Dil ve anahtar kelime uzmanları deterministik metin analizi yapar; özet fixture üretir. LLM çağrısı yoktur. [Algoritma açıklamaları](text-algorithms.md). Registry kayıtları, Personal işleri ve idempotency SQLite’ta saklanır. [Yeniden açılma davranışı](persistence.md). İşler sahiplidir; başkasının işi 404 döner ve idempotency anahtarları çağırana göre ayrılır. Kimlik, oturum ve roller: [identity.md](identity.md).

Tek parça JSON artifact desteklenir; parçalı artifact birleştirme yoktur. İnteraktif ek girdi/auth isteyen uzman profilleri desteklenmez. Ağ hataları kullanıcı metnini veya uzak hata ayrıntısını açığa çıkarmayan kodlarla gösterilir. React demo arayüzü eklendi; [çalıştırma rehberi](demo-ui.md).

## Kodda nereden okumalı?

Personal servisi [S1.0 servis içi mimarisini](../stage-1/03-architecture.md#servis-içi-mimari) izler (D01): Presentation → Application → Domain; Infrastructure portları uygular.

- `services/personal/router.ts` (presentation): yalnız HTTP durum kodu ve kullanıcı SSE’si.
- `services/personal/application/job-service.ts`: gönderim, girdi kontrolü, idempotency, süre sonu, kapasite, kalıcı revizyon ve abonelik.
- `services/personal/application/run-child.ts`: tek uzman adımı; keşif → seçim → bağlantı → gönderim ve hata anlamı (gönderim öncesi `failed`, sonrası `unknown`).
- `services/personal/application/ports.ts`: `JobRepository` (DB), `Clock`, `ProviderDirectory` ve `SpecialistGateway` (network).
- `services/personal/domain/`: iş durumu kuralları ve sağlayıcı seçimi. Express, SQLite, A2A SDK veya Ajv import etmez; `tests/personal-layers.test.cjs` bunu denetler.
- `services/personal/infrastructure/`: SQLite deposu, Registry keşfi, A2A JSONRPC+SSE istemcisi ve sistem saati.
- `services/main.ts`: composition root; somut adaptörler yalnız burada bağlanır.
- `services/shared/contracts.ts`: herkesin kabul ettiği veri biçimleri.

Bağımlılık yönü içe doğrudur: domain hiçbir katmanı bilmez, application yalnız domain ve portları bilir, uzmanların iç algoritması bilinmez. HTTP API ve SQLite kayıt biçimi D01 ile değişmedi; mevcut kayıtlar migration gerektirmez.
