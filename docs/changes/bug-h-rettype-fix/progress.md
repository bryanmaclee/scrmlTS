# Progress: bug-h-rettype-fix

- [17:30] Started — branch `changes/bug-h-rettype-fix` created, pre-snapshot written
- [17:30] Root cause identified: `emitFnShortcutBody` only applies implicit return for `fnKind === "fn"`, not for `function` with return-type annotation
- [17:30] Fix plan: 3 files (ast-builder.js, emit-logic.ts, emit-functions.ts) + tests
- [17:35] ast-builder.js: added `hasReturnType: true` to function-decl nodes — committed (0e97136)
- [17:40] emit-logic.ts + emit-functions.ts: extended implicit return to trigger on `hasReturnType` — committed (4532ccb)
- [17:42] Reproducer verified: `return (function() {` now present in compiled output
- [17:45] 5 tests added and passing — committed (db4e2a7)
- [17:45] Full suite: 7524 pass, 0 fail, 0 regressions
- [17:45] COMPLETE — ready for anomaly detection and user review
