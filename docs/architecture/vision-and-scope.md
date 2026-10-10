# Vizyon, kapsam ve araştırma deneyi

## Ürün tanımı

Internet for Agents, farklı agent uygulamalarına ortak kontratlara dayalı servis keşfi, karşılaştırma ve yetkili çağrı sağlar. Kullanıcı hedefini çözümleyen genel amaçlı agent değildir. Katkısı, desteklenen yetenek ve protokole uyan yeni sağlayıcı için istemciye özel entegrasyon gerektirmemesidir.

## MVP sınırı

Tek operatörün yönettiği kontrollü dizin, küçük sürümlü yetenek kataloğu, bir HTTP/JSON adapter'ı ve dışarıda çalışan örnek sağlayıcılar. Agent tarafında hafif örnek istemci bulunur; gerçek bir LLM ürününe bağımlılık yoktur. Çekirdek hedef parçalama veya doğal dil anlama yapmaz.

MVP çağrıları salt okunur/simüle teklif sorgularıdır. Gerçek sipariş, ödeme, randevu veya mail gönderimi kapalıdır. Kontratın yan etki alanı saklanır; desteklenmeyen etki tipi kayıt aktivasyonunda ve çağrıda reddedilir. Gerçek yan etkiler yeni ADR ve kabul senaryoları gerektirir.

Dosya yükleme, URL'den kullanıcı dosyası indirme, streaming, webhook, uzun süren asenkron işler, keyfî API dönüşümü, açık web taraması, federasyon, MCP/A2A/WebMCP ve vektör arama MVP dışında.

## Alan bağımsızlığını kanıtlayan demo

Sentetik paket bilgileriyle teslimat teklifi sağlayan A ve B servisleri kullanılır. İstemci standart yetenek isteği gönderir, iki sağlayıcıyı keşfeder ve tekliflerini çağırır. Örnek agent sonuçları kullanıcıya alternatifler olarak sunar. C sağlayıcısı daha sonra kaydedilir; istemci veya çekirdek kodu değişmeden yeni keşifte görünür. B'nin bozuk yanıtı ayrı hata olarak görünür; A'nın sonucu kaybolmaz.

Bu bir kargo ürünü kararı değildir. Örnek veri ve seçim sunumu demo tarafındadır. Çekirdek kargo, üretim veya seyahat alanlarını bilmez. Birden fazla yeteneğin iş planında birleştirilmesi sonraki demo genişletmesidir; çekirdek içinde orkestrasyon motoru kurulmaz.

## Araştırma iddiasının sınırı

Ortak yetenek anlamı ve protokol önceden tanımlıdır. Yeni sağlayıcı kaydı veri/config değişikliğidir ve yasak değildir. Yeni protokol için kod, yeni yetenek için katalog tanımı gerekebilir. Bu deney bilinmeyen bir sitenin anlamsal olarak otomatik anlaşıldığını kanıtlamaz.

## Başarı

Yeni sağlayıcı ekleme sırasında istemci ve çekirdek kaynaklarının değişmediği gösterilir. En az iki farklı istemci aynı çekirdek arayüzünü kullanır: örnek agent ve doğrudan API istemcisi. Alternatifler, eksik bilgi ve hata nedenleri görünürdür. Kabul kanıtları ayrıca kayıt altına alınır.
