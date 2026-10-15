# Uygulama görevleri

67 GitHub Issue: 62 Teslim A, 5 gelecek seviye. Gerçek kişi ataması yapılmadı. Base develop; çözümler PR ile, son review Oguzhan’da.

| Task | Yerel ayrıntı | GitHub | Bağımlılıklar |
| --- | --- | --- | --- |
| B01 | [[B01] Registry genel beceri kaydını tamamla](B01.md) | [#4](https://github.com/furkankorkmaz35/InternetForAgents/issues/4) | B03, B04 |
| B03 | [[B03] Agent Card ve manifest eşlemesini tamamla](B03.md) | [#3](https://github.com/furkankorkmaz35/InternetForAgents/issues/3) | B04 |
| B04 | [[B04] Manifest validator sınır testlerini ve şemalarını tamamla](B04.md) | [#2](https://github.com/furkankorkmaz35/InternetForAgents/issues/2) | S1.0 |
| B05 | [[B05] Bağımsız agent geliştirme şablonu hazırla](B05.md) | [#5](https://github.com/furkankorkmaz35/InternetForAgents/issues/5) | B03, B04 |
| B06 | [[B06] Ortak A2A adaptörünü genel envelope’a taşı](B06.md) | [#8](https://github.com/furkankorkmaz35/InternetForAgents/issues/8) | B05, D04 |
| B07 | [[B07] Agent uyumluluk kontrol komutu geliştir](B07.md) | [#9](https://github.com/furkankorkmaz35/InternetForAgents/issues/9) | B06 |
| B08 | [[B08] Model portu ve qualification rehberi hazırla](B08.md) | [#10](https://github.com/furkankorkmaz35/InternetForAgents/issues/10) | B05 |
| B09 | [[B09] İki bağımsız geliştiriciyle onboarding deneyi yap](B09.md) | [#11](https://github.com/furkankorkmaz35/InternetForAgents/issues/11) | B07 |
| C01 | [[C01] Registry sahiplik ve kayıt yaşam döngüsü uygula](C01.md) | [#13](https://github.com/furkankorkmaz35/InternetForAgents/issues/13) | E01, B03 |
| C02 | [[C02] Sürüm değişmezliği ve revision concurrency tamamla](C02.md) | [#14](https://github.com/furkankorkmaz35/InternetForAgents/issues/14) | C01 |
| C03 | [[C03] Registry arama ve sayfalama uygula](C03.md) | [#15](https://github.com/furkankorkmaz35/InternetForAgents/issues/15) | B01, C01 |
| C04 | [[C04] Kayıt güncelliği politikasını uygula](C04.md) | [#16](https://github.com/furkankorkmaz35/InternetForAgents/issues/16) | C02 |
| C05 | [[C05] Açıklanabilir sağlayıcı seçim modülünü ayır](C05.md) | [#17](https://github.com/furkankorkmaz35/InternetForAgents/issues/17) | C03 |
| C06 | [[C06] Güvenli alternatif sağlayıcı davranışı ekle](C06.md) | [#18](https://github.com/furkankorkmaz35/InternetForAgents/issues/18) | C05, D04 |
| D01 | [[D01] Backend katman ve port sınırlarını düzenle](D01.md) | [#6](https://github.com/furkankorkmaz35/InternetForAgents/issues/6) | S1.0 |
| D02 | [[D02] Deklaratif workflow tanımı oluştur](D02.md) | [#19](https://github.com/furkankorkmaz35/InternetForAgents/issues/19) | B04, D01 |
| D03 | [[D03] Workflow validator ve DAG executor uygula](D03.md) | [#20](https://github.com/furkankorkmaz35/InternetForAgents/issues/20) | D02, C05 |
| D04 | [[D04] Kalıcı dispatch ve uçtan uca dedup tamamla](D04.md) | [#7](https://github.com/furkankorkmaz35/InternetForAgents/issues/7) | D01 |
| D05 | [[D05] SSE reconnect ve görev uzlaştırma uygula](D05.md) | [#21](https://github.com/furkankorkmaz35/InternetForAgents/issues/21) | D04 |
| D06 | [[D06] Timeout iptal ve iş bütçelerini tamamla](D06.md) | [#22](https://github.com/furkankorkmaz35/InternetForAgents/issues/22) | D03, D04 |
| D07 | [[D07] Minimum context oluşturucu uygula](D07.md) | [#24](https://github.com/furkankorkmaz35/InternetForAgents/issues/24) | D02, E05 |
| D08 | [[D08] Yetkili artifact deposu ve kaynak izi kur](D08.md) | [#25](https://github.com/furkankorkmaz35/InternetForAgents/issues/25) | D07, E01 |
| D09 | [[D09] Retention silme ve restart politikasını tamamla](D09.md) | [#26](https://github.com/furkankorkmaz35/InternetForAgents/issues/26) | D04, D08 |
| D10 | [[D10] Görev geçmişi ve birleşik raporu tamamla](D10.md) | [#27](https://github.com/furkankorkmaz35/InternetForAgents/issues/27) | D03, D08 |
| E01 | [[E01] Kullanıcı oturumu ve rol modelini uygula](E01.md) | [#12](https://github.com/furkankorkmaz35/InternetForAgents/issues/12) | S1.0 |
| E02 | [[E02] Servis kimliği ve secret yaşam döngüsü kur](E02.md) | [#28](https://github.com/furkankorkmaz35/InternetForAgents/issues/28) | E01 |
| E03 | [[E03] SSRF ve egress korumasını tamamla](E03.md) | [#29](https://github.com/furkankorkmaz35/InternetForAgents/issues/29) | S1.0 |
| E04 | [[E04] Kota queue ve backpressure tamamla](E04.md) | [#30](https://github.com/furkankorkmaz35/InternetForAgents/issues/30) | D04 |
| E05 | [[E05] Güvenilmeyen agent içeriği sınırlarını uygula](E05.md) | [#23](https://github.com/furkankorkmaz35/InternetForAgents/issues/23) | D01 |
| E06 | [[E06] Runner tasarımını uygulanabilir güvenlik paketine dönüştür](E06.md) | [#31](https://github.com/furkankorkmaz35/InternetForAgents/issues/31) | S1.0 |
| E07 | [[E07] İzole Python runner uygula](E07.md) | [#32](https://github.com/furkankorkmaz35/InternetForAgents/issues/32) | E06 |
| E08 | [[E08] Runner saldırı ve kaynak sınırı testleri yaz](E08.md) | [#33](https://github.com/furkankorkmaz35/InternetForAgents/issues/33) | E07 |
| E09 | [[E09] Web ve bağımlılık güvenlik kapıları ekle](E09.md) | [#34](https://github.com/furkankorkmaz35/InternetForAgents/issues/34) | E01 |
| E10 | [[E10] Audit ve veri maskeleme uygula](E10.md) | [#35](https://github.com/furkankorkmaz35/InternetForAgents/issues/35) | E01, D08 |
| F02 | [[F02] Bağımsız kod üretme agent’ı geliştir](F02.md) | [#37](https://github.com/furkankorkmaz35/InternetForAgents/issues/37) | B05, B06, B08, F01-IMPL |
| F03 | [[F03] Bağımsız review agent’ı geliştir](F03.md) | [#38](https://github.com/furkankorkmaz35/InternetForAgents/issues/38) | B05, B06, B08, F01-IMPL |
| F04 | [[F04] Bağımsız test üretme agent’ı geliştir](F04.md) | [#39](https://github.com/furkankorkmaz35/InternetForAgents/issues/39) | B05, B06, B08, F01-IMPL |
| F05 | [[F05] Kod üretim review test workflow’unu bağla](F05.md) | [#40](https://github.com/furkankorkmaz35/InternetForAgents/issues/40) | D03, E07, F02, F03, F04 |
| F06 | [[F06] Aynı beceride ikinci sağlayıcı bağla](F06.md) | [#41](https://github.com/furkankorkmaz35/InternetForAgents/issues/41) | F02, C05 |
| F07 | [[F07] Farklı alanda agent ekle](F07.md) | [#43](https://github.com/furkankorkmaz35/InternetForAgents/issues/43) | B07, B10 |
| G02 | [[G02] Frontend feature modüllerine ayrıştır](G02.md) | [#44](https://github.com/furkankorkmaz35/InternetForAgents/issues/44) | S1.0 |
| G03 | [[G03] Keşif agent detayı ve sahiplik ekranlarını yap](G03.md) | [#45](https://github.com/furkankorkmaz35/InternetForAgents/issues/45) | C01, C03, E01, G02 |
| G04 | [[G04] Şemadan doğrudan çağrı formu oluştur](G04.md) | [#46](https://github.com/furkankorkmaz35/InternetForAgents/issues/46) | B04, G02, B06, B10 |
| G05 | [[G05] Workflow ve görev detay ekranını tamamla](G05.md) | [#47](https://github.com/furkankorkmaz35/InternetForAgents/issues/47) | D03, D10, G02 |
| G06 | [[G06] Görev geçmişi ve artifact görünümünü yap](G06.md) | [#48](https://github.com/furkankorkmaz35/InternetForAgents/issues/48) | D08, D10, E01, G02 |
| G07 | [[G07] Reconnect retry ve idempotency UX tamamla](G07.md) | [#49](https://github.com/furkankorkmaz35/InternetForAgents/issues/49) | D04, D05, D06, G02 |
| G08 | [[G08] Erişilebilirlik ve kullanıcı testi yap](G08.md) | [#50](https://github.com/furkankorkmaz35/InternetForAgents/issues/50) | G03, G04, G05, G06, G07 |
| H02 | [[H02] Trace metric ve structured logging ekle](H02.md) | [#51](https://github.com/furkankorkmaz35/InternetForAgents/issues/51) | D01, E10 |
| H03 | [[H03] Birim ve kontrat test matrisini tamamla](H03.md) | [#52](https://github.com/furkankorkmaz35/InternetForAgents/issues/52) | B04, D03 |
| H04 | [[H04] E2E ve arıza testlerini otomatikleştir](H04.md) | [#53](https://github.com/furkankorkmaz35/InternetForAgents/issues/53) | D05, F05, G05 |
| H05 | [[H05] Yük ve soak deneyini çalıştır](H05.md) | [#54](https://github.com/furkankorkmaz35/InternetForAgents/issues/54) | E04, H02 |
| H06 | [[H06] Bağımsız kod oracle benchmark kümesi hazırla](H06.md) | [#55](https://github.com/furkankorkmaz35/InternetForAgents/issues/55) | S1.0 |
| H07 | [[H07] Tek ve çok agent karşılaştırması yap](H07.md) | [#56](https://github.com/furkankorkmaz35/InternetForAgents/issues/56) | F05, H06, B08 |
| H08 | [[H08] Geliştirici entegrasyon maliyetini ölç](H08.md) | [#57](https://github.com/furkankorkmaz35/InternetForAgents/issues/57) | B09 |
| H09 | [[H09] KPI ve başarısızlık analiz raporu yaz](H09.md) | [#58](https://github.com/furkankorkmaz35/InternetForAgents/issues/58) | H04, H05, H07, H08 |
| I01 | [[I01] Temiz makine kurulumunu doğrula](I01.md) | [#59](https://github.com/furkankorkmaz35/InternetForAgents/issues/59) | B05, F05 |
| I02 | [[I02] CI ve PR review kalite kapılarını kur](I02.md) | [#60](https://github.com/furkankorkmaz35/InternetForAgents/issues/60) | H03, H04, E09 |
| I03 | [[I03] Backup restore ve migration rehberi uygula](I03.md) | [#61](https://github.com/furkankorkmaz35/InternetForAgents/issues/61) | C01, D09 |
| I04 | [[I04] Operasyon runbook’u tamamla](I04.md) | [#62](https://github.com/furkankorkmaz35/InternetForAgents/issues/62) | H02, I03 |
| I05 | [[I05] Teslim A kabul ve release oturumu yap](I05.md) | [#63](https://github.com/furkankorkmaz35/InternetForAgents/issues/63) | H09, I01, I02, I03, I04 |
| I06 | [[I06] Çoklu worker ölçek tasarımını uygula](I06.md) | [#64](https://github.com/furkankorkmaz35/InternetForAgents/issues/64) | H05, I05 |
| I07 | [[I07] Çok kiracılı güçlü izolasyon kur](I07.md) | [#65](https://github.com/furkankorkmaz35/InternetForAgents/issues/65) | E01, E02, E03, E04, E08, I05 |
| I08 | [[I08] Dinamik plan önerisi araştırması yap](I08.md) | [#66](https://github.com/furkankorkmaz35/InternetForAgents/issues/66) | D03, B04, I05 |
| I09 | [[I09] Uzun dönem memory retrieval araştırması yap](I09.md) | [#67](https://github.com/furkankorkmaz35/InternetForAgents/issues/67) | D07, D08, D09, I05 |
| I10 | [[I10] Açık internet dağıtım kapısını hazırla](I10.md) | [#68](https://github.com/furkankorkmaz35/InternetForAgents/issues/68) | I06, I07, I08, I09 |
| B10 | [[B10] Genel capability doğrudan çağrı API’si uygula](B10.md) | [#42](https://github.com/furkankorkmaz35/InternetForAgents/issues/42) | B03, B04, B06, D04, E01 |
| F01-IMPL | [[F01-IMPL] Kod demo profillerinin makine şemalarını üret](F01-IMPL.md) | [#36](https://github.com/furkankorkmaz35/InternetForAgents/issues/36) | B04 |
