import { MAX_WORKFLOW_BYTES, workflowShapeErrors, type ShapeError } from "../../shared/workflow-contract.js";
import { checkWorkflow, type WorkflowDefinition, type WorkflowIssue } from "../domain/workflow.js";

export type WorkflowError = ShapeError | WorkflowIssue | { code: "workflow_too_large"; path: string };
export type ParsedWorkflow =
  | { ok: true; workflow: WorkflowDefinition; order: string[] }
  | { ok: false; errors: WorkflowError[] };

/**
 * Workflow tanımını kaydetmeden/çalıştırmadan önceki tek giriş noktası:
 * boyut → yapı (şema) → anlam (domain). Yapı hatalıysa anlamsal denetime
 * geçilmez; şemadan geçmemiş nesnede ilişki kuralları güvenilir değildir.
 */
export function parseWorkflow(value: unknown): ParsedWorkflow {
  const size = Buffer.byteLength(JSON.stringify(value) ?? "", "utf8");
  if (size > MAX_WORKFLOW_BYTES) return { ok: false, errors: [{ code: "workflow_too_large", path: "/" }] };
  const shape = workflowShapeErrors(value);
  if (shape.length) return { ok: false, errors: shape };
  const workflow = value as WorkflowDefinition;
  const { issues, order } = checkWorkflow(workflow);
  return order ? { ok: true, workflow, order } : { ok: false, errors: issues };
}
