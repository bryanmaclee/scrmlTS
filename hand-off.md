# scrmlTS — Session 11 Hand-Off

**Date:** 2026-04-13
**Previous:** `handOffs/hand-off-10.md`
**Baseline at start:** 6,000 pass / 145 fail across 6,145 tests (main @ `d8e22d5`)

---

## Session 11 — in progress

### Commits

1. **Benchmark refresh** (`47ba51e`) — recompiled TodoMVC with current compiler, re-ran all 4 frameworks in headless Chrome. scrml wins 6/10. Build time 30.9→43.7ms, bundle 13.4→14.8 KB gzip.
2. **Phase 4d Slice 4a** (`121eb42`) — introduced `emitExprField` helper, replaced 27 dual-path ternaries across 6 codegen files. Zero regressions.
3. **Phase 4d meta-checker** (`bbf3a3a`) — 5 meta-checker functions converted to ExprNode-first with string fallback.
4. **Phase 4d scheduling+collect+route-inference** (`d5ed977`) — 8 route-inference sites, 4 scheduling sites, 3 collect sites → ExprNode-first.
5. **Phase 4d meta-eval** (`8582245`) — serializeNode: bare-expr, let-decl, const-decl, if-stmt, default → ExprNode-first.
6. **Phase 4d codegen edge files** (`d3eeeff`) — emit-bindings, emit-reactive-wiring, emit-client, emit-html → ExprNode-first.

### Phase 4d coverage
- **15 of 17 files** now ExprNode-first with string fallback
- Remaining: component-expander.ts (needs structural ExprNode matching), body-pre-parser.ts (inherently string-based)
- Next: drop string fields from AST types (the final mechanical deletion once CE is converted)

### Queued (from S10)
1. **lin redesign deep-dive** — discontinuous scoping (user's original vision), debate if needed
2. **Example 11/12 fixes** — meta-eval scope injection, component slot rendering
3. **Machine transition guards** — wire guard emission (T2)
4. **Phase 4d Slice 4** — make ExprNode required, drop string fields
5. **Fresh benchmarks** — re-run now that TodoMVC compiles (E-SCOPE-001 fixed)

---

## Tags
#session-11 #in-progress

## Links
- [handOffs/hand-off-10.md](./handOffs/hand-off-10.md) — S10 final
- [pa.md](./pa.md)
- [master-list.md](./master-list.md)
