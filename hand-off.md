# scrmlTS — Session 9 Hand-Off

**Date:** 2026-04-12
**Previous:** `handOffs/hand-off-8.md`
**Baseline at start:** 6,000 pass / 145 fail across 6,145 tests (main @ `4a54331`)

---

## Session 9 — complete

### Commits (5 on main)

1. **ExprNode wiring + HTML fragment reclassification** — wire exprNode on 12 bare-expr creation sites across all 3 parse loops; add `HtmlFragmentNode` type; reclassify 137 HTML fragments from bare-expr; update emit-logic, emit-lift, type-system. Coverage 86.2% → 98.8%.
2. **Error-arm block handlers** — strip braces from block handlers before ExprNode parsing via `_parseHandlerExpr` helper. 4 gaps closed. Coverage 98.8% → 99.0%.
3. **Cleanup** — deref 4 stale docs to scrml-support/archive, update hand-off + master-list.
4. **Phase 4d Slice 1** — fix missing `initExpr` on reactive-debounced-decl in second parser; add 4 missing ExprNode type declarations.
5. **Type-system CE data-flow fix** — `annotateNodes`, `collectFnErrorTypes`, `hasProgramDbAttr`, `checkLoopControl`, `buildMachineRegistry` all received empty arrays from CE-processed files due to AST nesting mismatch (`fileAST.nodes` vs `fileAST.ast.nodes`). Fixed with dual-shape fallback at 6 sites. Added `machineRegistry` parameter to `annotateNodes`. Transformed example 14 to pure scrml (tilde-decl derived, machine-bound `@marioState`).

### State

| Metric | S8 End | S9 End |
|--------|--------|--------|
| Tests | 6,000 / 145 fail | **6,000 / 146 fail** (+1: TodoMVC E-SCOPE-001 unmasked) |
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

### Non-compliance report
4 stale docs dereffed to scrml-support/archive/ (done this session).

### Known issue (new)
- **TodoMVC E-SCOPE-001** — `@todos.length` in `if=` attribute triggers unresolved-identifier error. Pre-existing false positive unmasked by the CE data-flow fix. The scope checker doesn't handle dotted property access on reactive vars in attribute context.

### Next up
1. **Fix TodoMVC E-SCOPE-001** — scope checker needs to handle `@var.prop` in attributes
2. **Machine transition guards** — wire guard emission in reactive-decl and bare-expr codegen paths (T2)
3. **Phase 4d Slice 2** — build ExprNode walker utilities (plan at `~/.claude/plans/melodic-enchanting-cray.md`)
4. **Other master-list items** — unblock giti/6nz

---

## Tags
#session-9 #complete #phase-4a-complete #phase-4b-complete #phase-4c-verified #phase-4d-slice1 #99-percent-exprnode #machine-binding-unblocked #type-system-ce-fix

## Links
- [handOffs/hand-off-8.md](./handOffs/hand-off-8.md) — S8 final
- [pa.md](./pa.md)
- [master-list.md](./master-list.md)
