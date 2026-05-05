# Phase A1a Step 11.0c — Typed-decl recognizer (`<count>: number = 0`)

**Status:** DRAFT — queued for dispatch after 11.0a + 11.0b land. Surfaced by Step 11 smoke test as a deferred parser gap.
**Predecessor:** Step 11 (`bcca1e6`) demonstrated that typed state-decls (`<count>: number = 0`, `<userInfo>: UserInfo = (...)`) fall through to html-fragment.
**Estimate:** 2-3 h focused work. Single-file extension in `compiler/src/ast-builder.js` — `tryParseStructuralDecl` lookahead extension to recognize `>` followed by `:` as the typed-decl shape.
**Authority:** SPEC §6.2 (three RHS shapes) explicitly permits typed annotations; SPEC §5 (Tier 3 typed compound) requires positional sugar via predefined types `<userInfo>: UserInfo = ("alice", 30, true)`. AST-CONTRACTS-AND-DECOMPOSITION §1.1 mentions "type-annotation fields" as preserved on state-decl post-rename.

---

## §1 What lands

`tryParseStructuralDecl` recognizes the typed shape: `<NAME>` followed by `>` followed by `:` followed by a type expression followed by `=` and the RHS.

```scrml
<count>: number = 0                                  // Shape 1 typed
<userInfo>: UserInfo = ("alice", 30, true)           // Tier 3 predefined-shape compound, positional sugar
<phase>: Phase = .Idle                               // Bare-variant inference (M9)
const <doubled>: number = @count * 2                 // Shape 3 typed derived
<name req length(>=2)>: string = <input type="text"/> // Shape 2 typed (validators + render-spec + type)
```

The type annotation must populate a field on the state-decl AST node (e.g., `typeAnnotation: TypeNode | null`). A1b consumes for type-checking; A1c uses for codegen-side runtime predicate (when refinement-type predicates appear).

---

## §2 Scope

### §2.1 In-scope
1. Extend `tryParseStructuralDecl` lookahead at the post-`>` position: if next non-trivia token is `:`, consume; collect a type-expression (possibly delegating to existing type-parser if one exists); expect `=`; then proceed with normal RHS collection.
2. Compatible with all three shapes — Shape 1 typed (RHS expression), Shape 2 typed (RHS markup; type and validators coexist), Shape 3 typed (`const` modifier; RHS expression).
3. Compatible with refinement-type predicates per §53 — `<email>: string(pattern(/.../)) req = <input/>`. The type expression collector must accept refinement predicates as part of the type form. **A1b owns predicate enforcement; A1a's job is just to collect the type form.**
4. Update `compiler/src/types/ast.ts` — `state-decl` type declares `typeAnnotation?: TypeNode | null`.
5. Tests for typed Shapes 1/2/3 + Tier 3 positional-sugar + bare-variant inference + refinement-type-shaped annotations.
6. Flip Step 11's `TODO[step-11.0c]` memorials in `kickstarter-v2-smoke.test.js` from skip to positive.

### §2.2 Out-of-scope
- Type-checking — A1b B20 (bare-variant inference) and B21 (refinement-type three-zone).
- Tier 3 positional-sugar VALIDATION — A1b verifies the positional args match the struct's field order.
- Type-aliased compound (`type UserInfo:struct = {...}`) parsing — separate top-level construct; survey to confirm whether the existing parser handles type definitions.

---

## §3 Survey-first mandate (depth-of-survey discount; **9× confirmed locus**)

Survey questions:
1. Does the existing parser have a type-expression sub-parser? If so, where is it (file:line)? It's likely used today for function-parameter type annotations and `let x: T = ...` typed locals.
2. Does the existing parser handle `<count>: T = 0` form anywhere? Probe a sample like `samples/compilation-tests/typed-decl-shape.scrml` (if one exists) to see if there's a partial pathway.
3. What is the canonical `TypeNode` shape in `compiler/src/types/ast.ts`? Document; the new `typeAnnotation` field references this kind.
4. Refinement-type forms (`string(pattern(/.../))`) — how is the parenthesized predicate-list collected today? Reuse if possible.
5. Tier 3 positional sugar — `<userInfo>: UserInfo = ("alice", 30, true)`. The RHS is a tuple-shaped literal. Confirm the existing RHS collection doesn't already error on tuple form OR that ExprNode supports tuple literal.
6. Bare-variant inference — `<phase>: Phase = .Idle`. The `.Idle` is a member-access on the inferred enum; A1b resolves; A1a just collects.

**You are AUTHORIZED** to correct the touchpoint if survey reveals divergent locus.

Document survey findings in `$WORKTREE_ROOT/docs/changes/phase-a1a-step-11-0c-typed-decl/progress.md` BEFORE source edits.

---

## §4 Test plan

Add to `compiler/tests/integration/parse-shapes-v0next.test.js` or a new fixture file:

- §S11C.1: `<count>: number = 0` — Shape 1 typed; assert `typeAnnotation` non-null with `name === "number"` (or however TypeNode is shaped).
- §S11C.2: `<name>: string = ""` — Shape 1 typed string.
- §S11C.3: `<phase>: Phase = .Idle` — bare-variant inference (M9); assert RHS member-access shape.
- §S11C.4: `<userInfo>: UserInfo = ("alice", 30, true)` — Tier 3 positional; assert tuple-literal RHS.
- §S11C.5: `const <doubled>: number = @count * 2` — Shape 3 typed.
- §S11C.6: `<email>: string(pattern(/^[^@]+@[^@]+$/)) req = <input type="email"/>` — Shape 2 typed with refinement predicate AND validator AND render-spec.
- §S11C.7: regression — untyped decl `<count> = 0` still works (`typeAnnotation` is null/absent).
- §S11C.8: anti-html-fragment guard on every positive case.
- §S11C.9: kickstarter §3 examples — flip the `TODO[step-11.0c]` memorials in `kickstarter-v2-smoke.test.js`.

Aim: ~7-10 new cases + flipped memorials.

---

## §5 Definition of done

1. ✅ `compiler/src/ast-builder.js` `tryParseStructuralDecl` recognizes typed-decl shape.
2. ✅ `compiler/src/types/ast.ts` extended — state-decl `typeAnnotation?: TypeNode | null`.
3. ✅ Refinement-type forms (`string(pattern(...))`) collected without erroring at parse time.
4. ✅ Tier 3 positional sugar (`(arg, arg, arg)`) RHS accepted.
5. ✅ Step 11's `TODO[step-11.0c]` memorials flipped.
6. ✅ ~7-10 new positive cases + regression baselines.
7. ✅ Anti-html-fragment guard on every positive case.
8. ✅ Pre-commit + full `bun run test`: 0 fail, 43 skip, 0 regressions. Delta +7 to +10 pass + memorial flips.
9. ✅ Branch clean. NO `--no-verify`.
10. ✅ progress.md updated.

---

## §6 Branch + commit hygiene

- Per-step branch: `phase-a1a-step-11-0c-typed-decl`, parented from main HEAD at dispatch time.
- WIP commits expected:
  - `WIP(a1a-step-11-0c): survey notes`
  - `WIP(a1a-step-11-0c): typed-decl branch in tryParseStructuralDecl`
  - `WIP(a1a-step-11-0c): refinement-type form acceptance`
  - `WIP(a1a-step-11-0c): types update`
  - `WIP(a1a-step-11-0c): tests`
  - `WIP(a1a-step-11-0c): flip Step 11 TODO[step-11-0c] memorials`
  - Final: `compile(a1a-step-11-0c): typed-decl recognizer`
- After each meaningful step, append timestamped line to `progress.md`.

---

## §7 Risk surface

- **Type-parser reuse vs new mini-parser.** If the existing type-parser is well-factored, reuse is straightforward. If it's coupled to other contexts (function params, local lets), a small adapter may be needed. Survey-first verifies.
- **Refinement-predicate parser collision.** `string(pattern(/.../))` looks structurally similar to a function call. Disambiguator: the predicate-call follows a type identifier in TYPE-position. Should fall out of type-parser correctly.
- **Tuple-literal vs function-call RHS.** `("alice", 30, true)` is a tuple literal in scrml's positional-sugar; might parse as a function-call expression today (acorn would). Survey to verify acorn's behavior — likely produces `SequenceExpression` for `(a, b, c)` which is acceptable as an ExprNode but A1b will need to know it's a tuple per Tier 3 typed shape.
- **`:` ambiguity.** `<x>:T` could conflict with template-literal interpolation `${...:...}` if such syntax exists elsewhere. Likely not — scrml uses `${expr}` for interpolation and `${stmt}` for logic blocks; `:` after `>` in decl-site is unambiguous.

---

## §8 Tags

#phase-a1a #step-11-0c #typed-decl #M9-bare-variant-inference #tier-3-positional #parser-only #step-11-escalation
