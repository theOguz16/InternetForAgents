# N01 — A2A 1.0 / SSE uyum denemesi

Bu izole spike eski seyahat prototipine bağımlı değildir. Gerçek kod inceleme veya Personal Agent ürünü değildir. Resmi SDK ile localhost HTTP/SSE iletişimini doğrular.

## Çalıştırma

Repo kökünde:

```sh
npm --prefix spikes/n01-a2a ci
npm --prefix spikes/n01-a2a run typecheck
npm --prefix spikes/n01-a2a run verify
```

npm komutlarını çalıştıran host Node >=20 olmalıdır. Doğrulama npm script PATH'i üzerinden yerel, sabitlenmiş Node 24.21.0 kullanır; global Node değiştirilmez. Dependency lockfile dahildir. Node runtime npm paketi kurulumda platform binary'sini indirir; internet gerekir.

## Kontroller

- SDK 1.3.0 ile Agent Card edinimi ve JSONRPC 1.0 seçimi.
- Gerçek `SendStreamingMessage` HTTP isteği ve text/event-stream yanıtı.
- Task/status/artifact/terminal olayları.
- İlk akışın AbortController ile kesilmesi; `SubscribeToTask` ile aynı görev ve ilk snapshot.
- Executor sayısı 1: yeniden abonelik yeni görev üretmez.
- Terminal aboneliğin -32004 hatası; bir defalık `GetTask` ile sonuç alma.
- SQLite store ve HTTP handler kapanıp yeniden açıldıktan sonra aynı sonuç; yeni executor çalışmaz.
- Hatalı RPC metoduna -32601 yanıtı.
- Wire `ROLE_USER` ve Data Part; eski `kind` alanı bulunmaz.
- Kesintisiz ayrı görevde tam artifact akışı.

`verify.ts` geçici SQLite klasörü ve rastgele localhost portu oluşturur, sonunda temizler. `evidence.json` son başarılı denemenin sanitize raporudur; herhangi bir sonraki başarısız çalıştırma bu eski raporu güncel başarı saydırmaz, exit code esas alınır. Terminal abonelik kontrolünde SDK'nın beklenen UnsupportedOperation hata logu normaldir.

## Dosyalar

- agent.ts: Express/A2A sunucusu ve kontrollü fixture executor.
- store.ts: SQLite üzerinden SDK TaskStore portu; listeleme SDK filtreleme davranışını yeniden kullanır.
- verify.ts: resmi client üzerinden uçtan uca kanıt.
- evidence.json: başarılı koşunun özeti.

## Sınırlar

Anonim localhost; authentication/ownership izolasyonu doğrulanmadı. Profile dedup ve SendStreamingMessage yanıtı hiç alınmadan toparlanma henüz yok. Server yeniden açma aynı doğrulama süreci içinde yapılıyor; işletim sistemi process crash veya working task recovery kanıtı değildir. TaskStore listeleme küçük spike için tüm kayıtları belleğe alır; ürün repository'si değildir. SQLite şema migration, rate limit, heartbeat, yavaş tüketici, tam profile validation, UI ve Registry yapılmadı.

Kontrollü executor checkpoint'i ağ kopmasını zaman yarışına bağlı olmadan üretir; kullanıcı kodu çalıştırmaz ve analiz yapmaz. SDK iç TypeScript oneof/enum modeli wire JSON'dan farklıdır; codec'ler kullanılır. Polling yoktur; GetTask yalnız terminal toparlanması ve persistence okumasında çağrılır.
