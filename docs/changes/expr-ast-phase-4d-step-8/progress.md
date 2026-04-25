# Progress: expr-ast-phase-4d-step-8

## Plan
Implement file-by-file in dependency order. Commit after each meaningful step.
Verify `bun test` after each consumer migration.

Decomposition:
1. Pre-snapshot + impact analysis (artifacts) — DONE
2. emit-lift.js: add cleanRenderPlaceholder helper (consumer-safe — no field-deletion yet) — DONE
3. component-expander.ts: switch render slot matching to ExprNode-only — DONE
4. meta-checker.ts: switch all .expr fallback branches to ExprNode-first hybrid — DONE
5. route-inference.ts: switch all .expr fallback branches to ExprNode-first — DONE
6. type-system.ts: NO CODE CHANGES NEEDED (all sites use Record<string, unknown> casts) — DONE
7. emit-control-flow.ts, emit-html.ts, emit-client.ts, collect.ts: small consumer changes — DONE
8. types/ast.ts + body-pre-parser.ts: delete the field declaration + migrate strict consumer — DONE
9. Re-verify: bun test, bun --check examples — DONE
10. Anomaly report — DONE

Approach: did consumer migrations FIRST (steps 2-7) so that each commit left the suite
green. The field-deletion (step 8) is the last commit — by that point every consumer no
longer reads `.expr` at the strict-typed level, so deleting the type cannot regress.

## Log
- [start] Branch rebased onto main `74881ea`. Baseline: 7565 pass / 0 fail.
- [step 2] emit-lift.js: cleanRenderPlaceholder helper + 2 ExprNode-only guards. 7565/0. Commit 76bf501.
- [step 3] component-expander.ts: ExprNode-only render slot matching + escape-hatch spread detection. 7565/0. Commit 5f65e8d.
- [step 4] meta-checker.ts: 7 sites migrated to (any).expr fallback (hybrid: TS-clean, runtime-safe). 7565/0. Commit bdfc67b.
- [step 5] route-inference.ts: 4 sites comment-refreshed; 1 pattern fix in findReactiveAssignment. 7565/0. Commit e977b6b.
- [step 6] type-system.ts: no changes needed — all .expr reads use `Record<string, unknown>` casts that survive deletion.
- [step 7] codegen (emit-html, emit-control-flow, emit-client, collect): comment refresh + emit-client structural cleanup. 7565/0. Commit 883d6b8.
- [step 8] ast.ts: BareExprNode.expr field DELETED. body-pre-parser.ts: 1 strict-cast migration. 7565/0. Commit 6467479.
- [final] All 7565 tests pass. E2E: 01/02/04 clean. 03/07/08 fail with pre-existing lift+sql bug (unchanged). Anomaly report CLEAR FOR MERGE.

## Tags
#scrmlTS #change #progress #expr-ast-phase-4d-step-8 #complete

## Links
- [pre-snapshot.md](./pre-snapshot.md)
- [impact-analysis.md](./impact-analysis.md)
- [anomaly-report.md](./anomaly-report.md)
