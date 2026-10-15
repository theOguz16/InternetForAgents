# B05 bağımsız agent şablonu — ilk artım

Paket: [examples/agent-template](../../examples/agent-template/README.md).

Config'ten Card/manifest üreten, handler'ı ayrı tutan Node 24 + Express + A2A SDK başlangıcı. Paket kendi dependency lock, TypeScript config, Dockerfile ve README'sini içerir; platform kaynaklarına import yapmaz. Yeni beceri için config ve handler değiştirilir. Ortak model çalıştırma veya genel agent üretme sistemi değildir.

## Kapsam ve kanıt

- Yerel paket kurulumu ve TypeScript build başarılı; npm kurulum audit'i bu paket için 0 bulgu bildirdi (bu tüm platformun güvenlik değerlendirmesi değildir).
- Yeni runtime/entegrasyon testi veya Docker build bu geliştirme turunda çalıştırılmadı.
- CI'a yalnız bağımsız paket build işi eklendi. Kök servis testleri bu paketi kapsıyor sayılmaz.
- B03 (#3), B04 (#2) açık; Issue #5 tamamlandı olarak kapatılmamalı.

## Kararlar

Card/manifest aynı config kaynağından, input/output doğrulaması Ajv'den, A2A serialization resmi SDK'dan gelir. İş mantığı platforma bağlı değildir. Eski text adapter ve Personal akışı değişmez.

Bellekte task deposu, 1000 istek/süreç, tek handler ve 5 saniye bekleme bütçesi yerel starter limitleridir. Aynı invocation tekrarında fail edilir; S1.0'ın aynı task döndüren dedup davranışı tamamlanmış değildir. Kimlik/persistence/iptal ve güvenilmeyen kod izolasyonu bu pakette bulunmaz. README eksikleri ve Registry ağ yapılandırmasını açıklar.

## Sonraki kabul

Temiz klasörde README çalıştırma, Card/manifest eşleşmesi, gerçek A2A başarı/hata çağrıları, cleanup/timeout ve Docker doğrulaması gerekiyor. B06/D04 ile aynı task dedup sözleşmesi hizalandıktan sonra genel workflow kullanımına uygunluk değerlendirilmeli.
