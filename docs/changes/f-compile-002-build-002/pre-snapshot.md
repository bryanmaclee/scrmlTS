# Pre-Snapshot: f-compile-002-build-002

Captured: 2026-04-30 19:34
Worktree: /home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-aa8c40c8744a6c38d
Worktree HEAD: e69ecac (rebased onto main HEAD; matches origin)

## bun test (compiler/) — pre-baseline

```
8329 pass
40 skip
0 fail
29000 expect() calls
Ran 8369 tests across 395 files. [10.93s]
```

Matches user-reported pre-baseline.

## Pre-existing flakes / network noise

- One run showed 2 transient fails (ECONNREFUSED in node:_http_client). Re-run was clean. Not a regression.
- Worktree initially missing `node_modules` and `samples/compilation-tests/dist/`. Symlinked from main + ran `scripts/compile-test-samples.sh` to restore.

## Repro confirmation — F-COMPILE-002

- Build dispatch app (examples/23-trucking-dispatch) → `app.server.js` line 7-8:
  ```
  import { rolePath, SESSION_TTL_SECONDS, SESSION_DB_PATH } from "./models/auth.scrml";
  import { runSeeds } from "./seeds.scrml";
  ```
  These are emitted verbatim with the user-source `.scrml` extension. Bun rejects the imports at runtime.

## Repro confirmation — F-BUILD-002

- Source-of-truth: `compiler/src/codegen/emit-server.ts:166` emits `export const _scrml_session_destroy = { ... }` from EVERY server.js with auth-middleware.
- `compiler/src/commands/build.js:200-209` (`generateServerEntry`): emits `import { ${allNames.join(", ")} } from "./${filename}";` once per discovered server.js. With N modules each exporting `_scrml_session_destroy`, the entry contains N `import { _scrml_session_destroy } from "./X.server.js";` lines.
- N>=2 → JavaScript SyntaxError "Identifier '_scrml_session_destroy' has already been declared".
- The dispatch app has many auth-middleware files; the bug is reproducible there. (Build itself errors out before _server.js is written, but the bug is in the codegen path that would write it.)

## Bugs are paired but independent

- F-COMPILE-002 fix is in `rewriteRelativeImportPaths` (api.js) + emit-server.ts.
- F-BUILD-002 fix is in `generateServerEntry` (commands/build.js).
- Neither fix interferes with the other. They are commit-isolable.

## Files NOT to touch (per dispatch)

- W0a's output-path resolution + E-CG-015 in api.js
- W0b's stdlib bundling + import-rewrite scrml: handling
- W1's validators
- W2's component-expander
- W3+W3.1+W3.2's gauntlet-phase3 walker
- F-SQL-001 sibling parser stages: BS / TAB / PA `?{}`
