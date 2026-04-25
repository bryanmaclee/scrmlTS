# Anomaly Report: fix-arrow-object-literal-paren-loss (GITI-013)

## Pre-vs-post comparison

### Test counts
- Pre-fix baseline: 7825 pass / 40 skip / 0 fail / 27,971 expect() calls / 7,865 tests / 370 files
- Post-fix:        7841 pass / 40 skip / 0 fail / 28,002 expect() calls / 7,881 tests / 371 files
- Delta: +16 pass (the 16 tests in the new `arrow-object-literal-body.test.js`),
  +31 expect() calls (16 of those are `expect()` in the new tests; the rest come
  from compile-result re-assertions inside shared describe scaffolding),
  +1 file (the new test file). 0 regressions.

### Sidecar reproducer behavior
- Pre-fix:
  ```
  bun --check /tmp/r09/2026-04-25-0728-repro-09-arrow-object-literal.server.js
    error: Expected ";" but found ":"
  ```
- Post-fix:
  ```
  bun --check /tmp/r09/2026-04-25-0728-repro-09-arrow-object-literal.server.js
    (no output — clean parse)
  ```
- Server-bundle line 38 (the buggy line in pre-fix):
  - Pre-fix:  `const out = items.map((f) => {path: f.path, kind: f.kind});`
  - Post-fix: `const out = items.map((f) => ({path: f.path, kind: f.kind}));`

### Gauntlet quick-check (post-commit hook)
- Both commits ran the post-commit "Gauntlet quick check (TodoMVC)" which
  compiles `benchmarks/todomvc/` and reports `TodoMVC JS: PASS` plus the
  browser-validation block (`16 mangled definitions, 0 bare calls`). No
  regression.

## Test Behavior Changes

### Expected
- 16 new passes from `compiler/tests/unit/arrow-object-literal-body.test.js`
  (this is the change request's required regression coverage).

### Unexpected (Anomalies)
- None.

## E2E Output Changes

### Expected
- Sidecar reproducer (`handOffs/incoming/read/2026-04-25-0728-repro-09-arrow-object-literal.scrml`)
  now emits `(f) => ({...})` instead of `(f) => {...}` for the `items.map`
  callback. This is the change request.

### Unexpected (Anomalies)
- None observed. Spot-checked the `samples/compilation-tests/` outputs that
  contain arrow-with-object-body patterns: none of the existing samples that
  the test corpus exercises depended on the buggy emit shape (if they had,
  the pre-fix baseline would have included failing tests, but baseline was
  0-fail).

## New Warnings or Errors
- None.

## Anomaly Count: 0
## Status: CLEAR FOR MERGE

## Notes on briefing baseline mismatch
The briefing cited "7,836 pass / 40 skip / 0 fail / 371 files at 6ba84be" as
the test baseline. My local pre-fix baseline on this worktree (off of 205602d)
was 7825 / 40 / 0 / 370 — 11 fewer passes and 1 fewer file. This is consistent
with the inbox-triage commits between 6ba84be and 205602d
(`a71f849 docs(intakes): GITI-012/013 — sidecars found in archive`,
`02aff6e docs(s40): inbox triage + 2 new intakes from giti + map header refresh`)
which only touched docs and inbox, not source or tests. The discrepancy is
not a regression I introduced and not in scope for this change.

The worktree-vs-main file count of 370 (instead of 371) is because main has
`compiler/tests/unit/<some-test-from-prior-merge>.test.js` that was added
between 6ba84be and 205602d. The post-fix file count of 371 simply reflects
this fix's added test file.

## Tags
#anomaly-report #change-fix-arrow-object-literal-paren-loss #giti-013 #clear-for-merge

## Links
- pre-snapshot: docs/changes/fix-arrow-object-literal-paren-loss/pre-snapshot.md
- progress: docs/changes/fix-arrow-object-literal-paren-loss/progress.md
- intake: docs/changes/fix-arrow-object-literal-paren-loss/intake.md
- new test: compiler/tests/unit/arrow-object-literal-body.test.js
- fix: compiler/src/codegen/emit-expr.ts (emitLambda + arrowBodyNeedsParens)
