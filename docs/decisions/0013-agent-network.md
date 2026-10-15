> **Karar zinciri notu:** Güncel durum ve kısmi geçersiz kılmalar [ADR-025](0025-stage1-baseline.md) içinde listelenmiştir.

# ADR-013: Agent ağına geçiş

Tarih: 2026-10-12
Durum: Kabul — yeni tasarım talebi kapsamında
Yerine geçtiği kararlar: 001, 006, 007 (10 Ekim arşivi)

## Bağlam

Önceki merkezi genel servis çekirdeği yeni geliştirici/agent ağı hedefiyle uyuşmuyor.

## Karar

Registry keşif; Personal Agent koordinasyon; uzmanlar bağımsız yürütme. Ayrı süreçler.

## Alternatif ve maliyet

Önceki tasarımı korumak daha az belge değişikliği gerektirirdi; ancak yeni akışın sorumluluklarını karşılamaz. Merkezi Invocation/Policy kalkar; yetki her uzman ve Personal Agent sınırında uygulanır.

## Yeniden değerlendirme

Genel servis gateway ihtiyacı somutlaşırsa.

## Ayrıntı

[overview.md](../architecture/overview.md). Kabul kanıtı [NA planında](../architecture/acceptance.md) üretilecektir.
