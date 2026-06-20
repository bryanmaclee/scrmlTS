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
- Disposition: **landed-on-branch** (SHA below).
