# expr-ast-phase-4d-step-8-strict — Intake

**Surfaced:** S40 2026-04-24, immediately after Step 8 hybrid landed.
**Status:** filed, not started.
**Priority:** low — tech debt, not breaking anything.

## Context

Phase 4d Step 8 landed in S40 (commits `401b3f5`..`e478c99`) but used a **hybrid** approach: deleted `BareExprNode.expr` from the TS type, but kept consumer fallback reads via `(node as any).expr` casts.

The consumers still have dual paths:
```ts
if ((node as any).exprNode && testExprNode((node as any).exprNode)) return true;
else if (testExpr((node as any).expr)) return true;   // ← still here
```

The `(any)` cast bypasses the type system. Functionally equivalent to pre-Step 8 — only the type contract changed.

## Why hybrid (per agent's anomaly report)

Strict removal of the `.expr` fallback broke 30+ meta-checker tests that build synthetic bare-expr nodes WITHOUT populating `.exprNode`. The synthetic test fixtures were authored before Phase 4d's "always populate exprNode" guarantee in the AST builder.

## Suggested fix scope

1. **Audit synthetic test fixtures** that build `bare-expr` nodes by hand (not via ast-builder). For each, populate `.exprNode` using `parseExprToNode(expr)` so they match real AST builder output.
2. **Remove `(any).expr` fallback reads** from these consumers (per agent's anomaly report Cat A — 10 sites):
   - `compiler/src/meta-checker.ts` — multiple sites (`bodyUsesCompileTimeApis`, `bodyContainsLift`, `bodyContainsSqlContext`, `collectReflectArgIdents`, `bodyMixesPhases`, `checkNodeForRuntimeVars`, `checkReflectCalls`)
   - Any other site using `(node as any).expr` after grep
3. Verify full test suite stays at 7,578+/0.

## Why low priority

- Functionally complete: TS type is honest, runtime works.
- Tech debt is isolated and grep-able (`grep -rn '(node as any).expr' compiler/src --include='*.ts'`).
- Doesn't block any feature work.

Could be a good "rainy-day cleanup" task or junior contributor onboarding task.

## Reference

- `e478c99` — Step 8 hybrid (the work just landed)
- `docs/changes/expr-ast-phase-4d-step-8/anomaly-report.md` — agent's full categorization of the 63 remaining `.expr` reads (Cat A is the relevant set; B/C are different fields and out of scope)
- `4a5bbf1`, `4df07cf`, `fca0899` on `changes/render-preprocess-expr-deletion` — the strict-deletion design (broke 30+ tests when applied to current main; would need test fixture updates to land cleanly)

## Tags
#tech-debt #phase-4d #ast-cleanup #low-priority #test-fixtures
