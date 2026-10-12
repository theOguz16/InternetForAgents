# ADR-017: Card dizini ve ayrı sağlık gözlemi

Tarih: 2026-10-12
Durum: Kabul — yeni tasarım talebi kapsamında
Yerine geçtiği kararlar: 002, 009 (10 Ekim arşivi)

> Güncelleme: Bu kaydın polling/streaming veya periyodik sağlık kararları [ADR-023](0023-sse-no-polling.md) ile değiştirilmiştir. Aşağıdaki metin karar geçmişidir.

## Bağlam

Kayıtlı agent her zaman erişilebilir olmayabilir.

## Karar

Sahiplik kontrollü Card kayıt/refresh, revision; 5 saniye health, 15 saniye tazelik, 5 dakika Card TTL.

## Alternatif ve maliyet

Önceki tasarımı korumak daha az belge değişikliği gerektirirdi; ancak yeni akışın sorumluluklarını karşılamaz. Registry görev trafiğini görmez. Silmek uzak kimlik bilgisini iptal etmez.

## Yeniden değerlendirme

Dizin federasyonu veya geniş ölçek probe maliyeti gerektiğinde.

## Ayrıntı

[discovery.md](../architecture/discovery.md). Kabul kanıtı [NA planında](../architecture/acceptance.md) üretilecektir.
