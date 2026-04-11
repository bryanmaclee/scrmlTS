# Pre-Snapshot: expr-ast-phase-1

Recorded: 2026-04-11, before any code changes.

## Branch state
- Current branch: main
- Last commit: 956b660 — docs(pa): add cross-repo messaging dropbox convention

## Unit tests (`bun test compiler/tests/unit`)
- **2298 pass, 2 skip, 90 fail, 85 errors**
- 147 test files, 2390 total tests, 16378 expect() calls
- Runtime: 2.12s

Note: 90 failures + 85 errors are PRE-EXISTING from previous sessions. They are NOT
introduced by this change. They reflect the known lin-enforcement structural gap and
other open issues. Any regression introduced by this change would increase these numbers.

## Integration tests (`bun test compiler/tests/integration`)
- **23 pass, 3 fail, 1 error**
- 26 total tests across 2 files
- PRE-EXISTING failures:
  - Self-host tokenizer parity test fails (compiled tab.js doesn't exist)
  - These are expected — self-host build is not part of Phase 1

## Files that must not change output
- compiler/src/block-splitter.js — not touched
- compiler/src/tokenizer.ts — not touched (lin stays IDENT for Phase 1)
- compiler/src/body-pre-parser.ts — not touched
- compiler/src/protect-analyzer.ts — not touched
- compiler/src/route-inference.ts — not touched
- compiler/src/type-system.ts — not touched
- compiler/src/dependency-graph.ts — not touched
- All codegen emitters — not touched

## Files that WILL change
- compiler/src/types/ast.ts — add ExprNode union (type-only, no runtime)
- compiler/src/expression-parser.ts — add parseExprToNode, esTreeToExprNode, emitStringFromTree
- compiler/src/ast-builder.js — populate parallel ExprNode fields alongside existing string fields

## Exit criterion for "no regression"
After Phase 1 lands:
- unit: still 2298 pass (±0 new failures)
- integration: still 23 pass (±0 new failures)
- 15 worked-example invariant tests: all pass
- 14 examples corpus round-trip invariant: all pass

## Tags
#expr-ast-phase-1 #pre-snapshot #baseline
