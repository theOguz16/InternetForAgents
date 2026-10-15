> **Karar zinciri notu:** Güncel durum ve kısmi geçersiz kılmalar [ADR-025](0025-stage1-baseline.md) içinde listelenmiştir.

# ADR-014: A2A 1.0 ve JSON-RPC

Tarih: 2026-10-12
Durum: Kabul — yeni tasarım talebi kapsamında
Yerine geçtiği kararlar: 004 (10 Ekim arşivi)

> Güncelleme: Bu kaydın polling/streaming veya periyodik sağlık kararları [ADR-023](0023-sse-no-polling.md) ile değiştirilmiştir. Aşağıdaki metin karar geçmişidir.

## Bağlam

Özel sağlayıcı protokolü yerine agent protokolü kullanılacak.

## Karar

A2A 1.0 JSONRPC over HTTP(S), resmi JS SDK. REST binding/gRPC/streaming ilk kapsamda değil.

## Alternatif ve maliyet

Önceki tasarımı korumak daha az belge değişikliği gerektirirdi; ancak yeni akışın sorumluluklarını karşılamaz. JSON wire, YAML config; SDK N01 uyum kapısı. Özel RPC dispatcher geliştirilmez.

## Yeniden değerlendirme

SDK veya gerekli özellik seçilen binding ile karşılanamıyorsa.

## Ayrıntı

[a2a-protocol.md](../architecture/a2a-protocol.md). Kabul kanıtı [NA planında](../architecture/acceptance.md) üretilecektir.
