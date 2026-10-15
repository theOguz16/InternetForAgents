# Uygulamaya özel beceri profilleri

A2A mesaj taşıma ve görev modelini sağlar. Kod inceleme sonucundaki alanların anlamını bizim profile tanımımız belirler. Kartta aynı tag'in bulunması veri uyumu kanıtı değildir.

## Profile registry

MVP'de iki profile var: `code-review.v1`, `test-suggestions.v1`. İkisi de language=python, UTF-8 source ≤32 KiB ve requestId içerir. Profile bilgisi Data Part içinde taşınır. Registry kaydındaki binding `profileId → cardSkillId` eşleştirmesidir. Kayıt sırasında skillId kartta bulunmalı, input/output application/json desteklemeli, geliştirici uyum beyanını vermelidir. Gerçek davranış uyumu contract testleriyle ayrıca doğrulanır.

## Ortak input

| Alan | Kural |
| --- | --- |
| profile | Yukarıdaki iki tam sürümlü kimlikten biri |
| requestId | Personal Agent child kimliği; aynı payload tekrarında sabit |
| language | python |
| source | Boş olmayan UTF-8 metin, 32 KiB sınırı |

Bilinmeyen alanlar reddedilir. Dosya yolu veya URL indirme yoktur. Tek message içinde tam bir Data Part beklenir. Text açıklaması eklenirse yürütme parametresi sayılmaz; input için Data Part tek kaynaktır.

## Code review output

profile, requestId, engineMode (`rules` veya `llm`), summary, findings, limitations. findings dizisindeki her öğe: ruleId, severity (`info`,`warning`,`error`), message, isteğe bağlı line ve suggestion. line 1 tabanlı ve kaynak satır sayısı içinde olmalı. Bulgusuz sonuç kodun hatasız olduğu garantisi değildir.

## Test suggestions output

profile, requestId, engineMode, summary, scenarios, limitations. Her scenario: title, purpose, inputDescription, expectedBehavior; isteğe bağlı suggestedCode. Üretilmiş test metni otomatik yürütülmez. Sonuç başarısı testlerin geçtiği anlamına gelmez.

## Artifact kuralı

Her başarılı task bir adet temel application/json Data Part içeren sonuç artifact'ı döndürür. Personal Agent profil ve requestId eşleşmesini ve schema'yı doğrular. completed ama eksik/bozuk artifact, yerel INVALID_RESULT hatasıdır; A2A task state geriye dönük failed yapılmaz.

## Sürüm ve sınırlar

Payload şemaları kod aşamasında JSON Schema 2020-12 ile tanımlanır. Profile id tam eşleşir; version range yoktur. Yeni sağlayıcı mevcut profile uyarsa kod değişmez. Yeni profile, UI seçimi ve planlayıcı eşlemesi gerektirebilir. Bunun dinamik sağlayıcı keşfiyle karıştırılması yasaktır.

Örnek output alanları ve enum'lar proje kararlarıdır; resmi A2A alanları değildir. Aynı davranış Python agent ile uygulanabilir; ilk sürümde zorunlu değildir.
