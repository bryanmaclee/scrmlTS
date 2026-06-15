CORPUS REWRITE WAVE 2 — rewrite four example apps to canonical/idiomatic scrml (the corpus "teaches the spelling of scrml and the grammar of React" — wave 2 of the S193-queued audit). You are scrml-js-codegen-engineer working in an isolated worktree, WRITING SCRML (not compiler source). change-id: `corpus-rewrite-wave2-2026-06-15`.

# MAPS — REQUIRED FIRST READ
Read `.claude/maps/primary.map.md` in full (~100 lines) first. Follow its "Task-Shape Routing" for scrml-writing / example-authoring. Map currency: HEAD `4646ec13` as of 2026-06-15; HEAD `8e5cab33` is +1 = the maps-refresh commit only (no source) → current.
Feedback in final report: "Maps consulted: [list]; load-bearing finding: <one sentence>" OR "Maps consulted but not load-bearing".

# MANDATORY SCRML-WRITING READS (before generating ANY scrml)
1. `docs/articles/llm-kickstarter-v2-2026-05-04.md` IN FULL — canonical scrml shape, stdlib catalog, the inline anti-pattern table, the auth/real-time/reactive/loading/schema recipes. **Use v2** (NOT v1).
2. `scrml-support/docs/gauntlets/BRIEFING-ANTI-PATTERNS.md` — the Ghost-Pattern mitigation. Reread before each file. Do NOT reach for React/Vue/JSX/Svelte syntax.
Per pa.md Rule 4: SPEC (`compiler/SPEC.md`) is normative — read the relevant section IN FULL before using a structural element (§18.0.1 `<match>`, §51.0 `<engine>`, §51.0.S engine message dispatch, §6.5 `<each>`/`<empty>`, §55 validators, §13.5).

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE (S99)
1. `pwd` MUST start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`. Else STOP + report (S90). Save as WORKTREE_ROOT.
2. `git rev-parse --show-toplevel` == WORKTREE_ROOT. 3. `git status --short` clean. 4. `bun install`. 5. `bun run pretest`.
- Apply ALL edits via Bash (perl/python3/heredoc/cp) on WORKTREE_ROOT-absolute paths INCLUDING the `.claude/worktrees/agent-<id>/` segment — NOT the Edit/Write tools (S126). Echo path before each write; verify via git diff/grep after.
- NEVER `cd` anywhere; use `git -C "$WORKTREE_ROOT"`, `--cwd "$WORKTREE_ROOT"`, worktree-absolute paths. Translate any main-rooted path (no worktrees segment) to `$WORKTREE_ROOT/...`.

# COMMIT DISCIPLINE (S83) — one example = one commit
- Commit each example as you finish + compile-verify it. First commit message includes startup `pwd`: `WIP(wave2): start at <pwd>`. Before DONE: `git -C "$WORKTREE_ROOT" status` clean. Final report: WORKTREE_PATH, FINAL_SHA, FILES_TOUCHED, per-file compile status, deferred items.

# CONTEXT — wave 1 (the precedent, all landed S195)
Wave 1 rewrote 04/05/16/09: 04→derived `const <filtered>` + `<each>`/`<empty>`; 05→`<engine for=Step>` + decl-coupled validators (first `<errors of=>`); 16→Tier-1 `<match for=ContactsPhase>` + `<each>` + live `.Failed`; 09→pure errors-as-states. Wave 2 is the same shape: replace React/imperative idioms with canonical structural scrml. NO gating compiler fix needed for wave 2 (unlike wave 1's GAP-A).

# THE FOUR FILES (in `examples/`)

## 03 — (a 04-clone shape) typed struct + `<each>`/`<empty>`
Rewrite to the canonical derived-list + `<each>` + `<empty>` shape (mirror the landed `examples/04-live-search.scrml`). Typed struct for the item. **ALSO fix the stale README `protect=` claim** for 03 (the README row referencing `protect=` is stale — `protect=` was removed; correct it to the current authority/schema idiom per SPEC §52). Read 04's landed form first as the template.

## 08 — (a 04-clone shape) typed struct + `<each>`/`<empty>`
Same as 03: canonical typed struct + derived `<each>`/`<empty>`. Mirror 04. No README fix needed unless you find a stale claim.

## 06 — kanban — NO ENGINE (this is load-bearing; lead with it)
Per-card status is a MULTI-INSTANCE concern (each card has its own status) → an `<engine>` (a board-level singleton) is the WRONG shape here. The pre-S194 audit row "Status as an `<engine>`" is SUPERSEDED. Use: derived grouping columns (a `const <inProgress>` / `const <done>` per status, filtered from the card list) + `<each>` per column + **per-direction id-only event handlers**.
- **WORKAROUND REQUIRED — `g-each-body-bare-variant-arg` (HIGH, non-blocking):** a bare `.Variant` enum literal as an event-handler call-ARG directly in an `<each>` per-item body (`<button onclick=moveTo(card.id, .InProgress)>`) emits invalid JS (the bare-variant→frozen-string lowering is MISSING in the direct each-render-fn path, emit-each.ts). DO NOT write that form. Instead factor each move into a per-direction id-only handler so the bare `.Variant` lives in a `function` body (where the lowering works): e.g. `function moveToInProgress(id) { ... .InProgress ... }` and `<button onclick=moveToInProgress(card.id)>`. This is the recommended idiom AND it sidesteps the gap. (Confirm by compiling.)

## 25 — drag/drop — the §51.0.S.6 worked example (board-singleton engine)
This IS the engine case (the board-level DRAG PHASE is a singleton, unlike 06's per-card status). Implement per SPEC §51.0.S.6: a board-level singleton `<engine for=DragPhase accepts=DragMsg>` that OWNS its transitions via `.advance(.Msg)` (engine message dispatch). §51.0.S is FULLY IMPLEMENTED — buildable today. Read §51.0.S + §51.0.S.6 IN FULL first; mirror the worked example.

# AFTER ALL FOUR
- Compile-verify each: `bun --cwd "$WORKTREE_ROOT" run compiler/bin/scrml.js compile examples/<file>.scrml` exit 0, `node --check` the emitted JS.
- **Within-node parity allowlist rebump (the per-wave tax):** the native parser is feature-stale on these idioms, so a within-node parity test may flag PARSE-FAILURE on the rewritten files. PARSE-FAILURE count 0 = not-a-regression (legacy path compiles; native is canonical-enforcer + feature-stale). If the within-node test fails on these files, rebump the allowlist for the rewritten files ONLY and report exactly which files + that the failure is PARSE-FAILURE-class (not a codegen regression). Do NOT mask a real codegen failure as a parse-stale rebump — distinguish them in your report.
- Run `bun --cwd "$WORKTREE_ROOT" run test`. Report pass/skip/fail.
- Update the `examples/README.md` rows for the 4 rewritten files to describe the new idiom (and the 03 `protect=` fix). Do NOT touch `examples/VERIFIED.md` (human-verified only — PA/user owns that).
- PA lands via S67 file-delta. Leave worktree intact.
