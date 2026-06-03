# Bug 65 — Tier-0 `${for…lift}` engine `.advance(...)` in a lifted event handler → SILENT runtime miscompile

> **S136 archival.** Verbatim `prompt:` text dispatched to `scrml-js-codegen-engineer`
> (isolation:worktree, bg, model:opus) at S157, 2026-06-02. Worktree base `358581a8`.
> agentId af38ebab7b2bd4502.

Change-id: `bug-65-tier0-lift-engine-advance-2026-06-02`

You are fixing a codegen bug in the scrml compiler (TypeScript/JS source). This is the **Tier-0 sibling of the already-RESOLVED Bug 62** — the fix MIRRORS the proven Bug 62 pattern from `emit-each.ts` into the Tier-0 lift path at `emit-lift.js`. This is NOT a from-scratch design task; the template exists and is the authority.

---

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE

## Startup verification (do this BEFORE any other tool call)

1. Run `pwd` via Bash. Output MUST start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`. If the path is under any other repo (e.g. `scrml-support/.claude/worktrees/`), STOP and report — that's the S90 CWD-routing failure. Save the output as your `WORKTREE_ROOT`.
2. Run `git rev-parse --show-toplevel` — MUST equal `WORKTREE_ROOT`.
3. Run `git rev-parse --short HEAD` — should be `358581a8` (your branch base; it includes the refreshed `.claude/maps/`). Run `git status --short` — confirm clean.
4. Run `bun install` — worktrees don't inherit `node_modules`; the pre-commit `bun test` fails with "cannot find package 'acorn'" otherwise.
5. Run `bun run pretest` — populates `samples/compilation-tests/dist/` (gitignored; browser tests need it).

If ANY check fails: STOP and report. Do not proceed.

## Path discipline (S99/S126 — leak class, FOUR+ prior incidents)

- **Apply ALL file edits via Bash** (`perl -i` / `python` / heredoc / `cp`) on **worktree-absolute paths that include the `.claude/worktrees/agent-<id>/` segment**, NOT the Edit/Write tools — the Edit/Write tools have repeatedly leaked into MAIN's checkout while your `git`/`pwd` view stayed in the worktree. Echo the target path before each write; re-verify with `git diff` / `grep` after.
- **NEVER `cd` into the main repo** (or anywhere outside `WORKTREE_ROOT`). Use `git -C "$WORKTREE_ROOT"`, `bun --cwd "$WORKTREE_ROOT"`, and worktree-absolute paths exclusively. A `cd` into main leaks `bun add` / compile/run commands too (S126 incidents #14/#15).
- Your first commit message MUST embed your `pwd`: `WIP(bug65): start at $(pwd)`.
- Commit after EVERY meaningful edit (per the crash-recovery directive) — don't batch; `git status` MUST be clean before you report DONE. "HEAD unchanged — work in worktree, no commits" is NOT an acceptable terminal report.
- Update `docs/changes/bug-65-tier0-lift-engine-advance-2026-06-02/progress.md` (append-only, timestamped) after each step.

---

# MAPS — REQUIRED FIRST READ

Before consuming any other context, read `.claude/maps/primary.map.md` in full (~142 lines; it's in your worktree at `$WORKTREE_ROOT/.claude/maps/primary.map.md`).

The **"Task-Shape Routing"** section has a dedicated **"Bug 65 dispatch (next arc — Tier-0 `${for…lift}` engine-ctx threading)"** block — follow it. It routes you to:
1. `domain.map.md` — `<each>` engine-ctx threading concept (Bug 62/Bug 65 delta) + the "Codegen `<each>`/`<match>`/engine Emit Map" table
2. `structure.map.md` — S156 Bug 62 change detail: `buildEachEngineCtx` in emit-each.ts is the EXACT PATTERN to mirror at `emit-lift.js ~line 529`
3. `error.map.md` — Bug 62 fix note (root cause + three-part intercept)

Map currency: maps reflect source HEAD `57edc794` (your base `358581a8` adds only the maps + a hand-off rotation — no source change, so map content is current for source purposes). If your work touches files the maps didn't flag, verify against current source via grep/Read.

Feedback: in your final report include either "Maps consulted: [list]; load-bearing finding: <one sentence>" OR "Maps consulted but not load-bearing — [which map you expected to help]".

---

# THE BUG (confirmed reproduced by PA on HEAD 57edc794)

The Tier-0 iteration path emits a lifted event handler that calls `.advance` on the **bare enum string** instead of routing through the engine machinery.

**Minimal reproducer (write this to a temp file in your worktree and compile it to confirm):**

```scrml
<program>
${
    type Phase:enum = { Idle, Active }
    <cols>: string[] = ["a", "b", "c"]
}

<engine for=Phase initial=.Idle>
    <Idle rule=.Active>"idle"</>
    <Active rule=.Idle>"active"</>
</>

<ul>${ for (col of @cols) { lift <li onclick=@phase.advance(.Active)>${col}</li> } }</ul>
</program>
```

Compile: `bun "$WORKTREE_ROOT"/compiler/bin/scrml.js compile <tmp>/repro.scrml --output-dir <tmp>/dist`

**Current (BROKEN) emit in `repro.client.js`** — the lifted `<li>` click handler:
```js
_scrml_lift_el_N.addEventListener("click", function(event) { _scrml_reactive_get("phase").advance("Active"); });
```
`_scrml_reactive_get("phase")` returns the engine's bare variant STRING (`"Idle"`), which has no `.advance` method → **`TypeError` on click**. Compile exits 0 and **`node --check` passes** (silent miscompile — distinct from Bug 62's loud `E-CODEGEN-INVALID-JS`).

**Target (CORRECT) emit** — mirror the Bug 62 Tier-1 lowering:
```js
_scrml_lift_el_N.addEventListener("click", function(event) { _scrml_engine_advance("phase", "Active", __scrml_engine_phase_transitions); });
```

# ROOT CAUSE (from known-gaps.md Bug 65 entry — read `docs/known-gaps.md` line ~100-102 for the full text)

`compiler/src/codegen/emit-lift.js` (~line 529) calls `emitExprField(null, handlerSource, { mode: "client" })` — a `null` exprNode (so NO structured C13 `.advance` detection) AND no engine-ctx (`engineExprCtxExtras`) threaded. So lifted handlers never get the engine-aware lowering the Bug 62 fix gave the Tier-1 `<each>` path.

# THE TEMPLATE — Bug 62 fix in `emit-each.ts` (your authority for the fix shape)

Read `docs/known-gaps.md` Bug 62 "Disposition — RESOLVED S156" entry (line ~98) for the full mechanic, and read the actual implementation. The Bug 62 fix (commit `43cf9f40`) in `emit-each.ts`:
1. Builds the file's engine codegen ctx ONCE (via the `collect*` helpers exported from `emit-engine.ts`) — look for `buildEachEngineCtx` / `emitEachBodyRenderForFile` (the map points at `emit-each.ts:1074-1221`).
2. Threads that ctx through the render-factory event-wiring (`emitEachReconcileLines` → `renderTemplateChildToJs` → `renderTemplateAttrToJs`).
3. Per-item event-handler branch: iter-scope-prelowers via `rewriteIterScopeOnly` (preserves `@engineVar` by matching only `@.`), then routes engine references through the canonical machinery — NO duplicated `.advance` logic:
   - `.advance(.X)` → `parseExprToNode` → `emitExprField` C13 arm → `_scrml_engine_advance(...)` (state plane) / `_scrml_engine_dispatch_message(...)` (message plane, §51.0.G.1 — for `accepts=` engines)
   - `@engine = .X` → `rewriteBlockBody(engineRewriteCtx)` → `_scrml_engine_direct_set(...)`
4. **Tree-shaken:** when the file has no engine (null carrier), emission is byte-identical to pre-fix. Non-engine handlers untouched.

# YOUR FIX — mirror that into the Tier-0 lift path

In `emit-lift.js`, the lifted event-handler emission (~line 529, the `emitExprField(null, handlerSource, ...)` site) must:
- Receive the same file engine codegen ctx (reuse the Bug 62 helper / the `emit-engine.ts` `collect*` helpers — DO NOT duplicate the logic; share it). Survey how the ctx is built/threaded in the each path and whether `emit-lift.js` already has (or can be passed) the file AST it needs.
- For each lifted handler, route engine references through the SAME canonical machinery the each path uses (`.advance(.X)` → C13 → `_scrml_engine_advance`/`_scrml_engine_dispatch_message`; `@engine = .X` → `_scrml_engine_direct_set`).
- Be **tree-shaken / no-op when the file has no engine** — byte-identical emission for engine-less for-lift files (this is the regression guard — do not perturb the existing Tier-0 output for non-engine cases).
- Leave non-engine handlers (`onclick=fn(@.id)`, `onclick=${@x = 5}` for a plain cell, etc.) untouched.

**Depth-of-survey authorization:** if your survey finds the touchpoint is different from `emit-lift.js:529`, or that the ctx threading needs a different seam, CORRECT the locus — don't rigidly stick to the named line. Report what you found. The known-gaps named `emit-lift.js:529` from the Bug 62 agent's read; verify it against current source.

# Phase 3 — MANDATORY empirical verification (S138 R26 doctrine — this is a codegen fix relying on AST construction)

Do NOT mark DONE without ALL of:
1. **Re-compile the reproducer above** on your post-fix build. Assert:
   - `grep -E '_scrml_engine_advance\("phase",\s*"Active"' repro.client.js` → present (≥1)
   - `grep -E '_scrml_reactive_get\("phase"\)\.advance|\.advance\(' repro.client.js` → ZERO
   - `node --check repro.client.js` → exit 0
2. **A message-plane variant** (`accepts=` engine, `.advance(.Msg(payload))` in a for-lift handler) — mirror Bug 62 test §2 (`each-engine-advance-bug62.test.js` lines ~104-160) but in Tier-0 `${for…lift}` form. Assert it lowers to `_scrml_engine_dispatch_message(...)`, no raw `.advance(`, `node --check` clean.
3. **A `@engine = .X` direct-write variant** in a for-lift handler → `_scrml_engine_direct_set(...)`.
4. **Tree-shake / non-regression:** an engine-less for-lift file AND a non-engine handler in an engine file emit unchanged (no `_scrml_engine_*` injected where it shouldn't be).
5. **Full suite:** `bun run test` (chains pretest) — `0 fail`, baseline 22,753 pass. Report the delta.

# Tests to author (mirror the Bug 62 test files — they are your shape template)

- Unit: `compiler/tests/unit/lift-engine-advance-bug65.test.js` — mirror `compiler/tests/unit/each-engine-advance-bug62.test.js` structure (§1 state-plane, §2 message-plane, §3 `@engine=.X` direct-write, §4 non-regression). Use the Tier-0 `${for…lift}` form instead of `<each>`.
- Browser (happy-dom): `compiler/tests/browser/lift-engine-advance-bug65.browser.test.js` — mirror `compiler/tests/browser/each-engine-advance-bug62.browser.test.js`. Assert: the runtime bundle defines `_scrml_engine_advance`; a click on a lifted `<li>` actually advances the engine variant (the real runtime behavior, not just emit-string). **This is the load-bearing canary** — an emit-string-only test would have missed Bug 65 entirely (it's `node --check`-clean).

# Commit discipline
- Code + its coupled test land in the SAME commit (a code change without its test is a transiently-red window).
- Pre-commit hook runs the unit+integration+conformance subset; pre-push runs full+browser. **Do NOT use `--no-verify`** on commit OR push without explicit authorization — you do not have it. If the hook fails, fix the cause.
- Branch name doesn't matter (PA lands via S67 file-delta from your branch tip).

# Final report MUST include
- `WORKTREE_PATH`, `FINAL_SHA`, `FILES_TOUCHED` (exact list), deferred-items list.
- The Phase-3 empirical results verbatim (the grep counts + `node --check` results on the reproducer + message-plane + direct-write + tree-shake checks).
- Full-suite pass/fail/skip counts (post-fix).
- Maps feedback line (see MAPS block above).
- Confirmation that `git status` is clean and your branch tip has all work committed.
- Whether the fix shared the Bug 62 ctx helper or needed a new seam (and why).
