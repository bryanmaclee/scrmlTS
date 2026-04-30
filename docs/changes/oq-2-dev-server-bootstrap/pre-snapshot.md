# Pre-snapshot — oq-2-dev-server-bootstrap

Captured at: HEAD = 3dab098, branch = changes/oq-2-dev-server-bootstrap (worktree).

## Test suite baseline

```
bun test (run from repo root with samples compiled):
  8196 pass
  40 skip
  0 fail
  28749 expect() calls
  385 files
  ~13s wall
```

Matches the brief's pre-snapshot exactly.

## E2E compile state

`scrml compile examples/23-trucking-dispatch/` succeeds in ~1.3s with 13 W-* warnings
(28 statement-boundary warnings — pre-existing, F-LIN-001 family). 32 source files
compile to 17 HTML files + accompanying JS (per F-COMPILE-001 — basename collision is
the W0a scope, not this dispatch's).

## Runtime load state for emitted JS

Files that import only relative `.scrml` and no stdlib: load OK.

Files that import stdlib (`scrml:auth`, `scrml:crypto`, `scrml:store`):
- `app.server.js` — Cannot find package 'scrml:auth'
- `login.server.js` — Cannot find package 'scrml:auth'
- `register.server.js` — Cannot find package 'scrml:auth'
- `profile.server.js` — Cannot find package 'scrml:store'

Files with malformed SQL emit (`/* sql-ref:-1 */`):
- `billing/board/customers/drivers/load-new` — Unexpected .
- `home/hos/invoices/load-detail/load-log/loads/messages/quote` — Unexpected ;

Total: 17 *.server.js fail to load. 4 due to OQ-2 (this dispatch). 13 due to a separate
SQL parser bug (out of scope).

## Pre-existing failures that are NOT regressions

None — `bun test` is at 0 fail at HEAD.

## Notes

- The `examples/23-trucking-dispatch/dist/` directory is checked-in and stale at HEAD;
  this dispatch's compile runs regenerate it. Pre/post diff of dist/ files is
  expected for at least the import lines, so the post-snapshot compares **runtime
  loadability** (`bun -e 'await import(...)'` succeeds) rather than byte-for-byte
  identity.
- W0a (parallel sibling) may also change dist/ output structure; this dispatch must not
  touch any path that W0a owns (compile.js, build.js, api.js path-resolution).
