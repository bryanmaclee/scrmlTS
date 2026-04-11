# Impact Analysis: expr-ast-phase-1

## Change Summary

Phase 1 of the structured expression AST migration. Adds the `ExprNode` discriminated union
to `ast.ts`, adds `parseExprToNode`/`esTreeToExprNode`/`emitStringFromTree` to
`expression-parser.ts`, and populates parallel `ExprNode` fields on AST nodes alongside the
existing string-form fields. Existing string fields remain — nothing downstream reads the new
fields yet. Zero behavior change for all existing consumers.

The design is fully specified in the Phase 0 design doc:
`/home/bryan/scrmlMaster/scrml-support/docs/deep-dives/expression-ast-phase-0-design-2026-04-11.md`

## Files Directly Modified

| File | Change | Lines added (est.) |
|------|--------|--------------------|
| `compiler/src/types/ast.ts` | Add ExprNode discriminated union (verbatim from design doc §4.1) | +250 |
| `compiler/src/expression-parser.ts` | Add parseExprToNode, esTreeToExprNode, emitStringFromTree | +400 |
| `compiler/src/ast-builder.js` | Populate parallel ExprNode fields at ~55 collectExpr() call sites | +100 (conservative est.) |
| `compiler/tests/helpers/expr.ts` | New test helper — expr(source) | +30 |
| `compiler/tests/unit/expr-node-round-trip.test.js` | New invariant tests (15 worked examples + 50 operator samples) | +200 |

Total estimated additions: ~980 LOC. Design doc estimate was 900 LOC. Within 2x threshold.

## Downstream Stages Affected

None for Phase 1. The new `ExprNode` fields are optional (`?`) and no downstream stage reads
them. Parallel fields are additive — every consumer of the old string fields sees identical data.

Stage dependency:
- TAB (ast-builder.js) is modified: it populates NEW fields in addition to existing ones.
- BPP, PA, RI, TS, DG, CG — all consume existing string fields, unaffected.

## Pipeline Contracts At Risk

**None.** Phase 1 is purely additive:
- `ast.ts` type additions are additive (no existing types removed or changed)
- `expression-parser.ts` additions export new functions; no existing functions touched
- `ast-builder.js` changes add optional fields; existing fields retain their values

The only contract risk: if `esTreeToExprNode` or `emitStringFromTree` has a bug, the parallel
fields will be wrong but existing fields are unaffected. This is why the round-trip invariant
test is a Phase 1 exit criterion.

## Spec Changes Required

None. Phase 1 is internal compiler representation only. The draft §54 Expression Grammar from
the design doc §3.6 is informational but NOT being added to SPEC.md in Phase 1.

## Tests That Must Pass

All existing tests: 2298 unit + 23 integration (current green baseline).

## New Tests Required

1. `compiler/tests/unit/expr-node-round-trip.test.js`
   - Unit: 15 worked examples from design doc §8 — parseExprToNode then emitStringFromTree, assert round-trip
   - Unit: 50 operator sample expressions from samples/compilation-tests/ — same round-trip
   - Integration: 14 examples/ files compiled, all parallel fields pass round-trip invariant

2. `compiler/tests/helpers/expr.ts`
   - Not a test itself — enables concise test authoring for Phase 2

## Expected Behavioral Changes

None. Phase 1 is representation-only. Compiled output from all 14 examples files must be
character-identical before and after.

## Must Not Change (Invariants)

- Compiled JS output for all .scrml files in examples/ — identical
- Compiled JS output for all samples/compilation-tests/ — identical
- All existing test assertions pass unchanged
- No new tokenizer keywords (lin stays IDENT)
- No new statement-level AST node kinds from ast-builder.js
- No changes to semantic passes (type-system, protect-analyzer, etc.)
- No changes to codegen

## Key Constraints from Task Brief

- Phase 1 does NOT promote `lin` to a keyword (that is Phase 2)
- Phase 1 does NOT emit `lin-decl` nodes (that is Phase 2)
- Design doc §4.1 ExprNode shapes are pasted verbatim — no deviation
- EscapeHatchExpr fires = Phase 1 blocker (must be zero for examples corpus)
- Whitespace normalization for round-trip: collapse multiple spaces to single, trim

## Tags
#expr-ast-phase-1 #impact-analysis #T3
