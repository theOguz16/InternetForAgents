# Tehdit modeli ve güvenlik tabanı

## Dağıtım varsayımı

Teslim A kontrollü ekip ağıdır. Geliştirici endpoint’i, model yanıtı ve üretilen kod yine güvenilmeyen girdidir. Mevcut localhost anonim uygulaması paylaşılan kullanım yetkisi sağlamaz. Model seçimi veya agent açıklaması politika değiştiremez.

## Varlıklar ve sınıflar

| Sınıf | Örnek | Kural |
| --- | --- | --- |
| Public | Onaylanmış agent adı, açık şema | Owner onayıyla görünür |
| Workspace | Endpoint, workflow, agent listesi | Workspace üyelerine |
| Private | Kullanıcı metni, kod, artifact, job | Owner ve açıkça yetkilendirilmiş step |
| Secret | Token, model anahtarı, servis credential | Kart/UI/log/artifact’e konmaz |

## Yetki matrisi

| İşlem | User | Developer | Operator |
| --- | --- | --- | --- |
| Job oluştur/oku/sil | Kendi işi | Kendi işi | Metadata/operasyon; içerik erişimi ayrıca denetlenmiş yetki |
| Agent kaydet/güncelle | Hayır | Kendi kaydı | Askıya alma ve politika |
| Artifact oku | Kendi artifact’i | Kendi kullanıcı işi; agent sahibi olmak başka kullanıcının sonucunu açmaz | Varsayılan içerik erişimi yok |
| Ağ izni/kota değiştir | Hayır | Talep eder | Evet, audit kaydıyla |

Service identity ayrı principal’dır; kullanıcı token’ı agent’a aynen forward edilmez. Süreli ve sınırlı görev yetkisi kullanılır. Geliştirici/servis token hash’leri saklanır; iptal ve yenileme testlenir. Web için same-origin HttpOnly/SameSite session cookie, mutasyonlarda CSRF doğrulaması hedeflenir. Paylaşılan ortamda TLS zorunlu; local HTTP yalnız loopback/izinli Compose trafiği içindir.

## Tehdit–kontrol–test eşlemesi

| ID | Tehdit | Kontrol | Negatif kanıt |
| --- | --- | --- | --- |
| TH01 | Başkasının job/artifact ID’sini okuma | Object-level owner kontrolü | Kullanıcı A, B’nin ID’sinde veri alamaz |
| TH02 | Kartla iç ağa SSRF | URL+DNS+bağlantı IP kontrolü, egress izinleri, redirect kapalı | Metadata/private/IPv6/redirect/rebinding girişimleri |
| TH03 | Kart/şema/payload ile kaynak tüketme | Boyut, derinlik, enum/property ve regex politikası | Büyük ve patolojik schema reddi |
| TH04 | Agent açıklamasıyla prompt injection | Veri/talimat ayrımı; plan ve policy LLM dışı doğrulama | 'Secret gönder/izin aç' çıktısı eyleme dönüşmez |
| TH05 | Aynı işi çoğaltma | Caller-scoped dedup, dispatch kayıtları | Eşzamanlı tekrar/restart |
| TH06 | Token/log sızıntısı | Secret store, maskeleme, allowlisted log alanları | Log/snapshot taraması |
| TH07 | Sahte başarı/artifact | Şema+kaynak doğrulama, bağımsız runner | 'Tests passed' metni runner raporu sayılmaz |
| TH08 | Kodun host’a erişmesi | Ayrı sandbox, ağ/host mount/socket yok | Ağ, dosya, süreç ve kaynak testleri |
| TH09 | UI XSS/CSRF | Kaçışlı render, HTML kapalı, cookie+CSRF | Kötü amaçlı artifact ve cross-origin form |
| TH10 | Yavaş akış/çok sayıda görev | Rate limit, queue, byte/deadline/backpressure | Slow stream ve overload |
| TH11 | Dependency/image riski | Lockfile, pinned release, tarama, SBOM | CI raporu ve açık risk kaydı |
| TH12 | Silinen verinin context’e geri gelmesi | TTL, referans iptali, tombstone, backup politikası | Silinen artifact fetch reddi |

## Hedef limitler (uygulama değil)

Card 64 KiB; manifest 128 KiB; JSON şema derinliği 8, toplam property 100, enum 100. Harici `$ref` ve kullanıcı regex’i v1’de kapalı. HTTP JSON/RPC üst sınır 256 KiB; çıktı artifact’i 128 KiB; toplam step akışı 1 MiB. Decompression sonrası limit uygulanır. 10 job/dakika/kullanıcı; 2 aktif job/kullanıcı; toplam 8 aktif, 20 bekleyen iş; 20 UI SSE bağlantısı. Limit fazlası açık 413/429; kuyruk sonsuz büyümez.

## Runner kapısı

Runner yöneticisi platform API’sinden ayrı process/container ve credential kapsamıdır. Platform API’sine Docker socket mount edilmez. Yönetici yalnız önceden belirlenmiş image ve alanları kabul eder; arbitrary image/volume/command aktarımı yoktur. Sandbox: ağ yok, root yok, read-only rootfs, secret yok, host mount yok, writable geçici dizin en fazla 16 MiB, 1 CPU, 128 MiB RAM, 16 PID, 5 saniye wall-clock, stdout/stderr ayrı ayrı 64 KiB. Sonuç truncation açıkça bildirilir.

Üretilmiş test kodu da güvenilmezdir. Geliştirme runner’ı ayrı disposable ortamda çalışır; container tek başına düşmanca herkese açık kod için yeterli güvenlik kanıtı değildir. Teslim A yalnız belirtilen test kümesinden geçmiş kontrollü ekip işlerini kapsar. Genel internet runner’ı için stronger isolation ve bağımsız inceleme Teslim C kapısıdır.

## Risk ve operasyon

SQLite tek instance, agent/model doğruluğu, aynı modelin ortak hata üretmesi, kayıp task kimliği ve model timeout’u artık risklerdir. Kritik/yüksek risk için owner, azaltım ve kabul gerekçesi tutulur. Açık kritik izolasyon/erişim açığı Teslim A’yı bloke eder. Başlangıç auth yokluğu mevcut demoda bilinen sınırdır; bu belge güvenliği uygulamış sayılmaz.
