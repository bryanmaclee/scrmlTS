# BRIEF — high-deepset-write-loss-2026-06-06 (S167)

Dispatched: scrml-js-codegen-engineer · model opus · isolation:worktree · run_in_background
Baseline at dispatch: HEAD `e0269548`; maps watermark `9d12d980` (source-current).
Verbatim `prompt:` text below.

---

You are fixing a HIGH-severity compiler bug in the scrml compiler (scrmlTS). Change-id: `high-deepset-write-loss-2026-06-06`.

# MAPS — REQUIRED FIRST READ

Before consuming any other context (SPEC sections / source files), read `.claude/maps/primary.map.md` in full (~100 lines). The §"Task-Shape Routing" section tells you which additional maps to consult — this is a **compiler-source bug fix** (parser/ast-builder layer). Follow that routing.

Map currency: maps reflect HEAD `9d12d980` as of 2026-06-05. HEAD is now `e0269548` but the only commits past the map watermark are docs/maps/wrap (no compiler source), so the map content is **source-current** — trust it for this task.

Feedback: in your final report, include either "Maps consulted: [list]; load-bearing finding: <one sentence>" or "Maps consulted but not load-bearing — [which map you expected to help but didn't]". Either answer is valuable signal.

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE (S99 has had path-discipline leaks; do NOT be the next incident)

Your worktree is assigned by the harness. Before ANY other tool call:

## Startup verification (Bash)
1. `pwd` — MUST start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`. If it's under any other repo (e.g. `scrml-support/.claude/worktrees/`), STOP and report — that's the S90 CWD-routing failure. Save the output as WORKTREE_ROOT.
2. `git -C "$WORKTREE_ROOT" rev-parse --show-toplevel` MUST equal WORKTREE_ROOT.
3. `git -C "$WORKTREE_ROOT" merge --ff-only main` (S112 — your worktree base may be stale at session-start; fast-forward to current main first). If it can't ff, `git -C "$WORKTREE_ROOT" merge main`. Then `git -C "$WORKTREE_ROOT" status --short` — confirm clean.
4. `bun install --cwd "$WORKTREE_ROOT"` (worktrees don't inherit node_modules; the pre-commit `bun test` fails with "cannot find package 'acorn'" otherwise).
5. `bun --cwd "$WORKTREE_ROOT" run pretest` (populates `samples/compilation-tests/dist/` — gitignored; full `bun test` produces ~130 ECONNREFUSED failures without it). Use `bun --cwd "$WORKTREE_ROOT" run test` (chains pretest) for full-suite baseline, NOT bare `bun test`.

If ANY check fails: STOP and report.

## Path discipline (S126 interim mitigation — IN FORCE)
- **Apply ALL file edits via Bash** (`perl -i` / `python3` / `cp` / heredoc) on **worktree-absolute paths that include the `.claude/worktrees/agent-<id>/` segment** — NOT the Edit/Write tools. The Edit/Write tools have leaked into PRIMARY MAIN twice (S126 #12/#13); Bash writes go where `pwd`/`git` resolve, sidestepping the divergence. Echo the target path before each write; re-verify via `git diff` / `grep` after.
- **NEVER `cd` into the main repo** (or anywhere outside WORKTREE_ROOT). Use `--cwd "$WORKTREE_ROOT"` (bun), `git -C "$WORKTREE_ROOT"`, and worktree-absolute paths exclusively. A `cd` into main leaks `bun add` / compile / run output into main (S126 #14/#15).
- Your FIRST commit message must embed your verified pwd: `WIP(deepset): start at $(pwd)`.

# COMMIT DISCIPLINE (S83 two-sided rule)
- After EVERY edit: `git -C "$WORKTREE_ROOT" diff <file>` to verify; `git -C "$WORKTREE_ROOT" add <file>`; commit IMMEDIATELY. Don't batch — commit per fix / per test-add. WIP commits expected (crash-recovery).
- Before reporting DONE: `git -C "$WORKTREE_ROOT" status --short` MUST be clean. "HEAD unchanged — work in worktree, no commits" is NOT an acceptable terminal report.
- Update `docs/changes/high-deepset-write-loss-2026-06-06/progress.md` (worktree-absolute path) after each step — append-only, timestamped: what you did, what's next, blockers.
- `--no-verify` is FORBIDDEN (pre-commit AND pre-push). If the hook fails, diagnose the real cause.

# THE BUG (HIGH — confirmed PA-independently on HEAD e0269548)

**Symptom:** consecutive dotted-path deep-set writes (`@obj.field = value`, AST kind `reactive-nested-assign`) inside a `function` body are SILENTLY DROPPED at codegen. Exit 0, no diagnostic. Lost mutations.

**PA reproduction (verified):** the reproducer is at `/home/bryan-maclee/scrmlMaster/scrmlTS/docs/changes/high-deepset-write-loss-2026-06-06/repro-multi-deepset.scrml` (read-only; also in main). Body:
```
<a>
    <ref> = ""
</>
<c> = 0
function multi() {
    @c = 1
    @a.ref = "p"
    @c = 2
    @a.ref = "q"
}
<button onclick=multi()>go</button>
<p>${@c} ${@a.ref}</p>
```
Compile: `bun --cwd "$WORKTREE_ROOT" "$WORKTREE_ROOT"/compiler/bin/scrml.js compile <repro> --output-dir /tmp/<your-dir>`. The emitted `_scrml_multi_*()` contains ONLY `_scrml_reactive_set("c", 1); _scrml_reactive_set("c", 2);` — BOTH `@a.ref` deep-sets vanish.

**EXACT characterization (I pinned the trigger boundary across 7 cases — use these as your regression matrix):**

| function body | emitted |
|---|---|
| `[deep]` (single) | `[deep]` ✓ correct |
| `[deep, deep]` | `[deep]` — 2nd dropped |
| `[scalar, deep]` | `[scalar]` — deep dropped |
| `[deep, scalar]` | `[deep, scalar]` ✓ correct |
| `[scalar, scalar, deep]` | `[scalar, scalar]` — deep dropped |
| `[deep, deep, deep]` | `[deep]` — only 1st |
| `[scalar, deep, scalar]` | `[scalar, scalar]` — deep dropped |
| `[deep, deep, scalar]` | `[deep, scalar]` — 2nd deep dropped, scalar kept |

(`deep` = `@a.ref = "x"` ; `scalar` = `@c = N`.)

**The rule, exactly:** a `reactive-nested-assign` statement survives **iff it is the FIRST statement of the function body**. Any deep-set at position 2+ is silently dropped. Scalar assigns and other statement kinds survive at any position.

**Root-cause localization (already done — confirm, don't re-derive from scratch):**
- The codegen case for `reactive-nested-assign` is CORRECT and present: `compiler/src/codegen/emit-logic.ts:3003` emits `_scrml_reactive_set(target, _scrml_deep_set(_scrml_reactive_get(target), path, value))`. A single deep-set in a function body emits this correctly.
- Function bodies emit per-statement via `emitLogicNode` (`compiler/src/codegen/emit-functions.ts` ~line 386). So the codegen path is fine.
- Therefore the drop is UPSTREAM, at the **parse layer**: the non-first `reactive-nested-assign` node never enters `multi()`'s body AST. The node-creation site is `compiler/src/ast-builder.js:5503-5515` (`@obj.path = value` → `reactive-nested-assign`); there is a second creation site at `ast-builder.js:8564`. The function-body statement parser is position-gating the `@obj.path =` recognition to the first statement (or mis-advancing the token cursor after parsing a non-first statement so the deep-set branch isn't reached). Note module-scope deep-sets and `[deep, scalar]` both work — so the bug is specifically the function-body statement loop's handling of a deep-set that is NOT the first statement.

# YOUR TASK

**Phase 0 — confirm the locus (cheap).** Trace how `function` bodies are parsed in `ast-builder.js` (the multi-statement function-body statement loop). Find exactly why a `reactive-nested-assign` is recognized only as the first statement. Likely shapes: a `firstStatement`/leading-statement special-case, a token-cursor mis-advance after a non-leading statement, or a body-line scan that only matches the `@x.path=` form once. **If Phase 0 reveals the root is NOT a localized function-body statement-parser gap (e.g. it's a deep CPS/body-split interaction, or it requires a structural redesign), STOP and report your findings before the heavy edit.** Otherwise proceed.

**Phase 1 — fix.** Make the function-body statement parser recognize `@obj.path = value` (and the sibling `@arr.push(...)` array-mutation form — verify whether it has the same position-gating bug while you're there; if it does, fix it too; if not, note it) at EVERY statement position, not just the first. The fix should be minimal and route every `@cell.path = val` to the existing `reactive-nested-assign` builder (ast-builder.js:5503-5515). Do NOT touch the codegen case (it's correct). Preserve all existing behavior for scalar assigns / other statement kinds.

**Phase 2 — regression tests (S139 corpus-coverage lesson — `node --check`-clean ≠ correct).** Add BOTH:
- An **emit-shape** unit test (in `compiler/tests/unit/`) that compiles the 8-row matrix above (or a representative subset incl. `[scalar, deep, scalar]` and `[deep, deep]`) and asserts the emitted `_scrml_multi_*` function contains the correct number of `_scrml_deep_set(...)` calls with the right values — i.e. every deep-set survives.
- A **happy-dom runtime acceptance** test (in `compiler/tests/browser/` per existing conventions) that compiles the repro, loads it, fires `multi()`, and asserts the live value of `@a.ref` ends at `"q"` and `@c` ends at `2`. This proves the mutations actually apply at runtime, not just that the JS emits.

**Phase 3 — S138 R26 empirical verification (MANDATORY — this is a HIGH codegen-adjacent fix).** After the fix, re-compile the repro on YOUR post-fix baseline and confirm: (a) the emitted `_scrml_multi_*()` now contains BOTH `_scrml_deep_set(..., ["ref"], "p")` and `_scrml_deep_set(..., ["ref"], "q")`; (b) `node --check` exit 0 on the emitted client JS; (c) the full matrix above now emits the correct count of deep-sets for every row. Paste the grep evidence into your report. **DO NOT mark DONE without empirical R26 verification passing.**

**Phase 4 — full suite.** `bun --cwd "$WORKTREE_ROOT" run test` MUST be green (0 fail) — the parser change touches a broadly-exercised path, so run the FULL suite (not just the pre-commit subset) to confirm 0 regressions. Report final pass/skip/fail counts + within-node parity (`1005/0` expected; if it moves, investigate — a parser-shape change may legitimately rebump, but verify it's correct-shadow not masking).

# OUT OF SCOPE (note, don't fix)
- I found a SEPARATE latent bug: an inline event-handler deep-set `<button onclick=${@a.ref = "x"}>` emits a broken direct property write `_scrml_reactive_get("a").ref = "x"` (mutates the derived snapshot, doesn't fire reactivity). That is a DIFFERENT bug, not this one. Do NOT fix it here — but if your Phase-0 trace touches that path, note what you saw.
- The stray module-scope orphan statement `_scrml_reactive_get("a").ref;` in the original repro output — note if your fix incidentally changes it, but it's not the target.

# FINAL REPORT (return as your final message — it IS the data, not a human-facing note)
- WORKTREE_PATH (your verified pwd) + FINAL_SHA + branch name
- FILES_TOUCHED (worktree-absolute)
- Root cause (one paragraph: exactly why position-1 was special)
- The fix (what changed, why minimal)
- Phase-2 tests added (file paths + count)
- Phase-3 R26 evidence (grep output showing all deep-sets emit + node --check exit 0 + the matrix)
- Phase-4 full-suite counts + within-node parity
- Maps feedback (per the MAPS block)
- Whether the array-mutation sibling form had the same bug + disposition
- Any deferred / surprising findings
- Confirm `git status` clean
