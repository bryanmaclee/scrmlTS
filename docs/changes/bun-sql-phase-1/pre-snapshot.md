# Pre-Snapshot: bun-sql-phase-1

Captured before any code changes, on worktree branch
`worktree-agent-a545c390a521db577` rebased onto `main` HEAD `b3c83d3`.

## Test Suite Baseline

```
$ bun run test
 7562 pass
 40 skip
 0 fail
 27246 expect() calls
Ran 7602 tests across 354 files. [11.35s]
```

This is the canonical baseline. Bun reports a transient 2-test browser
failure on first invocation (network/race), then 0-fail on subsequent
runs — so the second-run figure (7562/40/0) is the stable baseline.

## Pretest dependency

`bun run test` requires `bun install` first (acorn, happy-dom, puppeteer
were missing from a clean worktree clone). Once installed, the pretest
script `scripts/compile-test-samples.sh` compiles the browser sample
fixtures into `samples/compilation-tests/dist/`. All compile cleanly at
baseline.

## Sample compilation baseline

`bash scripts/compile-test-samples.sh` succeeds — 12 samples compile
without errors at baseline.

## Pre-existing warnings (NOT regressions)

These appear at baseline and must be ignored during anomaly detection:

- "[scrml] warning: statement boundary not detected" — multiple gauntlet
  samples in `samples/compilation-tests/gauntlet-s19-phase1-decls/`
  emit this. Pre-existing.
- "Cannot find package 'acorn' from .../expression-parser.ts" — only
  appears if `bun install` has not been run.

## Bun.SQL API surface (probed at baseline)

Probes captured in `scripts/_probe_sql*.js`. Verified shape:

- `new SQL(":memory:")` → callable tag function
- `sql\`...\`` → thenable; `await` produces array with extra props
- `sql.unsafe(rawSql, paramArray)` → thenable, returns array
- `sql.begin(callback)` → transaction
- `sql.end()` / `sql.close()` / `sql.reserve()`
- For SQLite: array binding NOT supported. `sql.array()` throws.
- No `.all()` / `.get()` / `.first()` / `.prepare()` / `.exec()` / `.query()` methods on `sql` itself.
- Result has `.lastInsertRowid` and `.count` props after INSERT.

## Files in scope (line counts at baseline)

- `compiler/src/codegen/rewrite.ts` — 1767 lines
- `compiler/src/codegen/emit-control-flow.ts` — 1250 lines
- `compiler/src/codegen/emit-server.ts` — 819 lines
- `compiler/src/codegen/emit-logic.ts` — 1742 lines
- `compiler/src/codegen/index.ts` — 628 lines
- `compiler/src/codegen/context.ts` — 101 lines

## Test files in scope (line counts at baseline)

```
$ wc -l compiler/tests/unit/sql-*.test.js
   188 sql-batch-5b-guards.test.js  (verify)
   188 sql-batching-envelope.test.js
   782 sql-client-leak.test.js
   248 sql-loop-hoist-detection.test.js
   264 sql-loop-hoist-rewrite.test.js
   214 sql-nobatch.test.js
   305 sql-params.test.js
   475 sql-write-ops.test.js
```
