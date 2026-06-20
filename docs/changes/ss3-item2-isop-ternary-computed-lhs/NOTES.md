# ss3 item2 — `bug-18` / GITI-015: is-op with computed (bracket-index) LHS not lowered

**Branch:** `spa/ss3` · Repro: `handOffs/incoming/read/2026-05-23-0703-giti-015-is-some-ternary-with-computed-lhs.scrml`

## Bug (R26 reproduced on HEAD db906e40, `--mode library`)

An is-op (`is some` / `is not` / `is not not`) whose LHS is a **bracket-index**
access (`arr[i]`, `args[i + 1]`) was not lowered → the keyword survived literal
into the emitted JS → `E-CODEGEN-INVALID-JS` (LOUD):

```scrml
export function v1(args, i) {
    return args[i + 1] is some ? args[i + 1] : "fb"   // emitted: ...args[i + 1] is some... → invalid JS
}
```

**Empirical signature (R26 — the repro's "if(arr[i]) works" comment is STALE):**
on current HEAD ALL bracket-index LHS fail (ternary AND if-predicate); ident /
dotted / call-tail LHS work.

**Root:** the bug is in the **library-mode line-by-line emit path**
(`rewriteIsOperator(rewriteNotKeyword(line))`, `emit-library.ts:195,375`), which
uses the string-rewrite `_rewriteNotSegment` (`codegen/rewrite.ts`). Its
`DOTTED_LHS` pattern matched `ident` and `.member` chains but had no
bracket-index segment. `rewriteIsOperator` only has fallbacks for `is null` /
`is undefined` / `is Variant` — so `is some` / `is not not` with a bracket LHS
had NO handler and passed through verbatim. (The AST/client path already handles
this via `rewriteIsPredicates`' balanced-bracket `scanLhsLeft` — single-eval
IIFE — so the bug is library-mode-only.)

## Fix (`compiler/src/codegen/rewrite.ts`)

Extend the `DOTTED_LHS` chain to admit a bracket-index tail (one level of
nesting): `@?ident(?: .member | [..] )*`. The three is-op replacements
(`is not not` / `is some` / `is not`) now match `arr[i]`, `args[i + 1]`,
`a.b[i].c`, `arr[idx[0]]`. Bracket-index LHS is DOUBLE-evaluated (same as the
dotted-path form — parenthesize `(arr[i]) is some` for single-eval). Mirrors the
existing non-computed lowering exactly, per the brief.

## Verify

- R26: original giti-015 repro compiles clean; emitted
  `(args[i + 1] !== null && args[i + 1] !== undefined) ? args[i + 1] : "fb"`.
- **Value-assert** (ran the emitted ES module): v1 present→"b" / absent→"fb",
  v2, v3, control, controlIfPred all correct (8/8 real assertions).
- Tests: +6 `rewriteNotKeyword` unit tests (`not-keyword.test.js` §5e–§5j).
  Full suite 24683 pass / 0 fail.

## Residual surfaced (file to PA) — SEPARATE bug, NOT fixed here

**is-op with a CALL-tail LHS silently MIScompiles.** `re.exec(s) is some` emits
`re.exec((s) != null)` — `_rewriteParenthesizedIsOp` matches the `) is some` and
walks back to the call's OWN arg-parens (`(s)`), rewriting the arg instead of the
whole call. Valid JS (no E-CODEGEN) but semantically WRONG (silent). Different
root cause (the paren-rewrite greedily targets the innermost `(`, with no
"is-this-a-grouping-paren-vs-a-call" guard) and touches the load-bearing
`_rewriteParenthesizedIsOp` (item1-adjacent), so out of bug-18's surgical scope.
Repro: `export function f(re,s){ return re.exec(s) is some ? "h" : "n" }`
`--mode library`. Worth a dedicated item (silent-WRONG → higher severity than the
LOUD bug-18 it sat next to).
