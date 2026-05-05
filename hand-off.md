# scrmlTS — Session 59 (OPEN — A1a dispatched, in flight)

**Date opened:** 2026-05-05
**Previous:** `handOffs/hand-off-58.md` (S58 close — Stage 0b COMPLETE)

---

## Session-start checklist (executed)

- [x] Read pa.md
- [x] Read PA-SCRML-PRIMER.md
- [x] Read S58 close hand-off
- [x] Verified both repos in sync with origin
- [x] Inbox empty
- [x] Read user-voice S58 entries

## What landed S59 so far

### L21 lock — `E-DERIVED-VALUE-MUTATE` FORBIDDEN + sibling rename E-REACTIVE-002 → E-DERIVED-WRITE

S56 outcomes ledger §3.14 open-Q resolved. PA presented case + 5 sub-decisions; user ratified in single 7-word turn ("forbidden, error severity, rename to E-DERIVED-WRITE, L21, go ahead").

**SPEC.md edits (commit `1217b41`):**
- §6.6.18 NEW (~100 lines): in-place mutation of `const`-derived cells forbidden. Covers (a) array mutating methods on derived array (`.push`, `.pop`, `.splice`, `.sort`, etc.); (b) property assignment / compound-assignment / `delete` on derived object; (c) in-compound derived sub-cells. Distinguished from siblings (E-DERIVED-WRITE, E-SYNTHESIZED-WRITE, E-DERIVED-WITH-VALIDATORS). Worked examples (invalid + valid-fix-pattern).
- §6.6.8 renamed E-REACTIVE-002 → E-DERIVED-WRITE; inline rename note left.
- §6.5.1 added note pointing to §6.6.18 / E-DERIVED-VALUE-MUTATE.
- §34 new entry; E-DERIVED-WRITE entry expanded.

**Cross-cutting docs (commit `8e5e459`):**
- IMPLEMENTATION-ROADMAP.md: open-Q + risk-table + Phase A2 §7 question all RESOLVED with cross-ref.
- DISPATCH-2-BRIEF.md: §3.6 + §7 entries marked LOCKED.
- PA-SCRML-PRIMER.md: §13 +L21 row; §11 anti-patterns +1 row; header date bumped.
- changelog.md: S59 entry added.

**scrml-support cross-repo (commit `9772c0f`):**
- Outcomes ledger §3.14 marked RESOLVED with cross-ref to scrmlTS commit.
- user-voice-scrmlTS.md S59 entries (verbatim user authorization + small-deliberation methodology note).

**Both repos pushed.** scrmlTS at `44afa5d`. scrml-support at `9772c0f`.

### Phase A1 entry plan ratified

User authorized **split (b)** — three sequential dispatches:
- **A1a — lex+parse** (this dispatch, in flight)
- **A1b — resolve+type** (next, depends on A1a landing)
- **A1c — codegen + PIPELINE.md prose pass** (last, depends on A1b)

Other A1 decisions (all PA-recommended, user-authorized):
- Agent persona: `scrml-dev-pipeline` (T2 tier, opus model, post-S57 fix has Edit + Grep + Bash)
- Test rewrite: pre-authorized per S56 destructive-ops directive; single CHANGELOG enumeration at close
- AST strategy: ADDITIVE — extend existing node types (option a)
- Snapshot tests location: `compiler/tests/integration/parse-shapes-v0next.test.js`
- PIPELINE.md prose pass: folded into A1c (NOT touched by A1a)
- Branch name: `phase-a1a-lex-parse`

### A1a dispatch brief committed (44afa5d)

Brief at `docs/changes/phase-a1a-lex-parse/DISPATCH-A1A-BRIEF.md` (~352 lines, 12 sections). Covers spec authority (§1/§3/§6/§11/§34), subsystems touched with file paths + LOC (tokenizer.ts 1,340 / ast-builder.js 8,270 / expression-parser.ts 2,559), all v0.next shapes, ~50-60 new snapshot tests, validation gates, F4 startup-verification block, crash-recovery discipline, T2 classification, final commit message template.

---

## A1a dispatch outcome — DECOMPOSED into 11 sub-dispatches

Three successive A1a dispatches landed iterative findings:

1. **rev-1 (agent `a193907...`):** halted at startup-verification — brief gave full-suite baseline (8,720) but worktree had empty `samples/compilation-tests/dist/` (gitignored). Result: ~130 ECONNREFUSED. Halt was correct; root cause was missing `bun run pretest` step in brief.
2. **rev-2 (agent `a0fe9e1...`):** halted on a 2-fail FIRST run that resolved cleanly on runs 2-3 (happy-dom timing flake). Halt was over-cautious; protocol amendment needed.
3. **rev-3 (agent `a07452d...`):** baseline cleared via flake protocol. Then agent invoked its system-prompt PHASE 0.5 doctrine (Pitfall 4 — Context Overflow) and decomposed the dispatch into 11 sequential sub-steps rather than running monolithic across 12k LOC × 11-19h. Produced two durable artifacts:
   - `docs/changes/phase-a1a-lex-parse/AST-CONTRACTS-AND-DECOMPOSITION.md` (143 lines) — A1b/A1c-facing AST interface contracts + lexer contracts + 11-step plan with file/line pointers.
   - `docs/changes/phase-a1a-lex-parse/progress.md` — append-only timestamped log.

**PA assessment:** the agent's call was correct. The brief was over-scoped for monolithic single-shot. Decomposition is the right path. Cherry-picked both commits to main as `3787086` + `a463b7a`. Branch `phase-a1a-lex-parse` retains the same two commits as ancestors; next sub-agent dispatches build on it.

**Three iteration findings now permanent:**
- `pa.md` F4 step 5 — `bun run pretest` mandate at fresh worktree startup.
- Brief §7.1 step 6 — flake-handling protocol (≤3 fails on run-1 + clean run-2 = stable).
- Brief was wrong on `reset` keyword status (agent verified: NOT in tokenizer's KEYWORDS set despite brief saying "already partially recognized"). Step 1 of decomposition addresses this.

## Next move — dispatch Step 1 (lexer: reserve `reset`)

Per AST-CONTRACTS-AND-DECOMPOSITION.md §3 row 1: ~1h scope.
- Files: `compiler/src/tokenizer.ts` lines 55-85 (add `reset` to KEYWORDS); new test file `compiler/tests/unit/tokenizer-reset-keyword.test.js` (4-6 cases).
- Sub-agent dispatch: `scrml-dev-pipeline`, worktree-isolated, branch `phase-a1a-lex-parse` (continuing).
- PRE-BRIEF should reference: tokenizer.ts:55-85, AST-CONTRACTS-AND-DECOMPOSITION.md §2.1 (lexer contract), test file location.

Subsequent steps follow the 11-step ladder; PA dispatches each.

---

## Open threads

1. **A1a in flight.** When agent completes: read `docs/changes/phase-a1a-lex-parse/progress.md` first, review test-rewrite enumeration, decide cherry-pick or branch-merge strategy, integrate, push.
2. **A1b dispatch brief pending.** PA writes after A1a integration — needs A1a's actual AST-shape contracts as input.
3. **A1c dispatch brief pending.** Includes PIPELINE.md prose pass per S59 fold-in decision.
4. **Phase B-track work** (examples / samples / stdlib audits) can run parallel — not yet authorized.

---

## State as of hand-off creation

- scrmlTS HEAD: `44afa5d` (pushed)
- scrml-support HEAD: `9772c0f` (pushed)
- Tests: 8,720 / 43 / 0 / 432 (pre-commit; full 8,763 / 43 / 0)
- Working trees: both clean
- Inbox: empty
- A1a worktree: created by harness at `.claude/worktrees/agent-a193907a0e18d1210/` (or similar; agent reports actual path in `pwd` at startup)

---

## Tags

#session-59 #open #l21-locked #phase-a1a-in-flight #stage-0b-landed
