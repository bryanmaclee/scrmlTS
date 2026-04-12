# Progress: expr-ast-phase-2-slice-2

## Decomposition Plan

Step 1: `compiler/src/expression-parser.ts` — add `forEachIdentInExprNode(node, callback)` export
Step 2: `compiler/src/type-system.ts` — add `scanNodeExprNodesForLin` + call site in `walkNode`
Step 3: `compiler/tests/integration/lin-enforcement-e2e.test.js` — 7-scenario e2e test file

## Baseline

- Unit tests: 234 pass, 0 fail (type-system.test.js alone)
- Integration tests: 85 pass, 2 fail (pre-existing self-host-smoke failures)
- Branch: `changes/expr-ast-phase-2-slice-2` (to be created by implementation agent)

## Status

- [ ] Branch created
- [ ] pre-snapshot written
- [ ] Step 1 (expression-parser.ts) complete
- [ ] Step 2 (type-system.ts) complete
- [ ] Step 3 (integration tests) complete
- [ ] bun test passing
- [ ] Anomaly report written
