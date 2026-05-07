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
