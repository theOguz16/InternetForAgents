> **Karar zinciri notu:** Güncel durum ve kısmi geçersiz kılmalar [ADR-025](0025-stage1-baseline.md) içinde listelenmiştir.

# ADR-016: TypeScript servisleri ve ayrı SQLite

Tarih: 2026-10-12
Durum: Kabul — yeni tasarım talebi kapsamında
Yerine geçtiği kararlar: 008 (10 Ekim arşivi)

## Bağlam

Ders ölçeğinde bağımsız servisler sade işletim gerektiriyor.

## Karar

Node24/Express5/TS strict, React/Vite; her backend bir SQLite volume.

## Alternatif ve maliyet

Önceki tasarımı korumak daha az belge değişikliği gerektirirdi; ancak yeni akışın sorumluluklarını karşılamaz. PostgreSQL başlangıç kapsamından çıkar. Tek instance, ayrı veri sahipliği; production HA yok.

## Yeniden değerlendirme

Eşzamanlı yazma veya birden çok instance gereksinimi ölçülürse.

## Ayrıntı

[data.md](../architecture/data.md). Kabul kanıtı [NA planında](../architecture/acceptance.md) üretilecektir.
