# ADR-023: SSE ve periyodik polling'in kaldırılması

Tarih: 2026-10-12. Durum: Kabul; kullanıcı polling kullanılmamasını istedi.
Yerine geçtiği kısımlar: ADR-019 görev takibi, ADR-014 streaming kapsamı, ADR-017 periyodik probe/refresh.

## Karar

A2A SendStreamingMessage ile başlatılır; görev ve artifact güncellemeleri SSE ile gelir. Personal Agent aynı olayları kendi iş modeline dönüştürüp UI'ye SSE üzerinden sunar. A2A veya UI tarafında zamanlayıcıyla durum GET'i yoktur. A2A streaming desteği seçim şartıdır.

## Bağlantı kopması

Task id biliniyorsa SubscribeToTask ile kalan süre içinde en fazla 3 yeniden bağlanma (1/2/4 saniye jitter) yapılır. İlk snapshot kaçırılmış durumu uzlaştırır. Terminal görev aboneliği reddedilirse bir GetTask ile sonuç alınır; döngü oluşturulmaz. Denemeler biterse unknown/needs-attention gösterilir; polling fallback yapılmaz. Task id hiç alınmadıysa aynı requestId ile uygulama dedup kuralı kapsamında en fazla bir yeniden gönderim mümkündür.

## UI akışı

GET /v1/jobs/{id}/events ilk olayda güncel snapshot, ardından artan revision ile güncellemeler gönderir. Durum yazımı ve event publication sırası korunur: önce DB commit, sonra olay. Bağlantı açılışında abonelik/snapshot yarışı revision ile çözülür. Yeniden bağlanmada yeni snapshot yeterlidir; eksiksiz event replay garantisi yoktur. Fetch streaming kullanılarak Authorization header taşınır; token URL'ye konmaz. Browser retry sayısı 3 ile sınırlanır; terminal job'da bağlantı kapanır.

## Akış kaynak sınırları

Proxy buffering kapalı, idle timeout 30 saniyeden uzun. 15 saniyede bir SSE comment heartbeat bağlantıyı canlı tutar; bu yeni HTTP sorgusu değildir. Her event en fazla 256 KiB, toplam artifact 1 MiB; client başına bounded buffer. Yavaş tüketici bağlantısı kapatılıp snapshot ile toparlanır. Principal başına 2 UI stream; toplam uzman concurrency sınırları korunur. SSE bağlantılarının da kaynak maliyeti vardır; maliyet ölçülür.

## Registry

Periyodik health ve card refresh sorguları kaldırılır. Kayıtta veya gerçek seçim talebinde süresi dolmuş cache bir defa doğrulanır; eşzamanlı kontroller birleştirilir. Boşta kapanan servisin belirli saniyede fark edileceği vaat edilmez. Pasif çağrı hataları ve talep üzerine kontrol erişilebilirlik bilgisini günceller.

## Kabul

NA-09: kopma/terminal yarışında sonuç kaybı ve yeni görev üretimi yok. NA-21: boşta istemcilerden periyodik HTTP durum isteği çıkmıyor. NA-22: yavaş tüketici, event boyut limiti, auth ve reconnect snapshot doğrulanıyor.

Kaynak: [A2A v1.0.0 streaming ve SubscribeToTask](https://a2a-protocol.org/v1.0.0/specification/).
