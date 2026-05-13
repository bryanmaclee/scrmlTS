# Bug 3a — `_scrml_sql` / Bun.SQL emission gap (v0.3.0 BLOCKER)

## Dispatch

S87 follow-on. Worktree: `agent-a345ec5cf5f74d279`. Branch: `main`.

## Surfaced via

- Bug 3 dispatch (S87 commit `279bfc8`, agent `a8bf255e2362d359c`,
  see `docs/changes/v0.3-batch-2-trio-b/progress-bug-3.md`).
- Verified: `examples/dist/03-contact-book.server.js` references
  `_scrml_sql` 3 times but never declares it. Server-fn handler bodies
  throw `ReferenceError: _scrml_sql is not defined` at first invocation.

## Reproduction (pre-fix baseline)

```
$ bun compiler/src/cli.js compile examples/03-contact-book.scrml -o /tmp/bug3a-test/
$ grep -nE "_scrml_sql|new SQL|from \"bun\"" /tmp/bug3a-test/03-contact-book.server.js
52: await _scrml_sql`INSERT INTO contacts (name, email, phone) ...
70: await _scrml_sql`DELETE FROM contacts WHERE id = ${id}`;
87: return await _scrml_sql`SELECT id, name, email, phone FROM contacts ORDER BY name`;

$ bun compiler/src/cli.js compile examples/17-schema-migrations.scrml -o /tmp/bug3a-test/
$ grep -nE "_scrml_sql|new SQL|from \"bun\"" /tmp/bug3a-test/17-schema-migrations.server.js
72:   return (await _scrml_sql`SELECT id, display_name FROM users WHERE email = ${email}`)[0] ?? null;
110:    const user = (await _scrml_sql`SELECT id FROM users WHERE email = ${authorEmail}`)[0] ?? null;
112:      return await _scrml_sql`...
151:    return await _scrml_sql`...

$ bun compiler/src/cli.js compile examples/18-state-authority.scrml -o /tmp/bug3a-test/
$ grep -nE "_scrml_sql|new SQL|from \"bun\"" /tmp/bug3a-test/18-state-authority.server.js
71:    return await _scrml_sql`SELECT id, title, completed, position FROM tasks ORDER BY position`;
... (5 usages total)
```

In all three examples: `_scrml_sql` is referenced but never declared.
Note: even `examples/18-state-authority.scrml` which uses
`<program db="./tasks.db">` does NOT emit the scoped `_scrml_sql_<n>`
form — the per-node `_dbVar` annotation set at index.ts:372 is never
threaded into emit-server's per-handler emit-logic options.

## Survey — design picture

The codegen has two sources of DB identity, both currently disconnected
from server.js emission:

1. **`<program db="path">`** (per-program attribute, §40.2 + §44.2)
   - Annotated at `index.ts:337-388`. Sets `node._dbScope = { dbVar:
     "_scrml_sql_<n>", connectionString, driver }`. Tags descendants
     with `_dbVar = "_scrml_sql_<n>"`.
   - Used by examples 17, 18, 23.

2. **`<db src="path">`** (state-block markup tag, §44.7.1
   module-with-db-context)
   - Currently NOT annotated by `index.ts`. The state-block exists in
     the AST as `{ kind: "state", stateType: "db", attrs: [{name:"src",
     ...}], children: [...] }`.
   - SQL refs inside fall back to default `dbVar = "_scrml_sql"` (per
     `context.ts:99` + `rewrite.ts:251`).
   - Used by examples 03, 07, 08, 16.

3. **Default `_scrml_sql`** — the bare identifier emitted when no scope
   is present. This is the form actually emitted today in 03/17/18 (the
   scoped `_scrml_sql_<n>` form never makes it into the final output
   because emit-server.ts doesn't thread `_dbVar` from program/db-block
   nodes into its per-handler emit-logic opts).

## Plan

**Approach:** detect-and-emit at server.js header time, scoped on
identifiers actually used.

1. After all routes/middleware/channels have been emitted into `lines`,
   scan the joined output for `_scrml_sql` and `_scrml_sql_<n>` token
   usages.
2. For each unique identifier, look up its connection string + driver:
   - `_scrml_sql_<n>` → look up in `_dbScope` annotations on
     `<program>` nodes (already set by `index.ts`).
   - `_scrml_sql` (default) → look up the file's `<db src=>` state-block
     OR a `<program db=>` whose scope is the file's whole tree. If no
     `<db>` block and no `<program db=>`, this is a compiler invariant
     violation (E-SQL-004 should have already fired upstream).
3. Emit `import { SQL } from "bun";` once at the top of the file.
4. For each unique identifier, emit
   `const _scrml_sql<suffix> = new SQL(<connStr>);` with a
   compile-time-resolved connection string.
5. Inject into the file header (before any code that uses the
   identifier). The file's header is established at the top of
   `generateServerJs()` after the imports loop (line ~282).

**Scope of fix:** purely emit-server.ts. The annotation upstream
(`index.ts:337-388`) is correct; the gap is downstream. We need to:
- Extend `index.ts` to also annotate `<db src=>` blocks with `_dbScope`
  (so the same lookup code works for both forms).
- Add a header-emission step in `emit-server.ts` that emits the SQL
  import + declarations.

## Steps

- [x] Startup verification + map read + survey
- [x] Confirm baseline reproduction across 03/17/18
- [ ] Extend `index.ts` to also annotate `<db src=>` state-blocks with
      `_dbScope`. Default unscoped name `_scrml_sql` (no suffix) since
      the canonical example 03 uses the bare identifier.
- [ ] Add `emitSqlDeclarations()` helper in emit-server.ts. Detect
      `_scrml_sql\b` and `_scrml_sql_\d+\b` usages in `lines`. Emit
      `import { SQL } from "bun";` + per-identifier
      `const _scrml_sql<suffix> = new SQL(<connStr>);` declarations.
- [ ] Unit tests — `compiler/tests/unit/emit-server-sql-emission.test.js`
      (new, +5 to +10 tests).
- [ ] Integration test — `compiler/tests/integration/sql-server-fn-runtime.test.js`
      (new, REAL end-to-end: compile + import + invoke + verify SQL).
- [ ] Recompile all `<db>`-using examples (03, 07, 08, 16, 17, 18) and
      verify before/after grep.
- [ ] Run full unit + integration + conformance test suite.
- [ ] Final commit + clean status.

## Progress log

### Step 1 — survey + baseline reproduction (commit 966634d)

Confirmed reproduction across 03/07/08/16/17/18. Mapped the AST shapes:
- `<program db="path">` → annotated with `_dbScope` at `index.ts:367`
- `<db src="path">` → state-block (`kind:"state"`, `stateType:"db"`),
  NOT annotated by `index.ts`
- Default `_scrml_sql` identifier (from `context.ts:99` +
  `rewrite.ts:251`) is what appears in every example's body, regardless
  of which form is used.

### Step 2 — emit-server.ts SQL declaration emission (commit cc58b28)

Added `collectDbScopes(fileAST)` helper that finds both `<program db=>`
(via `_dbScope` annotation) and `<db src=>` state-blocks (via direct
walk + `resolveDbDriver` classification). Added a post-emission injector
that scans for `_scrml_sql\b` / `_scrml_sql_<n>\b` usages in the final
text and emits `import { SQL } from "bun";` + per-identifier
`const _scrml_sql<suffix> = new SQL(<connStr>);` declarations.

Examples 03/07/08/16/17/18 all now emit valid SQL handles. Test suite
unchanged at 10851 pass / 0 fail.

### Step 3 — unit tests +11 (commit ffb5488)

Added `compiler/tests/unit/emit-server-sql-emission.test.js`:
- §A — `<db src=>` form emits unscoped `_scrml_sql`
- §B — `<program db=>` form: `_dbScope` annotation visibility
- §C — server.js without SQL refs has no `import { SQL }`
- §D — multi-scope `_dbScope` annotation works for sibling
       `<program db=>` nodes
- §E — postgres:// URI passes through verbatim
- §F — `:memory:` SQLite recognized by collector
- §G — duplicate `<db src=>` dedupe under `_scrml_sql` key
- §H — `collectDbScopes` returns Map (empty + populated)
- §I — declarations precede idempotency/structural-eq helpers

11 new tests, 27 expect() calls, 0 fail.

### Step 4 — sqlite: prefix normalization + integration test (commit 5749388)

Surfaced during integration-test authoring: **Bun.SQL defaults to
PostgreSQL when given a bare connection string with no recognized
prefix**. SQLite paths (`./contacts.db`) MUST have `sqlite:` prefix or
Bun.SQL throws `PostgresError: Connection closed` at module init.

emit-server.ts normalization: when `driver==='sqlite'` AND the
connection string doesn't already start with `sqlite:` (and isn't
`:memory:`, which Bun.SQL handles natively), prepend `sqlite:` before
emitting `new SQL(...)`.

Added `compiler/tests/integration/sql-server-fn-runtime.test.js` with
the REAL end-to-end test: compile a `<db src=>`-using app, IMPORT the
generated server.js, INVOKE the route handler with a real Request,
verify SQL executes against a pre-seeded SQLite DB.

`collectDbScopes` fallback aliasing: when only `<program db=>` is
present (no `<db src=>`) AND the body uses unscoped `_scrml_sql`,
alias the default identifier to the first `_scrml_sql_<n>` scope.
This compensates for an upstream gap (index.ts tags descendants with
scoped names but emit-server.ts doesn't thread that name through to
per-handler emit-logic opts). Tracked as open question for follow-up.

5 new integration tests, 0 fail. Suite: 10867 pass.

### Step 5 — multi-scope + sqlite-prefix unit tests +5 (commit 419b559)

Extended unit-test coverage:
- §J — two `<program db=>` nodes both annotate correctly
- §K.1 — bare relative path gets `sqlite:` prefix
- §K.2 — `:memory:` passes through WITHOUT prefix
- §K.3 — postgres:// passes through verbatim
- §K.4 — explicit `sqlite:./...` preserved (idempotent)

Unit test count: 16. Combined unit+integration: 21 new tests.
Full suite: 10872 pass, 0 fail (baseline 10851).

### Step 6 — example recompile verification (post-fix)

```
$ bun compiler/src/cli.js compile examples/03-contact-book.scrml -o /tmp/...
$ grep -nE "new SQL|from \"bun\"" /tmp/.../03-contact-book.server.js
4:import { SQL } from "bun";
5:const _scrml_sql = new SQL("sqlite:contacts.db");

$ bun compiler/src/cli.js compile examples/07-admin-dashboard.scrml -o /tmp/...
4:import { SQL } from "bun";
5:const _scrml_sql = new SQL("sqlite:admin.db");

$ bun compiler/src/cli.js compile examples/08-chat.scrml -o /tmp/...
4:import { SQL } from "bun";
5:const _scrml_sql = new SQL("sqlite:chat.db");

$ bun compiler/src/cli.js compile examples/16-remote-data.scrml -o /tmp/...
4:import { SQL } from "bun";
5:const _scrml_sql = new SQL("sqlite:contacts.db");

$ bun compiler/src/cli.js compile examples/17-schema-migrations.scrml -o /tmp/...
37:import { SQL } from "bun";
38:const _scrml_sql = new SQL("sqlite:./notes.db");

$ bun compiler/src/cli.js compile examples/18-state-authority.scrml -o /tmp/...
37:import { SQL } from "bun";
38:const _scrml_sql = new SQL("sqlite:./tasks.db");
```

All 6 examples now emit valid Bun.SQL handle declarations. The
ReferenceError that Wave 3 D2 surfaced is closed.

### Step 7 — 23-trucking-dispatch latent leak (pre-existing, OUT OF SCOPE)

Tried compiling `examples/23-trucking-dispatch/app.scrml` and surfaced
a SEPARATE pre-existing issue: a SQL identifier `_scrml_sql` leaks
into the generated `*.client.js` output, firing E-CG-006 (security
violation: server-only construct in client JS). Verified by stashing
the Bug 3a fix and recompiling the baseline — the leak fires there
too.

```
$ bun compiler/src/cli.js compile examples/23-trucking-dispatch/app.scrml ...
error [E-CG-006]: Server-only pattern (/\b_scrml_sql(?:_\d+)?\s*[.`]/)
detected in client JS output.

Leak site in client JS line 88:
  return (await _scrml_sql`SELECT id, email, role, ... FROM users
   WHERE id = ${userId}`)[0] ?? null;
```

This is NOT regressed by Bug 3a — the underlying body-content boundary
inference issue is unrelated. **Out of scope for Bug 3a; surfaced for
PA follow-up.** 23 was already failing in baseline (also unrelated
E-CHANNEL-OUTSIDE-PROGRAM errors flagged separately in the dispatch
brief).

### Open questions for PA follow-up

1. **Upstream `_dbVar` threading gap (out of scope for Bug 3a)**:
   `index.ts:337-388` annotates `<program db=>` descendants with
   `_dbVar = "_scrml_sql_<n>"`, but `emit-server.ts` does not thread
   this scoped name into per-handler `emit-logic` opts. So server-fn
   bodies always emit unscoped `_scrml_sql` even when only `<program
   db=>` is in scope. The fallback aliasing in `collectDbScopes`
   resolves this at the declaration level (the unscoped identifier
   maps to the scoped connection string), but the body emit is still
   inconsistent. Net runtime behavior is correct; the cosmetic
   inconsistency is a follow-up dispatch.

2. **E-CG-006 leak in 23-trucking-dispatch app.scrml** (above) —
   pre-existing latent bug surfaced by Bug 3a's wider recompile sweep;
   separate dispatch.

3. **SQLite default-to-postgres footgun** — Bun.SQL's behavior is
   surprising for adopters who write `<db src="./app.db">`. The fix
   here normalizes at emit time; consider whether a runtime helper or
   a spec amendment (require explicit driver prefix at the source
   level too) would be safer for adopter understanding.
