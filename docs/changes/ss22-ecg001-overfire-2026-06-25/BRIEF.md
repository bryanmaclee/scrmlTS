# Dispatch BRIEF — ss22 item 3: g-ecg001-protect-invariant-overfire (MED)

**Agent:** scrml-js-codegen-engineer · **isolation:** worktree · **model:** opus · **change-id:** ss22-ecg001-overfire-2026-06-25
**Land target (sPA-side):** `spa/ss22`. **Stated base:** origin/main `cf9f1109`.

ONE gap: `E-CG-001` "protected field in client JS" FALSE-fires on a field NOT in the final client bundle — the invariant scan reads a STALE pre-transform snapshot. Locus `compiler/src/codegen/emit-client.ts ~L2191-2203`.

---

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE
## Startup (BEFORE any other tool call)
1. `pwd` MUST start with `/home/bryan-maclee/scrmlMaster/scrml/.claude/worktrees/agent-`. Else STOP (CWD-routing). Save WORKTREE_ROOT.
2. `git rev-parse --show-toplevel` == WORKTREE_ROOT.
3. **BASE-CURRENCY (S112):** `git -C "$WORKTREE_ROOT" fetch origin --quiet && git -C "$WORKTREE_ROOT" merge origin/main` (FF). Then `git -C "$WORKTREE_ROOT" merge-base --is-ancestor 538df06d HEAD` MUST succeed. Non-clean FF → STOP.
4. `git status --short` clean. 5. `bun install`. 6. `bun run pretest`. Baseline = `bun run test` (NOT bare `bun test`).
If ANY check fails: STOP, report, exit.

## Path discipline (EVERY edit)
- **S126:** edits via **Bash** (`perl`/`python3`/heredoc) on worktree-absolute paths with `.claude/worktrees/agent-<id>/` — NOT Edit/Write. Echo path; re-verify `git diff`/`grep`.
- **NEVER `cd` into main.** `git -C "$WORKTREE_ROOT"` only. **Commit-message file:** UNIQUE name (`msg-<agentid>-ecg001.txt`), not bare `commitmsg.txt` (S220).

## Commit discipline
- ONE commit (fix + coupled test). Clean tree before DONE. NEVER `--no-verify` (full hook ~108–180s; allow 300s).

---

## The gap (reproduce RED first)
`emit-client.ts ~L2191-2203` enforces the E-CG-001 invariant ("a `protect=` field must not appear in client JS") by scanning a snapshot of the client code. That snapshot is taken BEFORE the later transforms that STRIP the protected field from the bundle → the scan sees a field that is gone by the final bundle → false E-CG-001. It's a CHECK-ORDERING false-positive, NOT a real leak.

**Reproduce RED:** construct a program where a `protect=` field appears in a pre-transform position but is removed/not-emitted in the FINAL client bundle (e.g. consumed only server-side, or stripped by a later pass), and observe E-CG-001 fire spuriously. Confirm via the FINAL bundle that the field is genuinely absent (no real leak).

## Fix direction
Move/retarget the E-CG-001 invariant scan to run against the FINAL (post-transform) client bundle — scan the bytes that actually ship, not the stale pre-transform snapshot. The invariant must STILL fire on a GENUINE leak (a protected field that survives into the final bundle). Do NOT weaken the check — only fix WHAT it scans (final vs stale).

## Test (RED first)
- The false-fire repro now compiles clean (no E-CG-001) AND the final bundle genuinely lacks the protected field.
- **Regression (load-bearing):** a GENUINE protected-field-in-final-client-bundle leak STILL fires E-CG-001 (construct one — e.g. a protected field actually interpolated into client markup). This is the safety invariant; it must not regress.
- Paste RED (spurious fire) + GREEN, and the genuine-leak-still-fires proof.

## Verification
- `bun run test` GREEN, 0 regressions vs baseline (report counts; pre-existing within-node `[over-budget] login.scrml residual 7` + bug-51-flaky-timeout are KNOWN — confirm they match base, don't attribute to your change).
- R26: recompile both repros (false-fire gone; genuine leak caught).

## Scope boundaries
- ONLY the E-CG-001 scan-target (stale→final). Do NOT redesign the protect mechanism or the transform pipeline.
- Blast radius beyond the scan retarget → STOP + report.

## Report back
FINAL MESSAGE = structured return to sPA: commit SHA, RED→GREEN, the emit-client.ts diff, the genuine-leak-still-fires proof, clean-tree confirmation, agent branch + tip SHA, base SHA after origin/main merge.
