# Progress: bug-h-rettype-fix

- [17:30] Started — branch `changes/bug-h-rettype-fix` created, pre-snapshot written
- [17:30] Root cause identified: `emitFnShortcutBody` only applies implicit return for `fnKind === "fn"`, not for `function` with return-type annotation
- [17:30] Fix plan: 3 files (ast-builder.js, emit-logic.ts, emit-functions.ts) + tests
