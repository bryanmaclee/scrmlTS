# Pre-Snapshot: fix-cg-cps-return-sql-ref-placeholder

Captured before any code changes.

## Branch
`worktree-agent-a61df80655adfd3c6` (rebased onto main `72011b3`).

## Test baseline
```
bun test (compiler/)
 7714 pass
 40 skip
 0 fail
 27700 expect() calls
Ran 7754 tests across 364 files. [12.32s]
```

## E2E baseline — combined-007-crud sample (the bug reproducer)

`samples/compilation-tests/combined-007-crud.scrml` compiles successfully (4 warnings, no errors), but the emitted server.js and client.js both contain `/* sql-ref:-1 */` placeholder leaks:

`samples/compilation-tests/dist/combined-007-crud.server.js`:
```
38:    const _scrml_cps_return = /* sql-ref:-1 */;
74:    const _scrml_cps_return = /* sql-ref:-1 */;
```

`samples/compilation-tests/dist/combined-007-crud.client.js`:
```
55:_scrml_reactive_set("users", /* sql-ref:-1 */);
```

These would all fail `bun --check` because `/* sql-ref:-1 */` is a comment in expression position with no actual expression — JS would report a syntax error.

The server-side leaks at line 38 and 74 are inside CPS-rewrite blocks: the AST builder rewrote the trailing reactive-decl `@users = ?{`SELECT id, name, email FROM users`}` into a `_scrml_cps_return = <initExpr>` continuation. The `<initExpr>` is the result of `emitExprField(stmt.initExpr, stmt.init, ...)` — and the `initExpr` ExprNode tree is the broken `__scrml_sql_placeholder__` form produced by `safeParseExprToNode`.

Pre-existing `/* sql-ref */` placeholders in `samples/compilation-tests/dist/`:
- `combined-007-crud.server.js` lines 38, 74 (this fix's primary target)
- `combined-007-crud.client.js` line 55 (sibling — covered if we also handle reactive-decl in emit-logic case "reactive-decl")

## Examples baseline (E2E gate)

`bun --check examples/dist/03-contact-book.server.js` — must remain OK
`bun --check examples/dist/07-admin-dashboard.server.js` — must remain OK
`bun --check examples/dist/08-chat.server.js` — must remain OK

(Verified post-fix in anomaly report; recompiling examples is part of the gate.)

## Tags
#pre-snapshot #fix-cg-cps-return-sql-ref-placeholder #s40-followup

## Links
- intake: `docs/changes/fix-cg-cps-return-sql-ref-placeholder/intake.md`
- parent fix: `docs/changes/fix-cg-sql-ref-placeholder/anomaly-report.md`
- parent commit (return-stmt): `2a05585`
- parent commit (lift-expr): `4074ea3`..`baccf56`
