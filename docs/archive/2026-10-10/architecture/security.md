# Güven sınırları ve güvenlik modeli

Durum: Kontrollü MVP kararı; internete açık üretim güvenlik onayı değildir.

## Sınırlar

Agent isteği, sağlayıcı kontratı ve upstream yanıtı güvenilmeyen girdilerdir. Provider kimliği operatör tarafından atanır; yalnızca kaydını yönetebilir. Agent token scope'ları discover/invoke ile sınırlıdır. Operatör yönetimi ve salt okunur agent erişimi ayrıdır. API'de kaynak sahipliği her istekte denetlenir.

## Kontrat ve endpoint edinimi

MVP outbound hedefleri operatör allowlist'iyle sınırlıdır. Kayıt sahibi host allowlist'ini değiştiremez. Allowlist sağlayıcı endpoint'ini agent koduna sabitlemez; operasyonel ağ iznidir. Yeni sağlayıcı ekleme deneyinde gereken allowlist değişikliği açıkça kaydedilir.

HTTPS varsayılan; yerel fixture için açık host/port HTTP istisnası. Loopback/private ağ yalnızca bu yerel fixture listesinde izinlidir. Metadata servisleri, link-local, userinfo içeren URL, desteklenmeyen şema/port ve kontrolsüz proxy engellenir. DNS çözümünden sonra bağlantı adresi izinli IP'ye sabitlenir veya eşdeğer egress proxy kuralı uygulanır; tekrar DNS çözümüyle kontrolün atlanmasına izin verilmez. Redirect takip edilmez. Response/body/decompression boyutu sınırlandırılır.

## Secret ve içerik

Çekirdek token'ı sağlayıcıya forward edilmez. Sağlayıcı credential'ı yalnızca bağlı servis ve doğrulanmış host için kullanılır. Loglara Authorization, URL query secrets, raw input/output yazılmaz. Kontrat açıklaması veya sağlayıcı çıktısı policy komutu sayılmaz. Çekirdek eval, shell, indirilmiş kod veya kontrattan executable template çalıştırmaz. Örnek agent harici metni kullanıcı/sistem talimatı gibi değerlendirmemelidir.

## İşlem sınırı

Yalnızca katalogda effect=read desteklenir; gerçek yan etkiler kapalıdır. Agent'ın 'kullanıcı onayladı' metni yeni yetki doğurmaz. Harici sağlayıcının beyan edilen etkiye uyduğu teknik olarak garanti edilemez; kontrollü fixture kapsamı bu riski sınırlar.

## İstismar ve işletim

Principal başına dakika kotası ve eşzamanlı çağrı sınırı uygulanır. Tek instance başlangıç değerleri: 60 API istek/dakika/principal, 5 eşzamanlı invocation/principal, 20 toplam upstream çağrısı. Limit aşımı kuyruk oluşturmak yerine 429 verir. Hesap paylaşımı ve üretim çok kiracılı izolasyon MVP dışında.

Kabul kontrolleri: başka provider kaydını değiştirme reddi, private/metadata hedef reddi, DNS yeniden bağlama kontrolü, secret redaction, büyük gövde reddi, kötü niyetli kontrat metninin policy değiştirememesi. Bunlar ileride yapılacak testlerdir; çalıştırılmış sayılmaz.
