# Anomaly Report: fix-meta-effect-loop-var-leak

## Test Behavior Changes

### Expected
- `compiler/tests/unit/self-host-meta-checker.test.js` — 6 new tests added under
  `describe("self-host parity: collectRuntimeVars", …)`. All pass. The new
  tests pin the post-fix behavior: for-loop iteration variables, index variables,
  and let-decls inside for-loop bodies are NOT collected into the runtimeVars map.
- `compiler/tests/integration/bug-o-meta-effect-loop-var-leak.test.js` — 7 new
  end-to-end tests, all pass. They compile small scrml fixtures through the
  full pipeline and assert the emitted `_scrml_meta_effect(...)` calls have no
  loop-local name in their `Object.freeze({...})` captured-scope object.

### Unexpected (Anomalies)
None.

## E2E Output Changes

### Expected
- `bug-o.scrml` repro: both `_scrml_meta_effect` calls (the real one and the
  phantom from the trailing HTML comment) now emit clean captures. Bug O's
  `it: it` leak is gone in both.
- `bug-o-no-trailing-comment.scrml`: emits a single `_scrml_meta_effect` call
  with a clean capture (was: single call with `it: it`; now: single call,
  no leak).
- `let-in-for-leaks.scrml`: `_scrml_meta_effect` no longer captures
  `local_inner`. Confirms that let-decl inside a for-loop body is correctly
  scoped as loop-local and excluded.

### Unexpected (Anomalies)
None.

## New Warnings or Errors
None. The compiler produces the same warnings/errors set on a clean repro as it
did before the fix; only the meta-effect frozen-scope content changed.

## Test counts
- Pre-fix baseline (after generating `samples/compilation-tests/dist/`):
  7906 pass / 40 skip / 0 fail / 28140 expect / 7946 tests / 378 files.
- Post-fix (with new tests):
  7919 pass / 40 skip / 0 fail / 28180 expect / 7959 tests / 379 files.
- Net delta: +13 tests passing (+1 file: the new integration test file).
- Zero regressions.

## Bonus duplicate-emission disposition
NOT fixed in this commit. The bonus is a separate BS-stage issue (HTML
comments not opaque to the block splitter). Documented at
`docs/changes/fix-meta-effect-loop-var-leak/bonus-bug-html-comment-meta-leak.md`
for a future intake. After the Bug O fix, the phantom emission from comment
text still happens but is now syntactically valid (clean capture); it no
longer crashes at module load. The behavioral severity dropped from
"breaks runtime" to "phantom side-effect on module load if comment contains
a real-side-effect ^{} expression".

## Anomaly Count
0

## Status
CLEAR FOR MERGE
