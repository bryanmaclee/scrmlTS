<!-- S136 BRIEF archival. Dispatched S227 2026-06-27 via scrml-js-codegen-engineer, isolation:worktree, opus, run_in_background. agentId ad085702f5afaeafb (re-dispatch; the first dispatch a6f55cccc2d500065 STOP-reported on omitted-isolation/no-worktree — S88, zero work lost). Worktree based cf1471dd; SendMessage'd a `git merge main`→67ed2103 currency correction for the refreshed maps. -->

# TASK — fix `g-mount-hang-rails-dev` (native parser non-termination, 100% CPU)

change-id: `g-mount-hang-rails-dev-2026-06-27`

## The bug (MED, robustness-class — active 100%-CPU hang)
`bun run compiler/src/cli.js compile samples/gauntlet-r18/rails-dev.scrml -o /tmp/x/` infinite-loops at 100% CPU and never terminates (exit 124 under `timeout 60`, 0 output files). The loop is inside **`nativeParseFile`** (the native parser, `compiler/native-parser/`), reached from the meta-eval re-parse path (`compiler/src/meta-checker.ts` / `meta-eval.ts:380` — verify exact path). `rails-dev.scrml` is a pure compile-time `^{}` sample with no runtime effects, so the prior "happy-dom mount hang" label was wrong — this is a COMPILE-time native-parser non-termination.

## Diagnostic-first (the fix target is not yet known)
1. **Reproduce:** `timeout 60 bun run compiler/src/cli.js compile samples/gauntlet-r18/rails-dev.scrml -o /tmp/x/` → confirm exit 124 / hang.
2. **Read the groundwork:** `docs/changes/ss7-rails-dev-hang/FINDINGS.md` — it has the reliable repro + 8 reduced reproducers (A/B/C/D/G/H/I/J all error cleanly with `E-META-EVAL-002`; only the FULL sample's block *accumulation* loops — the minimal repro is elusive, **the full sample IS the repro**).
3. **Instrument `nativeParseFile`** on the full repro to find the **no-forward-progress token** — the point where the parser's position pointer fails to advance (the classic non-termination signature: a loop that consumes 0 tokens per iteration). Add a forward-progress assertion / position-stall detector to localize it, then fix the production so it always makes progress OR errors (`E-PARSER-OUT-OF-SUBSET` / appropriate `E-*` per §34.1) rather than looping.
4. The fix must make the compile **terminate** on this input — either parse it correctly, or emit a clean fatal diagnostic. A parser SHALL NOT fail to terminate on any input (robustness invariant).

## Scope + hazards
- **S222 freeze:** the TS native parser is transition-FROZEN — this is a robustness/non-termination FIX (allowed), NOT feature work. Do NOT add new parser features; fix the loop only.
- **`.scrml` mirror hazard (S115/S162):** the native parser has `.scrml` canonical mirrors. Check whether your fix surface has a live `.scrml` mirror — if the mirror is feature-current, update it in lockstep (S115); if it is feature-STALE / missing the machinery (S162), do NOT force a rigid lockstep — note the divergence in your report and fix the `.js` only. Grep `.scrml` mirrors for the touched production before deciding.
- **Heavy conformance verification:** run `compiler/tests/parser-conformance-lexer.test.js` + the full `bun run test` (native parser is mid-migration — conformance is the regression guard). Confirm ZERO conformance regressions.

## Verification — MANDATORY
1. The repro compiles in <5s (terminates) — `timeout 30 bun "$WORKTREE_ROOT"/compiler/bin/scrml.js compile samples/gauntlet-r18/rails-dev.scrml -o /tmp/r26-hang/` → exit 0 (parsed) OR a clean fatal diagnostic (NOT exit 124). Report which.
2. A regression test that locks termination on this input (or the smallest stalling fragment you can isolate via the instrumentation).
3. Full `bun run test` green + parser-conformance green before DONE.
**DO NOT mark DONE until the hang is gone AND conformance is clean.**

## MAPS — REQUIRED FIRST READ
Read `.claude/maps/primary.map.md` in full first. Task-Shape Routing for a native-parser fix → structure.map.md (native-parser file table + per-session source changes), error.map.md (§34.1 native-parser parse-diagnostics). Map currency: maps are current as of HEAD `67ed2103` (your base; 67ed2103 is a docs/maps-only commit on top of cf1471dd — compiler source unchanged, maps reflect it). Final report: "Maps consulted: [list]; load-bearing finding: <one sentence>" OR "not load-bearing."

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE
## Startup (BEFORE any other tool call)
1. `pwd` via Bash. MUST start with `/home/bryan-maclee/scrmlMaster/scrml/.claude/worktrees/agent-`. Else (e.g. `scrml-support/.claude/worktrees/`, or the bare main checkout `/home/bryan-maclee/scrmlMaster/scrml`) STOP and report. Save as WORKTREE_ROOT.
2. `git rev-parse --show-toplevel` MUST equal WORKTREE_ROOT.
3. `git status --short` clean (NOTE: `compiler/tests/unit/gauntlet-s20/__fixtures__/import-resolution/*.scrml` may show deleted after you run the suite — known pre-existing test side-effect, ignore).
4. `bun install`.
5. `bun run pretest`.
If any check fails: STOP and report.
## Path discipline (EVERY edit)
- Per S126: edit via Bash (`perl`/`python3`/heredoc/`cp`) on WORKTREE_ROOT-absolute paths including the `.claude/worktrees/agent-<id>/` segment — NOT Edit/Write tools. Echo target path before each write; re-verify with `git diff`/`grep` after.
- NEVER a bare-main-root path. NEVER `cd` into main. Use `git -C "$WORKTREE_ROOT"`, `bun --cwd "$WORKTREE_ROOT"`, worktree-absolute paths only.

# Commit discipline (S83)
Commit per sub-bucket immediately (don't batch). First commit message includes verbatim `pwd` (`WIP(g-mount-hang): start at <pwd>`). `git status` clean before DONE.

# Final report
WORKTREE_PATH · FINAL_SHA · FILES_TOUCHED · the located no-forward-progress token + root cause · repro before/after (exit 124 → exit 0/clean-diagnostic) · `.scrml` mirror disposition (lockstep vs stale-divergence) · conformance + full-suite counts · maps feedback. Files in scope: `compiler/native-parser/*` + possibly `compiler/src/meta-checker.ts`/`meta-eval.ts` + a regression test. This is write-DISJOINT from a parallel codegen dispatch — do NOT touch `compiler/src/codegen/emit-expr.ts`.
