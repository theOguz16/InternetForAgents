// Manifest alt kümesinde pattern/$ref yoktur; imza ve ilişkisel kurallar ayrı doğrulanır.
const string = (maxLength, minLength = 1) => ({ type: 'string', minLength, maxLength });
const object = (properties, required = Object.keys(properties)) => ({ type: 'object', additionalProperties: false, required, properties });
const array = (items, minItems, maxItems) => ({ type: 'array', minItems, maxItems, items });
const types = ['int', 'bool', 'str', 'list[int]', 'list[str]'];
const typed = () => ({ ...string(9), enum: types });
const functionSpec = object({
  language: { ...string(6), const: 'python' }, functionName: string(64),
  parameters: array(object({ name: string(64), type: typed() }), 0, 8),
  returnType: typed(), requirements: array(string(500), 1, 10),
});
const code = () => string(32768);
const specInput = () => object({ spec: functionSpec });
const codeInput = () => object({ spec: functionSpec, code: code() });
const profiles = {
  'ifa-demo/code-generation': { input: specInput(), output: object({ code: code(), explanation: string(2000) }) },
  'ifa-demo/code-review': { input: codeInput(), output: object({
    verdict: { ...string(17), enum: ['no_findings', 'changes_requested'] },
    findings: array(object({ id: string(64), severity: { ...string(7), enum: ['info', 'warning', 'error'] },
      message: string(1000), suggestion: string(1000), line: { type: 'integer', minimum: 1, maximum: 10000 } },
      ['id', 'severity', 'message', 'suggestion']), 0, 20), summary: string(2000),
  }) },
  'ifa-demo/test-generation': { input: codeInput(), output: object({
    framework: { ...string(8), const: 'unittest' }, tests: code(), scenarios: array(string(300), 1, 20),
  }) },
};
module.exports = { functionSpec, profiles };
