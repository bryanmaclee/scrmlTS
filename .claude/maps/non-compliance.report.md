# non-compliance.report.md
# project: scrmlts
# generated: 2026-05-13T15:00:00Z
# scan mode: FULL_COLD_START (S88 close — commit 9b98118)
# prior baseline: 2026-05-12T21:42:04Z @ f1555b4 (S87 INCREMENTAL_UPDATE)

## Summary

Total docs scanned: 70 (excl. .git/, node_modules/, .claude/, archive/, handOffs/, dist/)
Compliant: 46
Non-compliant (carry-forward from S87 + new S88): 30+
Uncertain: 9

---

## NEW non-compliant items (S88)

### docs/changes/v0.3-batch-2-trio-a/, v0.3-batch-2-trio-b/, v0.3-bs-layer-comment-skip/, v0.3-bug-1.5-engine-var-markup/, v0.3-bug-1.6-1.7-match-arm-bundle/, v0.3-bug-2c-bind-value-mangle/, v0.3-bug-3a-sql-emission/, v0.3-bug-4.5-call-ref-args/, v0.3-bug-6.5-inline-markup-arm-payload/, v0.3-bug-6.5.1-named-binding-parser/, v0.3-channel-dispensation-spec-walker/, v0.3-emit-expr-option-a-comprehensive-engine-routing/, v0.3-engine-self-write-option-d/, v0.3-stdlib-cleanup/, v0.3-wave-3.5-migrate-bundle/, v0.3-wave-3.6-trucking-remigration/, v03-wave-1/, v0.3-wave-2/, v0.3-wave-3-fixture-sweep/, w-program-spa-inferred-impl/, wave-3-d2/, wave-3-d3/, migrate-safety-harness-import-fix/, promote-safety-harness-import-fix/, playwright-e2e-dispatch-1/
**Reason:** content-heuristic — all S87 dispatch dirs are SHIPPED/CLOSED. 25 dispatch dirs confirmed shipped in S87 final commits or earlier.
**Suggested disposition:** archive all to `scrml-support/archive/dispatches/`.

### docs/audits/happy-dom-perf-regression-s87-2026-05-12.md
**Reason:** content-heuristic — describes aspirational future investigation "post-v0.3.0 6-12h bisect-and-profile dispatch"; NOT current truth about the codebase.
**Suggested disposition:** keep in `docs/audits/` as a known-issue register with no action, OR move to `scrml-support/archive/audits/` after v0.3.0 ships. PA decides.

### docs/changes/scrml-dev-codegen-divergence/progress.md
**Reason:** content-heuristic + uncertain status — references "ongoing" scrml-dev codegen divergence but the Bug 3a fix (SQL emission gap) closed in S87 may address this. Compile errors shown in the progress.md are now E-CHANNEL-OUTSIDE-PROGRAM not codegen divergence.
**Suggested disposition:** review master-list.md §OQ; if confirmed closed or subsumed by Bug 3a fix, archive.

---

## S88-updated status: dispatch dirs now CLOSED

The following dirs were "uncertain" in S87 but are now confirmed-shipped in S88:

### docs/changes/v0.3-approach-a-spec/ (SCOPING.md + progress.md)
**S87 status:** uncertain (flagged as potentially deferred to v0.4).
**S88 update:** user reversed v0.4 deferral at S88 start ("start on those tasks as they are unblocked"). A-1.1 through A-1.5 all shipped in S88 (5/5 sub-phases). SCOPING.md header still reads "DRAFT" but authority section documents the S88 ratification.
**Suggested disposition:** SCOPING.md is now mostly historical (plan doc for a completed effort). Update header status field from "DRAFT" to "SHIPPED (A-1.1..A-1.5)" and archive the dispatch dir to `scrml-support/archive/dispatches/`.

### docs/changes/v0.3-todomvc-e2e-reverify/progress.md
**S87 status:** uncertain (dispatch was PARTIAL; 5 LIFT bugs blocked completion).
**S88 update:** LIFT-1..5 all closed at S88. The TodoMVC e2e re-verify is now unblocked. The dispatch is complete as of the LIFT-5 fix.
**Suggested disposition:** archive to `scrml-support/archive/dispatches/`.

---

## Carry-forwards from S87 baseline (UNCHANGED)

### docs/audits/compiler-forgotten-surface-2026-05-06.md
**Reason:** location-heuristic — deep forensic audit; belongs in scrml-support/docs/. However, the PA SCRML PRIMER references it. Carry-forward.
**Status:** uncertain — may be intentionally kept here for primer cross-ref.

### docs/changes/predicate-gaps-deep-dive-prep/SCOPE.md
**Reason:** content-heuristic — status "SCOPE PREPARED — awaits convener authorization". Describes future work not yet dispatched.
**Status:** compliant as a pending-dispatch scope document per project convention.

### docs/changes/promotion-ergonomics/TIER-C-SCOPE.md
**Reason:** content-heuristic — status "SCOPED — queued, not yet dispatched". Tier C is future work.
**Status:** compliant as a pending-dispatch scope document per project convention.

### docs/changes/fix-lift-async-iife-paren/ (anomaly-report.md, pre-snapshot.md, progress.md)
**Reason:** SHIPPED — fix-lift-async-iife-paren closed per changelog (pre-S87). Progress files are historical.
**Suggested disposition:** archive to `scrml-support/archive/dispatches/`.

### All S78 carry-forward non-compliant items
See prior report for full list. 14 items remain flagged:
- docs/audits/hardcoded-thresholds-2026-05-10.md + hardcoded-thresholds-followup-2026-05-11.md — shipped S81
- docs/articles/lsp-and-giti-advantages-draft-2026-04-25.md, npm-myth-draft-2026-04-25.md — draft artifacts
- docs/changes/v0next-spec-impact/IMPLEMENTATION-ROADMAP.md — self-declares SUPERSEDED
- docs/changes/reactive-derived-decl-divergence/ADR.md — belongs in scrml-support
- docs/audits/ historical rule-4 audit files (7 files)
- Shipped A1a/A1b/A1c/A7/A8/A9/A10/server-keyword dispatch dirs (large batch)

---

## Uncertain docs (needs human review)

### docs/changes/v0.3-approach-a-impl/SCOPING.md
**Reason:** Header still reads "DRAFT — awaits PA + user OQ ratification". However the authority block states S88 reversed the v0.4 deferral AND A-1.1..A-1.5 all shipped. The DRAFT status field is stale but the sub-phase estimates are now historical plan data.
**What to check:** Update header status to "SHIPPED" and archive the dispatch dir to scrml-support, OR decide this remains as a reference for waves A-2..A-5 (which are still future). If A-2..A-5 will re-use this scoping file as their plan, keep as active. If A-2..A-5 will have their own dispatch, archive.

### docs/audits/self-host-spec-conformance-2026-05-11.md
**Reason:** S87 uncertain carry-forward. Self-declares deferred; the strict self-host rebuild gate (S81) was the implementation. Whether additional conformance work is planned is unclear from the doc alone.
**What to check:** Is self-host-spec-conformance still being tracked? If closed as "gate = sufficient", archive.

### docs/audits/scope-c-findings-tracker.md
**Reason:** Active tracking doc — S42 origin. Some findings from 2026-04-25 may be closed by now (over 40 commits later).
**What to check:** Are any Scope C findings in "CLOSED" status that warrant removal or archival of the tracker itself? If still useful as a live register, keep.

### docs/changes/v0next-inventory/SCOPE-SUPPLEMENT-2026-05-07.md
**Reason:** A7 fully shipped; supplement was written to feed A7 planning. Content may be fully absorbed.
**What to check:** Is any content in SCOPE-SUPPLEMENT still forward-looking (waves A-2..A-5 planning)? If so, keep. If all content is historical, archive.

### docs/changes/v0next-audit/ + docs/changes/v0next-inventory/ (excluding SCOPE-SUPPLEMENT)
**Reason:** S59 origin. Describe the v0.next parser/scope audit. As of S88, V5-strict AST shapes are fully implemented. Some diagnostic findings may be stale.
**What to check:** Do PARSER-AUDIT-2026-05-05.md §1 findings (17 features parsing as html-fragment at S59) still reflect reality at HEAD? If the major gaps are now closed, these audit docs are historical. Verify one or two findings against HEAD.

### docs/articles/realtime-and-workers-as-syntax-devto-2026-04-29.md:200
**Reason:** references `<channel protect=>` which was renamed to `<channel auth=>` at S80. Published article — immutable.
**What to check:** Known drift per pa.md Rule 1. No action unless re-published; note for next article sweep.

---

## Compliant (current — do not flag)

- `compiler/SPEC.md` — authoritative (26,976 lines; §4.7 + §18.7 + §41.4 amended S88). Compliant.
- `compiler/SPEC-INDEX.md` — generated index artifact. Compliant.
- `compiler/PIPELINE.md` — v0.7.1; authoritative. Compliant.
- `compiler/src/codegen/README.md` — codegen module overview. Compliant.
- `compiler/tests/conformance/s32-fn-state-machine/REGISTRY.md` — conformance registry. Compliant.
- `master-list.md` — current through S88. Compliant.
- `hand-off.md` — current S88 CLOSE. Compliant.
- `pa.md` — current (isolation-parameter dispatch rule + hook-policy amendment). Compliant.
- `docs/changelog.md` — current through S88 close. Compliant.
- `docs/PA-SCRML-PRIMER.md` — current; §13.5 staleness fix landed S88. Compliant.
- `docs/lin.md` — linear types; compliant.
- `docs/external-js.md` — external JS interop; compliant.
- `docs/tutorial.md` — compliant.
- `docs/pinned-discussions/w-program-001-warning-scope.md` — pinned decision; compliant.
- `docs/audits/scope-c-findings-tracker.md` — active tracking doc; compliant.
- `docs/audits/compiler-forgotten-surface-2026-05-06.md` — compliant (historical forensic; informational).
- `docs/changes/predicate-gaps-deep-dive-prep/SCOPE.md` — pending-dispatch scope; compliant.
- `docs/changes/promotion-ergonomics/TIER-C-SCOPE.md` — pending-dispatch scope; compliant.
- `docs/changes/v0.3-approach-a-spec/progress.md` — active spec-drafting; compliant.
- `docs/changes/v0next-audit/PARSER-AUDIT-2026-05-05.md` — historical; compliant.
- `docs/changes/v0next-inventory/SCOPE-MAP-2026-05-05.md` — historical inventory; compliant.
- `docs/curation/2026-05-05-changes-dir-disposition.md` — curation record; compliant.
- `docs/website/v0.2.0-announce-2026-05-05.md` — published announcement; compliant.
- All `docs/articles/*-devto-*.md` (published articles) — compliant (see realtime article for known drift).
- `benchmarks/RESULTS.md`, `benchmarks/sql-batching/RESULTS.md` — compliant.
- `benchmarks/fullstack-react/README.md`, `benchmarks/todomvc-react/README.md`, `benchmarks/todomvc-svelte/README.md` — framework comparison; compliant.
- `examples/README.md`, `examples/VERIFIED.md`, `examples/23-trucking-dispatch/README.md`, `examples/23-trucking-dispatch/FRICTION.md` — compliant.
- `scripts/git-hooks/README.md` — compliant.
- `e2e/README.md` — compliant.
- `editors/neovim/README.md` — compliant.
- `README.md` — compliant.
- `DESIGN.md` — compliant.
- `scrmlFormula.md` — compliant.
- `samples/compilation-tests/gauntlet-s19-*/README.md` — compliant.
- `compiler/tests/commands/migrate-program-shape-fixtures/README.md` — compliant.

## Tags
#non-compliance #project-mapper #cleanup #scrmlts #s88 #lift-fixes-complete #approach-a-a1-shipped #dispatch-archival

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
- [scrml-support pa.md](../../../scrml-support/pa.md)
