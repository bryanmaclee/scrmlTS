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
