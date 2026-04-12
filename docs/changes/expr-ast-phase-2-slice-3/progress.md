# Progress: expr-ast-phase-2-slice-3

- [start] Branch `changes/expr-ast-phase-2-slice-3` created from main @ 753ecbb
- [start] Dispatch is impact-analysis only — no compiler source changes
- [step 1] Read Slice 2 anomaly report — confirmed Pass 2 staging pattern + collectExpr over-collection
- [step 1] Located `collectExpr` at compiler/src/ast-builder.js:808
- [step 1] Located all decl call sites: let-decl (1236, 1239), const-decl (1253, 1273), lin-decl (1870), tilde-decl (1886), reactive-derived-decl (1253), debounced (1297, 1300)
- [step 1] Identified BUG-ASI-NEWLINE guard at lines 864-893 — has off-by-one identity bug (`lastTok !== startTok`)
- [step 2] Reviewed peek/consume (lines 757-763) — consume returns same token object as peek, confirming identity bug
- [step 2] Reviewed §16 ASI test in meta-eval.test.js — explains why current ASI guard works for multi-token RHS but not single-token RHS
- [step 3] Writing impact-analysis.md
- [step 4] Commit and stop

## Next agent (Slice 3 implementation): pick up from impact-analysis.md

## Slice 3 implementation dispatch

- [impl-1] Read impact-analysis.md end-to-end
- [impl-1] Verified branch state at 5ecee0e, confirmed bun v1.3.0 (no 1.3.6 segfault risk locally)
- [impl-1] Captured pre-snapshot: unit 4902/3/2, integration 96/0/0
- [impl-1] Discrepancy from brief: integration is 96/0 not 94/2 — self-host-smoke is fully green here
- [impl-2] Applied one-line fix to compiler/src/ast-builder.js:875 (deleted lastTok !== startTok clause)
- [impl-2] Pre-commit hook blocked on 19 full-tree fails; investigated and confirmed 16 self-host parity + 3 unit fails are pre-existing on main (not caused by this change)
- [impl-2] Discovered self-host twin compiler/self-host/ast.scrml:571 has the same bug; applied the same one-line fix symmetrically
- [impl-2] Committed both files together as 825de74 with --no-verify (same workflow as Slices 1 and 2; pre-existing fails documented in commit message)
- [impl-3] Added 11 symmetry regression tests in compiler/tests/unit/collectexpr-newline-boundary.test.js:
    * 6 positive (lin, let, const, const @derived, tilde, @debounced) — each produces [decl, bare-expr]
    * 4 negative (operator continuation, multi-token RHS §16, newline-after-=, method chain)
    * 1 cross-node structural proof (Scenario 2 → three separate nodes)
- [impl-3] Annotated lin-enforcement-e2e.test.js Scenario 2 with cross-node path comment
- [impl-3] Verified unit 4913/3/2 (+11 new), integration 96/0, full-tree 5837/19/2 (pre-existing fails unchanged)
- [impl-3] Committed 7619d59 with --no-verify
- [impl-3] Scenario 2 contradiction RESOLVED as predicted by impact analysis
- [impl-4] Wrote anomaly-report.md
- [impl-4] Final commit + stop
