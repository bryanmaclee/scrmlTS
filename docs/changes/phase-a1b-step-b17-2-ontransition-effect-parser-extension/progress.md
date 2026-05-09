# B17.2 progress log

**Worktree:** `.claude/worktrees/agent-a940a102a633659e9`
**Branch:** `worktree-agent-a940a102a633659e9`
**Baseline:** 10308 pass / 60 skip / 1 todo / 0 fail (clean run; brief's 10426 stale —
test consolidation between brief-write and dispatch-time).

## 2026-05-09 — Step 0: startup verification

- `pwd`, `git rev-parse --show-toplevel`, `git status --short` — all clean.
- `bun install` — 114 packages installed.
- `bun run pretest` — sample compilation succeeded.
- `bun run test` — flake on first run (2 fail: bug-k-sync-effect-throw + serve.test.js
  ECONNREFUSED). Re-run clean: 10308/60/1/0. Both flakes are non-deterministic network /
  effect-handler timing; not relevant to B17.2 territory.

## 2026-05-09 — Step 1: brief + spec absorption

- Read BRIEF.md in full.
- Read SPEC §51.0.H (lines 20536-20585) — formal `effect=` + `<onTransition>` spec.
- Read SPEC §51.0.I (lines 20587-20605) — `:`-shorthand body forms.
- Read kickstarter v2 §4.4 (lines 331-362) — canonical examples.
- Read A5-2 precedent: `engine-statechild-parser.ts:200-349` (scanForOnTimeoutEntries +
  scanForNestedEngineEntries) and `engine-statechild-parser.ts:592-768` (parseEngineStateChildren
  with body-scan integration).
- Read symbol-table.ts:339-421 — OnTimeoutEntry, NestedEngineEntry, EngineStateChildEntry
  fields.

## 2026-05-09 — Step 2: SURVEY committed

Three decisions documented in SURVEY.md:
1. `if=` delimiter — capture verbatim via greedy-stop, parens / `${...}` / bare all OK.
2. Self-closing `<onTransition/>` — capture-with-empty-body (mirrors `<onTimeout/>`).
3. Malformed-attribute fallback — capture-with-null (typer surfaces).
   - Sub-decisions: `:`-shorthand supported defensively; nested `<onTimeout>` inside
     `<onTransition>` body added to skipRegions.

## 2026-05-09 — Step 3: encode parser changes (DONE — commit 4d88e82)

- Added `OnTransitionEntry` interface to `compiler/src/symbol-table.ts` with all
  six fields per BRIEF §scope-IN item 1 (to/from/once/ifExprRaw/bodyRaw/
  isColonShorthand/rawOffset).
- Added `effectRaw: string | null` + `onTransitionElements: OnTransitionEntry[]`
  to `EngineStateChildEntry`.
- Added `scanForOnTransitionEntries` body-scan helper to
  `compiler/src/engine-statechild-parser.ts` (mirrors A5-2's
  `scanForOnTimeoutEntries`).
- Added `findOnTransitionCloser` depth-tracking helper.
- Extended `parseEngineStateChildren` opener-attribute parsing for `effect=${...}`
  via balanced-brace scan (parallel to `rule=` regex extraction).
- Extended body-scan loop to call `scanForOnTransitionEntries` BEFORE
  `scanForOnTimeoutEntries`, adding the `<onTransition>` regions to the latter's
  skipRegions to prevent double-counting.
- Path-discipline incident: initial Edit calls landed at main-repo paths
  (symlink resolution); recovered via cp + revert + re-stage in worktree before
  the WIP commit. No leakage to main-repo HEAD; main-repo working tree restored.
- `bun run test`: 10308 pass / 0 fail. Pre-commit + post-commit hooks GREEN.
  TodoMVC quick-check + browser validation PASS.

## 2026-05-09 — Step 4: encode unit tests (DONE — commit f13af5b)

### Initial test run revealed three categories of bugs

1. **Greedy regex consumed bare attrs** — `to=.X once if=...` would capture
   `to="X once"` and `if="(...) once"`. ROOT CAUSE: `(?=\s+\w+\s*=)` lookahead
   only stops at `name=` boundary; bare attrs like `once` (no `=`) don't trigger.
   FIX: replaced regex-based attr extraction in `scanForOnTransitionEntries` with
   a proper `parseOpenerAttributes` walker that handles mixed bare + valued attrs
   with paren / quote / `${}` depth tracking.

2. **`<onTransition>` body's `</>` closer prematurely closed outer state-child**
   ROOT CAUSE: `findStateChildCloser` increments depth for PascalCase opener
   tags (`<X>`); lowercase `<onTransition` doesn't bump depth, but its `</>`
   closer DOES decrement. Pre-existing latent issue masked by `<onTimeout/>`
   being self-closing; surfaced by B17.2 with bare-body `<onTransition>...</>`.
   FIX: added `<onTransition>` skip block to both `findStateChildCloser` AND
   `findEngineCloser` (mirrors existing `<engine>` skip handling).

3. **`findOpenerEnd` consumed `>` inside `${expr}`** — for `<onTransition if=${@a > 0}>`,
   the embedded `>` operator was treated as the opener's terminating `>`.
   ROOT CAUSE: pre-existing `findOpenerEnd` only respects paren / quote depth,
   not `${...}` brace depth. Latent bug for canonical `effect=${ "..." }` shapes
   too. FIX: extended `findOpenerEnd` with `${...}` balanced-brace skip.

### Final test counts

- B17.2 unit tests: 28 pass / 0 fail (compiler/tests/unit/b17-2-ontransition-effect-parser.test.js)
- Full suite: 10336 pass / 60 skip / 1 todo / 0 fail (vs baseline 10308 — net +28).
- A5-2 / B15 / B17 regression: 111 pass / 8 skip / 0 fail (no regression).
- TodoMVC quick-check + browser validation: PASS.
- Pre-commit + post-commit hooks: GREEN.

## 2026-05-09 — VERDICT: SHIP (commit f13af5b)

All §scope-IN items shipped:
- NEW `OnTransitionEntry` interface (symbol-table.ts)
- NEW `effectRaw` + `onTransitionElements` fields on `EngineStateChildEntry`
- EXTEND `parseEngineStateChildren` opener-attr parsing for `effect=${...}`
- EXTEND body-scan to call `scanForOnTransitionEntries` with skipRegions
- 28 unit tests covering all 13 §B17.2.* fixture shapes
- 0 regressions vs 10308 baseline

Three latent parser bugs fixed defensively (footguns surfaced by B17.2's
need but pre-existing in the `<engine>` / `effect=` path):
- `findOpenerEnd` `${...}` skip
- `findStateChildCloser` + `findEngineCloser` `<onTransition>` skip
- attribute walker for mixed bare + valued attrs

DEFERRED (per BRIEF §scope-OUT):
- B17.3 (typer): E-ENGINE-EFFECT-AMBIGUOUS firing
- Future C-step (codegen): SHOULD wait for B17.3 per SURVEY sequencing observation
- Component-body / `<match>`-arm parsing
- Variant-target validation (typer concern)

