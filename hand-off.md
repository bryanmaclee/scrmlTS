# scrmlTS — Session 7 Hand-Off

**Date:** 2026-04-12
**Previous:** `handOffs/hand-off-6.md`
**Baseline at start:** 5,711 pass / 145 fail / 2 skip across 5,858 tests (main @ `a7a6e04`)

---

## Session 7 — in progress

### Session-start observations
- **No incoming messages** in `handOffs/incoming/`.
- **Git status:** two modified files in `docs/changes/expr-ast-phase-1-audit/` (escape-hatch-catalog.json + .md) — uncommitted from S6.
- **Phase 2 semantic passes are complete** (S6 wrap). All semantic passes have ExprNode-first paths.
- **Corrected baseline:** actual test run shows 5,711/145/2 (not 5,719/137 as S6 hand-off stated — non-determinism in browser/dist tests).

### Carry-forward priorities (from S6)
1. **Phase 3 — codegen migration** — ~14k LOC codegen. Kills 18 client + 15 server rewrite passes. 4-6 sessions estimated.
2. **Phase 4 — drop string fields** from AST shape (after Phase 3).
3. **Phase 3.5 — escape hatch elimination** — drive 20% escape-hatch rate to zero.

### Decisions
- **User wants escape hatches eliminated** — not just deferred. Phase 3.5 is on the agenda after Phase 3.
- **User wants to push hard** — move fast to unblock other projects.

### Work completed this session

#### Phase 3 Slice 1 — scaffold `emitExpr` + initial call site wiring
- **New file: `compiler/src/codegen/emit-expr.ts`** (290 LOC) — full `emitExpr()` dispatcher covering all 19 ExprNode kinds:
  - Leaf: `ident` (reactive/tilde/plain), `lit` (including `not` → null)
  - Compound: `array`, `object`, `spread`
  - Operations: `unary`, `binary` (with §42/§43/§45 special cases), `assign` (with reactive set), `ternary`
  - Access: `member`, `index`, `call` (with navigate/render special cases), `new`
  - Lambda: all 3 styles (arrow, fn, function), expression + block body
  - Cast: type erasure
  - Domain: `match-expr` (stub → fallback), `sql-ref` (stub), `input-state-ref`
  - Escape hatch: falls back to `rewriteExpr(raw)` / `rewriteServerExpr(raw)`
- **25 dual-path call sites wired across 5 files:**
  - `emit-logic.ts` (14 sites): let-decl, const-decl, tilde-decl, reactive-decl, reactive-derived-decl, reactive-debounced-decl, reactive-nested-assign, lin-decl, return-stmt, throw-stmt, propagate-expr, guarded-expr (2 paths), _emitIfStmtWithOpts
  - `emit-control-flow.ts` (7 sites): emitIfStmt, emitForStmt (reactive + plain), emitWhileStmt, emitDoWhileStmt, emitMatchExpr, emitSwitchStmt
  - `emit-server.ts` (2 sites): server-side reactive-decl init (both CPS paths)
  - `scheduling.ts` (2 sites): extractInitExpr (init + expr)
- **Zero test regressions** — 5,711 pass / 145 fail / 2 skip (matches clean baseline exactly)
- **Zero type errors** in all modified files

### Current baseline
5,711 pass / 145 fail / 2 skip across 5,858 tests

### Remaining rewriteExpr call sites
~87 calls still use string pipeline (excluding emit-expr.ts internal fallbacks and rewrite.ts self-references):
- `emit-logic.ts`: ~43 (split-statement paths, bare-expr, when-effect, sql, etc.)
- `emit-control-flow.ts`: ~10 (C-style for, rewriteBlockBody arms, case labels)
- `emit-lift.js`: 11 (lift expression emission)
- `compat/parser-workarounds.js`: 7 (legacy compat)
- `emit-event-wiring.ts`: 4 (event handler expressions)
- `emit-server.ts`: 2 (remaining non-CPS paths)
- `scheduling.ts`: 0 (fully wired)

### Next up
1. Continue Slice 1 — wire up more call sites in emit-logic.ts (bare-expr, sql, when-effect, etc.)
2. Slice 2 — integration testing of operator/compound expression emission
3. Slice 3-4 — calls, lambdas, domain nodes
4. Slice 5 — full call site migration across all 8 consumer files
5. Phase 3.5 — escape hatch elimination

---

## Tags
#session-7 #in-progress #phase-3 #phase-3-slice-1 #emitExpr

## Links
- [handOffs/hand-off-6.md](./handOffs/hand-off-6.md) — S6 final
- [pa.md](./pa.md)
- [master-list.md](./master-list.md)
