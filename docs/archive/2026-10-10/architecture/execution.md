# Çağrı yaşam döngüsü ve hata modeli

Durum: MVP kararı. ADR-006.

## Durumlar

accepted → running → succeeded / failed / unknown.

HTTP sınırındaki kimlik, şema ve yetki reddi dış çağrı oluşturmaz. accepted kaydı atomik olarak oluşturulur; dispatch öncesi running yazılır. Succeeded yalnızca doğrulanmış 200 çıktısı için yazılır. Ağda gönderim sonrası sonuç alınamazsa veya süreç running durumunda çökerse unknown kullanılır. Bu durum dış servisin çalışmadığını iddia etmez.

## Akış

1. Principal ve çağrı kapsamını doğrula.
2. Idempotency-Key, normalize istek özeti ve principal'a ait mevcut kaydı kontrol et.
3. Registry aktif durumunu, contractVersion/digest, güncelliği ve credential'ı kontrol et.
4. Girdiyi katalog şemasıyla doğrula; credential veya serbest endpoint girdisini kabul etme.
5. accepted kaydı ve anahtarı transaction içinde yaz; running'e geçir.
6. Policy'nin izin verdiği hedefe en fazla bir upstream denemesi yap.
7. Çıktıyı doğrula; sonucu ve durumunu kaydet; loglarda payload tutma.

Aynı principal ve Idempotency-Key, 24 saat boyunca aynı istek için aynı çağrı kimliğini verir. Farklı istek hash'i 409. Tamamlanmış cached sonuç tekrar döner; devam eden kayıt 409 IN_PROGRESS ve Retry-After; unknown otomatik tekrar gönderilmez. Cache süresi bitince aynı anahtar yeni çağrı sayılabilir; SDK/istemci bunu bilmelidir. Tam olarak bir kez dış çağrı garantisi verilmez.

MVP'de otomatik retry ve otomatik failover yoktur. Salt okunur sorgu için agent bilinçli olarak yeni anahtarla tekrar deneyebilir. Yan etkili işler policy ile kapalıdır.

## Hata eşlemesi

RFC 9457 zarfı: type, title, status, detail, instance; ek alanlar code, traceId, invocationId (oluşmuşsa), retryable. retryable kullanıcıya bilgi verir, otomatik deneme başlatmaz.

| HTTP | Kod örnekleri | Anlam |
| --- | --- | --- |
| 400 | MALFORMED_REQUEST | Bozuk JSON/header |
| 401 / 403 | UNAUTHENTICATED / FORBIDDEN | Kimlik veya kapsam |
| 404 | NOT_FOUND | Görünür olmayan veya bulunmayan kaynak |
| 409 | CONTRACT_CHANGED, IN_PROGRESS, KEY_CONFLICT | Yeniden değerlendirme gerekir |
| 413 / 415 | PAYLOAD_TOO_LARGE / UNSUPPORTED_MEDIA_TYPE | Taşıma sınırı |
| 422 | INVALID_INPUT, UNSUPPORTED_CAPABILITY | Şema/anlam desteği |
| 429 | RATE_LIMITED | Çekirdek kotası |
| 502 | INVALID_OUTPUT, PROVIDER_ERROR | Upstream yanıtı kullanılamıyor |
| 503 | REGISTRY_UNAVAILABLE, PROVIDER_UNAVAILABLE | Bağımlılık erişimi |
| 504 | PROVIDER_TIMEOUT | Sonuç zamanında alınamadı; çağrı unknown olabilir |

HTTP hata koduyla invocation state birbirinden ayrıdır. Upstream 429 çekirdeğin 429 kotasıyla karıştırılmaz; 503 PROVIDER_UNAVAILABLE ve sınırlanmış retryAfter bilgisi sunulur. İstemci bağlantısı kesilirse sonuç yazımı mümkün olduğu kadar tamamlanır; iptal, işlemin gerçekleşmediği garantisi değildir.

## Yeniden başlatma

Tek instance MVP'de başlangıçta eski running kayıtları unknown, gönderilmemiş accepted kayıtları failed olarak kapanır; otomatik redispatch yapılmaz. Çok instance'a geçiş lease/worker tasarımı gerektirir.
