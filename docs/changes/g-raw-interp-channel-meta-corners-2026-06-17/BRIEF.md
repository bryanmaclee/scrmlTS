# BRIEF — g-raw-interp-channel-meta-corners (S203 dispatch, agent abcf64f7198fe9cf3)

Verbatim dispatch prompt (scrml-js-codegen-engineer · isolation:worktree · opus · background):

---

Fix `g-raw-interp-channel-meta-corners` (MED): literal `${...}` survives raw into the rendered DOM in three codegen emission paths the S202 B fix (`d830ec59`) did NOT cover. change-id: `g-raw-interp-channel-meta-corners-2026-06-17`.

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE (S99 has had path-discipline leaks; do NOT be the next)

## Startup verification (BEFORE any other tool call)
1. `pwd` via Bash. Save as WORKTREE_ROOT. It MUST start with `/home/bryan-maclee/scrmlMaster/scrml/.claude/worktrees/agent-`. If it is under any other repo (e.g. `scrml-support/` or `scrml-deputy-maint`), STOP and report — that is the S90 CWD-routing failure.
2. `git -C "$WORKTREE_ROOT" rev-parse --show-toplevel` MUST equal WORKTREE_ROOT.
3. `git -C "$WORKTREE_ROOT" merge main` (your base may be a session-start commit behind current main; merge it — S112).
4. `git -C "$WORKTREE_ROOT" status --short` — confirm clean (post-merge).
5. `cd "$WORKTREE_ROOT" && bun install` (worktrees don't inherit node_modules; the pre-commit hook's bun test fails without it).
6. `bun run pretest` (populates samples/compilation-tests/dist/ for browser tests).

## Path discipline (EVERY edit)
- Apply edits via **Bash** (`perl`/`python3`/heredoc) on **worktree-absolute paths** that include the `.claude/worktrees/agent-<id>/` segment — NOT the Edit/Write tools, and NEVER a main-rooted path. Echo the target path before each write; re-verify via `git -C "$WORKTREE_ROOT" diff` after.
- NEVER `cd` into the main repo (or anywhere outside WORKTREE_ROOT). Use `git -C "$WORKTREE_ROOT"`, `--cwd "$WORKTREE_ROOT"` for bun, and worktree-absolute paths exclusively.
- Your first commit message MUST include the verbatim `pwd` output: `WIP(raw-interp): start at <pwd>`.

If ANY startup check fails: STOP and report. Do not proceed.

# MAPS — REQUIRED FIRST READ
Before any other context, read `.claude/maps/primary.map.md` in full (~100 lines). Its "Task-Shape Routing" section names the maps for your task shape — this is a **compiler-source bug fix** (codegen). Follow that routing.
Map currency: maps reflect HEAD `60d547e1` as of 2026-06-17. Every commit since is doc-only (no `compiler/src` or `stdlib` touched), so the maps are CURRENT for codegen — trust them.
In your final report include either "Maps consulted: [list]; load-bearing finding: <one sentence>" or "Maps consulted but not load-bearing."

# THE BUG (verified reproducers — confirmed firing on the current build via the render-map harness)

`S-RAW-INTERP` = a literal `${x}` survives into the rendered DOM text/attr instead of being interpolated. Three sources, all `#empty` seed, all confirmed today:
- `samples/compilation-tests/gauntlet-s20-channels/channel-basic-001.scrml` → `${msg}` raw in text
- `samples/compilation-tests/gauntlet-s20-channels/channel-multiple-001.scrml`
- `samples/compilation-tests/gauntlet-s19-phase2-control-flow/phase2-for-lift-outside-logic-109.scrml`

Verify each yourself first (R26 reverse — confirm the symptom before fixing):
```
cd "$WORKTREE_ROOT/compiler/tests/e2e-render-map"
bun observe-one.js samples/compilation-tests/gauntlet-s20-channels/channel-basic-001.scrml empty
```
→ expect `"smells":["S-RAW-INTERP"]` with a `${...}` sample.

## The fix template — mirror the S202 B fix into the uncovered paths
`git -C "$WORKTREE_ROOT" show d830ec59` is the template. Its LAYER 2 (`compiler/src/codegen/emit-lift.js` + `emit-each.ts`) lowered `${}` inside a string-literal markup attr/body to a REAL interpolated expression for the each/lift markup-emitter path. **The SAME raw-`${}` class survives in three OTHER emission paths** — find the analogous emit sites and apply the analogous lowering:
1. **channel-body** emission (the `<channel>` body renderer — `channel-basic-001` / `channel-multiple-001`).
2. **for-lift-outside-logic** emission (`phase2-for-lift-outside-logic-109` — a `for … lift` outside a logic block).
3. **meta** emission path (the gap also names meta; verify whether a meta-path source still raw-interps — `samples/compilation-tests/gauntlet-s20-meta/meta-in-component-001.scrml` is a candidate; if it does NOT reproduce S-RAW-INTERP, note that and scope meta OUT, don't invent a fix).

You are AUTHORIZED to correct the touchpoint if the survey shows a different/shared emitter is the right fix site (depth-of-survey discount — don't rigidly assume my named files). The principled fix is wherever `${}`-in-rendered-content is emitted raw rather than lowered to interpolation.

# PHASE 3 — EMPIRICAL R26 VERIFICATION (MANDATORY — do NOT mark DONE without this)
After the fix, re-run the harness on each affected source:
```
cd "$WORKTREE_ROOT/compiler/tests/e2e-render-map"
for f in samples/compilation-tests/gauntlet-s20-channels/channel-basic-001.scrml samples/compilation-tests/gauntlet-s20-channels/channel-multiple-001.scrml samples/compilation-tests/gauntlet-s19-phase2-control-flow/phase2-for-lift-outside-logic-109.scrml; do
  echo "$f:"; bun observe-one.js "$f" empty | grep -o '"smells":\[[^]]*\]'
done
```
PASS = `S-RAW-INTERP` is GONE from each (no `${` in rendered text). Also add a focused regression test (unit or browser) asserting the lowered interpolation for at least the channel-body + for-lift paths. Run the pre-commit subset (`bun test compiler/tests/unit compiler/tests/integration compiler/tests/conformance`) — 0 fail before reporting.

# COMMIT DISCIPLINE (S83 two-sided rule)
After EACH edit: `git -C "$WORKTREE_ROOT" diff <file>` to verify, then `git -C "$WORKTREE_ROOT" add <file> && git -C "$WORKTREE_ROOT" commit`. Don't batch — commit per emission-path fix. Before reporting DONE, `git -C "$WORKTREE_ROOT" status` MUST be clean (no uncommitted changes). "work in worktree, no commits" is NOT an acceptable terminal report.

# FINAL REPORT
Report: WORKTREE_ROOT (= pwd), FINAL_SHA, FILES_TOUCHED, the Phase-3 observe-one results (before/after smells per source), whether the meta path reproduced (fixed or scoped-out-with-reason), pre-commit pass/fail count, and the Maps feedback line. SPEC: no change expected (this is a codegen lowering fix, not a language change) — if you believe a SPEC clause is implicated, flag it, don't edit SPEC.
