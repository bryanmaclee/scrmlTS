# scrmlTS — Session 13 Hand-Off

**Date:** 2026-04-13
**Previous:** `handOffs/hand-off-12.md`
**Baseline at start:** 5,998 pass / 147 fail across 6,145 tests (main @ `7c8467d`)

---

## Session 13 — In Progress

### Context recovery
S12 PA failed to write user-voice and failed to persist end-of-session planning to hand-off. The plan (3 deep-dives, 3 debates, agent staging) was reconstructed from the sole surviving artifact: the staging message `2026-04-13-2215-scrmlTS-to-master-stage-agents.md`. User-voice entries for S12's planning context were reconstructed and appended.

### Priority: Deep-dives then debates, THEN compiler fixes
User directive from S12: "do it right, the first time." Research the problems thoroughly before implementing fixes.

### Plan (recovered from S12 staging request)

**Phase 1 — Deep-dives (3):**
1. **DD-1: Lift Expression Architecture** — How should `${...}` inline expressions in lift-produced markup attributes survive the BS+TAB re-parse? Two approaches: (a) preserve BLOCK_REF children from original token stream, (b) skip re-parse, use different codegen strategy.
2. **DD-2: Parser Robustness** — Match/brace ambiguity: `collectLiftExpr` truncates function bodies after match `}`. Also DQ-12 Phase B bare compound expressions.
3. **DD-3: Reactive Rendering Model** — Is innerHTML clear + re-render via `_scrml_effect` correct for if/lift and for/lift? Alternatives: fine-grained reactivity, VDOM diffing, compile-time template splitting. Interaction with `_scrml_reconcile_list`.

**Phase 2 — Debates (3, fed by deep-dive outputs):**
1. **Lift Codegen Strategy** — Svelte, Solid, React, TypeScript perspectives
2. **Parser Architecture** — Rust, Odin, TypeScript perspectives
3. **Reactive Rendering Model** — Svelte, Solid, Vue, React perspectives

**Phase 3 — Implementation** (after debates inform approach):
1. Lift attribute expression handling
2. Parser statement truncation after match
3. Tilde-decl reactivity gaps (DG doesn't track `if=(@tildeName)`)

### Fixes Landed (from deep-dives + debates)

**Fix 1a — Parser ASI + trailing-content guard** (DONE):
- `ast-builder.js:947` — expanded `lastEndsValue`: added `}`, `true`, `false`, `null`, `undefined`, `this`, `AT_IDENT`
- `ast-builder.js:1100` — added equivalent ASI check to `collectLiftExpr`
- `expression-parser.ts:parseExprToNode` — added trailing-content guard: warns when multi-line trailing content detected after parsing one expression
- Verified: `@vulnerable = false\nupdateDisplay()` now produces two separate AST nodes

**Fix 2 — Lift call-ref handler** (DONE):
- `emit-lift.js:492` — fixed `call-ref` handler: now reconstructs full function call with arguments using `emitExprField`/`rewriteExpr`
- `emit-lift.js:1354-1374` — added paren-space collapsing to normalization regex
- `emit-lift.js:520` — added exhaustiveness guard for unhandled `val.kind`

**Fix 3a — Tilde-decl DG gap** (DONE):
- `dependency-graph.ts` — added `collectAllTildeDecls` function
- `dependency-graph.ts:742` — tilde-decl nodes with reactive deps added to derived decls collection
- `dependency-graph.ts:1051` — if-stmt condition now scanned for reactive refs in `walkBodyForReactiveRefs`
- `dependency-graph.ts:1135` — added `"condition"` to string fallback fields in `collectReadsAndCalls`

**Fix 3b — Branch guard for if/lift** (DONE):
- `emit-reactive-wiring.ts:193` — single if-stmt lift blocks now cache condition result; skip innerHTML clear on same-branch re-evaluation

### Still Queued (from plan)

### Implementation Plan (from deep-dives + debates)

**Fix 1a — Parser ASI + trailing-content guard** (highest value, ship first):
- `ast-builder.js:947` — expand `lastEndsValue`: add `}`, `true`, `false`, `null`, `undefined`, `this`
- `ast-builder.js:1067-1133` — add equivalent ASI check to `collectLiftExpr`
- `parseExprToNode` — add trailing-content guard: if unparsed content remains after one expression, emit compile error (converts silent data loss → loud failure)
- Test: `@vulnerable = false\nupdateDisplay()` must produce two separate AST nodes

**Fix 1b — Structured match-as-expression** (follow-up):
- Add match-as-expression path following existing if/for-as-expression pattern (lines 2884, 2895)
- Parser recognizes `match` as compound expression head, recurses into structured parsing

**Fix 2 — Lift call-ref handler** (unblocks kanban + all lift onclick):
- `emit-lift.js:492-495` — fix `call-ref` handler to emit function arguments (currently discards them)
- `emit-lift.js:1345-1360` — add paren-space collapsing to normalization regex
- Add exhaustiveness guard for unhandled `val.kind` in attribute switch
- Future: Approach C (structured LiftExpr AST nodes, eliminate re-parse) deferred

**Fix 3a — Tilde-decl DG gap** (~20 lines):
- `dependency-graph.ts` — create ReactiveDGNode entries for tilde-decl nodes
- `dependency-graph.ts:walkBodyForReactiveRefs` — scan if-stmt `condition` field for reactive refs

**Fix 3b — Branch guard for if/lift** (~6 lines):
- Cache last condition result in if/lift effects
- Skip innerHTML clear when condition evaluates to same branch

### Also queued (lower priority)
4. Lin Approach B implementation — spec amendments drafted, multi-session scope
5. README audit — systematic read-through (specced-but-not-implemented section, fire clarification)

### Incoming messages
None.

---

## Tags
#session-13 #in-progress

## Links
- [handOffs/hand-off-12.md](./handOffs/hand-off-12.md) — S12 final
- [pa.md](./pa.md)
- [master-list.md](./master-list.md)
