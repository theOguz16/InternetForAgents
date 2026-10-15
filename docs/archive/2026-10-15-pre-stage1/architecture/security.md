# Güvenlik ve sınırlar

## Dağıtık sorumluluk

Registry kayıt sahipliğini ve card/probe ağ erişimini korur. Personal Agent kullanıcı job sahipliğini, seçim ve outbound erişimini korur. Her uzman caller kimliği ve kendi task erişimini kontrol eder. Registry'den kaldırmak doğrudan A2A erişimini teknik olarak iptal etmez; uzman credential revocation ayrıca gerekir.

## Kimlik

Yerel ilk demo compose internal ağında anonim uzmanlar kullanabilir; host portları yalnız localhost. Paylaşılan demo modunda developer/user tokenları ve Personal→uzman ayrı bearer credential'ları zorunlu. Credential'lar Card'da değil, secret config'dedir. Personal token'ı uzmanlara aynen forward edilmez. Card securityRequirements ile desteklenen credential modu uyuşmazsa aday elenir.

Browser uzman secret'larını görmez. UI kullanıcı/developer token'ı yalnız aktif demo session belleğinde tutar, URL/localStorage'a koymaz; loglanmaz. Production SSO/token provisioning kapsam dışıdır. Uzman Task GET ve Cancel çağrılarında owner principal kontrolü uygular.

## Ağ hedefleri

Card URL, health URL ve kart endpoint'i ayrı ayrı operatör allowlist'inden geçer. HTTP yalnız compose fixture host/port; dış bağlantı HTTPS. Metadata/link-local, izin dışı private/loopback ve URL credentials engellenir. Redirect takip edilmez. DNS sonucu bağlantıya sabitlenir veya eşdeğer egress denetimi uygulanır. Personal Agent Registry'den gelen endpoint'e de kendi kontrolünü uygular; Registry sonucunu otomatik güvenilir saymaz.

## İçerik

Kaynak kod veri olarak taşınır; shell, eval, package install veya repo clone yapılmaz. Test önerileri çalıştırılmaz. Agent açıklaması/çıktısı auth veya ağ policy'sini değiştiremez. UI artifact metnini kaçışlayarak gösterir; raw HTML render edilmez. Sonradan LLM eklenirse kaynak metin ve uzman çıktısı güvenilmeyen içerik olarak ayrıştırılır.

## Sınırlar

Kod 32 KiB; Card 256 KiB; RPC body/response 1 MiB. Streaming/decompression sınırsız okunmaz. Rate limit personal user başına 10 job/dakika, 2 active job; uzman başına en fazla 4 active task. Kuyruk kapasitesi 20; kabul edilemeyen iş açık hata verir, sonsuz kuyruk yok. Kimliksiz localhost demo tek principal gibi sınırlanır.

## Gözlem

Log: traceId, jobId, childId, agentId, method, duration, outcome. Kaynak kod, token, tam artifact veya kişisel veri loglanmaz. Protokol debug kaydı yalnız sentetik fixture ve redaction ile açılır.
