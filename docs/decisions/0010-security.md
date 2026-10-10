# ADR-010: Kontrollü erişim ve outbound sınırı

Tarih: 2026-10-10. Durum: Kabul edildi — kullanıcının mimari kararları tamamlama yetkisi kapsamında.

## Bağlam

Kontrat URL ve endpoint kullanıcı tarafından sağlanan ağ hedefleridir.

## Karar

Scope ve ownership, operator allowlist, DNS adres kontrolü, redirect yok, boyut/süre limitleri.

## Sonuçlar ve maliyetler

Kayıt güven garantisi değildir. Yeni sağlayıcı için config ağ izni gerekebilir; deneyde açıklanır.

## Yeniden değerlendirme

Açık kayıt, internet ölçeği veya çok kiracılı dağıtım gerektiğinde.

Davranış ayrıntıları: [security.md](../architecture/security.md).
