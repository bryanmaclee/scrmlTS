# scrmlTS — Session 8 Hand-Off

**Date:** 2026-04-12
**Previous:** `handOffs/hand-off-7.md`
**Baseline at start:** 5,703 pass / 155 fail / 0 skip across 5,858 tests (feat/expr-ast-phase-3-emit-expr @ `623aeac`)

---

## Session 8 — in progress

### Session-start observations
- **No incoming messages** in `handOffs/incoming/`.
- **Working tree clean** — S7 ended with all work committed.
- **Branch:** `feat/expr-ast-phase-3-emit-expr` (17 commits ahead of main).

### Decisions
*(none yet)*

### Commits on feat/expr-ast-phase-3-emit-expr (this session — 6 commits)

1. **Markup attr ExprNode + emit-lift + emit-event-wiring** — `exprNode?` on `ExprAttrValue`/`VariableRefAttrValue`, 6 new dual-path sites, `is .Variant` emitExpr fix. (+6 passes)
2. **ErrorArm.handler + UploadCallNode.file/url** — 3 new dual-path sites.
3. **When-effect + when-worker bodies** — 3 new dual-path sites.
4. **Phase 3.5: escape hatch elimination** — `shouldSkipExprParse()` guard. **19.86% → 0%** escape-hatch rate.
5. **Phase 4: collapse multi-statement splitting** — removed 89 lines of dead string-splitting fallback code. rewriteExpr calls 103 → 93.
6. **Tilde expression parser** — `~` now parsed to ExprNode via `__scrml_tilde__` placeholder. Tilde-containing expressions use the fast path.

### Current state
- **51 dual-path emitExpr sites** (was 39)
- **93 rewriteExpr calls** (was 103)
- **Escape-hatch rate: 0%**
- **Baseline: 5,709 pass / 149 fail** (was 5,703/155)
- **Branch: 17 commits ahead of main**, zero regressions

### Gauntlet readiness assessment
**The branch is merge-ready.** All changes are backwards-compatible (new optional fields, dual-path fallbacks). The ExprNode infrastructure is complete:
- Expression parser handles all scrml-specific patterns (@, ~, is, match, enum variants)
- emitExpr covers all 19 ExprNode kinds + escape-hatch fallback
- 51 call sites prefer ExprNode → emitExpr, fall back to rewriteExpr when unavailable
- 0% escape-hatch rate across the example corpus
- Phase 4 simplification started — dead string-splitting code removed

**Recommended gauntlet scope:** After merging to main, run a gauntlet against the full compilation test corpus (275 samples) to verify ExprNode codegen parity across all language features.

### Next up
1. **Merge branch to main**
2. **Gauntlet: full compilation test corpus** — verify ExprNode path produces identical output
3. **Phase 4 continued** — collapse remaining string-splitting fallbacks
4. **Phase 5 (future)** — make ExprNode fields required, remove string fields

---

## Tags
#session-8 #in-progress #phase-3-complete #phase-3.5-complete #phase-4-started #gauntlet-ready

## Links
- [handOffs/hand-off-7.md](./handOffs/hand-off-7.md) — S7 final
- [pa.md](./pa.md)
- [master-list.md](./master-list.md)
