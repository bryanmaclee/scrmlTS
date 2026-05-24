# Progress: 6nz-s — `return not` mis-emits as `return !` (statement glue)

- [start] Branch worktree agent-af913acca4fe6435f; merged main (HEAD a91ad5de).
- Mailbox seed-only — proceed.
- Baseline `bun run test`: 21179 pass / 0 fail (first run flickered 2 fails = known flaky pair; re-run clean).
- Bug PROVEN at preprocessForAcorn boolean-negation regex (expression-parser.ts:1155-1158):
    `return not\nconst pos = context.pos` -> `return !const pos = context.pos`
    `@x = not\nlet y = 1` -> `@x = !let y = 1`
  Real negation `not ready` -> `!ready`, `not @x` -> `!@x`, `not (a && b)` -> `!(a && b)` (must stay correct).
- Fix plan: tighten regex — (1) horizontal-whitespace only (no newline/`;` crossing); (2) negative lookahead for JS reserved keywords as operand.

- [fix] expression-parser.ts:1132,1155 — applied via python (Bash, no Edit tool).
    Edit 1 (prefix `not (`): `\s*` -> `[ \t]*` (no newline crossing).
    Edit 2 (operator `not <op>`): `\s+` -> `[ \t]+` + negative-lookahead keyword exclusion.
- Verified (regex replication + real parseExprToNode round-trip + CLI E2E):
    `return not\nconst` no longer glues; emits `return null;`; node --check PASS.
    `not ready`->`!ready`, `not @x`->`!@x`, `not (a)`->`!a` intact.
    `not constant`->`!constant`, `not ifValue`->`!ifValue` (operand starting w/ keyword-substring) intact.
    GITI-017 regex `/not a jj repo/i`, `/bookmark.*not found/i` verbatim. String `"a not b"` verbatim.

- [discovery] preprocessForAcorn fix alone does NOT fix the ADOPTER trigger.
    Real-world path = ARROW BLOCK BODY `(n)=>{ ... return not\nconst ... }` (EscapeHatchExpr raw),
    which is lowered by the SIBLING regex in codegen/rewrite.ts:731,751 — NOT preprocessForAcorn.
    PRE-FIX arrow repro emits `return !const doubled = n*2` -> node --check FAIL (exit 1).
    Brief locus was preprocessForAcorn; the duplicate buggy regex in rewrite.ts is the actual adopter site.
  -> Applying the SAME two-guard fix to rewrite.ts:731 (prefix) + 751 (operator-form).

- [fix2] codegen/rewrite.ts:731,751 — same two-guard fix applied (Bash/python, no Edit tool).
    Arrow-block-body repro POST-FIX: `return null` + `const doubled` un-glued; node --check PASS.
- [test] compiler/tests/unit/not-return-statement-glue.test.js (NEW, 10 tests).
    Fixture exercises BOTH paths: arrow-block-body (rewrite.ts site, the adopter trigger) + plain fn body.
    Verified RED pre-fix (2 fails: glued `return !const`, node --check SyntaxError) / GREEN post-fix (10 pass).
    Covers: no-glue, return null lowering, @x=not standalone, real negation not @ready -> !, GITI-017 regex verbatim.
