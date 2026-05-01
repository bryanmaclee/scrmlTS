# Pre-Snapshot: P1.E

Recorded before any code changes.

## Test state
- bun test (root): 8388 pass / 40 skip / 0 fail / 401 files / 14.51s wall-clock
- bun test (compiler dir, no pretest): 8255 pass / 40 skip / 134 fail (browser tests need pre-compiled samples)
- pretest: `scripts/compile-test-samples.sh` compiles 12 samples into `samples/compilation-tests/dist/` before browser tests can pass
- Pre-existing failures: NONE when `bun test` invoked from root (which runs pretest)

## Branch
- `changes/p1.e` based at `0334942` (main HEAD)
- Worktree: `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-ab3e556bd7b2c54e7/`

## Foundations P1 already shipped (don't redo)
- SPEC §4.3 / §15.6 / §15.8 / §15.12 case-rule softened (SHALL → MAY)
- SPEC §15.15 NEW — unified state-type registry section
- SPEC §34 — W-CASE-001, W-WHITESPACE-001, W-DEPRECATED-001 catalogued (not yet emitted)
- TAB recognizes `<engine>` keyword + emits W-DEPRECATED-001 on `<machine>`
- 2 examples migrated to `<engine>` keyword
- PIPELINE Stage 3.05 NameRes (NR) **design contract** documented

## P1.E baseline expected behavior (must not change without intent)
- 8388 tests pass
- All existing fixtures using `<id>` and `< id>` opener forms continue to compile
- W-DEPRECATED-001 fires on `<machine>` keyword (already shipped P1)
- W-CASE-001 + W-WHITESPACE-001: catalogued but NOT yet emitted
- No NameRes file exists (only design contract in PIPELINE.md)

## Performance baseline
- Wall-clock for full test run: 14.51s
- P1.E target: within 10% (~16s)
