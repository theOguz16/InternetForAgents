# Uygulama görevleri

Durum: Planlandı, atanmadı. Eski T01–T12 görevleri arşivdedir. Yeni görevler aşağıdadır; GitHub issue oluşturulmadı.

| ID | İş | Bağımlılık | Kabul |
| --- | --- | --- | --- |
| N01 | Resmi SDK/A2A 1.0 uyum spike ve exact package pin | Kod başlatma talimatı | NA-01; serializer, TaskStore, SSE ve error davranışı |
| N02 | TS monorepo, servis sınırları ve eski prototip ayrımı | N01 | Ayrı entrypoint/build; eski dosyalar korunur, yeni sistemle karıştırılmaz |
| N03 | JSON Schema profile'ları ve örnek fixture'lar | N01,N02 | review/test input-output; bozuk artifact senaryoları |
| N04 | Registry DB/ownership/kayıt ve kart doğrulama | N02,N03 | NA-06/11/14 |
| N05 | Registry health/discovery ve network policy | N04 | NA-04/12/13/17 |
| N06 | Review Agent, persistent task/dedup ve rules engine | N02,N03 | NA-01/08/10/19 |
| N07 | Personal job API, DB, selector ve A2A client | N05,N06 | NA-08/09/11/13/20 |
| N08 | Test Agent ve paralel job aggregator | N03,N07 | NA-03/05/07 |
| N09 | Web UI ve reverse proxy | N04,N07,N08 | Görev/kayıt/seçim/sonuç; NA-15 |
| N10 | Compose profilleri, ikinci review sağlayıcısı | N05,N06,N08 | NA-02/04; bağımsız servis kapatma |
| N11 | Kabul testleri, security/retention/benchmark | N09,N10 | NA-01–22, ölçüm raporu ve açık kalanlar |
| N12 | Çalıştırma rehberi, demo senaryosu ve sonuç raporu | N11 | Tekrarlanabilir demo; iddia/kanıt eşleşmesi |

N04 ve N06 gibi bağımsız işler paralel yapılabilir; bu plan otomatik agent delegasyonu veya kişi ataması değildir. LLM entegrasyonu gerekli MVP tesliminin bağımlılığı değildir.
