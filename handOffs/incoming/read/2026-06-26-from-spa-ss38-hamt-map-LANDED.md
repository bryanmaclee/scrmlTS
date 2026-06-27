# sPA ss38 → PA — re-integration: HAMT map runtime swap LANDED (FBIP increment 1 + S94 fix)

**List:** `spa-lists/ss38-hamt-structural-sharing-maps.md` (HAMT / structural-sharing maps — FBIP increment 1, SURVEY-FIRST).
**Branch:** `spa/ss38` — **tip `72ccfff4`** (`origin/main...spa/ss38` = `0 2`; 2 commits ahead, no leak).
**Date:** 2026-06-26. **Status: COMPLETE — 1/1 landed, 0 parked, 0 dropped.**

## Items

| # | Item | Status | SHA |
|---|------|--------|-----|
| 1 | HAMT map runtime swap (FBIP incr 1 + S94 blow-up fix) | **landed-on-branch** | `9787078a` |

(`72ccfff4` = bookkeeping: mark-done + BRIEF archival + progress.)

## ⚠ This was a CRASH-RECOVERY land — read before you FF

A **prior ss38 sPA session** had already done the full arc and **died before verify+land**:
- It dispatched scrml-js-codegen-engineer (worktree `agent-a923ae997f5796380`, still locked).
- The agent **committed the complete work as `f30d61bf`** (clean tree, pre-commit gate green) at base `12600217`, then the sPA session crashed pre-land. `spa/ss38` was left stale at `12600217` with the item still `[status=open]`.

This session **recovered** it: verified 0 file-overlap between the agent's 4 files and the 3 intervening doc commits (`12600217..69cee28b`, all maps/changelog/hand-off — no code) → **rebased the agent's commit onto current `origin/main` (`69cee28b`) via cherry-pick** → `9787078a` → re-verified → landed. No work was redone; the agent's commit is intact (cherry-pick of `f30d61bf`).

## What landed (`9787078a` — 4 files, +628/-143)

Swap the §59 value-native **map** runtime rep from **COW-clone-the-whole-entries-object** (O(n)/write — the S94 super-linear blow-up) to a **persistent HAMT** (O(log n) shared-path write). Still pure/immutable (structural sharing, NOT in-place) → **no uniqueness pass, zero soundness risk.**

- **Phase-0 verdict = Strategy A** (lazily-materialized **memoized `.entries` compat view**). Map = `{ __scrml_map, _root, _count, _seq, ordered }` + an enumerable self-describing `.entries` instance getter. The five value-walkers (`==` / `_scrml_value_canonical` / `_scrml_log_render` here + the **`data.js` and `log-loc.ts` REPLICAS**) read `m.entries` **UNCHANGED** → **zero edits to the 3 direct-reader sites incl. both replicas** (the getter keeps the `==` branch self-contained in the equality chunk; no cross-chunk call). The hot write path reads `_root` directly and never materializes the view → the structural-sharing win stands.
- Per-entry `_seq` reproduces the prior `Object.keys` insertion order **byte-for-byte** (ordered AND unordered). Codec rewritten to walk leaves (lossless + bit-stable). Hash reuses `_scrml_fnv1a` (one normative hash codec).
- **Files:** `compiler/src/runtime-template.js` (the swap), `value-native-map-e2e-d4.test.js` + `value-native-set-e2e.test.js` (updated to extract the new HAMT helper set), new `compiler/tests/unit/value-native-map-hamt-differential-ss38.test.js`.

**Perf (the standalone S94 win):** insert-loop 4×-N time ratio **3.9× (near-linear)** vs COW **12.2× (approaching quadratic)**; **~988× faster at N=8000.**

## sPA verify (independent, this session — not the dev self-report)

1. **Differential soundness gate** `value-native-map-hamt-differential-ss38` — **green, 4729 assertions** (HAMT observably IDENTICAL to inline COW over randomized + adversarial seqs: nested-map/struct/enum keys, stored-`not`, ordered+unordered, dup last-wins, -0/+0, remove-reinsert, large N, codec round-trips). Ran it + both e2e directly: **32 pass / 0 fail / 4793 expect().**
2. **Pre-commit blocking gate** (unit+integration+conformance) on the cherry-pick AND the bookkeeping commit: **18061 pass / 68 skip / 0 fail / 72465 expect().**
3. **TRUE full `bun test compiler/tests/`** (the scope the hook SKIPS — per your ss37 process note): **25478 pass / 0 fail / 25693 tests / 1106 files.** parser-conformance **within-node idempotency ALL PASS**; corpus C2 canary 995/1011 at baseline (16 known gap-ledger skips). **ss38 added NO `.scrml` fixture** (only a JS unit test + runtime change) → the parser-conformance gates are untouched — **no allowlist re-baseline needed** (unlike ss37). The 2 browser-todomvc fails the post-commit hook flagged were the **S209 worktree gitignored-dist env-gap** (browser tests excluded from the blocking gate); they pass once dist is compiled — confirmed (0 fail on the full run after the post-commit gauntlet built dist).

## ss38 ↔ ss37 — sequencing fully DISSOLVED (confirms ss37's note from the map side)

ss37's Set landed on COW; this swap **automatically covers it**. `set[K]` is a **thin desugar over the §59 map** (`reactive-deps.ts:331`) — there is **no separate `_scrml_set_*` structure**, so swapping the map rep IS the set swap. `value-native-set-e2e` green. The list's "swap map+set together" contingency is satisfied by the single map swap — **nothing set-specific to do.** No follow-up coupling.

## PA actions

- **FF-merge `spa/ss38` (`72ccfff4`) → `main` when ready; push.** Clean FF (rebased onto current `origin/main`, `0 2`).
- **Prunable at re-integration:** the dead agent worktree `agent-a923ae997f5796380` (locked) + its branch `worktree-agent-a923ae997f5796380` (squash-source `f30d61bf`, now cherry-picked); the ss38 sPA worktree `/home/bryan-maclee/scrmlMaster/scrml-spa-ss38`.
- **Note:** I added gitignored symlinks (`node_modules`, `compiler/node_modules`, `samples/compilation-tests/dist`, `benchmarks/todomvc/dist`) into the ss38 worktree to provision the gate — all ignored, none committed, harmless; gone when the worktree is pruned.
- No parked items, no open forks. List COMPLETE.
