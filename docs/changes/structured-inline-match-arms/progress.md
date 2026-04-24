# Structured Inline Match Arms — Progress

## Step 1: Add MatchArmInlineNode type (DONE)
- Added `MatchArmInlineNode` interface to `compiler/src/types/ast.ts`
- Added to `LogicStatement` union

## Step 2: Modify ast-builder.js (DONE)
- Added inline arm detection for 5 forms: variant (.Variant), else, not, _, string literal
- Also handles :: legacy prefix and payload bindings (.Variant(binding))
- Fixed S27 arm-boundary detection (OPERATOR vs PUNCT kind mismatch for => and ::)
- Fixed binding text extraction (space-join instead of comma-join for named bindings)
- Fixed string literal test field (reconstruct quotes stripped by tokenizer)

## Step 3: Update emit-control-flow.ts (DONE)
- Added matchArmInlineToMatchArm() converter function (exported)
- Added match-arm-inline fast-path in emitMatchBody

## Step 4: Update emit-logic.ts + type-system.ts (DONE)
- Added match-arm-inline handling in tilde-match emitter (emit-logic.ts)
- Added match-arm-inline to type-system.ts:
  - Scope walker case (prevents "unknown kind" fallthrough)
  - Exhaustiveness checker (extractMatchBodyArms)
  - Linear analysis (branch-parallel lin consumption)

## Step 5: Write tests (DONE)
- 19 new tests in compiler/tests/unit/match-arm-inline.test.js
- 13 AST structure tests + 6 E2E compilation tests
- Tests: 7562 pass / 40 skip / 0 fail (+19 from baseline 7543)

## Summary
All 5 steps complete. The implementation produces structured `match-arm-inline` AST nodes
for all inline match arm forms, with correct downstream handling in codegen, type system,
and exhaustiveness checking. No test regressions.
