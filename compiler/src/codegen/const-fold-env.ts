/* SPDX-License-Identifier: MIT
 *
 * S108 Bug 5 Phase 3 — File-level const-fold environment.
 *
 * Builds a `ConstFoldEnv` (from `constant-folder.ts`) populated with every
 * file-scope `const-decl` whose initExpr partially evaluates to a constant
 * value. Used by `emit-html.ts:emitNode` (logic-node branch) to fold
 * `${IDENT}` interpolations where `IDENT` is a compile-time-known constant
 * (the canonical adopter shape: `const VERSION = "v0.3.0"` + `${VERSION}`).
 *
 * SPEC §7.4.2 (S108 amendment) authorizes the fold:
 *   "When `expr` references NO reactive cells AND the expression collapses
 *    to a compile-time-known constant value, the compiler MAY inline the
 *    string value directly into the emitted HTML at that position."
 *
 * Pattern mirrors `auth-graph.ts:buildConstEnvForFile` (the §40.9 reachability
 * solver's const-binding builder). The two helpers serve different consumers
 * (auth-graph: closed-form auth predicate classification; this: markup
 * interpolation fold) but apply the same one-pass forward fold algorithm.
 * A future cleanup can unify; for now keeping them separate avoids a
 * codegen → reachability dep direction.
 *
 * Caching: result is stamped on `fileAST._constFoldEnvCache` so repeated
 * calls within a single emit pass don't re-walk. Cleared by the caller
 * when fileAST changes (none currently — emit-html runs once per file).
 */

import {
  partiallyEvaluateExpr,
  type ConstFoldEnv,
  type ConstResult,
  type ConstValue,
} from "./constant-folder.ts";

/**
 * Build (or retrieve cached) const-fold environment for a file AST.
 *
 * Walks every `const-decl` node reachable from `fileAST.nodes` (including
 * nested inside markup-position logic blocks per S101 §40.8 program-as-
 * container shape). For each const whose `initExpr` partially evaluates to
 * a constant under the env-built-so-far, records the binding in the map.
 *
 * One-pass forward fold (mirrors auth-graph.ts pattern): a later const may
 * reference an earlier one; cycles silently break to RUNTIME (the cyclic
 * decl's binding stays out of the map, and downstream consumers fall back
 * to runtime evaluation for that name).
 *
 * Caching: stamps the result on `fileAST._constFoldEnvCache`. Idempotent.
 */
export function getConstFoldEnvForFile(fileAST: any): ConstFoldEnv {
  if (!fileAST || typeof fileAST !== "object") {
    return { constBindings: new Map() };
  }
  const cached = (fileAST as any)._constFoldEnvCache as ConstFoldEnv | undefined;
  if (cached) return cached;

  const bindings = new Map<string, ConstValue>();
  const env: ConstFoldEnv = { constBindings: bindings };

  const constDecls = collectConstDecls(fileAST);
  for (const decl of constDecls) {
    if (!decl.initExpr) continue;
    const r: ConstResult = partiallyEvaluateExpr(decl.initExpr, env);
    if (r.kind === "constant") {
      bindings.set(decl.name, r.value);
    }
    // RUNTIME results stay out of the env — they cannot fold the
    // referencing `${IDENT}` interpolation, which falls through to the
    // non-constant path (placeholder + one-shot binding per Phase 1/2 β).
  }

  (fileAST as any)._constFoldEnvCache = env;
  return env;
}

/**
 * Walk file AST nodes for `const-decl` shapes (and the const-form
 * `state-decl{isConst:true}` derived-cell — included for completeness but
 * derived-cells are always RUNTIME because they read reactive cells, so
 * they're effectively a no-op in the fold).
 *
 * Recurses into markup-position logic blocks per S101 program-as-container.
 */
function collectConstDecls(
  fileAST: any,
): Array<{ name: string; initExpr: any }> {
  const out: Array<{ name: string; initExpr: any }> = [];
  const seen = new WeakSet<object>();

  function visit(node: any): void {
    if (!node || typeof node !== "object") return;
    if (seen.has(node)) return;
    seen.add(node);
    if (Array.isArray(node)) {
      for (const n of node) visit(n);
      return;
    }
    // const-decl (plain `const NAME = expr`).
    if (node.kind === "const-decl" && typeof node.name === "string" && node.initExpr) {
      out.push({ name: node.name, initExpr: node.initExpr });
      return;
    }
    // state-decl with isConst: true (derived-cell form `const <x> = expr`)
    // — included for parity with auth-graph but always RUNTIME because the
    // initExpr references reactive cells.
    if (node.kind === "state-decl" && node.isConst === true && typeof node.name === "string" && node.initExpr) {
      out.push({ name: node.name, initExpr: node.initExpr });
      return;
    }
    // Recurse into known container fields. Mirror the file-AST walk shape
    // used in emit-match.ts:collectMatchBlocks + auth-graph.ts:collectConstDecls.
    for (const key of ["nodes", "body", "children", "bodyChildren", "arms"]) {
      if (Array.isArray(node[key])) {
        for (const child of node[key]) visit(child);
      }
    }
  }

  // Codegen pipeline may wrap the raw AST inside `fileAST.ast` — mirror the
  // shape-tolerant access pattern from codegen/index.ts line 390:
  //   `const nodes = (fileAST as any).ast?.nodes ?? (fileAST as any).nodes ?? [];`
  const rootNodes = fileAST.ast?.nodes ?? fileAST.nodes ?? fileAST;
  visit(rootNodes);
  return out;
}

/**
 * Convenience wrapper: try to constant-fold a single ExprNode against the
 * file-level const env. Returns the folded string value (per JavaScript
 * `String()` coercion per SPEC §7.4.2) or `null` when the expression
 * cannot fold to a constant primitive.
 *
 * Only primitive values fold (string, number, boolean). Compound results
 * (arrays, objects) return null — adopters who interpolate `${@cell.path}`
 * or `${someObj}` get the runtime String() coercion via the one-shot
 * binding path, NOT a compile-time `[object Object]` inline (which would
 * be a worse adopter experience).
 *
 * Returns null for `null` / `undefined` values — those should fall through
 * to the runtime path so the standard JavaScript String() coercion applies
 * (producing literal "null" / "undefined" strings per SPEC §7.4.2 normative
 * statement on null/undefined coercion).
 */
export function tryFoldInterpolation(exprNode: any, fileAST: any): string | null {
  if (!exprNode) return null;
  const env = getConstFoldEnvForFile(fileAST);
  const r = partiallyEvaluateExpr(exprNode, env);
  if (r.kind !== "constant") return null;
  const v = r.value;
  if (v === null || v === undefined) return null;
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
    return String(v);
  }
  // Compound (array / object) — fall through to runtime path.
  return null;
}

/**
 * HTML body-text escaping. Used for inlined folded values at markup
 * interpolation sites.
 *
 * The folded value is interpolated as inline text (not attribute value), so
 * the relevant XSS surfaces are `<`, `>`, and `&`. Quotes are NOT escaped
 * because they're legal in body text. This matches the contract of the
 * runtime path (which sets `el.textContent = value` — `textContent` does
 * the same escaping on read-back).
 */
export function escapeHtmlText(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
