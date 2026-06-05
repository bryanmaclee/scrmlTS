# F2a — chained `?{...}.method()` SQL form dropped in statement position

change-id: native-sql-chained-form-f2a-2026-06-04

## 2026-06-04 — startup
- WORKTREE_ROOT=/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a17d09b168040546d
- startup verification PASS: pwd worktree-prefixed; toplevel==WORKTREE_ROOT; merged 848334b0 (clean fast-forward); status clean; bun install; bun run pretest OK.
- HEAD == 848334b0 confirmed.

## 2026-06-04 — Phase 0 (light confirm)
Symptom reproduced (default vs --parser=scrml-native, 3 contexts ret/letget/bare):
- default: 3 `_scrml_sql` per fixture, 0 E-PA-002.
- native: 0 `_scrml_sql`. native `ret` emits `return null /* sql-ref unresolved: nodeId=-1 ... */.all();` — chain survives, SQL body DROPPED.

Root confirmed (translate-stmt.js M6.5.b.4 note, L188-210): bare `?{}` (e.kind==="Sql") promoted via makeSqlStmt; CHAINED form arrives as Call-headed expr (Sql atom + postfix Member/Call), falls to makeBareExpr → translateExpr → translateSql emits sql-ref nodeId:-1 and DISCARDS Sql.raw.

Native PRE-translate Stmt shapes (dump via parseLogicBodyBestEffort — raw INTACT here):
- return:    Return.argument = Call{callee:Member{object:Sql{raw}, property:Ident{name:"all"}}, args:[]}
- bare:      ExprStmt.expression = Call{callee:Member{object:Sql{raw}, property:Ident{name:"run"}}, args:[]}
- let/const: VarDecl.declarations[0].init = Call{callee:Member{object:Sql{raw}, property:Ident{name:"get"}}, args:[]}
Native Sql atom = {kind:"Sql", raw:"?{`...`}", span}. Multi-call chain nests: Call(Member(Call(Member(Sql,m1),[]),m2),[]).

Live target shapes to mirror (ast-builder.js):
- bare-expr  -> push {kind:"sql", query, chainedCalls, span} statement directly (L7884 nodes.push(childNode) after consumeSqlChainedCalls). makeSqlStmt already produces this shape (chainedCalls:[]); extend to carry reconstructed chainedCalls.
- return     -> {kind:"return-stmt", expr:"", sqlNode:{kind:"sql",...}} — exprNode OMITTED (L9810).
- let/const  -> {kind:"let-decl"|"const-decl", name, init:"", sqlNode:{kind:"sql",...}} — initExpr OMITTED (L5282/5384).
chainedCalls entry shape (statement path, consumeSqlChainedCalls L3963): {method, args}. `.nobatch()` -> set node.nobatch=true, drop the call. codegen emit-logic.ts case "sql" reads node.query + node.chainedCalls[].method/.args.

## Phase-0 GATE DECISION: PROCEED (4 clean translate-stmt contexts).
- return-stmt / let-decl / const-decl / bare-expr all carry a recoverable native Call→Member→Sql chain with .raw intact; no statement position needs infra the bare-form path lacks.
- ASSIGN-RHS (`@x = ?{}.all()`) is NOT a clean translate-stmt sqlNode context: it parses to ExprStmt{Assignment{AtCell, Call}}; inside a server fn it fires E-RI-002 (server can't mutate reactive — correct semantic, not a SQL drop); the LIVE sqlNode attach for `@x = ?{}` is on the STATE-DECL path (`_sqlInit`, ast-builder.js L5414/5440/...), a SEPARATE native production from translate-stmt. Recorded as out-of-locus; surfaced. The brief's "4 of 6" clean set = return/let/const/bare-expr.

NOT TOUCHED (separate queued dispatches): server function* generator drop; native match arm-parse gap (F3).

## 2026-06-05 — implementation + verification
translate-stmt.js: added `reconstructChainedSql(nativeExpr, span, counter)` (after makeSqlStmt):
- walks the native postfix Member/Call chain inward to the Sql atom; methods collected outer->inner then reversed to source order; `.nobatch()` -> node.nobatch=true (dropped from chain); returns live {kind:"sql", query (extractSqlQuery on Sql.raw), chainedCalls:[{method,args:""}], span} or null when not a chained-SQL Call.
- wired into 3 sites: ExprStmt arm (push the kind:sql stmt directly, mirrors live ast-builder L7884 bare BLOCK_REF), makeReturnStmt (attach sqlNode, OMIT exprNode — live L9810), makeVarDeclNode (attach sqlNode, OMIT initExpr — live L5282/5384).
- args left "" (native retains no raw Expr text; corpus chained calls are arg-less; codegen Branch B only fires on non-empty args).

Tests:
- m65-b4-sql-promotion.test.js: the PINNED "DEFERRED: chained ?{}.run() stays bare-expr" test -> rewritten to "CLOSED (F2a): chained ?{}.run() promotes to kind:sql with chainedCalls" (asserts native==live full field-set). 5/5 pass.
- m65-b4-sql-leak.test.js (integration): chained-form now flows through PRIMARY kind:sql server-only detection (was secondary sql-ref); comments updated; security invariants (no client leak + W-CG-001) hold. 5/5 pass.
- native-sql-chained-form-f2a.test.js (NEW, +11): return/let/const/bare-expr + delimiter-strip + ${}-param + .nobatch() + 2 negatives (non-SQL ident.method() not mis-promoted) + id/span discipline. 11/11 pass.

within-node: pre-fix baseline 1005/0 (95849 total divergences). Post-fix 63 fixtures over-budget, ALL SPAN-COORD-only (residual +1..+9), every one SQL-bearing. ZERO non-SPAN-COORD regressions (verified via classifier dry-run). Rebumped 63 SPAN-COORD entries (only SPAN-COORD lines changed; 1001 entries unchanged) -> 1005/0 restored. NET corpus divergences DOWN 761 (MISSING-FIELD 30569->30216, EXTRA-FIELD 12580->12223, KIND-NAME 3018->2917; SPAN-COORD 38102->38251 rebumped). Span-coord-only = emit byte-identical (R26 proven), benign per brief.

pre-commit subset (unit+integration+conformance --bail): 15874 pass / 0 fail / 89 skip / 1 todo. (full pre-commit hook green on all 3 code commits.)

## R26 — byte-compare EMIT (NON-generator, NON-match): 6/6 PASS
All contexts byte-identical native==default (diff -r exit 0), _scrml_sql native==default (3==3), node --check exit 0, E-PA-002 == 0:
- ret     : `return ?{`SELECT * FROM tasks`}.all()`             -> PASS
- letget  : `let r = ?{`SELECT ... WHERE id = 1`}.get()`        -> PASS
- bare    : `?{`DELETE FROM tasks WHERE done = 1`}.run()`       -> PASS
- constget: `const r = ?{`SELECT ... WHERE id = 1`}.get()`      -> PASS
- param   : `return ?{`SELECT ... WHERE done = ${done}`}.all()` -> PASS (tagged-template _scrml_sql with ${done})
- nobatch : `return ?{`SELECT * FROM tasks`}.nobatch().all()`   -> PASS (nobatch stripped, 0 ".nobatch" in emit)

## NOT TOUCHED (still queued — separate dispatches)
- server function* GENERATOR drop: `server function*` with `yield ?{}.all()` still emits NO server.js (function* absent from native AST) — UNCHANGED by F2a; verified.
- native match arm-parse gap (F3 family): not touched.
- assign-RHS `@x = ?{}.all()`: NOT a clean translate-stmt sqlNode context (state-decl-routed / E-RI-002 in server fn) — out-of-locus, surfaced in Phase-0.

## DONE
Files: compiler/native-parser/translate-stmt.js (+125); compiler/tests/unit/m65-b4-sql-promotion.test.js; compiler/tests/integration/m65-b4-sql-leak.test.js; compiler/tests/unit/native-sql-chained-form-f2a.test.js (NEW +170); compiler/tests/parser-conformance-within-node-allowlist.json (63 SPAN-COORD bumps).
