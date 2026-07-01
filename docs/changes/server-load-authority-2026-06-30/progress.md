# server-load-authority-2026-06-30 — progress

Change-id: server-load-authority-2026-06-30
Worktree start pwd: /home/bryan-maclee/scrmlMaster/scrml/.claude/worktrees/agent-a72f1f2631c2b914e
Base (post-merge main): e72f058a54f1ee02c68ace754fca17c27392e5c4  (SSR B-substrate e72f058a)

## Design (RATIFIED S233 — do NOT re-litigate)
Forks 3+4 unified around `@currentUser` ambient cell (the S233-ratified first-class
handle; residual-fork #2 "promote a first-class currentUser"). Shape:
- @currentUser.id : string | not   (anon -> not)
- @currentUser.role : string | not
- @currentUser.isAuth : bool
Server-side for this build (gate + row-scope run server-side). Client-side @currentUser OUT (GITI-027B arc).

## Three authority axes STACK (none substitutes):
1. route-admission (Fork 4) -> 401 JSON whole-route
2. row-selection (Fork 3) -> WHERE user_id = ${@currentUser.id}
3. column-redaction (§14.8.9 protect-floor) -> already wired at egress; REUSE, do NOT touch

## Components
- [ ] A: @currentUser server-side lowering (-> _scrml_currentUser)
- [ ] B: type-system registration (RESERVED ambient + type shape)
- [ ] C: session infra (store + enriched middleware userId/role + _scrml_current_user + _scrml_serverload_auth)
- [ ] D: Fork 4 route gate (serverLoad Tier-1 + Pattern-C + SSR compose), 401 JSON, default-inherit
- [ ] E: Fork 3 row-scope (reclassify @currentUser-only ?{} as sql-load; bind _scrml_currentUser)
- [ ] F: per-var auth= (4c) parse + enforce
- [ ] G: W-SERVERLOAD-UNGATED + W-SSR-PRERENDER-UNSCOPED
- [ ] H: tests + R26

## Log

### Components A + B (DONE)
- emit-expr.ts emitIdent: server-mode `@currentUser` -> `_scrml_currentUser` (not _scrml_body["currentUser"]).
- rewrite.ts: NEW rewriteServerAtRef helper; both regex sites route through it; @currentUser -> _scrml_currentUser.
- expression-parser.ts rewriteServerReactiveRefsAST: @currentUser -> plain Identifier _scrml_currentUser.
- route-inference.ts: NEW SERVER_ONLY trigger `/@currentUser\b/` -> escalates enclosing fn to server.
- type-system.ts: `currentUser` added to RESERVED_AMBIENT_PROJECTION_NAMES (E-STATE-UNDECLARED read exemption).
- Verified: examples/02 compiles clean; @currentUser already canonical in kickstarter §6.8 (line 989).

### A+B CORRECTION (name-collision with corpus `<currentUser>` cells)
The trucking corpus declares USER reactive cells named `currentUser` (messages.scrml,
home.scrml, ...). Fix mirrors the @session precedent:
- REMOVED the route-inference `/@currentUser\b/` escalation trigger (it wrongly
  escalated client fns reading a user `@currentUser` cell -> E-RI-002 cascade). The
  canonical Fork-3 read is inside a `?{}` (already server-escalated); no trigger needed.
- Added `_currentUserAmbientActive` per-file flag (TRUE iff no user `<currentUser>`
  cell) in emit-expr.ts + rewrite.ts + expression-parser.ts; gated all 3 lowering
  paths. index.ts sets it = !collectReactiveVarNames(fileAST).has("currentUser").
- Verified: block-analysis D6 test 13/0; home.scrml user `@currentUser` lowers to
  _scrml_reactive_get("currentUser") (NOT the ambient); ssr/server-load/protect 61/0.

### Components C+D+E+F+G+H (DONE)
- C (session infra): emit-server.ts — `_scrml_session_store` (globalThis-shared) +
  enriched `_scrml_session_middleware` (userId/role from store, impl-gap #2) +
  `_scrml_current_user` resolver + `_scrml_serverload_auth` (401 JSON / 403 role).
  Emitted iff `_needsSessionInfra` (auth || any gate || @currentUser query).
- D (Fork-4 gate): serverLoadGateMode helper; Tier-1 + Pattern-C handlers call
  `_scrml_serverload_auth` (default-inherit auth=required; per-var override). 401 JSON.
- E (Fork-3 row-scope): collect.ts queryInterpolationsAreServerAmbientOnly +
  serverVarDeclLoadKind(decl, ambientActive) reclassify @currentUser-only -> sql-load;
  threaded in emit-server + emit-reactive-wiring; type-system W-AUTH-004 gate refined.
  Pattern-C + SSR-compose handlers bind `_scrml_currentUser` when the query uses it.
- F (per-var auth= 4c): ast-builder.js — Tier-1 type-decl openerAttr `auth=` ->
  _serverAuthorityAuth -> instance.auth; Tier-2 scanner `auth=STRING` branch ->
  scan.auth -> node.auth (4 returns + 5 node-build sites).
- G (diagnostics): type-system.ts W-SERVERLOAD-UNGATED (ungated route under auth-aware
  app) + W-SSR-PRERENDER-UNSCOPED (auth-scoped UNSCOPED cell = cross-user SSR leak;
  excludes explicitly-public auth=none + row-scoped Pattern-C).
- H: compiler/tests/integration/server-load-authority.test.js (15 tests, all green).

### R26 (orders.scrml repro) — VERIFIED
- gate: `_scrml_authResult = _scrml_serverload_auth(_scrml_req, null); if(...) return` 401.
- row-scope: `SELECT * FROM orders WHERE user_id = ${_scrml_currentUser.id}`.
- §14.8.9 STACKS: `_scrml_protect_tag(...,["ssn"])` + `_scrml_protect_redact`.
- node --check clean; non-auth page emits zero infra (byte-identical).
- Tier-1 unscoped under auth=required -> W-SSR-PRERENDER-UNSCOPED.
- auth=none -> W-SERVERLOAD-UNGATED + ungated route; auth=role:Admin -> gate(req,"Admin").

### Pre-existing observation
isServer-block warnings (W-AUTH-001/004 AND the 2 new) double-fire (annotateNodes
visits the decl twice) — NOT introduced here; my warnings match the family behavior.
