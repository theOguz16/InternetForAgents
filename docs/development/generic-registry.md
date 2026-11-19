# Genel Registry manifest desteği — B01 tamamlaması

B01 genel beceri kaydı kapsamı tamamlanmıştır (B03/B04 bağımlılıkları üzerinde; C01/C02/C03 kapsamları ayrı task’larda kalır). Kayıt isteği `{cardUrl}` (legacy metin kaydı) veya `{cardUrl, manifestUrl}` (manifest kaydı) kabul eder. Manifest aynı origin’de `/ifa/capabilities.json` adresindedir. `GET /v1/agents?profile=namespace/name` bilinmeyen/yeni namespace’li capability kimliklerini sabit profil listesine bağlı olmadan bulur; yeni agent veya yetenek eklemek için Registry kaynak koduna liste girişi gerekmez.

Örnek: `examples/manifests/text-length.json`.

```sh
npm run validate:manifest -- examples/manifests/text-length.json text-length
```

CLI kartın gerçek skill ID’lerini argüman olarak bekler; agent sunucusu başlatmaz. Yalnız proje dizini içindeki, en fazla 128 KiB büyüklüğündeki JSON dosyalarını okur; proje dışına yönlenen sembolik bağlantıları reddeder. Registry ağdan aldığı kartla eşlemeyi kendisi yapar.

## DTO ayrımı ve geriye uyumluluk (B01)

`services/registry/registration.ts`, `services/registry/router.ts` ve `services/registry/store.ts` içinde legacy metin kaydı ile manifest kaydı açık DTO’lara ayrılmıştır:

- **İstek DTO’ları (`RegistrationRequest`):** `LegacyRegistrationRequest` (`{ kind: "legacy", cardUrl }`) ve `ManifestRegistrationRequest` (`{ kind: "manifest", cardUrl, manifestUrl }`). Origin/path kontrolleri ağ isteğinden önce uygulanır.
- **Doğrulanmış kayıt DTO’ları (`AgentRegistration`):**
  - `LegacyAgentRegistration`: yalnızca `card.skillIds ∩ shared/contracts.ts profiles` kesişimini kabul eder; legacy profil eşleşmesi yoksa `422 no_supported_skill` döner. `shared/contracts.ts` bağımlılığı yalnız bu legacy kurucuya izole edilir.
  - `ManifestAgentRegistration`: desteklenen yetenekleri yalnızca doğrulanmış `manifest.capabilities[].id` listesinden üretir; karttaki fazladan legacy skill’ler sızdırılmaz ve yeni/bilinmeyen namespace’ler korunur.
- **Depolanan kayıt DTO’ları (`Entry`):** `LegacyAgentEntry | ManifestAgentEntry` ayrık birleşimidir. Keşif filtresi (`matchesProfileFilter`) manifest kayıtlarında doğrudan `entry.manifest.capabilities` kimliğini, legacy kayıtlarında `entry.profiles` listesini kullanır.
- **HTTP yanıt ve SQLite uyumu / migration:** `kind` ayrıştırıcısı yalnızca dahili TypeScript DTO katmanında kullanılır; HTTP JSON yanıtlarına ve SQLite `agents.body` alanına yazılmaz. Mevcut Personal servisi, eski metin demosu (`tests/platform.test.cjs`) ve diskteki mevcut SQLite snapshot’ları herhangi bir migration gerektirmeden aynı yanıt biçimiyle çalışmaya devam eder.

## Uygulananlar

- Draft-07 alt kümesi, root object, kapalı nesne, 8 derinlik, şema başına 100 property, enum 100, 16 capability, 1–10 örnek.
- Sonlu üst sınırlar; string ≤32768, array ≤1000. Pattern/ref/unknown keyword reddi.
- Manifest 128 KiB / kart 64 KiB, redirect kapalı, 3 saniye fetch bütçesi.
- Her örneğin input/output schema doğrulaması; JSON path’li hata.
- `major.minor.patch` sürümü; pre-release/build etiketleri v1’de desteklenmez.
- Capability ID+version başına digest; farklı sözleşmeyle aynı sürümü yeniden kaydetme 409.
- Agent-specific skillId digest dışında; açıklama, mod, örnek ve şemalar digest içinde. Bu, farklı sağlayıcıların aynı profile ait tanımı aynı yayımlamasını gerektirir. RFC 8785 canonicalization iddiası yoktur.
- Sürüm hash’i ve agent snapshot tek SQLite transaction’ında; hata rollback.

## Kalan sınırlar

Bu kayıt desteği genel yürütme desteği değildir. Personal hâlâ yalnız eski metin akışını çağırır; `ifa-call/result.v1` adaptörü B06/D task’larında gelecek. UI manifest formu henüz eklenmedi; yeni kayıt API/CLI üzerinden hazırlanır.

Namespace sahipliği/auth (C01), pending/suspend/revision (C01/C02), arama/sayfalama (C03), expiry (C04) ve DNS sabitleme (E03) bu teslimin kapsamında değildir. Bu yüzden yalnız operatörün izin verdiği yerel geliştirme origin’lerinde kullanılmalıdır. Kimlik doğrulama olmadan manifest adı sahiplik kanıtı değildir; generic endpoint herkese açık dağıtım için hazır değildir.

## S1.0 kabul ve tehdit kanıtları

- **K01 / K02 ([08-evaluation.md](../stage-1/08-evaluation.md)):** Sabit profil listesine dokunmadan bilinmeyen namespace’li (`acme-lab/word-counter`, `org-zero/json-pretty`) capability kaydı ve `GET /v1/agents?profile=<id>` keşfi (`tests/registry-registration.test.cjs`).
- **K05 / TH03 ([08-evaluation.md](../stage-1/08-evaluation.md), [04-security.md](../stage-1/04-security.md)):** Manifestsiz kayıtta legacy-dışı skill reddi (`422 no_supported_skill`), bozuk manifest/şema reddi (`422 { error, path }`) ve mevcut snapshot koruması (`tests/registry-registration.test.cjs`, `tests/agent-card.test.cjs`, `tests/manifest.test.cjs`).
- **TH02 ([04-security.md](../stage-1/04-security.md)):** İzinli origin dışı `cardUrl` ve farklı origin `manifestUrl` isteklerinin ağ çağrısı yapılmadan `422` ile reddedilmesi (`tests/registry-registration.test.cjs`, `tests/platform.test.cjs`).
- **Geriye uyumluluk:** Eski metin kayıt → keşif → paralel A2A → SSE akışı `tests/platform.test.cjs` değişmeden doğrulanır.

## Kart eşlemesi

Registry’nin kullandığı alanlar için typed Card doğrulaması ve hata/uyumluluk kuralları: [B03 uygulaması](agent-card-validation.md).
