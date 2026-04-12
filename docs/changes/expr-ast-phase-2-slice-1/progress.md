# Progress: expr-ast-phase-2-slice-1

## Decomposition Plan

Step 1: compiler/src/tokenizer.ts — add "lin" to KEYWORDS
Step 2: compiler/src/ast-builder.js — update lin token checks + emit lin-decl nodes in both parse loops; also update types/ast.ts (tightly coupled)
Step 3: compiler/src/codegen/emit-logic.ts — add case "lin-decl" handler
Step 4: compiler/tests/integration/lin-decl-emission.test.js — add integration test + write anomaly report

## Status

- [ ] Branch created
- [ ] Pre-snapshot written
- [ ] Step 1: tokenizer.ts — PENDING
- [ ] Step 2: ast-builder.js + types/ast.ts — PENDING
- [ ] Step 3: emit-logic.ts — PENDING
- [ ] Step 4: integration test — PENDING
- [ ] Anomaly report — PENDING
