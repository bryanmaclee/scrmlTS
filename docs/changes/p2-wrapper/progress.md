# Progress: p2-wrapper

Fix `export <ComponentName>` desugaring to be byte-equivalent to `export const ComponentName = <markup>`.

## Pre-snapshot

- Branch: `changes/p2-wrapper` (from `changes/p2`, off `main`)
- Worktree: `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a1a5ade61ee6b2c5e`
- P2 base commit: `e02f0e1 fix(p2): state-as-primary Phase P2 — export <ComponentName> direct grammar`
- Baseline tests: **8462 pass / 40 skip / 0 fail / 408 files** (post-pretest)

## Plan

1. WIP: pre-snapshot (this file + commit)
2. WIP: ast-builder desugaring — body-root absorbs outer attrs (replace wrapper synthesis with body-root extraction)
3. WIP: E-EXPORT-002 + E-EXPORT-003 emission
4. WIP: tests — AST equivalence + HTML equivalence + new error emissions
5. WIP: SPEC §21.2 + §21.6 — drop deferred-refinement caveat; add new error codes
6. WIP: update prior P2 tests that asserted wrapper presence
7. Final: fix(p2-wrapper)

## Log

- [start] Worktree verified, P2 merged, deps installed, pretest run, baseline 8462p/0f/40s confirmed.
