# scrmlTS — Session 18 Hand-Off (in progress)

**Date:** 2026-04-14
**Previous:** `handOffs/hand-off-17.md` (rotated post-outage, reconstructed)
**Baseline at start:** 6,205 pass / 14 fail (S16 end; S17 additions were spec/codegen + tests green per commits, exact count to verify)

---

## Session start

- Read `pa.md`, `hand-off.md` (S17 stub), last contentful user-voice entries (through S16).
- Inbox `handOffs/incoming/`: empty (only `read/` subdir).
- Power-outage recovery: S17 stub rotated → `handOffs/hand-off-17.md` with addendum reconstructing what shipped from git log (Slice 6, Slice 5b remainder, benches, S17 docs — all on main).
- 4 staged agents still present (debate-curator, debate-judge, scrml-language-design-reviewer, scrml-server-boundary-analyst) — leave until asked.
- Uncommitted stragglers noted: `docs/changes/expr-ast-phase-1-audit/escape-hatch-catalog.{json,md}` — 2-line diff each (timestamp drift, pre-dates S17). Untracked `handOffs/hand-off-16.md` from S17 start-of-session rotation (needs to be committed or included in next docs commit).

## S18 priorities — re-scoped mid-session ("we just went public")

User redirected from internal cleanup → public-facing compiler functionality.

### Complete
- **P1 — README SQL-batching expansion** — commit `d20ffa4`. Five new Server/Client bullets (Tier 1 envelope, Tier 2 N+1 rewrite, mount coalescing, `.nobatch()`, batch diagnostics) + tightened "Why scrml" paragraph + `?{}` contexts-table row.
- **P2 — Lift Approach C Phase 2c-lite** — commit `f5d78df`. Dropped the confirmed-dead BS+TAB re-parse block inside `emitLiftExpr` (−50 LOC). Full Phase 2 (delete `parseTagExprString` + refactor `emitConsolidatedLift` + self-host mirror) deferred — requires instrumentation + corpus run to prove the helpers are dead in consolidated-lift path.

### Active (re-scoped)
- **Kill the 12 non-self-host test failures** — 14 pre-existing fails, minus 2 self-host (user deprioritized). Targets: 2 `type-system.test.js`, 1 `if-as-expr.test.js`, 1 `reactive-arrays.test.js` codegen, 1 ex05, 8 TodoMVC happy-dom (likely harness vs compiler).
- **Finish 6–9 partial-interactivity examples** (§E 03/05/06/07/08/09/11/12/13) — public demos, smoke-pass complete, interactive verification partial.

### Deferred per user
- P3 self-host (CE+ME port, idiomification)
- P5 TS migrations (ast-builder, block-splitter)
- P5 ExprNode Phase 4d/5 (architectural)
- Lift Phase 2 full (internal cleanup)

### Misc open threads
- S17 user-voice never written (power outage) — reconstruct or skip
- `lin` redesign (queued per auto-memory)

## Tags
#session-18 #start #power-outage-recovery
