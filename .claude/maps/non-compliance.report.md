# non-compliance.report.md
# project: scrmlts
# generated: 2026-06-01T00:00:00-06:00
# scan mode: INCREMENTAL_UPDATE (watermark 09f74bee → 4e1f9492, S148-S152)
# prior scan: FULL_COLD_START at 948d3f2f (2026-05-30)

## Summary

Total docs scanned (incremental delta — new/modified docs S148-S152): ~15 substantive docs beyond prior scan
Compliant (new docs): 12
Non-compliant (new findings): 0
Uncertain (new findings): 1
Prior-scan findings: unchanged (see prior entries below)

## New Docs Added S148-S152 — Incremental Findings

### docs/website-viewer/README.md — COMPLIANT
Describes the C1 self-demo viewer app (S151). Matches `docs/website-viewer/app.scrml` and the
`scrml dev docs/website-viewer/` serve pattern. No aspirational content.

### docs/changes/engine-graph-sidecar-2026-05-31/BRIEF.md + progress.md — COMPLIANT
Dispatch archive for S149 engine-graph sidecar. Historical dispatch record.

### docs/changes/source-map-real-provenance-js-2026-05-31/BRIEF.md + progress.md — COMPLIANT
Dispatch archive for S149 B2 source-map provenance. Historical dispatch record.

### docs/changes/source-map-use-site-spans-b1-2026-05-31/BRIEF.md + progress.md — COMPLIANT
Dispatch archive for S149 B1. Historical dispatch record.

### docs/changes/engine-on-enter-c1-2026-05-31/BRIEF.md + BRIEF-finish.md + progress.md — COMPLIANT
Dispatch archive for S148 engine opener effect= C1. Historical dispatch record.

### docs/changes/match-given-colon-2026-05-31/BRIEF.md + progress.md — COMPLIANT
Dispatch archive for S148 standalone `given` guard `:>`. Historical dispatch record.

### docs/changes/inline-sql-in-branch-cps-2026-06-01/BRIEF.md + progress.md — COMPLIANT
Dispatch archive for S152 CPS-split fix. Historical dispatch record.

### docs/changes/client-cross-file-module-loading-b-2026-06-01/BRIEF.md + progress.md — COMPLIANT
Dispatch archive for S152 #6 _scrml_modules. Historical dispatch record.

### docs/changes/each-body-interactivity-landing2-2026-06-01/BRIEF.md + progress.md — COMPLIANT
Dispatch archive for S152 #7 Landing-2. Historical dispatch record.

### docs/changes/each-render-before-cell-init-2026-06-01/BRIEF.md + progress.md — COMPLIANT
Dispatch archive for S152 HIGH crash fix. Historical dispatch record.

### docs/changes/typed-array-no-rhs-default-2026-06-01/BRIEF.md + progress.md — COMPLIANT
Dispatch archive for S152 Shape 4. Historical dispatch record.

### docs/changes/scrml-dev-watcher-and-stale-entry-2026-06-01/BRIEF.md + progress.md — COMPLIANT
Dispatch archive for S152 dev-watcher rewrite. Historical dispatch record.

### docs/changes/spec-arm-arrow-migration-2026-05-31/BRIEF.md + FLIP-MANIFEST.md — COMPLIANT
Dispatch archive for S148 match-:> corpus sweep. FLIP-MANIFEST.md is a migration ledger; historical.

### docs/changes/srcmap-attr-expr-relative-span-2026-05-31/BRIEF.md — COMPLIANT
Dispatch archive for srcmap relative-span sub-arc. Historical dispatch record.

## New Uncertain Docs (S148-S152 scope)

### docs/heads-up/spec-consolidation-2026-05-25.md
**Reason:** Frontmatter `status: in-progress` with only 1 of 39 findings closed. Multiple
`Phase 2 amendment scope (Landing TBD)` entries describe SPEC amendments to §6.10, §52.4, §55
that reference server-cell composition addenda — not yet executed as of S152 close.
**What to check:** Determine whether the open TBD landings are scheduled for an upcoming session
or have been deferred indefinitely. If deferred, mark findings as `status: deferred` and update
the doc status to reflect current state. The HU log itself is a legitimate working document;
only the TBD landing slots are uncertain.

---

## Prior FULL_COLD_START Findings (unchanged — retained for reference)

### Non-compliant (from prior scan at 948d3f2f)

### compiler/native-parser/M5-SWAP-residual-decomposition.md
**Reason:** content-heuristic + spec-draft
**Detail:** Document opens with `status: superseded` banner. Superseded by scrml-support deep-dive.
**Suggested disposition:** deref to scrml-support/archive/

### docs/changes/v0next-inventory/SCOPE-MAP-2026-05-05.md
**Reason:** content-heuristic + location
**Detail:** v0.1.0→v0.2.0 scope inventory. Largely historical; gap analysis for surfaces that have since shipped.
**Suggested disposition:** deref to scrml-support/archive/

### docs/changes/v0next-inventory/SCOPE-SUPPLEMENT-2026-05-07.md
**Reason:** content-heuristic + location
**Detail:** Companion to SCOPE-MAP; implementation scope is now closed.
**Suggested disposition:** deref to scrml-support/archive/

### docs/changes/v0next-inventory/ARTICLE-TRUTHFULNESS-AUDIT-2026-05-05.md
**Reason:** location (superseded by 2026-05-21 audit)
**Suggested disposition:** deref to scrml-support/archive/

### docs/audits/articles-currency-table-2026-05-13.md
**Reason:** location (historical audit artifact)
**Suggested disposition:** deref to scrml-support/archive/ or scrml-support/docs/

### docs/audits/wave-3-7-corpus-ouroboros-2026-05-13.md
**Reason:** location (historical audit artifact)
**Suggested disposition:** deref to scrml-support/archive/

### docs/audits/scrml-support-currency-sweep-2026-05-21.md
**Reason:** location (cross-repo audit in wrong repo)
**Suggested disposition:** deref to scrml-support/docs/

### docs/audits/self-host-spec-conformance-2026-05-11.md
**Reason:** location (audit artifact; self-host deferred to post-v1.0)
**Suggested disposition:** deref to scrml-support/archive/

### docs/changes/match-block-form-scoping/SCOPING.md
**Reason:** describes gap partially or fully closed since S107
**Suggested disposition:** update to match current or deref to scrml-support/archive/

### docs/changes/serialize-scoping/SCOPING.md
**Reason:** status: STASHED S103; planning-debt in project repo
**Suggested disposition:** deref to scrml-support/archive/

### docs/changes/v0.3.x-spa-tree-shake/SCOPING.md
**Reason:** content-heuristic + name-heuristic; planned/deferred arc
**Suggested disposition:** uncertain — needs human review

### docs/audits/scrml-dev-content-spec-fidelity-2026-05-19.md
**Reason:** location (website content audit belongs in scrml-support)
**Suggested disposition:** deref to scrml-support/docs/

### Uncertain (from prior scan at 948d3f2f)
- compiler/native-parser/M5-ast-bridge-scoping.md — active but M5-swap incomplete; verify bridge contract
- compiler/native-parser/M5-divergence-ledger.md — M6.6.b.x landings may have closed entries
- compiler/native-parser/M6.6-CONTRACT-DERIVATION.md — verify M6.6.b.1 contract is current
- docs/changes/schemaFor-impl/SCOPE-AND-DECOMPOSITION.md — schemaFor shipped; verify sub-items closed
- docs/changes/tilde-codegen/SURVEY.md + ROUND-TRIP-SURVEY.md + FOLLOWUPS.md — tilde shipped; verify open items
- docs/changes/tilde-gaps-567/SURVEY.md — verify gap items against current type-system.ts
- docs/audits/spec-consolidation-inventory-2026-05-24.md — Phase 1a companion to in-progress HU
- docs/audits/spec-corroboration-canons-pipeline-2026-05-24.md — Phase 1b companion
- docs/audits/spec-feature-canon-coverage-2026-05-25.md — verify post-2026-05-25 closures
- docs/changes/v0.3-approach-a-spec/SCOPING.md — v0.3 shipped; verify all items landed
- docs/changes/a3-auth-graph-scoping/SCOPING.md — auth-graph.ts live; verify items landed
- docs/changes/runtime-perf-scoping/SCOPING.md — P3.B PGO landed; other arcs unknown
- docs/changes/tableFor-scoping/SCOPING.md — tableFor shipped; verify landed
- docs/changes/schemaFor-scoping/SCOPING.md — schemaFor shipped; verify landed
- docs/audits/null-audit-compiler-src-2026-05-13.md + undefined-audit-compiler-src-2026-05-13.md — historical sweep; deref if clean
- docs/pinned-discussions/w-program-001-warning-scope.md — verify W-PROGRAM-001 disposition
- docs/changes/v0next-audit/PARSER-AUDIT-2026-05-05.md — historical; deref if no open items
- docs/website/roadmap-from-v0.3-2026-05-14.md — now at v0.7.0; verify stale vs current roadmap items

---

## Tags
#non-compliance #project-mapper #cleanup #scrmlts #s148 #s149 #s150 #s151 #s152

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
