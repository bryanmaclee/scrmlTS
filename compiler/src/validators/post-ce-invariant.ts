/**
 * VP-2 — Post-CE Invariant Check
 *
 * Walks the AST after Component Expansion (CE) and emits a hard error
 * when any markup node still resolves to `user-component` (per NR's
 * `resolvedKind`) — or, more importantly, when an unresolved tag with
 * an uppercase-first-char name (the F-COMPONENT-001 pattern) survives
 * CE without being expanded. Closes the silent-failure window where
 * the CE stage left a phantom component reference in the tree and
 * downstream codegen happily emitted `document.createElement("UserBadge")`.
 *
 * Emits: E-COMPONENT-035 — residual component reference after CE.
 *
 * The architectural fix (cross-file CE actually working in every shape
 * the silent path currently covers) is W2 territory. This pass closes
 * the SILENT-EMISSION window now: if CE didn't resolve the reference,
 * compilation fails loudly with a precise error code at the call site.
 *
 * Per PIPELINE.md Stage 3.2 (deep-dive §11.3 D3): a residual markup node
 * resolved to `user-component` SHALL be a downstream error. This pass IS
 * that downstream error — VP-2 reconciles the line 614 vs 639 tension.
 *
 * P3-FOLLOW: invariant flipped from `isComponent === true` to NR's
 * `resolvedKind` field plus an uppercase-first-char syntactic check (the
 * latter mirrors BS's isComponentName predicate without reading the legacy
 * `isComponent` boolean). NR is authoritative for routing; the syntactic
 * heuristic survives because BS's classification of an unknown tag as a
 * "component reference" is semantically distinct from NR's "user-component"
 * resolution kind — the post-CE invariant covers both.
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
    const n = node as {
      kind?: string;
      tag?: string;
      resolvedKind?: string;
      resolvedCategory?: string;
      span?: Span;
    };
    if (n.kind !== "markup") return;
    // P3-FOLLOW: route on NR's resolvedKind / resolvedCategory (authoritative).
    // VP-2 fires on:
    //   (a) resolvedKind === "user-component" — a known component CE should
    //       have expanded but didn't (cross-file expansion failure), OR
    //   (b) resolvedKind === "unknown" with an uppercase-first-char tag —
    //       the F-COMPONENT-001 pattern: BS classified the tag as a component
    //       reference (via the uppercase syntactic heuristic) but NR could not
    //       resolve it (no same-file decl, no import). This is the silent
    //       phantom-DOM emission case VP-2 was created to catch.
    // The uppercase-first-char heuristic mirrors BS's isComponentName predicate
    // (tag charCode in 'A'..'Z') without reading the legacy isComponent boolean.
    const tag = n.tag ?? "";
    const looksLikeComponent =
      tag.length > 0 && tag.charCodeAt(0) >= 65 && tag.charCodeAt(0) <= 90;
    const isResidualComponent =
      n.resolvedKind === "user-component" ||
      (n.resolvedKind === "unknown" && looksLikeComponent);
    if (!isResidualComponent) return;

    const tagDisplay = tag.length > 0 ? tag : "<unknown>";
    const span = n.span ?? { file: file.filePath, start: 0, end: 0, line: 1, col: 1 };
    errors.push({
      code: "E-COMPONENT-035",
      message:
        `E-COMPONENT-035: Component \`${tagDisplay}\` survived component expansion (CE) but was not resolved. ` +
        `This is a post-CE invariant violation: every markup node resolved to user-component (or unresolved with an uppercase tag) MUST be ` +
        `expanded into HTML markup or rejected with E-COMPONENT-020 at CE time. The residual reference ` +
        `would otherwise be silently emitted as \`document.createElement("${tagDisplay}")\`, producing a ` +
        `phantom DOM element with no content. ` +
        `Likely cause: cross-file component import is not yet supported in this consumption shape ` +
        `(see F-COMPONENT-001 deep-dive). ` +
        `Workaround: wrap the component call in an HTML element inside a \`lift\` expression, e.g. ` +
        `\`lift <div><${tagDisplay}/></div>\`.`,
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
