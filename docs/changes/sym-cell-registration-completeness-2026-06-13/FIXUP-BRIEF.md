FIXUP of the just-completed SYM cell-registration-completeness arc (change-id `sym-cell-registration-completeness-2026-06-13`). An adversarial verification pass found 0 blockers but real CONCERNS the user ruled to FIX (user S192: "fix the impl, dispatch the fixup"). You START from the arc's final state and apply a focused fixup; you do NOT redo the arc's correct work (refs registration, Class-D migration, canonical const-@x migration are all VERIFIED-GOOD — leave them).

# STARTUP — INHERIT THE ARC STATE (do this FIRST, before any fixup edit)
Standard F4: `pwd` MUST start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-` (else STOP — S90). Save WORKTREE_ROOT. `git -C "$WORKTREE_ROOT" rev-parse --show-toplevel` == WORKTREE_ROOT.
**Then inherit the registration arc:** `git -C "$WORKTREE_ROOT" reset --hard facdf204d087bbb5786e867bc056ccfcba79d93b` (the arc's FINAL_SHA — it descends from current main, so it includes BOTH the Part-2 engine-varname work AND the registration arc). Confirm `git -C "$WORKTREE_ROOT" log --oneline -5` shows the arc's 4 commits + verify `compiler/src/engine-varname.ts` exists and `symbol-table.ts` has `walkRegisterRefBindings`. THEN `bun install` + `bun run pretest`. Use `bun --cwd "$WORKTREE_ROOT" run test` for full-suite baselines.

## Path discipline (S99/S126): ALL edits via Bash (perl/python3/heredoc) on WORKTREE_ROOT-absolute paths INCLUDING the `.claude/worktrees/agent-<id>/` segment — NOT Edit/Write. NEVER `cd` into main. First commit message includes verbatim `pwd`. Commit per fixup-item; `git status` clean before DONE. Update `docs/changes/sym-cell-registration-completeness-2026-06-13/progress.md` (append).

# THE 6 FIXUP ITEMS (the verifier pinpointed exact loci — confirm current lines, they may shift post-reset)

## FIX 1 (impl, USER-RULED) — W-STATE-BLOCK-BARE-WRITE-DECL must fire on CANONICAL `<db>`, not just `< db>`
ROOT (verifier-proven): `scanStateBlockBareWriteDecls` is gated on `block.type==="state"` and runs inside `liftBareDeclarations(blocks)` (ast-builder.js ~L14966) BEFORE the markup→state normalization in `buildBlock` (~L12481, runs ~L14968). BS classifies the canonical no-space `<db>`/`<state>` opener as `type=markup` (only the DEPRECATED whitespace opener `< db>` is `type=state`). So the lint fires ONLY on `< db>` (which already gets W-WHITESPACE-001) and is SILENT on the canonical `<db>` an adopter writes — exactly the silent-drop danger the lint exists to catch.
FIX: relocate/re-run the bare-write-decl scan AFTER the markup→state normalization so it covers the canonical `<db>`/`<state>` form. Survey the cleanest seam (run the scan post-normalization, or re-classify before the scan). Add tests: canonical `<db src= tables=>` with a bare `@x=init` body → W-STATE-BLOCK-BARE-WRITE-DECL FIRES (this is the new coverage); the canonical `${ <x> = init }` form → NO fire; over-fire guards still hold (`@x == []` comparison, `${} server function` body → no fire).

## FIX 2 (impl, consistent application of "fix the impl" to the sibling lint) — W-CONST-AT-DEPRECATED must fire on markup-body `const @x`
ROOT: legacy `const @x` INSIDE a markup element body is silently DROPPED (no AST node), so the AST-node-gated lint (type-system.ts, gated `shape==="derived" && isConst===true && structuralForm===false`) is structurally blind to exactly that silent-drop site.
FIX: add a TAB-level source-scan for legacy `const @x` in markup-element-body position — MIRROR the `scanStateBlockBareWriteDecls` pattern you already wrote for Class D — so the lint fires at the dropped-text site. + tests: `const @x = expr` directly in a `<div>` body → W-CONST-AT-DEPRECATED FIRES; `const <x>` in same position does NOT fire W-CONST-AT (it's a different, loud E-CTX error — see FIX 3). Keep the existing AST-path fire (logic/top-level) intact.
**SURVEY-STOP:** if this markup-body scan is NOT a clean mirror of scanStateBlockBareWriteDecls (i.e. materially more involved), STOP and report — we'll narrow the §6.6.1 wording for the markup-body case instead. Do the impl fix only if it's the bounded mirror.

## FIX 3 (Rule 4 — SPEC accuracy) — correct the over-claims so the SPEC matches the impl
After FIX 1+2, the "SHALL emit ... at every site" claim becomes TRUE for both lints (verify it does). BUT a SEPARATE overstatement remains: §6.6.1's "the `<>`-form registers everywhere" is FALSE — `const <x>` in a RAW MARKUP body parses as an element open-tag and errors `E-CTX-001` (it does NOT register there). Correct that specific sentence: in raw markup neither form is a valid derived-decl — legacy `const @x` silently drops (now caught by FIX 2's lint), canonical `const <x>` loud-errors E-CTX-001; the canonical derived-decl form `const <name>` is for logic / top-level / `${...}` contexts. Per pa.md Rule 4, read §6.6.1 + §34 in full and make the prose literally accurate. Verify the §34 W-STATE-BLOCK row prose now matches the canonical-`<db>` coverage FIX 1 delivers.

## FIX 4 (corpus consistency — eliminate the +1 cosmetic error) — wrap the 2 bare markup-context const decls in `${}`
The arc left 2 const decls bare in markup context (so `const <x>` mis-parses `<x>` as an unclosed markup tag → a NEW E-CTX-003 each, regressing those already-failing friction files by +1): blog-cms.scrml `const <publishedCount>` (~L60, inside a `<db>` body) + recipe-book.scrml `const <filteredRecipes>` (~L52, top-level markup). Wrap each in `${ ... }` (the canonical logic-context form, matching how bun-admin's cells were re-homed). Verify each file's error count vs its PRE-migration (main) state no longer shows the +1 (compile both, compare).

## FIX 5 (wording nit) — the 2 new Info-severity §34 rows say "mirrors W-PURE-DEPRECATED" (which is Warning); the real Info precedent is W-MATCH-ARROW-LEGACY. Fix the "mirrors" reference in both rows.

## FIX 6 (baseline accuracy) — wherever the arc recorded bun-admin "1 -> 32 errors" (known-gaps bug-12-vkill detail / progress.md / any changelog-bound text), correct to "31 -> 32" — the true pre-migration baseline when products.db resolves is 31, not 1 (the "1" was a short-circuited count). Don't overstate the now-surfaced-friction delta.

# RE-VERIFY (R26 — do NOT mark DONE without)
- Full suite `bun --cwd "$WORKTREE_ROOT" run test`: 0 new fail vs the arc's 24244/0/223 baseline.
- Lint coverage proof: canonical `<db>` bare-write → W-STATE-BLOCK fires; markup-body `const @x` → W-CONST-AT fires; canonical examples `examples/03-contact-book.scrml` + `examples/08-chat.scrml` → 0 new lints (no over-fire); corpus `const @` count still 0 in .scrml.
- blog-cms + recipe-book no longer gain the +1 error vs main.
- End report with: the lint-coverage before/after firing counts, the 2-corpus-file error-count deltas, suite numbers, FILES_TOUCHED, FINAL_SHA, the per-fix commit SHAs, and whether FIX 2 was done-as-impl or hit the SURVEY-STOP.

# MAPS: read `.claude/maps/primary.map.md` Task-Shape Routing (compiler-source bug fix — ast-builder.js lint seams + type-system.ts + SPEC). Report maps-consulted.

You are on Opus. Reset to facdf204 FIRST, edits via Bash on worktree-absolute paths, never cd into main, no --no-verify, R26 before DONE.
