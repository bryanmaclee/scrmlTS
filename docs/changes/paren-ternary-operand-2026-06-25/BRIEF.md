# BRIEF — g-paren-ternary-operand-paren-dropped (HIGH codegen) — archived S136

Dispatched S220 (2026-06-25) to scrml-js-codegen-engineer, isolation:worktree, model:opus, background. Agent `ab51f0d609658c361`. change-id `paren-ternary-operand-2026-06-25`.

## Bug (PA-verified on HEAD; flogence-reported S14)
A parenthesized ternary as the LHS of binary `+` has its parens DROPPED by the expression serializer → precedence flip → trailing operand silently lost.
Repro `/tmp/flogence-ternary/repro.scrml` (use a non-`<br>` cell — `<br>` collides with HTML void):
`const <stored> = (@br.length > 0 ? "[" + @br + "] " : "") + @body`
Emitted WRONG: `() => …@br… ? "[" + @br + "] " : "" + @body` (parens gone → `+ @body` lost when cond true). Control `"[" + @br + "] " + @body` (no leading paren-group) emits correctly.

## Root + fix
Expr serializer (`rewrite.ts` / `emit-expr.ts` — verify) doesn't re-parenthesize an operand whose top operator is LOWER-precedence than the enclosing binary op (a `?:` ternary under `+`). Fix = precedence-aware parenthesization in the operand re-emit. paren-expression-serialization family — READ the S210 `g-paren-binary-group` fix (`d84e85d2`) for the pattern; this is a sibling case (ternary-operand vs binary-group).

## Mandates
F4 startup-verification + S126 Bash-edit path discipline + `git merge main` first (stale base). S215 ADVERSARIAL gate MANDATORY (delicate serializer — must NOT over-parenthesize / regress): adversarial repros `(a?b:c)+d`/`d+(a?b:c)`/`(a?b:c)*d`/nested/`(a+b)+c`/`a+(b+c)`/`(a?b:c).method()`/derived+server-fn+`${}` contexts + `/code-review` high + R26 + node --check. FULL `bun run test` before DONE + within-node re-baseline if AST shifts. No push (PA lands via file-delta).
