# Pre-Snapshot: expr-ast-phase-4d-step-8

## Test State (baseline before any change)
- bun test (compiler/): 7565 pass / 40 skip / 0 fail / 27275 expect() / 354 files / 10.13s
- One ECONNREFUSED stack from runtime test that does not affect pass/fail counts (pre-existing)

## E2E Compilation State (pre-existing failures)
- `examples/dist/03-contact-book.server.js`, `07-*.server.js`, `08-*.server.js`:
  fail `bun --check` due to lift+sql chained-call AST bug (parallel agent assigned).
  Phase 4d Step 8 must NOT make these worse; it is permitted to leave them as-is.

## Branch base
- Worktree branch: `worktree-agent-ad51209bf85f5cc5c`
- Rebased onto main `74881ea` (S40 close — Bun.SQL Phase 1, lift+sql intake).
- Pre-rebase tip was stale `5bd7a38` (S38 close); rebase succeeded with no conflicts.

## Field state (current main, not yet modified)
- `compiler/src/types/ast.ts:707-714` declares `BareExprNode { kind, expr?: string, exprNode?: ExprNode }`.
- `expr?: string` is `@deprecated Phase 4d`; this step removes it.
- Three other deprecated `expr?: string` fields exist on other node types
  (lines 625, 634, 761) — out of scope for Step 8, leave them.

## Tags
#scrmlTS #change #pre-snapshot #expr-ast-phase-4d-step-8 #baseline

## Links
- [progress.md](./progress.md)
- [impact-analysis.md](./impact-analysis.md)
