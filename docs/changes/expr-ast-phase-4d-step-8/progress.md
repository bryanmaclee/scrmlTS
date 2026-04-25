# Progress: expr-ast-phase-4d-step-8

## Plan
Implement file-by-file in dependency order. Commit after each meaningful step.
Verify `bun test` after each consumer migration.

Decomposition:
1. Pre-snapshot + impact analysis (artifacts) — DONE
2. emit-lift.js: add cleanRenderPlaceholder helper (consumer-safe — no field-deletion yet)
3. component-expander.ts: switch render slot matching to ExprNode-only
4. meta-checker.ts: switch all .expr fallback branches to ExprNode-only
5. route-inference.ts: switch all .expr fallback branches to ExprNode-only
6. type-system.ts: switch all .expr fallback branches to ExprNode-only
7. emit-control-flow.ts, emit-html.ts, emit-client.ts, collect.ts: small consumer changes
8. types/ast.ts: delete the field declaration (final TS-only commit)
9. Re-verify: bun test, bun --check examples
10. Anomaly report

Approach: do consumer migrations FIRST (steps 2-7) so that each commit leaves the suite
green. The field-deletion (step 8) is the last commit — by that point every consumer no
longer reads `.expr`, so deleting the type cannot regress.

## Log
- [start] Branch rebased onto main `74881ea`. Baseline: 7565 pass / 0 fail.
