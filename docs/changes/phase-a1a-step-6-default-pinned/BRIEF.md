# Phase A1a Step 6 — Parser: `default=` attr + `pinned` bareword on state-decl

**Status:** DRAFT — S60 dispatch.
**Predecessor:** Steps 1, 2, 3, 4, 5, 8 done. Baseline at dispatch: scrmlTS HEAD `4ee360f`, tests **8,784 / 43 / 0 / 8,827 / 435**.
**Estimate:** 1-1.5 h focused work. Single-file extension in `ast-builder.js`.
**Authority:** `compiler/SPEC.md` §6.8 (`default=` attribute), §6.6 (derived) — `default=` legal on Shapes 1 + 2 + 3. `pinned` bareword recognized on state-decls (forward-ref intent; A1b enforcement). AST contract: `docs/changes/phase-a1a-lex-parse/AST-CONTRACTS-AND-DECOMPOSITION.md` §1.1 (fields `defaultExpr` and `pinned`).

---

## §1 What lands

Extend `tryParseStructuralDecl` in `compiler/src/ast-builder.js` to populate two NEW fields on `state-decl` nodes:

| Field | Type | Set when | Default if absent |
|---|---|---|---|
| `defaultExpr` | `ExprNode \| null` | `default=<expr>` attribute appears between `<NAME>` and `>` | `null` |
| `pinned` | `boolean` | `pinned` bareword appears between `<NAME>` and `>` | `false` |

Both fields ride on Shapes 1, 2, and 3 (i.e., on every state-decl node Step 4 + Step 5 produce via `tryParseStructuralDecl`). Existing 16 legacy `@`-form construction sites (lines 3137-5095) are NOT touched in Step 6 — `@`-form decls do not have the attribute-list surface. `defaultExpr`/`pinned` are simply absent (or undefined) on those nodes.

A1b consumes `defaultExpr` for `reset(@cell)` lowering. A1b consumes `pinned` for forward-ref legality (`E-STATE-PINNED-FORWARD-REF` family). A1c uses both for codegen (default-init ordering, hoisting). Step 6 is parser-only — no semantic enforcement, no codegen.

---

## §2 Scope

### §2.1 In-scope

1. Extend the bareword/call-form attribute scan (added Step 5) to recognize `default=` as a special-cased attribute with EXPR-form RHS, populating `defaultExpr`.
2. Extend the same scan to recognize `pinned` bareword, setting `pinned: true`.
3. Extend `compiler/src/types/ast.ts` `state-decl` type to declare both fields.
4. New unit/integration tests asserting both fields parse correctly across all three shapes.
5. Update progress.md cumulative log.
6. Final commit `WIP(a1a-step-6): default= + pinned on state-decl` then a final wrap commit.

### §2.2 Out-of-scope

- A1b enforcement of `default=` consistency (e.g., default-expr type-matches the cell type).
- `pinned` on import items — that's **Step 7**, separate dispatch.
- `reset(@cell)` keyword recognition — that's **Step 9**.
- Codegen lowering — A1c.
- Validator-args ExprNode conversion (Step 5 deferral; A1b owns).

### §2.3 Dependency on Step 5's attribute scanner

Step 5 added bareword/call-form attribute-scan logic between `<NAME>` and `>`. Survey FIRST: locate the attr-scan loop. Step 6 extends that loop in two places:
- A new branch when the IDENT is `default` AND next is `=` — collect EXPR-form RHS (similar to how a generic `name=value` markup attribute is parsed; reuse existing `_parseLiftAttrValue` if applicable, OR a new mini expression-collector).
- A new branch when the IDENT is `pinned` AND it's bareword (no `=`, no `(...)`) — set `pinned: true`.
- The existing branch (bareword IDENT or `IDENT(args...)`) continues to populate `validators[]`.

`default` and `pinned` MUST NOT also appear in `validators[]` — they are state-decl modifiers, not validators. Survey will confirm whether the existing scan would otherwise capture them as validators (it almost certainly will, given Step 5's bareword path).

---

## §3 Survey-first mandate (depth-of-survey discount, 4 occurrences)

PA-SCRML-PRIMER §12 + design-insights "Depth-of-survey discount" entry are mandatory reading. Brief-locus hint: the Step 5 attr-scan helper inside `tryParseStructuralDecl`. **Verify before extending.** If survey reveals the brief is wrong about the touchpoint, correct it — authorization to override the named locus when survey contradicts is granted upfront.

Specific survey questions:
1. What does the Step 5 attr-scan loop look like today (file:line range)?
2. Does the loop already produce a per-attribute record `{name, args, span}` that just needs new branches for `default`/`pinned`? Or is it monolithic?
3. How does the loop tokenize `default=<expr>`? Step 5 was call-form `name(args)`; `default=` is `name=expr`. Probably a new branch shape entirely.
4. Are there ALREADY any sites where `default=` or `pinned` appear in tests/samples that would surface a regression if Step 6 mis-handles them? Survey samples + tests.

Document survey findings in progress.md before code edits.

---

## §4 Test plan

Add to `compiler/tests/integration/parse-shapes-v0next.test.js` (the file Step 4 + Step 5 extended):

**Shape 1 + default=:**
- §S6.1: `<startTime default=null> = Date.now()` — assert `shape:"plain"`, `defaultExpr` is non-null ExprNode, `pinned:false`.

**Shape 2 + default= + validator:**
- §S6.2: `<email req default="">` (markup RHS as in Step 5) — assert `defaultExpr` non-null literal `""`, validators contain `req`, `pinned:false`.

**Shape 3 + pinned:**
- §S6.3: `const <doubled pinned> = @count * 2` — assert `shape:"derived"`, `pinned:true`, `defaultExpr:null`.

**Both default= and pinned:**
- §S6.4: `<x pinned default=0> = @upstream` — assert `defaultExpr` non-null, `pinned:true`.

**Multiple validators alongside default= + pinned:**
- §S6.5: `<name req length(>=2) default="" pinned> = <input/>` — assert validators has `req` + `length(>=2)`, `defaultExpr` literal `""`, `pinned:true`. Critically: `default` and `pinned` MUST NOT appear in validators[] — assert validators.length === 2 + names check.

**No default=, no pinned (regression):**
- §S6.6: `<count> = 0` — assert `defaultExpr:null` (or absent), `pinned:false` (or absent). Confirm Step 4/5 baselines unchanged.

**Anti-html-fragment guard** on every positive test (per Step 4/5 invariant).

**Discriminant invariant test extension:** the `§S4.10` battery in parse-shapes-v0next.test.js already asserts state-decl shape consistency. Extend to also assert `typeof pinned === "boolean"` AND `defaultExpr === null || (defaultExpr && typeof defaultExpr === "object")` for every state-decl node.

Aim: ~6-10 new cases.

---

## §5 Definition of done

1. ✅ `compiler/src/ast-builder.js` modified — `tryParseStructuralDecl` attr scan recognizes `default=expr` and `pinned` bareword.
2. ✅ `compiler/src/types/ast.ts` extended — state-decl type declares `defaultExpr?: ExprNode | null` and `pinned?: boolean`.
3. ✅ Self-host parity: `compiler/self-host/ast.scrml` mirrored if it has matching state-decl construction (Step 4 had 4 sites; Step 5 had zero — survey will confirm).
4. ✅ `parse-shapes-v0next.test.js` extended with ~6-10 new cases per §4.
5. ✅ §S4.10 discriminant invariant test extended to cover new fields.
6. ✅ Pre-commit hook green: `bun test` (browser-excluded subset) passes.
7. ✅ Full `bun run test`: ≥8,790 pass (delta +6 to +10), 0 fail, 43 skip, 0 regressions on existing 8,784.
8. ✅ Branch clean. No `--no-verify`.
9. ✅ progress.md updated with cumulative Step 6 log.
10. ✅ Final commit on per-step branch ready for PA cherry-pick to main.

---

## §6 Branch + commit hygiene

- Per-step branch: `phase-a1a-step-6-default-pinned`, parented from main HEAD `4ee360f`.
- Commit early/often per global rule: `WIP(a1a-step-6): survey notes`, `WIP(a1a-step-6): default= attribute scan`, `WIP(a1a-step-6): pinned bareword scan`, `WIP(a1a-step-6): tests`, then a final clean commit `compile(a1a-step-6): default= + pinned on state-decl`.
- Update `docs/changes/phase-a1a-step-6-default-pinned/progress.md` after each step.
- Final hand-off: when branch lands clean + tests green, surface the branch SHA + test delta for PA cherry-pick.

---

## §7 S59 lessons applied

- **Depth-of-survey discount (4×)**: survey-first is mandatory. If touchpoint is wrong, correct it.
- **Path-discipline leak (Step 5 leaked progress.md to main's working tree)**: be ruthless about WORKTREE_ROOT-rooted absolute paths on every Write/Edit. Re-run `pwd` / `git rev-parse --show-toplevel` between batches if any doubt.
- **Anti-html-fragment guard**: non-negotiable on every Shape-1/2/3 positive test.
- **Brief-locus authorization**: agent has authority to correct the named touchpoint when survey contradicts.

---

## §8 Tags

#phase-a1a #step-6 #default-attr #pinned-modifier #state-decl #parser-only
