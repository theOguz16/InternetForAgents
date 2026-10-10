# ADR-001: Agent ve uygulama alanından bağımsız SOA çekirdeği

- Tarih: 2026-10-10
- Durum: Kabul edildi

## Bağlam

Seyahat ve üretim örnekleri servis keşfini gösterebilir, ancak uygulama alanının kurallarını çekirdeğe taşımak altyapıyı tek senaryoya bağlar. Projenin araştırma konusu, yeni sağlayıcıları çalışma anında keşfetmek ve desteklenen kontratlarla kullanmaktır.

## Karar

Çekirdek Node.js ve Express kullanılarak servis odaklı mimariyle tasarlanacaktır. Çekirdek belirli bir agent uygulamasına, model sağlayıcısına veya iş alanına bağımlı olmayacaktır.

Kullanıcı hedefini yorumlama, hedefi yeteneklere ayırma, iş planı oluşturma ve kullanıcıyla etkileşim agent tarafındadır. Çekirdek servis keşfi, kontrat doğrulama, uygun sağlayıcı alternatifleri ve yetki kapsamındaki çağrılardan sorumludur.

İlk kontratlar elle hazırlanacaktır. İlk deneyde yeni sağlayıcının agent kodunda değişiklik yapılmadan kullanılabilmesi, önceden desteklenen kontrat, yetenek anlamı ve çağrı protokolü sınırları içinde değerlendirilecektir.

## Sonuçlar

- Örnek agent ve sağlayıcılar, çekirdeğin tüketicileri ve doğrulama araçlarıdır.
- Çekirdekte üretim, seyahat veya başka bir demo alanına özgü karar kuralları bulunmaz.
- Express HTTP sınırını sağlar; alan ve uygulama sorumluluklarının iç düzeni sonraki tasarım kararına bırakılır.
- SOA seçimi bağımsız deployment veya mikroservis zorunluluğu doğurmaz.
- Yeni sağlayıcı ekleme ile yeni protokol veya yeni yetenek semantiği ekleme ayrı değişiklik türleridir.
- Kontrat yayımlamak güven veya kullanıcı yetkisi sağlamaz.

## Bu kararla kesinleşmeyen konular

Servislerin fiziksel dağıtımı, JavaScript/TypeScript seçimi, veri deposu, keşif başlangıç noktası, yetenek sözlüğü, kontrat şeması, ilk protokol, agent erişim arayüzü ve çok adımlı yürütme desteğinin kapsamı.

## Yeniden değerlendirme koşulu

Somut kullanım senaryoları çekirdeğin agent'tan bağımsız sınırlarla karşılanamadığını gösterirse sınırlar yeni bir ADR ile değerlendirilir. Bir demo için kolaylık sağlaması tek başına çekirdeğe alan bağımlılığı ekleme gerekçesi değildir.

## Sonraki kararlarla tamamlanan konular

Bu kaydın yazıldığı sırada açık olan MVP ayrıntıları [ADR dizinindeki](README.md) sonraki kararlarla tamamlanmıştır. Güncel davranış için ilgili mimari belgeleri esas alınır; tarihsel açık konu listesi yeni bir engel anlamına gelmez.
