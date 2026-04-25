# Impact Analysis: expr-ast-phase-4d-step-8

## Change Summary
Delete the deprecated `expr?: string` field from `BareExprNode` (compiler/src/types/ast.ts).
Migrate every TypeScript consumer site that read `node.expr` (where `node.kind === "bare-expr"`)
to use `emitStringFromTree(node.exprNode)` instead. Where the previous code had a guarded
fallback `node.exprNode ? emitStringFromTree(node.exprNode) : node.expr`, the fallback branch
is removed (replaced with `: ""` or `: undefined`, since exprNode is always populated by
ast-builder for valid bare-expr nodes).

The runtime `.expr` writes inside `compiler/src/ast-builder.js` are NOT removed — JS-side
consumers (which don't see TS types) may still rely on duck-typed `.expr` reads. Step 8 is
strictly a TypeScript-type cleanup with consumer fan-out.

## Files Directly Modified (10 sites planned)
- `compiler/src/types/ast.ts` — delete the `expr?: string` line from BareExprNode (lines 710-711).
- `compiler/src/component-expander.ts` — delete the regex fallback inside `_injectChildrenWalk`
  for `${render name()}` and `${render name(arg)}`; keep ExprNode structural matching.
  Also remove the `node.expr.trim() === "children"` and `=== "..."` string fallbacks.
- `compiler/src/meta-checker.ts` — six sites: bodyUsesCompileTimeApis, bodyContainsLift,
  bodyContainsSqlContext, collectReflectArgIdents, bodyMixesPhases, checkNodeForRuntimeVars,
  checkReflectCalls.
- `compiler/src/type-system.ts` — five sites: fail-detection inside annotateNodes,
  E-ERROR-002 bare-callee detection, meta-await destructuring, guard callee extraction,
  match-arm filter inside checkLinear.
- `compiler/src/route-inference.ts` — three sites: walkBodyForTriggers, findReactiveAssignment,
  isReactiveStatement, isServerTriggerStatement (4 logical sites in 3-4 places).
- `compiler/src/codegen/emit-control-flow.ts` — switch-stmt break-case detection.
- `compiler/src/codegen/emit-html.ts` — bare-expr handling for reactive deps inside
  generateHtml. NOTE: HEAD evolved with `extractReactiveDepsTransitive` + `fnBodyRegistry`
  (S39 boundary security). Preserve that — only remove `.expr` fallback.
- `compiler/src/codegen/emit-lift.js` — three sites: text-node emission inside
  `emitCreateElementFromMarkup`, attribute/content emission inside `emitConsolidatedLift`,
  bare-expr emission inside `emitConsolidatedLift`. Add `cleanRenderPlaceholder` helper
  (from reference commit `4df07cf`).
- `compiler/src/codegen/emit-client.ts` — animationFrame/navigate runtime-chunk detection
  inside `detectRuntimeChunks`.
- `compiler/src/codegen/collect.ts` — `isServerOnlyNode` SQL/env detection.

## Downstream Stages Affected
- All consumers of bare-expr nodes (PA, RI, TS, MC, CG). No new contract — the contract
  was already "ExprNode is populated; .expr is deprecated." Step 8 enforces it.

## Pipeline Contracts At Risk
- `BareExprNode.exprNode` MUST be populated for every bare-expr emitted by the AST builder
  (it currently is — Steps 1-7 in S39 verified this with the ExprNode-first paths).
- Edge cases where `exprNode` might be missing (escape-hatch nodes) need targeted handling:
  the original `component-expander.ts` had `if (node.exprNode && node.exprNode.kind !== "escape-hatch")`
  guards — these stay.

## Spec Changes Required
None. Step 8 is internal AST cleanup; no user-visible compiler behavior change.

## Tests That Must Pass
- All 7,565 existing pass tests. Particular vigilance for these suites that previously
  regressed in the failed cherry-pick:
  - `compiler/tests/unit/meta-checker*.test.js`
  - `compiler/tests/unit/type-system*.test.js`, `type-system-*.test.js`
  - `compiler/tests/unit/route-inference*.test.js`
  - `compiler/tests/unit/lin*.test.js` (linearity check uses match-arm filter)
  - `compiler/tests/unit/match-arm-inline*.test.js`
  - `compiler/tests/unit/component-expander*.test.js`
  - `compiler/tests/integration/expr-parity.test.js`

## New Tests Required
None. Step 8 is a refactor — existing behavior is preserved.

## Expected Behavioral Changes
- TypeScript surface: `BareExprNode.expr` no longer exists.
  Any consumer that read `.expr` and was missed would now get a `TS2339`.
- Runtime: bare-expr nodes still have `.expr` at runtime (ast-builder.js writes it),
  but TypeScript no longer believes it. Duck-typed JS reads continue to work.

## Must Not Change (Invariants)
- All test pass count (7565).
- All emitted code for `examples/01..14` should remain byte-identical (Step 8 is pure
  TS-type cleanup — emit functions return the same strings).
- ast-builder.js .expr writes preserved for JS-side compatibility.
- The `match-arm-inline` filter in checkLinear (S39 addition) preserved.
- The `extractReactiveDepsTransitive` + `fnBodyRegistry` boundary-security path in
  emit-html.ts preserved.
- Bun.SQL Phase 1 evolution in route-inference.ts preserved (taint propagation, etc.).

## Risk: Why the cherry-pick failed
The reference commit `fca0899` was based on stale `5bd7a38` (S38 close) and didn't account
for:
1. S39 boundary security adding `fnBodyRegistry` to `emit-html.ts:generateHtml` signature.
2. S39 match-arm-inline filter inside `checkLinear`.
3. S39 boundary security adding taint-propagation logic in `route-inference.ts`.
4. S40 Bun.SQL Phase 1 changes to SQL detection in `route-inference.ts` and `meta-checker.ts`.
5. Possibly: changes to `extractCalleeNameFromNode` signature in `type-system.ts`.

Mitigation: re-implement against current HEAD line-by-line. Reference commits guide intent;
they do NOT supply text.

## Tags
#scrmlTS #change #impact #expr-ast-phase-4d-step-8 #ast #type-system

## Links
- [pre-snapshot.md](./pre-snapshot.md)
- [progress.md](./progress.md)
