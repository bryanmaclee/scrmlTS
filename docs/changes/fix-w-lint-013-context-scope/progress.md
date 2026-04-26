# Progress: fix-w-lint-013-context-scope

Combined dispatch with A2 (`fix-w-lint-007-comment-range-exclusion`).
A1 step 1 = one-character regex tweak (`\s*=` → `\s*=(?!=)`).
A1 step 2 = reuse A2's `commentRanges` in W-LINT-013's skipIf.

## Baseline (pre-fix)

- Branch: `worktree-agent-a7ecf2afa4b522a64` (merged main `a7d9705`).
- `bun test` (worktree): **7878 pass / 40 skip / 0 fail / 373 files**.
- `examples/10-inline-tests.scrml`: **14** W-LINT-013 lints (lines 38, 42, 43,
  45, 49, 50, 52, 56, 58, 62, 65, 71, 72, 74). Mix of `assert @count == N`
  equality (6 lines) and `@var = N` assignments inside `~{}` test bodies (8 lines).
- `examples/14-mario-state-machine.scrml`: W-LINT-013 line 144 misfires on
  `if=(@healthMachine == HealthRisk.AtRisk && ...)`.

## TDD baseline (new tests on UNFIXED code)

- `lint-w-lint-013-equality-no-misfire.test.js`: 6 tests, **1 fail / 5 pass**.
  - Fails: §3 compound `if=(@x == 1 && @y == 2)` — second `@y` has leading
    whitespace after `&&`, regex misfires.
  - Sanity passes: §4, §5 (real ghosts still fire).
  - "Coincidental passes": §1 (inside `${}` excluded by existing skipIf),
    §2 and §6 (`(@x` after `(` has no leading whitespace so unfixed regex
    didn't match anyway).

## Fix applied

`compiler/src/lint-ghost-patterns.js`:
- Pattern 13 regex: `/\s@[a-z]...\s*=/g` → `/\s@[a-z]...\s*=(?!=)/g`
  (negative lookahead rejects `==`).
- Pattern 13 `skipIf`: now OR's `inRange(offset, commentRanges)` (uses A2
  infrastructure).

## Verification

- All 6 new W-LINT-013 equality-no-misfire tests PASS.
- All 97 existing lint-ghost-patterns tests still PASS (sanity for `@click=`,
  `@click.stop=`, `@submit.prevent=` regressions covered).
- Full suite: **7889 pass / 0 fail / 40 skip / 375 files**.
- `examples/14-mario-state-machine.scrml`: W-LINT-013 line 144 misfire GONE.
  File now zero lints.
- `examples/10-inline-tests.scrml`: 14 lints → **8 lints** (the 6 `assert
  @count == N` equality lines fixed; the 8 `@var = N` assignment lines
  inside `~{}` test bodies remain).

## Unexpected finding

Dispatch predicted ex 10 → 0 lints. Actual: 14 → 8. The remaining 8 are
`@var = N` *assignments* (single `=`) inside `~{}` test bodies, not the
predicted `==` *equality* form. This is a separate misfire class — the
A1 intake §"Step 3 (optional, deferred)" anticipated it: "If after step 1+2
there are still misfires inside `~{}` blocks... add a `buildTildeRanges`
helper. Not needed for W-LINT-013 specifically." A1's negative-lookahead
fix is correct and complete per the intake — `~{}` exclusion is a separate
follow-up (recommend a new finding, A2.5 or similar).

## Steps

- [00:00] Started — branch verified, main merged in, baseline captured.
- [00:01] TDD scaffolds written; 1 of 6 fails on unfixed code as expected.
- [00:02] Combined A2+A1 fix applied to `lint-ghost-patterns.js`.
- [00:03] All 11 new tests pass; full suite green.
- [00:04] Examples re-verified; ex 14 → 0 lints; ex 10 → 8 lints (unexpected
  remainder is single-`=` assignments inside `~{}` — separate finding,
  matches A1 intake's deferred Step 3).

## Tags
#bug #lint #ghost-pattern #w-lint-013 #regex-fix #equality-operator #scope-c #stage-1 #s42 #t1

## Links
- Intake: `docs/changes/fix-w-lint-013-context-scope/intake.md`
- Sister fix: `docs/changes/fix-w-lint-007-comment-range-exclusion/`
- Source: `compiler/src/lint-ghost-patterns.js`
- Tests: `compiler/tests/unit/lint-w-lint-013-equality-no-misfire.test.js`
