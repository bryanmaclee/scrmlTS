# Typed SQL projection rows — Tranche 1 (read-site typing)

change-id: typed-sql-row-tranche1-2026-06-08

## Phase 0 — Survey-confirm (complete)

Worktree: /home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-af004eb79c8c26290

### Confirmed surface

- `type-system.ts:7304-7307` `case "sql"` — `resolvedType = tAsIs()` unconditional. This is the
  node-level walk (a `kind:"sql"` ExprNode appearing as a markup/statement child). The DOMINANT
  read-site, however, is `let/const user = ?{...}.get()` which the ast-builder lowers to a
  `let-decl`/`const-decl`/`state-decl` node with `init:""` + an attached `sqlNode` (kind:"sql",
  carrying `query:string` + `chainedCalls:SQLChainedCall[]`). The let-decl path
  (type-system.ts ~6614) defaults `resolvedType = tAsIs()` and binds the name with it
  (`scopeChain.bind(name, {resolvedType})` ~6803) — it NEVER consults `sqlNode`. So Tranche-1
  read-site typing must fire at BOTH (a) the let/const/state-decl path (the binding site) and
  (b) the bare `case "sql"` node.
- `SQLNode` (types/ast.ts:311) = `{ kind:"sql", query:string, chainedCalls:SQLChainedCall[], nobatch? }`.
  `SQLChainedCall` = `{ method:string, args:string }`. `.get()`/`.all()`/`.run()` are in `chainedCalls`.
- `generateDbTypes` (type-system.ts:4734) builds, per table, `{fullType, clientType}` StructTypes
  keyed by PascalCase **generated name** (initCap(tableName)). Returns
  `generatedNames: Map<generatedName, {fullType, clientType}>`.
- Scope insertion: `case "state"` (type-system.ts ~6135) for `stateType==="db"` binds each
  generated type into `scopeChain` with `{kind:"db-type", resolvedType:clientType, fullType, clientType}`,
  keyed by the GENERATED NAME (e.g. `Users`). So at a `?{}` read site inside a `<db>` block, I can
  resolve a FROM-clause table name -> initCap -> scope lookup -> {fullType, clientType}.
- RouteMap full-vs-client: the existing `case "state"` binds `resolvedType: clientType`. View
  selection per §14.8.4 is by RouteMap (server-escalated -> full; client-boundary -> client).
- `protect-analyzer.ts` ColumnDef sources: (1) live DB file (`existsSync` -> openDb -> PRAGMA),
  (2) shadow DB from CREATE TABLE harvested from `?{}` blocks (`extractCreateTableStatements`).
  `<schema>` DDL is NOT a source today. Seam: `resolveDb` (Step 5) / `createTableMap` build (runPA:598).
- `schema-differ.js` `parseSchemaBlock(body)` -> `{tables:[{name, columns:[{name,type,notNull,...}]}]}`;
  `generateCreateTable(table)` -> CREATE TABLE SQL (NOT currently exported).
- §34: no existing untyped-row lint. Will mint `W-SQL-ROW-UNTYPED` (Info).
- `dispatch.db` EXISTS in the flagship worktree (77KB) — PA uses the LIVE-DB path, so generated
  types are already reachable for board.scrml/load-detail.scrml. Sub-step A (schema source) is for
  the DDL-first / no-DB case; it does NOT gate flagship R26.

### SCOPE CORRECTIONS surfaced (see report)
- `case "sql"` at 7305 is NOT the dominant read site; the let/const/state-decl `sqlNode` binding
  path is. Both must be wired.
- §34 catalog row E-TYPE-051 (line 16461) still says "typed `any`" — stale post-S174; fix to `asIs`.
- `initCap` lowercases inner letters (asciiLower) — diverges from SPEC §14.8.2 ("leave remaining
  letters unchanged") for `UserProfiles`. PRE-EXISTING, out of scope; noted as deferred.

## Implementation log

- Sub-step B (extractor): compiler/src/sql-projection.ts (extractSelectProjection)
  + compiler/tests/unit/sql-projection-extract.test.js (13 tests). Depth-aware
  top-level FROM region slicer added after first R26 pass surfaced subquery-in-
  projection mis-parse (the projection subquery's FROM was grabbed as the top FROM).
- Sub-step C (read-site wiring): type-system.ts resolveSqlRowType wired at the bare
  `case "sql"` node AND the let/const-decl sqlNode binding path. View selection per
  §14.8.4: full schema when enclosing fn is explicit-`server` OR §12.2 Trigger-2
  protected-field access; client otherwise. E-PROTECT-001 on client-boundary
  protected-column projection. W-SQL-ROW-UNTYPED (NEW Info code) for the long tail.
  + compiler/tests/unit/sql-row-typing.test.js (5 tests, cross-stream partition-aware)
  + flagship diagnostic baseline +W-SQL-ROW-UNTYPED:6 in
    compiler/tests/integration/trucking-dispatch-smoke-integration.test.js.
- SPEC currency: §14.8.7 §8 bullet impl-status note; §34 +W-SQL-ROW-UNTYPED row;
  §34 E-TYPE-051 'typed any' -> 'typed asIs' (S174 no-any currency). No `any`
  type-token found in §14.8 normative text (only the §34 catalog row was stale).
- Sub-step A (schema source): protect-analyzer.ts extractSchemaCreateTableStatements
  harvests <schema> DDL -> generateCreateTable (now exported from schema-differ.js)
  -> createTableMap fallback. Precedence: live DB > ?{} CREATE TABLE > <schema> DDL.
  + compiler/tests/unit/protect-schema-ddl-source.test.js (2 tests). Proven: removing
  the flagship's live dispatch.db now compiles app.scrml with 0 E-PA-002.

## R26 proof (board.scrml loadBoardData)
Inferred row (wrap=array, .all() -> Row[]):
  { id: number|not, customer_id: number, origin_city: string|not, origin_state: string|not,
    destination_city: string|not, destination_state: string|not, commodity: string|not,
    weight_lbs: number|not, rate_dollars: number|not, pickup_at: string|not,
    deliver_by: string|not, status: string, customer_name: string }
  customer_name resolves from `c.name AS customer_name` via the c->customers alias map.

## Deferred / out-of-scope
- Tranche 2: cross-file structural-width :struct prop contract (Shape C).
- state-decl SQL-init (`<x> = ?{...}`) row typing — not wired (reactive-cell semantics
  differ; flagship read sites are let/const). Follow-on.
- initCap lowercases inner letters (asciiLower) — diverges from SPEC §14.8.2 for
  `UserProfiles`. PRE-EXISTING; out of scope.
- E-PROTECT-001-on-projection vs E-PROTECT-001-on-field-access: Tranche 1 fires the
  projection-side check. The §14.8.6 leakPassword field-access path (select id, return
  row.passwordHash) is a separate access-side check (checkStructFieldAccess is exported
  but not wired into the main walk for the optional Row|not case).

## REVISION (2026-06-08) — strip the view-selection sub-feature

Worktree: /home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a25a4535d8605e740

WHY: the view-selection sub-feature rested on the DEPRECATED `server` keyword
(`route-inference.ts` fires W-DEPRECATED-SERVER-MODIFIER; `isServer` is set ONLY by
that keyword) + a body-scan heuristic. The REAL server/client signal is RI's inferred
boundary, and per §12.2 Trigger 1 EVERY `?{}`-bearing function auto-escalates to
server — so a "client-boundary `?{}` context" cannot exist, making the projection-side
E-PROTECT-001 unreachable-by-correct-means. The protected-column-projection leak is real
but its correct shape is data-flow (does a server-fn RETURN a row carrying a protected
column to the client?) — DEFERRED to a return-boundary / E-ROUTE-003 follow-on.

SUBTRACTED from type-system.ts annotateNodes (kept everything else):
- protectedFieldNames Set<string> const + the protectAnalysis.views populating loop
- functionBodyAccessesProtectedField(fnNode) body-scan heuristic
- enclosingSqlFullViewStack: boolean[] + enclosingSqlRowView() helper
- the function-decl push(isServer || functionBodyAccessesProtectedField) + matching pop()
- the `if (view === "client") { ... E-PROTECT-001 ... }` branch in resolveSqlRowType:
  an absent column now degrades to asIs + untypedCols (W-SQL-ROW-UNTYPED) only.
- replaced `const view = enclosingSqlRowView()` with `const view = "full" as const`.
- softened the lead-in comment + resolveTableView/span doc comments (no deprecated
  `server` keyword reference).

KEPT (unchanged): resolveTableView (callers always pass "full"), the wrap logic
(.get->Row|not, .all/bare->Row[], .run->void), the projection loop, SELECT * expand/
degrade, opaque/computed-column field-asIs+lint, whole-row degrade, W-SQL-ROW-UNTYPED,
the let/const-decl sqlNode binding path, the bare `case "sql"` wiring, sql-projection.ts,
protect-analyzer.ts (F-SCHEMA-001), schema-differ.js (generateCreateTable export).

TESTS: removed the two projection-side E-PROTECT-001 / client-vs-full view cases from
sql-row-typing.test.js; converted the remaining `server function` forms to plain
`function` (a `?{}` inside auto-escalates via RI Trigger 1). 4 cases remain (row typing,
.get/.all wrap, full-view protected-column projection => no E-PROTECT-001, computed-column
degrade, CTE whole-row degrade).

SPEC §14.8.7: added a DEFERRED note to the Tranche-1 implementation-status block —
read-site row typed from the generated (full) table type; full/client view discrimination
+ projection-side E-PROTECT-001 deferred to a return-boundary / E-ROUTE-003 follow-on.
Kept the §34 W-SQL-ROW-UNTYPED row + the E-TYPE-051 any->asIs currency fix. No deprecated
`server` keyword reference anywhere in the added text.
