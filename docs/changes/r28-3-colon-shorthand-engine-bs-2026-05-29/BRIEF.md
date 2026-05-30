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

# BUG R28-3 (HIGH, BS) — :-shorthand engine state-child + a // comment breaks block-splitting
**Symptom (PA-verified):** a `:`-shorthand engine state-child (`<Variant> : expr`) PRECEDED by a `//` markup comment breaks the block-splitter:
```
<program title="T">
${ type S:enum = { A, B } }
<div>
  // comment before colon-shorthand engine
  <engine for=S initial=.A>
    <A rule=.B> : "a"
    <B rule=.A> : "b"
  </>
  <p>x</p>
</div>
</program>
```
→ `W-PROGRAM-001` (BS loses the `<program>` root) + `E-CTX-001` (`</div>` tries to close `<A>`; `</program>` tries to close `<engine>`) + `E-CTX-003`. The SAME file WITHOUT the `//` comment compiles clean; the SAME file with bodied `</>` state-children (`<A rule=.B>"a"</>`) compiles clean. **The `//` comment is the standalone co-trigger.**

**Fix-locus:** `compiler/src/block-splitter.js` — the generic tag-stack scanner (R24-BUG-4 `adc0a70f` lineage). Survey how `//` markup comments are skipped AND how `:`-shorthand state-child bodies are bounded (`:` ... opener-`>`). The comment likely shifts the BS context/offset so the subsequent `:`-shorthand state-child isn't recognized as a proper open/close, unwinding the closer stack. (Diagnostic message is ALSO inaccurate — it implies a `` logic body that isn't present; fix if cheap.)

**FRAGILE — recurring BS-combinatorial-closer class.** Run the FULL pre-commit suite at EACH iteration step (adjacent shapes are well-covered and catch over-greedy/over-narrow scoping — the Bug 51-C multi-iteration lesson). STOP-and-report if the fix risks regressing other BS shapes.

**SPEC (Rule 4):** §51.0.I (`:`-shorthand state-child body) · §4.14 (`:`-shorthand grammar) · §27 (`//` universal comment).

**R26 Phase 3:** the minimal repro above WITH the `//` comment → MUST compile clean (no W-PROGRAM-001 / E-CTX). Also re-compile the R28 sources that used `:`-shorthand engines (/home/bryan-maclee/scrmlMaster/scrml-support/docs/gauntlets/gauntlet-r28/dev-4-svelte.scrml + dev-2-go.scrml) → no regression. Add a regression test (the //-comment + :-shorthand-engine fixture).
