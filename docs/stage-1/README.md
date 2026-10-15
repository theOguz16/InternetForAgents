# Aşama 1 — kabul edilmiş tasarım tabanı

Tarih: 15 Ekim 2026. Baseline: **S1.0**. Durum: tasarım kararları kabul edildi; uygulama henüz bu hedefe taşınmadı. Bu revizyon A01–A05, B02, F01, G01 ve H01’in doküman teslimidir. GitHub’a yazılması hedeflerin ölçüldüğü veya güvenlik kontrollerinin uygulandığı anlamına gelmez.

## Okuma sırası ve tek kaynaklar

1. [Ürün, kapsam ve kabul](01-product.md): A01.
2. [Mevcut durum ve geçiş](02-current-state.md): A02.
3. [Sistem ve alt mimariler](03-architecture.md): A03.
4. [Güvenlik ve tehdit modeli](04-security.md): A05.
5. [Geliştirici yetenek tanımı](05-capability-contract.md): B02.
6. [Kod/review/test profilleri](06-code-demo.md): F01.
7. [Frontend ve kullanıcı yolculukları](07-ux.md): G01.
8. [Ölçüm ve deney protokolü](08-evaluation.md): H01.
9. [Karar kaydı](../decisions/0025-stage1-baseline.md): A04.
10. [Görevler, bağımlılıklar ve teslim kapıları](09-delivery.md).

## Değişiklik yönetimi

S1.0 alanları uygulama sırasında sessizce değiştirilemez. Değişiklikte: gerekçe → etkilenmiş kontrat/tehdit/KPI → ADR → migration ve test etkisi → belge güncellemesi. Şema değişikliği semantik sürümlenir. Benchmark hedefi sonuç görüldükten sonra eski çalışmanın hedefiymiş gibi değiştirilemez; yeni baseline sürümü gerekir.

A2A taşımasının normatif kaynağı sabit [v1.0 belirtimidir](https://a2a-protocol.org/v1.0.0/specification/). Capability manifest, workflow, kota, timeout ve KPI değerleri bu projenin kararlarıdır. Belgelerdeki örnekler gelecekte uygulanacak arayüzlerdir; mevcut API için [çalıştırma rehberlerini](../development/local.md) kullanın.

## Bu aşamanın kapanış şartı

Dokuz task’ın her biri aşağıdaki belgelerde karşılanır; yerel bağlantı/örnek kontrolü ve commit kaydı teslim kanıtıdır. Model seçimi, sonuç ölçümü, runner güvenlik doğrulaması ve yeni kontratların kodda uygulanması sonraki aşamaların açık işleridir. Bu işler tamamlanmadan Teslim A kabul edilmez.

## Uygulama artımı

Genel manifest kayıt/doğrulama alt kümesinin gerçek kapsamı [uygulama raporunda](../development/generic-registry.md), junior görevleri [ekip backlog’unda](../team/tasks/README.md) tutulur. S1.0 hedefleri ile tamamlanan özellikler aynı şey değildir.
