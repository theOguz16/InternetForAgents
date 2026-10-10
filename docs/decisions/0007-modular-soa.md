# ADR-007: Tek dağıtım içinde modüler SOA

Tarih: 2026-10-10. Durum: Kabul edildi — kullanıcının mimari kararları tamamlama yetkisi kapsamında.

## Bağlam

Mantıksal servis sınırları için başlangıçta dağıtık sistem maliyeti gerekmiyor.

## Karar

Tek core instance; port-adapter katmanları; modül veri sahipliği; sağlayıcılar dış süreçlerde.

## Sonuçlar ve maliyetler

Döngüsel modül bağımlılığı ve başka modülün tablosuna yazma yasaktır. Çok replica desteklenmez.

## Yeniden değerlendirme

Ölçek veya bağımsız ekip/deployment ihtiyacı ölçülünce.

Davranış ayrıntıları: [implementation-structure.md](../architecture/implementation-structure.md).
