# Progress: fix-w-lint-007-comment-range-exclusion

Combined dispatch with A1 (`fix-w-lint-013-context-scope`). A2 lays
`buildCommentRanges` infrastructure that A1's step 2 reuses.

## Baseline (pre-fix)

- Branch: `worktree-agent-a7ecf2afa4b522a64` (merged main `a7d9705`).
- `bun test` (worktree): **7878 pass / 40 skip / 0 fail / 373 files**.
- `examples/14-mario-state-machine.scrml`: 2 lints
  (W-LINT-007 line 5 — comment-text misfire; W-LINT-013 line 144 — equality misfire).

## TDD baseline (new tests on UNFIXED code)

- `lint-ghost-patterns-comment-exclusion.test.js`: 5 tests, **3 fail / 2 pass**
  (sanity §3 passes; over-exclusion §5 happens to pass because URL has no ghost).
- Net new TDD failures: 3 of 5.

## Fix applied

`compiler/src/lint-ghost-patterns.js`:
- Added `buildCommentRanges(source)` after `buildCssRanges` (~31 lines).
- Threaded `commentRanges` through `lintGhostPatterns` to `skipIf`
  (4-arg signature, backwards-compatible — existing 2/3-arg skipIfs
  ignore extras).
- Updated W-LINT-007 `skipIf` to OR `inRange(offset, commentRanges)`.

## Verification

- All 5 new W-LINT-007 comment-exclusion tests PASS.
- All 97 existing lint-ghost-patterns tests still PASS.
- Full suite: **7889 pass / 0 fail / 40 skip / 375 files** (= 7878 + 11 new).
- `examples/14-mario-state-machine.scrml`: W-LINT-007 line 5 misfire is GONE.

## Steps

- [00:00] Started — branch verified, main merged in, baseline captured.
- [00:01] TDD scaffolds written; 4 of 11 fail on unfixed code as expected.
- [00:02] Combined A2+A1 fix applied to `lint-ghost-patterns.js`.
- [00:03] All 11 new tests pass; full suite green.

## Tags
#bug #lint #ghost-pattern #w-lint-007 #comment-range #scope-c #stage-1 #s42 #t1

## Links
- Intake: `docs/changes/fix-w-lint-007-comment-range-exclusion/intake.md`
- Sister fix: `docs/changes/fix-w-lint-013-context-scope/`
- Source: `compiler/src/lint-ghost-patterns.js`
- Tests: `compiler/tests/unit/lint-ghost-patterns-comment-exclusion.test.js`
