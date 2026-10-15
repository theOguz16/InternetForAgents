# Mimari kabul ve doğrulama planı

Durum: Planlandı; test veya benchmark çalıştırılmadı.

| ID | Senaryo | Beklenen kanıt |
| --- | --- | --- |
| AC-01 | A/B aktifken C sağlayıcısı kaydolur | Agent ve core kaynakları değişmeden C keşfedilir ve çağrılır; kayıt/config farkları listelenir |
| AC-02 | Aynı yetenek iki istemciden kullanılır | Agent ve doğrudan API istemcisi aynı kontratla sonuç alır |
| AC-03 | Bozuk şema/yanlış sürüm kaydı | Aktive edilmez, gerekçe görünür |
| AC-04 | Başka owner kayıt değiştirmeye çalışır | 403/404, kayıt değişmez |
| AC-05 | Sağlayıcı süre/fiyat verisi eksik | Hard constraint karşılanmış sayılmaz; tercih eksikliği görünür |
| AC-06 | Seçim sonrası kontrat güncellenir | Eski sürüm/digest çağrısı 409, sessiz geçiş yok |
| AC-07 | Refresh hatası ve süre dolması | TTL içinde mevcut sürüm; bitince yeni discovery/invocation engeli |
| AC-08 | Sağlayıcı timeout veya süreç çökmesi | unknown kaydı, otomatik yeniden gönderim yok |
| AC-09 | Aynı idempotency key eşzamanlı gönderilir | Tek accepted kayıt, tekrar dispatch yok; farklı input 409 |
| AC-10 | Upstream 200 ama yanlış çıktı | 502 INVALID_OUTPUT |
| AC-11 | Kayıt silinir veya askıya alınır | Önceden seçilmiş aday yeni çağrıda kullanılamaz |
| AC-12 | Endpoint private IP/redirect/DNS değişimi | Yetkisiz ağ isteği oluşmaz |
| AC-13 | Log ve API çıktısı incelenir | Secret, ham input, gizli provider kaydı sızmaz |
| AC-14 | Registry DB erişilemez | Boş sonuç yerine 503 |
| AC-15 | Referans yük uygulanır | Operations bütçeleri raporlanır; başarısızsa istisna saklanmaz |
| AC-16 | Restart | Pending validation sürer; stale running unknown olur |
| AC-17 | Yan etkili capability kullanılır | Kayıt/çağrı reddedilir |
| AC-18 | Retention süresi dolar | Payload sonucu temizlenir; metadata süresi bağımsız korunur |

## Katmanlar

Domain testleri: filtreleme, sıralama, sürüm uyumu, durum geçişleri. Contract testleri: katalog şemaları ve sağlayıcı uyumu. Entegrasyon: PostgreSQL transaction/unique constraint, timeout ve outbound policy. Uçtan uca: kayıt → keşif → seçim → çağrı. Mimari kontrol: modüller arası yasak import ve tablo yazma. Testler kod aşamasında anlamlı davranışları doğrulayacak şekilde yazılacak.

## Kodlamaya hazırlık kapısı

Kapsam, veri sahipliği, endpoint yüzeyi, kontrat alanları, durum geçişleri, hata/izin sınırları, teknoloji/deployment, kabul senaryoları ve sıralı görevler tanımlanmıştır. Bu, kontrollü MVP uygulamasına başlamak için mimari hazırlıktır; üretime hazır olma iddiası değildir. Kod yalnızca ayrı kullanıcı talimatıyla başlar.

## Uygulama tamamlanma kapısı

İlgili AC kanıtları, contract/OpenAPI doğrulaması, güvenlik negatif senaryoları, ölçüm raporu ve demo yürütme talimatı PR'da bulunur. Sahte veya ölçülmemiş veri gerçek sağlayıcı sonucu gibi sunulmaz. Engelli AC varken 'tamamlandı' denmez.
