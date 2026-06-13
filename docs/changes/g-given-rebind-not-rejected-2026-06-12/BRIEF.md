# BRIEF — g-given-rebind-not-rejected (LOW) — reject the SPEC-invalid `given name = expr :>` rebind with a clean diagnostic

change-id: `g-given-rebind-not-rejected-2026-06-12`
dispatched: S189 (2026-06-12) · agent: scrml-js-codegen-engineer · isolation: worktree

## MAPS — REQUIRED FIRST READ
Read `.claude/maps/primary.map.md` in full first. Task shape = **compiler-source bug fix** (parser-stage
diagnostic in ast-builder.js + a §34 row). Follow its Task-Shape Routing (expect primary + error + structure).
Map currency: maps reflect HEAD **1ad740b4**; HEAD is `80dcc995` — commits since are S188 wrap (docs) +
corpus migration + the S189 g-schemafor PA fix (protect-analyzer, unrelated to given-guard). Map content is
current-truth for the ast-builder/given-guard code. Verify specifics via grep/Read regardless.
Feedback: report "Maps consulted: [list]; load-bearing finding: <one sentence>" or "not load-bearing — [...]".

## CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE (S99 leak history — do not be the next)
Your worktree path = `pwd` at startup. BEFORE any other tool call:
1. `pwd` MUST start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`. If under any other
   repo, STOP + report (S90). Save as WORKTREE_ROOT.
2. `git -C "$WORKTREE_ROOT" rev-parse --show-toplevel` == WORKTREE_ROOT. 3. `git status --short` clean.
4. `bun install` (no inherited node_modules — pre-commit `bun test` fails without it). 5. `bun run pretest`.
**Path discipline (S99/S126 — IN FORCE):** apply ALL edits via Bash (`perl`/`python3`/heredoc) on
worktree-absolute paths including the `.claude/worktrees/agent-<id>/` segment — NOT Edit/Write. Echo the path
before each write; `git diff`/`grep` after. NEVER `cd` into the main repo; use `git -C "$WORKTREE_ROOT"`,
`bun --cwd "$WORKTREE_ROOT"`, worktree-absolute paths only. First commit message includes verbatim `pwd`.

## THE BUG (empirically confirmed at HEAD 80dcc995 — verify-before-claim)
SPEC §42.2.3: `given-guard ::= 'given' identifier-list (':>' | '=>') block`; normative prose (SPEC line 21476):
*"No variable is rebound to a new name; each identifier is narrowed in place."* So `given <name> = <expr> :>`
(rebind-with-`=`) is INVALID scrml — only `given <existingVar> :>` (narrow-in-place) is valid. The compiler
does NOT cleanly reject the rebind form, asymmetrically:
- **Logic/fn context** → emits invalid JS (`E-CODEGEN-INVALID-JS` — the "compiler defect, please report" path).
- **Markup `${}` interpolation context** → SILENTLY compiles (accepts the invalid form).

Reproducers (create in worktree):
```
// q1 — logic, named-rebind → currently E-CODEGEN-INVALID-JS; SHOULD be a clean §42.2.3 rejection
<program>
  <name>: string | not = not
  function show() { given n = @name :> { return n } }
  <p>x</p>
</program>
```
```
// qm — markup, named-rebind → currently SILENT-ACCEPT (exit 0); SHOULD be the SAME clean rejection
<program>
  <sel>: string | not = not
  <div>${ given s = @sel :> <p>${s}</p> }</div>
</program>
```
```
// q3 — canonical narrow-in-place → MUST stay CLEAN (regression guard)
<program>
  <name>: string | not = not
  function show() { given @name :> { return @name } }
  <p>x</p>
</program>
```

## FIX LOCUS (grounded — survey to confirm/refine, Rule 4 + don't-preclassify)
The given-guard is parsed at TWO sites in `compiler/src/ast-builder.js`, both producing `kind:"given-guard"`:
- **~line 6655** (one context) and **~line 10847** (the other — the loud/silent asymmetry comes from the two
  sites handling the binding differently).
Both collect identifiers in a `while (peek().kind === "IDENT" || peek().kind === "AT_IDENT")` loop, and BOTH
ALREADY reject property-paths right there: after collecting an ident, `if (peek() is PUNCT ".")` → fire
`E-SYNTAX-044` ("`given` takes bare identifiers, not property paths"). **The rebind `= expr` is the exact
sibling shape** — add, immediately adjacent to that property-path check at BOTH sites: after collecting an
ident, if `peek()` is a PUNCT `=` (assignment; NOT `==`/`=>`/`:>`), fire a clean diagnostic and recover.

Type-system also handles `given-guard` (`type-system.ts` ~9745 + ~20403) — if the parse-stage rejection is
cleaner placed there for one context, survey it; but the parser-loop placement (mirroring E-SYNTAX-044) is the
recommended single consistent locus covering BOTH logic + markup.

**Diagnostic:** Rule 4 — read §42.2.3 + §34. Pick the code: prefer a NEW dedicated code (e.g.
`E-GIVEN-REBIND` — cross-ref §42.2.3) OR, if cleaner, extend `E-SYNTAX-044`'s scope to cover both
property-paths AND rebinds (its message is currently property-path-specific). Message must cite §42.2.3, state
"`given` narrows in place; `given <name> = <expr>` is not a rebind," and name the fix: declare a `const`/`let`
first (`let n = …` then `given n :>`), or use `given <existingVar> :>`. Add the §34 catalog row in the SAME
commit (SPEC normative, Rule 4). Disambiguation: do NOT fire on `==` (equality), `=>` (deprecated guard
separator — that's `W-GIVEN-ARROW-LEGACY`), or `:>` (canonical separator). Only a top-level single `=` after a
given-bound identifier.

## COMMIT DISCIPLINE (S83 two-sided) + coupled code+test = ONE commit
Commit per change (`git -C "$WORKTREE_ROOT"`), WIP commits expected; `git status` clean before DONE. Update
`docs/changes/g-given-rebind-not-rejected-2026-06-12/progress.md` per step (append-only, timestamped).

## PHASE 3 — EMPIRICAL VERIFICATION (mandatory; no DONE without it)
1. q1 (logic rebind) → now fires the clean §42.2.3 diagnostic (NOT E-CODEGEN-INVALID-JS).
2. qm (markup rebind) → now fires the SAME clean diagnostic (was silent-accept).
3. q3 (canonical `given @var :>`) → STILL clean (no regression).
4. `given x, y :>` multi-identifier narrow-in-place → STILL clean. `given x => ...` → still only `W-GIVEN-ARROW-LEGACY` (don't double-fire). A `given`-arm inside a `match`/`!{}` → unaffected.
5. Add a regression test (the 4 cases above). Run the relevant test dir green.
6. Pre-commit subset green (`bun test compiler/tests/{unit,integration,conformance} --bail`).

## REPORT BACK
WORKTREE_PATH, FINAL_SHA, FILES_TOUCHED, chosen diagnostic code + placement (one site or two; parser vs typer)
+ why, Phase-3 results (exit + code per case), §34 row added, test delta, deferrals, MAPS feedback line.
