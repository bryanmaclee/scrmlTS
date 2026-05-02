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
  Pair text "export " with following PascalCase markup → synthetic logic
  `${ export const Name = <markup-raw> }`. GCP1 phase-1 check also needs to
  skip E-IMPORT-001 when this pattern is detected.
