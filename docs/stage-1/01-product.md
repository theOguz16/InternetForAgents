# Ürün hedefi, kapsam ve kabul

## Problem ve katkı

Bağımsız agent’lar farklı arayüz ve beklentiler taşıdığı için özel bağlantı kodu gerektiriyor. Platform geliştiricinin sağladığı beceri tanımını doğrulayarak keşif, doğrudan çağrı ve kontrollü iş akışı birleşimini sağlar. Ürün başarısı yalnız LLM’in kod kalitesi değildir: entegrasyon çabası, sağlayıcı değiştirilebilirliği, hata izolasyonu ve gözlenebilir yürütme ayrı ölçülür.

Araştırma sorusu: Ortak iletişim ve geliştirici tarafından sağlanan beceri tanımları, bağımsız agent entegrasyon maliyetini azaltıp güvenilir birlikte çalışmayı sağlayabilir mi?

## Kullanıcılar

- Kullanıcı: beceri/akış seçer, görev verir, sonuç ve kaynaklarını inceler.
- Geliştirici: kendi agent’ını kendi ortamında çalıştırır; kart/manifest kaydeder; günceller ve askıya alır.
- Operatör: izinli ağ hedeflerini, kotaları, kayıt onayını ve olayları yönetir.
- Değerlendirici: sürümlü görev kümesiyle tekrarlanabilir deney çalıştırır.

Platform ilk sürümde geliştiricinin yüklediği keyfî agent kodunu host etmez. Agent kayıt etmek bir endpoint’i tanıtmaktır; geliştiricinin container’ını platformda otomatik çalıştırmak değildir. Test runner yalnız sınırlandırılmış kod/test artifact’lerini işler.

## Teslim seviyeleri

| Seviye | İçerik | Kapanış |
| --- | --- | --- |
| A: ekip platformu | Beş kişilik kontrollü ağ, bağımsız agent, genel kayıt, doğrudan çağrı, deklaratif workflow, kod demosu, sahiplik, kalıcılık ve ölçüm | Bu baseline’ın zorunlu teslimi |
| B: dinamik planlama | Serbest hedefi tanımlardan yorumlayan plan önerisi ve görülmemiş beceriler | Ayrı araştırma; A’nın ön koşulu değil |
| C: açık internet/ölçek | Güvenilmeyen herkese açık kayıt, güçlü çok kiracılı izolasyon, çoklu worker, abuse ve işletim | Ayrı ürün kapısı |

## Teslim A kapsamı

A2A 1.0 JSONRPC/HTTP + SSE; JSON beceri manifesti; geliştirici sahipliği; versiyonlu şemalar; desteklenen şema alt kümesinde doğrudan çağrı; adım bağımlılıkları ve alan eşlemesiyle workflow; görev/context/artifact yetkisi; kayıt/görev kalıcılığı; Python tek fonksiyon demosu; ayrı runner; web UI; test ve ölçüm raporu.

Bilinmeyen beceri kaydedilebilir. Şeması destekleniyorsa doğrudan çağrılır. Bir workflow’a katılması için anlam ve alan eşlemeleri ayrıca uyumlu olmalıdır. Veri tiplerinin eşleşmesi semantik eşdeğerliği kanıtlamaz.

Kapsam dışı: açık web tarayıp otomatik kontrat çıkarma, ödeme/rezervasyon/mail yan etkileri, sınırsız otonom düzeltme, paket kurma, kullanıcı repo klonlama, genel amaçlı güvenilmeyen kod hosting’i, zorunlu vektör DB, Kubernetes veya NANDA entegrasyonu.

## Nihai kabul kapıları

| ID | Zorunlu kanıt |
| --- | --- |
| AC01 | İki geliştirici ayrı agent projesinden bağlanır; platform çekirdeği değişmez |
| AC02 | Yeni namespace/beceri kaydı ve doğrudan çağrı; sabit metin/kod listesine ekleme gerekmez |
| AC03 | Aynı profilde ikinci sağlayıcı aynı workflow’da kod değişmeden kullanılır |
| AC04 | Kod → review/test → runner → rapor gerçek artifact’lerle tamamlanır; fixture başarı sayılmaz |
| AC05 | Yetki matrisi negatif testleri geçer; başka kullanıcının iş/context/artifact’i okunamaz |
| AC06 | SSRF, payload ve runner saldırı kümeleri geçer; kritik açık bırakılmaz |
| AC07 | Restart/reconnect/duplicate testlerinde veri korunur; belirsizlik başarıya dönüştürülmez |
| AC08 | Kısmi başarı korunur; süre/kota aşımı kontrollüdür; polling yoktur |
| AC09 | Ölçüm protokolü uygulanır; sonuçlar ve başarısız hedefler raporlanır |
| AC10 | Temiz makine kurulumu, backup/restore, CI ve operasyon rehberi doğrulanır |
| AC11 | Kullanıcı görev akışı ve geliştirici onboarding’i yardımsız tamamlanabilir |
| AC12 | Sürüm/commit, test raporu, bilinen sınırlar ve güncel belgeler birlikte teslim edilir |

Kalite benchmark’ında çoklu agent’ın tek agent’ı geçememesi altyapı bulgularını geçersiz kılmaz; kalite üstünlüğü iddiası yapılamaz. Zorunlu güvenlik/işlev kapısı geçmiyorsa teslim başarısızdır. Performans hedefi kaçırılırsa sonuç gizlenmez; düzeltme veya önceden gerekçeli kapsam değişimi gerekir.
