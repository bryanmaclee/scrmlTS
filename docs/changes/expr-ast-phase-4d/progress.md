# Phase 4d Progress

## 2026-04-24

### Status: Steps 1-7 Complete, Step 8 Blocked

### Steps Completed
- Step 1: body-pre-parser.ts -- exprNode-first with emitStringFromTree fallback
- Step 2: component-expander.ts -- children/... already ExprNode-first; render patterns MUST stay on .expr; added emitStringFromTree import
- Step 3: type-system.ts -- converted ~10 string field references to ExprNode-first; match arm patterns reverted (scrml-specific syntax)
- Step 4: dependency-graph.ts -- converted callees/reactive-refs/condition string fallbacks to ExprNode-first
- Step 5: meta-checker.ts + meta-eval.ts -- already ExprNode-first; fixed init priority order in meta-checker
- Step 6: route-inference.ts -- already ExprNode-first from prior phases; no changes needed
- Step 7: Codegen files -- already ExprNode-first from prior phases; no changes needed
- Fix: bpp.test.js worktree GIT_DIR leak causing pre-commit hook failures

### Step 8: types/ast.ts -- NOT done
Deleting deprecated string fields from AST types is blocked because:
1. Match arm patterns (.Variant => result) are scrml-specific syntax that the ExprNode parser CANNOT represent; these MUST keep using .expr
2. Component-expander render patterns (render name()) are scrml-specific syntax that MUST stay on .expr
3. LiftTarget.expr is part of the LiftTarget type union, not the deprecated field
4. Several codegen paths use .expr/.init as fallback strings in emitExprField(exprNode, fallbackStr, ctx) -- removing the fields would require updating all call sites

### Key Findings
- The ExprNode parser cannot faithfully represent scrml-specific syntax (match arms, render patterns)
- emitStringFromTree round-trip is NOT lossless for these patterns
- Most AST consumers were already ExprNode-first from prior migration phases (3, 4a, 4b, 4c)
- The deprecated string fields cannot be deleted until the expression parser supports match arm patterns and render syntax
