# A1b Step B22 — Phase 0 Survey (`reset(@cell)` target-shape validation)

**Date:** 2026-05-07.
**Step:** A1b B22.
**Spec authority:** SPEC §6.8.2 (line 4844+), §34 catalog (line 14223 — E-RESET-NO-ARG already present).

## Phase 0 questions answered

### (a) Canonical error-code name

**Search of existing catalog rows for reset-related codes (pre-B22):**

```
$ grep -n "E-RESET" compiler/SPEC.md
4867: **Explicit cell argument REQUIRED** — `reset()` ... is **E-RESET-NO-ARG** ...
4872: §34 — E-RESERVED-IDENTIFIER, E-RESET-NO-ARG
14223: | E-RESET-NO-ARG | §6.8 | `reset()` called with no argument. ... | Error |
25245: `E-RESET-NO-ARG` ...
```

**Search of source for declared reset codes:**

```
$ grep -rn "E-RESET" compiler/src/
expression-parser.ts:1161,1185 — string-literal "E-RESET-NO-ARG" code values
ast-builder.js:184,1813 — fall back to "E-RESET-NO-ARG" if diagnostic.code unset
```

No `diagnostic-codes.ts` exists; codes are string literals at the fire-site (consistent with existing pattern).

**Verdict:** No existing `E-RESET-INVALID-TARGET` row or other reset-target name. The audit-recommended `E-RESET-INVALID-TARGET` is unique and follows the established pattern (`E-RESET-NO-ARG` exists at §34 line 14223). **B22 adopts `E-RESET-INVALID-TARGET`** and adds a §34 row alongside E-RESET-NO-ARG.

### (b) A1a Step 9 parser shape (reset-expr AST kind)

**Source:** `compiler/src/types/ast.ts` lines 1657-1694.

```ts
export interface ResetExpr {
  kind: "reset-expr";
  span: ExprSpan;
  target: ExprNode;       // any ExprNode at parse time; A1b validates shape
  diagnostic?: { code: string; message: string };  // E-RESET-NO-ARG path only
}
```

**Step 9's emit logic (`expression-parser.ts:1142-1196`):** lifts bare-`Identifier`-callee `reset(...)` calls into `reset-expr`. Member-calls (`limiter.reset("k")`) stay as ordinary `call` (§R9.7 regression test). Zero-arg / multi-arg / spread cases attach `diagnostic` and surface `E-RESET-NO-ARG` via ast-builder wrappers; happy path produces a clean `reset-expr` with `target` = whatever the developer wrote.

**Existing walker reuse:** `expression-parser.ts:2538` exports `forEachResetExprInExprNode(node, cb)` that recurses the full ExprNode tree and invokes `cb` once per `reset-expr` encountered — exactly what B22 needs. Mirrors the `forEachIdentInExprNode` walker already used by B3.

**Validation status:** target-shape validation is currently a no-op. Step 9 docstring (`ast.ts:1670-1674`) explicitly defers it to A1b. Confirmed.

### (c) Multi-level compound-nav legality

**Spec text (SPEC §6.8.2 line 4848-4853):**

```
reset(@cell)              // reset a top-level cell
reset(@compound.field)    // reset a field within a compound cell
reset(@compound)          // reset all fields of a compound cell
```

The enumeration shows ONE level of dot-nav. §6.8.2 is silent on `reset(@compound.subCompound.field)`.

**Compound-nav recursion grounding (SPEC §6.3, §6.3.2):**

§6.3.5 ("V5-Strict Composition in Compound Cells"): "The V5-strict access forms apply at every level of the compound hierarchy" — i.e., compound-nav is fundamentally recursive. `@formRes.name` is the simple case; arbitrarily nested compounds use the same dot-nav syntax recursively.

**Implementation evidence (`compiler/src/symbol-table.ts:5400-5421`):**

```ts
export function lookupQualifiedStateCell(
  scope: Scope | null | undefined,
  path: string[],
): StateCellRecord | null {
  if (!Array.isArray(path) || path.length === 0) return null;
  let current = lookupStateCell(scope, path[0]);
  if (!current) return null;
  for (let i = 1; i < path.length; i++) {
    const subScope = (current.declNode as ReactiveDeclNode & ScopeAnnotated)._scope;
    if (!subScope) return null;
    const next = subScope.stateCells.get(path[i]);
    if (!next) return null;
    current = next;
  }
  return current;
}
```

`lookupQualifiedStateCell` is already arity-N (loop from i=1 to path.length). Per primer §13.7 B12 specifics: "Previously required every intermediate segment to be `isCompoundParent`. B12 RELAXES this: descent works through ANY cell with a `_scope` attached." Multi-level paths resolve uniformly today.

**Decision (per pa.md Rule 3 — surface, then choose deliberately):**

Three options were enumerated by the brief:
1. Reject multi-level as spec-silent.
2. Accept multi-level (compound-nav is recursive).
3. Surface to PA for spec-amendment.

**B22 choice: ACCEPT multi-level when `lookupQualifiedStateCell` resolves the full path** (option 2 — spec-faithful default per §6.3.5 recursive semantics). Rationale:

- Rejection would create an anti-symmetry: `@formRes.subSection.name` is a legal READ everywhere else in the language (B3's `lookupQualifiedStateCell`-extension makes it work uniformly), but reset would arbitrarily reject it. That's a footgun, not a guardrail.
- The ALTERNATIVE — workaround `reset(@formRes.subSection)` (one level, whole sub-compound) followed by manually setting one field — is strictly worse ergonomically and doesn't even capture the developer's intent.
- The reset semantics (§6.8.1: "evaluate the `default=` expression … and write the result") have well-defined behavior at any leaf cell: walk to the leaf StateCellRecord, apply that cell's reset rule. The recursive lookup already gives B22 the right StateCellRecord.

**SPEC-PROSE FOLLOW-UP (recorded for PA):** §6.8.2 line 4848-4853 should be amended to clarify that multi-level paths are legal when each segment resolves through the compound-scope chain. Implementation accepts multi-level today; spec text should follow. Logged in REPORTING block.

### (d) `.method` form (`cell.reset()`)

**Audit §5.2 brief #1:** "including `.reset` method-style if applicable."

**Verdict:** NOT applicable. Step 9 explicitly excludes `obj.reset(x)` from reset-expr lifting (§R9.7 regression test in `parse-reset-keyword.test.js:179-191`):

> "Member calls are ordinary method calls on user objects (e.g. rate-limiters in the stdlib). Only bare-Identifier `reset` calls are language-level."

So the only AST shape B22 ever sees is `kind: "reset-expr"` from bare-callee `reset(...)` lifts. No `.reset` form.

### (e) Existing test coverage / .skip tests

**Search results:**

- `compiler/tests/integration/parse-reset-keyword.test.js` — Step 9 parse tests (R9.1-R9.8). All passing today; they cover parse-time shape, not target-validity.
- `compiler/tests/unit/tokenizer-reset-keyword.test.js` — Step 1 lexer tests. Out of scope for B22.
- `compiler/tests/unit/at-name-resolution.test.js` — B3 tests (mention B22 in comments as a future consumer of `_resolvedStateCell`).
- **No `.skip` tests** referencing `E-RESET-INVALID-TARGET` or B22 target-shape exist. B22 is net-new test coverage.
- **No examples/ or samples/ usages of `reset(@…)` in source** today (only sample/test fixtures inside test files).

## Implementation plan (decided)

1. **New SYM PASS 14 (B22):** `walkValidateResetTargets` runs after PASS 13. Mirrors PASS 13 / PASS 11 structural recursion shape. Visits every `reset-expr` reachable in any ExprNode payload across the AST.
2. **For each `reset-expr` node:**
   - **Skip** if `node.diagnostic` is set — a parse-time E-RESET-NO-ARG already fired; don't double-report.
   - **Resolve target by shape:**
     - `target.kind === "ident"` AND `target.name.startsWith("@")` — legal IF B3's `_resolvedStateCell` is non-null (resolved cell or compound parent). If `_resolvedStateCell` is `null`, target's name is `@unknown` — do NOT fire E-RESET-INVALID-TARGET (B3's null is "unknown name", a different concern; pass through silently per the brief's "B3 raises a separate diagnostic; B22 may pass through silently"). NOTE: today B3 doesn't fire on null — that's a different deferred tightening. Either way, B22's job is shape, not name-resolution.
     - `target.kind === "member"` AND member-chain has a `@`-prefixed `IdentExpr` root AND every segment is a static `property: string` — legal IF `lookupQualifiedStateCell(scope, [rootName.slice(1), ...properties])` returns non-null. If `null`, again pass through (name-resolution issue, not shape issue).
     - **Anything else** — fire `E-RESET-INVALID-TARGET` with a message identifying the offending shape and recommending canonical forms.
3. **Edge cases handled in walker:**
   - `target.kind === "ident"` but no `@` prefix (bare `cell` not `@cell`) → INVALID-TARGET.
   - `target.kind === "member"` with non-`@` root (e.g., `obj.field`) → INVALID-TARGET.
   - `target.kind === "member"` with `@`-prefixed root but path segment is not a static string property (no current AST shape — MemberExpr.property is always string per ast.ts:1502, but defensively check).
   - `target.kind === "lit"` (e.g., `reset(42)`) → INVALID-TARGET.
   - `target.kind === "call"` (e.g., `reset(getCell())`) → INVALID-TARGET.
   - `target.kind === "binary"` (e.g., `reset(@a + 1)`) → INVALID-TARGET.
   - `target.kind === "ternary"` (e.g., `reset(c ? @a : @b)`) → INVALID-TARGET.
   - All other kinds default to INVALID-TARGET (defensive default-deny).
4. **§34 catalog row addition** (edit `compiler/SPEC.md`).
5. **Tests:** new `compiler/tests/unit/reset-target-shape-b22.test.js` covering positive cases (bare/whole-compound/single-level/multi-level) + negative cases (literal/call/binary/ternary/no-prefix/non-cell).

## Notes for follow-up SPEC work

- **§34 row addition:** add `E-RESET-INVALID-TARGET` row after `E-RESET-NO-ARG` (line 14223).
- **§6.8.2 multi-level clarification:** add a footnote / sentence noting that multi-level compound-nav (`reset(@a.b.c.d)`) is legal when each segment resolves through the compound-scope chain (per §6.3.5 recursive composition).
- **§6.8.2 cross-ref update:** add §34 cross-ref for E-RESET-INVALID-TARGET (currently lists E-RESERVED-IDENTIFIER + E-RESET-NO-ARG only).

## Files to edit (planned)

- `compiler/src/symbol-table.ts` — add PASS 14 walker + helper + invocation.
- `compiler/SPEC.md` — §34 row + §6.8.2 cross-ref + §6.8.2 multi-level footnote.
- `compiler/tests/unit/reset-target-shape-b22.test.js` — new (B22 coverage).
- `docs/PA-SCRML-PRIMER.md` — §13.7 B22 row + B22 specifics block.
