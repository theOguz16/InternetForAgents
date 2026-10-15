# B04 — Manifest sınırları ve mesaj şemaları

Issue #2. Uygulama: `services/capabilities/manifest.ts`; kabul kanıtları:
`tests/manifest-boundaries.test.cjs`, mevcut `tests/manifest.test.cjs` ve
`tests/agent-card.test.cjs`. S1.0 [kontrat](../stage-1/05-capability-contract.md),
[TH03 kaynak tüketimi / TH sınırları](../stage-1/04-security.md) ve
[K05 geçersiz payload reddi](../stage-1/08-evaluation.md) ile ilişkilidir.

## Kararlar ve sınırlar

| Kontrol | Uygulanan politika | Sınır kanıtı |
| --- | --- | --- |
| Manifest | En fazla 131072 UTF-8 byte | 131071 / 131072 kabul, 131073 ret; çok byte'lı karakter |
| Schema derinliği | Root 0; property/items geçişi +1; en fazla 8 | Object ve array ile 7 / 8 kabul, 9 ret |
| Property bütçesi | Her input/output schema ağacında toplam 100; iç içe alanlar aynı bütçeyi tüketir | 99 / 100 kabul, 101 ret |
| Enum | Her enum 1–100 öğe; duplicate Ajv tarafından reddedilir | 99 / 100 kabul, 101 / boş / duplicate ret |
| Capability | Agent başına 1–16; benzersiz ID ve skill binding | 15 / 16 kabul, 17 / boş ret; mevcut binding testleri |
| Örnek | Capability başına 1–10; input ve output doğrulanır | 9 / 10 kabul, 11 / boş ve hatalı örnek ret |
| String | maxLength zorunlu, 0–32768 Unicode kod noktası | Üst sınır çevresi, negatif, kesir, yanlış tip, eksik sınır |
| Array | maxItems zorunlu, 0–1000; items doğrulanır | Üst sınır çevresi ve geçersiz min/max |
| Sayı | Sonlu maximum zorunlu; minimum varsa sonlu ve maximum’dan küçük/eşit | Infinity / NaN / eksik / string ve ters aralık ret |

Property bütçesi tüm manifest boyunca ortak değildir: her capability'nin input ve
output şeması ayrı 100 alan bütçesine sahiptir. Toplam manifest ayrıca byte ve
16 capability sınırına tabidir. Bu belge mevcut davranışı açıklaştırır.

`validateManifest` parse edilmiş JSON'un kompakt serialization byte boyutunu
kontrol eder. Ağdaki ham gövdeyi (boşluklar dahil) `fetchJson` ayrıca sınırlar;
CLI da dosya boyutunu okumadan önce ve sonra kontrol eder. Bunlar farklı
katmanların kontrolleridir; validator ham HTTP byte kontrolünün yerine geçmez.

## Uzak referans ve desteklenmeyen keyword

İzin listesi Ajv compile çağrısından önce uygulanır. Yerel/uzak `$ref`, pattern,
format, oneOf/anyOf/allOf ve bilinmeyen keyword reddedilir. Validator senkron
Ajv kullanır; uzak şema yükleyicisi yoktur. Test, loopback HTTP referans sunucusu
istek sayacını ve Ajv compile sayacını birlikte kontrol eder: ikisi de sıfırdır.
Geçersiz örnekler `invalid_example`, bilinmeyen alanlar `unsupported_field`
ve JSON path ile bildirilir. S1.0’daki genel `unsupported_schema` ifadesinin
uygulamadaki daha ayrıntılı hata kodları bunlardır; mevcut API kodları korunur.

## Makine tarafından okunabilir envelope şemaları

- [ifa-call.v1](../../schemas/ifa-call.v1.schema.json)
- [ifa-result.v1](../../schemas/ifa-result.v1.schema.json)

İkisi de bağımsız Draft-07 JSON Schema dosyasıdır; dış `$ref` içermez. Zorunlu
alanlar, kapalı zarf, capability kimliği/sürümü, UUID ve sonuç modu doğrulanır.
Bunlar platformun güvenilir şemalarıdır; geliştiriciden gelen kısıtlı schema alt
kümesiyle karıştırılmamalıdır (platform şemaları kimlik için pattern kullanır).

Kullanım iki aşamalıdır: önce envelope, sonra seçilen manifestin input/output
şeması. Ardından capability/version/invocationId ve mode, çağrı/manifest
snapshot'ıyla karşılaştırılır. JSON Schema tek başına bu bağlam eşleşmesini,
byte kotasını, dedup, kimlik veya yetkiyi kanıtlayamaz. A2A message/task/artifact
wire formatı resmi SDK'ya aittir; bu dosyalar yalnız DataPart içeriğini tarif eder.
B06/B10 entegrasyonu bu şemaları tüketebilir; bu PR mevcut runtime yollarını
şemaları otomatik yükleyen yeni bir adaptöre dönüştürmez.

## Uyumluluk ve migration

Veritabanı veya digest algoritması değişmez. Mevcut geçerli manifest ve B05
şablonu aynı davranır. Tek davranış düzeltmesi: `executionMode` artık gerçekten
string olmalıdır; `['model']` gibi JSON dizilerini String ile dönüştürerek kabul
etmek kaldırıldı. Böyle bir bozuk kayıt varsa sağlayıcı modu string yaparak
uygun sürümle yeniden yayımlamalıdır; eski kayıtlar otomatik değiştirilmez.
Namespace yetkisi, snapshot TTL ve çalışma zamanı dedup bu teslimin kapsamında
değildir; S1.0’ın tamamı uygulanmış sayılmaz.

## Tekrarlanabilir doğrulama (Node 24)

```sh
npm ci --ignore-scripts
npm run build
npm run test:services
npm run validate:manifest -- examples/manifests/text-length.json text-length
npm --prefix examples/agent-template test
```

Son komut şablonun kendi bağımlılıklarının kurulu olmasını gerektirir.
Testler geçici port/bellek DB kullanır; ekip verisini değiştirmez. Kabul raporunda
hangi komutların gerçekten çalıştırıldığı ayrıca belirtilir.
