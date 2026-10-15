# Docker ve tarayıcı demo doğrulaması — 15 Ekim 2026

Dal: oguzhan. Test edilen commit: cbc8d07. Docker Desktop açıldı; `docker compose --profile integration up --build -d` ile beş servis başarıyla derlendi ve başlatıldı. Uygulama kodunda değişiklik gerekmedi.

## Gözlenen sonuçlar

- http://localhost:4002 arayüzü açıldı. Üç Agent Card, arayüzdeki kayıt formundan kaydedildi.
- Varsayılan Türkçe metinle üç beceri çalıştırıldı. Görev `daf7df2d-c5f4-40f8-ae29-205fdb0b9f46` completed oldu. Dil Türkçe; ilk anahtar kelime robot; özet açıkça fixture olarak gösterildi.
- Yalnız keywords container’ı durduruldu. Yeni görev `91703cf5-c84d-43bf-b2b7-a3b17d98f7ad` partial oldu. Anahtar kelime çocuğu unknown/execution_unknown; diğer iki sonuç korundu. Mevcut istemci gönderim denemesinden sonra bağlantı hatasını temkinli biçimde belirsiz sayıyor; kesin başarısızlık iddiası yok.
- Beş container yeniden başlatıldı; keywords geri açıldı. Sayfa yenilendiğinde aynı kısmi görev ve üç Registry kaydı korundu.
- İlk tamamlanmış görev REST üzerinden yeniden okundu; completed durumu ve üç çıktı korundu.
- Yeniden başlatma sonrası yeni görev `76c12cc5-419b-4a1c-b5e1-21e9bbd1c697` arayüzden oluşturuldu; üç çocuk da tamamlandı.
- Mevcut otomatik testler Node.js 24 üzerinde tekrar çalıştırıldı: 6/6 başarılı.

## Sınırlar ve son durum

Bu bir masaüstü tarayıcı smoke testidir; tüm ekran genişliklerini ve erişilebilirlik senaryolarını kapsamaz. Görevler çok kısa sürdüğünden ara ilerleme durumlarının kullanıcıya ne kadar süre göründüğü ayrıca ölçülmedi. Güç kaybı/sert süreç öldürme testi yapılmadı; Docker restart kullanıldı. Özet hâlâ gerçek analiz değildir.

Beş servis kullanıcı demoyu deneyebilsin diye çalışır durumda bırakıldı. Veriler Docker named volume’larında korunuyor. Durdurmak için `docker compose --profile integration stop` kullanılabilir. Bu rapor GitHub’a push edilmedi.
