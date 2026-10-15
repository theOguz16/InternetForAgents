# ADR-008: TypeScript ve PostgreSQL

Tarih: 2026-10-10. Durum: Kabul edildi — kullanıcının mimari kararları tamamlama yetkisi kapsamında.

## Bağlam

Kontrat ve durum modelleri açık tipler ve kalıcı transaction gerektirir.

## Karar

Node 24 LTS, Express 5, TypeScript strict, PostgreSQL. Secret config dışında tutulur; Redis/queue yok.

## Sonuçlar ve maliyetler

Patch sürümleri kod başlangıcında sabitlenir. Mevcut package.json değişmez. ORM/validator uygulama seçimidir.

## Yeniden değerlendirme

Destek ömrü, ölçülmüş performans veya veri modeli ihtiyacı değişince.

Davranış ayrıntıları: [data.md](../architecture/data.md).
