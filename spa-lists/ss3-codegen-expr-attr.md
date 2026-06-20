# sPA ss3 — codegen-expr-attr

**Launch:** `read spa.md ss3` · **Branch:** `spa/ss3` · **Worktree:** `../scrml-spa-ss3`

**Fill:** ~55% · `at-ceiling` (post-S210 big-wave drain; same-ingestion siblings integrated or routed to design)

## Shared ingestion
Codegen expression/attribute lowering surface: how bare-compound is-ops, is-op ternaries, and
`@.`-sigil expressions are rewritten/lowered at the codegen-expr stage. Shared loci:
`codegen/rewrite.ts` (`_rewriteParenthesizedIsOp`), `emit-event-wiring.ts`, `emit-html.ts`, the
expr-parser `scrmlAtPlugin` `@.` path, plus the attribute-condition fallback-rewrite path. All three
items are attribute/expr-condition lowering bugs reachable from the same understanding of the
attr-fallback + is-op rewrite machinery.

## Core files
`compiler/src/codegen/rewrite.ts` · `compiler/src/codegen/emit-event-wiring.ts` · `compiler/src/codegen/emit-html.ts` · `compiler/src/expression-parser.ts`

## Items (least-ingestion-first)
1. **`g-attr-bare-compound-is-op-silent-drop`** `[status=landed-on-branch spa/ss3 @7f3bd4ca]` MED · tier med — `<p if=fn() is not>` drops the `is not`, emits `if((fn()))` (truthiness, INVERTED), no diagnostic — `is`/`is not` not in cluster-A op-set so `E-ATTR-UNQUOTED-OPERATOR` doesn't fire. Paren form correct; logic-body bare-compound works (AST-level). Locus = attribute-condition fallback rewrite `codegen/rewrite.ts` `_rewriteParenthesizedIsOp`:734-789. status=open verified HEAD 956460af.
   > **Brief seed:** DIRECTION RATIFIED S209 (user 'b'): REJECT-with-parens — extend `E-ATTR-UNQUOTED-OPERATOR` family to require the parenthesized form (limit-not-widen, §5.2/§17.1 cluster-A rule). R26 verify the silent-wrong inversion reproduces before fix; assert the paren form stays correct.
   > **LANDED (sPA ss3, sPA-direct):** fix locus was the TOKENIZER (`tokenizer.ts` `attrConditionOperatorAhead` op-set + a shared `pushConditionOpReject` helper), NOT `rewrite.ts` — the bare form never reached the rewrite fallback; it slipped past the cluster-A reject. Both ident AND call paths fixed (call path was a wider latent gap dropping bare binary ops after a call too). +20 tests; full suite 24677/0. NOTES: `docs/changes/ss3-item1-bare-is-op-attr/`.
2. **`bug-18`** `[status=landed-on-branch spa/ss3 @7ed9ff86]` LOW · tier med — GITI-015 — is-op ternary with computed-LHS not lowered (`E-CODEGEN-INVALID-JS`). `arr[i+1] is some ? a : b` (is-op ternary + computed-LHS) NOT lowered → caught LOUD by `E-CODEGEN-INVALID-JS` (was SILENT at cbfefef). R26 REPRODUCED on HEAD (ss14 item6 de-stubbed). Repro `handOffs/incoming/read/2026-05-23-0703-giti-015-is-some-ternary-with-computed-lhs.scrml`. known-gaps:1552. giti inbox needs:action.
   > **Brief seed:** Lower the is-op ternary with a computed-LHS at the codegen-expr stage. Mirror the existing is-op lowering for non-computed LHS. R26 against the giti repro; value-assert (not just compiles).
   > **LANDED (sPA ss3, sPA-direct):** locus = LIBRARY-mode line-by-line path (`rewriteIsOperator(rewriteNotKeyword(line))`, emit-library.ts) → `codegen/rewrite.ts` `_rewriteNotSegment` `DOTTED_LHS` extended with a bracket-index tail. AST/client path was already fine (rewriteIsPredicates). R26 + runtime value-assert; +6 unit tests; 24683/0. **PA RESIDUAL:** call-tail LHS (`re.exec(s) is some`) silently MIScompiles to `re.exec((s) != null)` — separate root (`_rewriteParenthesizedIsOp` grabs the call's arg-parens); worth a dedicated item (silent-WRONG). NOTES: `docs/changes/ss3-item2-isop-ternary-computed-lhs/`.
3. **`g-each-body-sigil-root-expr-parser`** `[status=landed-on-branch spa/ss3 @544e5c42]` LOW · tier low — `<each>`-body `@.`-sigil expr-parser gap (root of the ss14 classifier false-positive). PA FINDING from ss14: the expr-node-corpus-invariant classifier fix (landed) stops the false-positive only; ROOT is expr-parser `scrmlAtPlugin` `@.` gap (Phase-2). bare `@.`/`@.field` in `<each>` body ParseErrors. §17.7.3 `@.` grammar; `E-SYNTAX-064` fires `@.` outside `<each>`.
   > **Brief seed:** Close the expr-parser `scrmlAtPlugin` `@.`-sigil parse gap so bare `@.`/`@.field` inside an `<each>` body parse cleanly (Phase-2 expr-parser surface). Cross-check §17.7.3 grammar; the classifier whitelist is a band-aid over this.
   > **LANDED (sPA ss3, sPA-direct):** `scrmlAtPlugin.readToken` (expression-parser.ts) now structures `@.`/`@.field` (inline-ws-tolerant for the BS `@ . name` join form); `@name`/`@x.y` untouched. classifier each-sigil 2→0; +9 unit tests; 24692/0. **PA RESIDUALS:** (1) the each-sigil classifier band-aid in `expr-node-corpus-invariant.test.js` is now always-0 → remove in a hygiene pass (else it masks future `@.`-parse regressions); (2) native-parser (M2.x) `@.` structuring NOT verified (separate pipeline). NOTES: `docs/changes/ss3-item3-each-sigil-expr-parser/`.

## Progress
`ss3.progress.md`. Land on `spa/ss3`; ping PA inbox when ready. Do not advance main / do not push.
