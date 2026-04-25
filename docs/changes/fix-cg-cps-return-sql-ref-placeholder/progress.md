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
- [step 5] Implemented + committed ast-builder.js helper + 8-site changes (commit `00b1d88`). Tests still 7714 / 0 fail.
- [step 6] First codegen pass: emit-server.ts CPS sites + emit-logic.ts case "reactive-decl" (unconditional). FAILED — E-CG-006 server-only-pattern guard caught `_scrml_sql` references emitted on the client. Refined emit-logic to gate by `opts.boundary === "server"` only. Client-side leak is the sibling bug noted in the parent anomaly report — out of scope.
- [step 7] Second codegen pass: recompile combined-007-crud — discovered route inference regression. `refreshList()` was no longer classified as server-escalated because `hasServerOnlyResourceInInit` only saw `init` strings (now `""`) and `detectServerOnlyResource` returned null. Added `sqlNode`-aware checks at TWO sites in `route-inference.ts`:
  - `hasServerOnlyResourceInInit()` — for CPS-eligibility detection
  - The trigger-1 visitor in `collectStmtTriggers()` — for server-escalation triggering itself
- [step 8] Third codegen pass: combined-007-crud now compiles + parses cleanly on both server.js and client.js. Both CPS-return sites emit `await _scrml_sql.unsafe("SELECT ...");`. Zero sql-ref leaks. Committed (`9d65a46`).
- [step 9] Wrote `compiler/tests/unit/reactive-decl-sql-chained-call.test.js` (16 tests / 66 expects, all passing). Committed (`d1d7be8`).
- [step 10] Ran broader gauntlet check on all 275 samples: combined-007-crud is the ONLY file where the change has effect (1 fewer sql-ref leak, 1 fewer server.js parse failure). Zero regressions. 13 other pre-existing leaks remain unchanged (separate code paths — sibling bug intakes recommended in the anomaly report).
- [step 11] Wrote anomaly-report.md. Total test count: 7730 pass / 0 fail / 365 files (was 7714 / 364 — exactly +16 from the new file, +1 file). CLEAR FOR MERGE.
