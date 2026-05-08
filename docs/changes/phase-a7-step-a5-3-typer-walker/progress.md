# A5-3 progress log

Append-only. Each entry: timestamp + what was just done + what's next + any blockers.

## 2026-05-08T00:00 — Phase 0 SURVEY complete

**What was done:**
- Worktree startup verified: WORKTREE_ROOT = `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a61fa13bc731b14bb`; HEAD `f59bbcc` rebased onto `364b44f` to pick up A5-2 SHIP + BRIEF.
- `bun install` (114 packages) + `bun run pretest` (12 samples) green.
- Baseline `bun run test` confirmed: **9,628 / 60 / 1 / 0** matches BRIEF §4.4. (One transient network-test flake on first run; second run clean.)
- Read BRIEF, A5-2 BRIEF + SURVEY, SPEC §51.0.M-Q (lines 20503-20988), SPEC §34 catalog rows (14234, 14243, 14248, 14250-14251, 14259), EngineMetadata + EngineStateChildEntry + EngineRuleForm shapes (symbol-table.ts:200-417), PASS 10.A registration (3680-3795), PASS 11 (B15) walker (4283-4570), PASS 13 (B17) cohesion walker (5085-5251), runSYM pipeline ordering (5999-6074), A5-2 parser body-scan helpers (engine-statechild-parser.ts:202-349), ast-builder engine-decl construction (ast-builder.js:8563-8728), B15 + A5-2 + B17 test patterns.
- Wrote `docs/changes/phase-a7-step-a5-3-typer-walker/SURVEY.md` — 14 sections covering all 10 BRIEF §5 deliverables.

**Key findings (per SURVEY §10 SCOPE CORRECTIONS):**
- 3 of 12 BRIEF §4.1 fire-sites DEFERRED on infrastructure preconditions: #5/6 (E-STRUCTURAL-ELEMENT-MISPLACED for `<onTimeout>` outside engine state-child / inside `<match>` arm — markup walker not yet present), #7 (cascade-miss message extension on E-ENGINE-INVALID-TRANSITION direct-write — direct-write compile-time fire-site doesn't exist yet, body parser limitation per `symbol-table.ts:4150,4544`).
- Inner-engine recursion DEFERRED to A1c (per SURVEY §3.3): A5-3's primary fire-sites read OUTER engine's state-children only; `innerEngines.length > 0` is the composite marker, no inner walking needed. A1c codegen will produce recursion infrastructure naturally.
- A5-3's `<onTimeout to=>` legality validation IS the FIRST compile-time E-ENGINE-INVALID-TRANSITION fire-site (per §51.0.M line 20567 spec authorization).
- Fire-site #9 (`.Variant.history` variant validation) ALREADY runs through B15 transparently via A5-2's `historyForm` flag riding `EngineRuleForm.single`/`multi`.
- Fire-site #11 (engine-in-function-body) parser behavior unverified — sub-step 6 verification test resolves; either no walker change OR ~30 LOC B17 extension.
- Walker placement: NEW PASS 16 (`walkValidateEngineA5Extensions`).
- EngineMetadata aggregation shape: annotated records (`{stateChildTag, ...}`).

**Estimated implementation cost: 5.5-7.5h, 9 sub-steps, 50-70 unit tests.**

**What's next:**
- STOP per BRIEF §5 stop-and-report protocol. Awaiting PA acknowledgment of survey before implementation.

**Blockers:** none — all loci confirmed reachable; deferrals documented.
