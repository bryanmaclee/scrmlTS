# Progress: lin-batch-b

- [START] Branch changes/lin-batch-b created; pre-snapshot written
- [DONE] Step 1: ast-builder.js — parse lin in parameter position
  - Modified pushParam() to detect `lin name` prefix → {name, isLin: true}
  - Fixed token space accumulation: IDENT/KEYWORD tokens get space prefix to prevent `lin token` → `lintoken`
- [DONE] Step 2: type-system.ts — seed lin tracker with lin-params in function bodies
  - Added preDeclaredLinNames to CheckLinearOpts interface
  - checkLinear pre-seeds linTracker with preDeclaredLinNames at scope start
  - Added function-decl case to walkNode: detects isLin params, calls checkLinear recursively on fn body
- [DONE] Step 3: SPEC.md §35.2 — updated prohibition → permission + §35.2.1 param semantics
  - Removed prohibition statement
  - Added §35.2.1 subsection with grammar, semantics, control flow rules, normative statements
- [DONE] Step 4: Tests — added 15 Lin-B tests to type-system.test.js
  - Lin-B1: consumed once — no error (3 tests)
  - Lin-B2: not consumed — E-LIN-001 (4 tests)
  - Lin-B3: consumed twice — E-LIN-002 (2 tests)
  - Lin-B4: if/else branch asymmetry — E-LIN-003 (2 tests)
  - Lin-B5: scoping and interactions (4 tests)
- [DONE] Tests: 2298 pass, 2 skip, 90 fail (from 2283/2/90 — +15 new, 0 regressions)
