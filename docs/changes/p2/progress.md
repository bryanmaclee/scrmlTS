# Progress: p2

State-as-Primary Phase P2 — `export <ComponentName ...>...</>` direct grammar.

- [2026-05-01T23:52Z] Started — branch `changes/p2` created from main (1a89e84)
- [2026-05-01T23:52Z] Worktree fix: was on stale branch worktree-agent-a8ef6c464e352adea (3338377 / pre-P1).
  Reset to main (1a89e84). Symlinked node_modules + compiler/node_modules from main repo.
  Ran `bun run pretest` to compile dist fixtures.
- [2026-05-01T23:52Z] Baseline measured: 8444 pass / 40 skip / 0 fail / 405 files / ~14.47s.
  (Task header expected 8484p but commit message records 8444p as P1.E ship state — using actual.)
- [2026-05-02T00:00Z] SPEC §21.2 amendment landed (commit 6a59a13).
  Added Form 1 (canonical, top-level) and Form 2 (transitional, in-${}).
  Worked equivalence example. Both E-IMPORT-001 entries updated.
- [2026-05-02T00:00Z] Plan: TAB block-pairing in `liftBareDeclarations`.
- [2026-05-02T00:08Z] TAB + GCP1 patches (commit 451d24e).
  ast-builder.js liftBareDeclarations pairs text "export " + PascalCase
  markup → synthetic logic block. gauntlet-phase1-checks.js skips
  E-IMPORT-001 for the pattern. 8444p / 0f maintained.
- [2026-05-02T00:14Z] Unit tests added (commit 03044a9). 10 tests covering
  desugaring, shape parity, GCP1 suppression, lowercase exclusion, coexistence.
  Also patched buildBlock case "logic" to preserve _p2Form1 markers on AST node.
  8454p / 0f.
- [2026-05-02T00:20Z] Initial cross-file integration tests showed expected
  behavior in `app.html` (the body markup IS rendered) but the rendering
  has an outer `<ComponentName>` wrapper because Form 1 desugars to
  `<ComponentName>...</ComponentName>` not the inner body. Updated tests
  to use `combinedArtifacts(outDir, basename)` helper that reads BOTH
  HTML and client.js. Added implementation note to SPEC §21.2 documenting
  the wrapper limitation as deferred refinement.
- [2026-05-02T00:24Z] Cross-file integration tests committed (commit 908103e).
  5 tests covering Form 1 import, Form 1 with props, coexistence, MOD
  shape equivalence, regression check. 8459p / 0f.
- [2026-05-02T00:26Z] Use-site verification tests (commit 7b9244b).
  3 tests confirming CE finds Form 1 components without E-COMPONENT-020,
  E-MARKUP-001 not raised on Form 1 tags, and use-site error parity
  Form 1 vs Form 2. 8462p / 0f.
- [2026-05-02T00:28Z] PIPELINE.md Amendment 6 added; SPEC-INDEX.md §21
  range corrected (was stale). 8462p / 0f maintained.
- [2026-05-02T00:28Z] Ready for final summary commit.

## Final state

- Tests: 8462p / 40s / 0f / 408 files (was 8444 / 40 / 0 / 405 — added 18 new tests).
- 0 regressions.
- All 9 commits map to a step in the planned commit cadence.
- examples/22-multifile/app.scrml still compiles (legacy Form 2 unaffected).
- Sample dist regenerated via `bun run pretest` (12 files).

## Deferrals + future work

- Wrapper-folding refinement: Form 1 currently leaves an outer `<ComponentName>`
  wrapper in the rendered HTML. Folding it into the body root (so Form 1 +
  Form 2 produce byte-equivalent HTML) is out of P2 scope. Documented as
  implementation note in SPEC §21.2.
- Form 1 for non-component state-types (`<channel>`, `<engine>`, `<timer>`):
  not exportable via Form 1 in P2. Cross-file inline-expansion of these
  state-types is scoped to Phase P3 per DD §9.1.
- NameRes promotion to authoritative routing: deferred per task spec.
- Internal compiler rename `machineName→engineName`: deferred per task spec.
- Full SPEC §51 keyword sweep: deferred per task spec.
- E-MACHINE-* → E-ENGINE-* code rename: deferred per task spec.
