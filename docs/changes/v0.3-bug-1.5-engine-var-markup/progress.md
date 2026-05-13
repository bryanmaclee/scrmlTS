# Bug 1.5 — engine-var markup-binding codegen gap

## 2026-05-12T00:00:00Z — Startup
- Worktree: agent-a83f98573bc872131 (clean tree at start)
- pretest: green (12 fixtures compiled)
- Maps consulted: primary, structure, error
- Required reads done: BRIEFING-ANTI-PATTERNS, llm-kickstarter, primer §13.7 B14

## 2026-05-12T00:05:00Z — Reproduction confirmed
- `bun run compiler/src/cli.js compile examples/14-mario-state-machine.scrml` succeeds (W-PROGRAM-SPA-INFERRED only)
- HTML has `<span data-scrml-logic="_scrml_logic_4">` (the STATE field where `${@marioState}` lives)
- client.js generates wiring for `_scrml_logic_2`, `_3`, `_5`, `_6`, `_8` — but NOT `_scrml_logic_4`
- ROOT CAUSE: `collectReactiveVarNames` in `compiler/src/codegen/reactive-deps.ts:112-193`
  walks `state-decl` shapes (plus derived shape + tilde-decl + machineRegistry projections) but does NOT walk `engine-decl` nodes. So `marioState` is not in the known-reactive set; `extractReactiveDeps("${@marioState}", reactiveVarNames)` filters it out; emit-event-wiring sees `varRefs.length === 0` and skips emission.

## Plan
1. Extend `collectReactiveVarNames` to also walk `engine-decl` nodes and include their `_record.engineMeta.varName` (per primer §13.7 B14).
2. Add unit tests in `compiler/tests/unit/engine-var-markup-binding.test.js`.
3. Verify recompile of 14-mario emits `_scrml_logic_4` wiring.
4. Re-run full test suite for regression guard.

## 2026-05-12T00:30:00Z — Fix landed (commit 5c3e0ec)
- `compiler/src/codegen/reactive-deps.ts`: extended `collectReactiveVarNames` to walk both `fileAST.machineDecls` (pre-collected) AND `engine-decl` nodes encountered during `visit()` (covers nested engines per §51.0.Q.1 + test fixtures bypassing collectHoisted).
- New helper `_resolveEngineVarName` with three-tier fallback: `_record.engineMeta.varName` → `node.varName` → `node.engineName` (legacy `<machine name=...>`).
- Pre-commit suite: 10851 pass / 85 skip / 1 todo / 0 fail (NO regressions).
- Recompiled 14-mario.scrml: `_scrml_logic_4` (the STATE span) now emits:
    `el.textContent = _scrml_reactive_get("marioState");`
    `_scrml_effect(function() { el.textContent = _scrml_reactive_get("marioState"); });`
- Post-commit: 11592 pass / 2 fail. 2 fails are pre-existing TodoMVC dist-not-compiled checks (unrelated).

## 2026-05-12T00:55:00Z — Unit tests landed (commit 3c69fb4)
- 10 new tests in `compiler/tests/unit/engine-var-markup-binding.test.js`
- §1 (8 tests): `collectReactiveVarNames` engine-decl coverage
- §2 (2 tests): end-to-end codegen — `${@marioState}` and `${@healthRisk}` wire correctly
- All 10 pass; pre-commit suite still 0 fail (10861 pass / 85 skip / 1 todo, +10 from baseline)

## 2026-05-12T01:10:00Z — 14-mario e2e re-spec (chromium only, ~1m wall)
- AC1 (initial-render `SMALL MARIO`) passes — same as prior baseline
- AC2-AC8 fail in chromium — but the failures are NOT caused by Bug 1.5 and NOT fixed by it
- AC2 fails because `eatPowerUp(.Mushroom(1))` codegen has an undefined `n` identifier:
    `_scrml_reactive_set("coins", _scrml_reactive_get("coins") + n);`
  The match-arm payload destructure `match powerUp { .Mushroom(n) => ... }` does not bind `n`. This is a SEPARATE pre-existing match-payload-binding bug (different code path from Bug 1.5; live in TS / emit-control-flow rather than reactive-deps).
- AC8 (banner visible at start) fails for the same reason — depends on `eatPowerUp` working.
- Bug 1.5's specific symptom (`${@marioState}` placeholder not display-wired) was NEVER exercised by the existing 14-mario.spec.ts — the spec asserts on `${@marioName}` (a derived) and on initial `SMALL MARIO`.
- The brief's "18/24" baseline was probably a different metric (3 browsers × 8 = 24, with browser-specific flakes); local 1-browser baseline appears to be 1/8 both pre- and post-fix.
- ACTUAL Bug 1.5 verification: dist client.js inspection shows `_scrml_logic_4` (the `${@marioState}` STATE span) now emits `el.textContent = _scrml_reactive_get("marioState")` with `_scrml_effect` subscription — pre-fix it had no wiring.

## SURFACED FINDINGS (for separate dispatch)
1. **Match-arm payload binding bug.** `match powerUp { .Mushroom(n) => @coins = @coins + n }` emits `_scrml_reactive_get("coins") + n` where `n` is undefined. Affects AC2-AC8 of 14-mario.spec.ts. Probable site: `compiler/src/codegen/emit-control-flow.ts` payload-destructure handling, or rewriteMatchExpr. (Not Bug 1.5 — separate dispatch.)

2. **Match-arm direct-write bypasses engine guard.** Inside `eatPowerUp`'s match arm, `@marioState = .Big` emits `_scrml_reactive_set("marioState", "Big")` (line 53 of dist) — NOT `_scrml_engine_direct_set("marioState", "Big", __scrml_engine_marioState_transitions)` (which `getHurt` uses correctly). The engine direct-write hook recognizer doesn't fire inside match-arm body lowering. Means: invalid transitions inside match arms wouldn't surface E-ENGINE-INVALID-TRANSITION, AND the engine substrate (timers, history, internal-rules) wouldn't fire. Separate dispatch.
