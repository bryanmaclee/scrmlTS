# Gate-found fix-wave TAIL + gate flip — BRIEF (archived per pa.md S136)

Dispatched S142 (2026-05-29) to `scrml-js-codegen-engineer`, isolation:worktree, opus, background.
change-id: `gate-found-fix-wave-tail-and-flip-2026-05-29`.
Baseline HEAD: `942d62e7` (v0.6.10 code + maps refresh commit; no code delta vs the `9ab7aa38` map watermark).
Predecessor: S141 PARTIAL gate-found fix-wave (`bf63e096`) drove the forced-gate-ON failure surface 37→8 then stalled. This dispatch closes the tail + flips the gate.

---

# MAPS — REQUIRED FIRST READ

Before consuming any other context, read `.claude/maps/primary.map.md` in full (~100 lines). Its §"Task-Shape Routing" tells you which additional maps to consult; this is a **compiler-source bug-fix / codegen** task — consult `structure.map.md`, `dependencies.map.md`, `error.map.md`.

Map currency: maps reflect HEAD `9ab7aa38` as of 2026-05-29 (freshly refreshed this session; committed at `942d62e7` = your baseline, no code delta between them). If your work touches files modified after that point, treat map content as a starting hypothesis to verify via grep/Read against current source.

Feedback (include in final report): either "Maps consulted: [list]; load-bearing finding: <one sentence>" OR "Maps consulted but not load-bearing — [which map you expected to help but didn't]". The second is fine and valuable.

---

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE

**S99 has had 20 path-discipline leaks historically; this would be incident #21 — do not be it.**

Your worktree path is: harness-assigned at dispatch — capture it via `pwd` in startup step 1 below and use it as `WORKTREE_ROOT` for the rest of the dispatch.

## Startup verification (BEFORE any other tool call)
1. `pwd` via Bash. Output MUST start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`. If it's under any OTHER repo (e.g. `scrml-support/.claude/worktrees/`), STOP and report — that's the S90 CWD-routing failure. Save the output as `WORKTREE_ROOT`.
2. `git rev-parse --show-toplevel` — MUST equal `WORKTREE_ROOT`.
3. `git rev-parse HEAD` — record it. `git status --short` — confirm clean.
4. `git merge main` (or confirm already up to date) — your base may be stale per S112 if the harness branched you from a session-start commit.
5. `bun install` — worktrees do NOT inherit `node_modules`; the pre-commit `bun test` fails with "cannot find package 'acorn'" otherwise.
6. `bun run pretest` — populates `samples/compilation-tests/dist/`; without it the full suite produces ~130 ECONNREFUSED browser failures. Use `bun run test` (chains pretest) for full-suite baselines, NOT `bun test` directly.

If ANY check fails: DO NOT proceed. Report the mismatch and exit.

## Path discipline (EVERY edit)
- **Apply ALL file edits via Bash** (`perl`/`python`/heredoc/`cp`) on **worktree-absolute paths that include the `.claude/worktrees/agent-<id>/` segment** — NOT the Edit/Write tools. Echo the target path before each write; re-verify via `git diff` / `grep` after. (S126 interim mitigation — the Edit/Write tools have twice written to PRIMARY MAIN while the agent's git view saw the worktree.)
- **NEVER `cd` into the main repo (or anywhere).** Use `git -C "$WORKTREE_ROOT"`, `bun --cwd "$WORKTREE_ROOT"`, and worktree-absolute paths exclusively. A stray `cd` into main leaks `bun add` / compile / run commands into main (S90/S126 incident class).
- If any context references `/home/bryan-maclee/scrmlMaster/scrmlTS/foo` (main-rooted), translate to `$WORKTREE_ROOT/foo` before touching it.
- First commit message MUST embed the verbatim `pwd` from step 1: `WIP(gate-tail): start at $(pwd)`.

---

# THE TASK

The emitted-JS parse gate (`validateEmit`, `compiler/src/codegen/validate-emit.ts`, wired in `api.js` ~line 1919, default `false` at api.js ~line 635) was built + flag-gated default-OFF at S141 v0.6.9. SPEC §2.2.1 (lines 202-206) already states the invariant normatively as if always-on — the gate is currently **spec-ahead** of the default-OFF impl. The S141 predecessor wave drove the forced-gate-ON failure surface 37→8.

**Goal:** close the remaining forced-gate-ON failures → flip `validateEmit` default-ON → wire the CLI flags → reconcile SPEC §2.2.1. The acceptance proof is the **full suite GREEN with the gate default-ON** (drive to green by fixing codegen, NOT by exempting fixtures).

## Phase 1 — REPRODUCE the forced-gate-ON failure set at YOUR HEAD (mandatory; do this FIRST)

Per pa.md S138 R26 reverse-direction doctrine: **do not trust the "8" count — reproduce it at your baseline.** The S141 count was at the agent's worktree tip, not the landed HEAD.

- Force the gate on (temporarily set `validateEmit` default to `true` in `api.js`, OR run the test subset with the gate forced — match whatever mechanism the existing `compiler/tests/integration/validate-emit-gate.test.js` / `compiler/tests/unit/validate-emit.test.js` use; they pass `validateEmit: true` to `compileScrml`).
- Run the unit + integration + conformance subset with the gate forced on. **Enumerate the EXACT current failures** (file + the `E-CODEGEN-INVALID-JS` byte offset + offending snippet). Record this list in `progress.md` as your ground-truth surface — supersedes the hypothesis list below.
- **ALSO re-compile `examples/` + `examples/23-trucking-dispatch/` with the gate forced on** — known-gaps §0 lists **C10 (HIGH)** = compound-predicate `if=(X is some && X != "")` lowering truncates `!= ""` → dangling `!==`, and **C11 (MED)** = leaked unlowered `server {` block in `examples/23-trucking-dispatch/seeds.server.js`, both as open + "blocks gate always-on" (see known-gaps §GATE-FOUND). The S141 predecessor agent BELIEVED C10/C11 were already closed (trucking-dispatch went node-check-clean by v0.6.9) but did NOT flip the known-gaps entries. **CONFIRM empirically at YOUR HEAD** (R26 reverse-direction — verify before claiming open OR closed): (a) if C10's `if=(is some && != "")` truncation fires anywhere under the gate, FIX it (it's the dominant historical cluster, a codegen lowering bug not example-specific) and add a regression test for the compound `if=` shape; (b) if C11's `server {` leak fires, fix it; (c) if NEITHER fires on any source/fixture under the gate, record that empirically in `progress.md` (with the gate-clean compile evidence) so PA can flip known-gaps §GATE-FOUND C10/C11 + §0 (HIGH 2→1, MED −1). Do NOT silently assume the predecessor's belief — prove it either way.

## The 8-remaining HYPOTHESIS (from the S141 agent's progress.md — confirm/correct in Phase 1)

1. **`!{}` inline-catch (§19.4.3) + R25-Bug-49 nested `!{}`** — `!{}` arm emission. Locus hypothesis: `compiler/src/codegen/emit-logic.ts` (the failable-arm emitter; `insideFunctionBody` checks at ~673/737/932; arm-body at §19.4.3). (2 cases)
2. **each-block `as name` index alias** — `compiler/src/codegen/emit-each.ts` (`asName` at ~line 51; the `of=N` index-alias path). (1)
3. **match-arm-block named-binding (Bug 6.5.1)** — `emit-match` / `ast-builder.js` arm-binding capture. (1)
4. **`<onTransition>` structural-element filter / HTML** — engine emit (`emit-engine.ts` / `emit-variant-guard.ts` / `emit-control-flow.ts`). (1)
5. **Bug 4.5 DG `sweepNodeForAtRefs`** — flagged by the S141 agent as **"likely NOT invalid-JS; confirm."** If it does not produce a gate failure at your HEAD, classify NOT-A-GATE-FAILURE and move on — do NOT change codegen for a non-failure. (1)
6. **self-host meta-checker + module-resolver** — self-host module emission. (2)
7. **`emit-logic-s19` test-context** — the S141 agent's discarded in-flight change regressed 3 `emit-logic-s19` tests; the note is "they expect `return` emitted without `insideFunctionBody` — they should pass the flag." **CONFIRM at your HEAD:** if these 3 tests pass with the gate forced on (the regressing change is NOT in main — it was discarded), there is nothing to fix. If they DO fail under the gate, the fix is a **test-harness fix** (the fixture feeds a code fragment with a bare top-level `return` to the emitter without `insideFunctionBody:true`; a top-level `return` is genuinely invalid JS under the gate's module-goal parse — wrap the fixture or pass `insideFunctionBody:true` so the test exercises realistic emission). This is NOT a codegen change.

For each TRUE invalid-JS surface (1-4, 6): the fix is **codegen** — make the lowering emit valid JS (route through the variant-aware / function-body-aware emitter, mirror the S141 committed fixes' pattern). For 5 + 7: confirm-or-classify-not-a-failure first (R26 reverse-direction — don't fix a ghost).

## Phase 2 — fix per-surface, ONE AT A TIME (anti-stall)

The S141 agent stalled (600s watchdog) on ONE oversized in-flight change. **Strict sequencing:** pick the next surface → fix it → `git diff` to verify → commit → re-run the forced-gate-ON subset to confirm that surface's failures dropped + zero regressions → next surface. Commit per-surface (crash-recovery + the count visibly converges to 0). Add/adjust a regression test per genuine codegen fix.

## Phase 3 — flip the gate + CLI + SPEC (only after Phase 2 reaches gate-on-green)

1. **Flip default-ON:** `api.js` ~line 635 `validateEmit = false` → `true`.
2. **CLI flags:** wire `--validate-emit` (explicit-on, no-op since default-on) + `--no-validate-emit` (opt-out, sets `validateEmit:false`) through `compiler/scrml.js` → `compiler/src/commands/compile.js` (+ `build.js` / `dev.js` if they share the compile path) → the `compileScrml`/api options. There is NO existing flag handling for these — net-new. Follow the existing flag-parsing pattern in those command files.
3. **SPEC §2.2.1 (lines 202-206):** the invariant text is already always-on. Add a short normative note documenting the `--no-validate-emit` escape hatch (the dev/CI opt-out for the rare case an adopter must bypass a false-positive) + that the gate is now active by default. **PA-DECISION-FLAGGED:** keep the §2.2.1 "SHALL NOT emit JS that fails to parse" wording; the opt-out is an operational escape, not a relaxation of the invariant — frame it that way. If you find the flip needs a different SPEC framing, STOP and report rather than guessing (pa.md Rule 4 — SPEC is normative).

# ACCEPTANCE GATE (close condition)

- **Full `bun run test` GREEN with `validateEmit` default-ON** — zero new failures vs the 22,129-pass baseline (219 skip). This is the proof every gate-found surface is closed. If the suite cannot go green with the gate on, STOP-and-report the residual surface — do NOT disable the gate to pass.
- **S138 R26 empirical re-verify (mandatory — this touches codegen relying on AST):** re-compile the affected real sources (any `examples/` + samples your Phase-1 enumeration implicated, plus the R27 dev sources at `/home/bryan-maclee/scrmlMaster/scrml-support/docs/gauntlets/gauntlet-r27/dev-{1,2,3,4,5}-*.scrml`) via `bun "$WORKTREE_ROOT"/compiler/bin/scrml.js compile <src> --output-dir /tmp/r26-gate-tail/<name>` and confirm exit-0 + `node --check` clean on every emitted `.client.js`/`.server.js`. Report the table. DO NOT mark DONE without R26 passing.

# COMMIT DISCIPLINE
- After EVERY edit: `git -C "$WORKTREE_ROOT" diff <file>` to verify; `git -C "$WORKTREE_ROOT" add <file>`; commit IMMEDIATELY. Don't batch — commit per surface.
- Before reporting DONE: `git -C "$WORKTREE_ROOT" status` MUST be clean. "work in worktree, no commits" is NOT an acceptable terminal report (S83).
- **NEVER `--no-verify`** (extends to any commit). If the pre-commit hook fails on an env race (pretest dist mid-rebuild), STOP and report — do NOT bypass. (pa.md S87/S88/S136.)

# FINAL REPORT
WORKTREE_PATH · FINAL_SHA · per-commit list · FILES_TOUCHED · Phase-1 actual failure enumeration (vs the 8-hypothesis) · per-surface disposition (fixed-codegen / test-harness-fix / classified-NOT-A-FAILURE) · the C2-style PA-decisions you made with SPEC quotes · forced-gate-ON full-suite result · R26 table · maps feedback · deferred items.
