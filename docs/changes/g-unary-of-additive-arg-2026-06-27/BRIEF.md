<!-- S136 BRIEF archival. Dispatched S227 2026-06-27 via scrml-js-codegen-engineer, isolation:worktree, opus, run_in_background. agentId af1cfae3bbb740f36 (re-dispatch; the first dispatch a22fb7619506c17e4 STOP-reported on omitted-isolation/no-worktree — S88, zero work lost). Worktree based cf1471dd; SendMessage'd a `git merge main`→67ed2103 currency correction for the refreshed maps. -->

# TASK — fix HIGH `g-unary-of-additive-arg` (silent wrong-value miscompile)

change-id: `g-unary-of-additive-arg-2026-06-27`

## The bug (HIGH — silent wrong-value, the worst class)
`emitUnary` in `compiler/src/codegen/emit-expr.ts` drops the parens around a lower-precedence argument of a prefix unary. `-(2 + 3)` emits `-2 + 3` (value **1**, should be **-5**); `-(2 - 3)` emits `-2 - 3` (value **-5**, should be **1**). This ships VALID JS, so it is a SILENT wrong-value miscompile (exit 0, no diagnostic). Multiplicative args are coincidentally correct (negation distributes), `**` was already fixed (see sibling below).

## The fix
`emitUnary` must parenthesize **any** argument whose top operator binds **looser** than the prefix unary operator — additive (`+`/`-`), relational, equality, logical, ternary, etc. — **precisely**: do NOT over-wrap an argument that already binds tighter (e.g. `a + -b` where the unary's arg is just `b`; `-a * b`; `-(a)`). Use the AST precedence of the argument's top node vs the prefix-unary precedence — wrap iff arg-precedence is looser. Apply to ALL prefix unaries (`-`, `+`, `~`, `!`, `typeof`, `void`) since `<op> X <looser-op> Y` mis-associates for all of them.

## Pattern-to-mirror (the sibling, just landed)
ss50 item-2 (commit `1eb8ada5`) fixed the `**`-argument case in this SAME `emitUnary` — `emitUnary` now wraps a `**`-binary argument (`-(2**3)` → `-(2**3)` not `-2**3`). Read that change first (`git show 1eb8ada5 -- compiler/src/codegen/emit-expr.ts`); your fix GENERALIZES it from the `**`-only special case to the full looser-binds-than-unary class. **Leave the ss21 left-operand guard (`(-2)**3`) intact** — that's the operand-side sibling, do not touch it.

## Verification — MANDATORY (this is a HIGH codegen bug → S138 R26 doctrine)
1. Unit/regression tests in `compiler/tests/` covering: `-(2+3)`→-5, `-(2-3)`→1, `-(a+b)`, relational/equality/logical/ternary args, ALL prefix unaries, chained, mixed, AND the no-over-wrap cases (`a + -b`, `-a*b`, `-(a)`, `(-2)**3` ss21-intact, `-(2**3)` ss50-intact). Lock both directions (fires + does-not-over-fire).
2. **R26 empirical (mandatory before DONE):** construct a small real `.scrml` source exercising `-(2+3)` in a reactive/render position, compile it via `bun "$WORKTREE_ROOT"/compiler/bin/scrml.js compile <file> -o /tmp/r26-gunary/`, `node --check` the emitted JS, and confirm the emitted expression is `-(2 + 3)` (or evaluates to -5) — NOT `-2 + 3`. Report the before/after emitted shape.
3. Run the FULL `bun run test` (not just the pre-commit subset — the parity canary + browser/lsp live only in the full suite) before reporting DONE.
**DO NOT mark DONE without R26 empirical verification passing.**

## MAPS — REQUIRED FIRST READ
Before any other context, read `.claude/maps/primary.map.md` in full (~100 lines). Its "File Routing" / Task-Shape Routing tells you which additional maps to consult for a compiler-source codegen fix (→ schema.map.md for AST shapes, error.map.md, structure.map.md). Map currency: maps are current as of HEAD `67ed2103` (your base; 67ed2103 is a docs/maps-only commit on top of cf1471dd — compiler source unchanged, maps reflect it). In your final report include: "Maps consulted: [list]; load-bearing finding: <one sentence>" OR "Maps consulted but not load-bearing."

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE
## Startup (BEFORE any other tool call)
1. `pwd` via Bash. Output MUST start with `/home/bryan-maclee/scrmlMaster/scrml/.claude/worktrees/agent-`. If it's under any other repo (e.g. `scrml-support/.claude/worktrees/`), or it is the bare main checkout (`/home/bryan-maclee/scrmlMaster/scrml`), STOP and report — wrong/no worktree. Save the output as WORKTREE_ROOT.
2. `git rev-parse --show-toplevel` MUST equal WORKTREE_ROOT.
3. `git status --short` — confirm clean (NOTE: `compiler/tests/unit/gauntlet-s20/__fixtures__/import-resolution/*.scrml` may show as deleted after you run the suite — that is a known pre-existing test side-effect, NOT your change; ignore it).
4. `bun install` (worktrees don't inherit node_modules).
5. `bun run pretest` (populates `samples/compilation-tests/dist/` for browser tests).
If any check fails: STOP and report.
## Path discipline (EVERY edit)
- Per S126: apply file edits via Bash (`perl`/`python3`/heredoc/`cp`) on WORKTREE_ROOT-absolute paths that include the `.claude/worktrees/agent-<id>/` segment — NOT the Edit/Write tools. Echo the target path before each write; re-verify with `git diff`/`grep` after.
- NEVER use a path starting with the bare main repo root (`/home/bryan-maclee/scrmlMaster/scrml/compiler/...`). NEVER `cd` into the main repo. Use `git -C "$WORKTREE_ROOT"`, `bun --cwd "$WORKTREE_ROOT"`, worktree-absolute paths only.

# Commit discipline (S83)
After EVERY edit: `git diff <file>` to verify; `git add <file>`; commit IMMEDIATELY (don't batch — commit per sub-bucket). Your first commit message MUST include the verbatim `pwd` output (e.g. `WIP(g-unary): start at <pwd>`). Before reporting DONE: `git status` MUST be clean (commit everything). "work in worktree, no commits" is NOT an acceptable terminal report.

# Final report
WORKTREE_PATH · FINAL_SHA · FILES_TOUCHED · the before/after emitted JS for `-(2+3)` (R26) · full-suite pass/fail counts · maps feedback · any deferred items. Files in scope: `compiler/src/codegen/emit-expr.ts` + new test file(s). This is write-DISJOINT from a parallel native-parser dispatch — do NOT touch `compiler/native-parser/*` or `meta-eval.ts`.
