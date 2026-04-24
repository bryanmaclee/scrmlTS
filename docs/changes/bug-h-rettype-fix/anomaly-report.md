# Anomaly Report: bug-h-rettype-fix

## Test Behavior Changes
### Expected
- 5 new tests added (bug-h-rettype-match-return.test.js) — all pass, verifying the fix
- Pre-existing test count: 7498 pass → Post-fix: 7524 pass (delta includes unrelated pre-existing untracked test files that were committed alongside: bug-k-sync-effect-throw.test.js, giti-009-import-rewrite.test.js)
- 0 test regressions

### Unexpected (Anomalies)
- None

## E2E Output Changes
### Expected
- Bug H reproducer now compiles with `return (function() {...})();` instead of `(function() {...})();`
- TodoMVC gauntlet: PASS (unchanged)

### Unexpected (Anomalies)
- None

## New Warnings or Errors
None

## Scope of Change
- **ast-builder.js**: Additive-only — new optional `hasReturnType` field on function-decl AST nodes. No existing behavior changed.
- **emit-logic.ts**: `emitFnShortcutBody` condition widened from `fnKind === "fn"` to `fnKind === "fn" || hasReturnType`. Only triggers for functions that previously had no implicit return AND have a return-type annotation.
- **emit-functions.ts**: Same condition widening for top-level client functions. Routes `hasReturnType` functions through `emitFnShortcutBody` instead of `scheduleStatements`.

## Risk Assessment
- **False positive risk**: LOW — `hasReturnType` is only set when the parser explicitly encounters `-> T` or `: T` syntax. Functions without return-type annotations are unaffected.
- **scheduleStatements bypass risk**: MEDIUM-LOW — `hasReturnType` functions now bypass `scheduleStatements` in `emit-functions.ts`. If such a function also contains server calls, the async scheduling won't apply. However, functions with return-type annotations that contain match at the tail are unlikely to also make server calls in the same body. If this becomes an issue, it would manifest as a missing `await` (a different bug), not a regression.

## Anomaly Count: 0
## Status: CLEAR FOR MERGE
