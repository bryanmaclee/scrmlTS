# A1b Step B20 — Phase 0 Survey

**Date:** 2026-05-07
**Worktree:** `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-adf572e6b1297bb85`
**Brief:** `docs/changes/phase-a1b-step-b20-bare-variant-inference/BRIEF.md`
**Spec authority:** SPEC §14.10 (line 7149-7183), §18.0.3, §51.0.B, §34 catalog row line 14233.

---

## §0.1 Goal restatement

When a bare-variant reference `.Variant` appears in expression position and the position's type
is statically a `T:enum`, the compiler MUST resolve `.Variant` against `T`'s declared variants:
- variant exists in `T` → accept (no diagnostic).
- variant does NOT exist in `T` → fire `E-TYPE-063` (existing code; unknown-variant family).
- position type is a UNION with multiple enum members declaring the same variant name → fire
  `E-VARIANT-AMBIGUOUS`.
- position has NO type context (e.g., `let x = .Small` no annotation) → fire `E-VARIANT-AMBIGUOUS`
  (per §14.10 line 7173-7174).

The fully-qualified form `MarioState.Small` / `MarioState::Small` remains legal everywhere bare
variants are legal (§14.10 line 7175).

---

## §0.2 AST shape of bare-variant references — FINDING

S66 parser fix (commit `cb167b1`, primer §13.8) makes `.Variant` parseable as a primary expression
**everywhere** — operator contexts, call args, ternary branches, return values, array elements,
object-literal values, etc.

The parsing strategy: `expression-parser.ts` line 729-753 preprocesses `.Variant` into a
placeholder identifier `__scrml_bare_variant_Variant__` so acorn can parse the surrounding
expression. Then `esTreeToExprNode` line 896-906 unmasks the placeholder back to:

```
IdentExpr { kind: "ident", name: ".Variant", span }
```

That is, the bare-variant AST node is an `IdentExpr` whose `name` field carries the **leading dot**
(`.Variant`, not `Variant`). This is the canonical form B20 will recognize.

**Consequence for B20:** B20 does NOT re-implement parsing. It walks already-built ExprNodes
and identifies `IdentExpr` nodes whose name starts with `.` followed by an uppercase variant.

---

## §0.3 Existing handling of bare-variant idents in type-system.ts — FINDING

Today, `checkLogicExprIdents` (type-system.ts:2923) walks every IdentExpr to surface E-SCOPE-001 on
undeclared idents. For `.Variant`:

```
const raw = ident.name;            // ".Variant"
const base = raw.includes(".") ? raw.slice(0, raw.indexOf(".")) : raw;  // "" (slice 0..0)
if (!base) return;                 // ← SILENTLY SKIPPED
```

So bare-variant idents are currently **silently passed through** scope checking. They produce no
diagnostic and no resolution. B20 introduces the resolution + diagnostic.

The walker `forEachIdentInExprNode` (expression-parser.ts:2200) already descends into every ExprNode
shape (binary, ternary, array, object, member, assign, return, call args). B20 reuses it.

---

## §0.4 Existing E-VARIANT-AMBIGUOUS fire path — FINDING

`grep -rn "VARIANT-AMBIGUOUS\|VARIANT_AMBIGUOUS" compiler/src/` returns **zero hits**. The error code
is documented in SPEC §34 (line 14233) and §18.0.3 prose, but **NOT implemented anywhere yet**.

Therefore B20 is **net-new** for both:
- the §14.10 expression-position fire-sites (positions 1-4, plus partial coverage of 5-6 below);
- the §18.0.3 match-arm fire-site (currently delegated to checkExhaustiveness which silently
  records pattern variants without union-shadow checking).

**Decision:** B20 fires E-VARIANT-AMBIGUOUS **only at §14.10 expression positions** (the BRIEF's
explicit scope per §"OUT OF SCOPE"). The §18.0.3 match-arm fire-site is left for a future step —
this is consistent with the BRIEF's "OUT OF SCOPE for B20" §1 ("§18.0.3 match-arm pattern
bare-variants — that's `<match>` parser + match-arm typer territory; if existing fire-site
lives there, leave it"). Phase 0 confirms no existing fire-site lives there.

---

## §0.5 Six inference positions — coverage matrix

| # | Position | Today's status | B20 work |
|---|---|---|---|
| 1 | LHS type annotation `<x>: T = .V` (state-decl) | `state-decl` case (TS line 4102) resolves `typeAnnotation` → `resolvedType`. Bare-variant in `initExpr` is silently skipped. | **NET-NEW.** B20 walks `initExpr` for bare-variant idents using the LHS annotation type. |
| 2 | Previously-declared cell `@cell = .V` (where `@cell: T`) | The reactive assignment surface for `@cell = .V` (after declaration) currently parses as `bare-expr` containing an `assign` ExprNode, OR via `reactive-nested-assign` for compound-nav. The state-decl case binds `@cell`'s type into scopeChain (line 4165). | **NET-NEW.** B20 walks bare-expr / reactive-nested-assign value expressions and infers the bare-variant type from the assignment target's resolved type. |
| 3 | Function param type `fn(.V)` (call arg) | `FunctionType.params` is `unknown[]` (line 189) — function param types are NOT recorded today. Param annotations are read at function-decl walk for the body's scope but not stored in the function's resolved type. | **NEEDS UPGRADE.** Either (a) record param types on FunctionType + propagate at call sites, or (b) defer (since this is a more invasive refactor). **DECISION:** Defer position 3 to a follow-up step (B20.b or A1c) — record finding in DEFERRED_ITEMS. |
| 4 | Function return type `return .V` | `return-stmt` case (line 4768) walks `exprNode` via `checkLogicExprIdents` only for E-SCOPE-001. Return-type info is NOT propagated to bare-variant positions. The function-decl carries `hasReturnType: true` but no return-type annotation is captured at the AST level (only param annotations are). | **NEEDS DEEPER INFRA.** Like position 3, return-type propagation would need either AST-level capture of return types or function-signature lookup. **DECISION:** Defer position 4 to a follow-up step alongside 3 — same rationale. |
| 5 | Match `for=T` arm patterns | `parseArmPattern` (line 5570) recognizes `.Variant` in arm head and `extractArmsFromMatchNode` (line 5634) populates `armPatterns`. `checkMatchDiagnostics` (line 5742) resolves subject type and runs exhaustiveness. **However**, no per-arm "is this variant valid in the subject type" check fires. Existing E-TYPE-063 fires only via `is .Variant` operator, not match-arm. | **PARTIAL.** Position 5 is functionally already handled for exhaustiveness. The "ambiguous union" check is the explicit B20 ask, but the BRIEF's OUT-OF-SCOPE §1 leaves §18.0.3 to a future step. **DECISION:** Skip position 5 in B20 (covered by exhaustiveness today; ambiguity check deferred). |
| 6 | Engine `for=T initial=.V` | B15 (`symbol-table.ts:4247-4267`) validates `initial=.V` against the enum's variants and fires `E-ENGINE-INITIAL-INVALID-VARIANT` for unknown variants and `W-ENGINE-INITIAL-MISSING` when absent. | **ALREADY COVERED** by B15. B20 does not regress; B15's surface is preserved. |

**Per BRIEF §"OUT OF SCOPE":** §18.0.3 match-arm + B14/B15 engine work are explicitly excluded. Per §14.10 line 7172 the open-ended "any other position" wording is surfaced as a SPEC-PROSE FOLLOW-UP — Phase 0 didn't find inference positions beyond the six in source today.

**B20's actual implementation focus:**
- **Position 1** (LHS state-decl annotation) — NET-NEW.
- **Position 2** (previously-typed cell assignment) — NET-NEW.
- **Position 1b** (LHS let/const-decl annotation) — analogous to position 1; same walker.

Positions 3, 4 require deeper infra (param/return type propagation through FunctionType.params and return-type capture). **They are DEFERRED** (per Rule 3 — surface ambiguity rather than ship a half-done propagation that leaks). A follow-up dispatch B20.b would land them after the A1c codegen step crystallises the function-signature shape.

---

## §0.6 Type lookup utility — FINDING

`buildTypeRegistry` (line 1743) creates a `Map<string, ResolvedType>` from `type-decl` nodes. Each
enum entry is a `EnumType { kind: "enum", name, variants: VariantDef[], ... }`. The variant lookup
for B20 is straightforward:

```
const enumType = position-type-from-context (an EnumType);
const has = enumType.variants.some(v => v.name === bareVariantName);
```

For union types: `members.filter(m => m.kind === "enum")` then check each enum's variants.
The "shared variant" ambiguity test:

```
const enumMembers = unionType.members.filter(m => m.kind === "enum");
const declarers = enumMembers.filter(em => em.variants.some(v => v.name === target));
if (declarers.length > 1) FIRE E-VARIANT-AMBIGUOUS
```

---

## §0.7 `::` qualifier interchangeability — FINDING

§14.10 line 7176 says `MarioState.Small`, `MarioState::Small`, and bare `.Small` are interchangeable
when the type is statically known. The `::` form is parsed by other passes (search for `::` parse
handling). For B20: only the bare-dot form (IdentExpr with name starting `.`) is the new code
path; `MarioState.Small` (MemberExpr with object=Ident(MarioState), property="Small") and
`MarioState::Small` are pre-existing parses that are not affected by B20.

---

## §0.8 Existing bare-variant tests — FINDING

`compiler/tests/unit/parse-variant.test.js` exercises **`parseVariant("input", T)`** runtime parsing
(§41.13), NOT the M9 inference subject. `if-is-variant.test.js` covers the `is .Variant` operator
form (§42 / `__scrml_is_variant__` rewrite), already wired through `checkIsExpressions` (line 5260).

No tests exist today for §14.10 LHS-driven bare-variant inference. B20 adds them.

---

## §0.9 Walker placement decision — FINDING

Per BRIEF §5: B20 fires at **type-system pass time** (the canonical typer that already walks
expressions). The locus is `type-system.ts:annotateNodes` — specifically the `state-decl`,
`let-decl`/`const-decl`, and `bare-expr` (assignment) cases. A new helper `checkBareVariantsInExpr`
sits alongside `checkLogicExprIdents` and is invoked with the LHS-derived type context.

This avoids creating a new SYM PASS (which would lack populated type info) and reuses the
ExprNode walker `forEachIdentInExprNode`.

---

## §0.10 Diagnostic message draft

For union-with-shared-variants:
> `E-VARIANT-AMBIGUOUS: Bare variant \`.Small\` is ambiguous in union-typed context (\`MarioState | HealthRisk\`). Multiple union members declare \`.Small\`: \`MarioState\`, \`HealthRisk\`. Qualify the variant — write \`MarioState.Small\` or \`HealthRisk.Small\`.`

For no-type-context:
> `E-VARIANT-AMBIGUOUS: Bare variant \`.Small\` has no type context. Add a type annotation (\`<x>: SomeEnum = .Small\`) or qualify the variant (\`SomeEnum.Small\`).`

For unknown-variant in a known enum (already exists):
- Reuse `E-TYPE-063: \`.Variant\` is not a declared variant of enum \`T\`. Known variants: ...`

---

## §0.11 SPEC-PROSE follow-ups — Rule-4 findings

1. **§34 catalog row at line 14233 cites only §18.0.3.** Per §14.10 line 7183, E-VARIANT-AMBIGUOUS
   is also the §14.10 error code. **Recommendation:** amend §34 catalog row to cite both §14.10
   AND §18.0.3 (precedent: B22 added §6.8.2 to E-RESET-INVALID-TARGET).

2. **§14.10 line 7172 closes with "or any other position where the type is fixed by the
   surrounding declaration".** Open-ended phrasing. Phase 0 did not find inference positions
   beyond the six listed. The phrase is a forward-compat hedge. No prose change needed for now;
   surface as Rule-3 ambiguity in PA review.

3. **Positions 3 (param) and 4 (return) require deeper infra.** Defer to B20.b. SCOPE row B20
   (in `phase-a1b-resolve-type/SCOPE-AND-DECOMPOSITION.md`) should note this split.

---

## §0.12 Implementation plan — final

**File touched:** `compiler/src/type-system.ts` only.

**New code:**
1. Helper `inferBareVariantsInExpr(exprNode, contextType, span, typeRegistry, errors)` — walks the
   ExprNode tree, finds every `IdentExpr` whose `name.startsWith(".")` and a following uppercase
   first letter, and:
   - if `contextType` is an `EnumType`: validate variant exists; fire `E-TYPE-063` if not.
   - if `contextType` is a `UnionType` with multiple enum members declaring the variant: fire
     `E-VARIANT-AMBIGUOUS` (union-shared).
   - if `contextType` is `null`/`asIs`/`unknown`: fire `E-VARIANT-AMBIGUOUS` (no type context).
   - if `contextType` is a single enum within a union: validate against that enum's variants.
2. Wire into `state-decl` case (position 1, M9 reactive form `<x>: T = .V`):
   - After resolving `resolvedType` from the annotation/state-type-registry/machine, if the
     resolved type is enum (or union-with-enum), invoke `inferBareVariantsInExpr` with the
     `initExpr`.
3. Wire into `let-decl` / `const-decl` case (position 1b, plain let with annotation):
   - Same as above, after type resolution.
4. Wire into `reactive-nested-assign` (`@compound.field = .V`) — the assignment target type is
   looked up via the compound's structural shape. **DEFERRED** to a follow-up: compound-nav type
   resolution is not trivially available in current code path. Note in DEFERRED_ITEMS.
5. **Position 2** (`@cell = .V` after-the-fact assignment, which parses as `bare-expr` containing
   `AssignExpr`): walk the `bare-expr` exprNode for `AssignExpr` shape, look up target's type, and
   invoke the helper on `value`. This is the fire-site for "previously-declared cell".

**Tests:** new unit test file `compiler/tests/unit/bare-variant-inference-b20.test.js` exercising
positions 1, 1b, 2 + ambiguity (union-shared) + no-context + unknown-variant in known enum.

---

## §0.13 Risk register

| Risk | Severity | Mitigation |
|---|---|---|
| Walking `IdentExpr` with name starting `.` may hit unintended matches (e.g., `..foo` private fields) | LOW | scrml has no `..foo` private syntax; the placeholder unmask only produces `.Variant` (uppercase first letter required by regex `[A-Z][A-Za-z0-9_]*`) |
| Existing tests that use bare variants in untyped contexts may regress (e.g., escape-hatch corpus) | MEDIUM | Phase 0 search showed only `parse-variant.test.js` tests + `if-is-variant.test.js` test the `is` form. New code only fires when contextType is non-null OR explicitly no-context with known intent. Conservative: fire only at fully-typed positions; silent on `asIs`/`unknown` for now |
| `let x = .Small` (no annotation) — should fire E-VARIANT-AMBIGUOUS per §14.10 line 7174 | EXPECTED | Test for this; must fire |
| Compound-nav `@compound.field = .V` — type lookup non-trivial | DEFERRED | Note in DEFERRED_ITEMS, point to follow-up |
| Union-typed assignment target where one member is enum and another is primitive | EDGE | Treat as "single enum context" if exactly one enum member declares the variant; ambiguous if multiple |

End of survey.
