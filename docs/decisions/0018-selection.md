> **Karar zinciri notu:** Güncel durum ve kısmi geçersiz kılmalar [ADR-025](0025-stage1-baseline.md) içinde listelenmiştir.

# ADR-018: Personal Agent içinde seçim

Tarih: 2026-10-12
Durum: Kabul — yeni tasarım talebi kapsamında
Yerine geçtiği kararlar: 005 (10 Ekim arşivi)

## Bağlam

Merkezi broker çağrı yolunda artık yok.

## Karar

Uygunluk ve profile eşleşmesi Personal Agent içinde; stabil agentId sırası ve gerekçeli alternatifler.

## Alternatif ve maliyet

Önceki tasarımı korumak daha az belge değişikliği gerektirirdi; ancak yeni akışın sorumluluklarını karşılamaz. Kalite/fiyat skor iddiası yok. Pre-dispatch kesin hatada bir alternatif; belirsiz dispatchte yok.

## Yeniden değerlendirme

Ölçülmüş kalite veya kullanıcı tercihleri ihtiyaç olursa.

## Ayrıntı

[services.md](../architecture/services.md). Kabul kanıtı [NA planında](../architecture/acceptance.md) üretilecektir.
