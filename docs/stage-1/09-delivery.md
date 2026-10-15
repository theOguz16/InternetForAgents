# Görevler, bağımlılıklar ve Aşama 1 kapanışı

Bu belge GitHub issue oluşturmaz. ID’ler sohbet backlog’uyla aynıdır. 'Doküman hazır' uygulama task’ını tamamlamaz. Her implementation task’ında owner, branch/PR, kabul testi, kanıt commit’i ve açık risk alanları bulunmalıdır.

## Aşama 1 kapsamı

| ID | Teslim / kanıt | Durum ve kalan uygulama |
| --- | --- | --- |
| A01 | [Ürün ve AC01–AC12](01-product.md) | Tasarım hazır; ürün kabulü I05’te |
| A02 | [Envanter/geçiş](02-current-state.md), tarihsel arşiv | Belgeler uzlaştırıldı; runtime migration yok |
| A03 | [SOA, katmanlar, DAG/context/deployment](03-architecture.md) | Tasarım hazır; D01–D10 |
| A04 | [ADR-025](../decisions/0025-stage1-baseline.md), karar haritası | Kararlar kayıtlı |
| A05 | [TH01–TH12, roller, runner kapısı](04-security.md) | Tehdit modeli hazır; E01–E10 uygulama |
| B02 | [Manifest, schema, envelope, version](05-capability-contract.md) | Tanım hazır; B03/B04 parser ve test |
| F01 | [Üç profil, FunctionSpec, runner raporu](06-code-demo.md) | Semantik/alan/limitler hazır; makine şemaları F02 ön koşulu |
| G01 | [Ekranlar, akışlar, frontend katmanları](07-ux.md) | UX tasarımı hazır; görsel ekran/uygulama G02–G08 |
| H01 | [R1, P1/Q1, K01–K14](08-evaluation.md) | Platform protokolü sabit; model manifesti qualification sonrasında, holdout öncesinde sabitlenecek |

## Aşama 2 — genel kayıt ve şablon

| Task | Bağımlılık | Kabul |
| --- | --- | --- |
| B01 Generic Registry | B02 | Bilinmeyen beceri kaydı çekirdek listesi değişmeden |
| B03 Card/manifest eşleme | B02 | skillId/version/digest bağları doğrulanır |
| B04 Güvenli validator | B02,A05 | Alt küme, size/depth ve örnek validasyonu; negatif testler |
| B05 Agent şablonu | B03,B04 | Ayrı projede yalnız config/handler ile agent |
| B06 A2A adaptör yaşamı | B05 | Task/artifact/error ve capability davranışı testli |
| B07 Uyumluluk CLI | B06 | Hataları alan ve nedenleriyle raporlar |
| B08 Model portu | B05 | Fixture ve gerçek backend; EVAL-M1 qualification kaydı |
| B09 Bağımsız geliştirici | B07 | İki geliştirici çekirdek değişmeden bağlanır |
| C01 Sahiplik/kayıt durumu | E01,B03 | Owner update/suspend/delete; operator kontrolü |
| C02 Sürüm/revision | C01 | Immutable version/digest; concurrency çatışması |
| C03 Arama/pagination | B01 | Filtre/sınır/görünürlük |
| C04 Güncellik | C02 | expired snapshot dispatch kontrolü; polling yok |
| C05 Seçim | C03 | Yetki/uyum önce, gerekçe kayıtlı |
| C06 Alternatif provider | C05,D04 | Bilinmeyen yürütmede unsafe resend yok |

## Aşama 3 — workflow/context

D01 katman ayırma (A03); D02 DAG tanımı (B02,D01); D03 plan validator/executor (D02,C05); D04 dispatch/dedup (D01); D05 reconnect/uzlaştırma (D04); D06 timeout/iptal/bütçe (D03,D04); D07 minimum context (D02,A05); D08 artifact kaynak/erişim (D07); D09 retention/silme/restart (D04,D08); D10 geçmiş/aggregation (D03,D08).

Kabul: AC03/AC07/AC08 ve mimari dokümandaki durum makinesi. Her task için başarı ve hata fixture’ı gerekir. Pending/running state’i sadece UI state’i olarak tutulamaz. Workflow validator tamamlanmadan genel compose yeteneği ilan edilmez.

## Güvenlik hattı — aşamalara paralel zorunlu kapılar

E01 oturum/roller (A05); E02 service identity/secret (E01); E03 SSRF/egress (A05); E04 quota/backpressure (D04); E05 güvenilmeyen içerik/context (D07); E06 runner tasarımı (A05); E07 runner implementation (E06); E08 saldırı/limit testleri (E07); E09 web/dependency güvenliği (E01); E10 audit/redaction (E01,D08).

Her iş TH tablosundaki ilgili saldırı kümesini geçmelidir. E01–E05 olmadan paylaşılan agent kayıt modu, E08 olmadan üretilen kod çalıştırma modu açılmaz. Bunlar sonraya bırakılan kozmetik iyileştirmeler değildir.

## Aşama 4 — demo ve UI

F02 code agent, F03 review agent, F04 test agent (F01,B05,B08). F05 demo workflow (D03,E07,F02–F04). F06 ikinci sağlayıcı (F02 veya F03). F07 farklı alan agent’ı (B07).

G02 frontend katmanları (G01); G03 keşif/kayıt/owner UI (C01–C03,E01); G04 schema formu (B04,G02); G05 workflow/job UI (D03,D10); G06 geçmiş/artifact (D08,E01); G07 reconnect/retry UX (D04–D06); G08 erişilebilirlik/kullanılabilirlik (G03–G07).

Kabul: code/review/test çıktıları aynı code hash’i üzerinde; runner gerçek execution yapar; fixture ayrıdır; farklı alan agent’ı da doğrudan çağrılır. UI tüm error/empty/disconnected durumlarını kapsar.

## Aşama 5 — kanıt ve teslim

H02 telemetry (D01,E10); H03 unit/contract matrisi (B04,D03); H04 integration/E2E/fault (D05,F05,G05); H05 load/soak (E04,H02); H06 bağımsız oracle (F01,H01); H07 agent karşılaştırması (F05,H06); H08 onboarding ölçümü (B09,H01); H09 KPI raporu (H04–H08).

I01 temiz kurulum (B05,F05); I02 CI kapıları (H03,H04,E09); I03 backup/migration (C01,D09); I04 operasyon rehberi (H02,I03); I05 AC01–AC12 kabul oturumu (tüm Teslim A işleri).

## Sonraki seviyeler, Teslim A dışı

I06 çoklu worker/lease/fanout (H05); I07 güçlü multi-tenant izolasyon (E01–E10); I08 dinamik plan önerisi (D03,B04); I09 uzun dönem memory/retrieval ve baseline karşılaştırması (D07–D09); I10 açık internet dağıtım kapısı (I06–I09).

## Ekip paylaşımı önerisi

1 Registry/sahiplik + farklı alan agent’ı; 2 Orchestrator/context/depo; 3 şablon/model portu + code agent; 4 runner/test/benchmark + test agent; 5 frontend/onboarding + review agent. Gerçek kişiye atama henüz yapılmadı. Her kritik güvenlik/kontrat değişikliği ikinci kişi review eder. F02–F04 paralel başlayabilmek için önce B02/F01 makine şemaları ve B05 şablonu gerekir.

## Aşama 1 doğrulaması

Markdown yerel bağlantıları ve JSON örneklerinin syntax’ı kontrol edilir; runtime testi çalıştırmak bu doküman turunun kapsamı değildir. Hedef API’ler mevcut endpoint rehberiyle karıştırılmaz. Kabul edilen dokümanlar geliştirme dalından PR ile `develop` dalına sunulur; hazır teslim `develop → main` release PR’ıyla ilerler. Final commit hash’i push sonucunda bildirilir; kendi hash’ini dosyaya gömmeye çalışılmaz.

## Bu revizyonun kontrol kaydı

15 Ekim 2026: aktif README/docs kümesinde 165 yerel Markdown bağlantısı kontrol edildi; eksik hedef yok. S1.0 içindeki dört JSON örneği syntax kontrolünden geçti. Tarihsel arşiv, özgün belge içeriğini korur ve aktif bağlantı sayımına dahil edilmez. Bu turda uygulama testleri yeniden çalıştırılmadı; yalnız dokümantasyon değişti.
