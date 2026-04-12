# scrmlTS — Session 8 Hand-Off

**Date:** 2026-04-12
**Previous:** `handOffs/hand-off-7.md`
**Baseline at start:** 5,703 pass / 155 fail across 5,858 tests (feat/expr-ast-phase-3-emit-expr @ `623aeac`)

---

## Session 8 — complete

### Commits (15 on main)

1. Markup attr ExprNode + emit-lift + emit-event-wiring — 6 dual-path sites, `is .Variant` fix (+6 passes)
2. ErrorArm.handler + UploadCallNode.file/url — 3 dual-path sites
3. When-effect + when-worker bodies — 3 dual-path sites
4. **Phase 3.5: escape hatch elimination** — `shouldSkipExprParse()` guard → **19.86% → 0%**
5. Phase 4: collapse multi-statement splitting — removed 89 lines dead code, 103 → 93 rewriteExpr
6. Tilde expression parser — context-aware `~` preprocessing (tildeActive option)
7. Parity test — 286-file corpus, 0 emitExpr errors, 0 compile errors
8. Merge to main (fast-forward, 18 branch commits)
9. **Found: 12 main-loop AST creation sites missing ExprNode** — let-decl, const-decl, reactive-decl (×2), reactive-derived-decl, tilde-decl, while-stmt, do-while-stmt, reactive-decl typed, reactive-decl server, reactive-decl shared
10. C-style for-loop cStyleParts — parse init/cond/update individually
11. CallRefAttrValue argExprNodes — per-arg ExprNode for event handler args
12. Cold-start project mapper refresh

### Final state

| Metric | Start | End |
|--------|-------|-----|
| Tests | 5,703 / 155 fail | **6,000 / 145 fail** |
| Dual-path sites | 39 | **57** |
| Escape-hatch rate | 19.86% | **0%** |
| ExprNode coverage | ~28.8% | **86.2%** (1735/2013) |
| rewriteExpr calls | 103 | **93** |

### Key findings
- **12 AST creation sites in the main parseLogicBody loop were never wired with ExprNode.** Tests passed because the string fallback handled everything. The ExprNode fast-path was dead code for those nodes. This is exactly the class of bug that gauntlets catch — tests validate the legacy path, not the new one.
- **`~` (tilde) collision with JS bitwise NOT** resolved via context-aware parsing. Only preprocesses `~` as tilde accumulator when `_tildeActive` flag is set (after value-lift). Outside tilde context, `~` is JS bitwise NOT.

### Phase 4 wall
Remaining 278 expressions without ExprNode are irreducible for current architecture:
- 263 bare-expr HTML tag fragments (intentionally skipped by `shouldSkipExprParse`)
- 11 C-style for-loop iterables (skipped — parts parsed individually via cStyleParts)
- 4 error-arm block bodies (multi-statement, can't be single ExprNode)

Further reduction requires structural AST changes (parsing HTML fragments as markup nodes, parsing error-arm bodies as statement arrays).

### Non-compliance report
4 stale docs flagged for deref to scrml-support/archive/ (deferred to cleanup pass):
- `docs/changes/self-host-ast-exprnode-resync/progress.md`
- `docs/changes/expr-ast-phase-1/anomaly-report.md`
- `docs/changes/expr-ast-phase-2-slice-1/anomaly-report.md`
- `docs/changes/expr-ast-phase-2-slice-2/anomaly-report.md`

### Next up
1. **Phase 4 continued** — structural AST changes to reduce the 278 irreducible gaps
2. **Cleanup pass** — deref 4 stale docs, process uncertain docs
3. **Gauntlet** — compilation parity gauntlet if structural changes warrant it
4. **Other master-list items** — unblock giti/6nz

---

## Tags
#session-8 #complete #phase-3-complete #phase-3.5-complete #phase-4-started #zero-escape-hatches #maps-refreshed

## Links
- [handOffs/hand-off-7.md](./handOffs/hand-off-7.md) — S7 final
- [pa.md](./pa.md)
- [master-list.md](./master-list.md)
