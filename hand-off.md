# scrmlTS — Session 6 Hand-Off

**Date:** 2026-04-12
**Previous:** `handOffs/hand-off-5.md`
**Baseline at start:** 5,703 pass / 153 fail / 2 skip across 5,858 tests (main @ `233a533`)

---

## Session 6 — in progress

### Session-start observations
- **No incoming messages** in `handOffs/incoming/`.
- **Test baseline shifted** from S5's reported 4,913 unit / 96 integration to 5,858 total (5,703 pass, 153 fail, 2 skip). The 153 failures span self-host parity (known 16), DOM/runtime tests (bind:value, class-binding, reactive, component, control, form, transition), and self-host bootstrap. Need to characterize which are pre-existing vs new.
- Git is clean on main @ `233a533`.

### Carry-forward priorities (from S5)
1. ~~**Phase 2 Slice 4** — delete Pass 2 fallback~~ ✅
2. ~~**Self-host `ast.scrml` resync slice** — close the 16 pre-existing parity failures~~ ✅
3. **Phase 2 continued passes** — ~~TildeTracker~~ ✅, protect-analyzer, extractReactiveDeps, dependency-graph, meta-checker, error-effect callee extraction

### Decisions
- **153 pre-existing test failures assessed** — 132 DOM/runtime (orthogonal to Phase 2), 18 self-host parity (now 2 — tokenizer + bootstrap), 1 if-as-expression, 2 runTS. Decision: safe to clean up later, not blocking Phase 2 work.
- **Bug 6 (E-SYNTAX-043 partial) closed as non-issue** — all realistic presence guard patterns are caught. Only keywords-as-variable-names (`fn`, `let`) miss, which is correct behavior (not valid variable names).
- **Bug 7 (WebSocket CLI) was already fixed** — stale master-list entry struck through.

### Merged to main this session
- **Phase 2 Slice 4** — deleted Pass 2 string-scan fallback from `scanNodeExprNodesForLin`. Removed `extractAllIdentifiersFromString`, `extractIdentifiersExcludingLambdaBodies`, Pass 2 block, `consumedThisNode` dedup set. -240 LOC. ExprNode walker is now the sole lin enforcement path.
- **MustUseTracker ExprNode migration** — `scanNodeExpressions` now walks ExprNode parallel fields via `forEachIdentInExprNode`. String fallback retained for Phase 1 gaps.
- **tilde-decl initExpr migration** — walks `initExpr` via `forEachIdentInExprNode` when available, string regex fallback otherwise.
- **Self-host ast.scrml ExprNode resync** — ported `safeParseExprToNode` + all ExprNode parallel fields (`initExpr`, `condExpr`, `iterExpr`, `exprNode`, `valueExpr`, `headerExpr`) to `ast.scrml`. Both parse loops covered. 16 parity failures → 0. Two-stage import fallback for production vs test contexts.
- **master-list.md** — bugs 6+7 closed, Slice 4 + MustUseTracker marked complete.

### Current baseline
5,719 pass / 137 fail / 2 skip across 5,858 tests (main post-merge)

### Next up
1. **Phase 2 remaining passes** — protect-analyzer, extractReactiveDeps, dependency-graph, meta-checker, error-effect callee extraction (each its own slice)
2. **Phase 3 — codegen migration** — `rewriteExpr(string)` → `emitExpr(ExprNode)` across ~14k LOC

---

## Tags
#session-6 #active #phase-2 #slice-4 #self-host-resync #merge

## Links
- [handOffs/hand-off-5.md](./handOffs/hand-off-5.md) — S5 final
- [pa.md](./pa.md)
- [master-list.md](./master-list.md)
