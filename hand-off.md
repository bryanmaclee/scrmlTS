# scrmlTS — Session 27 Wrap

**Date opened:** 2026-04-18
**Date closed:** 2026-04-19 (crossed midnight — single-arc session)
**Previous:** `handOffs/hand-off-27.md` (S26 wrap rotated in as S27 starting brief)
**Baseline entering S27:** 7,069 pass / 10 skip / 2 fail (25,991 expects / 301 files) at `6ca1adf`.
**Final at S27 close:** **7,126 pass / 10 skip / 2 fail** (26,187 expects / 309 files) at `5d0bdc6`.

---

## 0. Close state

### All S27 commits on origin/main
Two-batch push (user authorized both). Tip: `5d0bdc6`. No unpushed commits.

### Uncommitted
- `docs/SEO-LAUNCH.md` — still carrying the pre-S26 LICENSE hash + About copy edit, untouched for the third session in a row. Whenever the SEO work next moves.

### Incoming
`handOffs/incoming/` empty (only `read/` archive).

### Cross-repo
scrmlTSPub retirement still pending at master from S25. No new status from master during S27.

---

## 1. Session theme — "close every correctness gap the machine feature was silently carrying"

S26 shipped §2b F (auto-property-tests) end-to-end. The property-test harness synthesizes its own `{variant, data}` objects to exercise the transition guard. That masked a fact S27 exposed in the first hour: **the real transition guard was broken at runtime for unit-variant enums.** No existing test touched the compiled runtime path — every machine test was either shape-only or ran through a harness that bypassed the bug.

Once the first bug surfaced, the session turned into a correctness sweep. Every subsequent arc either closed a cluster deep-dive item (§2b G) or fixed a silent-runtime bug that had been hiding behind shape tests. Each new arc typically surfaced the next bug during its own test writing. Eight commits landed, all zero-regression.

### S27 commit chain (origin)

| # | Commit | Scope |
|---|--------|-------|
| 1 | `eff8188` | fix(§51.5): unit-variant transitions crash at runtime. `__prev.variant` extraction falls back to `__prev` for bare-string enum values, not `"*"`. 3 end-to-end regression tests that actually execute the compiled transition guard. |
| 2 | `224847d` | feat(§51.11): audit entry shape — rule + label fields. §51.11.4 rewritten for `{from, to, at, rule, label}`. `emitTransitionTable` bakes labels; `emitTransitionGuard` computes `__matchedKey` alongside `__rule` via parallel ternary fallback chain. 10 tests. |
| 3 | `267ed61` | feat(§51.11): audit completeness — timer transitions + freeze. `_scrml_machine_arm_timer` signature extended with `meta` param carrying auditTarget + rulesJson; timer expiry now audits AND re-arms downstream temporal rules. `Object.freeze` on every entry. 5 tests. |
| 4 | `00ba7d3` | feat(§51.14): replay primitive — `replay(@target, @log [, index])`. New §51.14 (~150 line) spec section. Runtime helper bypasses guard + audit + clears timers. Codegen recognizes the built-in in the structured Call emitter. 12 tests. |
| 5 | `abfe637` | fix(§51.5): guarded wildcard rules fire guard + effect. Guard-evaluation and effect-block emission now match on `__matchedKey` (fallback-resolved) instead of `__key` (literal runtime variants). One-line change in each branch. 6 tests. |
| 6 | `2453062` | feat(§51.14): compile-time validation for `replay()` args (G2 slice 2). E-REPLAY-001 (machine-bound target) + E-REPLAY-002 (declared reactive log) via a duck-typed recursive AST walker in type-system. 7 tests. |
| 7 | `73225f7` | fix(§51.5): effect-body @-refs compile through `rewriteExpr`. `rule.effectBody` was inserted raw; reactive refs passed through as literal `@` tokens. 5 runtime tests. |
| 8 | `5d0bdc6` | fix(§18): match-arm expression-only form on a single line. `splitMatchArms` rewritten as a char-level scanner (depth + strings + comments) so inline multi-arm bodies split correctly. 9 tests. |

### §2b G free audit/replay — closed end-to-end

- **Audit write surface (§51.11):** every successful transition (user-triggered or timer-fired) appends a frozen entry `{from, to, at, rule, label}` to the machine's audit array. `rule` is the canonical wildcard-fallback-resolved table key. `label` is the identifier from a labeled guard on the matched rule.
- **Replay read surface (§51.14):** `replay(@target, @log)` / `replay(@target, @log, n)` consumes the audit log to reconstruct any past state. Bypasses transition guard, audit push, clears pending timers. Runtime validates bounds; compile-time validates arg shapes.
- **Not shipped (intentional non-goals):** interactive time-travel UI (user-space), machine-type parity check between target + log (E-REPLAY-003 slot), §52 server-side audit amendment.

### Machine-runtime correctness sweep

Four pre-existing latent bugs closed. All silent-runtime bugs — shape tests didn't catch them because shape tests don't execute the generated JS. The pattern in every case: the compiler emitted something that LOOKED right but was subtly broken at runtime.

| Bug | Impact | How it hid |
|---|---|---|
| Unit-variant transitions crash | Every machine-governed unit-variant enum threw E-MACHINE-001-RT on any transition | Shape tests; S26 property-test harness synthesized `{variant,data}` objects that bypassed the bug |
| Timer-fired transitions skip audit | §51.11.6 "every successful transition SHALL append" violated for temporal rules | No existing test exercised timer + audit together; timers bypassed transition guard entirely |
| Guarded wildcard rules never fire guard | `* => .X given (…)` treated as unguarded at runtime | Guard check keyed on literal `__key` not the matched rule key; no existing runtime test |
| Effect-body @-refs emit literal `@` | Any machine with `{ @trace = @trace.concat(...) }` style effect produced invalid JS | Effect-body shape tests never executed the output |

### §18 ergonomics closure

Single-line match-arm form (`match x { .A => 1 .B => 2 }`) worked in spec's worked examples since §18 was authored but the parser rejected it with E-TYPE-020 because `splitMatchArms` only split on newlines. Char-level scanner replaces line scanner.

### Files touched

**Production code:**
- `compiler/SPEC.md` — §51.11.2/51.11.4/51.11.6 rewritten, new §51.14 (~210 lines)
- `compiler/src/codegen/emit-machines.ts` — __matchedKey, label-in-table, Object.freeze, unit-variant fallback, timer meta, wildcard-matchedKey parity, effectBody rewrite
- `compiler/src/codegen/emit-expr.ts` — replay Call-node recognition
- `compiler/src/codegen/emit-logic.ts` — temporal rulesPayload gains label; arm_initial gets auditTarget
- `compiler/src/codegen/rewrite.ts` — rewriteReplayCalls pass + wiring
- `compiler/src/runtime-template.js` — _scrml_replay; arm_timer meta param; arm_initial auditTarget
- `compiler/src/type-system.ts` — E-REPLAY-001/002 validator; splitMatchArms rewrite; `replay` in allowlist
- `compiler/src/ast-builder.js` — collectExpr match-arm boundary detection (defensive)

**Tests:**
- `compiler/tests/unit/gauntlet-s27/` — 7 new files, 55 tests
- `compiler/tests/unit/gauntlet-s22/machine-payload-binding.test.js` — regex tightening
- `compiler/tests/unit/gauntlet-s24/machine-audit-clause.test.js` — audit shape update
- `compiler/tests/unit/gauntlet-s25/machine-effect-without-guard.test.js` — __matchedKey shape
- `compiler/tests/unit/machine-codegen.test.js` — effect-body + __matchedKey shape

---

## 2. Queued for S28

### High-impact (ordered by natural-next-ness)

1. **Static-elision arc with fresh deep-dive.** Task #14. The SPARK-style "emit runtime guard only when not trivially provable" design from `scrml-support/docs/deep-dives/radical-doubt-machine-contract-unification-2026-04-08.md` line 236 is ratified but not implemented. Every machine-bound assignment pays the runtime-guard cost today, including `@order = S.X` where both sides are compile-time literals. The design is 10+ days stale and the compiler surface has changed substantially (the §51.11 + §51.14 work in S27 expanded the guard IIFE). Open with a fresh deep-dive to re-confirm direction before implementation. The user specifically queued this one up with "lets plan on queuing that arc and deep-dive."

2. **§51.13 phase 7 — guarded projection machines.** Still queued from S26. First-match-wins projection-guard evaluation against simulated reactive state. Blocked on parametrization-model decision.

3. **§51.14 E-REPLAY-003 machine-type parity.** Cross-machine replay is currently permitted (spec §51.14.6 non-goal). Would require tracking machine identity in audit entries, or carrying a machine-name field in the compile-time validation pass. Small arc IF we decide to enforce; could also stay a non-goal forever.

### Small correctness items (pre-existing, surfaced during S27)

4. **Multi-statement effect body parser bug.** `parseMachineRules` in type-system.ts line 2328 splits rule lines on `[\n;]`. An effect like `{ @a = 1; @b = 2 }` fragments because the `;` is treated as a rule separator. Fix: track `{}` depth when splitting. Small, well-scoped.

5. **`_scrml_effect` name conflict with user functions named `effect`.** Surfaced during S27 test writing — my buildEnv helper's knownInternal regex catches `_scrml_effect_N` too. Not a compiler bug but a naming-convention gotcha; worth documenting in the user-facing error messages for name-mangling collisions.

### From the S25–S26 queue (carried forward)

- **Error-arm `!{}` bindings scope-push.** Still queued from S25.
- **Full Lift Approach C Phase 2.**
- **P3 self-host completion + 2 pre-existing self-host fails.** Same 2 fails unchanged across S24–S27.
- **P5 TS migrations** (`ast-builder.js`, `block-splitter.js`).
- **P5 ExprNode Phase 4d / Phase 5.**
- **Async loading stdlib helpers.**
- **DQ-12 Phase B.**

### Design / user-decision (deferred)

- **Approach C lin** (cross-function `lin:out` / `lin:in`) — still deferred.

---

## 3. Important design decisions made this session

### Machine enforcement: runtime is primary, static is optimization

Confirmed against `debate-state-dynamics-2026-04-08.md` (ratified lookup-table runtime enforcement) and `radical-doubt-machine-contract-unification-2026-04-08.md` line 236 (SPARK-style hybrid: static error for trivially-provable, runtime guard otherwise). The user interrogated this mid-session with a "state machines enforced TWICE" framing; the correct reframe is "runtime is the only enforcement for most transitions in a reactive UI; compile-time is just name-existence." See user-voice Session 27 for the full exchange. This shaped the decision to queue static-elision with a fresh deep-dive rather than implement it blind.

### §51.14 replay semantics

- Bypass transition guard + audit push (validated-and-recorded historical transitions don't need revalidation; double-logging would be surprising).
- Clear pending temporal timers (stale arms would fire into replayed state and push spurious audit entries).
- Do fire subscribers, derived propagation, effects (UI updates on replay for free; effects-that-shouldn't-re-run belong in machine rule effect blocks which don't fire on replay since the guard is bypassed).
- Function-call syntax, not new keyword. No grammar change.

### S27 runtime-test convention

Several S27 tests execute compiled output via `SCRML_RUNTIME` in a `Function()` sandbox. This pattern now has precedent across four test files:
- `compiler/tests/unit/gauntlet-s27/unit-variant-transition-regression.test.js`
- `compiler/tests/unit/gauntlet-s27/audit-entry-rule-label.test.js`
- `compiler/tests/unit/gauntlet-s27/audit-timer-and-freeze.test.js`
- `compiler/tests/unit/gauntlet-s27/replay-primitive.test.js`
- `compiler/tests/unit/gauntlet-s27/guarded-wildcard-rules.test.js`
- `compiler/tests/unit/gauntlet-s27/effect-body-reactive-refs.test.js`

Common helper shape: regex-extract user function names from compiled JS, closure-capture them into a userFns object returned from the Function body. This enables tests to invoke compiled user functions without DOM setup. New compiler features that claim runtime behavior should use this pattern rather than shape-only assertions — every pre-existing shape-tested bug S27 closed went undetected for months under shape-only testing.

---

## 4. Test infrastructure state

- Test suite entry: `bun test compiler/tests/`.
- Pretest hook: `scripts/compile-test-samples.sh`.
- Suite at tip: **7,126 pass / 10 skip / 2 fail** / 26,187 expects / 309 files / ~5.5s.
- New gauntlet dir `compiler/tests/unit/gauntlet-s27/` (7 files, 55 tests).
- New CLI flag this session: none (G2 replay is a language primitive, not a CLI toggle).

---

## 5. Agents available

Same primary roster as S22–S26. No new agents staged this session.

---

## 6. Recommended S28 opening sequence

1. Check `handOffs/incoming/` — may have messages from master re scrmlTSPub retirement.
2. Verify origin/main at `5d0bdc6`.
3. **Highest-value S28 opener: kick off the static-elision deep-dive** (Task #14). Dispatch `scrml-deep-dive` with a brief that references `radical-doubt-machine-contract-unification-2026-04-08.md` §236 and the S27 guard-IIFE expansion. Question for the deep-dive: given the §51.11 audit push, the __matchedKey resolution, and the Object.freeze in every guard, what's the actual cost/benefit of static elision TODAY? Does the design still hold when the guard IIFE has tripled in surface? Output informs whether S28 implements elision, redesigns the guard to be cheaper, or does nothing.
4. Alternatives if user prefers smaller scope: (a) multi-statement effect body parser fix (small, concrete), (b) §51.13 phase 7 guarded projection machines (medium, needs design decision), (c) match-arm work carry-on (error-arm scope-push from S25 queue).

---

## Tags
#session-27 #closed #all-pushed #s2bG-complete #spec-§51.14 #audit-replay-shipped #unit-variant-fixed #timer-audit-fixed #wildcard-guards-fixed #effect-refs-fixed #match-arm-single-line-fixed #queue-static-elision-deep-dive #queue-§51.13-phase-7 #queue-multi-stmt-effect-parser
