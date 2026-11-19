# H06 — Bağımsız Kod Oracle Benchmark Kümesi

Bu belge, S1.0 ölçüm protokolündeki **Q1** kod kalitesi değerlendirmesi için hazırlanan bağımsız Python fonksiyon benchmark kümesini, gizli oracle ayrımını, mutation doğrulamasını ve SHA-256 bütünlük mekanizmasını özetler.

- İlgili protokoller: [EVAL-1 ölçüm protokolü](../stage-1/08-evaluation.md), [EVAL-M1 model manifesti](EVAL-M1.json), [Kod demo profilleri](../stage-1/06-code-demo.md), [Tehdit modeli](../stage-1/04-security.md).
- İlgili S1.0 kabul ve tehdit eşlemesi:
  - **AC04 / TH07 (Sahte başarı/artifact):** Agent'ın kendi ürettiği testler doğruluk oracle'ı sayılmaz; gizli oracle testleri ayrı dizindedir ve kontrat `test-generation` çıktısında `passed` alanını reddeder.
  - **AC09 (Ölçüm protokolü):** Görev, referans, oracle test ve mutation dosyaları deney öncesinde SHA-256 manifestiyle sabitlenir.
  - **EVAL-1 Q1 / EVAL-M1:** 30 değerlendirme (10 sayı/liste, 10 metin, 10 sınır durumu) + 10 ayrı geliştirme görevi ve en az 20 elle doğrulanmış hatalı varyant (eşdeğer mutation hariç) hazırlanır.

## Dizin yerleşimi ve fiziksel ayrım

Benchmark verileri `benchmarks/code-oracle/` altında iki ayrı kök alt ağaçta tutulur:

- `benchmarks/code-oracle/agent-inputs/`: Yalnızca agent'lara girdi olarak verilebilen açık problem tanımları.
  - `dev/index.json` ve `dev/specs/dev-01.json` .. `dev-10.json` (10 geliştirme görevi: 4 `numbers_lists`, 3 `strings`, 3 `edge_cases`).
  - `eval/index.json` ve `eval/specs/eval-*.json` (30 değerlendirme görevi: 10 `numbers_lists`, 10 `strings`, 10 `edge_cases`).
  - Her `specs/*.json` dosyası ek sarmalayıcı alan olmadan doğrudan `@ifa/code-demo-contracts` içindeki `FunctionSpec` şemasına uyar.
  - Bu alt ağaçta `oracle`, `references`, `mutations`, `unittest` veya test assertion ifadelerine hiçbir referans bulunmaz.
- `benchmarks/code-oracle/oracle/`: Yalnızca runner/değerlendirici tarafında okunan gizli küme; agent'a verilmez.
  - `index.json`: Problem ID'sini ilgili `specPath`, `referencePath` ve `oracleTestPath` yollarına bağlar.
  - `{dev,eval}/references/*.py`: 40 referans Python çözümü (tek top-level `def`, `import`/`class`/dekoratör/`async` yok, `<= 32 KiB`).
  - `{dev,eval}/tests/test_*.py`: 40 gizli `unittest` dosyası (yalnız `import unittest` ve `from submission import <fn>`, 1–20 test metodu, `<= 32 KiB`).
  - `mutations/catalog.json` ve `mutations/variants/mut-01.py` .. `mut-24.py`: Değerlendirme kümesinden her kategoride 8'er adet olmak üzere **24 aktif mutation** ve **3 dışlanmış eşdeğer mutation** kaydı.

## Eşdeğer mutation dışlama kayıtları

Hiçbir geçerli girdide referans çözümden farklı davranış üretmeyen eşdeğer mutation adayları aktif kümeye alınmaz ve nedeni `oracle/mutations/catalog.json` içindeki `excluded` dizisinde tutulur:

| ID | Hedef Problem | Operatör | Dışlama Gerekçesi |
| --- | --- | --- | --- |
| `eq-mut-01` | `eval-nl-01` (`count_strict_peaks`) | `explicit_default_step` | `range(1, len(values) - 1, 1)` varsayılan adım `1` ile özdeştir; tüm geçerli girdilerde aynı sonucu üretir. |
| `eq-mut-02` | `eval-str-03` (`longest_common_prefix_list`) | `remove_early_return_on_empty_prefix` | Boş ön ekte erken dönüş kaldırılsa da kalan karşılaştırmalarda sonuç değişmez; yalnız çalışma süresi etkilenir. |
| `eq-mut-03` | `eval-edge-06` (`majority_element_strict`) | `equivalent_arithmetic_threshold` | Negatif olmayan tam sayılarda `count > n // 2` ile `count * 2 > n` matematiksel olarak özdeştir. |

## SHA-256 hash manifesti ve satır sonu politikası

- `benchmarks/code-oracle/manifest.sha256.json`, dizindeki tüm görev, referans, oracle test ve mutation dosyalarının (`manifest.sha256.json` ve `.gitattributes` hariç toplam 148 dosya) ham bayt SHA-256 özetlerini ve dosya sayılarını içerir.
- Windows ve Linux CI ortamları arasında CRLF/LF kaynaklı hash kaymasını önlemek için tüm `.json` ve `.py` dosyaları LF (`\n`) ile yazılır ve `benchmarks/code-oracle/.gitattributes` ile LF olarak sabitlenir.

## Otomatik doğrulama

Tüm kabul kriterleri [h06-code-oracle-benchmark.test.cjs](../../tests/h06-code-oracle-benchmark.test.cjs) içinde `npm run test:services` akışına bağlıdır:

1. **Şema ve dağılım:** 10 dev + 30 eval (`10/10/10`) sayısı, `@ifa/code-demo-contracts` (`validateFunctionSpec`, `validateInput`, `validateOutput`) uyumu ve geçersiz tip/ek alan negatif testi.
2. **Hash sabitliği:** 148 dosyanın birebir dosya listesi ve SHA-256 kontrolü + geçici kopyada spec/oracle/mutation tahrifatı ve ek dosya enjeksiyonu negatif testleri.
3. **Oracle izolasyonu (`TH07`):** Fiziksel dizin ayrımı, `agent-inputs/` içerik taraması, `test-generation` çıktısında sahte `passed: true` reddi ve runner oracle yolu için path traversal reddi.
4. **Küme ayrıklığı:** `dev` ile `eval` arasında ID, `functionName`, gereksinim ve dosya hash kesişiminin boş olduğu + `examples/code-demo` (`sum_even`) ile çakışma olmadığı.
5. **Python yürütme ve AST doğrulaması:** Her süreç geçici izole dizinde (`python -I -B`, 10 sn zaman aşımı) çalışır; 40/40 referans tüm gizli oracle testlerini geçer, 24/24 aktif mutation hedeflenen gizli oracle testlerinde kalır, eşdeğer mutation dışlama kapısı dışlanan 3 eşdeğer mutation örneğini (`eq-mut-01`..`eq-mut-03`) yakalayıp reddeder. Python 3 bulunamazsa CI ortamında (`process.env.CI`) test kırılır, yerel ortamda açıkça `ÇALIŞTIRILAMADI` gerekçesiyle atlanır.

## Mevcut davranışın korunması ve kapsam sınırı

- `services/`, `web/`, `packages/code-demo-contracts/` ve `package.json` üzerinde değişiklik yapılmamıştır; mevcut platform davranışı ve kontrat sürümleri (`1.0.0`) birebir korunur, veri tabanı veya şema migration'ı gerekmez.
- Bu teslim yalnız bağımsız benchmark verisi, doğrulama testleri ve belgesini içerir; izole sandbox runner (E07), kod/review/test agent'ları (F02–F05) ve model karşılaştırma deneyleri (H07) kapsam dışıdır ve bu belge model kalitesi başarısı iddia etmez.
