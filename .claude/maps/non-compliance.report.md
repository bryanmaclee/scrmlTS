# non-compliance.report.md
# project: scrmlTS
# generated: 2026-04-17T17:00:00Z
# scan mode: INCREMENTAL_UPDATE (S21 refresh — prior snapshot 2026-04-13/S10-S11)

## Summary

Total docs scanned: 14 (excluding handOffs/, archive/, node_modules/, .claude/, samples/compilation-tests/**, benchmarks/todomvc-*/README.md, benchmarks/fullstack-react/*.md)
Compliant: 4
Non-compliant: 8
Uncertain: 2

## Non-compliant docs

### docs/changelog.md
**Reason:** content-heuristic (stale baseline) + combo
**Detail:** Top-of-file baseline still reads "2026-04-14 end of S18: 6,228 tests passing / 8 skipped / 2 failing". Actual current baseline is S21 at 6,824 pass / 10 skip / 2 fail. "Recently Landed" sections cover S14 through S18 only; S19 gauntlet Phase 1/2/3, S20 gauntlet Phases 5-12, S21 (§19 codegen, §51 alternation, E-IMPORT-006) are absent. "In Flight" still lists "SPEC sync — formalizing the `:>` match arm, match-as-expression, and Lift Approach C changes" though SPEC.md has been amended multiple times since.
**Suggested disposition:** update in place to S21 baseline + append S19/S20/S21 landed-items section, OR deref to scrml-support/archive/ and have the README point at the changelog in scrml-support. Actionable this session — if the §51 amendment is being drafted, the changelog should note the alternation landing.

### master-list.md
**Reason:** content-heuristic (stale)
**Detail:** Header reads "Last updated: 2026-04-14 (S18 ... 6,228 pass / 8 skip / 2 fail)". S19/S20/S21 work (gauntlet phases, §19 codegen, §51 amendment, E-IMPORT-006, new gauntlet-s20/ test dir, 7 gauntlet-s20-* fixture dirs) is not inventoried. The "Self-host modules" LOC counts may also have drifted.
**Suggested disposition:** update in place — this is the live inventory and S21 is adding features.

### docs/changes/gauntlet-s19/bugs.md
**Reason:** combo (content-heuristic + historical artifact)
**Detail:** Phase 1 bug list with triage tables and fix tracking. Most entries now show "FIXED" with regression test citations. The artifact describes development state during S19 Phase 1 — it is historical process documentation, not current-truth reference material.
**Suggested disposition:** deref to scrml-support/archive/gauntlet-s19/ — it belongs with historical gauntlet reports.

### docs/changes/gauntlet-s19/phase2-bugs.md
**Reason:** combo (content-heuristic + historical artifact)
**Detail:** Phase 2 (control flow) bug list. Lists 48 non-match fixtures. Most have been fixed across subsequent S19 commits. A development-history artifact.
**Suggested disposition:** deref to scrml-support/archive/gauntlet-s19/.

### docs/changes/gauntlet-s19/phase3-bugs.md
**Reason:** combo (content-heuristic + historical artifact)
**Detail:** Phase 3 (operators & expressions) bug list with 38 non-match fixtures. Many fixed via commits 5c828d6, 1fa5247. Development history.
**Suggested disposition:** deref to scrml-support/archive/gauntlet-s19/.

### docs/changes/gauntlet-s19/phase4-developer-report.md
**Reason:** name-heuristic (`status: draft` in front-matter) + location
**Detail:** Front-matter explicitly marks `status: draft`, dated 2026-04-15. Developer-persona "ambiguities / gaps" report from dispatching a dev against the spec. Belongs with deep-dives / debates in scrml-support.
**Suggested disposition:** deref to scrml-support/docs/deep-dives/ or scrml-support/archive/gauntlet-s19/.

### docs/changes/gauntlet-s19/phase4-index.md
**Reason:** combo (location + content-heuristic)
**Detail:** Fixture-index artifact (Phase 4 markup corpus, 77 fixtures). Useful as scratch for triage while S19 Phase 4 was live; not a current-truth reference.
**Suggested disposition:** deref to scrml-support/archive/gauntlet-s19/.

### docs/changes/expr-ast-phase-1-audit/anomaly-report.md
**Reason:** combo (content-heuristic + superseded)
**Detail:** Already flagged in the prior non-compliance report (S10-S11 snapshot). Still present. Describes Phase 1.5 exit criteria assessment (escape-hatch rate 3.66%). Current escape-hatch rate on example corpus is 0% and Phase 3 work is behind this.
**Suggested disposition:** deref to scrml-support/archive/ (as previously recommended).

## Uncertain docs (needs human review)

### docs/changes/expr-ast-phase-1-audit/escape-hatch-catalog.md
**Reason:** uncertain — still flagged from prior report. Contents report 4.11% escape-hatch rate across 14 example files (generated 2026-04-17T15:33Z). Today's regeneration would show 0% per the Phase 3 work completed. If re-run, the catalog would be current truth; as sits it is stale.
**What to check:** Regenerate the catalog (there must be a script under scripts/ that produced it) to confirm 0%; if so, overwrite; if not, archive.

### docs/changes/expr-ast-phase-2-slice-3/anomaly-report.md
**Reason:** uncertain — previously flagged. Describes a completed collectExpr fix at ast-builder.js:875. Current ast-builder.js is 6,360 lines; the line number may still be in the same neighborhood.
**What to check:** Verify whether ast-builder.js:875 still carries the one-line-deletion's explanatory comment. If so, the doc accurately describes current state but the anomaly-report format is a development artifact; archive.

## Compliant docs (no action needed)

- README.md — current; "Why scrml" was rewritten 2026-04-17 (commits d802707, eef7b5e final form) and matches current truth re. mutability contracts being opt-in across predicates/lifecycle/machines, and "Server/client state" wording on the features list.
- pa.md — current agent directives.
- hand-off.md — live S21 session hand-off.
- user-voice.md — live feedback log.
- scrmlFormula.md — creative/reference doc, no claims about code state.
- DESIGN.md — rationale doc; "State Is First-Class" and "Mutability Contracts" sections align with the README rewrite.
- compiler/SPEC.md — authoritative spec (19,045 lines). §51 amended 2026-04-17 with `|` alternation; E-MACHINE-014 table entry present at line 17534.
- compiler/SPEC-INDEX.md — auto-generated spec index.
- compiler/PIPELINE.md — 1,630 lines.
- compiler/src/codegen/README.md — matches current codegen/ contents.
- examples/README.md — quick-start and sigil cheatsheet.
- editors/neovim/README.md — editor integration, not a feature claim.
- scripts/git-hooks/README.md — tooling doc.
- benchmarks/RESULTS.md, benchmarks/sql-batching/RESULTS.md — empirical data.
- docs/tutorial.md — former V2 content promoted 2026-04-17 (commit 41e4401); reads as current-truth reference.

## Tutorial snippets (docs/tutorial-snippets/)

Spot checked, no action needed — these are compiled-as-tests fixtures (renamed from tutorialV2-snippets/ per commit 41e4401). If the top-level tutorial.md is compliant, the snippets it imports are implicitly compliant.

## Out-of-scope (excluded from scan per scope rules)

- node_modules/**/*.md
- .claude/**/*.md (self-referential)
- handOffs/**/*.md (20 historical hand-offs; belongs here by design)
- archive/**/*.md (none present)
- benchmarks/todomvc-react/README.md, benchmarks/todomvc-svelte/README.md, benchmarks/fullstack-react/*.md (framework comparison dirs)
- samples/compilation-tests/**/*.md (fixture corpus)

## Actionable this session (relevant to §51 amendment drafting)

1. **docs/changelog.md** is 3 sessions behind. If the §51 amendment is landing this session, the changelog should note S21's machine `|` alternation + E-MACHINE-014 + §19 codegen rewrite + E-IMPORT-006. Also bump the top-of-file baseline to 6,824 pass / 10 skip / 2 fail.
2. **master-list.md** header bumps: same baseline update; also mention the new `compiler/tests/unit/gauntlet-s20/` test dir and the 7 `samples/compilation-tests/gauntlet-s20-*` fixture dirs.
3. **docs/changes/gauntlet-s19/** — low-priority for this session, but if you want to keep scrmlTS "current truth only" the whole directory's .md files should be moved to scrml-support/archive/gauntlet-s19/ in a single cleanup commit. Leaves the directory empty (or with apply-spec-patch scripts from dq7-css-scope and lin-batch-a, which are tooling and fine to retain).

## Tags
#non-compliance #project-mapper #cleanup #scrmlTS #s21 #machine-alternation #changelog-drift

## Links
- [primary.map.md](./primary.map.md)
- [error.map.md](./error.map.md)
- [domain.map.md](./domain.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
