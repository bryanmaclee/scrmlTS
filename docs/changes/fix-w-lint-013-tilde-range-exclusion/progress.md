# Progress: fix-w-lint-013-tilde-range-exclusion

- [start] Branch `worktree-agent-ab8f226275fef21ce` clean at `e619abb`. Intake read.
- [step 1] bun test baseline confirmed: 7889 pass / 40 skip / 0 fail / 375 files. Matches intake.
- [step 2] Pre-fix ex 10 count confirmed: 8 W-LINT-013 misfires on lines 42, 43, 49, 50, 56, 62, 71, 72 (all `@var = N` inside `~{}`).
- [step 3] Pre-snapshot captured at `pre-snapshot.md`.
- [step 4] Wrote 5 regression tests at `compiler/tests/unit/lint-w-lint-013-tilde-no-misfire.test.js`. TDD red phase confirmed: §1 (1 lint), §2 (3 lints), §4 (2 lints, expected 1), §5 (1 lint) all FAILED on unfixed code. §3 (sanity that real `@click=` outside `~{}` still fires) PASSED.
- [step 5] Applied fix to `compiler/src/lint-ghost-patterns.js`:
    - Added `buildTildeRanges(source)` (lines 209-238) — brace-balanced parser for `~{...}` blocks.
    - Wired `tildeRanges` into `lintGhostPatterns` and the 5-arg `skipIf` signature.
    - Updated W-LINT-013's `skipIf` to also exclude tilde ranges.
- [step 6] All 5 new tilde tests PASS. All 6 A1 equality tests PASS. All A2 comment tests PASS. Total 113 lint-related tests pass across 4 lint test files.
- [step 7] Full suite: **7894 pass / 40 skip / 0 fail / 376 files** (was 7889 / 40 / 0 / 375 — exactly +5 tests, +1 file from this change).
- [step 8] Ex 10 verification: W-LINT-013 dropped from **8 → 0**. Total ex 10 lint count is now 0.
- [step 9] All examples now produce ZERO lint diagnostics (entire `examples/` directory is clean).
- [step 10] Sample-corpus verification: 71 W-LINT-013 firings remain across 10 samples. Spot-checked: these are top-level `@var = value` reactive assignments at the program root (outside any `~{}`, `${}`, or comment range). They are a separate cosmetic/false-positive question outside A6's scope — A6 was scoped to `~{}` exclusion only, and the intake explicitly says "Optional (defer to follow-up): audit other lints for `~{}` exclusion".
- [step 11] Cleanup: removed temporary verification script `_temp-ex10-w013-count.test.js`.

## Result

- Source change: `compiler/src/lint-ghost-patterns.js` (+33 / ~-2; new helper, 5-arg skipIf, W-LINT-013 update).
- New test file: `compiler/tests/unit/lint-w-lint-013-tilde-no-misfire.test.js` (5 tests).
- Artifacts: `pre-snapshot.md`, `progress.md`.
- Test counts: 7889 → 7894 (+5), 0 fails throughout.
- Ex 10 W-LINT-013: 8 → 0.
- All examples: 0 lint diagnostics total.
- Full `examples/` corpus is now lint-clean.

## Tags
#bug #lint #ghost-pattern #w-lint-013 #tilde-range #test-sigil #scope-c #stage-1 #s42 #t1

## Links
- Intake: `docs/changes/fix-w-lint-013-tilde-range-exclusion/intake.md`
- Pre-snapshot: `docs/changes/fix-w-lint-013-tilde-range-exclusion/pre-snapshot.md`
- Source: `compiler/src/lint-ghost-patterns.js`
- Tests: `compiler/tests/unit/lint-w-lint-013-tilde-no-misfire.test.js`
- Predecessor (A1+A2): commit `9a07d07`
