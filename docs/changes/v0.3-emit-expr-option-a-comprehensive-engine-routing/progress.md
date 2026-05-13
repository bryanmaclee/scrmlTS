# emit-expr.ts:emitAssign — Option A comprehensive engine-routing

## Status: IN PROGRESS

## Worktree: `worktree-agent-a580b7d610279f725`

## Phase 0 — Setup + diagnosis (2026-05-12)

- Verified worktree clean, `bun install` + `bun run pretest` green at base SHA `7a00b1b` (S86 close).
- Read maps (primary, structure) + BRIEFING-ANTI-PATTERNS + Bug 1.6+1.7 progress.md.
- Cherry-picked S87/S88 prerequisite commits (Bug 1 fix-A + Bug 6.5 tests + Option-d D1 runtime no-op + Bug 1.7 fix + Bug 1.7 tests). Resolved one merge conflict in `emit-control-flow.ts:emitMatchExpr` docstring (kept incoming Bug 1.7 form; semantically equivalent).
- Bug 1.7 unit suite (`match-arm-codegen-bundle-bug-1.6-1.7.test.js`) passes 10/10 on this base.

## Phase 1 — Reproduction
