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
