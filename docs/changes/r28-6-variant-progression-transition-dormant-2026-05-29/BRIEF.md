# DISPATCH CONTEXT
You are a scrml compiler-source bug fix (gauntlet R28 fix-wave, S143). Baseline: scrmlTS HEAD `eda211f2` (v0.6.11; emitted-JS parse gate DEFAULT-ON). You work in an `isolation: "worktree"` checkout.

# MAPS — currency note
Maps at `.claude/maps/primary.map.md` reflect HEAD `9ab7aa38`; current HEAD `eda211f2` is 12 commits ahead (S142 errorBoundary/gate-flip + R28 docs — NONE touched your fix file). Read primary.map.md §Task-Shape Routing (compiler-source bug fix) as a STARTING HYPOTHESIS; verify against current source via grep/Read.

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE
S99 has had FOUR path-discipline leaks + S126 had FOUR Edit/Bash-divergence leaks; a leak here would be the next incident. Hold the line.
1. `pwd` — MUST start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`. If under any other repo (e.g. scrml-support) → STOP and report (S90 CWD-routing failure). Save as WORKTREE_ROOT.
2. `git -C "$WORKTREE_ROOT" rev-parse --show-toplevel` MUST equal WORKTREE_ROOT.
3. `git -C "$WORKTREE_ROOT" status --short` clean.
4. `git -C "$WORKTREE_ROOT" merge main` (your base may be a session-start snapshot; merge current main — should be clean/fast-forward).
5. `cd "$WORKTREE_ROOT" && bun install` (worktrees don't inherit node_modules).
6. `bun run pretest` (populates samples dist for browser tests).
7. Your FIRST commit message MUST include the verbatim `pwd` output: `WIP(<task>): start at <pwd>`.

## Path discipline (MANDATORY — S126):
- Apply ALL file edits via Bash (`perl -i -pe` / `python3` / `cat > heredoc`) on WORKTREE-ABSOLUTE paths containing the `.claude/worktrees/agent-<id>/` segment. Do NOT use the Edit/Write tools for source files (they leaked to MAIN — S126). Echo the target path before each write; re-verify with `git -C "$WORKTREE_ROOT" diff` after.
- NEVER `cd` into the main repo or anywhere outside WORKTREE_ROOT for writes/installs/compiles. Use `git -C "$WORKTREE_ROOT"`, `bun --cwd "$WORKTREE_ROOT"`, worktree-absolute paths. Reading docs from main (e.g. the R28 dev sources in scrml-support) is READ-ONLY and fine.

# COMMIT DISCIPLINE (S83 two-sided)
After EVERY edit: `git -C "$WORKTREE_ROOT" diff <file>`; `git -C "$WORKTREE_ROOT" add <file>`; commit IMMEDIATELY. Don't batch. Before reporting DONE: `git -C "$WORKTREE_ROOT" status` MUST be clean. Do NOT use `--no-verify` — if the pre-commit gate fails on an env race, STOP and report, never bypass.

# PHASE 3 — R26 EMPIRICAL VERIFICATION (S138 — MANDATORY before DONE)
This fix relies on the real compile path; AST-synthesizing regression tests can pass while the real path stays broken. Before claiming DONE you MUST re-compile the real R28 adopter source(s) + a minimal repro on your POST-FIX baseline and confirm the symptom is gone AND no new symptom appears (see per-bug commands). Compile via `cd "$WORKTREE_ROOT" && bun compiler/bin/scrml.js compile <file> --output-dir /tmp/r28fix-<id>/out` (gate is ON). DO NOT mark DONE without R26 passing.

# REPORT (final message, structured)
WORKTREE_PATH · BRANCH · FINAL_SHA · FILES_TOUCHED · REGRESSION-TESTS-ADDED (file + count) · R26-RESULT (the compile/grep evidence) · STOPPED? (if the fix risks regressing other shapes, STOP and report the survey rather than force it) · MAPS-FEEDBACK (load-bearing finding, or "not load-bearing").

# BUG R28-6 (HIGH) — variant-progression transition() enforcement DORMANT on the .get() return path
**Symptom (PA-verified):** a server fn with a variant-progression lifecycle return whose body returns a loosely-typed SQL row:
```
server function publishArticle(id: integer) -> (.Draft to .Published) {
  const a = ?{`SELECT * FROM articles WHERE id = ${id}`}.get()
  return a as .Published
}
function badCaller(id: integer) {
  const a = publishArticle(id)
  if (a is .Draft) { @x = a.publishedAt }   // NO transition(a) — SHALL fire E-TYPE-LIFECYCLE-VARIANT-NOT-TRANSITIONED
}
```
compiles exit-0 with NO diagnostic. SPEC §14.12.6.2 / §14.12.10 normatively REQUIRE `E-TYPE-LIFECYCLE-VARIANT-NOT-TRANSITIONED` on post-transition field access without `transition()`. The mechanism IS wired (an enum-payload-variant construction fires it) but the lifecycle annotation is LOST when the body returns a loosely-typed `.get()` SQL row.

**Fix-locus:** `compiler/src/type-system.ts` — the variant-progression per-access lifecycle tracker (grep `VARIANT-NOT-TRANSITIONED`, the §14.12.6 hybrid mechanism, function-return lifecycle attachment). The fix: the function-return lifecycle annotation must attach to the CALLER's binding from the DECLARED return type `(.Draft to .Published)`, regardless of the body's inferred return type (the `.get()` row).

**CRITICAL — DO NOT OVER-FIRE (verify all three, else STOP-and-report):**
1. The CORRECT path (`transition(a)` before `a.publishedAt`) MUST still compile clean — no false positive.
2. presence-progression `(not to T)` returns discriminated via `given`/`if (a is not) return`/`match` MUST still compile clean (discrimination IS transition, §14.12.6.1) — unaffected.
3. The R28 dev sources (dev-1-react/dev-3-elixir/dev-5-pascal used `transition()` CORRECTLY) MUST still compile clean.

**SPEC (Rule 4):** §14.12.6.2 (variant-progression — explicit transition()) · §14.12.10 (normative SHALL-fire) · §14.12.6.1 (presence-progression — discrimination IS transition; do NOT regress).

**R26 Phase 3:** create a tiny press.db via `bun -e` + bun:sqlite (CREATE TABLE articles(id INTEGER PRIMARY KEY, body TEXT, publishedAt INTEGER)) in /tmp to avoid E-PA-002. Build 3 repros: (a) dormant/no-transition → MUST now fire E-TYPE-LIFECYCLE-VARIANT-NOT-TRANSITIONED; (b) correct/with-transition → MUST compile clean; (c) presence-progression `(not to T)` via given → MUST compile clean. Re-compile /home/bryan-maclee/scrmlMaster/scrml-support/docs/gauntlets/gauntlet-r28/dev-1-react.scrml + dev-3-elixir.scrml + dev-5-pascal.scrml (with their own press.db) → no regression. Add regression tests.
