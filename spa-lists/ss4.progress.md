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
