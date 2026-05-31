# Progress — e-dg-002-false-positive-class-2026-05-31

Worktree: /home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-ae60844ec0f682c88
Base: f444290a (merged main, fast-forward, clean)

## 2026-05-31T10:42:34Z — startup
- pwd verified under .claude/worktrees/agent-; toplevel matches.
- merge main -> fast-forward to f444290a, clean.
- bun install + bun run pretest OK.
- Reproduced all 3 cases on HEAD: (A) @threshold false-fires, (B) @phase false-fires, (GUARD) @reallyUnused fires (correct).

## 2026-05-31T10:42:34Z — investigation
- locus-(A) ROOT: forEachIdentInExprNode (expression-parser.ts:2825) deliberately does NOT descend into LambdaExpr bodies (lin-scope boundary; case "lambda" only walks param defaults). This is a SHARED helper used by checkLinear lin-capture tracking -> widening it would change lin semantics.
- collectReactiveRefsFromExprNode (dependency-graph.ts:353) is DG-LOCAL; all 8 callers feed reader-credit/read-edges where descending into lambda bodies IS correct.
- Reproducer A uses V5-strict const <filtered> = ... -> structuralForm:true, so NOT collected by collectAllReactiveDerivedDecls (which only takes structuralForm:false legacy @-form). @items + @threshold are both credited via the MARKUP SWEEP (sweepNodeForAtRefs -> collectReactiveRefsFromExprNode on the logic-body decl). So both (A) and the markup path route through collectReactiveRefsFromExprNode.
- locus-(B): match-block markup node has kind:"match-block" + onExprRaw:"@phase" (raw string, no ExprNode). Analogous to each-block's inExprRaw/ofExprRaw/keyExprRaw special-case (~line 2580). The generic markup-sweep credit never reaches it.

## 2026-05-31T10:42:34Z — SB1 DONE
- Added DG-local collectLambdaBodyReactiveRefs; collectReactiveRefsFromExprNode now descends into lambda bodies (expr-body + block-body, nested). Did NOT widen the shared forEachIdentInExprNode.
- Verified: (A) @threshold no longer fires E-DG-002; (GUARD) @reallyUnused still fires.
- Commit 3f9e3888.
- Pre-commit hook: 15314 pass / 0 fail -> "Pre-commit checks passed."
- Post-commit canary "M6.5.b.0 within-node parity per-fixture gate" reports 5 MISSING-FIELD over-budget fails on match error-fixtures. PROVEN PRE-EXISTING: identical residual counts with SB1 reverted (parser-only gate, native-vs-live within-node shape; introduced by f444290a match-:> landing whose allowlist wasn't updated). NOT a regression from this work.

## 2026-05-31T10:52:40Z — SB2 DONE
- Added match-block special-case in sweepNodeForAtRefs (analogous to each-block inExprRaw/ofExprRaw/keyExprRaw): scans onExprRaw + armsRaw for @cell reads. match-block carries subject as raw string (block-splitter-captured), so generic ExprNode sweep missed it.
- Verified: (B) @phase + member-access <match on=@wrapper.phase> no longer fire; (GUARD) still fires.
- Commit 573a59f1. Pre-commit: 15314 pass / 0 fail.

## 2026-05-31T10:52:40Z — SB3 DONE
- New test compiler/tests/unit/e-dg-002-false-positive-class.test.js (8 tests, cross-stream errors+warnings union per diagnostic-stream-partition).
- Covers (A) .filter/.map/.reduce + doubly-nested arrow; (B) match-on + member-access; (GUARD) reallyUnused fires + sibling-unused-cell-still-fires (targeted-credit proof).
- DISCOVERED during testing: `v < @limit` / `x < @hi` inside a markup-region const RHS hits an UNRELATED ParseError (escape-hatch ParseError, init truncated at the `<`). The `<` is mis-read as a tag-open in markup-region expr RHS. Switched the nested-arrow test to `>` to isolate the nested-lambda credit (which works). This is a PRE-EXISTING expression-parser/tokenizer limitation, OUTSIDE E-DG-002 scope — surfaced as DEFERRED, not fixed.
- All 8 new tests pass. Commit 374117320e81.
- Pre-commit hook: 15322 pass / 0 fail (8 new tests = +8 vs 15314 baseline).

## 2026-05-31T10:52:40Z — verification + baseline-delta proof
- Empirical (exact brief commands): (A) ZERO E-DG-002 on @threshold; (B) ZERO on @phase; (GUARD) E-DG-002 STILL fires on @reallyUnused. ALL PASS.
- Combined gate unit+integration+conformance: WITH work 15300 pass / 22 fail; BASELINE f444290a (work reverted) 15292 pass / 22 fail. SAME 22 fails -> ZERO new failures from this work (+8 = my new tests).
- 22 pre-existing fails: SPEC-doc assertions (A9 Ext5 §19.9.6/.7 idempotency, D3/D4 CPS W-CPS-NEEDS-FAILABLE) + match within-node parity allowlist gate (MISSING-FIELD residuals on match error-fixtures, introduced by f444290a match-:> landing whose native-parser allowlist wasn't updated). None touch DG/E-DG-002.

## STATUS: COMPLETE — SB1 + SB2 + SB3 done, tree clean, 3 commits (3f9e3888, 573a59f1, 374117320e81).
