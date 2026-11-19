import Ajv from "ajv";

// ifa-workflow.v1 yapısal şeması. Tek kaynak budur: schemas/ifa-workflow.v1.schema.json
// `npm run export:contracts` ile buradan üretilir. Sınırlar docs/stage-1/04-security.md
// hedef limitlerinden gelir (artifact 128 KiB, step başına en fazla 60 sn).
const identifier = { type: "string", pattern: "^[a-z][a-z0-9-]{0,31}$" };
const capabilityId = { type: "string", minLength: 3, maxLength: 128, pattern: "^[a-z0-9][a-z0-9-]*/[a-z0-9][a-z0-9.-]*$" };
const semver = { type: "string", maxLength: 64, pattern: "^(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)$" };
const pointer = { type: "string", maxLength: 256 };

export const workflowSchema = {
  type: "object",
  additionalProperties: false,
  required: ["workflowVersion", "id", "version", "title", "steps"],
  properties: {
    workflowVersion: { const: "ifa-workflow.v1" },
    id: capabilityId,
    version: semver,
    title: { type: "string", minLength: 1, maxLength: 200 },
    steps: {
      type: "array", minItems: 1, maxItems: 16,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "capability", "requires", "input", "outputs", "budget", "required"],
        properties: {
          id: identifier,
          capability: {
            type: "object", additionalProperties: false, required: ["id", "version"],
            properties: { id: capabilityId, version: semver },
          },
          requires: {
            type: "object", additionalProperties: false, required: ["sideEffects"],
            // Teslim A yalnız yan etkisiz capability çalıştırır (05-capability-contract.md).
            properties: { sideEffects: { enum: ["none"] } },
          },
          input: {
            type: "object", minProperties: 1, maxProperties: 16,
            propertyNames: { pattern: "^[A-Za-z][A-Za-z0-9_]{0,63}$" },
            additionalProperties: {
              type: "object", additionalProperties: false, required: ["source", "pointer"],
              properties: { source: { enum: ["input", "step"] }, step: identifier, pointer },
            },
          },
          outputs: { type: "array", maxItems: 16, uniqueItems: true, items: pointer },
          budget: {
            type: "object", additionalProperties: false, required: ["timeoutMs", "maxOutputBytes"],
            properties: {
              timeoutMs: { type: "integer", minimum: 1000, maximum: 60000 },
              maxOutputBytes: { type: "integer", minimum: 1, maximum: 131072 },
            },
          },
          required: { type: "boolean" },
        },
      },
    },
  },
} as const;

export const MAX_WORKFLOW_BYTES = 65536;
const validate = new Ajv({ allErrors: true }).compile(workflowSchema);

export interface ShapeError { code: "invalid_workflow"; path: string; detail: string }

/** Yalnız yapıyı doğrular; adımlar arası anlam domain'de denetlenir. */
export function workflowShapeErrors(value: unknown): ShapeError[] {
  if (validate(value)) return [];
  return (validate.errors ?? []).slice(0, 20).map(error => ({ code: "invalid_workflow", path: error.instancePath || "/", detail: error.message ?? error.keyword }));
}
