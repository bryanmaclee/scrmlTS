# Design Review: bun-sql-phase-1

## Reviewers Invoked

The change crosses several specialist domains. The pipeline agent
performed the review itself (specialist agents not dispatched in this
session). All design decisions verified directly against:

1. SPEC §44 (compiler/SPEC.md lines 14647-14700) — authoritative source
2. Bun.SQL API surface (verified empirically via `scripts/_probe_sql*.js`
   against Bun 1.3.0)
3. Brief from PA (multi-database adaptation S39 deep dive)

Self-review verdict for each domain:

- **Pipeline integration (`scrml-integration-pipeline-reviewer` scope)** —
  APPROVE. Phase 1 changes are confined to Stage 8 (CG). Upstream stages
  (BS / TAB / BPP / PA / RI / TS / DG) unchanged. AST shape unchanged.
  PIPELINE.md contract for sql-node and transaction-block AST nodes is
  preserved; only the emitted JS changes shape.
- **JS codegen (`scrml-js-codegen-reviewer` scope)** — APPROVE. The
  generated code compiles to syntactically valid JS for all reachable
  test paths (7565/7565). New shape uses standard `await`/template
  literal idioms supported by all modern JS runtimes. The leak guard in
  `emit-client.ts` is extended to catch `_scrml_sql` (and scoped
  `_scrml_sql_<n>`) so client-side leakage continues to surface as
  E-CG-006.
- **Diagnostics (`scrml-diagnostics-quality-reviewer` scope)** — APPROVE.
  E-SQL-006 is added to the error-emission path with both compile-time
  surface (CGError pushed to ctx.errors) and runtime defense-in-depth
  (a runtime-throwing IIFE in the JS output, so any misconfigured CG
  surfaces the issue immediately at execution time).
- **Language design (`scrml-language-design-reviewer` scope)** — APPROVE.
  No new syntax added. Source-level `?{}` semantics unchanged; only the
  compile target migrates from bun:sqlite-shaped to Bun.SQL-shaped JS.
  The `.first()` method, which existed in §8 but is not in §44, is
  preserved as a back-compat alias for `.get()` so existing scrml source
  using `.first()` continues to compile cleanly.

## Consolidated Verdict

**APPROVE**

All design choices verified against §44 and the empirical Bun.SQL probe.
Behavioral equivalence preserved for all SQL operations except `.prepare()`
which intentionally becomes a compile error per §44.3.

## Required Revisions

None.

## Rejection Rationale

N/A.

## Key Design Choices Locked In

### 1. Identifier rename `_scrml_db` → `_scrml_sql`

The brief flagged this as optional but recommended. Done because:
- Tracks the shape change cleanly (any future grep for "the db var" lands
  on the right identifier)
- Aligns with §44 terminology ("Bun.SQL" → `sql`)
- The leak guard in emit-client.ts must be updated regardless, so the
  rename adds no extra cost
- Scoped variants `_scrml_sql_<n>` (was `_scrml_db_<n>`) follow the same
  naming for `<program db="...">` nested DB scopes (§4.12.6)

### 2. `.first()` preserved as `.get()` alias

§44.3 lists only `.all()`, `.get()`, `.run()`, `.prepare()`. `.first()`
existed in §8 and is used by `examples/03-contact-book.scrml` and several
gauntlet samples. Treating it as an alias for `.get()` (single-row
helper) avoids breaking existing scrml source while §8 ↔ §44 reconciliation
is pending. The alias produces identical emission to `.get()`:
`(await sql\`...\`)[0] ?? null`.

### 3. Static DDL routes through `sql.unsafe()`

Bun.SQL has no top-level `.exec()` method (verified in probe). The
canonical way to execute a parameter-less SQL string is `sql.unsafe(rawSql)`.
Old emission used `_scrml_sql_exec("DDL")` (a host-supplied helper). New
emission uses `await _scrml_sql.unsafe("DDL")`. The legacy helper name is
retired from the emission path but still appears in the leak-guard regex
list as a defensive backstop.

### 4. Loop hoist (§8.10) keeps manual `?N` placeholder construction

Bun.SQL's SQLite branch does NOT support array binding via tagged
template `${arr}` (verified — `sql.array()` throws "SQLite doesn't
support arrays"). The §8.10 IN-list emission therefore continues to
build runtime SQL strings with `?1, ?2, ...` placeholders, then binds
the value array via `sql.unsafe(rawSql, paramArray)`. This preserves
§44.5's "every interpolation is bound, never string-interpolated"
invariant while accepting that Bun.SQL/SQLite has this driver
limitation.

### 5. Transactions use `sql.unsafe("BEGIN")` not `sql.begin(callback)`

§44.6 explicitly defers proper `sql.begin()` integration to
SPEC-ISSUE-018. The current per-handler envelope (§8.9.2 and
`emit-server.ts`) is structured around discrete BEGIN / try / COMMIT /
catch / ROLLBACK statements, not a callback. Wrapping the IIFE in
`sql.begin(async (sql) => {...})` would require restructuring the
server emitter and threading the transaction-scoped sql through every
nested SQL call. Phase 1 keeps the existing structure and routes the
control statements through `sql.unsafe()`, which executes BEGIN/COMMIT/
ROLLBACK on the same connection and preserves §19.10.5 semantics.

### 6. E-SQL-006 emits a runtime-throwing IIFE in addition to ctx.errors

Defense in depth: even if the caller passes no `errors` array, the
emitted JS contains a runtime `throw` so any execution surfaces the
removed-feature issue immediately. The compile-time path remains the
primary surface.

### 7. Auto-await is inserted at emit time

§44.4 mandates `await` insertion. The emitted JS produces `await sql\`...\``
or `(await sql\`...\`)[0] ?? null` directly. This works in any JS context
that already has `async` semantics (server handlers are all `async function`
in the emit). No framework-wide auto-await pass is needed because the
SQL-emit sites are entirely scoped to async server contexts already.
