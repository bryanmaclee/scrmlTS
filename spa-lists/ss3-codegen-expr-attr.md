# sPA ss3 — codegen-expr-attr

**Launch:** `read spa.md ss3` · **Branch:** `spa/ss3` (fresh — prior run's branch 6b-cleaned) · **Worktree:** harness-assigned

**Fill:** ~50% · REFRESHED S210 (prior 3-item run integrated `2eea9d4e`; re-clustered to the NEW expression-serializer paren/span family — same ingestion, one fix may cover ≥2)

## Shared ingestion
The codegen expression serializer + the is-op/attr rewrite surface — how parenthesization, is-ops,
and call/member spans are re-serialized at the codegen-expr stage. Shared loci:
`codegen/rewrite.ts` (`_rewriteParenthesizedIsOp`, `_rewriteNotSegment`), the expression serializer
(`expression-parser.ts`), and the literal/grouping-paren span handling. The two open items are the
same root family as the already-resolved `g-literal-arg-expr-serializer-wrong-span` (regex/string
literal wrong span) — the serializer mishandles grouping-paren-vs-call/operand spans.

## Core files
`compiler/src/codegen/rewrite.ts` · `compiler/src/expression-parser.ts` · `compiler/src/codegen/emit-event-wiring.ts` · `compiler/src/codegen/emit-html.ts`

## Items (the open paren/span cluster — least-ingestion-first)
1. **`g-paren-binary-group-dropped-before-method`** `[status=landed-on-branch @aae34c26]` **HIGH** · tier high — `(a + b).method()` emits `a + b.method()`: the grouping parens around a binary expr are DROPPED before a member/method access → method binds to the last operand, precedence wrong, **silent miscompile** (GREEN compile, `node --check` clean). R26-confirmed HEAD `2eea9d4e`: `(a+" "+b).toUpperCase()` → `a + " " + b.toUpperCase()`. Killed a flogence TF-IDF router. known-gaps `g-paren-binary-group-dropped-before-method`. Repro in `handOffs/incoming/read/2026-06-20-from-flogence-BUG-paren-grouping-dropped-before-method.md`.
   > **Brief seed:** the expression serializer drops grouping parens when a parenthesized binary expr is the receiver of a member access — re-serializes `a + b` without re-wrapping. Add a grouping-paren guard so a parenthesized binary in receiver position keeps its parens. **R26 value-assert** (emitted text for `(a+b).m()` keeps parens) — not just "it compiled." Check both client + `--mode library` paths.
2. **`g-isop-call-tail-lhs-paren-miscompile`** `[status=landed-on-branch @d004e6b9]` MED · tier med — in `--mode library`, an is-op whose LHS ends in a call (`re.exec(s) is some`) emits `re.exec((s) != null)` — `_rewriteParenthesizedIsOp` grabs the CALL's own arg-parens instead of the whole call as LHS. Valid JS, NO `E-CODEGEN-INVALID-JS` (silent-WRONG). known-gaps `g-isop-call-tail-lhs-paren-miscompile`. Repro: `export function f(re,s){ return re.exec(s) is some ? "h" : "n" }` `--mode library`.
   > **Brief seed:** `_rewriteParenthesizedIsOp` (`codegen/rewrite.ts`) needs a grouping-paren-vs-call guard — treat a call-tail LHS as the whole call, not the arg-parens. Likely the SAME guard item-1 needs (one fix may cover both). R26 value-assert against the library-mode repro.

## Previously integrated (S210-rebuild run, merged `2eea9d4e`)
- `g-attr-bare-compound-is-op-silent-drop` (`7f3bd4ca`) · `bug-18`/GITI-015 (`7ed9ff86`) · `g-each-body-sigil-root-expr-parser` (`544e5c42`). NOTES under `docs/changes/ss3-item{1,2,3}-*/`.

## Residuals to fold (from the prior run — track, not yet items)
- Dead each-sigil band-aid in `compiler/tests/integration/expr-node-corpus-invariant.test.js` (always-0 after item3) — test-hygiene removal (masks future `@.`-parse regressions).
- Native-parser (M2.x) `@.` structuring NOT verified (separate pipeline) — dual-pipeline canary when that path activates.

## Progress
`ss3.progress.md`. Land on `spa/ss3`; ping PA inbox when ready. Do not advance main / do not push.
