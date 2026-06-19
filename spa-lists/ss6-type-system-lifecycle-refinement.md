# sPA ss6 — type-system-lifecycle-refinement

**Launch:** `read spa.md ss6` · **Branch:** `spa/ss6` · **Worktree:** `../scrml-spa-ss6`
**Merged from:** q6-narrow-lifecycle-reset · refinement-freeze-formfor-deferred · engine-substate-conformance-skips

## Shared ingestion
The `type-system.ts` §6.8 reset/lifecycle-annotation machinery (Tracker-2 per-access lifecycle inside
`checkLifecycleFieldAccess` ~:19377, `applyResetToCellField` ~:19614 shallow `fieldPath[0]`,
`classifyResetValueAgainstSpec` ~:21566) + §53 refinement-type three-zone enforcement + §54 substate
conformance. Threads: which conformance skips are feature-gated (narrowing, machine audit/replay) vs
parser-deferred (compound-op split at markup boundary, in-compound `const <derived>` registration);
the §53 refinement predicates as the enabling signal for the deferred freeze/smart-input ergonomics.

## Core files
`compiler/src/type-system.ts` · `compiler/src/block-splitter.js` · `compiler/src/symbol-table.ts` · `compiler/src/derived-mutation-ops.ts` · `docs/known-gaps.md`

## Items (least-ingestion-first)
1. **`bug-21`** `[open]` bug LOW · tier med — Q6-narrow: deep multi-level reset on nested compound; `applyResetToCellField` uses `fieldPath[0]` (shallow), runtime codegen correct. Entry: type-system.ts `applyResetToCellField` (:19614) inside `checkLifecycleFieldAccess` (:19377).
2. **`bug-22`** `[open]` bug LOW · tier med — Q6-narrow: cross-cell `default=@otherCell` reset value misclassified by `classifyResetValueAgainstSpec` (treats any non-`not` reset text as post-type). Entry: type-system.ts:21566 (called from reset handling :21380).
3. **`derived-value-compound-mutate-parser-deferred`** `[open]` bug LOW · tier med — compound-assign mutation diagnostic on `@derived.foo` not fired; parser splits `<<=` at markup boundary; multi-segment + in-compound cases skipped (walker correct). Entry: `derived-value-mutate.test.js:182,249,369` + symbol-table.ts + derived-mutation-ops.ts.
4. **`form-for-smart-input-type`** `[open]` experiment LOW · tier med — `<form for>` input-shape detection lacks refinement-type smart mapping (email/url/tel → typed input); `inputShapeForFieldType` maps base type only. v1.next, gated on refinement predicates. Entry: emit-form-for.ts:260 (TODO :257-258).
5. **`a5`** `[open]` feature MED · tier high — A5 refinement-type freeze extension: `object(frozen(deep))` emitting `Object.freeze` at the JS-host boundary. DEFERRED with adoption-watch (≥2 reports post-A4); on trigger reuse §53 three-zone enforcement. Entry: const-deep-freeze DD (the A5 spec) → type-system.ts.
6. **`phase-4h-transition-return-type-narrowing`** `[open]` feature n-a · tier high — §54 Phase 4h: return-type narrowing at a state-transition call site (blocked on §54.6 NC-3 code-assignment gap). Entry: block-splitter.js (transition-decl recognition) → type-system.ts narrowing; `s54-substates.test.js`.
7. **`s32-fn-state-machine-conformance-deferred`** `[open]` bug LOW · tier high — 30 §48/§54/§51/§33 fn-state-machine conformance tests skipped (narrowing, machine audit/replay runtime, terminal-return Phase 4h all unwired). NOTE dir named s32 but specs are §48/§54/§51/§33. Entry: `conformance/s32-fn-state-machine/` + REGISTRY.md.

## Progress
`ss6.progress.md`. Land on `spa/ss6`; ping PA inbox when ready. Do not advance main / do not push.
