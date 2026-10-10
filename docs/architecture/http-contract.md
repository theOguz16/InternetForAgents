# HTTP/JSON sağlayıcı kontratı

Durum: MVP kararı. ADR-004.

## Zorunlu alanlar

| Alan | İçerik |
| --- | --- |
| contractFormatVersion | `1.0.0`; tam eşleşme |
| providerId, serviceId, contractVersion | Registry sahibi ve değişmez sürüm kimliği |
| capability | Katalog id ve tam sürüm |
| binding | protocol=`http-json-v1`, method=`POST`, endpoint |
| auth | mode=`none` veya `bearer`; secret içermez |
| attributes | Katalogda tanımlı discoveryAttributes değerleri |
| pricing | `free`, `fixed` veya `unknown`; fixed için amount/currency zorunlu |

effect katalogdan gelir. Sağlayıcı farklı etki bildiremez. Bilinmeyen kontrat alanları reddedilir. Binding endpoint'i sabit bir adrestir; payload içinden URL, method veya header şablonu üretilmez. Sağlayıcı başka API biçimi kullanıyorsa kendi uyum katmanını sağlar.

## Çağrı standardı

POST gövdesi doğrudan yeteneğin inputSchema'sına uyan JSON nesnesidir. Başarı `200 application/json` ve doğrudan outputSchema nesnesidir. `202`, streaming ve multipart desteklenmez. Yanıt Content-Type ve boyutu doğrulanır. Başarılı iş sonucunda boş sonuç gerekiyorsa katalog bunu açıkça şemada tanımlar.

Hatalarda application/problem+json tercih edilir. Uygun olmayan upstream hata gövdesi sızdırılmaz; çekirdek standart hata koduna dönüştürür. İstemcinin Authorization header'ı upstream'e kopyalanmaz. Konfigürasyondaki sağlayıcı secret referansı yalnızca seçilen sağlayıcıya bağlanır.

## Taşıma ve sınırlar

Üretim benzeri dağıtımda HTTPS zorunludur. Yerel fixture servisleri için açık host/port allowlist'iyle HTTP kullanılabilir. Redirect takip edilmez. JSON istek ve cevap sınırı ayrı ayrı 1 MiB; kontrat 256 KiB. Upstream çağrı bütçesi en fazla 10 saniye, çekirdek toplamı 15 saniye. Sağlayıcı ve istemci bu üst sınırları büyütemez.

## Şablon

[Sağlayıcı kontratı şablonu](../templates/provider-contract.md) ve [yetenek şablonu](../templates/capability.md) tasarım incelemesinde doldurulur. Makine şemaları ve OpenAPI dosyası kod aşamasında bu belgelere göre üretilecek; bu aşamada executable şema uygulanmamıştır.
