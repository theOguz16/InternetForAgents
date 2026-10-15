# Yetenek kataloğu ve kontratlar

Durum: MVP kararı. ADR-003 ve ADR-004.

## Kavramlar

Yetenek, ortak iş anlamıdır. Sağlayıcı kontratı bu işin belirli bir servis tarafından nasıl sunulduğudur. Registry kontrat kayıtlarını saklar. Agent keşif isteği ve gerçek çağrı girdisini ayrı gönderir.

## Katalog sahipliği

Katalog operatör tarafından yönetilir. MVP'de yetenek tanımları gözden geçirilmiş doküman/seed üzerinden yüklenir; sağlayıcı yeni yetenek anlamını kendiliğinden aktive edemez. Katalog id ve tam sürüm çifti değişmezdir. Örnek isim biçimi `logistics.delivery.quote`, örnek sürüm `1.0.0`. Eşleştirme tam sürüm üzerinden yapılır; sürüm aralığı veya otomatik anlamsal eşleştirme yoktur.

## Yetenek alanları

| Alan | Kural |
| --- | --- |
| id, version | Birlikte benzersiz ve değişmez |
| title, description | İnsan tarafından okunur; yürütülebilir talimat değildir |
| inputSchema, outputSchema | JSON Schema 2020-12; nesne kökü, açık zorunluluklar |
| semantics | Birimler, tarih/zaman anlamı ve sonuç yorumlama kuralları |
| effect | MVP yalnızca `read`; işlem oluşturan türler reddedilir |
| discoveryAttributes | Filtrelenebilir sağlayıcı niteliklerinin adı, tipi ve desteklenen operatörleri |

Şemalar kayıtlı katalogdan çözülür; internetten uzak `$ref` indirilmez. Yerel şema içi referanslar desteklenir; maksimum şema boyutu 256 KiB ve derinlik 32. Bilinmeyen alanlar varsayılan reddedilir. `format` kontrolleri için kullanılan doğrulayıcıda açık assertion ayarı uygulanır. Para değerleri ondalık string ve para birimiyle; fiziksel ölçüler değer ve açık birimle tanımlanır. Tarih-zaman UTC offset içerir.

## Filtre operatörleri

Katalog her attribute için izinli operatörleri açıkça tanımlar: scalar için eq, enum/collection için in, sayısal değer için min/max. Bilinmeyen operatör reddedilir. İç içe mantıksal ifade, regex ve çalıştırılabilir filtre desteklenmez; constraints alanları AND ile birleşir.

## Sağlayıcı sınırları

Sağlayıcı ortak girdi/çıktı şemasını değiştiremez. Yalnızca yeteneğin izin verdiği discoveryAttributes değerlerini bildirir. Serbest metindeki kısıtlar otomatik filtreleme kuralına dönüştürülmez. Yeni zorunlu girdi isteyen servis aynı yeteneğin uyumlu sağlayıcısı sayılmaz.

## Sürümleme

Her değişiklik yeni tam sürüm veya yeni kontrat sürümü oluşturur; içerik hash'i korunur. Kırıcı yetenek değişiklikleri major sürümü artırır; ilk MVP tüm sürümlerde tam eşleşme istediğinden minor/patch otomatik uyumluluk sağlamaz. Eski sürüm operatörce deprecated işaretlenebilir; silinmez. Yeni kayıt için kapatma ile eski çağrı geçmişini saklama farklı işlemlerdir.

## Keşif ve çağrı ayrımı

Keşif yalnızca yetenek ve filtreleri içerir. Dosya veya iş payload'u tüm adaylara dağıtılmaz. Canlı fiyat teklifi almak bir çağrıdır; statik çağrı ücretiyle aynı şey değildir. Çekirdek iş çıktılarının alan özel karşılaştırmasını yapmaz; agent ortak çıktı semantiğiyle değerlendirir.
