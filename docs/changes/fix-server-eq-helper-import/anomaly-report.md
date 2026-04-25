# Anomaly Report: fix-server-eq-helper-import (GITI-012)

**Compared:** baseline 205602d → branch changes/fix-server-eq-helper-import @ b2067ca

## Test Behavior Changes

### Expected
- 11 new tests added in `compiler/tests/unit/server-eq-helper-import.test.js`. All pass.
  - §1   sidecar reproducer compiles + emits `===` (not helper) for `arr.length == 0`.
  - §2-6 primitive shortcut for literals, member.length, !=, unary, mixed arithmetic.
  - §7   struct equality declines shortcut and inlines the helper.
  - §8   inlined helper extracted via Function() and exercised with 23 assertions
         (primitives, null/undefined, structs, nested structs, arrays, _tag enums).
  - §9   enum-tag branch present in the inlined helper.
  - §10  no-equality fn doesn't inline the helper (negative test).
  - §11  inlining is idempotent (helper appears at most once per .server.js).
- Total: 7825 pass → 7836 pass (+11). 0 fail. 40 skip (unchanged).

### Unexpected (Anomalies)
- None.

## E2E Output Changes

### Expected
- `handOffs/incoming/read/2026-04-25-0728-repro-08-server-fn-eq.scrml`:
  - PRE  `.server.js`: `return {ok: _scrml_structural_eq(arr.length, 0)};`
         (helper unresolved at runtime → `ReferenceError`).
  - POST `.server.js`: `return {ok: (arr.length === 0)};`
         (helper not needed; module loads + handler runs cleanly, returns
         `{"ok":true}` end-to-end via dynamic import test in §1 of the
         in-session smoke check).
- `samples/compilation-tests/combined-003-form-validation.scrml` (which uses
  `@name.length == 0` etc.):
  - PRE  client.js: `_scrml_structural_eq(_scrml_reactive_get("name").length, 0)`
  - POST client.js: `(_scrml_reactive_get("name").length === 0)`
  - Behavior identical (member.length is a number; SPEC §45.4 explicitly
    authorizes the shortcut). Faster runtime, no helper-call overhead.
- `samples/compilation-tests/control-014-break-continue.scrml` (`n % 2 == 0`):
  - PRE  client.js: `_scrml_structural_eq(n % 2, 0)`
  - POST client.js: `(n % 2 === 0)`
  - Behavior identical (`n % 2` is `BinaryExpr op:"%" → primitive`).

### Unexpected (Anomalies)
- None.

## New Warnings or Errors
- None. Sample-compilation warning counts unchanged
  (`combined-003-form-validation`: 1 warning before → 1 after,
   `reactive-014-form-state`: 5 warnings before → 5 after).

## Pre-existing failures (NOT caused by this PR)
- `combined-012-login.scrml` E-SCOPE-001 (unquoted `error` ident in `if=`
  attribute). Confirmed present pre-change via `git stash` of working tree.
  Sample-level fix; unrelated to GITI-012.

## Anomaly Count: 0
## Status: CLEAR FOR MERGE

## Tags
#anomaly-report #fix-server-eq-helper-import #giti-012 #clear

## Links
- intake: docs/changes/fix-server-eq-helper-import/intake.md
- pre-snapshot: docs/changes/fix-server-eq-helper-import/pre-snapshot.md
- progress: docs/changes/fix-server-eq-helper-import/progress.md
- sidecar: handOffs/incoming/read/2026-04-25-0728-repro-08-server-fn-eq.scrml
- spec: compiler/SPEC.md §45 Equality Semantics
- commits: 821a982, 9087d2a, f9dd441, 7e3bfc2 (b2067ca = unrelated handoff admin)
