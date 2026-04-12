# scrmlTS — Session 7 Hand-Off

**Date:** 2026-04-12
**Previous:** `handOffs/hand-off-6.md`
**Baseline at start:** 5,711 pass / 145 fail / 2 skip across 5,858 tests (main @ `a7a6e04`)

---

## Session 7 — in progress

### Session-start observations
- **No incoming messages** in `handOffs/incoming/`.
- **Phase 2 semantic passes are complete** (S6 wrap). All semantic passes have ExprNode-first paths.
- **Corrected baseline:** actual test run shows 5,711/145/2 (non-deterministic browser/dist tests).

### Decisions
- **User wants escape hatches eliminated** — not just deferred. Phase 3.5 is on the agenda.
- **User wants to push hard** — move fast to unblock other projects.
- **`<request>` confirmed spec-backed** — §6.7.7 declarative async fetch state. Not a workaround.
- **README CLI commands updated** — `scrml compile/dev/build/init` replaces `bun compiler/src/cli.js`.

### Commits on feat/expr-ast-phase-3-emit-expr (9 so far)

1. **Scaffold emitExpr + wire 35 dual-path call sites** — new `emit-expr.ts` (290 LOC, all 19 ExprNode kinds), `_makeExprCtx` helper, initial wiring across emit-logic, emit-control-flow, emit-server, scheduling.
2. **Fast-path early returns** — when initExpr/exprNode present, skip all string splitting/merging for bare-expr, let-decl, const-decl, reactive-decl, reactive-derived-decl, return-stmt.
3. **LiftTarget ExprNode + emit-lift.js** — added `exprNode` to LiftTarget `{ kind: "expr" }` variant, populated in ast-builder at both lift-expr creation sites, wired 4 sites in emit-lift.js. Test assertion updated (ExprNode produces cleaner JS: `primes.push(i)` vs tokenizer-spaced `primes . push ( i )`).
4. **LiftTarget exprNode tilde paths** — 3 lift-expr value-lift sites wired.
5. **README CLI commands** — all `bun compiler/src/cli.js` → `scrml`.
6. **cleanup/debounce/throttle/array-mutation ExprNode** — upstream `callbackExpr`, `fnExpr`, `argsExpr` fields + 5 downstream wiring sites.
7. **fail-expr and reactive-explicit-set ExprNode** — upstream `argsExpr` fields + downstream wiring.
8. **Master-list update** — Phase 2 complete, Phase 3 in-progress, Phase 3.5 on roadmap.
9. *(pending: bug 5 fix — 2 skipped tests, running in background agent)*

### Current state
- **47+ external emitExpr call sites** across 6 consumer files
- **~103 rewriteExpr calls remain** across 8 files (including ~17 dual-path fallbacks that are already wired)
- **Zero test regressions** throughout
- **Remaining string-only sites** are blocked on upstream AST changes:
  - Markup interpolation parts need ExprNode (unlocks emit-lift.js + emit-event-wiring.ts)
  - Error-effect handler bodies need structured AST (unlocks rewriteBlockBody)
  - SQL template params are extracted as raw strings
  - C-style for-loop parts parsed from regex matches
  - Switch case labels and match arm results are string fragments

### Current baseline
~5,705 pass / ~151 fail / 2 skip across 5,858 tests (non-deterministic browser tests)

### Next up
1. **Phase 3 continued** — markup interpolation ExprNode (biggest remaining unlock)
2. **Phase 3.5 — escape hatch elimination** — drive 20% rate to zero
3. **Phase 4 — drop string fields** from AST shape
4. **Merge branch to main** when ready

---

## Tags
#session-7 #in-progress #phase-3 #phase-3-slice-1 #emitExpr #readme-fix

## Links
- [handOffs/hand-off-6.md](./handOffs/hand-off-6.md) — S6 final
- [pa.md](./pa.md)
- [master-list.md](./master-list.md)
