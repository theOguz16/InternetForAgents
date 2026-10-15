# [F01-IMPL] Kod demo profillerinin makine şemalarını üret

## Amaç ve başlangıç

Bağımlılıklar: B04. `docs/stage-1/05-capability-contract.md`, `docs/stage-1/06-code-demo.md` ve `docs/team/working-agreement.md` okuyun. Mevcut dosyalar: `services/capabilities/manifest.ts`, `services/personal/router.ts`, `services/shared/a2a.ts`, `contracts/`. Uygulayıcı atanmadı; son review Oguzhan’da.

## Adımlar

docs/stage-1/06-code-demo.md alanlarını input/output JSON Schema olarak çıkar; FunctionSpec semantic validator (identifier, duplicate parameter, verdict/finding) ekle; geçerli ve bozuk örnekleri yaz. Runner AST kontrolünün ayrı E07 sorumluluğu olduğunu belgeleyin.

1. Mevcut ve hedef DTO farkını kısa bir planla issue’ya yazın.
2. İş mantığını router’dan ayrı tutun; veri ve ağ sınırlarını koruyun.
3. Negatif senaryoları implementation’la birlikte ekleyin.
4. Belgeler, örnekler ve sürüm etkisini güncelleyin.

## Kabul kriterleri

- [ ] Üç profil örnekleri schema geçer.
- [ ] eksik alan, bozuk signature ve tutarsız verdict reddedilir.
- [ ] agent geliştiricileri aynı paket/sürümü import edebilir.

## Test ve review

Node 24: `npm ci`, `npm run build`, `npm run test:services`. Her kabul maddesi için geçerli/geçersiz fixture veya HTTP entegrasyon testi yazın; gerçek veri/secret kullanmayın. Başka kullanıcıya erişim ve farklı sürüm reddi doğrudan çağrıda zorunludur. Türkçe yorumlarla karmaşık kararların nedenini anlatın.

Base `develop`, küçük PR, issue bağlantısı ve test kanıtı. Oguzhan onayı olmadan merge yapmayın. Scope dışı: dinamik LLM planner, genel kod hosting’i ve hazır olmayan auth’u uygulanmış gibi gösterme.

## AI destekli teslim raporu

- [ ] [Ortak değerlendirme promptunu](../ai-delivery-review.md) task tamamlanınca çalıştır; raporu PR açıklamasına ekle. İncelenen commit SHA ve hedef dal `develop` olmalı. Kod değişirse raporu güncelle; çalıştırılmayan kontrolleri açıkça belirt. Rapor bağımsız onay değildir.
