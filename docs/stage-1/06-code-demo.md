# Kod üretme / review / test demo profilleri

Durum: F01 tasarımı; F01-IMPL şema/semantik paketi uygulanmıştır. Agent implementasyonları ekip üyelerinin teslimidir. Profile ID’leri platform registry kabul listesi değildir; örnek ortak semantik anlaşmalarıdır. Her profil `ifa-call.v1` / `ifa-result.v1` envelope’unu kullanır.

## Ortak FunctionSpec

| Alan | Tip / sınır | Anlam |
| --- | --- | --- |
| language | const python | Runner dili |
| functionName | string 1–64 | Geçerli ASCII Python identifier; keyword/dunder reddedilir |
| parameters | array 0–8 | name ve type; isimler benzersiz |
| returnType | enum | Desteklenen türlerden biri |
| requirements | array 1–10, her öğe 1–500 karakter | Beklenen davranış; hata/boş girdi şartları dahil |

Türler: int, bool, str, list[int], list[str]. Float, union, arbitrary object ve dış paket yoktur. Parametreler positional-or-keyword; default, varargs, async ve decorator yoktur. Requirement’lar data’dır; sistem prompt’una yükseltilmez. Uygulama fonksiyon adı için schema dışında semantic validator kullanır (genel manifest v1 regex desteklemez).

Code artifact: UTF-8 Python metni, en fazla 32 KiB. AST kontrolünde tam bir top-level hedef fonksiyon gerekir; import, sınıf, dekoratör ve top-level yürütme yoktur. Fonksiyon içindeki code da sandbox’ta çalışır; AST filtresi güvenlik sınırı yerine geçmez. Test dosyası en fazla 32 KiB, toplam 1–20 test case; unittest kullanır, yalnız unittest ve submission import eder. Runner target’ı submission.py olarak sağlar; geliştirici path seçemez.

## Profil 1: ifa-demo/code-generation@1.0.0

Input: `{spec: FunctionSpec}`. Output: `{code: string, explanation: string}`; explanation 1–2000 karakter. İstenen fonksiyon imzası ve artifact AST’si eşleşmeli. Başarılı generation yalnız kod üretildi demektir; doğruluk iddiası değildir.

## Profil 2: ifa-demo/code-review@1.0.0

Input: `{spec, code}`. Output:

- `verdict`: no_findings / changes_requested. no_findings doğru olduğu kanıtlandı anlamına gelmez.
- `findings`: 0–20 öğe; her öğe id (1–64), severity (info/warning/error), message (1–1000), suggestion (1–1000), isteğe bağlı line (1–10000).
- `summary`: 1–2000 karakter.

changes_requested en az bir bulgu gerektirir. Satır konumu verilen kodla doğrulanır. Review agent kodu veya kullanıcının gereksinimini sessizce değiştiremez.

## Profil 3: ifa-demo/test-generation@1.0.0

Input: `{spec, code}`. Output: `{framework: "unittest", tests: string, scenarios: string[]}`. scenarios 1–20 öğe, her biri 1–300 karakter. Tek test artifact’i, UTF-8, 32 KiB. Dosya indirme veya paket kurulumu yoktur. Çalıştırma sonucu output’ta yoktur; agent çalıştırmadığı testler için passed alanı üretemez.

## Runner raporu (agent sonucu değildir)

Execution ID, input code/test hash’leri, sandbox image/version, status (passed/failed/timeout/resource_limit/invalid_input/infrastructure_error), test counts, exit code (varsa), durationMs, stdout/stderr ve truncation bayrakları. Passed ancak gerçek çalıştırma başarıyla bittiğinde ve en az bir test yürütüldüğünde verilir. Test discovery sıfırsa invalid_input. Python unittest process exit=0 tek başına rapor için yeterli değildir. Kullanıcıya gösterilen agent test raporu ile gizli benchmark oracle raporu ayrı tutulur.

## Örnek gereksinim

```json
{
  "language": "python",
  "functionName": "sum_even",
  "parameters": [{"name": "numbers", "type": "list[int]"}],
  "returnType": "int",
  "requirements": [
    "Listedeki çift sayıların toplamını döndür.",
    "Boş liste için 0 döndür.",
    "Negatif çift sayıları da toplama dahil et."
  ]
}
```

## Workflow ve bütçe

1. FunctionSpec kullanıcı tarafından onaylanır; v1’de serbest metinden sessiz imza tahmini yapılmaz.
2. Generation çağrılır; schema, boyut ve imza kontrol edilir.
3. Aynı kod/spec hash’i review ve test generation’a aktarılır.
4. Test generation geçerse runner çağrılır. Review başarısız olsa da runner üretilebilir; genel job partial olur.
5. Rapor kod, review, test üretimi ve gerçek execution durumlarını ayrı gösterir.

Generation olmadan downstream çalışmaz. Test üretimi olmadan runner çalışmaz. Runner veya review başarısızlığı diğer artifact’leri silmez. S1.0’da otomatik repair döngüsü yoktur. Kullanıcı yeni sürümle yeni job başlatabilir.

Her model adımı en fazla 90 saniye; demo workflow toplam bütçesi 300 saniye; runner 5 saniye. Ortak model server concurrency=1; review/test mantıksal bağımsız olsa da model istekleri kaynak kuyruğunda sıraya girer. Kuyruk beklemesi toplam bütçeye dahildir. Bunlar mevcut metin demosunun 60 saniyelik kod ayarını değiştirmez.

## Kabul örnekleri

sum_even; string ters çevirme; maksimum değer (boş davranışı açık); benzersiz liste elemanları (sıra korunur); palindrome (case politikasını spec belirtir). Belirsiz gereksinim reddedilir veya kullanıcıdan açıklık istenir. Üretilen testlerin kendisi oracle değildir: bağımsız gizli test seti [deney planında](08-evaluation.md) tanımlanır.

## F01-IMPL uygulama kanıtı

[Ortak paket, şema/semantik kuralları, sürümleme ve kabul kanıtları](../development/code-demo-contracts.md).
`@ifa/code-demo-contracts@1.0.0` üç profilin input/output şemalarını ve FunctionSpec
doğrulayıcısını sağlar. Parametre adları da 1–64 karakterdir; no_findings sıfır
bulgu gerektirir ([ADR-026](../decisions/0026-code-demo-contracts.md)).
Gerçek Python imzası/AST ve unittest case sayısı E07 runner kontrolüdür.
Paket, agent veya runner’ın tamamlandığı ya da kullanıcı erişim izolasyonunun
uygulandığı anlamına gelmez.
