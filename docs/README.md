# Yeni mimari doküman rehberi

Revizyon: 2026-10-12. Durum: Tasarım tamamlandı; uygulama ve protokol uyum denemesi yapılmadı.

## Okuma sırası

1. [Amaç ve kapsam](architecture/scope.md)
2. [Sistem mimarisi ve servis içi katmanlar](architecture/overview.md)
3. [Servislerin ayrıntılı sorumlulukları](architecture/services.md)
4. [A2A protokolü ve JSON örnekleri](architecture/a2a-protocol.md)
5. [Uygulamaya özel beceri profilleri](architecture/skill-profiles.md)
6. [Kayıt, keşif ve sağlık](architecture/discovery.md)
7. [Süreçler ve sequence diyagramları](architecture/pipelines.md)
8. [Görev durumları ve hata davranışı](architecture/task-lifecycle.md)
9. [REST API tasarımı](architecture/api.md)
10. [Veri sahipliği](architecture/data.md)
11. [Güvenlik ve güven sınırları](architecture/security.md)
12. [Deployment ve operasyon](architecture/operations.md)
13. [Kabul planı](architecture/acceptance.md)
14. [Roadmap](planning/roadmap.md), [görev listesi](planning/backlog.md), [hazırlık raporu](planning/readiness.md)

## Kararlar ve şablonlar

- [Yeni ADR'ler ve eskileri değiştirme haritası](decisions/README.md)
- [ADR şablonu](templates/adr.md)
- [Servis tasarımı şablonu](templates/service-design.md)
- [Beceri profili şablonu](templates/skill-profile.md)
- [Agent onboarding şablonu](templates/agent-onboarding.md)
- [Görev şablonu](templates/task.md)
- [PR şablonu](templates/pull-request.md)
- [Demo/deney raporu şablonu](templates/experiment.md)
- [Kaynaklar ve sürüm notu](architecture/references.md)

## Eski tasarım

[10 Ekim belgeleri](archive/2026-10-10/NOTICE.md) tarihsel arşivdir. Eski ADR ve görev kimlikleri yeni işlerin talimatı değildir. Merkezi çağrı motoru ve PostgreSQL temelli tek çekirdek tasarımı yürürlükten kalkmıştır. Yeni uygulama görevleri N01 ile başlar; yeni kararlar ADR-013 ile devam eder.

Karar değişikliklerinde ADR, ilgili arayüz belgesi ve kabul senaryosu birlikte güncellenir. Kaynaklar protokol için referanstır; proje limitleri ve beceri profilleri kendi tasarım kararlarımızdır.
