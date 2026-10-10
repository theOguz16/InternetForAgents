# ADR-009: Kayıt yaşam döngüsü ve güncellik

Tarih: 2026-10-10. Durum: Kabul edildi — kullanıcının mimari kararları tamamlama yetkisi kapsamında.

## Bağlam

Kayıt varlığı ile doğrulanmış güncel kontrat aynı değildir.

## Karar

Pending doğrulama, değişmez sürümler, 5 dakika refresh/15 dakika TTL; sahip ve operatör askısı ayrı.

## Sonuçlar ve maliyetler

DB kesintisinde fail closed; cached kayıt kullanılmaz. Mutated sürüm çağrıdan çıkarılır.

## Yeniden değerlendirme

Ölçüm maliyeti veya erişilebilirlik hedefi farklı TTL/cache gerektirince.

Davranış ayrıntıları: [registry-lifecycle.md](../architecture/registry-lifecycle.md).
