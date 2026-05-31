# BRIEF — SPEC.md worked-example arm-arrow migration → `:>` (S148 match-tail)

Change-id: `spec-arm-arrow-migration-2026-05-31`. Agent: scrml-js-codegen-engineer · isolation: worktree · model: opus.

Migrate the match-arm + `!{}`-handler-arm separators in `compiler/SPEC.md`'s worked-example
```scrml fenced blocks from the deprecated `=>` / `->` to the canonical `:>` (S145/S147 ratification,
SPEC §18.2 / §19 / §34 W-MATCH-ARROW-LEGACY). SPEC.md is NOT compiled by any test (the doc-gate does
not extract SPEC fenced blocks), so this is a documentation-correctness pass — but it is the NORMATIVE
SPEC (Rule 4), so PRECISION is mandatory and OVER-migration (touching a non-arm `=>`/`->`) is worse
than under-migration. When unsure, DO NOT FLIP — list it for PA instead.

================================================================================
# STARTUP (S99: 20 prior leaks) + PATH DISCIPLINE
================================================================================
1. `pwd` MUST start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-` → WORKTREE_ROOT.
2. `git -C "$WORKTREE_ROOT" rev-parse --show-toplevel` == WORKTREE_ROOT; `git status --short` clean.
3. `bun install` ; `bun run pretest`.
PATH DISCIPLINE (S99+S126): ALL edits via Bash (perl/python/heredoc) on WORKTREE-ABSOLUTE paths incl.
the `.claude/worktrees/agent-<id>/` segment; NO Edit/Write tool on `compiler/SPEC.md`; NEVER `cd` into
main (use `git -C "$WORKTREE_ROOT"`); first commit embeds `pwd`.

================================================================================
# SCOPE — exactly what flips, exactly what does NOT
================================================================================
FLIP (→ `:>`), ONLY inside ```scrml fenced code blocks in SPEC.md:
- A **`match` arm** separator: `<pattern> => <body>` / `<pattern> -> <body>` inside a `match expr { ... }`
  block (JS-style value-return match) OR a `<match for=Type>`-adjacent arm. Patterns include
  `.Variant`, `.Variant(payload)`, `::Variant`, `_`, `else`, `not`, `given x`, literal patterns.
  Includes match-in-`derived=` (`<engine derived=match @x { .A => .B  _ => .C }>` — those arms flip).
- An **`!{}` error-handler arm** separator: `| ::Variant arg => { ... }` / `-> { ... }` inside a
  `call() !{ ... }` block.

DO **NOT** TOUCH (any of these — over-migration is the worst outcome):
1. **Lambda / arrow-function `=>`:** `(x) => expr`, `x => expr`, `.map(c => ...)`, `.filter(x => ...)`,
   `{ (n) => <markup> }`, `() => loadTasks()`, snippet lambdas, event-handler arrows.
2. **`fn`-return `->`:** `fn name(args) -> Type`, `server function f()! -> Err`, `-> (not to User)`.
3. **Lifecycle `->`:** `(not -> string)` / `(.Draft -> .Published)` — legacy lifecycle annotation
   (migrated to `to` on a SEPARATE track; NOT an arm — leave it).
4. **Grammar productions that DOCUMENT the aliases:** e.g. `match-arm ::= arm-pattern (':>' | '=>' | '->') arm-body`,
   `given-guard ::= 'given' identifier-list (':>' | '=>') block`. These intentionally show `=>`/`->`.
5. **Legacy `<machine>` rule arrows (§51.1-§51.16):** `rule="event -> Variant"`, `.From => .To`,
   `.From after Ns => .To` — legacy `<machine>` event-arrow / temporal-rule syntax, a DIFFERENT
   deprecated surface (NOT the match/`!{}` arm separator). Leave them.
6. **Standalone `given x => body`** (§42.2.3 presence-guard NOT inside a match) — its `:>` compiler
   support is a SEPARATE in-flight dispatch; the §42.2.3 examples are already handled. Do NOT flip
   standalone given guards in this pass (you can't lint-verify them — the parser doesn't accept
   `given x :>` on this base yet).
7. **Prose / catalog rows / E-/W-code descriptions** mentioning `=>` or `->` (markdown text outside
   fenced ```scrml blocks). Untouched.

================================================================================
# METHOD — lint-oracle first, structural rules second, conservative always
================================================================================
1. **Enumerate.** Extract every `=>` and `->` occurrence INSIDE ```scrml fenced blocks in SPEC.md
   (track block start/end line + the occurrence line + surrounding context). Ignore occurrences in
   non-scrml fences (```text grammar productions, ```js, etc.) and in prose.
2. **Classify each** as ARM (flip) vs NON-ARM (leave) vs AMBIGUOUS (surface, don't flip), using:
   - **Lint oracle (authoritative where usable):** if a fenced block is a self-contained compilable
     fragment, write it to a temp `.scrml`, compile it with `bun "$WORKTREE_ROOT"/compiler/bin/scrml.js
     compile <tmp> --output-dir <tmp-out>`, and read the `W-MATCH-ARROW-LEGACY` diagnostics — they name
     the EXACT arm-separator positions (line/col). Those are the flips. (Many SPEC blocks are fragments
     and won't compile standalone — fall back to structural rules for those.)
   - **Structural rules:** ARM iff the separator sits at arm position inside a `match {…}` or `!{…}`
     block (pattern on the left: `.X` / `::X` / `_` / `else` / `not` / `given x` / `| ::X arg`).
     NON-ARM if preceded by `)` of a param list / a bare ident lambda head / a `fn … ` signature / a
     lifecycle paren `( … )` / a `<machine>` rule string.
3. **Flip** confirmed ARM separators to `:>` (preserve surrounding whitespace/alignment — re-align the
   column if the block uses aligned `=>` columns). Leave NON-ARM + AMBIGUOUS untouched.
4. **Verify:** re-extract + re-compile the compilable blocks you touched → ZERO residual
   `W-MATCH-ARROW-LEGACY` on them. Spot-check 5-10 flips by eye against the DO-NOT-TOUCH list.
5. **SPEC-INDEX:** if your edits shift line ranges materially, run `bun --cwd "$WORKTREE_ROOT" run
   scripts/regen-spec-index.ts`. (Pure in-place `=>`→`:>` is same-line-count, so ranges likely
   unchanged — regen only if a multi-char realignment changed line counts.)

================================================================================
# DELIVERABLE — a FLIP MANIFEST for PA review (load-bearing)
================================================================================
Write `docs/changes/spec-arm-arrow-migration-2026-05-31/FLIP-MANIFEST.md` listing EVERY flip:
`SPEC.md:<line> | <section §> | before: <…=>… > | after: <…:>… > | classified-by: lint|structural`.
And a separate AMBIGUOUS/SKIPPED list (occurrences you deliberately did NOT flip + why) so PA can
spot-check the boundary. This manifest IS PA's review surface — be complete.

# COMMIT: per-section or one commit; clean `git status` before DONE. Pre-commit hook runs (SPEC-only
# change — unit/integration/conformance unaffected; should pass). No --no-verify.
# REPORT: WORKTREE_PATH · FINAL_SHA · total flips · sections touched · ambiguous-skipped count ·
# lint-verify result · any SPEC-INDEX regen · the manifest path.
