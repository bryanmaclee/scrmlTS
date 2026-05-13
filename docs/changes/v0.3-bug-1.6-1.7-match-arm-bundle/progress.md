# Bug 1.6 + Bug 1.7 BUNDLE — match-arm payload-binding (inline-arm) + direct-write engine-guard routing

## Status: IN PROGRESS

## Worktree: `worktree-agent-a8b213b33039b5199`

## Phase 0 — Setup + diagnosis (2026-05-12)

- Verified worktree clean, bun install + pretest green.
- Read maps (primary, structure) + BRIEFING-ANTI-PATTERNS + design-insights Insight 30 + SPEC §51.0.F + §51.0.F.1 + PA-PRIMER §13.7 B14/B20.
- Cherry-picked `d8ea41c` (Bug 1 fix-A — block-arm payload binding + opts threading + EnumType::Variant + derived_get tracks) — required prior on this worktree base.
- Cherry-picked `a72ccd2` (Bug 6.5 regression-guards).

## Phase 1 — Reproduction + diagnosis

Re-compiled `examples/14-mario-state-machine.scrml` post-cherry-pick and verified Bug 1 fix-A correctly fires for **block-arm** form:
```
.Mushroom(n) => { @coins = ... ; @marioState = ... }
```
- Line 52: `const n = _scrml_match_19.data.coins;` ← payload binding works
- Line 53: `_scrml_engine_direct_set("marioState", ..., __scrml_engine_marioState_transitions);` ← engine-routing works
- Lines 56/58/63: same for Flower/Feather

So Bug 1 fix-A + fix-C closed the **block-arm** half of both Bug 1.6 and Bug 1.7. Brief was correct.

Wrote synthetic inline-arm fixtures at `tmp-inline-test/` to surface the **inline-arm** half:

**inline-direct-write.scrml** confirmed:
- Bug 1.6 inline-arm payload binding: WORKS (line 29-30 of compiled output emits `const n = _scrml_match_5.data.coins;` for `.Mushroom(n) => @coins = @coins + n`).
- Bug 1.7 inline-arm engine-write routing: BROKEN (line 39-41 emits `_scrml_reactive_set("marioState", "Big")` instead of `_scrml_engine_direct_set("marioState", "Big", __scrml_engine_marioState_transitions)`).

**Diagnosis:** The inline-arm path in `emit-control-flow.ts:emitMatchExpr` flows arm.result through `emitExprField` → `emit-expr.ts:emitExpr` → `emitAssign` (line 471-494). `emitAssign` directly emits `_scrml_reactive_set` with no consultation of any engine-routing context. The block-arm path goes through `emitLogicBody(arm.structuredBody, opts)` → `emit-logic.ts:_emitReactiveSet` which DOES consult `opts.engineBindings`.

**Fix shape (Option A — minimal surgical):** Add `engineBindings` field to `EmitExprContext` (mirrors how `engineVarNames` was added for `.advance()` interception at C13). In `emit-expr.ts:emitAssign`, when LHS is `@<name>` and `name in ctx.engineBindings`, dispatch to `emit-engine.ts:emitEngineWriteGuard` (returns multi-line text). This brings inline-arm body into structural parity with block-arm body for engine-write routing.

**Bug 1.6 outcome:** Bug 1.6 INLINE-arm is actually ALREADY FIXED in current state. The brief's premise that inline-arm payload-binding fails was INCORRECT — `matchArmInlineToMatchArm` DOES carry the binding through (line 902 sets `binding: variantMatch[2]?.trim() ?? binding ?? null`), and `emitVariantBindingPrelude` wraps the result correctly. Verified empirically.

## Phase 2 — Fix implementation (commit 81cc113)

Modified `compiler/src/codegen/emit-control-flow.ts`:
- Added `detectInlineEngineWrite(armResult, engineBindings)` helper that parses
  `^@<name>\s*=...` arm-result shape, looks up name in engineBindings, and
  returns precomputed `emitEngineWriteGuard` lines (mirrors rewriteBlockBody:1189).
- `emitMatchExpr` now reads `opts.engineBindings + engine-substrate fields` and
  builds an `EngineRewriteCtx`. The `_matchCtx` for arm-result emission gets the
  exprCtxExtras spread so `.advance(.X)` calls inside arm RHS reach C13.
- Inline-arm result emission (line 1374-1375): when `inlineEngineWrite` non-null,
  swap `return _scrml_reactive_set(...)` for `{ <bindingPrelude>{guardLines} }`.
- Braced-statement arm body (`. V => { stmt; }`) at line 1371: pass `engineCtx`
  to `rewriteBlockBody` (was: bare call with no engine context).
- Wildcard presence-arm (`(x) => @engineCell = .X`): also routes through
  inline-engine-write path.

## Phase 3 — Tests (commit c3c58c5)

Added `compiler/tests/unit/match-arm-codegen-bundle-bug-1.6-1.7.test.js` —
10 tests across 3 describe blocks:
- §1.6.A1-A3: inline-arm payload binding regression-guards (3 tests).
- §1.7.A1-A4: inline-arm engine-write routing (4 tests).
- §1.7.NEG: non-engine cell write — bare _scrml_reactive_set still emitted
  (negative case, ensures detection arm doesn't misfire).
- §1.7.OPT: self-write `@engine = .CurrentVariant` routes through helper —
  required for §51.0.F.1 Option-d no-op semantics.
- §INT1: 14-mario fixture integration smoke.

**Suite delta:** 9137 → 9147 unit pass (+10 net, 0 regressions). Integration +
conformance suites unchanged.

## Phase 4 — 14-mario AC verification (post-fix)

Cherry-picked `dd91318` (Option-d D1 — runtime no-op on self-write) which the
brief lists as load-bearing context but was NOT on this worktree base.

**14-mario AC delta:** Pre-fix (post-cherry-pick of just d8ea41c+a72ccd2): 6/8
Chromium (AC6/AC7 fail due to runtime missing self-write no-op + match-arm
inline-arm engine-write bypass). Post-fix + Option-d D1 cherry-pick: **8/8
Chromium, 8/8 Firefox** (WebKit not run — same bundle expected to pass).

## Phase 5 — Surfaced findings

- **The brief's premise was partially misframed.** Bug 1.6 (both block-arm AND
  inline-arm) was already fixed by Bug 1 fix-A and the existing
  `matchArmInlineToMatchArm` regex. Only Bug 1.7 inline-arm needed actual
  codegen work in this dispatch.
- **Bug 1.7 block-arm** was already fixed by Bug 1 fix-C (S87 d8ea41c). The
  remaining gap was Bug 1.7 INLINE-arm.
- **Cherry-pick chain detail:** PA's brief said "PA lands via cherry-pick
  (emit-control-flow.ts has prior S87 commits — Bug 1 fix-A `d8ea41c` + Bug 6.5
  tests `a72ccd2`)". The worktree base (S86 close 7a00b1b) was BEFORE those
  commits, so I cherry-picked them locally to have a correct base for
  diagnosis + fix. Plus added `dd91318` (Option-d D1 runtime no-op) for AC6/AC7
  verification — this is on main but wasn't on the worktree base either.
- **No spec change needed.** §51.0.F.1 Option-d semantics already authoritatively
  describe the runtime carve-out; my fix brings the codegen surface into
  conformance with that semantic across all match-arm engine-write sites.

## Status: DONE


