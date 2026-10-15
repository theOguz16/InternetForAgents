# Görev kalıcılığı ve yeniden açılma davranışı

## Depolar

Personal, kullanıcı işlerini ve idempotency anahtarlarını `personal.sqlite` içinde tutar. Uzmanlar A2A task/artifact kayıtlarını kendi `tasks.sqlite` dosyalarında tutar. Yerel varsayılan dizin `.data/<servis>`; `DATA_DIR` ile değiştirilebilir. Registry kayıtları `registry.sqlite` içinde tutulur; yeniden açıldığında kayıtlar ve sağlayıcı kimlikleri korunur.

Docker'da Registry, Personal ve üç uzman için ayrı named volume vardır. `docker compose down` bu verileri korur; `down -v` verileri siler. Aynı SQLite dosyasını iki çalışan servis instance'ına bağlamayın: bu sürüm tek süreç sahipliğine göre tasarlanmıştır.

## Neden iki ayrı kayıt?

Kullanıcının işi birden fazla uzak görevi kapsar. Personal birleşik sonucu bilir; her uzman kendi yürütmesinin sonucunu bilir. Birinin yeniden başlaması diğerinin sonucunu otomatik olarak geçersiz kılmaz.

Personal'ın en fazla 100 işlik durum kümesi tek SQLite satırında snapshot olarak saklanır. İş ve idempotency anahtarı aynı atomik yazımda kaydedilir. Bu, küçük yerel demo için basittir; büyük veri hacminde normalleştirilmiş tablolar ve sorgulara geçilmelidir. Her güncellemede snapshot yazmanın maliyeti vardır.

Uzman görevleri tenant/owner/taskId bileşik anahtarıyla saklanır. Listeleme SDK filtrelerine uymak için kayıtları belleğe alır; çok büyük veri için uygun değildir. Uzman task retention/kota henüz uygulanmadı. Owner ayrımı depoda mevcut olsa da uç noktalar yerel anonim modda çalışır; gerçek kullanıcı kimlik doğrulaması tamamlanmadı.

## Çökme / yeniden açılma

- Tamamlanmış sonuçlar değişmeden yüklenir.
- Personal'da `running` kalmış işlerde bitmemiş çocuklar `unknown/personal_restarted` olur. Başarılı çocuklar korunur; sonuç buna göre partial veya unknown olur.
- Uzmanda submitted/working/input-required/auth-required kalmış görevler `failed` olur; metadata içindeki `recoveryReason=executor_restarted` yürütmenin kesildiğini açıklar.
- Otomatik yeniden yürütme yapılmaz. Tamamlanmış uzak görevle Personal arasında otomatik uzlaştırma sonraki iştir.
- Disk yazımı kullanıcıya kabul/SSE bildirimi gönderilmeden önce yapılır. WAL ve synchronous=FULL kullanılır. Disk dolması/kilitlenmesi için servis düzeyinde ayrıntılı hata yönetimi henüz geliştirilmedi.

## Doğrulama — 14 Ekim 2026

Node.js 24 altında `tests/platform.test.cjs`: **6/6 geçti**.

1. Dil kuralları: Türkçe, İngilizce, karışık, tekrar, yetersiz kanıt.
2. Kelime kuralları: sıklık, stop words, Unicode, URL ve adet sınırı.
3. Gerçek HTTP: kayıt/keşif, üç uzman A2A/SSE, birleşik sonuç, idempotency çatışması, kısmi başarı.
4. Personal SQLite kapat/aç: tamamlanmış iş, idempotency anahtarı, yarım iş kurtarma.
5. Uzman SQLite kapat/aç: artifact kalıcılığı, kesilen yürütme işaretleme, tenant ayrımı.
6. Registry SQLite kapat/aç: keşif sonucunun korunması, aynı kartta sabit kimlik, kaldırılan ağ izninin uygulanması.

Bu testler küçük regresyon örnekleridir; dil doğruluğu benchmark'ı değildir. SQLite testleri aynı test sürecinde depoyu kapatıp yeniden açar; zorla işletim sistemi süreci öldürme veya güç kaybı deneyi yapılmadı. HTTP testindeki varsayılan depolar izole bellek modundadır; dosya kalıcılığı ayrıca sınanır.

TypeScript derlemesi ve Compose config doğrulaması başarılı. Docker motoru kapalı olduğu için container yürütmesi yapılmadı.

Node.js 24 ortamında tekrarlama:

```sh
npm run test:services
```

Testler geçici portlar ve geçici SQLite dizinleri kullanır; mevcut geliştirme verilerine dokunmaz.

## Registry kayıt mantığı

`agents` tablosunda kart adresi UNIQUE, sağlayıcı kimliği PRIMARY KEY’dir. Aynı kart tekrar doğrulanıp kaydedildiğinde mevcut kimlik korunur ve snapshot yenilenir. `registeredAt` son başarılı kayıt/doğrulama zamanıdır. Ağ isteği sırasında transaction açık tutulmaz; doğrulama bitince kapasite kontrolü ve yazım kısa bir transaction içinde yapılır. 100 kayıt sınırında mevcut kayıt güncellenebilir, yeni kayıt reddedilir.

Disk hataları `503 registry_storage_unavailable`, kart hataları `422 card_validation_failed` olarak ayrılır. Registry başlangıçta kartları tekrar fetch etmez; kayıtlı snapshot’ları yükler. Bu, sağlayıcıların şu anda erişilebilir olduğu anlamına gelmez. Arka plan polling eklenmedi.

Güncel `ALLOWED_AGENT_ORIGINS` dışında kalan kayıtlar silinmez ama listeleme ve tekil okumada görünmez. İzin geri verilirse tekrar görünür. Yerel adres veya port değişmişse ilgili kart yeni adresle kaydedilmelidir; kalıcılık adres değişimini kendiliğinden çözmez. Sahiplik, kayıt silme ve otomatik güncellik politikası sonraki işlerdir.
