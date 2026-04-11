# Design Review: expr-ast-phase-1

## Reviewers Invoked

- `scrml-parser-architecture-reviewer`: NOT FOUND — not in agent registry as of 2026-04-11.
  Self-review performed. **Flagged as "unreviewed by specialist".**

## Self-Review Notes

The design is already ratified by the `scrml-deep-dive` agent output in:
`/home/bryan/scrmlMaster/scrml-support/docs/deep-dives/expression-ast-phase-0-design-2026-04-11.md`

That document provides:
1. The exact ExprNode types ready to paste (§4.1) — no design decisions needed from implementation agent
2. The field naming convention for parallel fields (§4.4) — unambiguous
3. The invariant definition (§5.2) — testable
4. The rollback story — additive fields, zero-cost revert
5. Worked examples for all 15 test cases (§8)

Implementation risks reviewed:

**Risk 1: esTreeToExprNode escape hatches**
The design expects ZERO escape hatch nodes for the 14 examples corpus. The implementation
must handle: Identifier, Literal, BinaryExpression, LogicalExpression, UnaryExpression,
MemberExpression, CallExpression, NewExpression, ArrayExpression, ObjectExpression,
AssignmentExpression, ConditionalExpression, ArrowFunctionExpression, FunctionExpression,
SpreadElement, TemplateElement, TemplateLiteral, SequenceExpression.
Acorn also produces: ChainExpression (optional chaining), UpdateExpression (++/--),
AwaitExpression, YieldExpression. All must map to ExprNode kinds.
The scrml-specific `@`-sigil and `::` enum forms are pre-processed by parseExpression's
preprocessing step and become Identifier/Literal nodes by the time esTreeToExprNode sees them.
Risk: LOW — Acorn produces a well-known ESTree subset; ExprNode covers all standard JS forms.

**Risk 2: emitStringFromTree whitespace mismatch**
collectExpr() joins tokens with spaces (joinWithNewlines). astring uses its own spacing.
The invariant test uses whitespace normalization (collapse runs to single space, trim).
This was flagged in design §5.2 Risks. Normalization must be applied consistently in tests.
Risk: LOW — normalization is well-defined.

**Risk 3: ast-builder.js parallel field population — error handling**
If parseExprToNode throws or returns an escape hatch, the pipeline must not crash.
The parallel fields are OPTIONAL — on parse failure, leave them undefined and log a warning.
The implementation agent must not let ExprNode parsing failures break existing compilation.
Risk: LOW if the agent wraps the call in try/catch.

**Risk 4: collectExpr call sites — 55 sites identified**
Not all 55 sites need parallel fields. Sites that collect expressions into fields named:
`init`, `expr`, `condition`, `iterable`, `header`, `value` (reactive), `handler`, `callback`
need the parallel field. Sites that collect into `bare-expr` also need `exprNode`.
Sites that discard the result or use it in an ad-hoc way do NOT need parallel fields.
The implementation agent must be instructed to populate only the named fields from design §4.4.
Risk: MEDIUM — agent must be precise about which sites get parallel fields.

**Risk 5: LambdaExpr body type includes LogicStatement[]**
The LambdaExpr.body union references `LogicStatement[]` which is a type from ast.ts.
For Phase 1, the `esTreeToExprNode` function encounters FunctionExpression and
ArrowFunctionExpression with block bodies. Converting the block body to `LogicStatement[]`
is NOT in scope for Phase 1 — it requires running the full ast-builder statement parser on
the lambda body, which is circular.
Resolution: For Phase 1, lambda bodies with blocks are modeled as EscapeHatchExpr OR
the implementation agent uses `rawArms`-style raw body text. The design §4.1 LambdaExpr
is the Phase 2+ target. For Phase 1, any lambda with a block body (not expr body) should
become EscapeHatchExpr and be tracked. Only expression-body arrows are fully structured.
This needs to be explicit in the implementation brief — the design doc does not call this out
clearly. **FLAG FOR IMPLEMENTATION AGENT.**

## Consolidated Verdict

**APPROVE with constraint clarification**

The design is ratified. Phase 1 proceeds with this additional constraint:
- Lambda block bodies (ArrowFunctionExpression/FunctionExpression with BlockStatement body)
  are represented as EscapeHatchExpr in Phase 1. Only expression-body arrows (`x => expr`)
  are fully structured. If any example file uses expression-body arrows, they must round-trip.
  If example files use block-body lambdas, they should fire EscapeHatch and be tracked.
  This is NOT a blocker for Phase 1 merge as long as the EscapeHatch count is reported.

## Required Revisions

None to the design. The constraint clarification above is added to the implementation brief.

## Tags
#expr-ast-phase-1 #design-review #T3 #unreviewed-by-specialist

## Links
- [impact-analysis.md](./impact-analysis.md)
- [pre-snapshot.md](./pre-snapshot.md)
- [Phase 0 Design Doc](../../../scrml-support/docs/deep-dives/expression-ast-phase-0-design-2026-04-11.md)
