# Phase A1c — Step C9: Cross-field validator dependencies (L14)

**Phase:** A1c. Wave 3 sibling (parallel with C10, C11 after C8 land).
**Estimate:** ~3-5 h focused.
**Dispatched:** 2026-05-08 (S73).
**Authority chain:** SPEC §55.11 (cross-field validation via predicate args) + L14. SCOPE-AND-DECOMPOSITION row C9 (`docs/changes/phase-a1c-codegen/SCOPE-AND-DECOMPOSITION.md:222`).

## Goal (one paragraph)

C7's per-field runner (S73, `f935822`) ALREADY subscribes to cross-field `@cell` reads in predicate args via `forEachIdentInValidatorArg` and emits `() => _scrml_reactive_get("otherCell")` thunks. C9 REFINES this propagation — ensures cross-field changes correctly re-fire the dependent field's validator AND that the propagation doesn't redundantly fire downstream cells. Concretely: when `<confirm eq(@signup.password)>` exists and `@signup.password` changes, `@signup.confirm.errors` recomputes (already wired by C7), and via C8's compound rollup `@signup.errors`/`isValid` recompute too. The dep-graph wiring needs verification: are the right edges in place at Stage 7 (DG)? Are there any cases where C7's thunk + reactive-get path miss a dep (e.g., cross-cell refs in nested args, transitive through stdlib calls, etc.)?

## What's already in place (depth-of-survey signal — substantial)

- **C7 cross-field plumbing:** at `compiler/src/codegen/emit-validators.ts:178-189`, the `valueDeps` loop iterates each validator's args via `forEachIdentInValidatorArg` and emits `_scrml_derived_subscribe` calls per cross-field dep. This is the LIVE wiring today.
- **B10 Phase 3 validator-reads edges:** B10 (S67) wires `validator-reads` edges in the Stage 7 DG for cross-field validator-arg `@cell` references; cycle detection fires `E-VALIDATOR-CIRCULAR-DEP` per §55.11.
- **B9 ValidatorArg shape:** `forEachIdentInValidatorArg` walks `RelationalPredicateNode` (recurses into `value: ExprNode`) AND standard ExprNode args via `forEachIdentInExprNode`. Single source of truth.
- **C8 rollup:** the compound `@signup.errors` / `isValid` already auto-rides any per-field cell change via `_scrml_derived_subscribe`. C9 doesn't extend C8.

## CRITICAL — what is C9, exactly?

The brief CRITICAL Rule 4 check: SCOPE doc says "predicate args referencing other cells wire reactive deps so upstream change re-fires validator." C7 ALREADY does this. So **C9 is one of:**

1. **Refinement / verification work:** survey the existing C7 wiring + B10 DG edges; verify all cross-field cases work end-to-end; add tests that exercise cross-field reactivity at runtime; add edge-case handling if survey reveals gaps.
2. **Optimization:** if survey reveals C7 is over-firing (e.g., redundant subscribes), optimize. (Lower priority — premature for v0.2.0.)
3. **No-op:** if survey reveals C7+B10+C8 already cover the entire C9 scope correctly, surface as STOP-FOR-PA: "C9 is structurally already done; recommend close-as-no-op + reflect in master-list."

**Survey-first MUST clarify which of (1)/(2)/(3) C9 actually is** before any implementation. The most likely outcome based on the depth-of-survey signal is (1) — verification + integration tests. Don't reinvent infrastructure C7 already has.

## Scope (in / out)

**IN scope (C9 — provisional, survey-confirmed):**
1. End-to-end runtime tests for cross-field reactivity: `<confirm req eq(@signup.password)>` flows: change `@signup.password` → `@signup.confirm.errors` recomputes → `@signup.errors`/`isValid` recompute via C8 rollup.
2. Multi-arg cross-field tests: `<endDate gt(@startDate) lt(@maxDate)>` with both deps changing.
3. Relational-predicate cross-field: `<count length(>=@minLength)>` (if §55.1 admits this — survey-confirm).
4. Transitive deps through stdlib calls — IF survey reveals gaps; otherwise document as out-of-scope.
5. Any C7 / B10 refinement needed to close gaps surfaced during survey.

**OUT of scope (deferred):**
- 4-level error message resolution — **C10**.
- `<errors of=expr/>` element — **C11**.
- Engine-state-cell validators — §55.14.
- Refinement-type runtime emission — C16 Wave 5.

## Spec verification (pa.md Rule 4)

- **§55.11 lines 25303-25325:** cross-field via predicate args; reactive recompute when any referenced cell changes. C7's wiring matches this. ✓

## Dispatch protocol

S67 worktree-as-scratch landing.

## Authorized decisions

- **Scope-shape determination:** survey-confirms one of {refinement, optimization, no-op}. STOP-FOR-PA if no-op (predicted ~30% likelihood per depth-of-survey).
- **File locus:** likely test-only. If implementation gaps found, agent authorized to extend C7's `emit-validators.ts` or B10's surface in `compiler/src/symbol-table.ts`.
- **Test file:** `compiler/tests/unit/c9-cross-field-deps.test.js`.
- **Crash recovery:** WIP commits expected; `progress.md` append-only.

## Anti-patterns reading

`scrml-support/docs/gauntlets/BRIEFING-ANTI-PATTERNS.md` if framework form-validation idioms creep in.

## File-modification inventory expected

| File | Reason |
|---|---|
| `compiler/tests/unit/c9-cross-field-deps.test.js` (NEW) | unit + runtime cross-field tests |
| `compiler/src/codegen/emit-validators.ts` (POSSIBLE) | gap fix if survey reveals one |
| `compiler/src/symbol-table.ts` (POSSIBLE) | B10 DG-edge gap fix if survey reveals one |
| `docs/changes/phase-a1c-step-c9-cross-field-deps/{progress,SURVEY}.md` | crash-recovery + survey |

## Sibling-dispatch awareness

Two SIBLING dispatches running in parallel: **C10** (4-level error message resolution; touches `compiler/src/codegen/emit-validators.ts` likely AND `compiler/src/runtime-template.js` for `messageFor` runtime + new `messages` chunk possibly) and **C11** (`<errors of=expr/>` markup-emit element; touches `compiler/src/codegen/emit-html.ts` + likely `compiler/src/codegen/emit-bindings.ts` extension). Survey to confirm whether your test-additions risk conflict; if YES — coordinate.

## Definition of Done

- All §scope IN items shipped (or scope reduced to no-op with PA confirmation).
- 0 regressions vs baseline (10,176 / 60 / 1 / 0 post-C8 land).
- Spec re-verified (§55.11) against SPEC.md text.
