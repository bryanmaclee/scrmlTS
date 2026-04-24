# Phase 4d Progress

## 2026-04-24

### Status: In Progress

**Blocker: Pre-commit hook fails in worktrees (3 bpp.scrml self-host tests fail consistently due to git worktree path resolution issue). All 7,543 unit tests pass — only the hook is blocked.**

### Steps Completed
- Step 1: body-pre-parser.ts — exprNode-first with emitStringFromTree fallback (DONE, not committed due to hook)
- Step 2: component-expander.ts — children/... already ExprNode-first; render patterns MUST stay on .expr (scrml-specific syntax, not parseable as JS expression); LiftTarget.expr is a different field. Added emitStringFromTree import but render patterns preserved. (DONE, not committed due to hook)

### Steps Remaining
- Step 3: type-system.ts — ~30 string field references to convert
- Step 4: dependency-graph.ts — ~11 refs  
- Step 5: meta-checker.ts + meta-eval.ts
- Step 6: route-inference.ts
- Step 7: Codegen files
- Step 8: types/ast.ts — delete deprecated fields

### Key Finding
The `render name()` pattern in component-expander.ts is scrml-specific syntax that the JS expression parser cannot represent. ExprNode round-trip through emitStringFromTree produces different output. This pattern must keep using .expr.
