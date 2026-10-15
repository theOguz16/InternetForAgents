# Uygulama görev planı

Durum: Planlandı, atanmadı; GitHub issue veya PR oluşturulmadı. Kod başlangıcı ayrı talimat bekler. Her görev docs/templates/task.md ile işlenir. Tahmini kişi/gün verilmez; repo ve ekip doğrulamasından sonra belirlenir.

| ID | Görev | Bağımlılık | Kabul / çıktı |
| --- | --- | --- | --- |
| T01 | Yeni çekirdek iskeleti ve eski prototipin ayrımı | Kullanıcının kod başlatması | TS strict, Express sınırı, modül import kuralları, eski kodun korunması |
| T02 | Catalog ve makine kontrat şemaları | T01 | Şema fixture'ları, tam sürüm/birim kuralları; AC-03/17 |
| T03 | DB migration ve repository portları | T01 | Sahiplik, unique constraint, immutable sürüm; migration/rollback yönergesi |
| T04 | Principal, scope ve ağ politikası | T01,T03 | AC-04/12/13, secret provisioning |
| T05 | Registry lifecycle ve refresh | T02,T03,T04 | AC-03/06/07/11/16 |
| T06 | Discovery ve Broker | T05 | Filtre/preference/unknown sözleşmesi; AC-05/14 |
| T07 | HTTP adapter ve invocation | T02,T03,T04,T05 | Durumlar, timeout, idempotency; AC-08/09/10/17 |
| T08 | API yüzeyi ve OpenAPI dokümanı | T06,T07 | Auth/hata/pagination örnekleri; belge ile route uyumu |
| T09 | Audit, metrik ve retention | T03,T05,T07 | Payload redaction, cleanup; AC-13/18 |
| T10 | Fixture sağlayıcılar ve örnek istemciler | T08 | A/B/C, sentetik veri etiketi, iki istemci; AC-01/02 |
| T11 | Dağıtım ve operasyon | T08,T09 | Tek instance compose, readiness, shutdown, yedek/restore yönergesi |
| T12 | Mimari kabul ve deney raporu | T10,T11 | AC-01–18 kanıtları, benchmark AC-15, kalan riskler |

## Önerilen PR dilimleri

1. Mimari belgeler (bu çalışma; yerel).
2. T01–T03 iskelet, katalog ve veri temeli.
3. T04–T06 güvenlik, kayıt ve keşif.
4. T07–T09 çağrı, API ve izlenebilirlik.
5. T10–T12 deney, işletim ve kabul kanıtı.

Bir PR'da kapsam fazla büyürse görev bazında bölünür. Kullanıcı yetkisi olmadan kişiler atanmaz veya mesaj gönderilmez. Her görev relevant ADR, AC kimlikleri, failure case ve kanıt bağlantısı taşır.
