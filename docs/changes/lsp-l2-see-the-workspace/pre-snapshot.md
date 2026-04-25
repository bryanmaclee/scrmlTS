# Pre-snapshot — LSP L2 "See the workspace"

**Date:** 2026-04-24
**Branch base:** main `e1827e6` (post-LSP-L1)
**Worktree:** agent-aeaa5c4ddb0cee89f

## Test baseline

`bun test` (full suite, repo root):

```
7670 pass
40 skip
0 fail
27589 expect() calls
362 files
6.43s
```

`bun test compiler/tests/lsp/` (LSP subset):

```
38 pass
0 fail
113 expect() calls
4 files
~156ms
```

## Files in scope

- `lsp/handlers.js` (1273 LOC) — pure handler module; needs new workspace context.
- `lsp/server.js` (136 LOC) — transport shell; needs workspace bootstrap on `initialize`.
- `compiler/tests/lsp/` — add cross-file scenario tests.

## Out-of-scope (parallel agents own these)

- `compiler/src/codegen/emit-server.ts` / `emit-logic.ts` (parallel `fix-cg-sql-ref-placeholder`)
- root `package.json`, `compiler/package.json`, `bun.lock` (parallel `fix-acorn-implicit-dep`)
- `lsp/server.js` retired-BPP import (parallel `lsp-cleanup-retired-bpp-import`)

## L1 capabilities to preserve

- `documentSymbolProvider` (L1) — must keep working.
- `hoverProvider`, `completionProvider`, `definitionProvider` (single-file paths).
- All 38 LSP tests must stay green.

## Pre-existing behaviour

The LSP currently:
1. Runs the per-file pipeline `splitBlocks → buildAST → runBPP → runPA → runRI → runTS → runDG` on every `didChange`.
2. Has NO knowledge of `import { X } from "./other.scrml"` — `runCE` and `resolveModules` are not wired in.
3. Therefore `onDefinition` for any imported symbol returns `null`.
4. Cross-file diagnostics (importing a non-exported name) are silent.

## L2 deliverables

1. **Workspace bootstrap on `initialize`:** scan `rootUri` for `.scrml` files; build `exportRegistry` + `fileASTMap` cache.
2. **Per-file analyze pipeline reuses workspace cache:** when a file is opened/changed, re-analyze it and update its slice of the cache (exports may have changed).
3. **Cross-file go-to-definition:** if local lookup fails, walk the file's `imports` and look up the symbol in `exportRegistry`; return `Location` pointing into the foreign file.
4. **Cross-file diagnostics:** surface `E-IMPORT-004` ("X is not exported by Y") and `E-IMPORT-002` (cycles) on the import line.
5. **Cache invalidation:** when an open file's exports change, conservatively re-analyze all open buffers (per Q3 of the deep-dive).

## Tags

#pre-snapshot #lsp #l2 #scrmlTS

## Links

- [docs/deep-dives/lsp-enhancement-scoping-2026-04-24.md](../../deep-dives/lsp-enhancement-scoping-2026-04-24.md)
- [lsp/server.js](../../../lsp/server.js)
- [lsp/handlers.js](../../../lsp/handlers.js)
