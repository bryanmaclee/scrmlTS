# fix-lin-template-literal-interpolation-walk — Intake (Scope C finding A4)

**Surfaced:** 2026-04-25 (S42), Scope C Stage 3 (writing example 19-lin-token).
**Status:** SCOPED, awaiting authorization to dispatch.
**Tracker entry:** `docs/audits/scope-c-findings-tracker.md` §A4.
**Tier:** **T2** (surgical path) or **T3** (structural path) — see fix options.
**Priority:** medium — affects every `lin` user who returns a template literal containing the `lin` value. Example 19 worked around it.

---

## Symptom

A `lin`-typed parameter or local referenced inside a template literal interpolation is not recognized by the lin tracker as a consumption event. The compiler emits `E-LIN-001: Linear variable not consumed before scope exit` even though the value IS being read.

### Repro (minimal — verified S42)

```scrml
<program>
${
  server function f(lin t: string) {
    return `value: ${t}`   // ← compile error E-LIN-001
  }
}
</program>
```

The `${t}` interpolation reads `t`, which per §35.3 rule 1 ("any read of a `lin` value as an expression is a consumption") should count as consuming. The lin tracker doesn't see it.

### Workaround (currently used)

Bind the value to a `const` first:

```scrml
server function f(lin t: string) {
  const consumed = t              // single read counts as consumption ✓
  return `value: ${consumed}`     // template-literal interpolation now sees `consumed`, not `t`
}
```

Used in `examples/19-lin-token.scrml`.

### Examples affected

`examples/19-lin-token.scrml` — `redeem` server function uses the `const consumed = ticket` workaround. Both the `redeem` body and the inline `login` function use this pattern to placate the lin tracker.

---

## Root cause (located, S42 deep-dive)

Two adjacent constructs:

**`compiler/src/expression-parser.ts:745-759`** — template literals are stored as `LitExpr` (a `lit` ExprNode) with `litType: "template"`:

```ts
const litType = raw && raw.startsWith("`") ? "template" : "string";
return { kind: "lit", span, raw, value: cooked, litType: "template" } satisfies LitExpr;
```

The full template-literal source (including all `${...}` interpolations) is stored in the `raw` field as opaque text. **There are no structured ExprNode children for the interpolation expressions.**

**`compiler/src/expression-parser.ts:1598-1604`** — `forEachIdentInExprNode` (the canonical IdentExpr walker used by lin tracking, dep-graph analysis, and other passes) treats `lit` nodes as leaves:

```ts
case "lit":
case "sql-ref":
case "input-state-ref":
case "escape-hatch": {
  // Leaf nodes with no sub-expressions. Nothing to walk.
  return;
}
```

When the lin tracker calls `forEachIdentInExprNode(returnStmt.exprNode, callback)` with `returnStmt.exprNode = LitExpr { litType: "template", raw: \`value: ${t}\` }`, the walker returns immediately. `t` is never seen, never recorded as a consumption.

**Same gap affects all other ExprNode walkers**, not just lin. Any analysis that depends on `forEachIdentInExprNode` (or equivalent recursive walks) misses identifiers inside template-literal interpolations.

---

## Fix approach (two options)

### Option 1 (surgical T2) — descend into template-literal interpolations in the walker

Modify `forEachIdentInExprNode`'s `lit` case to special-case `litType === "template"`:

```ts
case "lit": {
  const litNode = node as LitExpr;
  if (litNode.litType === "template") {
    // Walk template-literal interpolations.
    // The `raw` field contains ` ... ${expr} ... ${expr} ... `; extract each
    // ${...} segment, parse as ExprNode, and recurse.
    walkTemplateInterpolations(litNode.raw, litNode.span, callback);
  }
  return;
}
```

Where `walkTemplateInterpolations` is a new helper that:
1. Tokenizes the `raw` template into quasis (literal segments) and interpolation segments
2. For each interpolation segment, parses the inner expression to an ExprNode
3. Calls `forEachIdentInExprNode` recursively on each parsed interpolation

The parsing step can either:
- **Reuse existing infrastructure:** call `safeParseExprToNodeGlobal` (in `ast-builder.js:156`) on each interpolation string. This produces a real ExprNode tree.
- **Text-scan only:** regex-extract identifiers and synthesize IdentExpr nodes with approximate spans. Less precise but no parser invocation needed.

Recommendation: **reuse the parser** for accuracy. Synthesized spans inside the template literal point to the appropriate offset within `lit.span`.

**Net change:** ~30-50 lines (helper + lit-case update). Single file (`expression-parser.ts`).

**Coverage:** fixes lin tracking AND any other consumer of `forEachIdentInExprNode` for free. Dep-graph reactive analysis, server-fn boundary detection, and other passes all benefit.

### Option 2 (structural T3) — represent template literals as structured ExprNode at parse time

Change the AST to introduce a new ExprNode kind:

```ts
export interface TemplateLiteralExpr extends BaseNode {
  kind: "template-literal";
  span: Span;
  /** The literal text segments. quasis.length === expressions.length + 1. */
  quasis: string[];
  /** The interpolation expressions. */
  expressions: ExprNode[];
  /** Original raw source for round-tripping. */
  raw: string;
}
```

Update:
- The expression parser (`expression-parser.ts:745-759`) to build `TemplateLiteralExpr` instead of `LitExpr` when the literal starts with backtick
- `forEachIdentInExprNode` to recurse into `expressions[]`
- All codegen sites that handle template literals (search for `litType === "template"` across the codebase) to handle the new kind
- All type-checker / dep-graph / boundary-analysis sites that handle `lit` nodes to also handle the new kind

**Net change:** invasive. Touches AST shape, parser, codegen, type system. The right structural fix but high blast radius.

### Recommendation

**Option 1 (surgical).** Single-file change with clear coverage. Option 2 is structurally cleaner but should be deferred to a dedicated AST-cleanup effort with broader scope. The surgical fix unblocks lin (and other walker consumers) without rippling through the whole codebase.

Note: Option 1 + Option 2 are not mutually exclusive. Option 1 lands now; Option 2 can replace it later when an AST cleanup effort is scoped.

---

## Test plan

### Existing tests that must continue to pass

- All `compiler/tests/unit/lin-*.test.js` (lin tracking tests)
- All `compiler/tests/unit/expression-parser*.test.js` (expression parser tests)
- All template-literal codegen tests (search for template-literal-related test files)
- Full 7889-test suite

### New regression tests

Add to `compiler/tests/unit/lin-template-literal-interpolation.test.js`:

1. **Verified bisected trigger:**
   ```scrml
   server function f(lin t: string) {
     return `value: ${t}`
   }
   ```
   Expected: zero E-LIN-001 diagnostics. The template-literal `${t}` counts as a consumption.

2. **Multiple interpolations of the same `lin`:**
   ```scrml
   server function f(lin t: string) {
     return `${t}-${t}`   // E-LIN-002 — t consumed twice
   }
   ```
   Expected: ONE E-LIN-002 diagnostic. The walker correctly identifies multiple consumptions.

3. **Interpolation with non-`lin` expression:**
   ```scrml
   server function f(lin t: string, x: number) {
     return `${t} ${x + 1}`
   }
   ```
   Expected: zero diagnostics (t consumed once, x is non-lin).

4. **Nested template literal:**
   ```scrml
   server function f(lin t: string) {
     const inner = `inner: ${t}`     // first consumption
     return `outer: ${inner}`         // outer references inner, not t — no second t consumption
   }
   ```
   Expected: zero diagnostics.

5. **Template literal in a let-decl init:**
   ```scrml
   function g() {
     lin token = "abc"
     const msg = `tok: ${token}`     // single consumption
     return msg
   }
   ```
   Expected: zero diagnostics.

6. **Sanity — non-template lit nodes still treated as leaves:**
   ```scrml
   function h() {
     lin x = "abc"
     return "literal string"   // x never consumed — E-LIN-001 expected
   }
   ```
   Expected: ONE E-LIN-001 diagnostic. Confirms the surgical fix only descends into template literals, not all lit nodes.

### Existing-corpus verification

After fix:
- Refactor `examples/19-lin-token.scrml` to remove the `const consumed = ticket` workaround. Both `redeem` and the inline `login` function should compile clean with direct `${ticket}` interpolation. (Optional cleanup; example currently works with workaround.)
- Run full sample sweep — any sample that previously hit this bug class flips PASS as a bonus.

---

## Pre-snapshot baseline

- **Compiler SHA:** `9a07d07` (post-A5, post-A1+A2).
- **Test status:** 7889 pass / 40 skip / 0 fail / 375 files.

---

## Risk profile

- **Blast radius:** Option 1: single file (`expression-parser.ts`). Option 2: parser + codegen + multiple analyses (broad).
- **Failure modes (Option 1):**
  - Re-parse precision: `safeParseExprToNodeGlobal` may fail on a malformed interpolation. Need a fallback (e.g. text-scan) that doesn't propagate the parse error to the caller.
  - Span synthesis: interpolation spans inside the template literal must be computed correctly so error messages point at the right offset. Use `lit.span.start + offset_within_raw`.
  - Performance: the walker is on a hot path. Re-parsing every template literal in every walked ExprNode could add cost. Mitigate by caching the parsed quasis/expressions on the lit node (lazy, memoize on first walk).
- **Spec alignment:** §35.3 rule 1 ("any read of a `lin` value as an expression is a consumption") clearly applies to template-literal interpolations. The fix aligns the lin tracker with §35.3 by treating interpolations as expression-position reads. Also aligns dep-graph / reactive analysis with what the developer expects ("if I reference `@x` inside a template, it's a dep").
- **Reversibility:** Option 1: trivial. Option 2: harder.

---

## Out of scope

- Other passes that may also need template-literal interpolation walking (dep-graph, type narrowing, etc.). Option 1 fixes them all simultaneously by extending `forEachIdentInExprNode`. Don't scope per-pass adjustments separately unless evidence shows another pass uses a different walker.
- Refactoring `examples/19-lin-token.scrml` to remove the workaround. Optional follow-up.
- Option 2's full AST shape redesign — defer to a dedicated effort.

---

## References

- Findings tracker: `docs/audits/scope-c-findings-tracker.md` §A4 (full root-cause analysis).
- Stage 3 surfacing context: `examples/19-lin-token.scrml` (currently uses `const consumed = ticket` workaround — see header comment).
- Walker source: `compiler/src/expression-parser.ts:1586-1604` (the `forEachIdentInExprNode` function and its `lit` leaf case).
- Lit-node parse site: `compiler/src/expression-parser.ts:745-759` (where template literals become opaque `lit` nodes).
- Lin tracking call site: `compiler/src/type-system.ts:7060-7073` (where `forEachIdentInExprNode` is called for lin consumption tracking).
- Spec: SPEC.md §35 (Linear Types), §35.3 rule 1 (consumption events).

---

## Tags
#bug #parser #expression-parser #template-literal #lin-tracking #ident-walker #scope-c #stage-3 #s42 #t2 #surgical-fix-recommended
