# non-compliance.report.md
# project: scrmlts
# generated: 2026-06-03T22:40:00Z
# scan mode: INCREMENTAL_UPDATE (watermark 97fe2199 → f9d4b0f1, S159 arc)
# prior scans: INCREMENTAL_UPDATE at 97fe2199 (S157-S158); INCREMENTAL_UPDATE at 57edc794 (S154-S156); INCREMENTAL_UPDATE at c665714c (S153 sweep); FULL_COLD_START at 948d3f2f (2026-05-30)

## Summary

Total docs scanned (incremental delta — new/modified docs 97fe2199 → HEAD): 7 new/modified
Compliant (new docs): 7
Non-compliant (new findings): 0
Uncertain (new findings): 0
Carried uncertain (Bug 69 / NON-GAP tension): 1 (unchanged — still needs user confirmation)

## New Docs Added S159 — Incremental Findings

### docs/changes/bug-73-per-item-handler-live-keying-2026-06-03/{BRIEF.md, BRIEF-phase1.md, progress.md} — COMPLIANT
Bug 73 dispatch archive. Describes `iterScopeReferencedInHandler`, `maybeWrapEachPerItemHandler`, `maybeWrapLiftPerItemHandler`, `maybeWrapLiftCallableHandler`. All four grep-resolve in emit-each.ts and emit-lift.js. Historical dispatch record; matches landed code.

### docs/changes/s154a-colon-shorthand-html-2026-06-03/{BRIEF.md, BRIEF-phase1.md, progress.md} — COMPLIANT
S154 ruling (a) codegen dispatch archive. Describes `buildBlock()` body-child synthesis in ast-builder.js, `shorthand && !selfClosing` reorder in block-splitter.js, `E-COLON-SHORTHAND-ON-VOID` guard in type-system.ts. All grep-resolve in current source. Historical dispatch record; matches landed code and §4.14 / §34 SPEC amendments.

## New Test Files S159 — Compliant (verified against current source)

### compiler/tests/unit/per-item-handler-live-keying-bug73.test.js — COMPLIANT
Describes `maybeWrapEachPerItemHandler` + `maybeWrapLiftPerItemHandler` — both grep-resolve in emit-each.ts / emit-lift.js.

### compiler/tests/unit/html-colon-shorthand-content-model-s159.test.js — COMPLIANT
Describes `E-COLON-SHORTHAND-ON-VOID` + ast-builder.js `buildBlock` body synthesis — grep-resolve in type-system.ts + ast-builder.js.

### compiler/tests/browser/each-per-item-handler-live-keying-bug73.browser.test.js — COMPLIANT
Runtime happy-dom canary for Bug 73. References `_scrml_resolve_item`, `_scrml_reconcile_list` — grep-resolve in runtime-template.js.

## Uncertain Docs — Carried (unchanged from S157-S158 scan)

### hand-off.md (Bug 69 / NON-GAP tension)
**Reason:** Map-level inconsistency between two authoritative documents
**Detail:** `hand-off.md` records a tension: (a) user stated "fold Bug 69 in too" at S156 (carry-forward as (d)-A batch 5); (b) the S156 CLOSE DONE block classified Bug 69 as "NON-GAP (display-subset-irrelevant for v1.0)." These two claims contradict. `known-gaps.md` entries for Bug 69 reflect this ambiguity as "NON-GAP-or-batch-5." The maps have been written consistent with the DONE block (batch 5 is not yet scheduled), but if the user intends batch 5 to run, `domain.map.md` and `error.map.md` should add tableFor §41.16.6 subset reach as a pending item.
**What to check:** Confirm with user: does (d)-A batch 5 (Bug 69 / tableFor subset reach in `emit-table-for.ts` `_processTableForNode`) still run as part of the (d)-A arc, or is Bug 69 retired as NON-GAP?

## Prior Incremental Findings (S154-S156, at 57edc794 → 97fe2199 — unchanged, not re-checked this pass)

(All S154-S156 dispatch archives under docs/changes/ were classed COMPLIANT in the prior scan.
docs/changelog.md, docs/known-gaps.md, docs/PA-SCRML-PRIMER.md — COMPLIANT per prior scan.)

## Prior Incremental Findings (S153, at c665714c — unchanged, retained for reference)

### docs/heads-up/spec-consolidation-2026-05-25.md — UNCERTAIN (carried)
**Reason:** Frontmatter `status: in-progress`; Phase 2 amendment TBD landings (§6.10, §52.4, §55)
not yet executed.
**What to check:** Whether the open TBD landings are scheduled or deferred-indefinitely.

(All other S148-S153 dispatch archives under docs/changes/ were classed COMPLIANT in the prior scan.)

## Prior FULL_COLD_START Findings (at 948d3f2f — unchanged, retained for reference)

### Non-compliant
- compiler/native-parser/M5-SWAP-residual-decomposition.md — content-heuristic + spec-draft (`status: superseded`) → deref to scrml-support/archive/
- docs/changes/v0next-inventory/SCOPE-MAP-2026-05-05.md — content-heuristic + location → deref to scrml-support/archive/
- docs/changes/v0next-inventory/SCOPE-SUPPLEMENT-2026-05-07.md — content-heuristic + location → deref to scrml-support/archive/
- docs/changes/v0next-inventory/ARTICLE-TRUTHFULNESS-AUDIT-2026-05-05.md — location (superseded by 2026-05-21 audit) → deref to scrml-support/archive/
- docs/audits/articles-currency-table-2026-05-13.md — location → deref to scrml-support/archive/ or docs/
- docs/audits/wave-3-7-corpus-ouroboros-2026-05-13.md — location → deref to scrml-support/archive/
- docs/audits/scrml-support-currency-sweep-2026-05-21.md — location (cross-repo audit in wrong repo) → deref to scrml-support/docs/
- docs/audits/self-host-spec-conformance-2026-05-11.md — location (self-host post-v1.0) → deref to scrml-support/archive/
- docs/changes/match-block-form-scoping/SCOPING.md — gap partially/fully closed → update or deref
- docs/changes/serialize-scoping/SCOPING.md — `status: STASHED S103` planning-debt → deref to scrml-support/archive/
- docs/changes/v0.3.x-spa-tree-shake/SCOPING.md — planned/deferred arc → uncertain, needs human review
- docs/audits/scrml-dev-content-spec-fidelity-2026-05-19.md — location (website content audit) → deref to scrml-support/docs/

### Uncertain (from prior FULL_COLD_START scan — carried; not re-checked)
- compiler/native-parser/M5-ast-bridge-scoping.md — active but M5-swap incomplete; verify bridge contract (NOTE: S153 re-confirmed the native parser does NOT promote each/match — a hard M5-swap precondition; this doc's bridge contract should capture that)
- compiler/native-parser/M5-divergence-ledger.md — M6.6.b.x landings may have closed entries (NOTE: S153 each/match-no-structural-promotion is a NEW divergence-ledger candidate)
- compiler/native-parser/M6.6-CONTRACT-DERIVATION.md — verify M6.6.b.1 contract is current
- docs/changes/schemaFor-impl/SCOPE-AND-DECOMPOSITION.md — schemaFor shipped; verify sub-items closed (NOTE: S156 batch 3 added enum-subset CHECK IN — if this doc listed schemaFor-subset as open, it may now be closeable)
- docs/changes/tilde-codegen/SURVEY.md + ROUND-TRIP-SURVEY.md + FOLLOWUPS.md — tilde shipped; verify open items
- docs/changes/tilde-gaps-567/SURVEY.md — verify gap items against current type-system.ts
- docs/audits/spec-consolidation-inventory-2026-05-24.md — Phase 1a companion to in-progress HU
- docs/audits/spec-corroboration-canons-pipeline-2026-05-24.md — Phase 1b companion
- docs/audits/spec-feature-canon-coverage-2026-05-25.md — verify post-2026-05-25 closures
- docs/changes/v0.3-approach-a-spec/SCOPING.md — v0.3 shipped; verify all items landed

## Infra Note — map header-commit drift (carried from S154-S156 scan)

### .claude/maps/{dependencies,config,build}.map.md — HEADER STALE (content current-but-unverified)
The S154-S159 source changes did NOT touch dependencies (no manifest change), config (no `.env` / `process.env.*` additions), or build (no scripts/Dockerfile/CI changes) so their CONTENT is not regenerated and remains accurate. The `schema.map.md` header is CURRENT (refreshed this pass).
**Suggested disposition:** At the next FULL_COLD_START, re-stamp all map headers to a single watermark.

## Tags
#non-compliance #project-mapper #cleanup #scrmlts #s159 #bug73 #colon-shorthand-html

## Links
- [project master-list](../../master-list.md)
- [project pa.md](../../pa.md)
