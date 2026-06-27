# ss50 item 2 — g-unary-of-exponent-arg-no-paren — DEV BRIEF

**Dispatched:** sPA ss50, 2026-06-27 · agent `scrml-js-codegen-engineer`, isolation:worktree, opus.
**Branch base:** local `main` `7ab86083` (includes ss52 + ss49). **MED · VERIFY-FIRST.**
**Change-id:** `g-unary-of-exponent-arg-paren-2026-06-27`.
**⚠️ PARALLEL-SAFETY:** an ss50 sibling agent is fixing item 1 in `ast-builder.js` /
`expression-parser.ts` (parser-stage arrow `?{}` capture). **Your fix is EMIT-stage — stay in
`compiler/src/codegen/emit-expr.ts`. Do NOT touch `ast-builder.js` / the parser.**

## The bug
`emitUnary` drops the parens needed around a `**` ARGUMENT. A unary applied to an exponentiation —
AST `Unary(-, Binary(**, 2, 3))` for source `-(2 ** 3)` — must serialize as **`-(2 ** 3)`**, but
`emitUnary` emits the flat **`-2 ** 3`**, which is a **`SyntaxError` in JS** (`node --check`
rejects it → E-CODEGEN-INVALID-JS). JS grammar forbids an un-parenthesized `UnaryExpression` as the
base of `**`, so `-2 ** 3` is illegal and the negation of an exponent MUST be parenthesized.
Surfaced ss31 (out-of-scope discovery).

## Footprint (sPA scope — precise)
- **`emitUnary`** — `compiler/src/codegen/emit-expr.ts` **line 830**. The prefix path serializes
  `arg = emitExpr(node.argument, ctx)` (~861) then returns `${node.op}${arg}` (~878). When
  `node.argument` is a `**` `BinaryExpr`, `arg` is `2 ** 3` → the return is `-2 ** 3` (invalid).
- **EXISTING sibling guard (do NOT duplicate / do NOT regress):** the precedence-paren helper at
  ~**1250–1270** already handles the INVERSE case — `g-unary-left-of-exponent-no-paren` (ss21):
  a unary as the **LEFT operand of** `**` (`(-2) ** 3`) gets wrapped. Your case is the OTHER
  direction: a unary **applied to** a `**` expression. Fix it in `emitUnary` (the operand side),
  keeping the ss21 left-operand guard intact. `BINARY_PRECEDENCE["**"]=14`, `**` is right-assoc.

## VERIFY-FIRST (before any fix)
Compile real repros and `node --check` the emit:
- `-(2 ** 3)` → expect current emit `-2 ** 3` → **`node --check` FAILS** (SyntaxError). Confirm.
- Cross-check the working `(-2) ** 3` (ss21 guard) still emits `(-2) ** 3` and passes.
Capture both emits + exit codes.

## Fix
In `emitUnary`, when a **prefix** unary's argument serializes such that the result would place an
un-parenthesized unary/expression as the base of `**` — i.e. `node.argument.kind === "binary" &&
op === "**"` (and any operand that needs precedence protection under the unary) — **wrap the
argument in parens**: emit `${node.op}(${arg})` → `-(2 ** 3)`. Prefer an AST-precedence check (the
argument is a `**` binary) over string-sniffing. Apply to all prefix unary operators where it
matters (`-`, `+`, `~`, `!`, `typeof`, `void` — though only the arithmetic/`**` interaction is the
SyntaxError; verify which actually need it and don't over-wrap). Do NOT alter postfix or the
`@x++`/`@x--` reactive-setter branch.

## R26 + adversarial acceptance (must ALL hold)
- `-(2 ** 3)` → emits `-(2 ** 3)` → **`node --check` exit-0** AND **RUN** (value `-8`, not a crash).
- `(-2) ** 3` (ss21 inverse) → still `(-2) ** 3` → exit-0, value `-8` — **no regression**.
- **Adversarial:** unary-of-exponent (`-(2**3)`, `~(2**3)`, `!(2**3)`); exponent-of-unary
  (`(-2)**3` — the guarded case); **chained** (`-(-(2 ** 3))`, `-( 2 ** -3 )`); mixed precedence
  (`-(2 ** 3) + 1`, `a * -(b ** c)`); a `**` whose own operands are unary (`(-a) ** (-b)`). Each:
  `node --check` exit-0 + correct runtime value.
- **Zero regression** on the existing unary / `**` corpus (the ss21 fixtures especially).
- Full **`bun run test` GREEN**. If a within-node parity fixture shifts, re-baseline the
  **M6.5.b.0 allowlist IN THE SAME LANDING** — and **REPORT exactly which fixtures + why** (a
  sibling agent may also touch this allowlist; I reconcile at landing).

## Discipline
- **Native-parser FROZEN** — do NOT touch `compiler/native-parser/**`.
- Commit incrementally in your worktree. Do NOT push, do NOT touch main, write ONLY inside your
  worktree checkout (`git status` must show no main-checkout leakage).
- Pre-commit hook runs the full unit+integration+conformance suite (~108–124s) — generous timeout.

## Report back
1. VERIFY-FIRST evidence (both emits + `node --check` exit codes, before the fix).
2. The fix (the exact `emitUnary` condition + the wrap; which operators it applies to + why).
3. R26 + adversarial results per bullet (emit + exit-0 + runtime value).
4. `bun run test` result + any M6.5.b.0 allowlist change (which fixtures, why).
5. Final commit SHA(s) + worktree branch name + the full list of files you touched.
