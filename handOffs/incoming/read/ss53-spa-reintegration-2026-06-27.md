# ss53 sPA → PA re-integration

**List:** `spa-lists/ss53-low-ingestion-cleanup.md` (per-item-disjoint cleanup lane, ss27 shape)
**Branch:** `spa/ss53` · tip `2715b2ad` · 0 behind / 2 ahead of `origin/main` (base 6ac1f635)
**End-state:** 2/2 landed-on-branch · 0 parked · 0 dropped

## Items landed (per-item SHA)

| # | item | SHA | result |
|---|------|-----|--------|
| 1 | bug-20 — `promote --engine` span-rewrite | `9a7b8470` | built (ratified scope) + boundary flagged ↓ |
| 2 | g-detect-sql-in-arrow Case-A prune | `2715b2ad` | PROVEN DEAD → pruned |

Each landed via file-delta (explicit pathspec) from its agent worktree; both agent worktrees branched from `origin/main` = the spa/ss53 base, write-disjoint, so no clobber risk. Each commit passed the full pre-commit suite (no `--no-verify`).

## Item 1 — bug-20 `promote --engine` (SHA 9a7b8470) — LANDED, but read the boundary

Built the last unbuilt `promote` verb exactly as S210 ruling B ratified (**span-only** rewrite; NO new lint — `W-MATCH-TRANSITIONS-ACCRUING` dropped as redundant). `promote.js`: `findMatchBlockSites` / `findMatchOpenerEnd` / `rewriteOneMatchBlock` / `applyEngineRewrite` / `promoteEngineOnFile`; de-stubbed dispatch + help + docstring. +16 unit tests. SPEC §56.6 rewritten (§56.6.1 transformation, §56.6.2 fail-closed gate, §56.6.3 initial= default, §56.6.4 idempotency). Fails closed via the shared `sanityCheckParse` gate — never emits non-compiling scrml. Full suite green.

**⚠ DECISION FOR YOU — scope boundary surfaced by VERIFY-FIRST (the brief's cell-name model was empirically INVERTED):**
- A `<match for=Phase on=@phase>` REFERENCES an existing cell; an `<engine for=Phase>` DECLARES its own type-derived cell (`Phase`→`@phase`).
- **Same-named cell (the idiomatic shape):** `<phase>: Phase` decl + `<match for=Phase on=@phase>` → after the span-only rewrite the redundant `<phase>` decl survives and **collides** with the engine's auto-declared `@phase` → `E-ENGINE-VAR-DUPLICATE` → **gate REVERTS** (reported `failed`, file untouched). Guided (the error tells the adopter to remove the decl + re-run), not silent.
- **Different-named cell:** promotes cleanly (the orphaned old cell becomes a non-blocking `E-DG-002` unused warning).
- **Net:** `--engine` one-pass-promotes ONLY when the match's `on=@cell` name differs from the type-derived engine cell name. On the *most idiomatic* match-block it reverts-with-guidance. SPEC §56.6.2 documents this honestly.
- **Candidate follow-on gap (NOT in this lane's scope):** extend `--engine` to also lift/remove the redundant same-named cell decl (outside the single match-block span) so the idiomatic case promotes in one pass. Your call whether to file it as a new known-gap. **bug-20 itself is closed at the ratified scope.**

## Item 2 — g-detect-sql-in-arrow Case-A prune (SHA 2715b2ad) — PROVEN DEAD, pruned

`detect-sql-in-arrow.ts` had two E-SQL-009 detectors; Case A (orphaned-sibling: text ends `=>` + next sibling is an `sql` node) caught the pre-ss50 parser-orphaning shape. The ss50 item-1 fix (commit `2fca8075`) suppresses the `collectExpr` break on `=>`, so the `?{}` is now captured into the same escape-hatch `.raw` the block-body form produces → the orphaned-sibling shape is no longer produced.

**Evidence (instrumented both fire sites, env-gated, reverted before prune):** targeted integration suite incl. exact S5/S11 fixtures = 5 fires ALL Case B / 0 Case A; full `bun run test` = 9 fires ALL Case B / 0 Case A; standalone CLI S5/S11 (live) each 1×E-SQL-009, 0×E-CODEGEN-INVALID-JS via Case B; native parser S5/S11 documented false-negative, NO crash; mechanistic — 2fca8075's own comment names Case A as the obsolete band-aid. Pruned Case A branch + dead `isSqlNode` helper; header/comments updated; tests re-pointed (S5/S11 still assert E-SQL-009 via the text scan — coverage retained, not deleted). Full suite 0 regressions.

## Parked / dropped
None.

## Housekeeping note for the PA (out of scope, both agents independently hit it)
The full-suite hook leaves 6 `compiler/tests/unit/gauntlet-s20/__fixtures__/import-resolution/*.scrml` tracked fixtures DELETED in the working tree — `import-resolution.test.js` deletes them to test a missing-import path and doesn't restore. I `git checkout`-restored them; final tree clean. Worth a harness-hygiene fix (restore-in-afterEach) so it stops biting parallel dispatches.

## EXCLUDED (unchanged — see list §"EXCLUDED")
The other 9 open LOWs were reconciled-with-reason at mint and NOT swept (1 already-in-ss51, 6 design/groundwork-gated, etc.). No change.

— sPA ss53
