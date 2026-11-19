'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { tmpdir } = require('node:os');
const { execFileSync } = require('node:child_process');
const contracts = require('@ifa/code-demo-contracts');

const { VERSION, PROFILE_IDS, ContractError, validateFunctionSpec, validateInput, validateOutput } = contracts;

const REPO_ROOT = path.resolve(__dirname, '..');
const BENCHMARK_ROOT = path.join(REPO_ROOT, 'benchmarks', 'code-oracle');
const AGENT_INPUTS_DIR = path.join(BENCHMARK_ROOT, 'agent-inputs');
const ORACLE_DIR = path.join(BENCHMARK_ROOT, 'oracle');
const MANIFEST_PATH = path.join(BENCHMARK_ROOT, 'manifest.sha256.json');
const PYTHON_TIMEOUT_MS = 10_000;

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function sha256File(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function collectBenchmarkFiles(dir, baseDir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectBenchmarkFiles(full, baseDir));
    } else if (entry.isFile()) {
      const rel = path.relative(baseDir, full).replace(/\\/g, '/');
      // Manifestin kendisi ve Git satır sonu kural dosyası hash tablosu dışındadır.
      if (rel === 'manifest.sha256.json' || rel === '.gitattributes') continue;
      files.push(rel);
    }
  }
  return files.sort();
}

// Görev, oracle ve mutation dosyalarının manifest ile birebir eşleşmesini doğrular.
function verifyHashManifest(rootDir) {
  const manifest = readJson(path.join(rootDir, 'manifest.sha256.json'));
  assert.equal(manifest.manifestVersion, 'h06-hash-manifest.v1');
  assert.equal(manifest.algorithm, 'sha256');
  assert.equal(manifest.eolPolicy, 'LF');

  const actualFiles = collectBenchmarkFiles(rootDir, rootDir);
  const manifestFiles = Object.keys(manifest.files).sort();

  assert.deepEqual(
    actualFiles,
    manifestFiles,
    'Manifest dosya listesi dizindeki gerçek dosyalarla birebir eşleşmelidir'
  );
  assert.equal(manifest.counts.totalHashedFiles, actualFiles.length);

  for (const rel of manifestFiles) {
    const fullPath = path.join(rootDir, rel);
    const bytes = fs.readFileSync(fullPath);
    assert.equal(bytes.includes(0x0d), false, `CRLF satır sonu tespit edildi (LF beklenir): ${rel}`);
    const digest = crypto.createHash('sha256').update(bytes).digest('hex');
    assert.equal(digest, manifest.files[rel], `SHA-256 hash uyuşmazlığı: ${rel}`);
  }
  return manifest;
}

// Runner sınırında oracle testinin yalnız oracle/{dev,eval}/tests altından yüklenmesini zorlar.
function resolveHiddenOracleTest(rootDir, candidateRelPath) {
  if (typeof candidateRelPath !== 'string' || !candidateRelPath.trim()) {
    throw new Error('oracle_path_required');
  }
  const normalized = candidateRelPath.replace(/\\/g, '/');
  if (!/^oracle\/(dev|eval)\/tests\/test_[a-z0-9_]+\.py$/.test(normalized)) {
    throw new Error('untrusted_oracle_path');
  }
  const resolved = path.resolve(rootDir, normalized);
  const allowedBase = path.resolve(rootDir, 'oracle') + path.sep;
  if (!resolved.startsWith(allowedBase)) {
    throw new Error('oracle_path_traversal');
  }
  return resolved;
}

// Dev ve eval kümelerinin ID, fonksiyon adı, gereksinim ve dosya özeti bakımından ayrıklığını doğrular.
function assertDisjointSplits(devProblems, evalProblems, devSpecsById, evalSpecsById) {
  const devIds = new Set(devProblems.map(p => p.id));
  for (const p of evalProblems) {
    assert.equal(devIds.has(p.id), false, `Çakışan problem ID: ${p.id}`);
  }

  const devNames = new Set(devProblems.map(p => p.functionName.toLowerCase()));
  for (const p of evalProblems) {
    assert.equal(
      devNames.has(p.functionName.toLowerCase()),
      false,
      `Dev ve eval arasında çakışan functionName: ${p.functionName}`
    );
  }

  const normalizeReq = text => text.trim().toLowerCase().replace(/\s+/g, ' ');
  const devReqSignatures = new Set(
    devProblems.map(p => devSpecsById.get(p.id).requirements.map(normalizeReq).join('|'))
  );
  for (const p of evalProblems) {
    const sig = evalSpecsById.get(p.id).requirements.map(normalizeReq).join('|');
    assert.equal(devReqSignatures.has(sig), false, `Dev ile özdeş eval gereksinimi: ${p.id}`);
  }
}

// Windows Store sahte python yönlendiricisine düşmeden gerçek Python 3 yorumlayıcısını seçer.
function detectPython3() {
  const candidates = [];
  if (process.env.IFA_PYTHON_BIN) {
    candidates.push({ cmd: process.env.IFA_PYTHON_BIN, prefixArgs: [] });
  }
  candidates.push({ cmd: 'python3', prefixArgs: [] });
  candidates.push({ cmd: 'python', prefixArgs: [] });
  if (process.platform === 'win32') {
    candidates.push({ cmd: 'py', prefixArgs: ['-3'] });
  }

  for (const candidate of candidates) {
    try {
      const out = execFileSync(candidate.cmd, [...candidate.prefixArgs, '--version'], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: 5000,
      });
      const version = out.trim();
      if (/^Python 3\.\d+/i.test(version)) {
        return { ...candidate, version };
      }
    } catch {
      // Sıradaki yorumlayıcı adayını dene.
    }
  }
  return null;
}

// Her oracle çalıştırmasını geçici izole dizinde ve zaman aşımıyla yürütür;
// 06-code-demo.md gereği exit=0 tek başına yeterli sayılmaz, yürütülen test sayısı da denetlenir.
function runOracleTestInTempDir(python, submissionCode, oracleTestCode) {
  const workDir = fs.mkdtempSync(path.join(tmpdir(), 'ifa-h06-run-'));
  const runnerScript = [
    'import io, json, os, sys, unittest',
    '# -I izole kip çalışma dizinini sys.path dışına alır; yalnız bu geçici dizini ekle.',
    'sys.path.insert(0, os.getcwd())',
    'loader = unittest.TestLoader()',
    'suite = loader.loadTestsFromName("test_oracle")',
    'stream = io.StringIO()',
    'runner = unittest.TextTestRunner(stream=stream, verbosity=0)',
    'res = runner.run(suite)',
    'failed = [t.id().split(".")[-1] for t, _ in res.failures]',
    'errored = [t.id().split(".")[-1] for t, _ in res.errors]',
    'print(json.dumps({',
    '  "ran": res.testsRun,',
    '  "failures": len(res.failures),',
    '  "errors": len(res.errors),',
    '  "skipped": len(res.skipped),',
    '  "failedTests": sorted(set(failed + errored)),',
    '  "ok": res.wasSuccessful() and res.testsRun > 0',
    '}))',
  ].join('\n');

  try {
    fs.writeFileSync(path.join(workDir, 'submission.py'), submissionCode, 'utf8');
    fs.writeFileSync(path.join(workDir, 'test_oracle.py'), oracleTestCode, 'utf8');
    fs.writeFileSync(path.join(workDir, '_run_oracle.py'), runnerScript, 'utf8');

    const stdout = execFileSync(
      python.cmd,
      [...python.prefixArgs, '-I', '-B', '_run_oracle.py'],
      {
        cwd: workDir,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: PYTHON_TIMEOUT_MS,
      }
    );
    return JSON.parse(stdout.trim());
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true });
  }
}

// Referans/mutation ve oracle test dosyalarını 06-code-demo.md AST kısıtlarına göre doğrular.
function verifyPythonAstRules(python, spec, codeSource, oracleTestSource) {
  const workDir = fs.mkdtempSync(path.join(tmpdir(), 'ifa-h06-ast-'));
  const inspector = [
    'import ast, json, sys',
    'expected_fn = sys.argv[1]',
    'expected_params = json.loads(sys.argv[2])',
    'with open("submission.py", "r", encoding="utf-8") as f:',
    '    code_tree = ast.parse(f.read(), filename="submission.py")',
    'assert len(code_tree.body) == 1 and isinstance(code_tree.body[0], ast.FunctionDef), "Tek top-level def beklenir"',
    'fn = code_tree.body[0]',
    'assert fn.name == expected_fn, f"Fonksiyon adı uyuşmuyor: {fn.name}"',
    'assert not fn.decorator_list, "Dekoratör yasak"',
    'assert not fn.args.posonlyargs and not fn.args.kwonlyargs and not fn.args.defaults and not fn.args.vararg and not fn.args.kwarg, "Yalnız standart positional-or-keyword parametre"',
    'assert [a.arg for a in fn.args.args] == expected_params, "Parametre adları/sırası uyuşmuyor"',
    'for node in ast.walk(code_tree):',
    '    assert not isinstance(node, (ast.Import, ast.ImportFrom, ast.ClassDef, ast.AsyncFunctionDef)), f"Yasak AST düğümü: {type(node).__name__}"',
    'with open("test_oracle.py", "r", encoding="utf-8") as f:',
    '    test_tree = ast.parse(f.read(), filename="test_oracle.py")',
    'test_methods = 0',
    'for node in test_tree.body:',
    '    if isinstance(node, ast.Import):',
    '        assert [a.name for a in node.names] == ["unittest"], "Yalnız unittest import edilebilir"',
    '    elif isinstance(node, ast.ImportFrom):',
    '        assert node.module == "submission" and [a.name for a in node.names] == [expected_fn], "Yalnız submission hedef fonksiyonu import edilebilir"',
    '    elif isinstance(node, ast.ClassDef):',
    '        for item in node.body:',
    '            if isinstance(item, ast.FunctionDef) and item.name.startswith("test_"):',
    '                test_methods += 1',
    '    else:',
    '        raise AssertionError(f"Oracle testinde beklenmeyen top-level ifade: {type(node).__name__}")',
    'assert 1 <= test_methods <= 20, f"Test metodu sayısı 1..20 aralığında olmalı: {test_methods}"',
    'print(json.dumps({"ok": True, "testMethods": test_methods}))',
  ].join('\n');

  try {
    fs.writeFileSync(path.join(workDir, 'submission.py'), codeSource, 'utf8');
    fs.writeFileSync(path.join(workDir, 'test_oracle.py'), oracleTestSource, 'utf8');
    fs.writeFileSync(path.join(workDir, '_inspect_ast.py'), inspector, 'utf8');

    const stdout = execFileSync(
      python.cmd,
      [
        ...python.prefixArgs,
        '-I',
        '-B',
        '_inspect_ast.py',
        spec.functionName,
        JSON.stringify(spec.parameters.map(p => p.name)),
      ],
      {
        cwd: workDir,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: PYTHON_TIMEOUT_MS,
      }
    );
    return JSON.parse(stdout.trim());
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true });
  }
}

// Mutation'ın eşdeğer olmadığını (en az bir gizli oracle testinde kaldığını) denetler.
function assertNonEquivalentMutation(python, candidateCode, oracleTestCode, label) {
  const result = runOracleTestInTempDir(python, candidateCode, oracleTestCode);
  assert.ok(result.ran >= 1, `${label}: hiç oracle testi yürütülmedi`);
  if (result.ok || result.failures + result.errors === 0) {
    throw new Error(`equivalent_mutation_detected:${label}`);
  }
  return result;
}

test('H06: 10 geliştirme + 30 değerlendirme (10/10/10) dağılımı ve FunctionSpec kontrat doğrulaması', () => {
  const devIndex = readJson(path.join(AGENT_INPUTS_DIR, 'dev', 'index.json'));
  const evalIndex = readJson(path.join(AGENT_INPUTS_DIR, 'eval', 'index.json'));
  const oracleIndex = readJson(path.join(ORACLE_DIR, 'index.json'));

  assert.equal(devIndex.split, 'dev');
  assert.equal(evalIndex.split, 'eval');
  assert.equal(devIndex.problems.length, 10);
  assert.equal(evalIndex.problems.length, 30);
  assert.equal(oracleIndex.entries.length, 40);

  const evalCategories = { numbers_lists: 0, strings: 0, edge_cases: 0 };
  for (const item of evalIndex.problems) {
    assert.ok(Object.hasOwn(evalCategories, item.category), `Geçersiz eval kategorisi: ${item.category}`);
    evalCategories[item.category] += 1;
  }
  assert.deepEqual(evalCategories, { numbers_lists: 10, strings: 10, edge_cases: 10 });

  const genProfile = { id: PROFILE_IDS.generation, version: VERSION };
  const testProfile = { id: PROFILE_IDS.tests, version: VERSION };
  const oracleById = new Map(oracleIndex.entries.map(e => [e.id, e]));

  for (const [splitName, indexObj] of [['dev', devIndex], ['eval', evalIndex]]) {
    for (const item of indexObj.problems) {
      const specPath = path.join(AGENT_INPUTS_DIR, splitName, item.specPath);
      const spec = readJson(specPath);

      // Mevcut @ifa/code-demo-contracts doğrulayıcısı ile şema + semantik kontrol
      assert.deepEqual(validateFunctionSpec(spec), spec);
      assert.equal(spec.functionName, item.functionName);
      const validInput = validateInput(genProfile, { spec });

      const oracleEntry = oracleById.get(item.id);
      assert.ok(oracleEntry, `Oracle indeksi eksik: ${item.id}`);
      assert.equal(oracleEntry.split, splitName);
      assert.equal(oracleEntry.functionName, item.functionName);

      const refCode = fs.readFileSync(path.join(BENCHMARK_ROOT, oracleEntry.referencePath), 'utf8');
      const testCode = fs.readFileSync(path.join(BENCHMARK_ROOT, oracleEntry.oracleTestPath), 'utf8');
      assert.ok(Buffer.byteLength(refCode, 'utf8') <= 32768, `Referans 32 KiB sınırını aştı: ${item.id}`);
      assert.ok(Buffer.byteLength(testCode, 'utf8') <= 32768, `Oracle testi 32 KiB sınırını aştı: ${item.id}`);

      validateOutput(genProfile, { code: refCode, explanation: 'Referans çözüm.' }, validInput);
      validateOutput(
        testProfile,
        { framework: 'unittest', tests: testCode, scenarios: ['Gizli oracle senaryoları'] },
        { spec, code: refCode }
      );
    }
  }

  // Negatif senaryo: desteklenmeyen tip veya ek alan içeren FunctionSpec kontrat tarafından reddedilir.
  const sampleSpec = readJson(path.join(AGENT_INPUTS_DIR, 'eval', evalIndex.problems[0].specPath));
  assert.throws(
    () => validateFunctionSpec({ ...sampleSpec, oraclePath: 'oracle/eval/tests/fake.py' }),
    err => err instanceof ContractError && err.code === 'invalid_schema'
  );
  assert.throws(
    () => validateFunctionSpec({ ...sampleSpec, returnType: 'float' }),
    err => err instanceof ContractError && err.code === 'invalid_schema'
  );
});

test('H06: SHA-256 hash manifesti sabittir ve dosya değişikliğinde kırılır', () => {
  const manifest = verifyHashManifest(BENCHMARK_ROOT);
  assert.equal(manifest.counts.devSpecs, 10);
  assert.equal(manifest.counts.evalSpecs, 30);
  assert.equal(manifest.counts.referenceSolutions, 40);
  assert.equal(manifest.counts.oracleTests, 40);
  assert.equal(manifest.counts.activeMutations, 24);
  assert.equal(manifest.counts.excludedEquivalentMutations, 3);

  // Negatif senaryo: geçici kopyada spec, oracle test, mutation veya ek dosya değişimi tespit edilir.
  const tempCopy = fs.mkdtempSync(path.join(tmpdir(), 'ifa-h06-tamper-'));
  try {
    fs.cpSync(BENCHMARK_ROOT, tempCopy, { recursive: true });
    verifyHashManifest(tempCopy);

    // 1) Görev spec dosyasında tek karakter değişikliği
    const specFile = path.join(tempCopy, 'agent-inputs/eval/specs/eval-nl-01.json');
    const origSpec = fs.readFileSync(specFile, 'utf8');
    fs.writeFileSync(specFile, origSpec + ' ', 'utf8');
    assert.throws(() => verifyHashManifest(tempCopy), /SHA-256 hash uyuşmazlığı/);
    fs.writeFileSync(specFile, origSpec, 'utf8');

    // 2) Gizli oracle test dosyasında değişiklik
    const oracleFile = path.join(tempCopy, 'oracle/eval/tests/test_eval_nl_01.py');
    const origOracle = fs.readFileSync(oracleFile, 'utf8');
    fs.writeFileSync(oracleFile, origOracle + '# tamper\n', 'utf8');
    assert.throws(() => verifyHashManifest(tempCopy), /SHA-256 hash uyuşmazlığı/);
    fs.writeFileSync(oracleFile, origOracle, 'utf8');

    // 3) Mutation dosyasında değişiklik
    const mutFile = path.join(tempCopy, 'oracle/mutations/variants/mut-01.py');
    const origMut = fs.readFileSync(mutFile, 'utf8');
    fs.writeFileSync(mutFile, origMut + '# tamper\n', 'utf8');
    assert.throws(() => verifyHashManifest(tempCopy), /SHA-256 hash uyuşmazlığı/);
    fs.writeFileSync(mutFile, origMut, 'utf8');

    // 4) Manifestte kayıtlı olmayan fazladan dosya eklenmesi
    const extraFile = path.join(tempCopy, 'agent-inputs/eval/specs/injected.json');
    fs.writeFileSync(extraFile, '{}\n', 'utf8');
    assert.throws(() => verifyHashManifest(tempCopy), /Manifest dosya listesi/);
  } finally {
    fs.rmSync(tempCopy, { recursive: true, force: true });
  }
});

test('H06: Agent kendi testini oracle sayamaz; fiziksel ayrım ve TH07 sınırı korunur', () => {
  // Fiziksel dizin ayrımı: agent-inputs ve oracle birbirinin alt dizini olamaz.
  assert.ok(path.relative(AGENT_INPUTS_DIR, ORACLE_DIR).startsWith('..'));
  assert.ok(path.relative(ORACLE_DIR, AGENT_INPUTS_DIR).startsWith('..'));

  // Agent'a giden hiçbir dosyada oracle/test/referans/mutation sızıntısı olmamalı.
  const forbiddenLeakPattern = /\boracle\b|\breferences\b|\bmutations?\b|\bunittest\b|\bassertEqual\b|\bassertTrue\b|\bassertFalse\b|\bassertRaises\b|\bsubmission\b|test_eval_|test_dev_/i;
  const agentFiles = collectBenchmarkFiles(AGENT_INPUTS_DIR, AGENT_INPUTS_DIR);
  assert.equal(agentFiles.length, 42); // 2 index + 40 spec

  for (const rel of agentFiles) {
    const raw = fs.readFileSync(path.join(AGENT_INPUTS_DIR, rel), 'utf8');
    assert.doesNotMatch(raw, forbiddenLeakPattern, `Agent girdisinde yasak oracle referansı: ${rel}`);
  }

  // Negatif senaryo 1 (TH07): test-generation çıktısına sahte passed alanı eklenirse kontrat reddeder.
  const evalSpec = readJson(path.join(AGENT_INPUTS_DIR, 'eval/specs/eval-nl-01.json'));
  const evalRef = fs.readFileSync(path.join(ORACLE_DIR, 'eval/references/eval-nl-01.py'), 'utf8');
  const testProfile = { id: PROFILE_IDS.tests, version: VERSION };
  assert.throws(
    () => validateOutput(
      testProfile,
      {
        framework: 'unittest',
        tests: 'import unittest\nfrom submission import count_strict_peaks\nclass T(unittest.TestCase):\n    def test_ok(self):\n        self.assertEqual(count_strict_peaks([]), 0)\n',
        scenarios: ['Boş liste'],
        passed: true,
      },
      { spec: evalSpec, code: evalRef }
    ),
    err => err instanceof ContractError && err.code === 'invalid_schema'
  );

  // Negatif senaryo 2: Runner oracle yol çözümleyicisi agent çıktısını veya path traversal'ı reddeder.
  assert.ok(fs.existsSync(resolveHiddenOracleTest(BENCHMARK_ROOT, 'oracle/eval/tests/test_eval_nl_01.py')));
  for (const badPath of [
    'agent-inputs/eval/specs/eval-nl-01.json',
    'oracle/../agent-inputs/eval/specs/eval-nl-01.json',
    'oracle/mutations/variants/mut-01.py',
    'agent-generated-tests/test_self.py',
    '/tmp/agent_test.py',
    '',
  ]) {
    assert.throws(() => resolveHiddenOracleTest(BENCHMARK_ROOT, badPath));
  }
});

test('H06: Geliştirme ve değerlendirme kümeleri kesişmez', () => {
  const devIndex = readJson(path.join(AGENT_INPUTS_DIR, 'dev/index.json'));
  const evalIndex = readJson(path.join(AGENT_INPUTS_DIR, 'eval/index.json'));
  const devSpecs = new Map(
    devIndex.problems.map(p => [p.id, readJson(path.join(AGENT_INPUTS_DIR, 'dev', p.specPath))])
  );
  const evalSpecs = new Map(
    evalIndex.problems.map(p => [p.id, readJson(path.join(AGENT_INPUTS_DIR, 'eval', p.specPath))])
  );

  assertDisjointSplits(devIndex.problems, evalIndex.problems, devSpecs, evalSpecs);

  // Dosya SHA-256 düzeyinde de dev ile eval arasında hiçbir spec/referans/test ortak olmamalı.
  const manifest = readJson(MANIFEST_PATH);
  const devHashes = new Set();
  for (const [rel, hash] of Object.entries(manifest.files)) {
    if (rel.includes('/dev/')) devHashes.add(hash);
  }
  for (const [rel, hash] of Object.entries(manifest.files)) {
    if (rel.includes('/eval/')) {
      assert.equal(devHashes.has(hash), false, `Dev ve eval arasında özdeş dosya hash'i: ${rel}`);
    }
  }

  // Mevcut examples/code-demo örneği (sum_even) değerlendirme kümesine sızmamış olmalı.
  const demoExample = readJson(path.join(REPO_ROOT, 'examples/code-demo/code-generation.json'));
  const evalNames = new Set(evalIndex.problems.map(p => p.functionName.toLowerCase()));
  assert.equal(evalNames.has(demoExample.input.spec.functionName.toLowerCase()), false);

  // Negatif senaryo: aynı functionName'e sahip bir öğe eklendiğinde ayrıklık denetimi hata verir.
  const collidingEval = [
    ...evalIndex.problems,
    { ...devIndex.problems[0], id: 'eval-fake-99' },
  ];
  assert.throws(
    () => assertDisjointSplits(devIndex.problems, collidingEval, devSpecs, evalSpecs),
    /çakışan functionName/
  );
});

test('H06: Mutation kataloğu yapısal bütünlüğü (>=20 aktif, 8/8/8 dağılım, dışlanan eşdeğer kayıtları)', () => {
  const catalog = readJson(path.join(ORACLE_DIR, 'mutations/catalog.json'));
  const oracleIndex = readJson(path.join(ORACLE_DIR, 'index.json'));
  const evalEntries = new Map(
    oracleIndex.entries.filter(e => e.split === 'eval').map(e => [e.id, e])
  );

  assert.equal(catalog.schemaVersion, 'h06-mutation-catalog.v1');
  assert.ok(catalog.mutations.length >= 20, 'En az 20 aktif mutation gerekir');
  assert.equal(catalog.mutations.length, 24);
  assert.equal(catalog.excluded.length, 3);

  const byCategory = { numbers_lists: 0, strings: 0, edge_cases: 0 };
  const activeIds = new Set();

  for (const m of catalog.mutations) {
    assert.equal(activeIds.has(m.id), false, `Tekrarlı mutation ID: ${m.id}`);
    activeIds.add(m.id);
    assert.equal(m.manuallyVerified, true);
    assert.ok(Array.isArray(m.expectedFailingTests) && m.expectedFailingTests.length >= 1);

    const target = evalEntries.get(m.problemId);
    assert.ok(target, `Mutation geçerli bir eval problemine bağlanmalı: ${m.id}`);
    assert.equal(target.functionName, m.functionName);
    assert.equal(target.category, m.category);
    byCategory[m.category] += 1;

    const variantHash = sha256File(path.join(BENCHMARK_ROOT, m.variantPath));
    const referenceHash = sha256File(path.join(BENCHMARK_ROOT, target.referencePath));
    assert.notEqual(variantHash, referenceHash, `Mutation referansla bayt olarak özdeş olamaz: ${m.id}`);
  }
  assert.deepEqual(byCategory, { numbers_lists: 8, strings: 8, edge_cases: 8 });

  for (const ex of catalog.excluded) {
    assert.equal(activeIds.has(ex.id), false, `Dışlanan eşdeğer mutation aktif listede olamaz: ${ex.id}`);
    assert.ok(evalEntries.has(ex.problemId), `Dışlanan kayıt geçerli eval problemine bağlanmalı: ${ex.id}`);
    assert.ok(typeof ex.exclusionReason === 'string' && ex.exclusionReason.trim().length >= 20);
  }
});

test('H06: Python yürütme — AST kuralları, 40/40 referans geçer, 24/24 mutation yakalanır, eşdeğer reddedilir', { timeout: 120_000 }, (t) => {
  const python = detectPython3();
  if (!python) {
    const reason = 'ÇALIŞTIRILAMADI: Python 3 bulunamadı; AST, referans çözüm ve mutation yürütme doğrulaması yapılmadı.';
    if (process.env.CI) {
      assert.fail(reason);
    }
    // Yerel ortamda CI yoksa sessizce geçti saymak yerine açıkça çalıştırılamadı gerekçesiyle atla.
    t.skip(reason);
    return;
  }

  const oracleIndex = readJson(path.join(ORACLE_DIR, 'index.json'));
  const catalog = readJson(path.join(ORACLE_DIR, 'mutations/catalog.json'));
  const oracleById = new Map(oracleIndex.entries.map(e => [e.id, e]));

  // 1) 40 problemin tamamında AST kuralları ve referans çözümün gizli oracle testlerinden geçişi
  for (const entry of oracleIndex.entries) {
    const spec = readJson(path.join(BENCHMARK_ROOT, entry.specPath));
    const refCode = fs.readFileSync(path.join(BENCHMARK_ROOT, entry.referencePath), 'utf8');
    const oracleTestCode = fs.readFileSync(path.join(BENCHMARK_ROOT, entry.oracleTestPath), 'utf8');

    const astCheck = verifyPythonAstRules(python, spec, refCode, oracleTestCode);
    assert.equal(astCheck.ok, true, `AST doğrulaması başarısız: ${entry.id}`);

    const runResult = runOracleTestInTempDir(python, refCode, oracleTestCode);
    assert.equal(runResult.ok, true, `Referans çözüm oracle testini geçemedi (${entry.id}): ${JSON.stringify(runResult)}`);
    assert.ok(runResult.ran >= 1, `Hiç test yürütülmedi: ${entry.id}`);
    assert.equal(runResult.failures, 0);
    assert.equal(runResult.errors, 0);
    assert.equal(runResult.skipped, 0);
  }

  // 2) 24 aktif mutation'ın her biri AST kurallarına uyar ve en az bir gizli oracle testinde başarısız olur
  for (const mut of catalog.mutations) {
    const target = oracleById.get(mut.problemId);
    const spec = readJson(path.join(BENCHMARK_ROOT, target.specPath));
    const mutCode = fs.readFileSync(path.join(BENCHMARK_ROOT, mut.variantPath), 'utf8');
    const oracleTestCode = fs.readFileSync(path.join(BENCHMARK_ROOT, target.oracleTestPath), 'utf8');

    const astCheck = verifyPythonAstRules(python, spec, mutCode, oracleTestCode);
    assert.equal(astCheck.ok, true, `Mutation AST doğrulaması başarısız: ${mut.id}`);

    const mutResult = assertNonEquivalentMutation(python, mutCode, oracleTestCode, mut.id);
    for (const expectedTest of mut.expectedFailingTests) {
      assert.ok(
        mutResult.failedTests.includes(expectedTest),
        `${mut.id} beklenen testte (${expectedTest}) kalmadı; kalan testler: ${mutResult.failedTests.join(', ')}`
      );
    }
  }

  // 3) Negatif senaryo: Dışlanan 3 eşdeğer mutation'ın tamamı dışlama kapısı tarafından yakalanıp reddedilir.
  const equivalentCases = [
    {
      id: 'eq-mut-01',
      problemId: 'eval-nl-01',
      mutate: code => code.replace('range(1, len(values) - 1)', 'range(1, len(values) - 1, 1)'),
    },
    {
      id: 'eq-mut-02',
      problemId: 'eval-str-03',
      mutate: code => code.replace('        if not prefix:\n            return ""\n', ''),
    },
    {
      id: 'eq-mut-03',
      problemId: 'eval-edge-06',
      mutate: code => code.replace('if new_count > threshold:', 'if new_count * 2 > len(values):'),
    },
  ];
  for (const eqCase of equivalentCases) {
    const eqTarget = oracleById.get(eqCase.problemId);
    const eqRefCode = fs.readFileSync(path.join(BENCHMARK_ROOT, eqTarget.referencePath), 'utf8');
    const eqOracleTest = fs.readFileSync(path.join(BENCHMARK_ROOT, eqTarget.oracleTestPath), 'utf8');
    const equivalentVariant = eqCase.mutate(eqRefCode);
    assert.notEqual(equivalentVariant, eqRefCode, `Eşdeğer varyant üretilemedi: ${eqCase.id}`);
    assert.throws(
      () => assertNonEquivalentMutation(python, equivalentVariant, eqOracleTest, eqCase.id),
      new RegExp(`equivalent_mutation_detected:${eqCase.id}`)
    );
  }
});
