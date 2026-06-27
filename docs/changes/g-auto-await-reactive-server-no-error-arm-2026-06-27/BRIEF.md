<!-- S136 BRIEF archival. Dispatched S227 2026-06-27 via scrml-js-codegen-engineer, isolation:worktree, opus, run_in_background. agentId ab9d63e462d35dd0e. Worktree FF-merged cf1471dd→67ed2103 (merge step baked into the brief). Tier-2 Round-1 lane A; write-disjoint (emit-client.ts). -->

# TASK — fix `g-auto-await-reactive-server-no-error-arm` (MED — silent reactive-server failure)

change-id: `g-auto-await-reactive-server-no-error-arm-2026-06-27`

## The bug
The ss22 per-statement auto-await codegen emits a **catch-less** async IIFE for a reactive-server assignment: `(async () => _scrml_reactive_set(name, await fn(args)))()` with NO `.catch()`. When the server round-trip REJECTS (e.g. an idle-timeout truncation), that one statement's reactive-set silently drops as a browser **`unhandledrejection`** — no scrml-surfaced error, no failable arm. (It does NOT drop subsequent statements — they already ran synchronously — so this is a single-statement silent-failure gap, narrow.)
**Locus:** `compiler/src/codegen/emit-client.ts:2044` (the catch-less reactive-server-assignment IIFE).

## The fix
Wrap the IIFE with a `.catch()` (or try/catch) that **surfaces** the rejection through scrml's existing runtime-error surface instead of letting it become a silent `unhandledrejection`.
- **FIRST find the existing scrml runtime-error-surfacing mechanism** — grep the runtime template + emit-client for how OTHER runtime failures surface (e.g. a `_scrml_runtime_error`/error-channel helper, the `!{}` failable-arm lowering's error path, or a console-surfacing convention). **Route to that existing path — do NOT invent a new error channel.**
- If there is genuinely no existing surface for this no-error-arm case, the FLOOR is a clear, scrml-prefixed `console.error` (e.g. naming the cell + the failed server fn) — strictly better than a silent unhandledrejection. If you hit that ambiguity (no clear existing channel), note it explicitly in your report as a design choice you made, with the alternatives.
- Keep it surgical — this is the single catch-less IIFE site; don't refactor the auto-await model.

## Verification
1. Regression test in `compiler/tests/` asserting the emitted IIFE now carries a `.catch()` (or try/catch) routing to the error surface — and that a non-failing reactive-server assignment is unchanged.
2. **Empirical:** construct a small `.scrml` with a reactive-server assignment whose server fn rejects; compile via `bun "$WORKTREE_ROOT"/compiler/bin/scrml.js compile <file> -o /tmp/r26-autoawait/`; `node --check` the emitted client JS; confirm the `.catch()` is present and the rejection routes to the error surface (not a bare unhandledrejection). Report the before/after emitted IIFE shape.
3. Full `bun run test` green before DONE.

## MAPS — REQUIRED FIRST READ
After the startup/merge steps below, read `.claude/maps/primary.map.md` in full; Task-Shape Routing for a codegen fix → structure.map.md, error.map.md, domain.map.md. Maps are current as of HEAD `67ed2103` (you'll FF to it — see startup step). Report: "Maps consulted: [list]; load-bearing finding: <one sentence>" OR "not load-bearing."

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE
## Startup (BEFORE any other tool call)
1. `pwd` via Bash. MUST start with `/home/bryan-maclee/scrmlMaster/scrml/.claude/worktrees/agent-`. If it's the bare main checkout (`/home/bryan-maclee/scrmlMaster/scrml`) or another repo, STOP and report (no/wrong worktree). Save as WORKTREE_ROOT.
2. `git rev-parse --show-toplevel` MUST equal WORKTREE_ROOT.
3. **`git merge main`** — your worktree branched from the session-start commit `cf1471dd`; main has advanced to `67ed2103` (a docs/maps/bookkeeping-only commit — it refreshed `.claude/maps/`, touched ZERO compiler source). This is a clean FAST-FORWARD (you've committed nothing yet) that gives you the current maps. `compiler/src/codegen/emit-client.ts` is byte-identical across that range, so your fix target is unaffected. Confirm the merge succeeded (HEAD now `67ed2103`).
4. `git status --short` clean (NOTE: `compiler/tests/unit/gauntlet-s20/__fixtures__/import-resolution/*.scrml` may show deleted after you run the suite — known pre-existing test side-effect, ignore).
5. `bun install` (worktrees don't inherit node_modules).
6. `bun run pretest`.
If any check fails: STOP and report.
## Path discipline (EVERY edit)
- Per S126: edit via Bash (`perl`/`python3`/heredoc/`cp`) on WORKTREE_ROOT-absolute paths including the `.claude/worktrees/agent-<id>/` segment — NOT Edit/Write tools. Echo target path before each write; re-verify with `git diff`/`grep` after.
- NEVER a bare-main-root path. NEVER `cd` into main. Use `git -C "$WORKTREE_ROOT"`, `bun --cwd "$WORKTREE_ROOT"`, worktree-absolute paths only.

# Commit discipline (S83)
Commit per sub-bucket immediately. First commit message includes verbatim `pwd` (`WIP(g-auto-await): start at <pwd>`). `git status` clean before DONE.

# Final report
WORKTREE_PATH · FINAL_SHA · FILES_TOUCHED · before/after emitted IIFE shape · the error-surface you routed to (+ any design choice you had to make) · full-suite counts · maps feedback. Files in scope: `compiler/src/codegen/emit-client.ts` + new test file + (if needed) the runtime template. This is write-DISJOINT from parallel lanes editing `emit-expr.ts`, `tokenizer.ts`, and `native-parser/*` — do NOT touch those.
