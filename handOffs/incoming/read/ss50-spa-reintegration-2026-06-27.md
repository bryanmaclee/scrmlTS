# sPA re-integration — ss50 (legacy expression parse/emit correctness)

**From:** sPA (list `ss50-legacy-expr-parse-emit.md`) · **Date:** 2026-06-27
**Branch:** `spa/ss50` (base local `main` `352d90f6`) · **branch tip = `4490b96a`** (2 commits)
**Disposition:** **2/2 items landed-on-branch.** Run complete. **Clean FF-merge onto current main.**

## TL;DR
Two MED expression-pipeline correctness gaps fixed, both VERIFY-FIRST-confirmed and R26-verified:
- **Item 1** (`2fca8075`) — concise-body arrow `(x) => ?{…}` no longer truncates the `?{}` at
  parse; the SQL survives to codegen (the **ss47 / issue-#12 gating prerequisite**).
- **Item 2** (`4490b96a`) — `emitUnary` now parenthesizes a `**` argument (`-(2**3)` no longer
  ships invalid JS `-2 ** 3`).

Dispatched in PARALLEL (disjoint files: `ast-builder.js` vs `emit-expr.ts`). Full `bun run test`
green on each landing.

## Items
### Item 1 — g-arrow-expr-body-sql-parser-truncate (`2fca8075`, `ast-builder.js` +14/-1)
`collectExpr`'s depth-0 BLOCK_REF statement-break fired on a concise-body arrow, orphaning the
`?{}` as a sibling `sql` node + a dangling `=>` ParseError. Fix: suppress the break when the last
token is `=>` → the `?{}` is captured into the same escape-hatch the block-body form produces.
Block-body byte-identical. R26: expr-body `.all()`/`.run()`/bare/nested/return all fire a clean
single E-SQL-009, `node --check` exit-0, zero raw `?{` leak; sql-in-arrow diagnostic 16/16.

**⚠️ SCOPE CORRECTION — needs your awareness (possible ruling):** my brief carried an
over-specified acceptance bullet ("emitted JS contains the real query"). That is **NOT achievable
by a parse fix and contradicts issue-#12's ratified Option-B** (SQL-in-arrow is FORBIDDEN;
E-SQL-009 is fatal; lowering deferred "well beyond this bug's locus"). The agent correctly
delivered the **actual item-1 scope** — the parse now captures the full `?{}` so the SQL reaches
codegen structurally intact (the prerequisite that **unblocks ss47 / #12's full fix**) — and did
**NOT** implement SQL-in-arrow lowering (that would reverse Option-B). **If ss47 / #12 actually
intends SQL-in-arrow lowering/emission, that is a larger feature reversing ratified design — your
ruling.** As landed, ss50 item 1 is the parse-stage twin only, exactly as the list text framed it
("the parse-stage twin … #12's full fix is gated on this").

### Item 2 — g-unary-of-exponent-arg-no-paren (`4490b96a`, `emit-expr.ts` + new test)
`emitUnary` dropped the parens around a `**` argument → `-(2**3)` shipped invalid JS `-2 ** 3`
(SyntaxError, E-CODEGEN-INVALID-JS class) at compile exit-0. Fix: wrap a `**`-binary argument of a
prefix unary (AST-precedence check, unconditional on operator — all prefix unaries make
`<op> X ** Y` illegal). The ss21 left-operand guard (`(-2)**3`) is left intact (this is the
operand-side sibling). 19-test lock. R26: `-(2**3)`→-8, `~`/`!`/`+`/`typeof`/`void`, chained,
mixed, `(-2)**(-2)` — all exit-0 + correct value; no ss21 regression.

## Verification done (sPA, not just agent self-report)
- VERIFY-FIRST confirmed both bugs (item 1: AST orphan + dangling ParseError; item 2: `-2 ** 3`
  SyntaxError + invalid JS shipped exit-0).
- Reviewed both diffs: item 1 = the minimal `!_lastIsArrowGlyph` guard; item 2 = the `**` wrap with
  the ss21 guard untouched.
- File-set intersection EMPTY (parallel-safe); neither touched the M6.5.b.0 allowlist.
- Each landing ran the full pre-commit suite (my independent re-run): GREEN + gauntlet TodoMVC +
  browser checks. Item-1 agent full `bun run test` 25620/0; item-2 gate 18222/0.

## Re-integration — CLEAN FF
`main...spa/ss50` = `0  2`; `git merge-tree --write-tree main spa/ss50` exit 0 → **FF-merge, no
conflict.** The 2 commits are disjoint (ast-builder.js / emit-expr.ts+test) and main has not
advanced past the base. No reconciliation needed.

## 🔶 Pre-existing gaps surfaced (out-of-scope) — for PA filing
1. **`g-unary-of-additive-arg` (item-2 agent finding) — SILENT miscompile, arguably HIGHER
   severity than item 2.** `emitUnary` also drops parens around a lower-precedence NON-`**`
   additive argument: `-(2 + 3)` → `-2 + 3` (value **1**, should be **-5**); `-(2 - 3)` → `-2 - 3`.
   This ships VALID JS, so it is a **silent wrong-value** miscompile (not the loud invalid-JS class
   item 2 targeted). Multiplicative args are coincidentally correct (negation distributes). Left
   unchanged to stay in `**` scope + avoid a large-blast over-wrap. **Recommend filing + scheduling
   — silent wrong-value is the worst class.**
2. **Ternary-bodied arrow** `(x) => cond ? ?{…} : other` fires **E-ERROR-003** (tokenizer ambiguity
   between ternary `?`, propagation `?`, and SQL `?{`), not E-SQL-009. Pre-existing, distinct
   locus from item 1; the item-1 `=>`-guard correctly does not apply (lastTok at the `?{` is `?`).
3. **`detect-sql-in-arrow.ts` Case A** is now redundant for the concise-direct/return shape (parse
   no longer orphans). Retained as a safety net; optional future cleanup (no double-fire today).

## Cleanup state
- Land worktree removed. Agent worktrees `worktree-agent-ac8fa147c9d2046ba` (item 1, `954a7d16`)
  and `worktree-agent-adfb36aa10cc02deb` (item 2, `31618cb6`) left intact as PA fallbacks —
  remove at re-integration. (Earlier ss43/ss52 agent worktrees may also still be present.)
- Shared checkout (on `main`) NOT advanced / branch-switched by me.

**Branch `spa/ss50` @ `4490b96a` is ready for re-integration (clean FF; both items disjoint).**
