# Pre-Snapshot: library-mode-types

Captured before any code changes. All changes in this run are additive (new test file + new sample file).
The fix in `emit-library.ts` was already present when this session began.

## Test State (before changes)

Command: `cd compiler && bun test --timeout 30000`

- 5,574 pass (first run, without timeout flag)
- 5 fail: all in "CSS @scope — component scoping" (pre-existing DQ-7 work-in-progress)
- 2 skip

With `--timeout 30000`:
- 5,591 pass (before new test file added)
- 0 fail
- 2 skip

## Pre-existing Failures (not regressions from this change)

- CSS @scope: T1, T5, T7, T9, T10 — part of DQ-7 pipeline (explicitly out-of-scope)
  These appear timing-sensitive; with longer timeout they pass.

## Library Mode State (before changes)

- `compiler/tests/unit/emit-library.test.js` — 28 tests, all passing
  - §9 tests (Bug R18 whole-block regex fix) already present and passing
  - Confirms `generateLibraryJs()` correctly strips type declarations

## E2E Library Mode Compilation

Not directly tested (no CLI execution permitted). Unit tests and API-level integration
tests confirm the fix works end-to-end. The new §2 integration test runs `node --check`
and passes.

## Tags
#library-mode #pre-snapshot #gauntlet-r18

## Links
- [progress.md](./progress.md)
- [gauntlet-r18-report.md](/home/bryan-maclee/scrmlMaster/scrml-support/docs/gauntlets/gauntlet-r18-report.md)
