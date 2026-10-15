export const VERSION: '1.0.0';
export const PROFILE_IDS: Readonly<{ generation: 'ifa-demo/code-generation'; review: 'ifa-demo/code-review'; tests: 'ifa-demo/test-generation' }>;
export type ProfileId = typeof PROFILE_IDS[keyof typeof PROFILE_IDS];
export interface Profile { id: ProfileId; version: typeof VERSION }
export type ValueType = 'int' | 'bool' | 'str' | 'list[int]' | 'list[str]';
export interface FunctionSpec {
  language: 'python'; functionName: string; parameters: { name: string; type: ValueType }[];
  returnType: ValueType; requirements: string[];
}
export interface GenerationInput { spec: FunctionSpec }
export interface CodeInput extends GenerationInput { code: string }
export interface GenerationOutput { code: string; explanation: string }
export interface ReviewOutput {
  verdict: 'no_findings' | 'changes_requested';
  findings: { id: string; severity: 'info' | 'warning' | 'error'; message: string; suggestion: string; line?: number }[];
  summary: string;
}
export interface TestOutput { framework: 'unittest'; tests: string; scenarios: string[] }
export interface Inputs {
  'ifa-demo/code-generation': GenerationInput;
  'ifa-demo/code-review': CodeInput;
  'ifa-demo/test-generation': CodeInput;
}
export interface Outputs {
  'ifa-demo/code-generation': GenerationOutput;
  'ifa-demo/code-review': ReviewOutput;
  'ifa-demo/test-generation': TestOutput;
}
export const schemas: Readonly<Record<ProfileId, { readonly input: Readonly<Record<string, unknown>>; readonly output: Readonly<Record<string, unknown>> }>>;
export const functionSpecSchema: Readonly<Record<string, unknown>>;
export class ContractError extends Error { readonly code: string; readonly path: string; constructor(code: string, path: string) }
export function validateFunctionSpec(value: unknown): FunctionSpec;
export function validateInput<P extends ProfileId>(profile: { id: P; version: string }, value: unknown): Inputs[P];
export function validateOutput<P extends ProfileId>(profile: { id: P; version: string }, value: unknown, input: unknown): Outputs[P];
