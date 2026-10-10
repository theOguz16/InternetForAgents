# ADR-002: Dizin üzerinden servis keşfi

- Tarih: 2026-10-10
- Durum: Kabul edildi

## Bağlam

Agent'ın tanımadığı sağlayıcılara ulaşabilmesi için bilinen bir keşif başlangıcına ihtiyacı vardır. İlk sürümün amacı kontrollü ortamda dinamik keşif ve çağrıyı göstermek olduğundan sınırsız web taraması bu deney için gerekli değildir.

## Karar

İlk keşif kaynağı, sağlayıcıların yayımladıkları servis kontratlarının adreslerini kaydettirdiği bir dizin olacaktır. Agent çekirdeğe yetenek isteği gönderir; çekirdek bu dizini kullanarak adayları ve kontratlarını bulur.

Sağlayıcının keşfedilebilir olması kayıt işlemi gerektirir. Dinamik keşif iddiası, sağlayıcının hiçbir şekilde kaydedilmemesi anlamına gelmez; agent'a sağlayıcıya özel entegrasyon kodu eklenmeden bulunup kullanılmasını ifade eder.

## Mantıksal akış

1. Sağlayıcı, desteklenen ortak biçimde kontratını yayımlar.
2. Kontrat adresini dizine kaydettirir.
3. Çekirdek kontratı edinir ve doğrulama sonucunu kayıtla ilişkilendirir.
4. Agent bir yetenek istediğinde Discovery dizindeki uygun adayları bulur.
5. Broker, uygun alternatifleri gerekçeleriyle sunar.
6. Agent seçimini yaptıktan sonra çağrı, ayrı yetki ve girdi kontrollerinden geçer.

Bu akışın kayıt onayı, güncellik ve hata ayrıntıları sonraki tasarımda netleştirilecektir.

## Sorumluluk sınırları

- Dizin, Registry'nin sağlayıcı kayıtlarının keşfe açıldığı mantıksal yüzüdür; ayrı bir deployment kararı değildir.
- Registry kayıtların durumunu, kontrat referanslarını ve yaşam döngüsünü sahiplenir.
- Discovery adayları bulma ve kontrat edinme akışını yönetir.
- Agent sağlayıcı adreslerini kendi kodunda tutmak zorunda değildir.
- Kontrat veya dizin kaydı, sağlayıcının güvenilirliğini ya da bir işlem için kullanıcı yetkisini tek başına kanıtlamaz.

## Sonuçlar ve sınırlar

Kontrollü bir başlangıçla yeni sağlayıcı ekleme deneyi tekrar edilebilir hâle gelir. İlk sürüm yalnızca bu dizinin kapsadığı sağlayıcıları keşfeder; açık web genelinde keşif iddiasında bulunmaz. Dizin erişilebilirliği keşfi etkileyen bir bağımlılıktır; kesinti ve önbellek davranışı ayrıca kararlaştırılacaktır.

İleride başka keşif kaynakları eklenebilmesi mimari hedef olarak korunur. Federasyon, tarayıcı tabanlı keşif veya otomatik web taraması bu kararla uygulanmış sayılmaz.

## Açık tasarım konuları

- Kayıt yetkisi ve sağlayıcı kimliğinin doğrulanması.
- Yetenek tanımları, sorgulama ve indeksleme.
- Kontrat sürümü, güncellik, yenileme ve kayıt kaldırma.
- Geçersiz veya ulaşılamayan kontratların durumu.
- Kontrat ediniminde izin verilen ağ hedefleri ve kaynak sınırları.
- Kalıcı veri deposu, önbellek ve dizin kesintisi davranışı.

## Yeniden değerlendirme koşulu

Birden fazla bağımsız dizin veya kayıt yapılmadan sağlayıcı bulma ihtiyacı somutlaştığında keşif kaynakları yeni bir kararla genişletilir.

## Sonraki kararlarla tamamlanan konular

Bu kaydın yazıldığı sırada açık olan MVP ayrıntıları [ADR dizinindeki](README.md) sonraki kararlarla tamamlanmıştır. Güncel davranış için ilgili mimari belgeleri esas alınır; tarihsel açık konu listesi yeni bir engel anlamına gelmez.
