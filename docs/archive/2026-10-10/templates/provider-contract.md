# Sağlayıcı kontratı tasarım şablonu

Bu Markdown inceleme şablonudur; uygulanmış JSON şeması değildir.

| Alan | Doldurulacak bilgi |
| --- | --- |
| contractFormatVersion | 1.0.0 |
| providerId / serviceId | Operatör/Registry kimlikleri |
| contractVersion | Yeni değişmez sürüm |
| capability.id / version | Katalog referansı ve tam sürüm |
| binding.protocol | http-json-v1 |
| binding.method | POST |
| binding.endpoint | Sabit izinli URL |
| auth.mode | none veya bearer; secret yazılmaz |
| attributes | Yalnızca katalogdaki tipli alanlar |
| pricing | free / fixed / unknown; fixed ise amount ve currency |

## Operasyonel kayıt (kontrat payload'u dışında)

Contract URL: <adres>
Owner principal: <sahip>
Credential reference: <gerekiyorsa yalnızca dahili referans>
Ağ allowlist incelemesi: <sonuç>

## Uyum kontrolü

<Ortak input/output, read etkisi, doğru sürüm, yanıt sınırları>
