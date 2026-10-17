# ADR-027 — Tek süreçte model gateway ve belirsiz iptalde durma

17 Ekim 2026; B08 uygulama kararı, ürün review’ı bekliyor.

Agent süreçlerine ayrı concurrency=1 kuyruğu koymak toplam model paralelliğini
sınırlamaz. Bu yüzden tüm handler'lar tek host gateway'ine aynı HTTP sözleşmesi
üzerinden bağlanır. Gateway fixture veya pinlenmiş yerel Ollama backend'i kullanır.
Ollama seçimi kurulu yerel modellerle gerçek ölçüm yapabilmek içindir; handler
sözleşmesi vendor'a bağlı değildir. Model seçimi EVAL-M1'de ayrı kaydedilir.

Timeout kuyruk beklemesini içerir. Kuyruk 8, aktif iş 1; ağ isteklerinde redirect
ve kullanıcıdan URL kabul edilmez. Bekleyen istek iptal edilir; aktif uzak
isteğin bağlantısını kesmek inference'ın durduğunu kanıtlamaz. Bu durumda yeni
çağrı yapılmaz, operatör uzlaştırması gerekir. Kullanılabilirlikten ödün vererek
iki belirsiz işin aynı anda yük oluşturmasını önleriz. Kalıcı lease ve restart
uzlaştırması I06 kapsamıdır; bu teslim yalnız yerel geliştirme içindir.

Ayrılmış Ollama'nın kendi paralelliği de 1 olmalıdır. Başka gateway veya doğrudan
Ollama istemcileri bu garantiye dahil değildir. Mevcut daemon ayarları izinsiz
kalıcı değiştirilmez. Gizli testlerden önce model/digest/options dondurulur;
fixture skoru gerçek kalite başarısı sayılmaz.

[Çalıştırma ve kabul kanıtı](../development/model-port.md).
