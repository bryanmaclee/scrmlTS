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

import type { Span, FileAST } from "../types/ast.ts";
import { walkFileAst } from "./ast-walk.ts";

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
// Public entry — single file
// ---------------------------------------------------------------------------

/**
 * Run VP-2 over a single file's AST. Returns the list of residual-component
 * errors found. Does NOT mutate the AST.
 */
export function runPostCEInvariantFile(file: {
  filePath: string;
  ast: FileAST | null | undefined;
}): PostCEInvariantError[] {
  const errors: PostCEInvariantError[] = [];
  const ast = file.ast;
  if (!ast) return errors;

  walkFileAst(ast, (node) => {
    if (!node || typeof node !== "object") return;
    const n = node as { kind?: string; tag?: string; isComponent?: boolean; span?: Span };
    if (n.kind !== "markup") return;
    if (n.isComponent !== true) return;
    const tag = n.tag ?? "<unknown>";
    const span = n.span ?? { file: file.filePath, start: 0, end: 0, line: 1, col: 1 };
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
  });

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
    all.push(...runPostCEInvariantFile(f));
  }
  return { errors: all };
}
