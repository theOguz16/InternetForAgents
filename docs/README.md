# Internet for Agents — dokümantasyon

Güncel tasarım tabanı: **S1.0 / 15 Ekim 2026**. Uygulama, çalışan yerel metin demosudur; geliştirici tarafından genişletilen platform hedefi henüz uygulanmamıştır.

## Tasarım ve plan

- [Aşama 1: kapsamlı okuma sırası](stage-1/README.md)
- [Amaç ve kabul kriterleri](stage-1/01-product.md)
- [Mevcut durum / migration](stage-1/02-current-state.md)
- [Mimari / workflow / context](stage-1/03-architecture.md)
- [Tehdit modeli / güvenlik](stage-1/04-security.md)
- [Geliştirici manifesti](stage-1/05-capability-contract.md)
- [Kod/review/test profilleri](stage-1/06-code-demo.md)
- [UI/UX](stage-1/07-ux.md)
- [KPI ve benchmark](stage-1/08-evaluation.md)
- [Task ve bağımlılıklar](stage-1/09-delivery.md)
- [ADR indeksi](decisions/README.md)

## Gerçekte çalışan uygulama

[Yerel geliştirme](development/local.md), [Registry/A2A](development/registry-a2a.md), [Personal](development/personal-agent.md), [algoritmalar](development/text-algorithms.md), [kalıcılık](development/persistence.md), [UI](development/demo-ui.md), [15 Ekim Docker kanıtı](development/docker-demo-results.md). Bu raporlar yalnız belirtilen commit/test kapsamını kanıtlar.

## Tarihçe

[Revizyon öncesi snapshot](archive/2026-10-15-pre-stage1/README.md) ve [ilk tasarım arşivi](archive/2026-10-10/NOTICE.md) tarihsel kaynaklardır. architecture/ altındaki önceki tasarımlar S1.0’a referans verir. Yeni implementation için eski backlog N01–N12 yerine A–I task kimlikleri kullanılır; eski test kanıtları korunur.

## Şablonlar

[ADR](templates/adr.md), [task](templates/task.md), [agent onboarding](templates/agent-onboarding.md), [skill profile](templates/skill-profile.md), [experiment](templates/experiment.md). Yeni dokümanda durum, owner, değişen ADR ve kabul kanıtı bulunmalı.

## Ekip uygulama backlog’u

[Çalışma düzeni](team/working-agreement.md), [kurulum](team/local-setup.md), [ayrıntılı görevler](team/tasks/README.md), [manifest kayıt uygulaması](development/generic-registry.md).

[Kod demo ortak kontrat paketi ve kabul kanıtları](development/code-demo-contracts.md).
