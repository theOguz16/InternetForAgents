# ADR-006: Tek çağrı yürütme ve belirsiz sonuç

Tarih: 2026-10-10. Durum: Kabul edildi — kullanıcının mimari kararları tamamlama yetkisi kapsamında.

## Bağlam

Çift planlayıcı ve otomatik tekrar, davranışın sahibini belirsizleştirir.

## Karar

Agent planlar; core tek çağrı yürütür. MVP read-only, otomatik retry/failover yok. Persisted invocation ve 24 saatlik idempotency kaydı.

## Sonuçlar ve maliyetler

Timeout sonucu unknown olabilir. Exactly-once dış çağrı garantisi yoktur. Gerçek yan etkiler kapalıdır.

## Yeniden değerlendirme

Yan etkili veya uzun süren işler kabul edildiğinde.

Davranış ayrıntıları: [execution.md](../architecture/execution.md).
