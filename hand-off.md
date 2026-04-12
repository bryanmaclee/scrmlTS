# scrmlTS — Session 9 Hand-Off

**Date:** 2026-04-12
**Previous:** `handOffs/hand-off-8.md`
**Baseline at start:** 6,000 pass / 145 fail across 6,145 tests (main @ `4a54331`)

---

## Session 9 — in progress

### Commits (2 on feat/phase-4a-html-fragment)

1. **ExprNode wiring + HTML fragment reclassification** — wire exprNode on 12 bare-expr creation sites across all 3 parse loops; add `HtmlFragmentNode` type; reclassify 137 HTML fragments from bare-expr; update emit-logic, emit-lift, type-system. Coverage 86.2% → 98.8%.
2. **Error-arm block handlers** — strip braces from block handlers before ExprNode parsing via `_parseHandlerExpr` helper. 4 gaps closed. Coverage 98.8% → 99.0%.

### State

| Metric | S8 End | S9 Current |
|--------|--------|------------|
| Tests | 6,000 / 145 fail | **6,000 / 145 fail** (0 regressions) |
| ExprNode coverage | 86.2% (1735/2013) | **99.0% (1858/1876)** |
| Total expression sites | 2013 | 1876 (137 reclassified to html-fragment) |
| Remaining gaps | 278 | **18** (all irreducible) |

### Remaining 18 gaps (irreducible)

- **11 C-style for-loop iterables** — `iterExpr` is empty but `cStyleParts` has init/cond/update as ExprNodes. Codegen already uses cStyleParts when present. Fully covered.
- **3 `.all()` method chains** — SQL chained calls, not standalone JS expressions.
- **4 `.Variant :> "label"` match arms** — enum/match patterns embedded in bare-expr, not JS.

All 18 are structurally non-expression content. No further coverage improvement possible without fundamentally changing what counts as an "expression site."

### Key findings
- **119 bare-expr sites in Loop 2 (parseRecursiveBody) were never wired with ExprNode.** Same class of bug as S8's 12 main-loop sites — the second parse loop was cloned without propagating ExprNode wiring to malformed-declaration fallbacks and `@name-as-expression` paths.
- **MustUseTracker false negative** — reclassifying HTML fragments from bare-expr to html-fragment broke TodoMVC because the type system was accidentally scanning HTML strings (via `node.expr`) to find tilde-decl variable references. Fixed by adding `node.content` to the scanned string fields.

### Non-compliance report (carried from S8)
4 stale docs flagged for deref to scrml-support/archive/:
- `docs/changes/self-host-ast-exprnode-resync/progress.md`
- `docs/changes/expr-ast-phase-1/anomaly-report.md`
- `docs/changes/expr-ast-phase-2-slice-1/anomaly-report.md`
- `docs/changes/expr-ast-phase-2-slice-2/anomaly-report.md`

### Next up
1. **Merge to main** — fast-forward feat/phase-4a-html-fragment
2. **Phase 4d planning** — drop string fields (the payoff). Requires audit of all consumers.
3. **Cleanup pass** — deref 4 stale docs
4. **Other master-list items** — unblock giti/6nz

---

## Tags
#session-9 #in-progress #phase-4a-complete #phase-4b-complete #phase-4c-verified #99-percent-exprnode

## Links
- [handOffs/hand-off-8.md](./handOffs/hand-off-8.md) — S8 final
- [pa.md](./pa.md)
- [master-list.md](./master-list.md)
