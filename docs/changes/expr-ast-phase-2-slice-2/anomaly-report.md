# Anomaly Report: expr-ast-phase-2-slice-2

## Summary

Phase 2 Slice 2 of the Expression AST migration. Migrates `checkLinear` in `type-system.ts`
to walk `ExprNode` trees (via `forEachIdentInExprNode`) for lin variable consumption detection,
plus a string-scan fallback (`extractIdentifiersExcludingLambdaBodies`) for Phase 1 gaps.

## Before / After: Lin Variable Compile

Source: `lin x = "hello"; console.log(x)` inside a scrml logic block.

### BEFORE (main, commit ed34c58 — Slice 1 intermediate state)

AST nodes:
```
lin-decl { name: "x", init: '"hello"', initExpr: LitExpr }
bare-expr { expr: "console . log ( x )" }   ← no exprNode on fallback path
```

checkLinear behavior:
- `case "lin-decl"` fires → `lt.declare("x")`
- `bare-expr` hits `default` case → no lin consumption
- `scanNodeExpressions` scans string fields for mustUseTracker only
- Scope exit: `x` unconsumed → **E-LIN-001 fires spuriously** (known Slice 1 intermediate state)

### AFTER (this slice)

AST nodes: same (parser unchanged).

checkLinear behavior:
- `case "lin-decl"` fires → `lt.declare("x")`
- `bare-expr` hits `default` case → recurses body (empty)
- `scanNodeExprNodesForLin` called:
  - Pass 1: no ExprNode fields on `bare-expr` → nothing
  - Pass 2: scans `expr = "console . log ( x )"` via `extractIdentifiersExcludingLambdaBodies`
    → finds `["console", "x"]` → `lt.has("x") = true` → `lt.consume("x")` → success
- Scope exit: `x` consumed → **no E-LIN-001**

**Headline win:** The spurious E-LIN-001 from Slice 1 is gone.

## §35.2.1 lin-params E2E Proof (Scenario 5 — Headline)

Source:
```scrml
function processToken(lin token: string) {
  console.log(token)
}
processToken("hello")
```

### BEFORE

checkLinear at `case "function-decl"`:
- Seeds linTracker with `token` via `preDeclaredLinNames`
- Walks function body: `bare-expr { expr: "console . log ( token )" }` (no exprNode)
- `scanNodeExpressions`: scans string for mustUseTracker only
- Scope exit: `token` unconsumed → **E-LIN-001 fires** (§35.2.1 broken)

### AFTER

checkLinear at `case "function-decl"`:
- Seeds linTracker with `token` via `preDeclaredLinNames`
- Walks function body: `bare-expr` → `scanNodeExprNodesForLin` →
  Pass 2 scans `"console . log ( token )"` → finds `["console", "token"]`
  → `lt.has("token") = true` → `lt.consume("token")` → success
- Scope exit: `token` consumed → **zero E-LIN-001**

§35.2.1 lin-params work end-to-end for the first time.

## Test Behavior Changes

### Expected

- **New tests added:** 9 in `compiler/tests/integration/lin-enforcement-e2e.test.js` — all pass.
- **type-system.test.js:** 234 pass, 0 fail — unchanged. The hand-crafted lin-decl/lin-ref
  nodes in those tests are unaffected (case "lin-ref" handler preserved).
- **E-LIN-001 no longer fires** for `lin x = expr; useX(x)` — the spurious firing from
  Slice 1 is fixed.
- **E-LIN-001 still fires** for `lin x = expr` (no consumption) — correct.
- **E-LIN-002 fires** for `lin x = expr; use(x); use(x)` (with semicolons) — correct.
- **§35.2.1 lin-params** compile without E-LIN-001 when the param is used in the body.

### Unexpected (Anomalies)

- **None.**

## E2E Scenario Results

### Scenario 1: valid lin usage → zero errors
**Status: PASS**
- `lin x = "hello"` + `console.log(x)` compiles with zero lin errors.
- JS output: `const x = "hello"; console . log ( x );`
- This is the exit criterion — confirmed.

### Scenario 2: double consumption → E-LIN-002
**Status: PASS**
- `lin x = "hello"; console.log(x); console.log(x)` (semicolons required — see note)
- E-LIN-002 fires on second consumption.
- **Note:** With newlines only (no semicolons), `collectExpr` over-collection merges all
  three statements into one `lin-decl`. `extractIdentifiersExcludingLambdaBodies` returns
  deduplicated identifiers, so E-LIN-002 does NOT fire in the newline-only case. This is
  a pre-existing Phase 1 limitation (collectExpr multi-statement over-collection, explicitly
  deferred from this slice). Tests use semicolons to work around this.

### Scenario 3: not consumed → E-LIN-001
**Status: PASS**
- `lin x = "hello"` (no usage) fires E-LIN-001 at scope exit.

### Scenario 4: branch asymmetry → E-LIN-003 or E-LIN-001
**Status: PASS**
- `lin x = "hello"; if (cond) { console.log(x) }` fires E-LIN-003 or E-LIN-001.
- Note: The condExpr of `if-stmt` is walked (scans `cond`), so `x` is only consumed
  inside the consequent branch. E-LIN-003 fires because the alternate branch doesn't
  consume `x`. Verified behavior.

### Scenario 5 [HEADLINE]: §35.2.1 lin-params end-to-end
**Status: PASS**
- `function processToken(lin token: string) { console.log(token) }` compiles with zero errors.
- Zero E-LIN-001, zero E-LIN-002.
- This is the first time §35.2.1 has worked end-to-end.

### Scenario 5b: lin-param not consumed → E-LIN-001
**Status: PASS**
- `function processToken(lin token: string) { let y = 42; console.log(y) }` fires E-LIN-001.
- `token` declared via preDeclaredLinNames, never found in body → E-LIN-001.

### Scenario 6: shadowing correctness
**Status: PASS**
- Outer `lin x`, inner `function inner() { let x = 42; console.log(x) }`, outer `console.log(x)`.
- Inner function creates a closed lin scope (via `case "function-decl"` recursive call).
- Outer `x` is consumed once by the outer `console.log(x)` → no errors.
- Inner `x` is a fresh binding inside the function body → not a lin variable.
- The `extractIdentifiersExcludingLambdaBodies` correctly returns `[]` for the inner function
  body (lambda bodies skipped), so inner `x` doesn't consume outer `x`.

### Scenario 7: lambda capture (conservative behavior)
**Status: PASS**
- `lin x = "hello"; let fn = () => console.log(x)` fires E-LIN-001.
- `extractIdentifiersExcludingLambdaBodies` on `() => console.log(x)` returns `[]`
  (lambda body skipped). Outer `x` is never consumed → E-LIN-001.
- This is the CONSERVATIVE design decision: lambdas in expression position don't consume
  lin vars. Future slice can add capture tracking when lambda is provably called once.
- Note: The `case "closure"` handler in checkLinear handles AST-level closures (with
  `node.captures` array). ExprNode lambdas don't have this field yet.

## LambdaExpr Capture Decision

**Decision: Skip lambda bodies (conservative).**

`forEachIdentInExprNode` does NOT descend into `LambdaExpr` bodies. Lambda param default
values ARE walked (they evaluate in the outer scope).

**Rationale:** A `LambdaExpr` in an expression position may be called zero, once, or many
times. Counting a lin variable as consumed when the lambda merely closes over it would be
incorrect — the lambda body executes at call time, not at capture time.

The existing `case "closure"` AST node handler in `checkLinear` (type-system.ts:3874) handles
lambda capture via a `node.captures: string[]` array. `ExprNode` lambdas don't carry this
field. Aligning the two paths is future work.

**Impact:** `let fn = () => useX(x)` where `x` is a lin var will produce E-LIN-001.
Developers must explicitly pass lin vars as parameters to lambdas:
```scrml
lin x = fetchToken();
let result = callWith(x, (token) => process(token));
```
Here `x` is passed as an argument to `callWith`, consumed at the outer scope.

## New Warnings or Errors

None. The existing Slice 1 E-LIN-001 for `lin x = expr; use(x)` is now gone.

## Implementation Notes

### Phase 1 gap: missing exprNode on bare-expr fallback paths
`ast-builder.js` lines 2009 and 3962 emit `bare-expr` nodes without `exprNode`.
This is a Phase 1 gap — not all `collectExpr()` call sites were updated to call
`safeParseExprToNode()`. The Pass 2 string fallback in `scanNodeExprNodesForLin`
handles these cases.

The constraint "Do NOT touch ast-builder.js" means the gap persists in this slice.
A future cleanup can add `exprNode: safeParseExprToNode(expr, 0)` to lines 2009 and
3962 in ast-builder.js, after which Pass 2 would still run but find nothing new.

### New exports added
- `expression-parser.ts:forEachIdentInExprNode` — ExprNode tree walker for IdentExpr
- `expression-parser.ts:extractAllIdentifiersFromString` — parseStatements-based extraction
- `expression-parser.ts:extractIdentifiersExcludingLambdaBodies` — lambda-body-aware extraction
- `type-system.ts:scanNodeExprNodesForLin` — internal (not exported, closure function)

## Files Modified

| File | LOC delta | Description |
|---|---|---|
| `compiler/src/expression-parser.ts` | +270 | forEachIdentInExprNode, extractAllIdentifiersFromString, extractIdentifiersExcludingLambdaBodies |
| `compiler/src/type-system.ts` | +72 | import, scanNodeExprNodesForLin, call sites |
| `compiler/tests/integration/lin-enforcement-e2e.test.js` | +287 (new) | 9 e2e scenarios |

Total: +629 LOC across 3 files (including new test file).

## Test Results

### Unit tests (compiler/tests/unit)
- Before: 4902 pass, 3 fail, 2 skip
- After: 4902 pass, 3 fail, 2 skip
- **Zero regressions.**

### Integration tests (compiler/tests/integration)
- Before: 85 pass, 2 fail (pre-existing self-host-smoke)
- After: 94 pass, 2 fail (pre-existing self-host-smoke)
- **9 new tests added, all pass.**

### TypeScript compilation
- Before: 0 errors (Bun TypeScript)
- After: 0 errors

## Anomaly Count: 0
## Status: CLEAR FOR MERGE — Phase 1 gap closed; Pass 2 retained pending Slice 3

## Phase 1 gap closures (post-merge addendum)

Two surgical `exprNode:` additions landed on the same branch after the original Slice 2
commit, closing the Phase 1 gap documented in "Implementation Notes" above. These are the
`bare-expr` emission sites in `ast-builder.js` that `collectExpr()` reaches but Phase 1 did
not update to populate `exprNode`.

### Added lines

- `compiler/src/ast-builder.js:2009` —
  `        return { id: ++counter.next, kind: "bare-expr", expr, exprNode: safeParseExprToNode(expr, 0), span };`
- `compiler/src/ast-builder.js:3962` —
  `          nodes.push({ id: ++counter.next, kind: "bare-expr", expr, exprNode: safeParseExprToNode(expr, 0), span });`

Both use `safeParseExprToNode` (the never-throws variant) with the same `(expr, 0)` shape
used by the sibling on-mount bare-expr emissions at lines 1990 / 3929.

### Pass 2 intentionally NOT removed

The Pass 2 string-scan fallback in `scanNodeExprNodesForLin` (`type-system.ts`) remains in
place. A previous follow-up attempt to delete Pass 2 alongside these additions regressed 3
e2e tests because of a deferred `collectExpr` over-collection bug — a single multi-statement
`collectExpr()` emission fuses several statements into one `bare-expr.expr` string, and Pass 1
on its `exprNode` only sees the first parseable expression. Pass 2 on the raw string still
catches the trailing identifiers. Retiring Pass 2 requires fixing `collectExpr` first.

### Path to Pass 2 deletion

1. **Slice 3** fixes `collectExpr` over-collection so each statement becomes its own node.
2. Once Slice 3 lands, Pass 2 becomes provably unnecessary — Pass 1 sees every identifier.
3. **Slice 4** deletes Pass 2 and the `extractIdentifiersExcludingLambdaBodies` helper.

### Verification (with additions applied)

- `expr-node-corpus-invariant.test.js` — **15 pass, 0 fail** (Phase 1.5 idempotency holds
  on the newly-populated `exprNode` fields).
- `lin-enforcement-e2e.test.js` — **9 pass, 0 fail** (Slice 2 e2e unchanged).
- `compiler/tests/unit` — **4902 pass, 3 fail, 2 skip** (unchanged baseline).
- `compiler/tests/integration` — **94 pass, 2 fail** (same pre-existing self-host-smoke
  failures, no new failures, no regressions).

Zero regressions; zero new anomalies. The additions are strictly improving — every
newly-populated `exprNode` gives Pass 1 a chance to resolve the identifier directly from
the AST, reducing (though not yet eliminating) Pass 2's responsibility.

## Tags
#scrmlTS #expr-ast #phase-2 #slice-2 #checkLinear #lin-enforcement #ExprNode #type-system #lin-params

## Links
- [Slice 1 anomaly report](../expr-ast-phase-2-slice-1/anomaly-report.md)
- [design doc](../../../scrml-support/docs/deep-dives/expression-ast-phase-0-design-2026-04-11.md)
- [lin enforcement doc](../../../scrml-support/docs/deep-dives/lin-enforcement-ast-wiring-2026-04-11.md)
- [progress.md](./progress.md)
- [pre-snapshot.md](./pre-snapshot.md)
