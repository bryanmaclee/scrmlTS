# Pre-snapshot: fix-cg-sql-ref-placeholder

**Captured:** 2026-04-24
**Worktree:** `agent-a0962950f82395d66`
**Branch:** `worktree-agent-a0962950f82395d66`
**Base commit:** `e1827e6` (main)

## Test baseline

```
7670 pass
40 skip
0 fail
27589 expect() calls
Ran 7710 tests across 362 files
```

(After `bash scripts/compile-test-samples.sh` to compile pretest samples.)

## E2E sample state

The committed `samples/compilation-tests/dist/combined-007-crud.server.js` was built on
a pre-S40 codegen (uses old `_scrml_sql_exec` API). That sample doesn't have the
`return ?{}.method()` shape the bug is filed against — it uses `@reactive = ?{}` instead.

A purpose-built reproducer was placed at:
- `docs/changes/fix-cg-sql-ref-placeholder/repro/repro.scrml`
- `docs/changes/fix-cg-sql-ref-placeholder/repro/test.db` (empty SQLite DB with `users` table)

After compiling:
- `repro.server.js` line 72: `return /* sql-ref:-1 */.all();` — **buggy emission**
- `repro.server.js` line 108: `return await _scrml_sql.unsafe("SELECT * FROM users WHERE id = ?1", [id]) . get ( );` — **wrong shape** (chained `.get()` outside `await` instead of `(await ...)[0] ?? null`)

## Bug confirmed pre-existing

The `/* sql-ref:-1 */` emission comes from `compiler/src/codegen/emit-expr.ts:403`.
The bug is that `safeParseExprToNode` parses `?{`SELECT...`}.all()` (collected as a
return-stmt expression text by `collectExpr`) → preprocesses `?{}` → `__scrml_sql_placeholder__` →
acorn produces a CallExpr on a MemberExpr on Identifier → on convert-back, the identifier
becomes a `sql-ref` ExprNode with `nodeId: -1`. Codegen emits the placeholder + the trailing
`.all()` from the call expr.

## Anomalies expected from this fix

Two server.js outputs should change:
1. `return /* sql-ref:-1 */.all();` → `return await _scrml_sql\`SELECT * FROM users\`;`
2. `return await _scrml_sql.unsafe(...) . get ( );` → `return (await _scrml_sql\`SELECT * FROM users WHERE id = ${id}\`)[0] ?? null;`

(Plus identical changes anywhere else in the test corpus that uses `return ?{...}.method()`.)

## Tags
#pre-snapshot #fix-cg-sql-ref-placeholder #s40-followup

## Links
- intake: `docs/changes/fix-cg-sql-ref-placeholder/intake.md`
- reproducer: `docs/changes/fix-cg-sql-ref-placeholder/repro/`
