# Keşif ve sağlayıcı seçimi

Durum: MVP kararı. ADR-005.

## Girdi

capabilityId, capabilityVersion, constraints ve preferences. constraints yalnızca katalogdaki tipli discoveryAttributes ve standart `pricingMode`, `currency`, `maxInvocationPrice` alanlarıdır. Desteklenmeyen filtre 422 üretir; sessizce yok sayılmaz. Para dönüşümü yoktur; farklı para birimleri karşılaştırılmaz.

## Kesin eleme

Kayıt aktif, güncel, principal için görünür; kontrat ve yetenek sürümü destekli; çağrı protokolü destekli ve effect=read olmalıdır. Gerekli sağlayıcı credential'ı mevcut değilse aday çağrılabilir listeden çıkarılır; principal'ın görmeye yetkili olduğu kayıtlarda gerekçe verilir. Gizli kaydın varlığı açıklanmaz.

Hard constraint için gerekli veri bilinmiyorsa aday uygun kabul edilmez. Daha az kesin tercihler için eksik veri ayrı belirtilir. Sağlayıcı açıklamasından veri uydurulmaz.

## Sıralama

Ağırlıklı ve açıklanması güç tek bir trust puanı yoktur. İstemci izinli tercihleri sıralı verir: çağrı ücreti ve gözlenen gecikme. Default stabil providerId/serviceId sırasıdır; kalite üstünlüğü ifade etmez.

Ücret tercihi ancak aynı para birimindeki bilinen bedeller arasında karşılaştırılır; unknown en sona gider. Canlı teklif tutarı burada kullanılmaz. Gecikme için son 24 saatte en az 20 başarılı çağrının p95 değeri kullanılır; örnek sayısı da döndürülür. Yetersiz veri bilinmeyen olarak en sona gider. Eşitlikler providerId/serviceId ile çözülür. Bu ölçümler demo hedefidir, güven sertifikası değildir.

## Sonuç

Her alternatif providerId, serviceId, contractVersion, contractDigest, capability referansı, attributes, pricing, evidence, rankingReasons, evaluatedAt ve validUntil içerir. validUntil kontrat güncellik sınırıdır; rezervasyon veya çağrı garantisi değildir. Listeleme limit en fazla 50, cursor tabanlıdır; canlı değişen kayıtlar için snapshot garantisi verilmez.

Aday yoksa 200 ve boş liste; Registry kullanılamıyorsa 503. Bilinmeyen capability/version 422. Kaydı görmeye yetkili principal için elenme gerekçeleri özetlenebilir.

## Seçim sonrası

Agent alternatifi seçer; çağrıda kontrat sürümü ve digest'i gönderir. Çekirdek bunları güncel durumla tekrar karşılaştırır. Sessiz sağlayıcı değişimi yoktur; sözleşme değişmişse 409 ve yeniden keşif gerekir.
