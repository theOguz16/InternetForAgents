# Operasyon, gözlem ve başlangıç limitleri

Durum: Ölçülecek hedefler; performans sonucu değildir.

## Gözlem

Her istek traceId taşır; istemci tarafından gelen değer format/uzunluk kontrolünden geçer veya yenisi üretilir. Yapısal log: action, actorId, serviceId, contractVersion, invocationId, duration, outcome, errorCode. Ham payload ve token loglanmaz. Metrikler: keşif gecikmesi, boş sonuç oranı, doğrulama hataları, invocation başarı/unknown oranı, upstream gecikme, kayıt yenileme yaşı. Metrik label'larında kullanıcı input'u veya sınırsız traceId kullanılmaz.

## Başlangıç ayarları

| Ayar | Değer |
| --- | --- |
| Kontrat edinim süresi | 5 saniye |
| Kontrat yenileme | 5 dakika, jitter ile |
| Kontrat geçerliliği | Son başarılı doğrulamadan 15 dakika |
| Upstream çağrı | En fazla 10 saniye |
| Toplam invocation | 15 saniye |
| Kontrat/şema boyutu | 256 KiB |
| JSON istek veya çıktı | 1 MiB |
| API kota / principal | 60/dakika |
| Invocation concurrency | Principal 5, global 20 |
| Sonuç ve idempotency saklama | 24 saat |
| Metadata/audit saklama | 30 gün |

Registry DB erişilemezse keşif/çağrı 503; doğrulanmamış önbellekle devam edilmez. Tek geçici kontrat refresh hatası mevcut geçerlilik süresini değiştirmez; süre dolunca askıya alınır. Kaldırılan servis cache üzerinden kullanılmaz.

## Ölçülebilir hedefler

Referans ortam 2 vCPU/4 GiB, 1.000 aktif kontrat, eşzamanlı 10 discovery ve 5 dakikalık ölçüm: discovery p95 ≤300 ms. Dış çağrı süresi hariç invocation ek maliyeti p95 ≤100 ms. Aktif olan yeni kayıt bir sonraki discovery'de görünür; pending kayıt yerel sağlıklı fixture ile ≤10 saniyede sonuçlanır. Bu değerler başlangıç bütçesidir; ilk ölçümde sapma varsa gerekçeli ADR/config revizyonu yapılır.

## Runbook

Registry kesintisi: ready başarısız olur; bağımlılık geri gelene kadar yeni çağrılar reddedilir. Provider hata artışı: sonuçlar sağlayıcı bazında incelenir, operator gerekirse kaydı askıya alır; otomatik circuit breaker MVP'de yoktur. Contract refresh problemi: son başarılı zamanı incele, ağ iznini ve şema hatasını kontrol et; doğrulamayı atlayarak aktive etme.

Migration önce staging/sentetik veri üzerinde denenir, destructive değişiklik için yedek alınır. Yerel demo DB yeniden üretilebilir seed kullanır. Paylaşılan demo günlük yedek hedefi, RPO 24 saat/RTO 4 saat olarak restore denemesiyle doğrulanır. Bu hedefler üretim SLA'sı değildir. Şema değişiminde app rollback uyumluluğu release öncesinde değerlendirilir.
