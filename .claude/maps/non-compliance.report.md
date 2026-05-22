# non-compliance.report.md
# project: scrmlts
# generated: 2026-05-22T00:00:00Z
# scan mode: INCREMENTAL_UPDATE (re-scan keyed on 26e82466..5d2003dd)

## Summary

Total docs scanned: ~99 `.md` files (excluding node_modules, .git, .jj, .claude,
  archive, handOffs, dist/build/target). docs/changes/ counted in aggregate.
Compliant (mapped or out-of-scope reference): ~14
Non-compliant: 5 categories (1 large aggregate + 4 named)
Uncertain: 3

SPEC.md modification watermark: 2026-05-22 (current — §34.1 touched this range).
The 26e82466→5d2003dd range added exactly ONE new `.md`:
`docs/changes/m5-c2-gap-ledger/investigation-2026-05-22.md` — a read-only C2
gap-ledger diagnostic. It is a per-dispatch investigation artifact, current-dated,
correctly located under `docs/changes/` — it falls into the existing
`docs/changes/**` aggregate category below, NOT a new non-compliance class. No NEW
non-compliance category surfaced. The categories below are unchanged from the prior
scan; counts refreshed.

## Non-compliant docs

### docs/changes/** (179 files across ~80+ directories)
**Reason:** location + name-heuristic (combo)
**Detail:** Every directory under `docs/changes/` is a per-dispatch artifact set
— `BRIEF.md`, `SCOPE.md`, `progress.md` for completed or in-flight work. The
26e82466→5d2003dd range added `docs/changes/m5-c2-gap-ledger/
investigation-2026-05-22.md` — the C2 dual-pipeline-canary divergence sizing
(261/1000 corpus files diverge). It is a current, accurate, read-only diagnostic
tied to the IN-FLIGHT M5-swap C2/gap-ledger arc — a dispatch artifact, not a
standing reference doc. The repo already acknowledges this whole class:
`docs/curation/2026-05-05-changes-dir-disposition.md` is a standing curation
matrix dispositioning these dirs to `scrml-support/archive/dispatches/`.
**Suggested disposition:** deref completed-arc dirs to scrml-support/archive/dispatches/;
keep only actively-in-flight dirs (per the curation matrix). The
`m5-c2-gap-ledger/` dir is the LIVE C2 gap-ledger arc — its Phase 4 fix dispatches
are pending (they touch the native parser + collect-hoisted.js hoist-fold path) —
and should STAY until those land. Likewise the broader M5-swap dispatch dirs stay
until M6 closes.

### docs/website/roadmap-from-v0.3-2026-05-14.md
**Reason:** content-heuristic + name-heuristic
**Detail:** Front-matter `status: draft`; adopter-facing roadmap describing where
the compiler is "going" from v0.3 — aspirational by definition. Predates the
current SPEC; package.json is now v0.6.0.
**Suggested disposition:** deref to scrml-support/docs/ (roadmap/planning content
belongs in support, not the project repo per the "current truth only" principle).

### docs/website/v0.2.0-announce-2026-05-05.md  and  docs/website/v0.3.0-announce-2026-05-14.md
**Reason:** location + currency
**Detail:** Version-announcement marketing copy. Not reference docs for dev
agents; describe release-moment nominal state, not current code. Both are for
superseded releases (package.json is at 0.6.0).
**Suggested disposition:** deref both to scrml-support/docs/ (or archive the
v0.2.0 one). Not load-bearing for any dev-agent navigation.

### docs/audits/** (11 audit docs)
**Reason:** location
**Detail:** article-truthfulness-audit, compiler-forgotten-surface, null-audit,
undefined-audit, wave-3-7-corpus-ouroboros, self-host-spec-conformance,
articles-currency-table, happy-dom-perf-regression, scrml-dev-content-spec-
fidelity, scrml-support-currency-sweep, scope-c-findings-tracker. Audit reports
are point-in-time investigation artifacts — they belong in scrml-support per the
"deep-dives / audits live in scrml-support" rule. Several are dated 30+ days
before the current SPEC (compiler-forgotten-surface 2026-05-06).
**Suggested disposition:** deref to scrml-support/docs/ (or scrml-support/archive/).
scope-c-findings-tracker.md may still be live — see Uncertain below.

### docs/curation/2026-05-05-changes-dir-disposition.md
**Reason:** location + currency
**Detail:** A curation matrix (S61) for the docs/changes/ deref. Its own snapshot
("103 dirs total") is stale — docs/changes/ now has 179 tracked files. It is a
process artifact, not a reference doc.
**Suggested disposition:** deref to scrml-support/docs/ once the docs/changes/
deref above is executed; or update the count and keep as the standing checklist.

## Uncertain docs (needs human review)

### docs/known-gaps.md
**Reason:** This doc EXPLICITLY catalogs spec-vs-implementation drift — by
construction it describes things the compiler does NOT do. That makes it look
non-compliant under the grep cross-check, but it is also the canonical,
intentionally-maintained drift ledger. It is genuinely useful to a dev agent.
**What to check:** Confirm with the user whether known-gaps.md should stay as a
project-repo reference (it is current-state-honest) or move to scrml-support.
Recommend KEEP — it is the opposite of aspirational-pretending-to-be-current.

### docs/pinned-discussions/w-program-001-warning-scope.md
**Reason:** "pinned discussion" — a discussion/debate-shaped doc, which the scope
rule says belongs in scrml-support. But "pinned" suggests it is an
intentionally-retained active design note.
**What to check:** Determine if the W-PROGRAM-001 scope question is resolved. If
resolved, deref to scrml-support/docs/. If still open, keep.

### docs/external-js.md  and  docs/lin.md
**Reason:** Reference-shaped docs (external-js integration; the `lin` token
feature) but not obviously cross-checked against current code.
**What to check:** Grep the identifiers each cites against compiler/src. Both
features resolve in source (`LinDeclNode` in ast.ts; `LinDecl` StmtKind in the
native parser as of B4; api.js handles .js imports) — recommend KEEP as current
reference pending a quick grep confirmation.

## Notes on compliant / in-scope docs (NOT flagged)
- compiler/SPEC.md, SPEC-INDEX.md, PIPELINE.md — authoritative spec; mapped.
  §34.1 grew to 81 codes this range (C2 +2 info codes); §58 Build Story is
  spec-ahead but explicitly self-labels as a "Nominal section" with a §58.12 gap
  enumeration — honest spec-ahead, NOT non-compliant.
- README.md, DESIGN.md, docs/tutorial.md, docs/changelog.md, scrmlFormula.md,
  docs/PA-SCRML-PRIMER.md — current reference; in-scope.
- compiler/native-parser/README.md, M5-ast-bridge-scoping.md,
  M5-divergence-ledger.md, M5-SWAP-residual-decomposition.md — current
  native-parser reference; LOAD-BEARING for the M5-swap gap-ledger work; in-scope
  (they describe current state + scoped future work honestly).
- compiler/src/codegen/README.md, compiler/tests/.../REGISTRY.md — current
  module-local reference; in-scope.

## Tags
#non-compliance #project-mapper #cleanup #scrmlts

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
