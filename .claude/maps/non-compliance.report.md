# non-compliance.report.md
# project: scrmlts
# generated: 2026-05-30T00:00:00Z  commit: 948d3f2f
# scan mode: FULL_COLD_START

## Summary

Total docs scanned: 416
Compliant: 384
Non-compliant: 12
Uncertain: 20

---

## Non-compliant docs

### compiler/native-parser/M5-SWAP-residual-decomposition.md
**Reason:** content-heuristic + spec-draft
**Detail:** Document opens with "⚠ SUPERSEDED S117 (2026-05-21)" banner. The R1-R5 / 46-78h estimate it contains was itself under-counted; superseded by `scrml-support/docs/deep-dives/m5-swap-redecomposition-2026-05-21.md`. The file itself declares `status: superseded` and `superseded-by:` a scrml-support path. It is planning content for a scope that has already been re-decomposed.
**Suggested disposition:** deref to scrml-support/archive/

### docs/changes/v0next-inventory/SCOPE-MAP-2026-05-05.md
**Reason:** content-heuristic + location
**Detail:** v0.1.0→v0.2.0 scope inventory authored 2026-05-05. Contains implementation planning estimates ("~280-440h"), subsystem gap analysis, and feature status rows for surfaces that have since shipped or been re-scoped (engines, channels, validators, self-host deferred S66). The B4 self-host section notes it is "historical context only — NOT load-bearing for v0.2.0 ship." The document references the now-completed Phase A1 arc; its gap analysis is largely historical.
**Suggested disposition:** deref to scrml-support/archive/

### docs/changes/v0next-inventory/SCOPE-SUPPLEMENT-2026-05-07.md
**Reason:** content-heuristic + location
**Detail:** Companion supplement to SCOPE-MAP (status: "ratified scope additions; pending implementation"). References S67-era extension items. The features it describes (engine payload binding, test-bind, etc.) have since shipped. The supplement's implementation scope is now closed.
**Suggested disposition:** deref to scrml-support/archive/

### docs/changes/v0next-inventory/ARTICLE-TRUTHFULNESS-AUDIT-2026-05-05.md
**Reason:** location (audit doc in project repo)
**Detail:** Historical article-accuracy audit from 2026-05-05. A newer S115 article-truthfulness audit exists at `docs/audits/article-truthfulness-audit-2026-05-21.md`. The 2026-05-05 version is noted as "partially stale post-S84/S88/S89" in the S115 audit header, confirming it is superseded.
**Suggested disposition:** deref to scrml-support/archive/

### docs/audits/articles-currency-table-2026-05-13.md
**Reason:** location (historical audit artifact in project repo)
**Detail:** S89 Wave 4.A D-track agent-produced currency table dated 2026-05-13. Articles have changed and been re-audited at S115 (2026-05-21). This is a historical intermediate audit artifact that belongs in scrml-support.
**Suggested disposition:** deref to scrml-support/archive/ or scrml-support/docs/

### docs/audits/wave-3-7-corpus-ouroboros-2026-05-13.md
**Reason:** location (historical audit artifact in project repo)
**Detail:** S88/S89-era corpus-ouroboros audit. Explicitly a historical sweep; its findings are consumed by master-list and known-gaps. Audit artifacts of this type belong in scrml-support, not the project repo.
**Suggested disposition:** deref to scrml-support/archive/

### docs/audits/scrml-support-currency-sweep-2026-05-21.md
**Reason:** location (cross-repo audit in wrong repo)
**Detail:** Currency sweep of scrml-support docs authored 2026-05-21. This is explicitly a scrml-support maintenance artifact — it evaluates scrml-support content — and should live there, not in scrmlTS.
**Suggested disposition:** deref to scrml-support/docs/

### docs/audits/self-host-spec-conformance-2026-05-11.md
**Reason:** location (audit artifact in project repo)
**Detail:** Self-host spec conformance audit from 2026-05-11. Historical audit artifact documenting self-host vs SPEC gaps at that snapshot; the self-host is deferred to post-v1.0 per S66 user direction. Belongs in scrml-support.
**Suggested disposition:** deref to scrml-support/archive/

### docs/changes/match-block-form-scoping/SCOPING.md
**Reason:** content-heuristic
**Detail:** Authored 2026-05-19 (S107). Describes `<match>` block-form implementation gap as MED-HI. However, match block-form has substantially landed since S107 (emit-match.ts ships, conformance tests at tests/conformance/conf-form-for-canonical, match-block-in-each test in browser/). The scoping document describes a gap that is partially or fully closed. Needs human review against current `<match>` implementation state.
**Suggested disposition:** update to match current — or deref to scrml-support/archive/ if fully resolved

### docs/changes/serialize-scoping/SCOPING.md
**Reason:** content-heuristic
**Detail:** Status: STASHED S103. Describes serialize as NOT on the v0.4-v1.0 roadmap. The stash condition ("≥2 adopter friction reports" revival trigger) has not been met per known-gaps. The document is accurate in declaring itself stashed but is planning-debt in the project repo.
**Suggested disposition:** deref to scrml-support/archive/ (stashed scope)

### docs/changes/v0.3.x-spa-tree-shake/SCOPING.md
**Reason:** content-heuristic + name-heuristic
**Detail:** Scoping doc for SPA tree-shake arc. Contains "planned" and feature-design content. Status unknown — grep for the implementation in codegen shows `--embed-runtime` flag exists in cli but the full tree-shake arc may be partially/fully deferred. Needs human review.
**Suggested disposition:** uncertain — needs human review

### docs/audits/scrml-dev-content-spec-fidelity-2026-05-19.md
**Reason:** location (audit artifact in project repo)
**Detail:** S107-era spec-fidelity audit of `scrml.dev` website content dated 2026-05-19. Website content audit artifacts belong in scrml-support alongside other outreach maintenance docs.
**Suggested disposition:** deref to scrml-support/docs/

---

## Uncertain docs (needs human review)

### compiler/native-parser/M5-ast-bridge-scoping.md
**Reason:** describes M5.1 bridge scoping work; the native-parser is active but M5-swap has not completed. Content appears to describe current bridge shape accurately, but the M5 swap completion status needs verification.
**What to check:** grep compiler/src/code-generator.js for `--parser=scrml-native` routing; verify whether M5-ast-bridge-scoping still reflects the current bridge contract or is historical.

### compiler/native-parser/M5-divergence-ledger.md
**Reason:** last-reviewed: 2026-05-21; M6.6.b.x landings since then (S124-S145) may have closed entries. The ledger tracks divergences that could be partially resolved.
**What to check:** cross-reference each open divergence row against current parser-conformance test allowlist state.

### compiler/native-parser/M6.6-CONTRACT-DERIVATION.md
**Reason:** "developer reference" doc; status says live companion to b.1 impl. No status: superseded banner.
**What to check:** verify M6.6.b.1 contract is still the active contract for engine-statechild-parser consumers.

### docs/changes/schemaFor-impl/SCOPE-AND-DECOMPOSITION.md
**Reason:** schemaFor has shipped (emit-schema-for.ts exists) but the scoping doc may contain open sub-items.
**What to check:** grep progress.md for final closure; verify emit-schema-for.ts covers the decomposed scope.

### docs/changes/tilde-codegen/SURVEY.md and ROUND-TRIP-SURVEY.md and FOLLOWUPS.md
**Reason:** `~`-decl (TildeDeclNode) shipped; these survey docs may contain open items that are now resolved or permanently deferred.
**What to check:** cross-reference FOLLOWUPS.md carry-forward items against known-gaps.md current state.

### docs/changes/tilde-gaps-567/SURVEY.md
**Reason:** survey of tilde (§5/§6/§7) gaps; status unknown — tilde is implemented but gap-survey may still have open items.
**What to check:** verify gap items against current type-system.ts tilde handling.

### docs/audits/spec-consolidation-inventory-2026-05-24.md
**Reason:** Phase 1a audit; companion heads-up doc is status: in-progress (spec-consolidation-2026-05-25.md). Some Phase 2 resolutions have landed (iteration §17.7, lifecycle §14.12, const-deep-freeze). Remaining open findings need human review.
**What to check:** cross-reference findings against the heads-up/spec-consolidation-2026-05-25.md HU-N resolution log.

### docs/audits/spec-corroboration-canons-pipeline-2026-05-24.md
**Reason:** Phase 1b canon-anchored corroboration audit companion. Same in-progress status caveat as spec-consolidation-inventory.
**What to check:** same cross-reference against HU resolution log.

### docs/audits/spec-feature-canon-coverage-2026-05-25.md
**Reason:** feature canon coverage audit from 2026-05-25. May have open findings that subsequent sessions closed.
**What to check:** cross-reference against known-gaps.md and master-list §0.6 for post-2026-05-25 closures.

### docs/changes/v0.3-approach-a-spec/SCOPING.md
**Reason:** Scoping doc from v0.3 planning era. v0.3.0 shipped (2026-05-14 announcement). This scope may be fully historical.
**What to check:** verify SCOPING.md status — if all items landed or were deferred, move to archive.

### docs/changes/a3-auth-graph-scoping/SCOPING.md
**Reason:** auth-graph scoping doc. auth-graph.ts is a 1908L live source file. Verify whether the scoped items all landed.
**What to check:** grep the SCOPING open items against auth-graph.ts function inventory.

### docs/changes/runtime-perf-scoping/SCOPING.md
**Reason:** Runtime performance scoping doc. P3.B (PGO) landed in emit-client.ts. Other perf arcs status unknown.
**What to check:** verify against known-gaps.md and runtime-perf-phase-3-* sub-directories.

### docs/changes/tableFor-scoping/SCOPING.md
**Reason:** tableFor scoping. tableFor shipped (emit-table-for.ts exists). Verify scoping is fully landed.
**What to check:** grep progress at tableFor-impl/PROGRESS.md.

### docs/changes/schemaFor-scoping/SCOPING.md
**Reason:** Same as schemaFor-impl — verify landed.
**What to check:** Cross-reference emit-schema-for.ts against scoped items.

### docs/audits/null-audit-compiler-src-2026-05-13.md and undefined-audit-compiler-src-2026-05-13.md
**Reason:** Historical sweep audits from S89 null/undefined eradication arc. The arc has landed (W-ABSENCE-IN-SCRML-SOURCE in source, corpus migrated). These are historical audit artifacts.
**What to check:** Confirm no remaining action items; if clean, deref to scrml-support/archive/.

### docs/pinned-discussions/w-program-001-warning-scope.md
**Reason:** Pinned discussion doc; content likely describes a design decision that may have been ratified or is still open.
**What to check:** Cross-reference against known-gaps.md and master-list for current W-PROGRAM-001 disposition.

### docs/changes/v0next-audit/PARSER-AUDIT-2026-05-05.md
**Reason:** Parser audit from 2026-05-05 describing v0.1 parser state. Much of this state has changed (native-parser development, GITI-024 fix, etc.).
**What to check:** Mark as historical; deref to scrml-support/archive/ if no open items remain.

### docs/website/roadmap-from-v0.3-2026-05-14.md
**Reason:** Roadmap doc from 2026-05-14 at v0.3 launch. Now at v0.7.0 — roadmap items may be stale.
**What to check:** Verify against current known-gaps.md and master-list for what's shipped vs deferred.

---

## Tags
#non-compliance #project-mapper #cleanup #scrmlts

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
