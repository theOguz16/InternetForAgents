> **Tarihsel tasarım referansı — 15 Ekim 2026:** Güncel hedef ve limitler [S1.0](../stage-1/README.md) içindedir. Bu belgedeki eski demo/endpoint/limit kararları S1.0 ile çeliştiğinde uygulanmaz. Mevcut kod için [geliştirme rehberi](../development/local.md).

# Kayıt, keşif ve erişilebilirlik

## Kayıt yaşam döngüsü

pending → active / rejected. active → suspended / removed. Süre aşımı stale olarak ayrıca değerlendirilir. removed terminaldir. Kart validasyonu ile servis erişilebilirliği ayrı tutulur.

Geliştirici cardUrl ve profileBindings gönderir. Registry sahipliği doğrular, izinli adresten kartı alır, A2A 1.0 JSONRPC interface ve application/json becerilerini kontrol eder. Kart snapshot/digest ve endpoint kayda bağlanır. URL veya security gereksinimi değişirse yeni revision doğrulanmadan görünür olmaz. Kayıt kartta kendiliğinden değişmiş gizli endpoint'e yönlendirilmez.

## Kayıt ve profil eşleştirmesi

agentId Registry kimliğidir. card.name benzersiz kimlik değildir; uygulama version'ı protokol version'ı değildir. profileBindings yalnızca tanımlı profillere izin verir, keyfi açıklamadan profile tahmin edilmez. Agent Card endpoint'inde görev çalıştırılarak doğrulama yapılmaz.

## Sağlık

Örnek servisler yerel `/health/ready` endpoint'i sunar. Bu bizim işletim endpoint'imizdir, standart A2A health metodu değildir. Probe URL owner tarafından gönderilir ancak kart origin'i ve izinli portla sınırlanır. Periyodik probe veya kart indirme döngüsü yoktur. Kayıtta ve gerçek seçim ihtiyacında, son gözlem 15 saniyeden eskiyse bir kez 1 saniye bütçeyle probe yapılır; aynı agent için eşzamanlı probe istekleri birleştirilir. Başarı healthy, hata unavailable olur. Kart 5 dakika cache edilir; süresi dolunca yalnız kayıt güncellemesi veya gerçek keşif isteği sırasında yeniden edinilir. Sağlık kontrolü gerçek analizin doğru çalıştığını kanıtlamaz.

## Arama

GET agents?profile=code-review.v1: active, nonstale, matching profile kayıtları. Personal Agent sağlıklı, destekli protokol/interface ve erişebildiği credential sahibi adayları seçer. Kullanıcıya uygun alternatifler ve elenme nedenleri, yetkisi dahilinde gösterilir. Varsayılan seçim agentId artan sıra; kalite sıralaması iddiası yoktur.

Çağrıdan hemen önce GET kayıt revision/digest tekrar kontrolü yapılır. Değiştiyse bir kere yeniden keşif; hâlâ oynuyorsa DISCOVERY_CHANGED. Sağlık gözlemiyle çağrı arasında yarış olabileceği hata modelinde korunur.

## Kesinti

Registry yoksa yeni seçim 503; saklı adrese sessiz yeni görev yok. Uzak task id'si bilinen işler aynı uzmanı doğrudan SSE aboneliğiyle izlemeye devam eder. Silinen kayıt ağdaki uzmanın credential'ını iptal etmez; iptal uzman tarafında ayrıca yapılır.

## Kapalı ağ etkisi

Yeni provider için işletim allowlist/config değişebilir; demo raporunda belirtilir. Dinamiklik iddiası kaynak kodu değişmemesidir, sıfır operasyonel kayıt değildir.
