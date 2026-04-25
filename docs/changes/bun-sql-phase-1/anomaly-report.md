# Anomaly Report: bun-sql-phase-1

Captured after Phase 1 codegen migration is complete. Baseline reference:
`b3c83d3` with 7,562 pass / 40 skip / 0 fail.

## Test Behavior Changes

### Expected — net +3 tests, all green

```
Before:  7562 pass / 40 skip /  0 fail / 7602 tests
After:   7565 pass / 40 skip /  0 fail / 7605 tests
                                          (+3 tests)
```

#### Per-file test count changes

| File | Before | After | Delta | Reason |
|---|---|---|---|---|
| `sql-params.test.js` | 32 | 36 | +4 | Added §14 (E-SQL-006 emission), §15 (template escaping) |
| `sql-write-ops.test.js` | 41 | 41 | 0 | §5–§7 .prepare() reframed to E-SQL-006; §10 reframed to runtime IIFE |
| `sql-loop-hoist-rewrite.test.js` | 10 | 10 | 0 | §5 + §9 expectations updated for sql.unsafe(rawSql, paramArray) |
| `sql-batching-envelope.test.js` | 6 | 6 | 0 | All 6 tests updated for `await _scrml_sql.unsafe()` form |
| `sql-nobatch.test.js` | 8 | 8 | 0 | §1–§4 expectations updated for tagged-template form |
| `sql-loop-hoist-detection.test.js` | 11 | 11 | 0 | Detection-only — unaffected by emission shape |
| `sql-batch-5b-guards.test.js` | 6 | 6 | 0 | Guards SQL detection — unaffected |
| `sql-client-leak.test.js` | 58 | 58 | 0 | §15 expectations updated; §2 updated for sql.unsafe() form |
| `nested-program-db.test.js` | 8 | 8 | 0 | All 8 tests updated for `_scrml_sql` default and `_scrml_sql_<n>` scoped form |
| `nested-program-e2e.test.js` | 11 | 11 | 0 | E2E checks shape-agnostic |

#### Notable expectation changes

- **`.prepare()`** — old code asserted `_scrml_db.prepare("...")` emission. New
  code asserts E-SQL-006 emission per §44.3. This is the intended Phase 1
  behavior change.
- **Identifier rename** — every assertion of `_scrml_db.<method>` now
  asserts `_scrml_sql\`...\`` or `_scrml_sql.unsafe(...)` per §44 emission.
- **Auto-await** — server-side SQL now emitted with `await` prefix (§44.4).
- **Loop hoist (§8.10)** — old code asserted
  `_scrml_db.query(...).all(...keys)`. New code asserts
  `_scrml_sql.unsafe(rawSql, keys)` because Bun.SQL's SQLite branch does
  NOT support array binding (`sql.array()` throws "SQLite doesn't support
  arrays"). Manual `?N` placeholder construction + `unsafe()` is the
  correct pattern (verified in `scripts/_probe_sql*.js`).

### Unexpected (Anomalies)

**None.**

## E2E Output Changes

### Expected

#### Examples 03, 07, 08 SQL emission

All `?{}` SQL sites now emit Bun.SQL tagged-template form:

- `03-contact-book.server.js`:
  - `await _scrml_sql\`INSERT INTO contacts ...\``
  - `await _scrml_sql\`DELETE FROM contacts WHERE id = ${id}\``
- `07-admin-dashboard.server.js`:
  - `await _scrml_sql\`DELETE FROM users WHERE id = ${id}\``
- `08-chat.server.js`:
  - `await _scrml_sql\`SELECT ...\`` (multi-line SQL)

No leftover `_scrml_db.*`, no `_scrml_sql_exec(`, no `.query(...).all/.get/.run/.prepare`.

### Unexpected (Anomalies)

**None caused by this change.** See "Pre-Existing Issues" below.

## Pre-Existing Issues (NOT Phase 1 Regressions)

### lift ?{...}.method() in server function — orphaned chained call

**Symptom:** `bun --check examples/dist/03-contact-book.server.js` fails with
`Unexpected .` at line 88 because the emit produces:

```js
return null; /* server-lift: non-expr form */
. all ( );
```

**Root cause:** In `compiler/src/ast-builder.js:2245-2251`, the `lift`
keyword path that handles BLOCK_REF (i.e. `lift ?{...}`) consumes the
sql-node child but does NOT consume the trailing chained call (`.all()`).
The chained call is left on the token stream, picked up later as an
orphan bare-expr, and emitted verbatim.

**Confirmed pre-existing:** Verified by stashing all Phase 1 changes,
recompiling 03-contact-book, and observing the same exact error at the
same exact line. The bug exists at baseline `b3c83d3` and is unrelated
to the SQL emission shape — both `_scrml_db.query("...").all()` (old) and
the orphan `.all()` line are produced before Phase 1.

**Affected examples:** 03, 07, 08 (all examples that use `lift ?{`SELECT ...`}.all()`).

**Phase 1 scope decision:** Out of scope. This is a pre-existing AST builder
bug for `lift + ?{}` interaction, not a Bun.SQL emission issue. Should be
filed as a separate bug (e.g. `fix-lift-sql-chained-call`).

**Mitigation:** The compiler runs `bun test` cleanly (7565 pass / 0 fail) so
all reachable code paths in the test suite work correctly. Examples that
depend on `lift ?{}` happen to exercise this pre-existing bug.

## New Warnings or Errors

None new. Pre-existing gauntlet warnings in
`samples/compilation-tests/gauntlet-s19-phase1-decls/` continue to surface
("statement boundary not detected") — these are baseline.

## Anomaly Count

**0 unexpected anomalies caused by Phase 1.**
**1 pre-existing issue** documented above (lift+sql AST builder bug).

## Status

**CLEAR FOR MERGE** — All 7,565 tests green. Phase 1 emission migration
complete. SPEC §44 alignment for SQLite branch is fully in place. The
pre-existing lift+sql issue is documented for separate handling.
