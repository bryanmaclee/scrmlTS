# scrmlTS — Session 14 Hand-Off

**Date:** 2026-04-14
**Previous:** `handOffs/hand-off-13.md`
**Baseline at start:** 6,130 pass / 15 fail (from S13 end state)

---

## Session 14 Summary

### Compiler fix landed (1)

**Match-as-expression** (S13 debate consensus, §18.3):
- `let result = match expr { .Variant => value else => default }` now works
- Follows existing if/for-as-expression pattern: intercepts `match` after `let/const name =`, parses structurally via `parseRecursiveBody`, emits tilde-var assignment pattern
- 4 files changed: `types/ast.ts` (added `MatchExprNode`, `ForExprNode` interfaces + fields on decl nodes), `ast-builder.js` (4 insertion sites + `parseOneMatchAsExpr` helper), `emit-logic.ts` (`emitMatchExprDecl` using shared arm parsing), `emit-control-flow.ts` (exported `splitMultiArmString`, `parseMatchArm`, `MatchArm`)
- Handles: variant arms, string arms, `not` arm, `else` wildcard, `partial match`, structured `match-arm-block` bodies with `lift`
- Tests: 6,131 pass / 15 fail (net +1 pass, zero regressions)

### Phase 4d progress — ExprNode-first migration

**A. `node.condition`** (2 string-only sites → 0):
- `type-system.ts:2928` — W-ASSIGN-001: now checks `condExpr` for `AssignExpr` at root, falls back to string regex
- `type-system.ts:3998` — must-use scanner: now skips string fields when ExprNode equivalents present

**B. `node.iterable`** (6 sites — 4 already migrated, 2 converted):
- `emit-control-flow.ts`, `emit-logic.ts` (3 sites) — already used `emitExprField(node.iterExpr, ...)` for emit
- `emit-client.ts:183` — reactive @var detection now checks `iterExpr.kind === "ident"` first, string fallback
- `meta-eval.ts:266, 280` — for-loop/for-stmt serialization now uses `emitStringFromTree(iterExpr)` first

**C. `node.init` easy sites** (4 migrated):
- `emit-logic.ts:401` — tilde-decl `extractReactiveDeps` now uses `extractReactiveDepsFromExprNode(initExpr)` first
- `emit-logic.ts:485` — reactive-derived-decl same pattern
- `emit-logic.ts:457` — `_wrapDeepReactive` now accepts `initExpr` param, checks ExprNode kind (object/array/new) structurally
- `reactive-deps.ts:126` — `collectReactiveVarNames` tilde-decl check uses `_exprNodeHasReactiveRef(initExpr)` first

**New exports added:** `extractReactiveDepsFromExprNode` in `reactive-deps.ts`

### Queued

**Still queued (from S12):**
- Lift Approach C — structured LiftExpr AST nodes, eliminate re-parse path (multi-session)
- Phase 2 reactive effects — two-level effect separation for if/lift (when needed)
- Lin Approach B implementation — spec amendments drafted, multi-session scope
- Phase 4d completion — drop string fields from AST types (15/17 files done)

**Beta readiness work:**
- Verify example 06 kanban onclick works after call-ref fix
- Triage remaining 15 test failures (low priority — all pre-existing)
- Ensure `scrml dev` serves examples with hot reload

---

## Tags
#session-14 #in-progress

## Links
- [handOffs/hand-off-13.md](./handOffs/hand-off-13.md) — S13 final
- [pa.md](./pa.md)
- [master-list.md](./master-list.md)
