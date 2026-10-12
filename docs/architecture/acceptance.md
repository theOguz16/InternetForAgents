# Kabul planı

Durum: Tasarım; uygulama testleri çalıştırılmadı.

| ID | Senaryo | Beklenen kanıt |
| --- | --- | --- |
| NA-01 | SDK ve A2A 1.0 | Card → SendStreamingMessage → SSE Task/status/artifact; wire fixture kaydı |
| NA-02 | Yeni review sağlayıcısı | A/B aynı profile; Personal kaynak değişmeden B bulunur/çağrılır |
| NA-03 | Yeni test agent'ı | Desteklenen test profili kayıttan sonra kullanılabilir; istemci önceden profili bilir |
| NA-04 | Agent kapalı | Health sonrası seçilmez; alternatif yoksa NO_ELIGIBLE_AGENT |
| NA-05 | İki child'tan biri bozuk | Başarılı sonuç korunur, aggregate partial |
| NA-06 | Agent Card uyumsuz | 0.3/yanlış binding veya eksik skill/profil aktive edilmez |
| NA-07 | completed ama bozuk artifact | INVALID_RESULT; raw çıktı başarı diye sunulmaz |
| NA-08 | Streaming ilk yanıtı kaybolur | Aynı requestId ile dedup garantili uzmanda tek task; yoksa unknown |
| NA-09 | Task id bilinirken ağ hatası | SubscribeToTask, gerekirse tek GetTask; periyodik sorgu yok, deadline sınırlı |
| NA-10 | Restart | Personal task link'ten devam eder; uzman working interrupted failed olur |
| NA-11 | Sahiplik ihlali | Başka developer kayıt veya user job/task okuyamaz |
| NA-12 | URL/redirect/DNS saldırısı | İzin dışı outbound bağlantı yapılmaz |
| NA-13 | Registry kesintisi | Yeni keşif 503; mevcut task SSE akışı doğrudan sürer |
| NA-14 | Kart revision seçimin ardından değişir | Sessiz yeni endpoint çağrısı yok |
| NA-15 | Token/kod/artifact log kontrolü | Secret ve payload redaction; UI HTML escape |
| NA-16 | Kotayı/boyutu aşma | Bounded hata; sonsuz queue/yanıt okuma yok |
| NA-17 | Health/keşif performansı | Operations hedeflerine karşı ölçüm ve ortam raporu |
| NA-18 | Sonuç saklama süresi biter | Payload silinir, expired görünür; metadata politikası uygulanır |
| NA-19 | JSON-RPC error HTTP 200 | Başarı sayılmaz; RPC hata sınıfı görünür |
| NA-20 | Uzman input/auth-required | Otomatik talimat veya credential üretimi yok; needs-attention |

Test katmanları: pure domain/state tests; profile schema tests; gerçek SQLite ile transaction/dedup; SDK client-server uyumu; Compose demo e2e. Mock yalnız ağ/dış LLM sınırında kullanılır; gerçek A2A entegrasyonu yalnız mock'la kanıtlanmaz.

## Demo koşulları

Sentetik Python kodu, açık engineMode=rules, aynı capability sağlayan iki review instance'ı, test agent instance'ı. Her adımda Registry snapshot, seçilen agent, child task durumu ve sonuç gösterilir. LLM kalitesi, test coverage veya üretim güvenilirliği başarı iddiası yapılmaz.

## Ek streaming kabul kriterleri

- NA-21: A2A, UI ve Registry tarafında periyodik durum sorgusu yok; sadece olay akışı veya gerçek talep üzerine kontrol var.
- NA-22: Kopma, yavaş tüketici ve terminal yarışında bounded kaynak kullanımı ve snapshot toparlanması doğrulanır.
