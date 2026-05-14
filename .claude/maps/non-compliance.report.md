# non-compliance.report.md
# project: scrmlts
# generated: 2026-05-14T00:37:04-06:00
# scan mode: FULL_COLD_START (S90 close — commit ff9be0e)
# prior baseline: 2026-05-13T23:00:00Z @ 71305fe (S89 close)

## Summary

Total docs scanned: 117 (excluding node_modules, .git, .claude, handOffs/, dist/, build/)
Compliant: 110
Non-compliant: 4 (same as S89; no new violations added)
Uncertain: 3 (down from 10; 7 resolved or carried from S89 as non-actionable during S90)

---

## Non-compliant docs

### docs/articles/llm-kickstarter-v0-2026-04-25.md
**Reason:** content-heuristic — doc self-identifies as RETRACTED/SUPERSEDED
**Detail:** Header states "Status: RETRACTED / SUPERSEDED — archived 2026-05-13 (S89 Wave 4.A D-3)." Body is a stub.
**Suggested disposition:** deref to archive/ or delete (stub; no informational content remaining)

### docs/changes/undefined-eradication-self-host/SUPERSEDED-CLOSURE.md
**Reason:** content-heuristic — doc self-identifies as CLOSED-AS-NO-OP / SUPERSEDED
**Detail:** Header states "Status: CLOSED-AS-NO-OP (work already complete on main at dispatch time)" — historical artifact only.
**Suggested disposition:** deref to scrml-support/archive/ or delete

### docs/changes/wave-4-adopter-content/SCOPING.md
**Reason:** content-heuristic — describes future/aspirational work that is now CLOSED
**Detail:** Status "SCOPED — awaits PA dispatch sequencing" from S88. Wave 4 adopter content CLOSED at S89. The work described is done; this SCOPING no longer describes current state.
**Suggested disposition:** Archive to scrml-support/archive/ or note as closed in-file header

### docs/changes/promotion-ergonomics/TIER-C-SCOPE.md
**Reason:** content-heuristic + grep-mismatch — describes future planned work not yet implemented
**Detail:** Status "SCOPED — queued, not yet dispatched" from S66. Grep of `W-MATCH-TRANSITIONS-ACCRUING` and `--engine` flag finds no implementation in current compiler/src. Nearly a year old relative to current HEAD.
**Suggested disposition:** Verify if deferred indefinitely; if so, deref to scrml-support/archive/

---

## Uncertain docs (needs human review)

### docs/audits/wave-3-7-corpus-ouroboros-2026-05-13.md
**Reason:** dated audit snapshot (HEAD: `9b98118`, S88 close). Audits corpus state at S88 — may not reflect S89/S90 changes to articles and examples.
**What to check:** Is this audit still actionable, or has S89/S90 corpus sweep addressed its findings? If superseded, deref to scrml-support/archive/.

### docs/changes/predicate-gaps-deep-dive-prep/SCOPE.md
**Reason:** content-heuristic — status "SCOPE PREPARED — awaits convener authorization to fire deep-dive (when corpus signal warrants)"; trigger conditions may still be unmet.
**What to check:** Has the deep-dive been authorized? If trigger conditions remain unmet, deref to scrml-support/archive/ if no active dispatch planned.

### docs/changes/v0.3-approach-a-impl/SCOPING.md
**Reason:** parent scoping for "Approach A impl" — may be superseded now that A-1 CLOSED, A-2 Components 1-5 wired (S90), A-3 complete (S90), each with their own sub-docs.
**What to check:** Is this SCOPING still the living authority for A-2.7+ and A-4..A-5, or has authority fully transferred to a2-reachability-solver-scoping/SCOPING.md and a3-auth-graph-scoping/SCOPING.md? If superseded, note in-file or deref.

---

## S90 Changes vs S89 Baseline

**Resolved from S89 uncertain list (7 cleared):**
- docs/changes/scrml-dev-codegen-divergence/progress.md — confirmed compliant (committed code on main exists)
- docs/changes/v0.3-approach-a-spec/SCOPING.md — §40.9 contract now locked in SPEC; moved to uncertain→resolved
- docs/changes/v0.3-todomvc-e2e-reverify/progress.md — todomvc e2e tests passing at S90; dispatch done
- docs/audits/scope-c-findings-tracker.md — resolved by S89/S90 sweeps; compliant as historical record
- docs/articles/llm-kickstarter-v1-2026-04-25.md — confirmed v2 supersedes v1 for distribution; v1 kept as historical
- docs/changes/v0next-audit/PARSER-AUDIT-2026-05-05.md — compliant as dated historical audit
- docs/changes/v0next-inventory/SCOPE-MAP-2026-05-05.md + ARTICLE-TRUTHFULNESS-AUDIT-2026-05-05.md — compliant as dated historical audits

**New docs added S90 — all compliant:**
- docs/changes/m-7c-d-12-runtime-sentinel-scoping/progress.md — active dispatch record, compliant
- docs/changes/a3-auth-graph-scoping/SCOPING.md — A-3 SCOPING + implementation record; implementations match code
- docs/audits/wave-3-7-corpus-ouroboros-2026-05-13.md — dated audit snapshot (moved to uncertain, see above)
- docs/audits/articles-currency-table-2026-05-13.md — currency table audit, compliant as reference

---

## Compliant (no action needed)

The following categories were scanned and found compliant:
- compiler/SPEC.md (27,145 lines), compiler/SPEC-INDEX.md, compiler/PIPELINE.md (v0.7.1, 2,758 lines) — authoritative specs, current
- docs/articles/* (15 articles) — devto content; articles-currency-table + VERIFIED.md confirm status
- docs/audits/* (null-audit, undefined-audit, articles-currency-table, happy-dom-perf, self-host-spec-conformance, scope-c-findings-tracker) — dated audit snapshots, compliant as historical records
- docs/changes/§13.2-*, §36-*, a1-closeout, a2-1, a2-2, a2-reachability-solver-scoping — active/closed dispatch records, compliant
- docs/changes/a3-auth-graph-scoping/ — A-3 implementation completed S90; implementations match source
- docs/changes/m-7c-d-12-runtime-sentinel-scoping/ — M-7C-D-12 implementation completed S90; SCOPING + progress match code
- docs/changes/null-eradication-*, undefined-eradication-*, stdlib-phase-1-5-null-sweep — closed dispatch records
- docs/changes/w-try-catch-lint, fix-lift-async-iife-paren, phase-3a-async-jwt, todomvc-edit-mode-landing — closed dispatch records
- docs/changes/wave-4-t-track, wave-4-d-track, wave-4-adopter-content-scoping — Wave 4 execution records (distinction: wave-4-adopter-content/SCOPING.md is NON-COMPLIANT above; wave-4-adopter-content-scoping/ is separate and compliant)
- docs/changes/wave-3-7-audit, wave-3-7-backlog-migration, v0next-inventory/SCOPE-SUPPLEMENT-2026-05-07.md
- docs/changelog.md, docs/PA-SCRML-PRIMER.md, docs/tutorial.md, docs/lin.md, docs/external-js.md — reference docs, compliant
- docs/pinned-discussions/w-program-001-warning-scope.md — pinned decision record, compliant
- docs/curation/2026-05-05-changes-dir-disposition.md — curation record, compliant
- docs/website/v0.2.0-announce-2026-05-05.md — historic announcement stub, compliant
- DESIGN.md, README.md, scrmlFormula.md, pa.md, master-list.md, hand-off.md — live project documents, compliant
- examples/, e2e/, samples/, benchmarks/, lsp/, editors/, scripts/ READMEs — operational docs, compliant
- compiler/src/codegen/README.md, compiler/tests/ READMEs — test fixtures docs, compliant

## Tags
#non-compliance #project-mapper #cleanup #scrmlts #s90

## Links
- [project master-list](../../master-list.md)
- [project pa.md](../../pa.md)
- [primary.map.md](./primary.map.md)
