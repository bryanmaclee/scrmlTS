# Progress: expr-ast-phase-2-slice-2

## Decomposition Plan

Step 1: `compiler/src/expression-parser.ts` — add `forEachIdentInExprNode(node, callback)` export
Step 2: `compiler/src/type-system.ts` — add `scanNodeExprNodesForLin` + call site in `walkNode`
Step 3: `compiler/tests/integration/lin-enforcement-e2e.test.js` — 9-scenario e2e test file

## Baseline

- Unit tests: 4902 pass, 3 fail (pre-existing), 2 skip
- Integration tests: 85 pass, 2 fail (pre-existing self-host-smoke failures)
- Branch: `changes/expr-ast-phase-2-slice-2`

## Status

- [x] Branch created (fcffe4a)
- [x] pre-snapshot written (fcffe4a)
- [x] Step 1 (expression-parser.ts) complete (099e218)
- [x] Step 2 (type-system.ts) complete (b39a2f1 + 88b430d)
- [x] Step 3 (integration tests) complete (88b430d)
- [x] bun test passing (4902 unit, 94 integration — no regressions)
- [x] Anomaly report written

## Key Decisions Made

### collectExpr over-collection workaround (Pass 2 string scan)
The core issue: `lin x = "hello"\nconsole.log(x)` (no semicolons) is collected as
a single `lin-decl { init: '"hello"\nconsole.log(x)' }` because `collectExpr` does
not stop at newlines. The `initExpr` is only `LitExpr("hello")` (Acorn stops at
the first expression). Pass 2 uses `extractIdentifiersExcludingLambdaBodies` on the
full `init` string to find identifiers in the over-collected content.

### Lambda body exclusion (conservative)
`extractIdentifiersExcludingLambdaBodies` skips arrow function and function expression
bodies. This means `lin x = "hello"; let fn = () => useX(x)` produces E-LIN-001
(x not consumed at outer scope). This is the conservative choice: the lambda may be
called zero, one, or many times — we can't guarantee exactly-once consumption.
Document: future slice should add capture-based lin consumption.

### Same-node deduplication (consumedThisNode set)
When both Pass 1 (ExprNode walk) and Pass 2 (string scan) find the same identifier
on the same AST node, only the first occurrence is consumed. A Set called
`consumedThisNode` prevents double-counting within one node. Cross-node
double-consume (two separate bare-expr nodes) correctly fires E-LIN-002.
