const Ajv = require('ajv');
const functionSpecSchema = require('./schemas/function-spec.schema.json');
const VERSION = '1.0.0';
const PROFILE_IDS = Object.freeze({ generation: 'ifa-demo/code-generation', review: 'ifa-demo/code-review', tests: 'ifa-demo/test-generation' });
function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
const schemas = freeze(Object.fromEntries(Object.values(PROFILE_IDS).map(id => {
  const name = id.split('/')[1];
  return [id, { input: require(`./schemas/${name}.input.schema.json`), output: require(`./schemas/${name}.output.schema.json`) }];
})));
freeze(functionSpecSchema);
const ajv = new Ajv({ strict: true, allErrors: false, validateFormats: false });
const specValidator = ajv.compile(functionSpecSchema);
const validators = Object.fromEntries(Object.entries(schemas).map(([id, s]) => [id, { input: ajv.compile(s.input), output: ajv.compile(s.output) }]));
class ContractError extends Error {
  constructor(code, path) { super(`${code}: ${path}`); this.name = 'ContractError'; this.code = code; this.path = path; }
}
function fail(code, path) { throw new ContractError(code, path); }
function check(validator, value, path) {
  // Hatalarda ham kod/gereksinim tutulmaz; yalnız hata türü ve alan yolu taşınır.
  if (!validator(value)) fail('invalid_schema', `${path}${validator.errors[0].instancePath}`);
}
const keywords = new Set('False None True and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield'.split(' '));
function identifier(name, path) {
  // Soft keyword match/case/type normal fonksiyon/parametre adı olabilir; hard keyword olamaz.
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name) || keywords.has(name) || (name.startsWith('__') && name.endsWith('__'))) fail('invalid_identifier', path);
}
function specSemantics(spec, path) {
  identifier(spec.functionName, `${path}/functionName`);
  const names = new Set();
  spec.parameters.forEach((parameter, i) => {
    const field = `${path}/parameters/${i}/name`;
    identifier(parameter.name, field);
    if (names.has(parameter.name)) fail('duplicate_parameter', field);
    names.add(parameter.name);
  });
}
function validateFunctionSpec(value) {
  check(specValidator, value, ''); specSemantics(value, ''); return value;
}
function profileValidator(profile, kind) {
  if (!profile || typeof profile !== 'object' || typeof profile.id !== 'string' || !Object.hasOwn(validators, profile.id)) fail('unsupported_profile', '/capability/id');
  // SemVer benzerliği yeterli değildir: bu paket yalnız ilan ettiği tam sözleşmeyi uygular.
  if (profile.version !== VERSION) fail('unsupported_version', '/capability/version');
  return validators[profile.id][kind];
}
function artifact(value, path) {
  // JSON Schema Unicode kod noktası sayar; taşıma/sandbox bütçesi UTF-8 byte sayar.
  if (Buffer.byteLength(value, 'utf8') > 32768) fail('artifact_too_large', path);
}
function validateInput(profile, value) {
  check(profileValidator(profile, 'input'), value, '');
  specSemantics(value.spec, '/spec');
  if (Object.hasOwn(value, 'code')) artifact(value.code, '/code');
  return value;
}
function validateOutput(profile, value, input) {
  const validator = profileValidator(profile, 'output');
  // Satır bulgusunu sağlayıcının seçtiği başka koda bağlamamak için çağıran gerçek input'u verir.
  validateInput(profile, input);
  check(validator, value, '');
  if (profile.id === PROFILE_IDS.generation) artifact(value.code, '/code');
  if (profile.id === PROFILE_IDS.tests) artifact(value.tests, '/tests');
  if (profile.id === PROFILE_IDS.review) {
    if ((value.verdict === 'no_findings') !== (value.findings.length === 0)) fail('inconsistent_verdict', '/verdict');
    const lines = input.code.split(/\r\n|\r|\n/).length;
    value.findings.forEach((finding, i) => {
      if (finding.line !== undefined && finding.line > lines) fail('invalid_finding_line', `/findings/${i}/line`);
    });
  }
  return value;
}
module.exports = { VERSION, PROFILE_IDS, schemas, functionSpecSchema, ContractError, validateFunctionSpec, validateInput, validateOutput };
