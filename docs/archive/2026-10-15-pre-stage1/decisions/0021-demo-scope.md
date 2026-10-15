# ADR-021: Kod inceleme ve test önerisi demosu

Tarih: 2026-10-12
Durum: Kabul — yeni tasarım talebi kapsamında
Yerine geçtiği kararlar: 011 (10 Ekim arşivi)

## Bağlam

Üretim/teslimat demosu yeni revizyonla değişti.

## Karar

Review A, Test Agent ve alternatif Review B; ilk engine rules, LLM opsiyonel.

## Alternatif ve maliyet

Önceki tasarımı korumak daha az belge değişikliği gerektirirdi; ancak yeni akışın sorumluluklarını karşılamaz. Agent altyapısı gösterilir; muhakeme kalitesi veya test execution iddiası yok.

## Yeniden değerlendirme

İlk kabul sonrası LLM/Docs/Python genişletmesinde.

## Ayrıntı

[scope.md](../architecture/scope.md). Kabul kanıtı [NA planında](../architecture/acceptance.md) üretilecektir.
