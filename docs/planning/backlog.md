# Uygulama görevleri

Durum: N01 tamamlandı; diğer görevler planlandı, atanmadı. Eski T01–T12 görevleri arşivdedir. Yeni görevler aşağıdadır; GitHub issue oluşturulmadı.

| ID | İş | Bağımlılık | Kabul |
| --- | --- | --- | --- |
| N01 | **Tamamlandı:** [SDK/A2A uyum spike sonuçları](n01-results.md) | Kod başlatma talimatı | NA-01; serializer, TaskStore, SSE ve error davranışı |
| N02 | **Başlatıldı:** TypeScript servis iskeleti ve Docker profilleri; paket/legacy ayrımı kalan iş | N01 | Ayrı entrypoint/build; eski dosyalar korunur, yeni sistemle karıştırılmaz |
| N03 | **Başlatıldı:** çalışma anında doğrulanan metin şemaları ve fixture handler’lar; dosya fixture/kabul senaryoları kalan iş. JSON Schema profile'ları ve örnek fixture'lar | N01,N02 | dil/anahtar kelime/özet input-output; bozuk artifact senaryoları |
| N04 | **Başlatıldı:** SQLite kayıt deposu, kart doğrulama ve keşif; ownership kalan iş | N02,N03 | NA-06/11/14 |
| N05 | Registry health/discovery ve network policy | N04 | NA-04/12/13/17 |
| N06 | **Başlatıldı:** ortak A2A/SSE adaptörü ve deterministik TR/EN dil algoritması eklendi; SQLite task deposu eklendi; mesaj dedup kalan iş | N02,N03 | NA-01/08/10/19 |
| N07 | **Başlatıldı:** bellekte job API/idempotency, selector, A2A client ve kullanıcı SSE; SQLite job/idempotency ve yeniden açılış kurtarması eklendi; ownership/reconnect kalan iş | N05,N06 | NA-08/09/11/13/20 |
| N08 | **Başlatıldı:** deterministik anahtar kelime çıkarma ve paralel aggregator eklendi; gerçek özetleme kalan iş | N03,N07 | NA-03/05/07 |
| N09 | **Başlatıldı:** React görev/sonuç/dizin arayüzü ve sabit Registry geçidi; tarayıcı/kabul testleri kalan iş | N04,N07,N08 | Görev/kayıt/seçim/sonuç; NA-15 |
| N10 | Compose entegrasyonu, ikinci dil sağlayıcısı | N05,N06,N08 | NA-02/04; bağımsız servis kapatma |
| N11 | Kabul testleri, security/retention/benchmark | N09,N10 | NA-01–22, ölçüm raporu ve açık kalanlar |
| N12 | Çalıştırma rehberi, demo senaryosu ve sonuç raporu | N11 | Tekrarlanabilir demo; iddia/kanıt eşleşmesi |

N04 ve N06 gibi bağımsız işler paralel yapılabilir; bu plan otomatik agent delegasyonu veya kişi ataması değildir. LLM entegrasyonu gerekli MVP tesliminin bağımlılığı değildir.
