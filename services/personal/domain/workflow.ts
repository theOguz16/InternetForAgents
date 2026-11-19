// Deklaratif workflow'un anlamsal kuralları (D02). Saf domain: yapı (alan tipleri,
// sınırlar) önceden şema ile doğrulanmış kabul edilir; burada adımlar arası ilişki
// ve güvenli referans kuralları denetlenir. Çalışma anı bağımlılığı yoktur.

export const WORKFLOW_VERSION = "ifa-workflow.v1";
export const MAX_STEPS = 16;
export const MAX_POINTER_LENGTH = 256;
export const MAX_POINTER_DEPTH = 8;

export interface CapabilityRef { id: string; version: string }
export type InputSource =
  | { source: "input"; pointer: string }
  | { source: "step"; step: string; pointer: string };
export interface WorkflowStep {
  id: string;
  capability: CapabilityRef;
  requires: { sideEffects: "none" };
  input: Record<string, InputSource>;
  outputs: string[];
  budget: { timeoutMs: number; maxOutputBytes: number };
  required: boolean;
}
export interface WorkflowDefinition {
  workflowVersion: typeof WORKFLOW_VERSION;
  id: string;
  version: string;
  title: string;
  steps: WorkflowStep[];
}

export type WorkflowIssueCode =
  | "duplicate_step" | "unknown_step" | "self_reference" | "cycle" | "missing_step_ref" | "unexpected_step_ref"
  | "invalid_pointer" | "unsafe_pointer" | "unknown_source_field" | "required_depends_on_optional";
export interface WorkflowIssue { code: WorkflowIssueCode; path: string; detail?: string }

// Nesne prototipine dokunabilecek segmentler: pointer çözümleyici bunları
// hiçbir zaman izlememeli; tanım aşamasında reddedilir.
const UNSAFE_SEGMENTS = new Set(["__proto__", "constructor", "prototype"]);

/**
 * RFC 6901 JSON Pointer segmentlerine ayırır; geçersizse undefined.
 * Yalnız düz pointer kabul edilir: ifade, şablon, joker veya fonksiyon yoktur.
 * "" belgenin tamamıdır; "~" yalnız "~0"/"~1" kaçışı olarak geçerlidir.
 */
export function pointerSegments(pointer: string): string[] | undefined {
  if (pointer === "") return [];
  if (!pointer.startsWith("/") || pointer.length > MAX_POINTER_LENGTH) return undefined;
  const raw = pointer.slice(1).split("/");
  if (raw.length > MAX_POINTER_DEPTH || raw.some(segment => /~(?![01])/.test(segment))) return undefined;
  return raw.map(segment => segment.replace(/~1/g, "/").replace(/~0/g, "~"));
}

/** a, b'nin kendisi ya da atası mı? (Segment bazında; "/co" "/code"un atası değildir.) */
function covers(ancestor: string[], path: string[]): boolean {
  return ancestor.length <= path.length && ancestor.every((segment, index) => segment === path[index]);
}

function checkPointer(pointer: string, path: string, issues: WorkflowIssue[]): string[] | undefined {
  const segments = pointerSegments(pointer);
  if (!segments) { issues.push({ code: "invalid_pointer", path }); return undefined; }
  if (segments.some(segment => UNSAFE_SEGMENTS.has(segment))) { issues.push({ code: "unsafe_pointer", path }); return undefined; }
  return segments;
}

/**
 * Şemadan geçmiş tanımın anlamsal denetimi. Sorun yoksa adımları bağımlılık
 * sırasıyla döner (aynı seviyedekiler tanım sırasını korur); sorun varsa sırayı
 * vermez, çünkü döngülü veya eksik referanslı tanım yürütülemez.
 */
export function checkWorkflow(workflow: WorkflowDefinition): { issues: WorkflowIssue[]; order?: string[] } {
  const issues: WorkflowIssue[] = [];
  const steps = new Map<string, WorkflowStep>();
  workflow.steps.forEach((step, index) => {
    if (steps.has(step.id)) issues.push({ code: "duplicate_step", path: `/steps/${index}/id`, detail: step.id });
    else steps.set(step.id, step);
  });

  const outputs = new Map<string, string[][]>();
  workflow.steps.forEach((step, index) => {
    const valid = step.outputs.map((pointer, o) => checkPointer(pointer, `/steps/${index}/outputs/${o}`, issues)).filter(Boolean) as string[][];
    if (!outputs.has(step.id)) outputs.set(step.id, valid);
  });

  const dependsOn = new Map<string, Set<string>>();
  workflow.steps.forEach((step, index) => {
    const deps = dependsOn.get(step.id) ?? new Set<string>();
    dependsOn.set(step.id, deps);
    for (const [field, mapping] of Object.entries(step.input)) {
      const path = `/steps/${index}/input/${field.replace(/~/g, "~0").replace(/\//g, "~1")}`;
      const segments = checkPointer(mapping.pointer, `${path}/pointer`, issues);
      if (mapping.source === "input") {
        if ("step" in mapping) issues.push({ code: "unexpected_step_ref", path: `${path}/step` });
        continue;
      }
      if (typeof mapping.step !== "string") { issues.push({ code: "missing_step_ref", path: `${path}/step` }); continue; }
      if (mapping.step === step.id) { issues.push({ code: "self_reference", path: `${path}/step` }); continue; }
      const source = steps.get(mapping.step);
      if (!source) { issues.push({ code: "unknown_step", path: `${path}/step`, detail: mapping.step }); continue; }
      deps.add(source.id);
      // Kaynak adım yalnız "outputs" ile açtığı alanları paylaşır: açılmamış
      // alanı okumak eksik kaynaktır ve minimum context ilkesini bozar.
      if (segments && !(outputs.get(source.id) ?? []).some(exposed => covers(exposed, segments))) {
        issues.push({ code: "unknown_source_field", path: `${path}/pointer`, detail: `${source.id}${mapping.pointer}` });
      }
      // İsteğe bağlı adım başarısız olabilir; ona bağlı zorunlu adım o zaman hiç
      // çalışamaz ve iş tamamlanamaz. Bu çelişki tanım aşamasında yakalanır.
      if (step.required && !source.required) issues.push({ code: "required_depends_on_optional", path: `${path}/step`, detail: source.id });
    }
  });

  const cycle = findCycle(workflow.steps.map(step => step.id), dependsOn);
  if (cycle) issues.push({ code: "cycle", path: "/steps", detail: cycle.join(" -> ") });
  if (issues.length) return { issues };
  return { issues, order: topologicalOrder(workflow.steps.map(step => step.id), dependsOn) };
}

function findCycle(ids: string[], dependsOn: Map<string, Set<string>>): string[] | undefined {
  const state = new Map<string, "visiting" | "done">();
  const stack: string[] = [];
  const visit = (id: string): string[] | undefined => {
    if (state.get(id) === "done") return undefined;
    if (state.get(id) === "visiting") return [...stack.slice(stack.indexOf(id)), id];
    state.set(id, "visiting"); stack.push(id);
    for (const dep of dependsOn.get(id) ?? []) { const found = visit(dep); if (found) return found; }
    stack.pop(); state.set(id, "done");
    return undefined;
  };
  // Rapor bağımlılık yönündedir: "a -> b -> a", a'nın b'ye, b'nin a'ya ihtiyaç duyduğu anlamına gelir.
  for (const id of ids) { const found = visit(id); if (found) return found; }
  return undefined;
}

function topologicalOrder(ids: string[], dependsOn: Map<string, Set<string>>): string[] {
  const order: string[] = [];
  const placed = new Set<string>();
  // En fazla 16 adım: basit tekrar taraması yeterli ve sırayı deterministik tutar.
  while (order.length < ids.length) {
    for (const id of ids) if (!placed.has(id) && [...dependsOn.get(id) ?? []].every(dep => placed.has(dep))) { order.push(id); placed.add(id); }
  }
  return order;
}
