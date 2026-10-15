# F01-IMPL — Kod demosu kontratları

Durum: Issue #36 için ortak paket ve kontrat doğrulaması uygulanmıştır.
Agent’lar, runner ve yeni HTTP endpoint’i bu teslimde yoktur. Tasarım kaynakları:
[S1.0 profilleri](../stage-1/06-code-demo.md),
[manifest](../stage-1/05-capability-contract.md), [ADR-026](../decisions/0026-code-demo-contracts.md).

## DTO farkı ve uygulama planı

Mevcut `services/shared/contracts.ts` metin profillerinin `profile/text` ve
`profile/mode/output` DTO’larını taşır. `services/personal/router.ts` yalnız metin
işlerini açar; `services/shared/a2a.ts` aynı legacy profilleri yürütür.
B04’ün `schemas/ifa-{call,result}.v1.schema.json` dosyaları genel envelope’u
sağlar. Bunların hiçbiri FunctionSpec veya kod/review/test payload’larını tanımaz.

Bu artımın planı ve sonucu: (1) ortak input/output şemalarını ayrı pakette üret,
(2) ilişkisel kontrolleri saf doğrulayıcıda tut, (3) geçerli/bozuk fixture ve
bağımsız kurulum testi ekle. Metin runtime’ını kod agent’ına dönüştürmez.
Gelecekteki adaptör önce mevcut B04 envelope’unu, sonra seçilen tam profile
sürümüyle bu paketi doğrulamalı; sonucun capability/version/invocation/mode ve
snapshot digest eşleşmesini ayrıca kontrol etmelidir.

## Alan ve semantik kuralları

Paket: [`@ifa/code-demo-contracts@1.0.0`](../../packages/code-demo-contracts/README.md).
Yedi bağımsız Draft-07 makine şeması `packages/code-demo-contracts/schemas/`
içindedir: FunctionSpec ve üç input/output çifti. `$ref`, pattern, executable
format veya union kullanılmaz; manifestin B04 alt kümesi bu şemaları kabul eder.

| Katman | Uygulanan kontrol |
| --- | --- |
| FunctionSpec şeması | python sabiti; functionName 1–64; 0–8 parametre; beş tür; 1–10 requirement, 1–500 karakter; kapalı nesneler |
| İmza semantiği | Fonksiyon ve parametreler ASCII identifier; Python hard keyword ve başı/sonu `__` olan adlar ret; parametre adları case-sensitive benzersiz |
| Parametre adı | Sonlu şema sınırı için 1–64 karakter; varargs/default/decorator/async alanları kabul edilmez |
| Generation | code 1–32768 kod noktası ve en fazla 32768 UTF-8 byte; explanation 1–2000 karakter |
| Review | 0–20 bulgu; id 1–64; severity info/warning/error; message/suggestion 1–1000; opsiyonel integer line 1–10000 ve input kodunun satır sayısını aşamaz; summary 1–2000 |
| Verdict | no_findings tam sıfır bulgu; changes_requested en az bir bulgu ister |
| Test generation | framework unittest; tests için code ile aynı boyut sınırı; scenarios 1–20, her biri 1–300 karakter; `passed` gibi ek alanlar ret |
| Sürüm | Her iki doğrulama fonksiyonu bilinmeyen ID veya `1.0.0` dışındaki sürümü reddeder |

Python soft keyword `match`, `case`, `type` normal identifier bağlamında geçerlidir.
Requirement anlamı, belirsizliği ve model prompt güvenliği bu saf yapısal/semantik
kontrollerle ispatlanmaz. Kod ve test metni çalıştırılmaz veya parse edilmez.
Generation output’unun gerçek Python imzası, izin verilen import/AST ve 1–20
gerçek unittest case kontrolü **E07** sorumluluğudur; burada geçti iddia edilmez.

## Kabul kriterleri ve negatif kanıtlar

`tests/code-demo-contracts.test.cjs` her kriteri çalıştırır:

| Issue kriteri | Pozitif / negatif kanıt |
| --- | --- |
| 1. Üç profil örneği schema geçer | Üç `examples/code-demo/*.json` dosyası Ajv, semantik validator ve gerçek B04 manifest validator’ından geçer; zorunlu her input/output alanının silinmesi reddedilir |
| 2. Eksik alan, bozuk signature, tutarsız verdict ret | `invalid/` fixture’ları; keyword/dunder/ASCII hataları, duplicate parametre, yanlış tür, limit ±1, ters verdict, geçersiz finding line, fazladan alan ve UTF-8 çok byte testi |
| 3. Aynı paket/sürüm import | Geçici bağımsız projeye gerçek npm pack/lockfile/ci; CJS, ESM, TypeScript; farklı sürümler input/output doğrulamasında ret |

Bu kanıtlar S1.0 K05, TH03 (boyut sınırı) ve TH07’nin şema/doğruluk iddiası
ayrımıyla ilişkilidir; bütün tehdit modelinin uygulandığını göstermez.

**Doğrudan çağrı ve başka kullanıcı:** Bu paket ağ, principal, job/artifact ID’si
veya veri deposu içermediğinden kullanıcı A/B erişim testi burada uygulanamaz.
Mevcut anonim Personal/A2A yollarının auth açığı çözülmüş değildir. Issue’nun
bu genel test beklentisi B06 ve kimlik/ownership entegrasyonunda gerçek HTTP
üzerinden doğrulanmalıdır; paket testini TH01/K06 kanıtı saymayın. Sürüm reddi
ise paketin doğrudan fonksiyon çağrılarında her üç profil için kanıtlanır.

## Sürüm ve migration

Yeni bağımsız paket sürümü 1.0.0; üç profil de S1.0’daki 1.0.0 kimliğiyle başlar.
Şema veya semantiği kıran değişiklikte profil sürümü artırılmalıdır; aynı
ID/sürüm içeriği değiştirilmez. Paket tarball’ı ve consumer lockfile aynı
artifact’i sabitler; npm registry yayını yapılmamıştır. Paket kurulum/import
örneği kendi README’sindedir.

Legacy metin şemaları, Registry manifest validator/digest, B04 envelope,
veritabanları ve router davranışı değişmez. Yeni paket kökte yerel file
bağımlılığıdır; agent geliştiricisinin platform servislerini import etmesi
gerekmez. Ağ/izin politikası eklenmedi. DTO alias’ı veya DB migration’ı yoktur.

## Tekrarlanabilir doğrulama

Node.js 24 ile repo kökünde:

```sh
npm ci --ignore-scripts
npm run export:contracts
npm run build
npm run test:services
npm run validate:manifest -- examples/manifests/text-length.json text-length
npm --prefix examples/agent-template ci --ignore-scripts
npm --prefix examples/agent-template test
```

Yeni kontrat testleri service test komutuna dahildir. Bağımsız consumer testi
npm ci’nin doldurduğu tarball cache’ini sabit consumer lockfile ile offline kullanır;
registry metadata’sına ihtiyaç duymaz ve geçici dizini temizler.
Testler ekip DB/portlarını değiştirmez. Gerçek çalıştırma sonuçları ve güncel
head SHA, PR’ın AI destekli teslim raporunda tutulur; bu belge sonraki her commit
ve ortam için başarı iddiası değildir.

Bağımlılık notu: yeni paket Ajv 8.20.0’ı tam sürümle kullanır. Kök uygulamanın
mevcut Ajv 8.17.1 pin’i bu işte değiştirilmez; `npm audit` burada `$data`
seçeneğine ilişkin GHSA-2g4f-4pwh-qvx6 moderate bulgusunu bildirebilir.
Yeni paket `$data` açmaz ve sabit, güvenilir şemalarla çalışır.


## Docker paketleme kontrolü (PR #74 review düzeltmesi)

Kök `file:packages/code-demo-contracts` bağımlılığı image içinde aynı yolu ister.
`infrastructure/Dockerfile` paket kaynaklarını **npm ci öncesinde** kopyalar ve
kurulum katmanında gerçek `require('@ifa/code-demo-contracts')` çalıştırır. Böylece
kopuk yerel paket bağlantısı demo henüz paketi kullanmasa bile build’i durdurur.
`.dockerignore` nested `node_modules` dizinlerini de dışlar; geliştiricinin yerel
bağımlılıkları kaynaklarla birlikte image’a taşınmaz.

```sh
docker build --progress=plain -f infrastructure/Dockerfile -t ifa-f01-contracts-review:pr74 .
docker run --rm --network none --read-only --entrypoint node ifa-f01-contracts-review:pr74 -e "const assert = require('node:assert/strict'); const c = require('@ifa/code-demo-contracts'); assert.equal(c.VERSION, '1.0.0'); assert.equal(require('@ifa/code-demo-contracts/schemas/function-spec.schema.json').type, 'object'); console.log(require.resolve('@ifa/code-demo-contracts'));"
```

Review doğrulamasında gerçek image build’i ve backend/frontend build geçti.
Ayrıca ağ kapalı/read-only container’da UID 1000 ile CJS + ESM + JSON schema
importları, üç profilin input/output örnekleri, farklı sürüm, keyword identifier
ve tutarsız verdict retleri doğrulandı. Node image sürümü v24.22.0;
`require.resolve` sonucu `/app/packages/code-demo-contracts/index.cjs` oldu.
Image kimliği ve güncel head SHA PR açıklamasındadır. Compose servisleri ve
kalıcı volume’lar bu kontrolde kullanılmaz; uçtan uca Compose/runner testi değildir.
