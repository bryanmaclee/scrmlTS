# Diagnosis — F-NULL-001 + F-NULL-002

**Date:** 2026-04-30
**Stage location:** GCP3 (Gauntlet Phase 3 equality checks)
**Module:** `compiler/src/gauntlet-phase3-eq-checks.js`
**Wired at:** `compiler/src/api.js:524` (Stage 3.06, post-TAB)

## Summary

F-NULL-001 ("machine-context-dependent") and F-NULL-002 ("server-fn-body
boundary-dependent") are two FRICTION-MD descriptions of the **same**
underlying bug surface. The asymmetry has nothing to do with `<machine>`
presence or markup-vs-server-boundary. It is entirely the result of two
**incomplete walker** invariants in the GCP3 detector:

1. `walkAst` inspects only `n.condExpr | n.initExpr | n.exprNode | n.argsExpr`
   on each AST node. It NEVER inspects `n.attrs[*].value.exprNode` on markup
   nodes. **Markup attribute expressions (`if=`, `class=`, `style=`, etc.) bypass GCP3 entirely.**

2. `forEachEqualityBinary` descends through eleven hard-coded ExprNode keys
   using JS-AST conventions (`test`, `arguments`, `properties`) and misses
   scrml-AST keys (`condition`, `args`, `props`). **Ternary conditions and
   call arguments are unreachable** unless they happen to be the top of the
   subtree.

These two gaps explain every reported asymmetry:

| Position | Path through walker | Detector reaches `binary` op | FRICTION report |
|---|---|---|---|
| `function-decl.body[i].if-stmt.condExpr` | walkAst.body → if-stmt.condExpr → forEach | YES | rejected (correct) |
| `function-decl.body[i].return-stmt.exprNode` | walkAst.body → return.exprNode → forEach | YES | rejected (correct) |
| `markup.attrs[j].value.exprNode` | NOT reached | NO | **silent pass** (F-NULL-002) |
| `markup.children[].bare-expr.exprNode` (top-level binary) | walkAst.children → bare-expr.exprNode → forEach | YES | rejected (correct) |
| `markup.children[].bare-expr.exprNode` (binary inside ternary.condition) | walkAst.children → bare-expr.exprNode → forEach.condition (MISSED) | NO | **silent pass** |

## F-NULL-001 reframed

The M3 FRICTION observation ("file with `<machine>` rejects null literals,
without `<machine>` accepts them") **is no longer reproducible** at the
post-W1 baseline (`1f640d5`). Both with-machine and without-machine
client-fn bodies fire E-SYNTAX-042 equally. Possible explanations:

- The original M3 build pre-dated some pipeline plumbing; a TAB-stage
  difference (e.g., function bodies parsed differently when `<machine>` was
  also present in the file) may have caused the walker to traverse different
  nodes. By the post-W1 baseline, all client-fn bodies present a uniform
  `function-decl.body[*].if-stmt.condExpr` shape, so the asymmetry no longer
  presents from the machine-presence axis.
- The M3 file `pages/driver/hos.scrml` was patched away from `null` literals
  the same day as F-NULL-001 was filed (commit `df4e4f1`), so the
  observation was never re-verified post-fix. The "incidental" hypothesis is
  consistent with the empirical data.

Either way, the W3 fix subsumes F-NULL-001: closing the walker gaps so all
positions of `== null` / `!= null` are uniformly rejected naturally
encompasses the "machine-present client-fn" path that F-NULL-001 originally
flagged.

## F-NULL-002 reframed

F-NULL-002 ("`!= null` / `== null` in server-fn bodies fires E-SYNTAX-042 in
GCP3 with no line number — markup-side null comparisons accepted") is
literally describing the gap exposed by `walkAst` not visiting
`markup.attrs[*].value.exprNode`. Server-fn bodies travel through
`function-decl.body[*].if-stmt.condExpr` (visited) while markup-attr
expressions live at `markup.attrs[*].value.exprNode` (NOT visited).

The "no line number" sub-bug in F-NULL-002 is a separate concern: the
existing `spanFromExprNode` correctly attaches a span object to every emit,
but the CLI/error-formatting downstream may not be rendering line/col when
the `exprNode.span` is sparse. Verified: the diagnostic shape returned IS
`{file, start, end, line, col}` — but the ExprNode `span` may be missing or
sparse depending on parse path, falling back to the AST node's `span`. This
is good enough for column-level diagnostics in the function-body path, but
the W3 fix ensures the markup-attr path emits with attribute-position-level
spans (via the new attribute-walker injection point).

## Fix shape (per deep-dive §5.1 M11 strategy)

> **(B) Piecemeal — per-detector fix; align with §42 rules**

Per spec §42.7 ("`null` and `undefined` SHALL NOT be valid scrml source
tokens in value position"), the normative position is **reject everywhere**.
The W3 fix:

1. **Extend `walkAst` to visit attribute expressions.** When walking a
   markup node, inspect each `attrs[j]` whose `value.kind === "expr"` and
   walk `value.exprNode` through the eq-finder.

2. **Extend `forEachEqualityBinary` to cover all scrml-AST ExprNode keys.**
   Add `condition`, `args`, `props` (descending into prop-key/value
   pairs), `subject`, `rawArms`, `body`, `index`. Switch from a hard-coded
   key list to "descend every object/array-valued field except `span`,
   `kind`, `raw`, `op`, `name`, `litType`, `value` (when literal)" so future
   ExprNode shapes don't silently slip past.

3. **Diagnostic-quality fix.** Verify `spanFromExprNode` produces non-zero
   line/col on ALL emits, especially the new attribute-position path. The
   ExprNode `span` set by the expression parser carries baseOffset-correct
   line/col for in-source spans; we'll trust those for the new walker
   entries.

4. **Test coverage.** Add `compiler/tests/unit/gauntlet-phase3-null-coverage.test.js`
   with named tests for each previously-asymmetric position.

## Out-of-scope (held for supervisor)

The detector currently only catches `==` / `!=` comparisons against null.
**Bare `null` literals in value position** (e.g., `@x = null`,
`return null`, `{ field: null }`, `[null, ...]`) silently pass — violating
§42.7 directly.

The dispatch app exercises this pattern (`@driver = null`, `@user = null`).
Closing it is a logical extension of the W3 work but **expands scope beyond
the F-NULL-001/002 charter**. Recommended as a separate dispatch (W3.1 — bare-null-literal sweep).
