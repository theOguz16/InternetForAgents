import Ajv from "ajv";
export const profiles = { language: "text-language.v1", keywords: "text-keywords.v1", summary: "text-summary.v1" } as const;
export type Specialist = keyof typeof profiles;
export interface TextInput { profile: string; text: string }
export interface SpecialistResult { profile: string; mode: "fixture" | "deterministic" | "model"; output: unknown }
export interface SpecialistHandler { readonly mode: SpecialistResult["mode"]; execute(input: TextInput): Promise<SpecialistResult> }
const ajv = new Ajv({ allErrors: true });
// Aynı şemalar çalışma anında doğrulanır ve ekip için JSON olarak yayımlanır.
export const schemas = Object.fromEntries(Object.entries(profiles).map(([role, profile]) => {
  const output = role === "language"
    ? { type: "object", additionalProperties: false, required: ["language"], properties: { language: { enum: ["tr", "en", "und"] } } }
    : role === "keywords"
    ? { type: "object", additionalProperties: false, required: ["keywords"], properties: { keywords: { type: "array", maxItems: 10, uniqueItems: true, items: { type: "string", minLength: 1, maxLength: 128 } } } }
    : { type: "object", additionalProperties: false, required: ["summary"], properties: { summary: { type: "string", minLength: 1, maxLength: 2000 } } };
  return [profile, {
    input: { type: "object", additionalProperties: false, required: ["profile", "text"], properties: { profile: { const: profile }, text: { type: "string", minLength: 1, maxLength: 8000, pattern: "\\S" } } },
    result: { type: "object", additionalProperties: false, required: ["profile", "mode", "output"], properties: { profile: { const: profile }, mode: { enum: ["fixture", "deterministic", "model"] }, output } },
  }];
}));
const validators = Object.fromEntries(Object.entries(schemas).map(([id, schema]) => [id, { input: ajv.compile(schema.input), result: ajv.compile(schema.result) }]));
export function validInput(profile: string, value: unknown): value is TextInput { return validators[profile]?.input(value) === true; }
export function validResult(profile: string, value: unknown): value is SpecialistResult { return validators[profile]?.result(value) === true; }
