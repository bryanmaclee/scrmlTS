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
1. **`bug-21`** `[parked: deferred-confirmed, no code change]` bug LOW · tier med — Q6-narrow: deep multi-level reset on nested compound; `applyResetToCellField` uses `fieldPath[0]` (shallow), runtime codegen correct. Entry: type-system.ts `applyResetToCellField` (:19737) inside `checkLifecycleFieldAccess` (:19377).
2. **`bug-22`** `[parked: deferred-confirmed, no code change]` bug LOW · tier med — Q6-narrow: cross-cell `default=@otherCell` reset value misclassified by `classifyResetValueAgainstSpec` (treats any non-`not` reset text as post-type). Entry: type-system.ts:21689 (called from reset handling :21503).
3. **`derived-value-compound-mutate-parser-deferred`** `[parked: mis-cluster → ss4 front-end]` bug LOW · tier med — compound-assign mutation diagnostic on `@derived.foo` not fired; parser splits `<<=` at markup boundary; multi-segment + in-compound cases skipped (walker correct). Entry: `derived-value-mutate.test.js:182,249,369` + symbol-table.ts + derived-mutation-ops.ts.
4. **`form-for-smart-input-type`** `[parked: deferred v1.next + embedded design-Q]` experiment LOW · tier med — `<form for>` input-shape detection lacks refinement-type smart mapping (email/url/tel → typed input); `inputShapeForFieldType` maps base type only. v1.next, gated on refinement predicates. Entry: emit-form-for.ts:260 (TODO :257-258).
5. **`a5`** `[parked: deferred-confirmed, watch-trigger not fired]` feature MED · tier high — A5 refinement-type freeze extension: `object(frozen(deep))` emitting `Object.freeze` at the JS-host boundary. DEFERRED with adoption-watch (≥2 reports post-A4); on trigger reuse §53 three-zone enforcement. Entry: const-deep-freeze DD (the A5 spec) → type-system.ts.
6. **`phase-4h-transition-return-type-narrowing`** `[parked: blocked on §54.6 NC-3 SPEC gap → design escalate]` feature n-a · tier high — §54 Phase 4h: return-type narrowing at a state-transition call site (blocked on §54.6 NC-3 code-assignment gap). Entry: block-splitter.js (transition-decl recognition) → type-system.ts narrowing; `s54-substates.test.js`.
7. **`s32-fn-state-machine-conformance-deferred`** `[parked: design-gated feature-build + stale-REGISTRY flag]` bug LOW · tier high — 30 §48/§54/§51/§33 fn-state-machine conformance tests skipped (narrowing, machine audit/replay runtime, terminal-return Phase 4h all unwired). NOTE dir named s32 but specs are §48/§54/§51/§33. Entry: `conformance/s32-fn-state-machine/` + REGISTRY.md.

## Dispositions (S209 sPA ss6 run — all 7 parked, zero landed)

**Run outcome:** ss6 is a no-autonomous-execute cluster. Every item is deferred-with-watch,
blocked-on-spec, or blast-radius-escalate (front-end). 0 code changes; 0 items landed on branch.
This is the spa-scrml.md §Boundaries "whole list stalls on escalations → report + stand down" case.
Per-item disposition (all empirically verified this run, not propagated from the footprint):

1. **bug-21** — **deferred-confirmed, NO fix.** S177 R26 already re-confirmed deferral. Currency-verified:
   `applyResetToCellField` (:19737) still uses `fieldPath[0]`, and `resetOne` operates on a FLAT
   per-field map (`perField.set(fieldName,…)` :19752) — there is no deep-nested-compound lifecycle
   tracking at all, so the symptom is UNREACHABLE and a naive `fieldPath[0]`→full-path change is a
   no-op. Real fix = deep-field-tracking groundwork in `checkLifecycleFieldAccess` (S177: "not worth
   it absent adopter friction"). No new friction signal. → reaffirm deferred.
2. **bug-22** — **deferred-confirmed, NO fix.** S177 R26-confirmed. Currency-verified
   `classifyResetValueAgainstSpec` (:21689) present, called from reset handling (:21503). Benign
   heuristic; the real cross-cell type-check happens at the assignment site (backstop). Cross-cell
   `default=@otherCell` under lifecycle annotation is uncommon. No new friction. → reaffirm deferred.
3. **derived-value-compound-mutate** — **MIS-CLUSTER → ss4.** The mutation-diagnostic WALKER is correct
   (`derived-mutation-ops.ts COMPOUND_ASSIGNMENT_OPS` handles all ops; the 12 parser-supported ops
   already pass). The ONLY blockers are FRONT-END: (a) the tokenizer splits `<<=`/`>>=`/`>>>=` into
   `<<`+`=` at markup `<`/`>` boundaries inside `${…}` (§B8.2b skip); (b) no parser support for
   in-compound `const <derived>` + multi-segment receivers (§B8.3/§B8.6 skip). Both live in
   block-splitter/tokenizer/native-parser = **ss4 (block-splitter-native-parser)**, OUTSIDE ss6's
   type-system shared-ingestion. → recommend re-cluster to ss4; nothing to do in ss6.
4. **form-for-smart-input-type** — **deferred v1.next + embedded design-Q.** `FieldInfo`
   (emit-form-for.ts:67) carries `baseTypeName` (the underlying primitive — "string" for an
   `email`-typed field) + parsed `validators`, but NO §53 refinement-predicate IDENTITY. Smart-input
   needs (a) the predicate name (email/url/tel) surfaced into `FieldInfo` from the type-system stage
   AND (b) a ratified predicate→input-type mapping (what does a custom `pattern(…)` map to?). That is
   exactly the gate the TODO names ("until refinement-type predicates make the call-site obvious").
   Small design ratification + plumbing → not autonomous-execute. → escalate to PA/dPA.
5. **a5** — **deferred-confirmed, watch-trigger NOT fired.** S134 DEFERRED with adoption-watch
   (≥2 JS-host-boundary mutation reports post-A4). No reports filed. A3 permanently rejected; A4 is the
   landed piece. Design-ratified deferral. → reaffirm deferred.
6. **phase-4h-transition-return-type-narrowing** — **BLOCKED on SPEC gap (NC-3) → design escalate.**
   SPEC §54.6 assigns 4 error codes (E-STATE-COMPLETE/FIELD-MISSING/TRANSITION-ILLEGAL/TERMINAL-MUTATION)
   but NONE for terminal-return enforcement (the §54.3 rule "transition body SHALL terminate with
   explicit `return <SubstateName>` literal"). CONF-S32-015a/015b are skipped on exactly this gap
   ("§54.6 has no assigned code … NEW NC-3 open"). Needs a SPEC amendment assigning an error code. →
   escalate to PA (one-line spec amendment unblocks this + the two conformance tests).
7. **s32-fn-state-machine-conformance-deferred** — **design-gated feature-build (encompasses #6) +
   stale-REGISTRY flag.** 30 gating skips across s33/s48/s51/s54 need UNIMPLEMENTED features: Phase-4h
   narrowing (= #6/NC-3), machine audit/replay RUNTIME harness, terminal-return enforcement. Not
   un-skippable cheaply. **R4 doc-currency flag:** REGISTRY.md (+ CONF-S32-003) references
   `W-PURE-REDUNDANT`, which was DEPRECATED → `W-PURE-DEPRECATED` at S176 (`pure` modifier retired,
   memory `feedback_sweep_all_mentions_newest_first`); CONF-S32-007's E-FN-006-retirement framing
   should be cross-checked too. Derived doc trailed the code. → escalate the build to PA/dPA + file the
   REGISTRY currency fix.

## Progress
`ss6.progress.md`. Land on `spa/ss6`; ping PA inbox when ready. Do not advance main / do not push.
