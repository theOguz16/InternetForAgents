# Riskler, kapsam dışı ihtiyaçlar ve yeniden karar koşulları

| Risk | MVP yaklaşımı | Yeniden değerlendirme koşulu |
| --- | --- | --- |
| Ortak yetenek sözlüğü yanlış anlamı gizler | Küçük operatör kataloğu, şema + anlam + birim tanımı | Bağımsız sağlayıcıların gerçek uyumsuzlukları |
| Kontrat doğru ama servis yanlış davranır | Kontrollü fixture, çıktı kontrolü, güven iddiası yok | Gerçek üçüncü taraf sağlayıcı eklenmesi |
| Dizin tek bağımlılıktır | DB kesintisinde açık hata | Kullanılabilirlik SLA'sı veya federasyon talebi |
| Serbest internet hedefi SSRF yaratır | Operatör allowlist, DNS/redirect kontrolleri | Kontrolsüz web keşfi talebi |
| Agent genel problem çözücü gibi algılanır | Demo/core ayrımı | Ürüne doğal dil planlayıcı ekleme kararı |
| Çok replica işleri iki kez yürütür | Tek instance sınırı | Ölçek hedefi tek instance'ı aşarsa |
| Eylem tekrarında zarar | MVP read-only, otomatik retry yok | Sipariş/randevu/mail gereksinimi |
| Örnek demo araştırmayı olduğundan geniş gösterir | Kaynak kodu değişmezliği kanıtı, config değişikliklerini açıklama | Yeni akademik/ürün iddiası |

Uygulama için açık engelleyici mimari karar yoktur. İlerideki protokoller, gerçek eylemler, çok kiracılı üretim, genel web keşfi ve yüksek erişilebilirlik bilinçli olarak kapsam dışıdır. Paketlerin kesin patch sürümleri ve repository/validator kütüphane seçimi görev kapsamında, bu mimari kurallar korunarak yapılır.
