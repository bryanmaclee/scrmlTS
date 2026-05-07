---
title: A1b B9 (validator-arg ExprNode conversion) — Rule 4 spec-faithfulness audit
date: 2026-05-07
session: S67
authority: PA-direct read of `docs/changes/phase-a1b-resolve-type/SCOPE-AND-DECOMPOSITION.md` §4.3 row B9 against `docs/changes/phase-a1a-lex-parse/AST-CONTRACTS-AND-DECOMPOSITION.md` §1.1, `compiler/src/types/ast.ts` (current shape), `compiler/SPEC.md` §55.1, §55.11, §55.12. Driver: pa.md Rule 4.
status: AUDIT — verifies SCOPE wording matches current code shape + spec; flags 1 sub-grammar boundary clarification before B9 dispatch fires
---

# A1b B9 — Rule 4 audit (pre-dispatch)

## §0 Scope

B9 = "Validator-arg ExprNode conversion — Step 5 deferral: convert `validator.args` from `string[]` to `ExprNode[]` per AST-CONTRACTS §1.1. Sub-grammar parser." (SCOPE §4.3 row B9, est 4-6h, locks none).

This audit verifies the current code shape, identifies the sub-grammar boundary, confirms the target shape matches AST-CONTRACTS, and flags integration points before B9 dispatch fires.

## §1 Findings

### §1.1 [SPOT-CHECK PASS — CURRENT CODE SHAPE VERIFIED] `args` is `string[] | null` today

**Current shape** (`compiler/src/types/ast.ts` line 527-534):
```typescript
export interface ValidatorEntry {
  name: string;
  args: string[] | null;  // ← Step 5 stores raw text strings
  span: Span;
}
```

**Comment at line 459-462:**
> "Per AST-CONTRACTS-AND-DECOMPOSITION §1.1, `args` is the parsed expression list (`ExprNode[]`). Step 5 stores args as raw text (`string[]`) for forwarding to A1b's sub-grammar parser; relational-form args (`>=2`) and cross-field args (`@cell`) are not standalone-parseable as JS."

**AST-CONTRACTS §1.1 (target):**
> "validators | array of `{name: string, args: ExprNode[] \| null, span}` \| null | parser, from bareword-attrs on Shape 2 decls | parsed contextually during Shape 2 attr scan | A1b validator typer; A2 reactive validity surface"

**Drift analysis:** none on the target. The SCOPE row is faithful to AST-CONTRACTS; current code shape (`string[]`) is the documented intermediate state pending B9.

### §1.2 [SUB-GRAMMAR BOUNDARY] What B9's parser must handle

The Step-5 raw-text args span four argument-shape categories per §55.1:

| Predicate | Arg shape (raw text) | Sub-grammar element |
|---|---|---|
| `req`, `is some` | (no args; bareword form — `args: null`) | n/a |
| `length(>=2)`, `length(>=N)`, `length(<=N)` | **relational predicate** (`>=`, `<=`, `<`, `>`, `=`, `!=` followed by an expression) | NEW shape — not standalone-parseable JS |
| `min(n)`, `max(n)` | numeric literal | parseable as JS expression |
| `gt(expr)`, `lt(expr)`, `gte(expr)`, `lte(expr)`, `eq(expr)`, `neq(expr)` | arbitrary expression — including `@cell` cross-field refs | parseable as JS-flavored ExprNode (cross-ref §6.1 V5-strict access) |
| `pattern(re)` | regex literal | parseable as JS expression (regex literal) |
| `oneOf([...])`, `notIn([...])` | array literal — including bare-variant `[.Variant, .Variant]` (per §14.10) | parseable as JS-flavored ExprNode + bare-variant inference (M9) |

**Two sub-grammar regions B9 must handle:**

1. **Relational-predicate form** (`length(>=2)`, etc.) — NOT a standalone expression. Form: `<rel-op> <expr>`. The `<rel-op>` is one of `>=`, `<=`, `<`, `>`, `=`, `!=`. The `<expr>` follows.
2. **Standard expression form** — everything else; canonical `@cell`-form, bare-variant `.Variant` (per S66 parser fix), regex, array literal, numeric literal.

**B9 implementation guidance:**

For (1) relational form: introduce a small wrapper or pseudo-expression node. Spec context: the relational predicate IS the validator semantics — `length(>=2)` means "length matches the predicate `>=2`." The semantic is "test `len` against `>=2`." The B9 parser must produce an AST shape that captures both the operator AND the threshold expression, so B10's type-checker and A1c's codegen know what comparison to emit.

Two options for the AST shape:
- **Option A:** dedicated `RelationalPredicateNode { op: ">=" | "<=" | "<" | ">" | "=" | "!=", value: ExprNode }`. Cleanest; new AST kind.
- **Option B:** repurpose `BinaryExpr` with a sentinel left operand. Hacky.

Recommend Option A. Aligns with AST-CONTRACTS' "ExprNode" promise (RelationalPredicateNode is an ExprNode-shaped sibling).

For (2) standard expressions: reuse the existing acorn-based ExprNode parser. `@cell` and `.Variant` are already supported (S66 bare-dot fix in `expression-parser.ts:729-747` is load-bearing here).

### §1.3 [BARE-DOT VARIANT — S66 PARSER FIX IS PRECONDITION] `oneOf([.Admin, .Editor])`

**SPEC §55.1 worked example** (line 24289):
```
oneOf([.Admin, .Editor])
```

**Bare-variant inference (§14.10, M9):** when LHS or param type is statically known, accept `.Variant` without qualification.

**S66 parser fix (`compiler/src/expression-parser.ts:729-747`):** makes `.Variant` parseable as a primary expression in any operator context.

**B9 implementation guidance:** the existing expression-parser already handles bare-dot variants (post-S66). B9 must NOT re-implement. The Phase 0 survey should confirm `expression-parser.parse("[.Admin, .Editor]")` produces a clean ArrayLit with two bare-dot identifier-like nodes.

### §1.4 [CROSS-FIELD `@cell` — V5-STRICT ACCESS PRECONDITION] `eq(@signup.password)`

**SPEC §55.11 worked example** (line 24616):
```
<confirm req eq(@signup.password)>
```

**V5-strict access (§6.1):** `@varname` is canonical reactive-cell access; bare `varname` is local-only.

**B9 implementation guidance:** the @cell form is already parseable by expression-parser (per primer §3 — `@`-prefix path established at A1a). B9 just runs the expression-parser on the raw text; the resulting ExprNode contains an IdentExpr with @-prefix marker.

**B3 resolution NOT in B9 scope.** B9 produces ExprNodes; B10 type-checks; B3 already resolved `@cell` references during SYM PASS-3 (per primer §13.7). The dep tracking (§55.11 reactive recompute) is B10's wiring, NOT B9's.

### §1.5 [WHITESPACE / EMPTY ARGS] Bareword vs zero-arg call

**Subtle case:** `<x req>` (bareword) vs `<x req()>` (call-form, zero args).

**SPEC §55.1 says nothing about `req()`** — the bareword form is the canonical syntax for arg-less predicates. Step 5 parser should distinguish:
- `args: null` → bareword form (no parens at all)
- `args: []` → call-form, empty parens (legal but uncommon)
- `args: ["..."]` → call-form, non-empty

**B9 implementation guidance:** preserve this distinction in the ExprNode conversion. `args: null` stays null. `args: []` becomes `[]` (empty ExprNode array). `args: ["..."]` parses into `ExprNode[]` of length 1+.

This is a Step-5 contract assumption; if Step 5 doesn't preserve the distinction, B9 inherits the ambiguity. Phase-0 survey check.

### §1.6 [SHORT-CIRCUIT IS NOT B9 SCOPE] Order preservation matters

**SPEC §55.12 (short-circuit + composition):** when multiple validators fail, order matches source-code declaration order.

**B9 implementation guidance:** the `validators` array on `state-decl` is already source-order per Step 5 (line 458 doc). B9 transforms each entry's `args` field in place; iteration order is preserved. Short-circuit logic itself is B10/runtime concern, not B9.

### §1.7 [DEPENDENCY GRAPH PRECONDITION] B9 produces ExprNodes that B7's tracker can walk

**B7 SHIPPED state (S67, primer §13.7 B7 specifics):** generic dep-graph machinery in `dependency-graph.ts` walks expression trees collecting reactive cell reads.

**B9 implementation guidance:** ExprNodes produced by B9 must be walkable by B7's dep-tracker. This means: standard ExprNode shapes (already handled), bare-dot variants (S66 fix, already handled), and the new RelationalPredicateNode (option A) — the dep-tracker needs to know to walk RelationalPredicateNode.value as an expression.

**Required B9 deliverable:** if introducing a new AST kind, register it with the dep-tracker walker (likely `forEachIdentInExprNode` in symbol-table.ts) so B7 + B10/B11 dep tracking continue to work transitively through validator-arg expressions.

### §1.8 [B10 INTEGRATION] What B9 hands off to B10

B10 (validator type-checking) is the immediate consumer of B9. B9 produces:
- Per-predicate `args: ExprNode[] | null` correctly shaped.
- Bareword form preserved as `args: null`.
- Relational-predicate forms wrapped in RelationalPredicateNode (or chosen AST shape).
- Standard expressions parsed via existing expression-parser.
- Source spans preserved per ExprNode (for error message localization in B10).

B10 then walks each validator's args, looks up the predicate's type signature, type-checks each arg against the signature, and resolves `@cell` references via B3.

---

## §2 B9 dispatch brief — required additions beyond SCOPE row

When PA writes the B9 dispatch brief, the following MUST be in the brief:

1. **Two sub-grammar regions:** relational-predicate form (`>=N`) AND standard expression form. Cleanly distinguish; suggest Option A (new RelationalPredicateNode AST kind).

2. **Reuse expression-parser for standard ExprNodes** — `@cell` and bare-dot `.Variant` (S66 fix at `expression-parser.ts:729-747`) are already supported. Phase-0 survey confirms.

3. **Preserve `args: null` vs `args: []` distinction** from Step 5 (bareword vs zero-arg call form).

4. **Source span preservation** per ExprNode for B10's error messaging.

5. **Register new AST kind (RelationalPredicateNode) with the IdentExpr walker** so B7's dep-tracker + future B10/B11 walkers continue to traverse validator-arg expressions transitively.

6. **Iteration order preserved** (Step 5 already source-ordered; B9 transforms in place).

7. **B3 resolution NOT in B9 scope.** B9 produces shapes; B3 already resolved `@cell` reads during SYM PASS-3; B10 wires the dep-edges.

8. **Phase-0 survey gate:** confirm (a) Step 5 preserves the `null` vs `[]` distinction for bareword vs zero-arg-call, (b) expression-parser handles all the standard forms (especially `[.Variant, .Variant]` and `@cell.field`), (c) the IdentExpr walker registry is straightforward to extend with RelationalPredicateNode.

## §3 Cost impact

SCOPE estimate: 4-6h.

The work distribution:
- New RelationalPredicateNode AST kind + parser (Option A): ~1.5-2h.
- Standard-expression parsing wrapper (calling existing expression-parser): ~30-60min.
- Bareword/zero-arg-call distinction preservation: ~15-30min.
- IdentExpr walker registration for new AST kind: ~30-60min.
- Tests: ~1.5-2.5h (per-predicate fixtures + roundtrip + dep-walker invariants).
- Phase-0 survey: ~30-60min.

Likely realistic: **4-6h** as estimated. Survey-first per primer §12; depth-of-survey-discount may apply if the relational-predicate parser can ride existing infrastructure.

## §4 Spec follow-up flagged (none)

§55.1 + AST-CONTRACTS §1.1 are internally consistent. No spec rename or amendment needed. The primer §13.7 will get a B9 row on landing, but B9's row is "no AST-decoration; transforms validators[].args in place" — modest entry.

---

## §5 Audit summary

B9 SCOPE row is spec-faithful at the architectural level. Audit surfaces 1 sub-grammar boundary clarification (relational-predicate form vs standard expression form), confirms current code shape vs target, and pre-positions integration with B7's dep-tracker. No substantive drift; the work is well-scoped. Recommend dispatch with 8-point brief addition + Phase-0 survey on Step-5 distinction + expression-parser coverage.

---

## §6 Tags

#a1b-b9 #rule-4-audit #validator-arg-exprnode-conversion #sub-grammar-boundary #relational-predicate-form #s66-bare-dot-fix-precondition #b7-walker-integration #s67
