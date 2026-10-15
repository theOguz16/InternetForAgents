# Servislerin ayrıntılı tasarımı

## Registry

Girdiler: developer kaydı, kart adresi, onaylı profil eşleştirmesi; agent arama sorgusu.
Çıktılar: kayıt durumu, kart snapshot/digest, endpoint ve protokol seçeneği, gözlenen erişilebilirlik, eşleşen profiller.
Veri sahibi: AgentRegistration, CardSnapshot, ProfileBinding, HealthObservation, developer ownership.

Use case'ler: register, validate card, refresh, search, suspend, resume, remove. Kartı yalnızca izinli hedeflerden alır; code payload'u veya uzman task verisi almaz. DB veya keşif servisi çökerse yeni keşif 503 olur; çalışan doğrudan A2A task'ları Registry'ye bağlı değildir.

## Personal Agent

Girdiler: işlem seçimi ve Python kaynak metni; kullanıcı principal'ı.
Çıktılar: kalıcı jobId, child durumları, seçim gerekçesi, sonuçlar ve kısmi hata.
Veri sahibi: Job, ChildTask, SelectionSnapshot, TaskLink, kısa süreli input/output.

Yetenek seçimi ilk aşamada UI'nin operation enum'undan gelir; serbest metin yalnızca not olarak tutulur, yeni yetki üretmez. Her child için profile match, sağlıklı kayıt, destekli A2A interface ve credential uygunluğu değerlendirilir. Eşit adaylar sabit agentId sırasıyla seçilir; performans/fiyat skorları yoktur. Alternatif liste ve neden gösterilir.

Registry'den kart alınması yetki vermez. Dispatcher doğrulanmış endpoint'e uygun ayrı servis credential'ıyla gider. Job sahibi olmayan kullanıcı sonuçları okuyamaz. Personal Agent kullanıcı kodunu Registry'ye göndermez.

## Code Review Agent

Girdi code-review.v1 profili. Çıktı summary, findings ve engineMode. İlk motor sınırları açık birkaç deterministik Python metin kuralını uygular; tam semantik analiz iddiası yoktur. Sözdizimi/analiz sınırlılığı bulgu değil, limitation olarak ayrıca gösterilir. Kod eval/exec ile çalıştırılmaz.

## Test Generation Agent

Girdi test-suggestions.v1 profili. Çıktı summary ve scenarios; isteğe bağlı öneri metni. İlk motor deterministik örnek şablonlar üretir. Test geçerliği veya coverage sonucu iddia edilmez. Üretilen kod çalıştırılmaz.

## Web UI

Dört ekran: görev oluşturma; keşif/seçim ve child durumları; sonuçlar; developer kayıt yönetimi. Uzman token'ları tarayıcıya verilmez. Registry ve Personal Agent'a same-origin reverse proxy yoluyla ulaşır. Job güncellemelerini Personal Agent SSE endpoint’inden dinler; periyodik GET döngüsü yoktur. Agent kaydında kart doğrulama hatalarını ve son erişim zamanını gösterir.

## Yeni agent ekleme

Geliştirici A2A servisi ve kartı yayımlar, mevcut profil uyumunu belirtir, kayıt olur. Yeni provider mevcut profili destekliyorsa Personal Agent kodu değişmez. Yeni profil desteklemek ise yeni payload/sonuç anlamı ve istemci sunumu gerektirir.
