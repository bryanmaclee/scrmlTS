# Phase A1a Step 9 — Expression parser: `reset(@cell)` keyword + `E-RESET-NO-ARG`

**Status:** DRAFT — queued for dispatch after Step 6+7 land.
**Predecessor:** Step 1 reserved `reset` as a KEYWORD in `tokenizer.ts` (`9cd7779`). Step 9 wires the parser side: when the `reset` keyword token appears in expression position, parse the `reset(@cell)` form and emit `kind: "reset-expr"`.
**Estimate:** 1-2 h focused work. Single-file extension in `compiler/src/expression-parser.ts` (or wherever the expression-parser lives — survey).
**Authority:** SPEC §6.8 (`reset(@cell)` keyword, γ semantics + `default=` interaction), L18 (supersedes earlier L10 `reset()` form). AST contract: `docs/changes/phase-a1a-lex-parse/AST-CONTRACTS-AND-DECOMPOSITION.md` §1.3 (`kind: "reset-expr"`). SPEC §34 — error code `E-RESET-NO-ARG` (NEW, must be added if not present).

---

## §1 What lands

When the parser encounters the `reset` keyword token in expression position, parse:

```
reset ( <expr> )
```

Emit AST node:
```js
{ kind: "reset-expr", target: <ExprNode>, span }
```

`<expr>` is a single ExprNode — A1b validates that it shapes as `@cell` or `@compound.field` (E-RESET-INVALID-TARGET family). Step 9 only enforces:
- `(` MUST follow `reset`.
- Exactly one expression argument.
- `)` MUST close.
- Zero-arg form `reset()` fires `E-RESET-NO-ARG` at parse time.
- Multi-arg form `reset(a, b)` is `E-RESET-ARITY` (or reuse `E-RESET-NO-ARG` with adjusted message — survey SPEC §34 for whether a separate code already exists).

---

## §2 Scope

### §2.1 In-scope
1. Locate the expression-parser primary-expression dispatch in `compiler/src/expression-parser.ts` (or `ast-builder.js` if that's where expression nodes are built).
2. Add a branch: when current token is KEYWORD `reset`, consume; expect `(`; collect one expr; expect `)`; emit `reset-expr` node.
3. Emit `E-RESET-NO-ARG` on `reset()` (zero args). Decide whether `reset(a, b, ...)` is an additional error (likely yes; new code or reuse).
4. Add SPEC §34 entry for `E-RESET-NO-ARG` if missing.
5. Tests covering positive, negative, and shape cases.

### §2.2 Out-of-scope
- A1b: target validity (`@cell` shape vs arbitrary expression). Step 9 accepts any ExprNode and lets A1b reject non-canonical forms.
- A1c: codegen lowering of `reset(@cell)` to runtime call (the `default=` integration is A1c).
- Multi-target / batch reset — not in spec.

---

## §3 Survey-first mandate

1. Confirm `reset` is a KEYWORD post Step 1 (verify `tokenizer.ts` line ~71 still has it).
2. Locate expression-parser primary-expression dispatcher. Document file:line.
3. Confirm: today, what happens if a user writes `reset(@x)`? Almost certainly a parse error or a function-call to bare-ident `reset` (which post-Step-1 should fail E-RESERVED-IDENTIFIER). Survey confirms current behavior.
4. Survey for any existing `reset-expr` skeleton (e.g., a stub from S58 or earlier doctrine work). If present, note state.
5. Check SPEC §34 for `E-RESET-NO-ARG` — if absent, the dispatch must add it.

Document survey findings in progress.md.

---

## §4 Test plan

Add to a new file `compiler/tests/integration/parse-reset-keyword.test.js`.

- §R9.1: `reset(@count)` inside a `${...}` block — parses to `reset-expr` with `target.kind === "MemberAccess"` (or however `@count` parses) referencing `count`.
- §R9.2: `reset(@form.email)` — compound target; assert nested member access on target.
- §R9.3: `reset()` — fires `E-RESET-NO-ARG` at parse time. Assert error code present in diagnostics.
- §R9.4: `reset(a, b)` — fires `E-RESET-ARITY` (or reused code). Assert error.
- §R9.5: `reset` appearing at decl-site is the OLD test for E-RESERVED-IDENTIFIER (Step 8 already covered this). Smoke-test that Step 9 doesn't regress it.
- §R9.6: `reset(@count + 1)` — accepts ANY ExprNode at parse time; A1b later rejects non-`@cell` shapes. Assert parse-clean (no error at parse time).

Aim: ~6-8 new cases.

---

## §5 Definition of done

1. ✅ Expression-parser modified — `reset` keyword recognized, emits `reset-expr` node.
2. ✅ `compiler/src/types/ast.ts` extended — `reset-expr` kind declared.
3. ✅ SPEC §34 — `E-RESET-NO-ARG` added if absent. Verify exact wording.
4. ✅ Tests added per §4.
5. ✅ Pre-commit + full `bun run test`: 0 fail, 43 skip, 0 regressions. Delta +6 to +8 pass.
6. ✅ Branch clean. NO `--no-verify`.

---

## §6 Branch

`phase-a1a-step-9-reset-keyword`.

---

## §7 Tags

#phase-a1a #step-9 #reset-keyword #expression-parser #E-RESET-NO-ARG
