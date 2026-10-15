# Dağıtım, gözlem ve işletim

## Planlanan monorepo

apps/registry, apps/personal-agent, apps/review-agent, apps/test-agent, apps/web. packages/skill-profiles ve packages/observability gibi küçük ortak teknik paketler. infra altında Compose. Bu dizinler şu an tasarımdır; uygulama iskeleti oluşturulmamıştır.

Node 24 LTS + Express 5 + TypeScript strict/ESM; React+Vite UI. A2A SDK exact package sürümü N01'de seçilir. SQLite driver ve schema validator destekli sürümleri implementation sırasında lockfile'a sabitlenir. Her uygulama kendi port/repository adaptörüne sahiptir.

## Compose görünümü

| Servis | İç port | Kalıcı volume |
| --- | --- | --- |
| registry | 4001 | registry-data |
| personal-agent | 4002 | personal-data |
| review-a | 4101 | review-a-data |
| test-agent | 4102 | test-data |
| review-b (demo profili) | 4103 | review-b-data |
| web/proxy | 3000 | gerekmez |

Aynı review imajı farklı identity/port/config ile B olarak çalışabilir; ayrı görev DB'si gerekir. UI proxy Registry/Personal yollarını yönlendirir; A2A direct trafik proxy/Registry'ye bağlanmaz. Uzman host portları default yayınlanmaz. Hosttan çalışma gerektiğinde ayrı profile localhost endpoint'leriyle yeniden kayıt yapılır; docker DNS adresi browser'a çağrı için verilmez.

## Startup ve shutdown

Migration → profile yükleme → ready → Registry validation worker’ı ve talep üzerine sağlık kontrolü veya task worker. Pending kayıtlar/işler DB'den geri alınır. Uzman working restart davranışı task-lifecycle'da tanımlıdır. Shutdown yeni kabulü durdurur, 10 saniye bekler ve kalan işi restart sürecine bırakır. Liveness bağımlılıkları içermez; readiness DB erişimini içerir.

## Ölçüm hedefleri

Tek geliştirme makinesi, sentetik veri ve 100 kayıt için discovery p95 <300 ms; görev kabulü p95 <1 saniye (analiz süresi hariç). Periyodik tarama olmadığından kapanmayı boşta tespit etme garantisi yoktur; gerçek seçimde 15 saniyeden eski gözlem yeniden kontrol edilir; yeni geçerli kayıt sağlıklı ortamda 10 saniye içinde seçilebilir. Bunlar ölçülmemiş hedeflerdir; N11 raporu kanıt sağlar.

## Operasyonel durumlar

Registry kapalı: yeni keşif hata, mevcut task SSE akışı sürer. Uzman kapalı: SSE kesintisi ve sınırlı yeniden bağlanma, child unknown/failed kanıta göre; başka uzman yeni task için seçilir. Card değişimi: revision kontrolü yeniden seçim gerektirir. Disk dolu: yeni job/task accepted sayılmaz; önce kalıcı kayıt şarttır.

Günlük cleanup 24 saat payload/7 gün metadata kuralını uygular. Yerel demo reset komutu yalnız ileride dokümante edilecek açık kullanıcı isteğiyle volumes temizler; otomatik başlangıç veri silmez. Paylaşılan demoda SQLite backup API veya durdurulmuş tutarlı snapshot kullanılır; çalışan DB dosyasını WAL'siz kopyalamak yedek sayılmaz.

## CI pipeline hedefi

Format/lint → typecheck → profile schema/örnek doğrulama → domain tests → SQLite/SDK integration → Compose e2e → dependency/security review → artifact build. Bu pipeline henüz eklenmedi veya çalıştırılmadı. Gerekli kontroller kod görevlerinin parçasıdır.
