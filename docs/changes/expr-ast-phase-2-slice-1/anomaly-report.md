# Anomaly Report: expr-ast-phase-2-slice-1

## Summary

Phase 2 Slice 1 of the Expression AST migration. Promotes `lin` to a KEYWORD token,
adds `lin-decl` node emission in both parse loops of `ast-builder.js`, adds the
`LinDeclNode` type to `ast.ts`, and adds a `case "lin-decl"` codegen handler in
`emit-logic.ts` that emits `const <name> = <rewriteExpr(init)>`.

## Before / After: lin variable compile

Source: `lin x = "hello"; console.log(x)` inside a scrml logic block.

### BEFORE (main, commit cc85b38)

AST (from BS → TAB):
```
{ kind: "bare-expr", expr: "lin" }    ← lin tokenizes as IDENT; falls through to bare-expr
{ kind: "tilde-decl", name: "x", init: '"hello"' }  ← x = expr matched by IDENT = guard
```

JS output from emit-logic.ts:
```
// bare-expr("lin") → dropped by line 246: /^[a-zA-Z_$][a-zA-Z0-9_$]*$/ guard
const x = "hello";  ← emitted by tilde-decl handler (incidental — not lin-aware)
console . log ( x );
```

checkLinear behavior: **never ran** — no lin-decl nodes in AST. lin enforcement bypassed.

### AFTER (this slice)

AST (from BS → TAB):
```
{ kind: "lin-decl", name: "x", init: '"hello"', initExpr: LitExpr("hello"), span: ... }
```

JS output from emit-logic.ts:
```
const x = "hello";  ← emitted by new case "lin-decl" handler
console . log ( x );
```

checkLinear behavior: **runs** — lin-decl node is emitted → `lt.declare("x")` called at
type-system.ts:3656. E-LIN-001 fires because `console.log(x)` is a `bare-expr` node
(no `lin-ref` for x yet — that's Slice 2).

**Headline win:** `lin x = expr` now produces a properly-named `lin-decl` node that
feeds the linear type enforcer. The variable continues to appear in JS as `const`.

## Test Behavior Changes

### Expected
- **New tests added:** 13 integration tests in `compiler/tests/integration/lin-decl-emission.test.js` — all pass.
- **type-system.test.js:** 234 pass, 0 fail — unchanged. The hand-crafted lin-decl/lin-ref AST arrays in those tests are unaffected by parser changes.
- **E-LIN-001 now fires** for `lin x = expr` where `x` is referenced only as a `bare-expr` (not as a `lin-ref`). This is expected behavior — checkLinear now sees lin-decl nodes and correctly reports the variable as unconsumed. This is the correct intermediate state before Slice 2.

### Unexpected (Anomalies)
- **None.**

## E2E Output Changes

### Expected
- `lin x = expr` compiles to `const x = ...` via the new `case "lin-decl"` handler.
  Previously also compiled to `const x = ...` via `tilde-decl` handler (incidentally).
  The JS output is **identical** — the semantic path changed, the surface JS did not.

### Unexpected (Anomalies)
- **None.**

## Files Modified

| File | LOC added | Description |
|---|---|---|
| `compiler/src/tokenizer.ts` | +2 | Added `"lin"` to KEYWORDS set (§35.2 annotation) |
| `compiler/src/ast-builder.js` | +37 | Added lin-decl guard before tilde-decl in both parse loops (parseOneStatement + logic-body loop) |
| `compiler/src/types/ast.ts` | +15 | Added `LinDeclNode` interface; added to `LogicStatement` union |
| `compiler/src/codegen/emit-logic.ts` | +9 | Added `case "lin-decl"` emitting `const <name> = <rewriteExpr(init)>` |
| `compiler/tests/integration/lin-decl-emission.test.js` | +358 | New: 13 integration tests |

Total: +421 LOC across 5 files.

## tok.text === "lin" Sites Updated

No existing `tok.text === "lin"` statement-position checks existed in `ast-builder.js` prior to this slice. The design doc's "~5 locations" note referred to future sites. The two newly added guards are:

- `compiler/src/ast-builder.js:1861` — `parseOneStatement` (recursive body loop)
- `compiler/src/ast-builder.js:3864` — `parseLogicBody` (outer logic-body loop)

Both use the correct form: `tok.kind === "KEYWORD" && tok.text === "lin"`.

The `parseParamList` function (line 2190) uses a string-based `LIN_PREFIX` regex on the assembled
param string. This continues to work after `lin` becomes KEYWORD because the tokenizer's
KEYWORD spacing logic (line 2235 in ast-builder.js) inserts a space before KEYWORD tokens
during string assembly, producing `"lin x"` which matches `LIN_PREFIX`.

## Codegen Case Added

`compiler/src/codegen/emit-logic.ts` lines 933-941 (just before `default: return ""`):

```typescript
case "lin-decl": {
  // §35.2: lin bindings are immutable — emit as `const`.
  // Phase 2: codegen walks the string form (node.init). Phase 3 will switch to ExprNode emission.
  if (!node.name) return "";
  const linInit: string = node.init ?? "";
  if (!linInit.trim()) return `const ${node.name};`;
  return `const ${node.name} = ${rewriteExpr(linInit)};`;
}
```

## Test Results

### Unit tests (compiler/tests/unit)
- Before: 4902 pass, 3 fail, 2 skip
- After: 4902 pass, 3 fail, 2 skip
- **Zero regressions.**

### Integration tests (compiler/tests/integration)
- Before: 72 pass, 2 fail (pre-existing self-host-smoke)
- After: 85 pass, 2 fail (pre-existing self-host-smoke)
- **13 new tests added, all pass.**

### TypeScript compilation
- Before: 0 errors
- After: 0 errors

## Deviations from Design

None. This slice implements exactly what the design doc specified:
- §3.5.1: `lin` promoted to KEYWORD
- OQ-2/OQ-8: lin-decl emission in Phase 2 Slice 1 (moved from "Phase 1 recommendation" to explicit Slice 1)
- §5.3: Phase 2 semantic pass precondition satisfied

## Scope Creep Check

No scope creep. Items explicitly deferred:
- `checkLinear` changes — Slice 2
- `lin-ref` detection — Slice 2
- String-form → ExprNode codegen switch — Phase 3
- `collectExpr` multi-statement over-collection fix — separate Phase 2 concern (not this slice)
- self-host `ast.scrml` update — Phase 5

## Anomaly Count: 0
## Status: CLEAR FOR MERGE

## Tags
#scrmlTS #expr-ast #phase-2 #slice-1 #lin-decl #lin-keyword #tokenizer #ast-builder #codegen

## Links
- [design doc](../../../scrml-support/docs/deep-dives/expression-ast-phase-0-design-2026-04-11.md)
- [lin enforcement doc](../../../scrml-support/docs/deep-dives/lin-enforcement-ast-wiring-2026-04-11.md)
- [progress.md](./progress.md)
- [pre-snapshot.md](./pre-snapshot.md)
