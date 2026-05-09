# A1c C4 — bind:* dispatch — progress (append-only)

## 2026-05-08 — WIP-1: SURVEY + baseline

- WORKTREE: `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-afdf0e452515a64dd`
- Branch: `worktree-agent-afdf0e452515a64dd`
- Rebased worktree onto main (HEAD `1ed9c22` → `26ce40b` post-C3); clean rebase, no conflicts.
- `bun install` (114 packages), `bun run pretest` (12 samples 0 errors).
- Baseline `bun run test` → **9,895 pass / 60 skip / 1 todo / 0 fail / 34,338 expects** ✓
  matches brief's expected baseline exactly.
- BRIEF.md copied from main repo into worktree (was untracked in main).
- SURVEY.md drafted: locus = `emit-bindings.ts` (extension of `emitBindings`), helper
  `dispatchByRenderSpec` + new pass over `registry.logicBindings.filter(kind === "render-by-tag")`.
  Verdict: PROCEED-AS-BRIEFED with no scope changes.
- Spec §5.4.1 re-verified vs brief: brief table is accurate; brief's "any other type" wording
  for bind:value is operationally equivalent to spec's wider explicit list.
- Test count forecast: +25 (within brief's +20 to +35 expectation).

Next: WIP-2 — implement `dispatchByRenderSpec` helper + render-by-tag wiring pass in
`emit-bindings.ts`.

## 2026-05-08 — WIP-2: dispatch helper + render-by-tag emit pass

- Edited `compiler/src/codegen/emit-bindings.ts` (+177 LOC):
  - New helper `dispatchByRenderSpec(tag, attrs)` — pure function mapping render-spec
    shape to BindDispatch `{flavour, inputEvent, isNumeric}`.
  - New pass at end of `emitBindings` walking `ctx.registry.logicBindings.filter(b => b.kind === "render-by-tag")`. For each binding: emits a JS block with selector, initial DOM-read sync, addEventListener writeback (predicate-gated for refinement-typed cells), reactive _scrml_effect for cell→DOM sync.
  - Reuses enumVarMap (built once in emitBindings) for <select>+enum coercion;
    reuses reactiveTypeMap + parsePredicateAnnotation + predicateToJsExpr for §53.7.2
    predicate gating; reuses _scrml_reactive_get/set/effect runtime API.
- Quick regression check: c3-render-spec-expansion.test.js (23 pass) + bind-value.test.js (78 pass) — both green.
- Pre-commit hook: 9171 pass / 0 fail (unit subset).
- Post-commit hook: 9895 pass full suite + TodoMVC compile + browser checks all green.
- Commit: `36c5710` — `WIP(c4): dispatchByRenderSpec helper + render-by-tag wiring pass`.

Next: WIP-3 — write `compiler/tests/unit/c4-bind-dispatch.test.js` with §C4.1-§C4.18 coverage (~25-35 tests forecast).

## 2026-05-08 — WIP-3: full test suite

- Created `compiler/tests/unit/c4-bind-dispatch.test.js` (~750 LOC, 18 sections, 54 tests).
- Coverage: §C4.1 text input · §C4.2 checkbox · §C4.3 file · §C4.4 radio · §C4.5
  number · §C4.6 range · §C4.7 textarea · §C4.8 select · §C4.9 select+enum ·
  §C4.10 multi-render (L16) · §C4.11 multiple distinct cells · §C4.12 hookpoint
  contract · §C4.13 runtime API · §C4.14 email/url/password/tel/search/date/color
  text-shape inputs · §C4.15 zero-binding regression guard · §C4.16 source-level
  bind:* unchanged (regression guard) · §C4.17 effect block per flavour ·
  §C4.18 §5.4.1 dispatch-table exhaustive sweep.
- All 54 tests pass on first run (100 expects).
- Full test sweep: **9,949 pass / 60 skip / 1 todo / 0 fail / 34,438 expects**.
  Delta vs baseline (9,895): +54 pass, +100 expects, 0 regressions. Forecast was +25 — actual +54
  (overshoot — coverage was thicker than predicted, especially for §C4.14 + §C4.18).

Wave 1 (C0+C1+C2+C3+C4) is now CLOSED.

Next: WIP-4 — final commit.

