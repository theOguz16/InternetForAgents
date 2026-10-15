# Bağımsız IFA agent başlangıç paketi

Issue #5 / B05 yerel şablon teslimi. Node.js **24.x** gerekir. Bu klasör tek başına başka bir klasöre veya repoya kopyalanabilir: platformun `services/` dosyalarına import, workspace bağlantısı veya platformun node_modules dizinine ihtiyaç duymaz.

**Durum:** Yerel şablonun uygulaması ve kabul kanıtları tamamlanmış, insan review’ına hazırdır; B03 PR #72 ile develop’a alındı; B04 (#2) açık. 15 Ekim 2026: temiz kopyada kurulum/build ve 6 A2A kabul testi, Docker çağrısı ve gerçek Registry kaydı doğrulandı; ayrıntılar aşağıda. Platformun eski metin görev arayüzü bu beceriyi henüz çağırmaz; genel invocation B06/B10 kapsamında ilerler. Bu paket üretim SDK'sı veya internet servisi olarak sunulmamalıdır.

## Dosyalar ve değiştireceğin yerler

| Dosya | Sorumluluk |
| --- | --- |
| `src/config.ts` | Agent adı; capability ID/version/skillId; mod; girdi/çıktı şeması ve örnekleri |
| `src/handler.ts` | Girdi/çıktı TypeScript tipleri ve gerçek işlev |
| `src/server.ts` | A2A SDK bağlantısı, Card/manifest, doğrulama, görev yaşamı ve limitler |
| `src/client.ts` | Config'teki ilk örneği A2A üzerinden çağıran manuel kullanım örneği |
| `.env.example` | Dinleme ve ilan edilen origin ayarları |
| `Dockerfile` | Bağımsız image; platform dizini build context'e dahil edilmez |

Yeni beceri için **config ve handler** değiştir. Transport'u değiştirme. Örnek, metindeki Unicode kod noktalarını sayar; grapheme/görünen karakter, byte veya UTF-16 birimi sayısı değildir. `abc` → `{ "length": 3 }`. Model veya API anahtarı gerektirmez.

## Temiz klasörde başlatma

Bu klasörün içeriğini boş bir klasöre kopyala; `node_modules`, `dist` ve gerçek `.env` dosyasını taşıma. O klasörde:

```sh
node --version
npm ci --ignore-scripts
cp .env.example .env
npm run build
npm start
```

Node sürümü 24 olmalı. Node 22 proje tarafından desteklenmez. `npm ci` bu klasörün **kendi package-lock.json** dosyasını kullanır. Paket script'leri shell export gerektirmeden `.env` dosyasını okur. Geliştirme sırasında `npm run dev` kullanılabilir (otomatik watch yok).

İkinci terminalde, yine bu klasörde:

```sh
curl http://127.0.0.1:4201/health
curl http://127.0.0.1:4201/.well-known/agent-card.json
curl http://127.0.0.1:4201/ifa/capabilities.json
npm run call
```

`call`, config'in ilk input örneğini gönderir; başarılı sonuç `ifa-result.v1` artifact'ında görünür, ardından completed durumu gelir. Bu komut test paketi değil, elle çalıştırılan çağrı örneğidir. Başka beceriye geçtiğinde config örneklerini ve handler tiplerini birlikte güncelle.

## İletişim

```text
A2A istemcisi → /a2a → ifa-call.v1 doğrulama → handler
             ← task/status/artifact SSE ← ifa-result.v1
```

Card `/.well-known/agent-card.json`, manifest `/ifa/capabilities.json`; ikisi aynı config'ten üretilir. Card SDK codec'i ile JSONRPC 1.0 + streaming ilan eder. Tek capability ve tek application/json DataPart desteklenir. Capability ID/sürüm ve invocation UUID kontrol edilir. Sonuç şemadan geçmezse başarılı artifact yayımlanmaz.

Manifest şemaları yerel, geliştiricinin yazdığı config'tir; sunucu uzak şema indirip derlemez. Bu paketteki Ajv kontrolü platformun kısıtlı manifest validator'ının yerine geçmez. Şema değişince Registry kabulünü de doğrula; pattern/ref/oneOf gibi platformun desteklemediği alanlar ekleme.

## Docker ile başlatma

Bu klasörün içindeyken:

```sh
docker build -t ifa-text-length-agent .
docker run --rm --init --name ifa-text-length-agent \
  --read-only --tmpfs /tmp:size=16m --memory=128m --cpus=0.5 \
  --security-opt=no-new-privileges:true \
  -p 127.0.0.1:4201:4201 \
  -e PUBLIC_BASE_URL=http://127.0.0.1:4201 \
  ifa-text-length-agent
```

Container içinde HOST=0.0.0.0; host'ta yalnız loopback portu yayımlanır. PUBLIC_BASE_URL istemcinin erişebileceği adres olmalıdır, dinleme adresi değildir. Container'daki `127.0.0.1` başka container'a işaret etmez.

Mevcut platform Compose'u otomatik değiştirilmez. Docker Registry'ye kayıt için aynı Docker ağında erişilebilir servis origin'i ve Registry allowlist girdisi birlikte ayarlanmalıdır. Sağlayıcı origin'ini eklemek platform kaynak kodunu değiştirmeyi gerektirmez; operatör yapılandırmasıdır.

## Yerel Registry ile kayıt örneği

Agent 4201'de çalışırken platform repo kökünden, ayrı Registry instance'ı için:

```sh
SERVICE_NAME=registry PORT=4301 HOST=127.0.0.1 \
ALLOWED_AGENT_ORIGINS=http://127.0.0.1:4201 \
DATA_DIR=.data/registry-template npm run start:service
```

Platformun daha önce `npm run build:services` ile derlenmiş olması gerekir. Bu komut platform tarafına aittir; bağımsız agent'ı başlatmak için gerekli değildir. Mevcut 4001 Registry ve verileri kullanılmaz.

```sh
curl -X POST http://127.0.0.1:4301/v1/agents \
  -H 'Content-Type: application/json' \
  -d '{"cardUrl":"http://127.0.0.1:4201/.well-known/agent-card.json","manifestUrl":"http://127.0.0.1:4201/ifa/capabilities.json"}'
curl 'http://127.0.0.1:4301/v1/agents?profile=team-example/text-length'
```

Yeni kayıt 201, aynı adres güncellemesi 200; aynı capability/version farklı içerik 409 olabilir. Sözleşme değişirse version artır; sırf çatışmayı aşmak için başka birinin capability adını kullanma.

## Limitler ve hata davranışı

- 32 KiB HTTP body; çıktı en fazla 32 KiB ve outputSchema ile sınırlı.
- Aynı anda 1 handler. Yoğunsa task `agent_busy` ile failed olur.
- Handler bekleme bütçesi 5 saniye. Timeout işi zorla öldürmez: handler AbortSignal'a uymalı. CPU-bound/sandbox gerektiren iş burada çalıştırılmaz. Timeout sonrası gerçek iş bitene kadar yeni iş kabul edilmez.
- Süreç başına 1000 A2A HTTP isteği; sonra 429 `demo_request_budget_exhausted`. Bellekteki task/turn ve invocation kayıtlarını sınırlamak için basit geliştirme bütçesi. Restart kayıtları siler; kalıcı quota değildir.
- Aynı invocationId tekrarında `duplicate_invocation_not_supported` ile failed; **aynı task'ı döndüren idempotency/dedup henüz yok**. B06/D04 tamamlanmadan S1.0 dedup uyumu iddia edilmez. İstemci timeout sonrası yeni ID ile otomatik tekrar göndermemeli.
- Hata kodları: invalid_call, invalid_output, handler_failed, handler_timeout, agent_busy. Ham input, stack veya secret hata yanıtına eklenmez.
- Auth/tenant isolation, task persistence, model portu, cancellation ve genel registry otomatik kaydı yok. Caller kimliği olmadığı için yalnız yerel güvenilir geliştirici kullanımına uygundur.
- Side effects yalnız `none`; config'e başka bir mod yazmak gerçekte o özelliği uygulamaz. Model işi için B08 takip edilmeli.

## Tamamlanma öncesi kanıtlar

15 Ekim 2026 kabul kanıtı:

- Kaynak klasör node_modules/dist/.env hariç sistemin geçici dizinine kopyalandı; `.env.example` kopyalanarak `npm ci --ignore-scripts`, `npm run build` çalıştırıldı. Platform bağımlılıklarına ihtiyaç duymadan başarılı.
- `npm test`: **6/6** gerçek HTTP/A2A testi. Unicode/boş/maksimum input, invalid envelope/schema, tekrar invocation, 413 body limiti, bozuk output, handler hatası, timeout sırasında busy ve yalnız config/handler değişimiyle yeni beceri.
- Bağımsız `docker build` başarılı. Read-only, 128 MiB, 0.5 CPU container'ı 127.0.0.1:4321'e yayınlandı; health sonrasında temiz kopyadan `AGENT_URL=http://127.0.0.1:4321 npm run call` → `{length:3}`, completed.
- Container ilk açılır açılmaz yapılan ilk çağrı hazır olmadan başarısız oldu; health başarılı olduktan sonra çağrı geçti. Yeni çağrı göndermeden süreç hazır olmasını bekleyin; timeout sonrası işin çalışmadığını varsaymayın.
- Platform Registry router'ı ayrı loopback portu ve geçici bellek deposuyla çalıştırıldı; container Card+manifest kaydı **201**, capability filtresi **1 sağlayıcı** döndürdü. Mevcut Registry verisi değiştirilmedi.
- B03 birleşimi sonrası `npm run build`, platform `npm run test:services` **13/13** ve starter `npm test` **6/6** yeniden geçti. Güncel Registry ile yerel Node agent kaydı **201**, keşif **1 sağlayıcı**, A2A çağrısı `{length:3}` / completed verdi. Bu son birleşik deney Docker kullanmadı; yukarıdaki Docker kanıtı önceki aynı starter uygulamasına aittir.

Starter testleri kendi CI işinde `npm test` ile yürür. Kök test paketi bu testleri otomatik içermez. B04 tamamlanmış sayılmaz; üretim auth/dedup/persistence kabulü bu sonuçlardan çıkarılamaz.

Bir sonraki PR'da S1.0 bağımlılıkları tamamlandığında uyumluluk kontrolü ve kalıcı/kimlik kapsamlı dedup ortak adaptörle hizalanmalı; bu starter'ın sınırlı davranışı genel platform kontratının yerine geçmez.
