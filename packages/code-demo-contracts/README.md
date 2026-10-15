# @ifa/code-demo-contracts 1.0.0

Node.js 24 için S1.0 kod üretme, review ve test üretme kontratları. Agent,
HTTP/A2A adaptörü, veri deposu veya runner içermez. Üç capability sürümü de
`1.0.0` olarak doğrulanır; başka sürüm otomatik uyarlanmaz.

## Aynı artifact’i kullanma

Repo kökünde `npm ci --ignore-scripts` sonrasında:

```sh
npm pack ./packages/code-demo-contracts --pack-destination /tmp --json
```

Üretilen `ifa-code-demo-contracts-1.0.0.tgz` dosyasını geliştiricilerle aynı
artifact olarak paylaşın; `--json` çıktısındaki integrity değerini karşılaştırın.
Paket npm registry’sine yayımlanmış değildir. Bağımsız agent projesinde:

```sh
npm install --save-exact /path/to/ifa-code-demo-contracts-1.0.0.tgz
```

Tarball’ı proje içinde sabit bir konumda tutun; `package.json` ve oluşan
`package-lock.json` dosyalarını commit edin. Lockfile tarball integrity’sini ve
transitive bağımlılıkları sabitler; diğer geliştiriciler `npm ci --ignore-scripts`
kullanır. Repo içindeki `file:packages/code-demo-contracts` geliştirme bağlantısı,
bağımsız agent’ın platform kaynaklarına import yapmasını gerektirmez.

## Doğrulama

```js
const { VERSION, PROFILE_IDS, validateInput, validateOutput } = require('@ifa/code-demo-contracts');
const profile = { id: PROFILE_IDS.generation, version: VERSION };
const input = validateInput(profile, {
  spec: {
    language: 'python', functionName: 'sum_even',
    parameters: [{ name: 'numbers', type: 'list[int]' }], returnType: 'int',
    requirements: ['Çift sayıların toplamı; boş liste için 0.'],
  },
});
const output = validateOutput(profile, {
  code: 'def sum_even(numbers):\n    return sum(n for n in numbers if n % 2 == 0)\n',
  explanation: 'Çift sayıları toplar.',
}, input);
```

ESM named import ve TypeScript tipleri de desteklenir. Fonksiyonlar doğrulanan
nesneyi döndürür; hata halinde `ContractError` (`code`, JSON Pointer `path`)
fırlatır. Veri dönüştürmez, default eklemez, kod çalıştırmaz. Hata mesajında ham
payload yoktur. `validateOutput` tüm profillerde çağrının gerçek input’unu ister;
review bulgularının satır sınırı bu koda göre denetlenir (LF/CRLF/CR; sondaki boş
satır dahil). `schemas` ve `functionSpecSchema` salt okunurdur.

JSON Schema kullanan diğer diller için `schemas/*.schema.json` paket içindedir:

```js
const schema = require('@ifa/code-demo-contracts/schemas/code-review.output.schema.json');
```

Şemalar tek başına byte, identifier veya verdict ilişkisi doğrulamaz. Node
dışındaki tüketiciler aynı semantik kuralları uygulamalıdır. Şema kaynağı repo
`schema-definitions.cjs` dosyasıdır; `npm run export:contracts` JSON dosyalarını
üretir. Testler kaynak/JSON eşitliğini denetler.

## Sınırlar

AST, gerçek Python imzası ve test case sayısı E07 runner kapısına aittir.
Paketin başarıyla dönmesi kodun doğru, güvenli veya testlerin geçmiş olduğu
anlamına gelmez. `ifa-call.v1` / `ifa-result.v1` envelope, invocation/mode/digest
eşleşmesi ve kullanıcı yetkisi çağıran adaptörün sorumluluğudur. Bu paket
kimlik bilgisi almaz; TH01 erişim izolasyonu sağladığı iddia edilmez.

[Geçerli/geçersiz örnekler](../../examples/code-demo/) ve
[uygulama/kanıt rehberi](../../docs/development/code-demo-contracts.md) repo
kaynaklarıdır; tarball’ın içinde README, runtime, tipler ve makine şemaları bulunur.
