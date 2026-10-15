# Mimari hazırlık raporu

Tarih: 2026-10-10

## Sonuç

Kontrollü MVP'nin kodlamasına başlayabilmek için mimari temel hazırdır. Uygulama başlamamıştır ve kullanıcının ayrı talimatı beklenir. Bu rapor üretim hazırlığı, test başarısı veya benchmark sonucu değildir.

## Tamamlanan tasarım

- Ürün amacı ve araştırma iddiasının sınırı.
- Agent, çekirdek ve sağlayıcı sorumlulukları.
- Mantıksal servisler ve veri sahipliği.
- Yetenek kataloğu, kontrat alanları, sürüm ve HTTP protokolü.
- Kayıt yaşam döngüsü, güncellik ve dizin kesintisi.
- Broker filtreleri, tercihleri ve eksik veri davranışı.
- Tek çağrı yürütme, idempotency, belirsiz sonuç ve hata zarfı.
- Yetki, sahiplik, outbound ağ ve secret sınırları.
- TypeScript/Express katmanları, PostgreSQL ve tek instance dağıtım.
- Operasyonel başlangıç limitleri ve gözlem.
- 18 kabul senaryosu, 12 sıralı uygulama görevi, 7 doküman şablonu.

## Yapılan kontroller

Yerel Markdown bağlantıları kontrol edildi; kırık bağlantı bulunmadı. Git diff whitespace kontrolü sorun bildirmedi. Eski taslakların durumu güncellendi ve tarihsel ADR açık konuları sonraki kararlarla ilişkilendirildi. Uygulama testi çalıştırılmadı; uygulama kodu değiştirilmedi.

## Kod aşamasındaki ilk çıktılar

Kullanıcı başlattığında T01–T03: yeni çekirdek iskeleti, mevcut prototipten ayrım, makine kontrat şemaları ve veri migration temeli. Kesin paket patch sürümleri o gün destek/güvenlik durumuna göre sabitlenecek. API'nin makine OpenAPI karşılığı T08 çıktısıdır; implementation boyunca bu mimari API tanımına uyulur.

## Sınırlar

Gerçek yan etkili işlemler, genel web taraması, dosya transferi, asenkron iş ve çok instance ölçek bilinçli olarak kapsam dışıdır. Bunlar MVP'yi bloke eden unutulmuş kararlar değildir. Gereksinim hâline geldiklerinde ilgili ADR ve kabul planı genişletilir.

## Yayın durumu

Dosyalar yereldedir. Commit, push, PR veya GitHub issue oluşturulmamıştır; görevler kişilere atanmamıştır.
