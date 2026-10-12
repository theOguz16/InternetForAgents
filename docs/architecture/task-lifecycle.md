# Görev durumları, tekrar ve hata modeli

## Üç kimlik/durum katmanı

Personal Agent Job kullanıcı isteğini, Child bir uzmana ayrılmış işi, uzman A2A Task kendi yürütmesini temsil eder. Job id ile Task id aynı değildir. Task id endpoint/agentId ile birlikte saklanır; yalnız id global yönlendirme anahtarı olmaz.

A2A 1.0 durumları boundary'de korunur. Yerel child durumları onların aynısı değildir; iletişim belirsizliği ayrı tutulur.

| Gözlenen A2A durum | Child değerlendirmesi |
| --- | --- |
| TASK_STATE_SUBMITTED / WORKING | running; SSE olayları dinlenir |
| TASK_STATE_COMPLETED | Artifact profil kontrolü geçerse succeeded |
| TASK_STATE_FAILED / REJECTED | failed; sebep sanitize edilir |
| TASK_STATE_CANCELED | canceled |
| TASK_STATE_INPUT_REQUIRED / AUTH_REQUIRED | needs-attention; otomatik yanıt/credential üretimi yok |
| Uzak sonuç bilinmiyor | unknown; bu yerel durumdur, A2A enum'u değildir |

UI input-required için açıklamayı gösterir. MVP multi-turn formu yoktur; kullanıcı tamamlanmış girdilerle yeni job oluşturabilir. Remote task saklama sonunda temizlenir, best-effort cancel istenir. Auth-required içerikleri otomatik açılmaz veya token'a dönüştürülmez.

## Job aggregate

queued → running → completed / partial / failed / needs-attention.

Tüm child başarılı: completed. En az biri başarılı, diğerleri sonlanmış/yerel bütçesi bitmiş: partial. Hiç başarı yok ve ihtiyaç bekleyen child varsa needs-attention. Hiç başarı yok, tümü failed/canceled/unknown ise failed; unknown alt detayda gizlenmez. Running child varken job running kalır; ara sonuçlar gösterilir. Başarılı artifact sonradan başka child hatasıyla silinmez.

## Zaman bütçeleri

Card/Registry request 3 saniye; SendStreamingMessage ilk task olayı için 5 saniye; toparlanma GetTask isteği 3 saniye. Periyodik durum sorgusu yoktur; toplam child deadline 60 saniye. Deadline'da 3 saniyelik CancelTask best-effort denenir. Cancel yanıtı doğrulanmadan canceled denmez. Sonuç unknown olabilir; yeni uzmana kendiliğinden tekrar gönderilmez.

## Uygulama idempotency profili

A2A messageId veya JSON-RPC id tek başına bizim duplicate execution garantimiz değildir. MVP uzman profilimiz ayrıca `(callerPrincipal, profile, requestId)` anahtarı ve canonical input hash'i tutar. Görev kabulü ile dedup rezervasyonu aynı SQLite transaction'dır. Aynı anahtar ve hash aynı task'ı getirir; farklı hash uygulama validasyon hatası olur. Bunu desteklemek A2A uyumluluğu değil, platform profile uyumluluğudur.

Personal Agent SendStreamingMessage'ı göndermeden child/requestId/messageId kaydını kalıcılaştırır. Cevap kaybolursa, dedup onaylı uzmanla aynı payload ve kimlikler üzerinden en fazla bir kez yeniden SendStreamingMessage yapılabilir; yeni task üretmemelidir. İkinci cevap da alınamazsa unknown. Task id biliniyorsa SubscribeToTask ile akışa yeniden bağlanılır; toparlanma ayrıntıları ADR-023 belgesindedir. Dedup özelliği doğrulanmamış harici agent'ta SendStreamingMessage tekrar edilmez.

Dedup ve task sonuçları 24 saat saklanır; toplam job bütçesi 60 saniye olduğu için normal uzlaştırma bu pencere içinde kalır. Pencere dışındaki job yeniden gönderilmez; kullanıcı yeni job başlatır. Exactly-once dış etki iddiası yoktur; dış etkiler zaten kapsam dışıdır.

## Restart

Personal Agent kaydedilmiş task id'lerle, kalan deadline içinde SSE aboneliğini yeniden kurar. Task id eksik ama dispatch işaretli child, aynı-agent dedup uzlaştırma kuralını izler. Deadline geçmişse unknown kapanır.

Uzman accepted/submitted işler SQLite pending listesinden alınır. Task ve input çalıştırma öncesi kalıcıdır. Working sırasında çökme sonrası görev failed/restart-interrupted olarak kapanır; otomatik ikinci analiz başlatılmaz. Artifacts ve completed aynı transaction'da yazılır. Bu yaklaşım tek instance sınırı içinde tasarlanmıştır.

## Hata sınıfları

Yerel job API hataları RFC 9457; A2A wire hataları SDK JSON-RPC modelidir. Personal Agent A2A hatasını dışarıya ham stack/secret olarak taşımaz.

- DISCOVERY_UNAVAILABLE: Registry erişilemiyor.
- NO_ELIGIBLE_AGENT: kayıt yok veya hiçbiri profile/health/auth koşullarını karşılamıyor.
- CARD_CHANGED: seçilen snapshot artık güncel değil.
- A2A_PROTOCOL_ERROR: RPC hata veya desteklenmeyen sürüm.
- REMOTE_TASK_FAILED: uzman başarısızlık bildirdi.
- INVALID_RESULT: completed çıktısı profile uymuyor.
- DISPATCH_UNCERTAIN: görev kabulünün sonucu bilinmiyor.
- DEADLINE_EXCEEDED: yerel süre doldu; uzak iş iptal edilmiş olmayabilir.

Bir health hatası mevcut task'ın başarısızlığı olarak yazılmaz; gerçek task sorgusu ayrı kanıttır.
