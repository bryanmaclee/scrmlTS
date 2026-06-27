# ss50 item 1 — g-arrow-expr-body-sql-parser-truncate — DEV BRIEF

**Dispatched:** sPA ss50, 2026-06-27 · agent `scrml-js-codegen-engineer`, isolation:worktree, opus.
**Branch base:** local `main` `7ab86083` (includes ss52 + ss49). **MED · VERIFY-FIRST · gates #12 (ss47).**
**Change-id:** `g-arrow-expr-body-sql-truncate-2026-06-27`.
**⚠️ PARALLEL-SAFETY:** an ss50 sibling agent is fixing item 2 in `compiler/src/codegen/emit-expr.ts`
(`emitUnary`). **Your fix is PARSER-stage — stay in `ast-builder.js` / `expression-parser.ts`. Do
NOT touch `emit-expr.ts`.** If you believe you need an emit-expr.ts change, STOP and report instead.

## The bug
An expression-body arrow `(x) => ?{ SELECT … }` **truncates the `?{}` SQL block at the PARSER** —
the SQL is destroyed before codegen. (Distinct from ss47's codegen half `E-CODEGEN-INVALID-JS`;
this is the parse-stage twin.) The block-body form `(x) => { return ?{…} }` works; the
**expression-body** form (no braces) is the gap. Surfaced ss19 (#12-adjacent). #12's full fix
(ss47) is GATED on this parse fix.

## Footprint (sPA scope — VERIFY-FIRST confirms exact locus)
- **`?{}` masking:** `compiler/src/expression-parser.ts` — `replaceSqlBlockPlaceholder` (~195–308)
  masks a balanced `?{ … }` into `__scrml_sql_placeholder__` (bracket-matched, template-literal
  aware); unmask at ~1887–1888 (`name === "__scrml_sql_placeholder__"` → the SQL node). F-SQL-001
  surfaces E-SQL-008 on unbalanced `?{}`.
- **Arrow parsing:** `compiler/src/ast-builder.js` — the arrow handlers around 8727–8934
  (`_arrow1/2/3`) all branch on a `{` block-body; the **expression-body (non-`{`) arrow path** is
  where the `?{}` (or its placeholder) is collected as a raw expression string and truncated.
  Related `?{}` routing notes at ast-builder.js ~6329–6336 (the `<x> = ?{}` RHS form was a prior
  gap — same "collected `?{}` as a raw string" failure shape).

## VERIFY-FIRST (before any fix)
Compile a real repro, e.g.:
```scrml
@export fn q(id: int): User[] {
    const f = (x: int) => ?{ SELECT * FROM users WHERE id = ${x} }.all()
    return f(id)
}
```
**Confirm** the `?{}` is truncated/destroyed at parse (the emitted JS drops the SQL, or the body
loses the placeholder, or it surfaces E-CODEGEN-INVALID-JS / a raw `?{` leak). Capture the emit +
the symptom. Compare against the WORKING block-body form to localize the divergence.

## Fix
The expression-body arrow parse must **capture the full `?{}` form** (don't truncate at the arrow
boundary) — route it through the same `?{}` capture the block-body / `<x> = ?{}` paths use, so the
SQL node survives to codegen. Keep block-body behavior byte-identical.

## R26 + adversarial acceptance (must ALL hold)
- The repro compiles + **`node --check` exit-0** (the HARD gate — invalid JS is the symptom) + the
  SQL node survives to codegen (the emitted JS contains the real query, not a truncated/empty form).
- **Adversarial:** block-body vs expr-body arrow (block-body must stay byte-identical); `?{}` with
  AND without `.run()` / `.all()` chained; a `?{}` arrow nested inside another expression; an
  arrow whose expr-body is `?{}` directly vs `?{}.all()` vs `cond ? ?{} : other`.
- **Zero regression** on existing arrow + `?{}` corpus.
- Full **`bun run test` GREEN**. If a parser-shape shift bumps a within-node parity fixture,
  re-baseline the **M6.5.b.0 allowlist IN THE SAME LANDING** — and **REPORT exactly which fixtures
  + why** (a sibling agent may also touch this allowlist; I reconcile at landing).

## Discipline
- **Native-parser FROZEN** — do NOT touch `compiler/native-parser/**`.
- Commit incrementally in your worktree. Do NOT push, do NOT touch main, write ONLY inside your
  worktree checkout (`git status` must show no main-checkout leakage).
- Pre-commit hook runs the full unit+integration+conformance suite (~108–124s) — generous timeout.

## Report back
1. VERIFY-FIRST evidence (the truncation symptom + emit).
2. The exact parse locus + the fix (how the expr-body arrow now captures `?{}`).
3. R26 + adversarial results per bullet (incl. the `node --check` exit codes).
4. `bun run test` result + any M6.5.b.0 allowlist change (which fixtures, why).
5. Final commit SHA(s) + worktree branch name + the full list of files you touched.
