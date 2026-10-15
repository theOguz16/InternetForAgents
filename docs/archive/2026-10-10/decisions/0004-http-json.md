# ADR-004: İlk adapter: HTTP ve JSON

Tarih: 2026-10-10. Durum: Kabul edildi — kullanıcının mimari kararları tamamlama yetkisi kapsamında.

## Bağlam

Birden çok protokol temel deneyi gereksiz büyütür.

## Karar

POST JSON girdi, 200 JSON çıktı; sabit endpoint, auth none/bearer; HTTPS ve yerel fixture istisnası.

## Sonuçlar ve maliyetler

Sağlayıcılar ortak çağrı biçimine uyar. Rastgele REST/OpenAPI dönüşümü, streaming ve dosya aktarımı kapsam dışıdır.

## Yeniden değerlendirme

Gerçek kullanım farklı protokol veya asenkron iş gerektirdiğinde.

Davranış ayrıntıları: [http-contract.md](../architecture/http-contract.md).
