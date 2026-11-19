# Deklaratif workflow tanımı — ifa-workflow.v1 (D02)

Tasarım tabanı: [S1.0 mimari › Deklaratif workflow](../stage-1/03-architecture.md#deklaratif-workflow). Bu belge yalnız tanımı ve kaydetme öncesi denetimi anlatır. Yürütme, capability şemasıyla tip/sürüm uyumu ve manifest yan etki karşılaştırması D03'tedir.

## Biçim

Şema: [`schemas/ifa-workflow.v1.schema.json`](../../schemas/ifa-workflow.v1.schema.json) (`npm run export:contracts` ile `services/shared/workflow-contract.ts`'ten üretilir). Örnek: [`examples/workflows/code-review-tests.json`](../../examples/workflows/code-review-tests.json): generate → (review ‖ tests).

| Alan | Anlam |
| --- | --- |
| `steps[].id` | `^[a-z][a-z0-9-]{0,31}$`, workflow içinde benzersiz |
| `capability` | `namespace/name` + SemVer; çalışan plan bu sürümü pinler |
| `requires.sideEffects` | Adımın izin verdiği yan etki sınıfı; Teslim A'da yalnız `none` |
| `input` | Capability input alanı → kaynak. `{source:"input", pointer}` workflow girdisinden, `{source:"step", step, pointer}` önceki adım çıktısından |
| `outputs` | Aşağı akışa açılan çıktı pointer'ları; açılmayan alan başka adıma gitmez |
| `budget` | `timeoutMs` 1–60 sn, `maxOutputBytes` ≤ 128 KiB |
| `required` | `false` ise başarısızlığı işi `partial` yapar; zorunlu adım isteğe bağlı adıma bağlanamaz |

Alan eşlemeleri yalnız RFC 6901 JSON Pointer'dır (`""` tüm belge, `~0`/`~1` kaçışları, en fazla 8 segment ve 256 karakter). İfade, şablon, `eval`, `$ref` veya joker yoktur. `__proto__`, `constructor`, `prototype` segmentleri reddedilir.

## Denetim sırası

`parseWorkflow(value)` (`services/personal/application/workflow-definition.ts`):

1. Boyut ≤ 64 KiB → `workflow_too_large`.
2. Şema → `invalid_workflow` (+ `path`). Yapı bozuksa anlamsal denetime geçilmez.
3. Anlam (`services/personal/domain/workflow.ts`, saf): `duplicate_step`, `unknown_step`, `self_reference`, `cycle` (bağımlılık yolu `a -> b -> a`), `missing_step_ref`, `unexpected_step_ref`, `invalid_pointer`, `unsafe_pointer`, `unknown_source_field` (kaynak adımın açmadığı alan), `required_depends_on_optional`.

Başarıda topolojik sıra döner; aynı seviyedeki adımlar tanım sırasını korur. Bu sıra D03 executor'ının girdisidir.

## Kapsam dışı

Tip uyumu semantik uyum kanıtı değildir ve bu aşamada denetlenmez (D03). Sabit değer eşlemesi, çıktı birleştirme (D10), runner adımı (E07) ve HTTP uç noktası (B10/D03) yoktur. Mevcut metin işi akışı değişmedi; workflow henüz çalıştırılmıyor.
