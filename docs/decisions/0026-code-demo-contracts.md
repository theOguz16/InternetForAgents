# ADR-026 — Kod demo kontratlarını bağımsız paket olarak paylaşma

Tarih: 15 Ekim 2026. Durum: Issue #36 uygulama kararı; insan review’ı bekliyor.
S1.0 / ADR-025 D03 ve D04 uygulanır; agent veya runner eklenmez.

## Bağlam ve karar

Bağımsız agent geliştiricileri kopyalanan DTO ve regex’lerle zaman içinde farklı
sözleşmeler uygulayabilir. `@ifa/code-demo-contracts@1.0.0`, saf doğrulayıcı,
TypeScript tipleri ve yedi bağımsız Draft-07 şeması taşır. CommonJS runtime ve
ESM named import aynı modülü tüketir. Paket sadece Ajv 8.20.0’e bağımlıdır;
Express, A2A SDK, SQLite ve platform iş mantığına bağlı değildir.

Manifest alt kümesi pattern/if/ref desteklemediği için ASCII Python identifier,
keyword/dunder, duplicate parametre, verdict/finding ilişkisi, kod satır sınırı ve
UTF-8 byte sınırı ayrı semantik katmandadır. Parametre adının sonlu üst sınırı
fonksiyon adıyla aynı 64 karakterdir. `no_findings` sıfır bulgu gerektirir;
bu isimle bulgu taşınması farklı tüketicilerin çelişkili sonuç göstermesine yol
açardı. Hard keyword’ler reddedilir, Python soft keyword’leri korunur.

## Alternatifler ve sonuç

Platform servislerini agent’a import ettirmek deployment sınırını bozar; yalnız
JSON dağıtmak ilişkisel kontrolleri paylaşmaz. Üç ayrı validator kopyalamak yerine
aynı tarball ve consumer lockfile paylaşılır. Registry yayını bu işin parçası
değildir; `npm pack` artifact’i kullanılır. Runtime güvenilmeyen schema kabul
etmez ve uzak schema yüklemez.

Şema tek kaynaktan üretilir; export komutu ve testler drift’i kontrol eder.
Legacy metin DTO’ları, mevcut envelope ve veritabanı migration’ı değişmez.
Kırıcı şema/semantik değişikliği yeni profil sürümü gerektirir. AST/gerçek Python
imzası E07’de, çağrı kimliği ve kullanıcı yetkisi adaptör/ownership işlerinde
kalır. Bu paket testlerinin geçmesi bu kapıların tamamlandığını göstermez.

Kanıt: [uygulama rehberi ve kriter tablosu](../development/code-demo-contracts.md),
`tests/code-demo-contracts.test.cjs`, `examples/code-demo/`.
