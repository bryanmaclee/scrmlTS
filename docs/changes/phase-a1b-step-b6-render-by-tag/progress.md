# Progress: A1b Step B6 — Render-by-tag classifier

**Branch:** `changes/phase-a1b-step-b6-render-by-tag`
**Base:** 7334fb0 (S65 wrap)
**Tier:** T2 — new SYM PASS extension + new tests + primer update.

---

## Plan

- Phase 0 — Survey (`SURVEY.md`) + Rule 4 spec verifications + halt-trigger evaluation. WIP commit.
- Phase 1a — Test scaffolding (red tests). WIP commit.
- Phase 1b — PASS 5 implementation in `compiler/src/symbol-table.ts`. WIP commit.
- Phase 2 — Primer §13.7 B6 row addition. WIP commit.
- Phase 3 — Final verification (`bun run test`) + summary commit.

## Baseline

- Pre-change `bun run test`: **9019 pass / 44 skip / 1 todo / 0 stable fail**.
  Note: the brief mentioned 9071 baseline (post-B4-cherry-pick); the worktree base is S65 wrap (7334fb0) which predates the B4 land. 9019 is the actual baseline for this branch.
- Worktree clean post-startup (verified pwd / git rev-parse / git status / bun install / bun run pretest).

## Survey dispositions (§6 of SURVEY.md, surfaced for Bryan ratification)

1. **Compound-parent self-tag (`<formRes/>`) → fire E-CELL-NO-RENDER-SPEC.** Spec is silent; spec-faithful extension. Error message tightened to mention `<formRes><field/></>` wrapping form + `${@formRes.field}` interpolation alternatives.
2. **Component render-spec (PascalCase RHS, e.g., `<x> = <MyComp/>`) → DEFER.** Spec line 1341 requires component-prop catalog substrate (B14/M18/M20). B6 v1 under-fires rather than mis-fires. Follow-up documented in code comments + survey.

Default-proceed unless STOP signal.

## Log

- [Phase 0 start] Branch created. Worktree startup verification clean. Baseline test run: 9019 pass / 44 skip / 1 todo / 0 fail. Required reading complete (pa.md four rules, SPEC §6.4, §6.2, §34, §6.6.17, B5 substrate, primer §13.7, ast.ts shape, api.js Stage 3.06 hookup).
- [Phase 0 finding] B5 cell-classifier API is sufficient. The `"markup-typed"` bucket collapses two spec-distinct cases (Shape 3 markup-typed derived vs. Shape 2 non-bindable RHS); B6 disambiguates via `decl.isConst`. No B5 extension required.
- [Phase 0 finding] Compound-parent self-tag is spec-silent; proposed fire E-CELL-NO-RENDER-SPEC with tightened message. PascalCase component render-spec deferred per brief halt-trigger.
- [Phase 0 finding] No halt-and-report trigger fires. Estimate ~3.5h (within 3-5h budget). Plan locked.

## Resume — S66 re-dispatch (post-predecessor TaskStop)

- [Resume start] Worktree synced to main HEAD `2ec30cc` via fast-forward (Phase 0 SURVEY + B4-land + audits inherited). `bun install` + `bun run pretest` + `bun run test` baseline: **9071 pass / 44 skip / 1 todo / 0 fail**. Tree clean. Phase 0 dispositions ratified by Bryan (compound-parent → fire E-CELL-NO-RENDER-SPEC; PascalCase RHS → DEFER). Resuming at Phase 1a (test scaffolding).
- [Phase 0 spec verification, S66] Confirmed §34 row line numbers shifted slightly post-B4 land: E-CELL-NO-RENDER-SPEC at line 14205 (was 14203 in survey), E-CELL-RENDER-SPEC-NOT-BINDABLE at line 14206 (was 14204). Both rows present and unchanged in semantic content. Phase 0 spec disposition still authoritative.
- [Phase 1a → Phase 1 combined commit] Wrote `compiler/tests/unit/render-by-tag.test.js` — 19 tests covering the complete Shape × use-site matrix from SURVEY §4.2 (§B6.1–§B6.18). Initial run: 10 pass / 9 fail (expected red — positive-fire tests waiting for impl, negative tests already pass). Pre-commit hook would bail on red tests, so combined Phase 1a + Phase 1b into a single commit.
- [Phase 1b complete] Implemented PASS 5 in `compiler/src/symbol-table.ts` (~250 LOC added). `walkRenderByTagUses` recurses through MarkupNodes; `checkRenderByTag` switches on B5's `_cellKind` + `decl.isConst`. Phase 0 dispositions encoded:
  - Compound-parent self-tag → E-CELL-NO-RENDER-SPEC with tightened message (mentions wrapping form + interpolation alternatives).
  - PascalCase RHS (component render-spec) → DEFERRED (silent accept, B14/M18/M20 substrate).
  - PascalCase use-site tags → filtered before `lookupStateCell` (lowercase-charcode predicate 97-122).
  - Shape 3 markup-typed derived (`isConst:true`) → E-CELL-NO-RENDER-SPEC per SPEC §6.6.17 line 3027.
  - Shape 2 non-bindable RHS (`isConst:false`) → E-CELL-RENDER-SPEC-NOT-BINDABLE.
  Wired as `walkRenderByTagUses(...)` after PASS 4 in `runSYM`. Error code constants `B6_NO_RENDER_SPEC` / `B6_NOT_BINDABLE`.
- [Phase 1b verification] Render-by-tag tests: **19 pass / 0 fail**. Full test suite `bun run test`: **9090 pass / 44 skip / 1 todo / 0 fail**. Baseline 9071 + 19 new = 9090 exact. **Zero regressions.**
- [Phase 1 commit] `cd6bda3` — `WIP(a1b-b6): Phase 1 — PASS 5 render-by-tag classifier + tests`.

## Phase 2 — Documentation

- [Phase 2 progress] Added B6 row to primer §13.7 contracts table (between B5 and B4 rows; the table is ordered by step-landing chronology). Added comprehensive **B6 specifics** prose block covering the disambiguator (`isConst` discrimination over the collapsed `markup-typed` bucket), the §3.1 / §3.2 dispositions, and the HTML-builtin skip behavior.
- No SPEC §34 changes required — both error codes (E-CELL-NO-RENDER-SPEC at line 14205, E-CELL-RENDER-SPEC-NOT-BINDABLE at line 14206) already exist with current message text matching the implementation.


