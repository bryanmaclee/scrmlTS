# sPA ss4 — progress log (append-only)

Branch `spa/ss4` · worktree `../scrml-spa-ss4` · base `origin/main` e8a5491f (S209).
Note: list built S208 (2026-06-19); S208 same-day front-end work may have closed several
items — each verified empirically (R26 reproduce-first) before any dispatch.

## 2026-06-20 (S209) — boot
- Worktree + branch `spa/ss4` created from origin/main e8a5491f. node_modules + compilation-tests/dist symlinked from main (S209 ss9 dist-gap lesson).
- coreFiles + footprints read targeted.

## item 1 — bug-75 colon-shorthand legacy placement → RESOLVED (NOT-REPRODUCED)
- R26 e2e repro `/tmp/bug75-repro.scrml`: engine with after-`>` `:`-shorthand state-children (`<Small rule=.Big> : "small"`).
- `bun run compiler/src/cli.js compile` → EXIT 0, emits info `W-COLON-SHORTHAND-LEGACY-PLACEMENT` per state-child. NO E-STRUCTURAL-ELEMENT-MISPLACED.
- Root: fixed by S208 `tryConsumeAfterCloseColonShorthand` (block-splitter.js:1320, call sites 2948/3254) + symbol-table.ts warning emit (6419/11811). Landed 2026-06-18, after list build.
- Disposition: **dropped — resolved pre-list, verified NOT-REPRODUCED.** No code change.

## item 2 — comment-span opacity → FIXED (engine locus only; match NOT affected)
- R26 repro battery: engine state-child scan breaks when a comment BEFORE/BETWEEN state-children contains an ODD quote/apostrophe/backtick (`<!-- " -->`). `</Variant>`/`<tag>` mentions, balanced quotes, and after-placement are fine. Minimal trigger = odd quote in comment. Block-splitter probe (`splitBlocks`) shows BS captures engine body + children INTACT → bug is downstream in `engine-statechild-parser.ts`, not BS.
- Match parser: NOT affected at any comment position (BS raw-capture + arm-closer scan handle `<!--`). briefSeed's "match-arm scanner" claim is empirically wrong (R4 catch).
- Root cause TWO loci in `engine-statechild-parser.ts`:
  1. `skipCommentOrString` (1337) recognized `//` `/* */` `"` `'` backtick but NOT `<!-- -->` → comment-interior quote opened a phantom string.
  2. `parseEngineStateChildren` (2090 loop): when a `<!--` began exactly at `lt`, `next==='!'` made the loop step INTO the comment at `lt+1`, past the `<` skipCommentOrString needs.
- Fix: (1) add `<!-- -->` branch to `skipCommentOrString` (`computeCommentRegions` inherits it); (2) skip a skippable span starting AT `lt` in `parseEngineStateChildren`.
- Test: NEW `compiler/tests/unit/engine-statechild-comment-opacity.test.js` (7 cases, all pass). Regression: engine+colon-shorthand suite 201 pass / 0 fail.
- Disposition: **landed-on-branch `38edeb0a`** (full pre-commit + post-commit browser gate green).

## item 3 — native-parser corpus GAP-LEDGER → VERIFIED healthy by-design (no fix)
- Ran `parser-conformance-corpus.test.js`: 991/1008 strict-pass (98.3%), 17 gap-ledger skips, 0 fail. Class histogram: EXACT 956, DEFERRAL-test-block 21, LIVE-DEGENERATE 13, DIFF-deep-seq 8, DIFF-hoist-count 6, DIFF-top-seq 2, GAP-state-block 1, LIVE-HOIST-MISCLASSIFY 1.
- `classifyDivergence` re-partitions strict-vs-gap EVERY run → no stale `.skip` by construction; the self-flip mechanism is working as designed. strict-pass 98.3% >> the 50% floor gate.
- No isolated bug. Closing the 17 residual gap classes = item-6 native-parser fix work (out of sPA-bounded scope here).
- Disposition: **dropped — verified healthy by-design.** No code change.

## item 4 — byte-identical lexer gap → PARTIALLY CLOSED (5 dispositions flipped)
- Empirical probe: temporarily flipped all `M1.2-*` bench dispositions to `full` → 5 PASS the byte-identical gate, 3 FAIL. (M1.3 comment-aware + M1.5 template/regex normalizers have landed.)
- FLIPPED to `full` (now under the strict byte-identical gate): decl-destructure, expr-async-await, expr-yield-generator, stmt-import-export, stmt-try-catch.
- RESIDUAL genuine gaps (kept skipped, documented at the skip site): decl-class (class-body token shape), expr-optional-chain (`?.` split), expr-template-literal (template token shape) → native-lexer (lex.js/token.js) work in item 6.
- Legitimate strict-TIGHTENING (more byte-identical coverage), matches the test file's own documented "flip as the class closes" intent. Lexer test 113 pass / 0 fail.
- Disposition: **landed-on-branch** (SHA below).
