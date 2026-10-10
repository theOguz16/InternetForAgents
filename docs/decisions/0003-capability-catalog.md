# ADR-003: Ortak ve sürümlü yetenek kataloğu

Tarih: 2026-10-10. Durum: Kabul edildi — kullanıcının mimari kararları tamamlama yetkisi kapsamında.

## Bağlam

Serbest etiketler ortak girdi/çıktı anlamını garanti etmez.

## Karar

Operatör yönetiminde küçük katalog; JSON Schema 2020-12, değişmez id+tam sürüm, açık birimler; exact version match.

## Sonuçlar ve maliyetler

Yeni sağlayıcı veri değişikliğidir; yeni yetenek semantiği gözden geçirilmiş katalog değişikliğidir. Doğal dil eşleştirme yoktur.

## Yeniden değerlendirme

Bağımsız kataloglar veya sürümler arası dönüşüm gerektiğinde.

Davranış ayrıntıları: [capabilities-and-contracts.md](../architecture/capabilities-and-contracts.md).
