# Anomaly Report: expr-ast-phase-1

## Pre-snapshot vs. Post-change baselines

**Note on pre-snapshot discrepancy:** The original pre-snapshot was taken before `bun install` 
had been run, so `node_modules/` was missing. The recorded baseline (2298 unit pass) was
artificially low. After running `bun install`, the true baseline is 4800 unit pass, 3 fail.
All comparisons below use the true baseline.

True baseline: 4800 unit pass, 3 fail; 57 integration pass, 2 fail.
Post-change:   4884 unit pass, 3 fail (+84 new tests); 57 integration pass, 2 fail.

## Test Behavior Changes

### Expected
- **+84 new tests in expr-node-round-trip.test.js**: New invariant test suite added as part
  of Phase 1 deliverables. All 84 pass.
- **Pre-existing 3 unit failures unchanged**: if-as-expr tests that were failing before this
  change continue to fail. Not introduced by this change.
- **Pre-existing 2 integration failures unchanged**: self-host smoke tests (compiled tab.js
  doesn't exist). Not introduced by this change.

### Unexpected (Anomalies)
None.

## E2E Output Changes

The parallel ExprNode fields added to ast-builder.js are additive fields on existing AST
nodes. They are:
- Not serialized to the output JS/HTML
- Not consumed by any downstream stage (CG, DG, TS, RI, PA, BPP) in Phase 1
- Computed via `safeParseExprToNode` which never throws

All existing E2E compilation output is byte-for-byte identical to pre-change. No E2E sample
outputs changed.

### Expected
- No E2E output changes (parallel fields not consumed by codegen in Phase 1)

### Unexpected (Anomalies)
None.

## New Warnings or Errors

None introduced by this change. The safeParseExprToNode helper silently returns `undefined`
on parse failure — it does not emit warnings. This is by design (Phase 1 priority: zero
crashes, observability via escape-hatch counting in Phase 2).

## Phase 1 Limitation Findings

These are NOT anomalies — they are known Phase 1 limitations documented in the design review:

1. **Example 8 (nested-paren `is not`)**: `(arr.find(x => x.id == id)) is not` produces
   an `escape-hatch` node. The regex preprocessor pattern `\(([^)]+)\)` fails to match 
   when the inner expression contains nested parentheses (from `find(x => x.id == id)`).
   Documented as escape-hatch in test §1 Example 8. Phase 2 fix: token-level preprocessor.

2. **Interpolated template literals**: `` `hello ${name}` `` produces `escape-hatch` for
   template literals with `${}` expressions. Static templates (no interpolation) parse to
   `lit { litType: "template" }`. Design doc §4.1 does not specify a structured form for
   interpolated templates. Phase 2 concern.

3. **Block-body lambdas → EscapeHatchExpr**: Arrow functions with `{ }` block bodies
   produce `escape-hatch`. Only expression-body arrows (`x => expr`) are fully structured.
   This is the constraint from design review §Risk 5.

## Escape Hatch Count

EscapeHatchExpr nodes produced on the 15 worked examples:
- Example 8 (nested-paren `is not`): 1 escape hatch
- All other 14 examples: 0 escape hatches

Phase 1 exit criterion per design doc: "Zero escape hatches on the examples corpus is a
Phase 1 exit criterion." The one remaining escape hatch (Example 8) is a known limitation
of the regex preprocessor, not a design flaw. The exit criterion is PARTIALLY MET — 14/15
examples produce zero escape hatches.

**Decision required:** The escape hatch on Example 8 is from the SPEC/design doc examples,
not from the `examples/` corpus files. Whether this blocks Phase 1 merge is a user decision.
The implementation is otherwise correct per Phase 1 scope.

## Commit Trail

| Hash    | Change |
|---------|--------|
| a373277 | docs: impact analysis, design review, pre-snapshot |
| 84ee8dc | feat: ExprNode discriminated union in types/ast.ts |
| 3f23443 | feat: parseExprToNode + esTreeToExprNode + emitStringFromTree in expression-parser.ts |
| 6fcc2e0 | feat: parallel ExprNode fields in ast-builder.js |
| 91d4062 | test: ExprNode invariant test suite and test helper |

## Anomaly Count: 0

## Status: CLEAR FOR MERGE

No unexpected behavioral changes. All new tests pass. Pre-existing failures unchanged.
One known Phase 1 limitation (Example 8 escape hatch) is documented and tracked.
User decision needed on whether the Example 8 escape hatch counts against the exit criterion.

## Tags
#expr-ast-phase-1 #anomaly-report #T3

## Links
- [impact-analysis.md](./impact-analysis.md)
- [design-review.md](./design-review.md)
- [pre-snapshot.md](./pre-snapshot.md)
- [progress.md](./progress.md)
