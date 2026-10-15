import Ajv from "ajv";
import { createHash } from "node:crypto";

export type JsonSchema = Record<string, unknown>;
export interface Capability {
  id: string; version: string; skillId: string; title: string; description: string;
  executionMode: "fixture" | "deterministic" | "model";
  sideEffects: "none";
  inputSchema: JsonSchema; outputSchema: JsonSchema;
  examples: { input: unknown; output: unknown }[];
}
export interface Manifest { manifestVersion: "ifa-manifest.v1"; capabilities: Capability[] }
export class ManifestError extends Error {
  constructor(readonly code: string, readonly path: string) { super(`${code}: ${path}`); }
}
const ajv = new Ajv({ strict: true, allErrors: false, validateFormats: false });
const identifier = /^[a-z][a-z0-9-]{0,62}\/[a-z][a-z0-9-]{0,62}$/;
// İlk sürümde pre-release/build etiketleri bilinçli olarak desteklenmez.
const version = /^(0|[1-9][0-9]{0,8})\.(0|[1-9][0-9]{0,8})\.(0|[1-9][0-9]{0,8})$/;
function fail(code: string, path: string): never { throw new ManifestError(code, path); }
function object(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail("expected_object", path);
  return value as Record<string, unknown>;
}
function exact(value: Record<string, unknown>, keys: string[], path: string) {
  for (const key of Object.keys(value)) if (!keys.includes(key)) fail("unsupported_field", `${path}/${key}`);
}
function text(value: unknown, max: number, path: string): asserts value is string {
  if (typeof value !== "string" || !value.trim() || Array.from(value).length > max) fail("invalid_string", path);
}
function boundedInteger(value: unknown, max: number, path: string) {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > max) fail("invalid_bound", path);
}

/** Schema kod değildir: desteklenmeyen keyword'leri Ajv'ye ulaşmadan reddederiz. */
function inspectSchema(value: unknown, path: string, depth = 0, budget = { properties: 0 }) {
  if (depth > 8) fail("schema_depth_exceeded", path);
  const schema = object(value, path);
  const common = ["$schema", "type", "enum", "const"];
  if (schema.$schema !== undefined && schema.$schema !== "http://json-schema.org/draft-07/schema#") fail("unsupported_dialect", path);
  if (depth === 0 && schema.type !== "object") fail("root_object_required", path);
  if (schema.enum !== undefined && (!Array.isArray(schema.enum) || schema.enum.length < 1 || schema.enum.length > 100)) fail("invalid_enum", path);
  switch (schema.type) {
    case "object": {
      exact(schema, [...common, "properties", "required", "additionalProperties"], path);
      if (schema.additionalProperties !== false) fail("closed_object_required", path);
      const properties = object(schema.properties, `${path}/properties`);
      budget.properties += Object.keys(properties).length;
      if (budget.properties > 100) fail("schema_properties_exceeded", path);
      for (const [key, child] of Object.entries(properties)) {
        if (["__proto__", "prototype", "constructor"].includes(key) || key.length > 128) fail("unsafe_property", path);
        inspectSchema(child, `${path}/properties/${key}`, depth + 1, budget);
      }
      if (schema.required !== undefined && (!Array.isArray(schema.required) || schema.required.some(key => typeof key !== "string" || !Object.hasOwn(properties, key)) || new Set(schema.required).size !== schema.required.length)) fail("invalid_required", path);
      break;
    }
    case "array":
      exact(schema, [...common, "items", "minItems", "maxItems", "uniqueItems"], path);
      boundedInteger(schema.maxItems, 1000, `${path}/maxItems`);
      if (schema.minItems !== undefined) boundedInteger(schema.minItems, schema.maxItems as number, `${path}/minItems`);
      if (schema.uniqueItems !== undefined && typeof schema.uniqueItems !== "boolean") fail("invalid_unique_items", path);
      inspectSchema(schema.items, `${path}/items`, depth + 1, budget);
      break;
    case "string":
      exact(schema, [...common, "minLength", "maxLength"], path);
      boundedInteger(schema.maxLength, 32768, `${path}/maxLength`);
      if (schema.minLength !== undefined) boundedInteger(schema.minLength, schema.maxLength as number, `${path}/minLength`);
      break;
    case "number": case "integer":
      exact(schema, [...common, "minimum", "maximum"], path);
      if (typeof schema.maximum !== "number" || !Number.isFinite(schema.maximum)) fail("finite_maximum_required", path);
      if (schema.minimum !== undefined && (typeof schema.minimum !== "number" || !Number.isFinite(schema.minimum) || schema.minimum > schema.maximum)) fail("invalid_minimum", path);
      break;
    case "boolean": exact(schema, common, path); break;
    default: fail("unsupported_type", path);
  }
}

export function validateManifest(value: unknown, skillIds: string[]): Manifest {
  if (Buffer.byteLength(JSON.stringify(value) ?? "") > 131072) fail("manifest_too_large", "/");
  const root = object(value, "/");
  exact(root, ["manifestVersion", "capabilities"], "/");
  if (root.manifestVersion !== "ifa-manifest.v1") fail("unsupported_manifest_version", "/manifestVersion");
  if (!Array.isArray(root.capabilities) || !root.capabilities.length || root.capabilities.length > 16) fail("invalid_capabilities", "/capabilities");
  const ids = new Set<string>(); const bindings = new Set<string>();
  for (const [index, raw] of root.capabilities.entries()) {
    const path = `/capabilities/${index}`; const cap = object(raw, path);
    exact(cap, ["id", "version", "skillId", "title", "description", "executionMode", "sideEffects", "inputSchema", "outputSchema", "examples"], path);
    text(cap.id, 127, `${path}/id`); text(cap.version, 29, `${path}/version`); text(cap.skillId, 128, `${path}/skillId`);
    text(cap.title, 200, `${path}/title`); text(cap.description, 2000, `${path}/description`);
    if (!identifier.test(cap.id) || ids.has(cap.id)) fail("invalid_or_duplicate_capability", `${path}/id`);
    if (!version.test(cap.version)) fail("unsupported_version", `${path}/version`);
    if (!skillIds.includes(cap.skillId) || bindings.has(cap.skillId)) fail("invalid_skill_binding", `${path}/skillId`);
    ids.add(cap.id); bindings.add(cap.skillId);
    if (!["fixture", "deterministic", "model"].includes(String(cap.executionMode)) || cap.sideEffects !== "none") fail("unsupported_execution", path);
    inspectSchema(cap.inputSchema, `${path}/inputSchema`); inspectSchema(cap.outputSchema, `${path}/outputSchema`);
    if (!Array.isArray(cap.examples) || cap.examples.length < 1 || cap.examples.length > 10) fail("invalid_examples", path);
    // Untrusted schema'lar global Ajv cache'inde sonsuza kadar tutulmaz.
    const validators = [];
    try {
      validators.push(ajv.compile(cap.inputSchema as JsonSchema), ajv.compile(cap.outputSchema as JsonSchema));
      for (const [i, example] of cap.examples.entries()) {
        const item = object(example, `${path}/examples/${i}`); exact(item, ["input", "output"], `${path}/examples/${i}`);
        if (!validators[0](item.input) || !validators[1](item.output)) fail("invalid_example", `${path}/examples/${i}`);
      }
    } catch (error) {
      if (error instanceof ManifestError) throw error;
      fail("invalid_schema", path);
    } finally {
      ajv.removeSchema(cap.inputSchema as JsonSchema); ajv.removeSchema(cap.outputSchema as JsonSchema);
    }
  }
  return value as Manifest;
}

// Anahtar sırasından bağımsız proje canonicalization'ı; RFC 8785/JCS iddiası değildir.
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(",")}}`;
  return JSON.stringify(value);
}
export function capabilityDigest(capability: Capability): string {
  // skillId agent'a özgü bağdır; aynı sözleşmeyi sunan iki agent farklı skillId kullanabilir.
  const { skillId: _binding, ...contract } = capability;
  return createHash("sha256").update(canonical(contract)).digest("hex");
}
