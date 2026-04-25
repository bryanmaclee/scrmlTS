# Progress: fix-cg-cps-return-sql-ref-placeholder

- [step 1] Rebased worktree onto main `72011b3` so the intake + prior return-stmt fix (2a05585) are in scope.
- [step 2] Verified baseline: 7714 pass / 40 skip / 0 fail / 364 files. Reproduced sql-ref leaks in combined-007-crud (server.js:38,74 + client.js:55).
- [step 3] Wrote pre-snapshot.md with reproducer evidence.
- [step 4] Plan locked:
  - **ast-builder.js** — both reactive-decl parse paths (parseOneStatement at L2230 and buildBlock body-loop at L3854) — when the initializer is a SQL `?{}` BLOCK_REF (immediately following `=`), build child sqlNode, consume chained `.method()` calls, attach `sqlNode` field, set `init: ""` and OMIT `initExpr` so downstream consumers (batch-planner string scan, emit-server CPS path, emit-logic reactive-decl path) all opt into the structured form.
  - Cover the four reactive-decl variants: untyped (`@x = ?{...}`), typed (`@x: T = ?{...}`), `server @x = ?{...}`, `@shared x = ?{...}`. The first two clearly need it; the latter two are extension parity.
  - **emit-server.ts** — at the two CPS sites (L599-602 and L682-685) — when `stmt.sqlNode` is present, recurse `emitLogicNode(stmt.sqlNode, { boundary: "server" })` and strip trailing `;` so `_scrml_cps_return = <sql-expr>;` is well-formed.
  - **emit-logic.ts case "reactive-decl"** — when `node.sqlNode` is present, recurse into case "sql" and emit `_scrml_reactive_set("<name>", <sql-expr>);` instead of going through `emitExpr(node.initExpr, ...)`.
  - **Tests** — new `compiler/tests/unit/reactive-decl-sql-chained-call.test.js` mirroring `return-sql-chained-call.test.js`.
- [step 5] Implementing the ast-builder change for both parse sites (parseOneStatement + buildBlock body-loop). Including untyped + typed + server + @shared variants.
