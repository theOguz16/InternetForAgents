# ADR-020: Dağıtık yetki ve ağ sınırları

Tarih: 2026-10-12
Durum: Kabul — yeni tasarım talebi kapsamında
Yerine geçtiği kararlar: 010 (10 Ekim arşivi)

## Bağlam

Registry tüm çağrıları kontrol eden gateway değildir.

## Karar

Her servis auth/ownership uygular; outbound allowlist Personal ve Registry içinde; kod yürütme kapalı.

## Alternatif ve maliyet

Önceki tasarımı korumak daha az belge değişikliği gerektirirdi; ancak yeni akışın sorumluluklarını karşılamaz. Credential paylaşımı yok; localhost demo anonim modu izolasyonla sınırlı.

## Yeniden değerlendirme

Paylaşılan internet deployment veya dış LLM açılırsa.

## Ayrıntı

[security.md](../architecture/security.md). Kabul kanıtı [NA planında](../architecture/acceptance.md) üretilecektir.
