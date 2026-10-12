# İç mimari ve dağıtım

Durum: ADR-007/008 ile MVP kararı.

## Teknoloji

Node.js 24 LTS ailesi, Express 5, TypeScript strict, PostgreSQL. Uygulamaya başlanırken desteklenen güvenlik yama sürümü seçilip lockfile/image ile sabitlenir. Mevcut package.json bu aşamada değiştirilmemiştir. Kaynaklar [referanslarda](references.md).

## Tek deploy, mantıksal servisler

Modüler monolit olarak tek çekirdek süreci; sağlayıcı fixture'ları ayrı süreç/container. SOA sınırları kontrat, veri sahipliği ve arayüzlerle korunur. İlk sürümde Kafka, broker queue, service mesh, Kubernetes ve Redis yoktur. Container tabanlı yerel compose dağıtımı kod aşamasında hazırlanır.

## Servis içi mimari

Her modül domain, application ve infrastructure/presentation ayrımına uyar. Port-adapter yaklaşımı kullanılır. Domain kuralları saf iş kavramlarını tutar; use case koordinasyonu application katmanındadır. Controller yalnızca auth context, request mapping ve response mapping yapar. SQL repository ve HTTP adapter dış katmandadır.

Planlanan dizinler (henüz oluşturulmuş kod değildir): src/modules/catalog, registry, discovery, invocation, policy, evidence; her modülde domain/application/infrastructure. src/http HTTP sınırı; src/bootstrap composition root; examples altında fixture sağlayıcılar ve örnek istemci. Shared yalnızca temel hata/kimlik/zaman gibi küçük ortak tipleri içerir; alan kuralları buraya taşınmaz.

## Çalışma sınırı

Aynı süreçte periyodik Registry validation/refresh ve cleanup döngüsü çalışır. Kalıcı pending kayıtlar başlangıçta tekrar işlenir. Bir instance sınırı deployment'ta açık tutulur; çok replica çalıştırılmadan lease ve job sahipliği ADR'si gerekir. Graceful shutdown yeni çağrıları durdurur ve mevcut işler için 20 saniye bekler.

## Geçiş

Eski seyahat prototipi yeni çekirdek olarak etiketlenmez. Kod aşamasında önce ayrı tarihsel commit/tag ile korunur, yeni yapı bağımsız kurulur; eski dosyaların silinmesi ayrı görünür değişiklik olur. Mevcut eğitim modeli veya seyahat endpoint'leri çekirdeğe bağımlılık olarak taşınmaz.

## Evrim tetikleyicileri

Bağımsız ölçek ihtiyacı/ekip sahipliği ortaya çıkarsa modül fiziksel servise ayrılabilir. Uzun iş ihtiyacında kalıcı job worker, çok instance'da lease ve merkezi rate limit; farklı protokolde yeni adapter. Hiçbiri sadece gelecekte gerekebilir düşüncesiyle MVP'ye eklenmez.
