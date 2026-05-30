# Progress: bug-ab-engine-direct-ontransition-parser-gap-2026-05-30

Reopens Bug-AB (6nz). S144 (5113f3ea) landed only write-ROUTING; the engine-DIRECT
`<onTransition>` effect-firing remained broken — parser dropped the element entirely.

## Baseline (HEAD 6e832615)
- bun run test: 22262 pass, 223 skip, 1 todo, 5 fail (3 `(fail)` markers).
- Known flakes (pre-existing): bootstrap ts.scrml, bootstrap ast.scrml, trucking-dispatch manifest-stability.
- pretest: green.

## Bug confirmed on HEAD (reverse R26)
- /tmp/bug_ab_repro.scrml (engine-DIRECT `<onTransition from=.X to=.Y>` as child of `<engine>`):
  - `function __scrml_engine_mode_fire_hooks` DEFINED: 0 (BROKEN)
  - onTransition effect body `_scrml_reactive_set("transitions", get+1)`: 0 (only init present)
  - fire_hooks CALL: 0
  - No diagnostic emitted (silent no-op).
- /tmp/bug_ab_nested.scrml (NESTED `<onTransition to=.Edit>` inside `<Nav>`):
  - fire_hooks DEFINED: 1, effect body: 2, fire_hooks CALL: 3 (WORKS).

## Root (PA-verified, re-verified at source)
- engine-statechild-parser.ts:1704-1708 — engine-body state-child scanner skips any opener
  whose char after `<` is not uppercase A-Z. `<onTransition>` (lowercase) → SKIPPED.
- Only `scanForOnTransitionEntries` (867) captures onTransition, and it's only invoked over
  per-state-child bodyRaw (1911) — i.e. NESTED placement only.
- collectEngineHooks (emit-engine.ts:2906) reads only child.onTransitionElements → [] for
  engine-direct → engineHasHooks=false → no fire fn → no fire call.

## Plan
1. Parser: add engine-level scan of full rulesRaw via scanForOnTransitionEntries, excluding
   per-state-child opener-to-closer ranges (mirror onIdle Step 3.5 placement logic). Return
   engine-direct entries.
2. symbol-table.ts: populate new EngineMetadata.engineOnTransitions field at the
   parseEngineStateChildren call site (PASS 11), only for non-native (production) path; mirror
   for native walker if feasible.
3. emit-engine.ts collectEngineHooks: add branch consuming meta.engineOnTransitions — both
   from= and to= explicit → emit arm directly (no enclosing-state-child inference).
4. Regression test for the CANONICAL engine-direct shape (emit + happy-dom). Verify nested still works.

## Log

## Implemented (commits on worktree-agent-abca2bafa7cf321ee)
- d1dd8383 WIP: baseline + bug confirmed on HEAD.
- c0c1c9c8 WIP: parser scanForEngineDirectOnTransitions over full rulesRaw (skip-region exclusion).
- 30526132 fix: native walkEngineDirectOnTransitions + symbol-table engineOnTransitions field +
  emit-engine collectEngineHooks 'direct' arm branch. NO runtime change.
- 1ac8d8ac test: regression (engine-direct emit+runtime / nested no-regression / mixed compose).

## Verification (R26)
- Engine-direct repro POST-FIX: fire_hooks fn DEFINED=1 (was 0), effect body=2 (was 0),
  fire CALL=3 (was 0). Emitted JS node --check OK. happy-dom toggle x2 -> transitions=2.
- Nested form POST-FIX: effect body still 2 (no double-count), fire CALL=3 — no regression.
- Mixed nested+engine-direct: editHits/navHits each fire once.
- New regression test: 3 pass, 28 expect().
- Pre-commit hook (15350 tests) green on the test commit.

## S144 RECORD CORRECTION
S144 5113f3ea "fire_hooks generated, only routing missing" was TRUE ONLY for the NESTED
placement. For the engine-DIRECT form the fire machinery was never reached — the parser
dropped the element. This is a PARSER COVERAGE GAP, not absent codegen/runtime.

## Maps feedback
primary.map.md was load-bearing for routing (parser+codegen file map, no-`--no-verify`,
R26 doctrine, diagnostic-stream partition). The PA-supplied exact loci were ACCURATE and
the decisive navigation aid — maps gave the region, PA loci gave the lines. ~32-commit
staleness did not affect the touched files (all PA loci verified against source).
