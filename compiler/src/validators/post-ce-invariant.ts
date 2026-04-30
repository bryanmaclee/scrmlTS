/**
 * VP-2 — Post-CE Invariant Check
 *
 * Walks the AST after Component Expansion (CE) and emits a hard error
 * when any `isComponent: true` markup node remains. Closes the
 * F-COMPONENT-001 silent-failure window where the CE stage left a
 * phantom component reference in the tree and downstream codegen
 * happily emitted `document.createElement("UserBadge")`.
 *
 * Emits: E-COMPONENT-035 — residual component reference after CE.
 *
 * The architectural fix (cross-file CE actually working in every shape
 * the silent path currently covers) is W2 territory. This pass closes
 * the SILENT-EMISSION window now: if CE didn't resolve the reference,
 * compilation fails loudly with a precise error code at the call site.
 *
 * Per PIPELINE.md Stage 3.2 (deep-dive §11.3 D3): residual
 * `isComponent: true` SHALL be a downstream error. This pass IS that
 * downstream error — VP-2 reconciles the line 614 vs 639 tension.
 *
 * Cross-reference:
 *   - SPEC §15 (component definition) — post-CE invariant amendment.
 *   - PIPELINE.md Stage 3.2 — fail-fast at CE exit.
 *   - F-COMPONENT-001 — closed silent-failure window after this pass lands.
 *   - examples/22-multifile/ — currently silent-passes; will fail with
 *     E-COMPONENT-035 after this pass is wired in.
 */

import type { Span, FileAST, ASTNode, MarkupNode } from "../types/ast.ts";

// ---------------------------------------------------------------------------
// Diagnostic shape — matches CEError shape used by the existing component
// expander, so api.js's collectErrors picks it up unchanged.
// ---------------------------------------------------------------------------

export interface PostCEInvariantError {
  code: string;
  message: string;
  span: Span;
  severity: "error";
}

// ---------------------------------------------------------------------------
// AST walk — collect every residual `isComponent: true` markup node.
// ---------------------------------------------------------------------------

interface MarkupWithComponentFlag extends MarkupNode {
  isComponent?: boolean;
}

function visit(node: unknown, residuals: MarkupWithComponentFlag[]): void {
  if (!node || typeof node !== "object") return;

  // Markup node with the component flag
  const candidate = node as { kind?: string };
  if (candidate.kind === "markup") {
    const m = node as MarkupWithComponentFlag;
    if (m.isComponent === true) {
      residuals.push(m);
    }
    if (Array.isArray(m.children)) {
      for (const child of m.children) visit(child, residuals);
    }
    if (Array.isArray(m.attrs)) {
      for (const a of m.attrs) {
        // Some attribute values may carry nested expression nodes; not relevant
        // for this pass. We only look at markup descendants.
        if (a && typeof a === "object" && (a as { kind?: string }).kind === "markup") {
          visit(a, residuals);
        }
      }
    }
  }

  // Logic block: walk body
  if (candidate.kind === "logic") {
    const lb = node as { body?: unknown[] };
    if (Array.isArray(lb.body)) {
      for (const child of lb.body) visit(child, residuals);
    }
  }

  // Other node kinds: walk known recursive containers.
  // - lift expressions carry an inline target node
  // - if/else/for/each carry branches
  const generic = node as Record<string, unknown>;
  if (Array.isArray(generic.children)) {
    for (const c of generic.children as unknown[]) visit(c, residuals);
  }
  if (Array.isArray(generic.body)) {
    for (const c of generic.body as unknown[]) visit(c, residuals);
  }
  if (Array.isArray(generic.branches)) {
    for (const c of generic.branches as unknown[]) visit(c, residuals);
  }
  if (Array.isArray(generic.arms)) {
    for (const c of generic.arms as unknown[]) visit(c, residuals);
  }
  if (generic.target && typeof generic.target === "object") {
    // LiftTarget: { kind: "markup", node } | { kind: "expr", expr }
    const t = generic.target as { kind?: string; node?: unknown };
    if (t.kind === "markup" && t.node) visit(t.node, residuals);
  }
  if (generic.then && typeof generic.then === "object") visit(generic.then, residuals);
  if (generic.else && typeof generic.else === "object") visit(generic.else, residuals);
}

// ---------------------------------------------------------------------------
// Public entry — single file
// ---------------------------------------------------------------------------

/**
 * Run VP-2 over a single file's AST. Returns the list of residual-component
 * errors found. Does NOT mutate the AST.
 *
 * @param file { filePath, ast } — post-CE file record.
 * @returns array of PostCEInvariantError. Empty when CE resolved everything.
 */
export function runPostCEInvariantFile(file: {
  filePath: string;
  ast: FileAST | null | undefined;
}): PostCEInvariantError[] {
  const errors: PostCEInvariantError[] = [];
  const ast = file.ast;
  if (!ast) return errors;

  const residuals: MarkupWithComponentFlag[] = [];
  const nodes: ASTNode[] = ast.nodes ?? [];
  for (const n of nodes) visit(n, residuals);

  for (const r of residuals) {
    const tag = r.tag ?? "<unknown>";
    const span = r.span ?? { file: file.filePath, start: 0, end: 0, line: 1, col: 1 };
    errors.push({
      code: "E-COMPONENT-035",
      message:
        `E-COMPONENT-035: Component \`${tag}\` survived component expansion (CE) but was not resolved. ` +
        `This is a post-CE invariant violation: every \`isComponent: true\` markup node MUST be ` +
        `expanded into HTML markup or rejected with E-COMPONENT-020 at CE time. The residual reference ` +
        `would otherwise be silently emitted as \`document.createElement("${tag}")\`, producing a ` +
        `phantom DOM element with no content. ` +
        `Likely cause: cross-file component import is not yet supported in this consumption shape ` +
        `(see F-COMPONENT-001 deep-dive). ` +
        `Workaround: wrap the component call in an HTML element inside a \`lift\` expression, e.g. ` +
        `\`lift <div><${tag}/></div>\`.`,
      span,
      severity: "error",
    });
  }

  return errors;
}

/**
 * Run VP-2 over a multi-file CE output set. Returns the merged error list.
 */
export function runPostCEInvariant(input: {
  files: Array<{ filePath: string; ast: FileAST | null | undefined }>;
}): { errors: PostCEInvariantError[] } {
  const all: PostCEInvariantError[] = [];
  for (const f of input.files) {
    const fileErrors = runPostCEInvariantFile(f);
    all.push(...fileErrors);
  }
  return { errors: all };
}
