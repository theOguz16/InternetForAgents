# Mimari dokümantasyon rehberi

Tarih: 2026-10-10. Durum: MVP mimari temeli belirlendi; uygulama henüz başlamadı.

Kullanıcı tüm mimari kararların tamamlanmasını yetkilendirmiştir. Yeni kararlar bu yetkiyle alınmıştır; yazılımın geliştirildiği veya doğrulandığı anlamına gelmez. Kod aşamasına geçiş ayrıca kullanıcı talimatı gerektirir.

## Okuma sırası

1. [Vizyon ve kapsam](architecture/vision-and-scope.md)
2. [Sistem bağlamı ve servis sınırları](architecture/overview.md)
3. [Yetenekler ve kontratlar](architecture/capabilities-and-contracts.md)
4. [HTTP kontratı](architecture/http-contract.md) ve [API yüzeyi](architecture/api.md)
5. [Kayıt yaşam döngüsü](architecture/registry-lifecycle.md)
6. [Sağlayıcı seçimi](architecture/broker.md)
7. [Çağrı ve hata modeli](architecture/execution.md)
8. [Veri modeli](architecture/data.md) ve [güvenlik](architecture/security.md)
9. [Servis içi yapı ve dağıtım](architecture/implementation-structure.md)
10. [Operasyon](architecture/operations.md), [kabul planı](architecture/acceptance.md), [görev planı](planning/backlog.md)

[Mimari hazırlık raporu](planning/readiness.md)

## Kararlar ve şablonlar

- [ADR dizini](decisions/README.md)
- [ADR şablonu](templates/adr.md)
- [Görev şablonu](templates/task.md)
- [Servis tasarım şablonu](templates/service-design.md)
- [Yetenek tanımı şablonu](templates/capability.md)
- [Sağlayıcı kontratı şablonu](templates/provider-contract.md)
- [PR şablonu](templates/pull-request.md)
- [Mimari inceleme şablonu](templates/architecture-review.md)
- [Riskler ve gelecekteki karar tetikleyicileri](architecture/risks.md)
- [Teknik referanslar](architecture/references.md)

## Belge yönetimi

ADR karar ve gerekçenin kaynağıdır; ilgili mimari belgesi davranış ayrıntılarının kaynağıdır. Çelişki fark edilirse kodlamadan önce dokümanlar birlikte güncellenir. Kabul edilen kararlar silinmez; yeni ADR ile değiştirilir. Bu set uygulama kabulünün yerini tutmaz. Ölçüm değerleri hedef veya başlangıç ayarıdır; elde edilmiş sonuç değildir.
