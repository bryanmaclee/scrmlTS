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
7. **README updates** (`c65c52f`, `5a70fd0`, `82cb739`) — runtime type validation, variable renaming, fn pure functions, Tailwind engine, mutability contracts rewrite, benchmark refresh.
8. **Master-list cleanup** (`47c5703`) — Phase 2 Slice 3 marked complete, Phase 3/4d status updated.
9. **CE recursive slot fix** (`37b0c39`) — injectChildren recurses into markup children for nested `${render slotName()}`.
10. **Meta-eval scope injection** (`2e0d84b`) — preceding declarations + html-fragment serialization for compile-time meta.
11. **Machine transition guards** (`842fd44`) — `_emitReactiveSet` wires `emitTransitionGuard` for machine-bound reactive-decl. Top-level guards working; function body guards need machineBindings threading via emitFunctions.

### Phase 4d coverage
- **15 of 17 files** now ExprNode-first with string fallback
- Remaining: component-expander.ts (needs structural ExprNode matching), body-pre-parser.ts (inherently string-based)
- Next: drop string fields from AST types (the final mechanical deletion once CE is converted)

### Example 12 — render slot fix landed
- Root cause: `injectChildren` didn't recurse into nested markup children
- Fix: `_injectChildrenWalk` with shared `slotFound`/`spreadFound` state
- Top-level `<Card>` usages now expand correctly (render→slot substitution works)
- Remaining: `lift <Card>` inside for-loop not expanded (parser sees `<Card>` as text, not markup inside lift). `actions` prop conditional + `showAll()` also unresolved.

### Example 11 — meta-eval scope injection landed
- Fix 1: meta-eval now collects preceding const/let declarations from sibling logic blocks and parent scopes, injects into compile-time scope
- Fix 2: meta-checker detects emit() in html-fragment nodes (tokenizer classifies `emit(\`<div>...\`)` as html-fragment)
- Fix 3: meta-eval serializes html-fragment nodes with backtick restoration
- Fix 4: example wrapped `const palette` in `${}` (required for parser to recognize as code)
- Remaining: palette declaration still emits to client JS after compile-time consumption; reflect meta `${field.name}` interpolations produce runtime logic placeholders instead of static text

### Queued for next session
1. **Machine transition guards — function body threading.** `emitFunctions` in `emit-functions.ts` needs `machineBindings` from `buildMachineBindingsMap`. Export that function from `emit-reactive-wiring.ts`, call it in `emitFunctions`, pass through `cpsOpts`. Small plumbing change.
2. **Example 11 remaining** — strip consumed const declarations from client JS; resolve reflect meta `${field.name}` interpolations as static text.
3. **Example 12 remaining** — CE doesn't expand `<Card>` inside `lift` (parser sees it as text); `actions` prop conditional + `showAll()` unresolved.
4. **Lin Approach B implementation** — spec amendments drafted, multi-session scope.
5. **README audit** — do a systematic read-through to catch remaining gaps.

---

## Tags
#session-11 #in-progress

## Links
- [handOffs/hand-off-10.md](./handOffs/hand-off-10.md) — S10 final
- [pa.md](./pa.md)
- [master-list.md](./master-list.md)
