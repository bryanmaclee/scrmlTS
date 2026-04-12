# non-compliance.report.md
# project: scrmlTS
# generated: 2026-04-12T20:00:00Z
# scan mode: FULL_COLD_START

## Summary

Total docs scanned: 17
Compliant: 10
Non-compliant: 4
Uncertain: 3

## Non-compliant docs

### docs/changes/self-host-ast-exprnode-resync/progress.md
**Reason:** content-heuristic
**Detail:** Incomplete work-in-progress log with only 3 bullet points ("Started", "Import strategy decided", "Beginning edits"). No completed state or useful current-truth content.
**Suggested disposition:** deref to scrml-support/archive/ or delete

### docs/changes/expr-ast-phase-1/anomaly-report.md
**Reason:** combo (content-heuristic + superseded)
**Detail:** Documents Phase 1 state (4800 unit pass baseline, +84 new tests). The project is now at Phase 3+ with 5,709 pass. The baseline numbers and phase status are historically accurate but describe a superseded state.
**Suggested disposition:** deref to scrml-support/archive/

### docs/changes/expr-ast-phase-2-slice-1/anomaly-report.md
**Reason:** combo (content-heuristic + superseded)
**Detail:** Documents Phase 2 Slice 1 intermediate state. References "BEFORE (main, commit cc85b38)" which is far behind current. Describes lin-decl introduction which is now complete and integrated.
**Suggested disposition:** deref to scrml-support/archive/

### docs/changes/expr-ast-phase-2-slice-2/anomaly-report.md
**Reason:** combo (content-heuristic + superseded)
**Detail:** Documents Phase 2 Slice 2 intermediate state (lin variable detection migration). References "BEFORE (main, commit ed34c58 -- Slice 1 intermediate state)". This is historical development documentation.
**Suggested disposition:** deref to scrml-support/archive/

## Uncertain docs (needs human review)

### docs/changes/expr-ast-phase-2-slice-3/anomaly-report.md
**Reason:** uncertain — describes a completed change (collectExpr bug fix) that is merged and current, but the format is an anomaly report (historical development artifact)
**What to check:** Confirm whether the one-line-deletion fix at ast-builder.js:875 is still present in the current code. If yes, the doc describes current truth but the anomaly-report format makes it an archive candidate.

### docs/changes/expr-ast-phase-1-audit/anomaly-report.md
**Reason:** uncertain — describes Phase 1 exit criteria assessment. Phase 1 is complete but the criteria documented here (0% escape-hatch rate, idempotency invariant) are still active invariants.
**What to check:** Decide if this belongs in scrml-support as a historical record or stays as the exit-criteria reference for Phase 1 invariants.

### docs/changes/expr-ast-phase-1-audit/escape-hatch-catalog.md
**Reason:** uncertain — the escape-hatch rate is 0% and the catalog confirms it. This is current truth, but the doc format (per-file audit report) is a development artifact.
**What to check:** The 0% escape-hatch rate is a current invariant. Decide whether this catalog stays as the reference evidence or moves to scrml-support.

## Compliant docs (no action needed)

- README.md — accurate project description, matches current state
- pa.md — current agent directives, matches repo layout
- master-list.md — live inventory, test counts match S7/S8 state
- hand-off.md — current session state (S8 in progress)
- scrmlFormula.md — creative/reference doc, no claims about code state
- compiler/SPEC.md — authoritative spec (18,863 lines)
- compiler/SPEC-INDEX.md — auto-generated spec index
- compiler/PIPELINE.md — stage contracts
- compiler/src/codegen/README.md — accurate module list matching current codegen/ contents
- examples/README.md — accurate quick-start and sigil cheatsheet
- benchmarks/RESULTS.md — empirical benchmark data (dated 2026-04-05, results are fact not aspiration)

## Out-of-scope (excluded from scan per scope rules)

- node_modules/**/*.md — third-party package docs
- .claude/**/*.md — map files (self-referential)
- handOffs/**/*.md — historical hand-offs
- archive/**/*.md — archived docs
- benchmarks/todomvc-react/README.md, benchmarks/todomvc-svelte/README.md, benchmarks/fullstack-react/*.md — framework comparison dirs

## Tags
#non-compliance #project-mapper #cleanup #scrmlTS

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
