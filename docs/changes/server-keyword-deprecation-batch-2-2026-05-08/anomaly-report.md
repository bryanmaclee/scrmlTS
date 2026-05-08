# Anomaly Report: server-keyword-deprecation-batch-2

**Date:** 2026-05-08
**Compared:** pre-snapshot baseline (9822 / 64 / 1 / 3) vs post-batch-2 state.

## Test Behavior Changes

### Expected
- 9822 → 9838 pass count: +16 new tests added in D4 (12 spec-amendment + 4 stdlib-cleanup regression guards). This is the test-deliverable working as intended.
- 0 new fails: the 3 pre-existing self-host parity / build-bootstrap fails (F-BUILD-002 §3, Bootstrap L3, Self-host: tokenizer parity) are preserved unchanged. None new.
- 0 changes to skip / todo counts.
- All 16 new tests pass on first run; no flaky behavior detected.
- All 118 pre-existing stdlib tests (across stdlib-fs / stdlib-path / stdlib-process / stdlib-auth / stdlib-oauth) continue to pass after D3 cleanup.

### Unexpected (Anomalies)
None.

## E2E / Compilation Output Changes

### Expected
- `bun run pretest` clean, all 12 compilation-test samples compile without behavior change.
- Stdlib runtime shims (`compiler/runtime/stdlib/*.js`) are unaffected — they are hand-written ES modules consumed at runtime, not derived from `stdlib/*.scrml` source. The spec/source cleanup is documentation/validation level, not runtime.

### Unexpected (Anomalies)
None.

## New Warnings or Errors

### Expected
- Stdlib `*.scrml` files compiled in isolation surface pre-existing bugs (`try/catch/finally`, `!==`, undeclared `Bun`). These are NOT new to Batch 2; they exist on main too. The standard pipeline does not lower stdlib at compile time today (see `compiler/src/api.js:51`); runtime shims handle module resolution. Out-of-scope.
- `W-DEAD-FUNCTION` fires for stdlib functions when compiled in isolation (no callers visible). This is correct Trigger 6 behavior — the warnings would not fire in real adopter code where the stdlib functions ARE called. Diagnostic-as-designed.

### Unexpected (Anomalies)
None.

## Spec Amendment Validation

The 12 spec-amendment tests in `spec-server-deprecate-batch-2.test.js`
verify the SPEC.md catalog state against the D1+D2 amendments. Each test
asserts a specific structural property of the amended sections (presence
of catalog rows, presence of normative statements, cross-references to
other sections). All 12 pass — the amendments are landed structurally
correct.

## Stdlib Cleanup Validation

The 4 stdlib-cleanup tests in `stdlib-server-block-cleanup.test.js`
verify the post-D3 state structurally:

1. No decorative `server { ... }` body wraps remain (regex over all stdlib `.scrml` files; offenders array empty)
2. `safeCompare` is declared `fn`, not `function` (and not server-wrapped)
3. Each cleaned-up module retains its public exports (8 modules × 3-7 names = 51 export-presence assertions)
4. Module headers no longer instruct users to use `server { }` blocks (negative match across 7 files)

All 4 pass.

## §52.10 Verification (per brief)

Disambiguation between `server @var` (cell authority modifier, §52.4) and
`server function` (function modifier, §52.10) verified clear. The
deprecation applies ONLY to `server function`; `server @var` remains
canonical. See progress.md "§52.10 verification" section.

## W-DEPRECATED-SERVER-MODIFIER fire counts

- **stdlib: 0 fires** (target: 0, met). Stdlib never had `server function`
  declarations; only body-block wraps. D3 removed the wraps; no decls to
  fire the diagnostic.
- **examples: unchanged** (target: 6 unchanged). Batch 2 did not modify
  `examples/`; the deprecation cycle is the migration-communication channel
  for adopter code in that tree.

## Anomaly Count: 0

## Status: CLEAR FOR MERGE

## Tags

`#anomaly-report` `#server-keyword-deprecation` `#batch-2` `#insight-26` `#insight-27` `#zero-anomalies`

## Links

- `/home/bryan/scrmlMaster/scrmlTS/.claude/worktrees/agent-aed4eeafff5ce2a94/docs/changes/server-keyword-deprecation-batch-2-2026-05-08/pre-snapshot.md`
- `/home/bryan/scrmlMaster/scrmlTS/.claude/worktrees/agent-aed4eeafff5ce2a94/docs/changes/server-keyword-deprecation-batch-2-2026-05-08/progress.md`
- Commits: `ed9bf48` (survey) → `44869ed` (D1) → `4a34fb5` (D2) → `962180a` (D3) → `7ddd471` (D4) → `e2d3458` (D3+ docstring cleanup)
