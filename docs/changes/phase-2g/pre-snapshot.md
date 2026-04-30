# Pre-Snapshot — phase-2g (chain branches mount/unmount)

## Date
2026-04-29

## Branch
changes/phase-2g-chain-mount

## Baseline (HEAD a70c6aa, before any edits)

```
8094 pass
40 skip
0 fail
28542 expect() calls
Ran 8134 tests across 383 files. [12.59s]
```

Pre-existing fails: **none.**

## Worktree setup notes

1. `bun install` was required at root + `compiler/` (worktree didn't have node_modules).
2. `bash scripts/compile-test-samples.sh` was required to populate `samples/compilation-tests/dist/` for browser tests. (This runs automatically via `pretest` hook on `bun run test`, but I called `bun test` directly which skips pretest.)

## Approach (greenlit per deep-dive)

- Approach A (per-branch templates + per-branch markers) reusing Phase 2c B1 helpers verbatim.
- W-keep-chain-only: single `<div data-scrml-if-chain>` chain wrapper retained; per-branch wrappers DROPPED for clean branches.
- Per-branch mixed-cleanliness dispatch: clean branches go through template+marker+mount/unmount; dirty branches stay inline-with-display-toggle wrapped in their own per-branch wrapper inside the chain wrapper.
- Strip-precursor unchanged.
- No spec amendment.
- No new runtime helpers.

## Files in scope

Primary edits:
- compiler/src/codegen/emit-html.ts (chain handler ~179-220 + B1 reuse for per-branch dispatch)
- compiler/src/codegen/emit-event-wiring.ts (chain controller ~561-610 → dispatch per-branch mount/unmount or display-toggle)
- compiler/src/codegen/binding-registry.ts (chain LogicBinding shape)

Tests:
- compiler/tests/unit/else-if.test.js (~3-5 assertion updates around 186, 187, 200, 221, 223)
- New: compiler/tests/unit/chain-mount-emission.test.js (~10-15 tests)

Spec:
- No SPEC.md amendment.

## Tags
#phase-2g #pre-snapshot #if-chain #mount-unmount

## Links
- Deep-dive: /home/bryan-maclee/scrmlMaster/scrml-support/docs/deep-dives/phase-2g-chain-mount-strategy-2026-04-29.md
- Phase 2c B1 reference: compiler/src/codegen/emit-html.ts:575-600
