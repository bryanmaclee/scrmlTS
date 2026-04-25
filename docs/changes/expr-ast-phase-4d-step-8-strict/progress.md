# Progress: expr-ast-phase-4d-step-8-strict

- [start] Rebased worktree onto main 2e6a42d
- [start] Confirmed baseline: 7,578 pass / 40 skip / 0 fail / 355 files
- [start] Confirmed 7 fallback sites in compiler/src/meta-checker.ts via grep
- [start] Wrote pre-snapshot.md
- [step1] Removed BareExprNode.expr fallback reads from meta-checker.ts (7 sites + local LogicNode interface).
- [step1] Confirmed: 21 unit tests in meta-checker.test.js failed as expected (synthetic fixtures missing exprNode).
- [step2] Updated synthetic fixtures in meta-checker.test.js: added parseExprToNode import, populated exprNode in makeBareExpr helper and 11 inline literals.
- [step2] Down to 6 failures, all caused by 2 underlying ExprNode-detection bugs hidden by Step 8 hybrid string fallbacks.
- [step3] Bug A: bodyUsesCompileTimeApis used `exprNodeContainsMemberAccess(exprNode, ["compiler"])` which checks for property name (e.g. `.compiler`), not for object name. Real `compiler.foo()` calls slipped through. Fix: added `exprNodeContainsIdentNamed` helper that walks for an ident named "compiler" via forEachIdentInExprNode.
- [step3] Bug B: `exprNodeContainsCompileTimeReflect` had wrong field names (.operand vs .argument; .test vs .condition) and missing kinds (no "assign" case). Real `x = reflect(...)` slipped through. Fix: rewrote helper with defensive generic child-walking (mirrors exprNodeContainsEmitRawCall).
- [step4] Updated synthetic fixtures with unrealistic `const X = reflect(...)` in bare-expr (the JS parser cannot parse those — they become escape-hatch ExprNode). Replaced with valid bare expressions `X = reflect(...)`. 7 occurrences in meta-checker.test.js.
- [step4] meta-checker.test.js: 139/139 passing.
- [step5] Patched 3 other test files that have synthetic bare-expr fixtures and flow into meta-checker: self-host-meta-checker.test.js (added parseExprToNode import + updated makeBareExpr helper + replaced 5 unrealistic `const X = ...` patterns + reformulated one test to use makeLetDecl), meta-checker-false-positives.test.js (helper update), meta-eval.test.js (helper update).
- [final] Full suite: 7,578 pass / 40 skip / 0 fail / 355 files. Matches baseline exactly.
- [final] grep confirms ZERO `.expr` (non-exprNode) reads in compiler/src/meta-checker.ts.
- [final] Out-of-scope `.expr` reads remain in route-inference.ts, body-pre-parser.ts, codegen/emit-client.ts (per intake Cat B/C, not BareExprNode).
