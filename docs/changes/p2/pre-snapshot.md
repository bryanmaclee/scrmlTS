# Pre-Snapshot: p2

## Branch + commit
- Branch: `changes/p2`
- Base: `1a89e84` (P1.E ship)

## Test baseline
- 8444 pass
- 40 skip
- 0 fail
- 405 files
- 29317 expect() calls
- ~14.47s wall-clock

## E2E samples
- `bun run pretest` succeeds, compiles 12 test samples to `samples/compilation-tests/dist/`.

## Pre-existing warnings (not regressions)
- `[scrml] warning: statement boundary not detected — trailing content would be silently dropped`
  in many gauntlet samples and example pages. These warnings exist on main pre-P2.
- `scrml effect error` and `scrml subscriber error` from `bug-k-sync-effect-throw.test.js` —
  these are intentional (the test exercises throw paths). Pre-existing.
- `Note(PA): Driver URI ...` informational logs from PA tests. Pre-existing.

## Existing P2 status
- DD1 master deep-dive at `/home/bryan-maclee/scrmlMaster/scrml-support/docs/deep-dives/state-as-primary-unification-2026-04-30.md`
- W6 worktree (parked) supposedly added a SHALL NOT against `export <markup>` to its §21.2 — to be verified NOT in main.
- Task scope: SPEC §21.2 amendment + TAB recognition + MOD population + tests.
