# BRIEF — standalone `given` guard `:>` canonical — compiler impl (S148, Insight-33 extension)

Change-id: `match-given-colon-2026-05-31`. Agent: scrml-js-codegen-engineer · isolation: worktree · model: opus.

SPEC normative core ALREADY LANDED (this session — `spec(s148): standalone given guard :> canonical`).
Implement to SPEC §42.2.3 (grammar `given-guard ::= 'given' identifier-list (':>' | '=>') block` +
the separator note) + the §34 `W-GIVEN-ARROW-LEGACY` row. SPEC is authoritative (Rule 4).

## What this is
The standalone `given x => body` presence-guard (§42.2.3, NOT inside a match) flips its separator
to `:>` (canonical), with `=>` a DEPRECATED alias. This is the EXACT pattern S147 shipped for match
arms (`:>` canonical + W-MATCH-ARROW-LEGACY + `migrate --fix`) — you are replicating it for the
standalone `given`-guard context. (In-`match` `given`-arms already use `:>` via S147 — DO NOT touch
the match-arm path; this is the STANDALONE given-guard only.)

================================================================================
# STARTUP (S99: 20 prior leaks; #21 would be next) + PATH DISCIPLINE
================================================================================
1. `pwd` MUST start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-` → WORKTREE_ROOT.
2. `git -C "$WORKTREE_ROOT" rev-parse --show-toplevel` == WORKTREE_ROOT; `git status --short` clean.
3. Confirm base has the SPEC core: `grep -c "W-GIVEN-ARROW-LEGACY" "$WORKTREE_ROOT/compiler/SPEC.md"` >= 2.
   If 0, base stale → `git merge main`; if that fails STOP + report (S112).
4. `bun install` ; `bun run pretest`.
PATH DISCIPLINE (S99+S126): edits via Bash (perl/python/cp/heredoc) on WORKTREE-ABSOLUTE paths incl.
the `.claude/worktrees/agent-<id>/` segment; NO Edit/Write tool on source; NEVER `cd` into main (use
`git -C "$WORKTREE_ROOT"` + `bun --cwd "$WORKTREE_ROOT"`); first commit embeds `pwd`.
Maps `.claude/maps/primary.map.md` reflect `09f74bee`; report maps-consulted feedback.

================================================================================
# WORK (the S147 match-arrow landing is your template — study commit f444290a's shape)
================================================================================
## Step 1 — Parser (ast-builder.js ~5757-5800, the `given-guard` node)
The standalone given-guard is parsed at `compiler/src/ast-builder.js` ~line 5760 (`tok.text === "given"`
→ `kind: "given-guard"`, ~line 5800). It currently consumes `=>` as the separator. Accept `:>` ALSO
(canonical), keeping `=>` as a deprecated alias that parses identically. Record which glyph was used
(e.g. a `separatorGlyph: ":>" | "=>"` field on the given-guard node, mirroring how S147 preserved the
match-arm glyph — see `matchArrowGlyphAt` in ast-builder.js) so the lint + migrate can see it. Verify
the OLD `(x) =>` removed-form path (E-SYNTAX-043) + property-path path (E-SYNTAX-044) still fire.

## Step 2 — Lint W-GIVEN-ARROW-LEGACY (info, §34 — already in SPEC)
Mirror the S147 W-MATCH-ARROW-LEGACY emission (type-system.ts, where W-MATCH-ARROW-LEGACY fires). Fire
W-GIVEN-ARROW-LEGACY (info-severity → result.warnings) on every standalone given-guard whose
`separatorGlyph === "=>"`. SCOPED to the given-guard separator only — do NOT fire on JS arrows or on
in-match given-arms (those are W-MATCH-ARROW-LEGACY's job). Confirm severity:info partitions into
result.warnings (the W-/I- cross-stream rule).

## Step 3 — `bun scrml migrate --fix` (commands/migrate.js — extend rewriteMatchArmArrows or sibling)
S147 added AST-driven `rewriteMatchArmArrows` (commands/migrate.js ~L223). Extend `--fix` to ALSO
rewrite standalone given-guard `=>` → `:>` (AST-driven — find the given-guard node's separator span,
rewrite ONLY that offset; never a text replace, since `=>` is the lambda glyph). A sibling
`rewriteGivenGuardArrows` or an extension of the existing rule — your call; keep it AST-driven +
byte-safe. Report the migration count separately (like the arm-arrow count).

## Step 4 — Tests (`compiler/tests/unit/given-arrow-legacy-c1.test.js` or similar)
- PARSE: `given x :> { body }` parses → given-guard node; `given x => { body }` ALSO parses
  (deprecated) → given-guard node with separatorGlyph "=>"; multi-var `given x, y :> {}` too.
- LINT: `given x => {}` fires W-GIVEN-ARROW-LEGACY (in result.warnings); `given x :> {}` does NOT;
  a JS arrow `(x) => x` does NOT; an in-match `given u => {}` fires W-MATCH-ARROW-LEGACY NOT
  W-GIVEN-ARROW-LEGACY (no double-fire / no cross-contamination).
- MIGRATE: `migrate --fix` rewrites `given x => {}` → `given x :> {}` byte-exactly; lambdas +
  fn-returns untouched; idempotent (re-run = no-op).
- CODEGEN: `given x :> {}` and `given x => {}` emit IDENTICAL JS (separator is parse-only — zero
  codegen cost, exactly like the match-arrow case). `node --check` clean.

## Step 5 — gate + clean terminal state
Commit per unit; update `docs/changes/match-given-colon-2026-05-31/progress.md`. Run FULL
`bun --cwd "$WORKTREE_ROOT" run test` before final commit (within-node parity may rebump if the
given-guard node gained a field — surgically rebump if benign, per S125). `git status --short` clean
before DONE.

# REPORT: WORKTREE_PATH · FINAL_SHA · FILES_TOUCHED · separatorGlyph field shape · lint no-double-fire
# confirmation · migrate count · codegen-identical confirmation · test counts · full-suite pass/fail/skip.
