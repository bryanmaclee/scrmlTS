# Phase A1a Step 10 — Expression parser: MemberCall / MemberAssignment / UnaryDelete shape verification

**Status:** DRAFT — queued for dispatch after Step 9.
**Predecessor:** Steps 1-9 land the new lex/parse forms. Step 10 verifies that mutation-shape AST nodes survive v0.next changes intact, since A1b uses them to fire L21 (`E-DERIVED-VALUE-MUTATE`).
**Estimate:** 1-2 h focused work. Single-file (`expression-parser.ts` or equivalent), narrow surface.
**Authority:** SPEC §6.6.18 (E-DERIVED-VALUE-MUTATE; L21). AST contract: `docs/changes/phase-a1a-lex-parse/AST-CONTRACTS-AND-DECOMPOSITION.md` §1.5.

---

## §1 What lands

L21 forbids in-place mutation of `const`-derived cells. A1b is the enforcement site, but A1b can only fire the error if the AST distinguishes:

- **`MemberCall`** — `@arr.push(x)`, `@obj.foo()` (a method call on a member-access target).
- **`MemberAssignment`** — `@obj.foo = x`, `@arr[i] = x`, `@arr.length = 0`. Compound-assignment forms also count: `@obj.count += 1`, `@arr[i] *= 2`. The compound-op text MUST be carried in an `op` field for A1b to discriminate (`=` vs `+=` vs `*=` etc.).
- **`UnaryDelete`** — `delete @obj.foo`, `delete @arr[i]`.

Step 10 verifies each AST kind exists, has the field shape A1b needs, and parses correctly. If any are collapsed into a generic node (e.g., `MemberAssignment` is just `Assignment` with no special tag), Step 10 splits or annotates.

---

## §2 Scope

### §2.1 In-scope
1. Survey the expression parser to find out current AST shape for each of the three patterns.
2. For each, verify the kind discriminator exists and document it. If missing or collapsed, split.
3. Confirm `MemberAssignment` carries `op: string` (`"="`, `"+="`, `"-="`, `"*="`, `"/="`, `"%="`, `"**="`, `"&&="`, `"||="`, `"??="`, etc.). If not, ADD the field.
4. Update `types/ast.ts` accordingly.
5. Tests: parse fixtures producing each shape; assert AST kinds + `op` field. NO semantic enforcement (that's A1b).

### §2.2 Out-of-scope
- L21 firing — A1b.
- Codegen unchanged.
- Method-call vs property-call distinction beyond what A1b needs.

---

## §3 Survey-first mandate

This step is HIGH risk for "no work needed" (existing parser may already produce all three shapes correctly) — apply the depth-of-survey discount aggressively. If survey reveals all three kinds are already present and correctly shaped, this becomes a 30-min "verify + add tests" pass instead of a 1-2h split.

Survey questions:
1. Does `@arr.push(x)` produce `kind: "MemberCall"` (or equivalent identified shape)? File:line of construction.
2. Does `@obj.foo = x` produce `kind: "MemberAssignment"` distinct from a generic `Assignment`? Does it carry `op`?
3. Does `@obj.foo += 1` produce `kind: "MemberAssignment"` with `op: "+="`? Or a separate `CompoundMemberAssignment` kind? Or collapsed?
4. Does `delete @obj.foo` produce `kind: "UnaryDelete"`? Or generic `UnaryExpression` with `operator: "delete"`?
5. What does A1b's L21 check look like in the current SPEC text (§6.6.18)? Confirm the AST shapes A1b expects.

Document. If parser already produces correct shapes, the dispatch is verification + tests only.

---

## §4 Test plan

Add to `compiler/tests/integration/parse-mutation-shapes.test.js` (new file).

- §M10.1: `@arr.push(1)` → MemberCall (or whatever survey confirms).
- §M10.2: `@obj.foo = 1` → MemberAssignment with `op: "="`.
- §M10.3: `@obj.foo += 1` → MemberAssignment with `op: "+="`.
- §M10.4: `@arr[0] = "x"` → MemberAssignment computed property (`computed: true` if applicable).
- §M10.5: `@arr.length = 0` → MemberAssignment with method-side semantics; A1b will fire L21 on this one.
- §M10.6: `delete @obj.foo` → UnaryDelete (or equivalent).
- §M10.7: Compound chained: `@form.errors.push(@form.errors.length)` — nested member shapes.
- §M10.8: Negative — bare-name `arr.push(1)` (no `@`) — should NOT trigger MemberCall/State semantics; treat as plain JS.

Aim: ~6-10 new cases.

---

## §5 Definition of done

1. ✅ AST node kinds for `MemberCall`, `MemberAssignment` (with `op`), `UnaryDelete` exist and are correctly produced by the parser.
2. ✅ `types/ast.ts` reflects each shape including `op` on MemberAssignment.
3. ✅ Tests per §4.
4. ✅ Pre-commit + full `bun run test`: 0 fail, 43 skip, 0 regressions. Delta +6 to +10 pass.
5. ✅ Branch clean. NO `--no-verify`.

---

## §6 Branch

`phase-a1a-step-10-mutation-shapes`.

---

## §7 Tags

#phase-a1a #step-10 #mutation-shapes #L21-precursor #expression-parser
