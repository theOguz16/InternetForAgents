> **Karar zinciri notu:** Güncel durum ve kısmi geçersiz kılmalar [ADR-025](0025-stage1-baseline.md) içinde listelenmiştir.

# ADR-015: Agent Card ve uygulama profilleri

Tarih: 2026-10-12
Durum: Kabul — yeni tasarım talebi kapsamında
Yerine geçtiği kararlar: 003 (10 Ekim arşivi)

## Bağlam

Skill açıklamaları kod inceleme payload anlamını tek başına garanti etmez.

## Karar

İki sürümlü profile; Card skillId eşleştirmesi Registry kaydında. JSON Schema payload validation.

## Alternatif ve maliyet

Önceki tasarımı korumak daha az belge değişikliği gerektirirdi; ancak yeni akışın sorumluluklarını karşılamaz. Yeni sağlayıcı ile yeni beceri ayrılır. Eski genel capability kataloğu dar profile listesine dönüşür.

## Yeniden değerlendirme

Yeni iş alanı/profile gerektiğinde.

## Ayrıntı

[skill-profiles.md](../architecture/skill-profiles.md). Kabul kanıtı [NA planında](../architecture/acceptance.md) üretilecektir.
