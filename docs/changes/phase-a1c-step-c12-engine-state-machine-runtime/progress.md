# Phase A1c Step C12 — Engine state-machine runtime — Progress

Append-only timestamped log.

- 2026-05-08T00:00:00Z — Worktree set up. Path discipline verified
  (`pwd` + `git rev-parse --show-toplevel` agree). `bun install` ran clean
  (114 packages). `bun run pretest` ran clean (12 samples compiled).
  Baseline confirmed at **10308 / 60 / 1 / 0** (S73 close baseline). Read
  BRIEF in full.
- 2026-05-08T00:10:00Z — Read mandatory pre-coding materials:
  BRIEFING-ANTI-PATTERNS.md, llm-kickstarter-v1, SPEC §51.0.A-G verbatim
  (lines 20179-20455). Read PRIMER §7 (engines + Tier ladder).
- 2026-05-08T00:20:00Z — Survey complete. Findings: (1) `<engine>` AST
  routes through `engine-decl` kind (same as legacy `<machine>`); (2)
  `emit-machines.ts` is wired EXCLUSIVELY for legacy machineRegistry +
  state-decl.machineBinding flow — does NOT consume `engineMeta.stateChildren`;
  (3) the codegen pipeline currently SKIPS engine-decl entirely for
  new-style `<engine>` declarations (no case in emit-client switch); (4)
  B14 + B15 populate `_record.engineMeta` with all the data C12 needs
  (varName, forType, initialVariant, variants[], stateChildren[] each with
  parsed EngineRuleForm).
  Decisions: NEW `emit-engine.ts`; defer direct-write hook to C13; defer
  body-rendering to C13. SURVEY.md written.
- Next: implement `emit-engine.ts` (transition table + variant cell init);
  wire from `emit-client.ts`; add usage-analyzer chunk gating; write tests.
- 2026-05-08T00:35:00Z — `emit-engine.ts` shipped (427 LOC). Exports:
  `isC12EngineDecl`, `collectC12EngineDecls`, `engineTransitionTableName`,
  `resolveEngineInitialVariant`, `emitEngineTransitionTable`,
  `emitEngineVariantCellInit`, `emitEngineSubstrate`. Per-rule encoding:
  single → `["X"]`, multi → `["A","B"]`, wildcard → `"*"` sentinel,
  absent/legacy-arrow/parse-error → `[]` (defensive). Cell init via
  `_scrml_reactive_set` with bare-string variant value (matches §14.4
  unit-variant runtime shape). Pre-commit hooks PASS (10308 / 0 fail).
- 2026-05-08T00:45:00Z — Wired `emitEngineSubstrate` into `emit-client.ts`
  after enum variant objects, before reactive wiring. Section header
  `// --- engine substrate (compiler-generated, §51.0) ---`. Full test
  suite still 10308 / 60 / 1 / 0.
- 2026-05-08T01:00:00Z — Tests written:
  `compiler/tests/unit/c12-engine-state-machine-runtime.test.js` — 41
  tests across 18 describe blocks covering all spec rule= forms, gating
  predicate, naming convention, initial-variant resolution including
  W-ENGINE-INITIAL-MISSING fallback, end-to-end emission via SYM + emit-
  client, multi-engine independence, derived-engine + legacy-arrow
  exclusion, no-engines empty case, walker fallbacks. Final: 41 / 0 fail.
  Full suite: 10349 / 60 / 1 / 0 — +41 new tests, zero regressions.
- 2026-05-08T01:10:00Z — Decision NOT to add a NEW `engine` runtime chunk
  (#18). Reasoning: C12 substrate is purely declarative — the transition
  table is a const, the cell init uses the existing `core` chunk's
  `_scrml_reactive_set` helper, the §51.0.D mount marker is a comment.
  No new runtime helpers needed at the C12 layer. C13's direct-write hook
  + `.advance()` will likely justify a chunk; surface that decision to C13.
  No `usage-analyzer` change needed for C12; the existing `engines: true`
  flag still flips correctly (engine-decl walker is intact); the chunk
  table just doesn't have a corresponding `engine` chunk row.
- DEFINITION OF DONE (per BRIEF):
  - [x] All §scope IN items shipped (variant cell + transition table +
    initial-state wiring + AST kind discrimination + same-file mount
    marker + tests)
  - [x] 0 regressions vs baseline (10308 / 60 / 1 / 0 → 10349 / 60 / 1 / 0)
  - [x] Spec re-verified against §51.0.A through §51.0.G in SPEC.md text
  - [x] Legacy `<machine>` keyword path NOT regressed (separate file
    `emit-machines.ts`; C12 didn't touch it; legacy machine tests still
    pass — verified by full-suite run)
  - [x] C13 unblocked — handoff documented in final report
  - [x] SURVEY.md documents file-locus / direct-write-hook / body-
    rendering reuse / B14 annotations consumed / VERDICT
- 2026-05-08T01:15:00Z — Ready to commit + final-report. VERDICT: SHIP.
