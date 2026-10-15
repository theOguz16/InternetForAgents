# Ölçüm protokolü — EVAL-1

H01 tasarım tabanı. Hedefler ölçülmüş başarı değildir. Çalışma başlamadan run manifesti ve görev kümesi sabitlenir; sonuç görüldükten sonra hedefler geriye dönük değiştirilmez.

## Referans ortam R1

15 Ekim 2026 salt okunur gözlem: Apple M4, Mac16,1, 10 CPU, 16 GiB host RAM; Docker Engine 29.0.1, daemon 10 CPU ve 8,217,448,448 byte kullanılabilir bellek bildiriyor. Bu, tüm kaynakların uygulamaya ayrıldığı anlamına gelmez. Compose platform servis sınırları şu an 0.5 CPU/256 MiB/servis. Host ve Docker VM kaynakları ayrı raporlanır. Model bu referans ölçümünde çalıştırılmadı.

Her run manifesti: commit, OS/kernel, CPU/RAM, Docker sürüm/image digest, Node sürümü, servis limitleri, DB/fixture büyüklüğü, model adı/digest/quantization/context length, concurrency, temperature/seed desteği, ağ modu, arka plan uygulamaları, başlangıç/bitiş zamanı. Donanım değişirse yeni R etiketi; eski sonuçla aynı sınıf gibi birleştirilmez.

Model seçimi EVAL-1 içinde marka/parametre boyutu olarak kilitlenmez: B08’de R1’e sığan adaylarla qualification yapılır, ardından EVAL-M1 manifestinde tek model sürümü bütün karşılaştırmalar için dondurulur. Model seçilmeden kalite benchmark’ı yürütülmez. Bu kapı gelecekteki iş; ölçüm yapılmış değildir.

## İş yükleri ve yöntem

P1 platform-only: model yok; deterministik 10 ms fixture, 1 KiB input/output, 100 Registry kaydı, 1 adım ve 3-adım DAG ayrı rapor. 100 warmup işinden sonra 1,000 ölçülen iş; concurrency 1/5/10/20. Üç bağımsız tekrar. 20 concurrency kapasite hedefi değil kontrollü overload deneyidir. Soğuk başlangıç/ilk DB açılışı ayrı raporlanır. 60 dakikalık soak düşük sabit yükle yapılır.

Q1 kalite: 30 Python fonksiyon problemi; 10 sayı/liste, 10 metin, 10 sınır durumu ağırlıklı. Geliştirme için ayrı 10 örnek, benchmark’a dahil edilmez. Her yaklaşım 3 tekrar: 30×3×3=270 run. Görev/test dosyaları hash’lenir. Runner oracle testleri agent’a gösterilmez. Hata/timeout sonuçları paydadan çıkarılmaz. Benchmark sırasında tuning yapılmaz.

Karşılaştırmalar: (a) tek kod üretimi, (b) generation+review+test akışı, (c) aynı toplam çağrı/token bütçeli tek-agent yaklaşımı. S1.0 workflow repair yapmadığı için review/test kod doğruluğunu kendiliğinden yükseltmiş sayılmaz. İlk karşılaştırmada ana ek değer hata tespiti/test gücüdür. Kod düzeltme döngüsü eklenirse yeni deney sürümü gerekir. Aynı model kullanımı 'bağımsız uzman doğrulaması' diye tanıtılmaz.

Model exact token usage vermiyorsa karakter sayısı ayrı proxy olarak raporlanır; token/cost uydurulmaz. Deney sırası dengeli/rastgeleleştirilmiş, örnek bazında eşleştirilmiş olur. Medyan/p95, dağılım, tekrar farkı ve oranlarda güven aralığı raporlanır; küçük örneklem sınırlaması açıklanır.

## KPI tanımları

| KPI | Pay/payda veya zaman aralığı | Başlangıç hedefi |
| --- | --- | --- |
| K01 Entegrasyon değişikliği | Uyumlu yeni sağlayıcı için değişen çekirdek kaynak dosyası | 0; kayıt/config değişikliği ayrı sayılır |
| K02 Yeni beceri kabulü | Bilinmeyen namespace’in kayıt+doğrudan çağrı sonucu | Başarılı, sabit liste değişmez |
| K03 Onboarding | Hazır handler+kurulu ortamdan ilk platform artifact’ine wall time | Ekip medyanı ≤30 dk; indirmeler ayrı |
| K04 Yürütme başarısı | Geçerli fixture işlerinde doğru terminal/artifact / tüm kabul edilen işler | ≥%99, overload ayrı |
| K05 Payload kontrolü | Reddedilen geçersiz / negatif test kümesi | Kümenin %100’ü |
| K06 Erişim izolasyonu | Yetkisiz yanıtla açılan veri | Test kümesinde 0 |
| K07 Duplicate | Tek invocation için gerçekleşen fazladan executor çağrısı | Tekrar/arıza kümesinde 0 |
| K08 Kalıcılık | Restart sonrası eşleşen kabul edilmiş terminal kayıt / önceki terminal kayıt | Test kümesinde %100 |
| K09 Keşif | Registry request start → tam response, 100 kayıt/10 istemci | p95 ≤300 ms |
| K10 Platform ek süre | Tek-adım toplam süre − uzman measured execution süresi | p95 ≤500 ms; queue dahil/hariç ayrı |
| K11 UI ilerleme | Sunucuda event oluşturma → DOM güncelleme | p95 ≤1 sn; saat hizası belgelenecek |
| K12 İzlenebilirlik | Trace ilişkisi bulunan job/step/remote task | Kontrollü run’larda %100 |
| K13 Boşta takip trafiği | Aktif izleme sırasında periyodik durum GET sayısı | 0; heartbeat/tek recovery ayrı |
| K14 Kaynak | Model hariç 5 servis RSS, CPU, disk artışı | Toplam RSS ≤1.25 GiB; soak son 15 dk medyanı ilk steady 15 dk’ya göre ≤%10 artış |

Warmup, rejected request oranı, queue wait, timeout ve payload boyutu bütün latency grafikleriyle birlikte verilir. %99 başarı güvenlik hatasını meşrulaştırmaz. Disk büyümesi artifact üretimi/retention’a göre yorumlanır; ham eğri tek başına leak değildir. Resource cap hedefe ulaşmayı garanti etmez; OOM da hata sayılır.

## Agent kalite ölçüleri

Gizli testlerin tamamını geçen görev oranı; review precision/recall (elle etiketli bug seti), false-positive; test kodu geçerliliği; mutation detection (en az 20 elle doğrulanmış hatalı varyant, eşdeğer mutation hariç); wall time, model kuyruk süresi, varsa token/cost ve peak RAM/VRAM. Agent’ın kendi testini geçmesi bağımsız doğruluk oracle’ı değildir. Model kalite eşiği qualification sonrasında, holdout açılmadan EVAL-M1’de dondurulur; bu karar verilmeden teslim kalite değerlendirmesi tamamlanmış sayılmaz.

## Arıza matrisi

Uzman kapalı/yavaş, bozuk artifact, kesik SSE, task ID alınmadan kopma, Registry kesintisi, Personal/uzman sert süreç sonlandırma, disk dolması/kilitlenmesi, tekrar POST, auth expiry, schema sürüm değişimi. Her deney beklenen state, korunacak artifact, executor count, toparlanma süresi ve ağ çağrı sayısını kaydeder. Deadline dolunca uzak işin otomatik iptal olduğu varsayılmaz.

## Tekrarlanabilir rapor

Run manifest + test fixture hash’leri + ham ölçüm CSV/JSON + grafik + hedef/sonuç tablosu + başarısız örnek analizi + limitations. Secrets ve gerçek kişisel veri yoktur. İnsan değerlendirmesinde mümkünse yaklaşım adı gizlenir. İki geliştiricilik onboarding sonucu genellenebilir istatistik diye sunulmaz. Kabul kanıtı rapor dosyasının sürümlü commit’idir.
