# Pre-snapshot: lsp-l3-scrml-unique-completions

**Branch:** `worktree-agent-afcf5f48dbb7af602`
**Rebased onto:** `72011b3 docs(intake): file fix-cg-cps-return-sql-ref-placeholder`
**Date:** 2026-04-24

## Test baseline (just before any change)

`bun test` from worktree root:

```
7714 pass
40 skip
0 fail
27700 expect() calls
Ran 7754 tests across 364 files. [11.79s]
```

There is one transient `ECONNREFUSED` log line emitted from happy-dom XHR
machinery that does not affect pass/fail (saw "2 fail" once, "0 fail" on
re-run). The signal pass count is 7714.

LSP-specific suite (compiler/tests/lsp/) line counts pre-change:

```
   85 compiler/tests/lsp/analysis.test.js
  156 compiler/tests/lsp/completions.test.js
  179 compiler/tests/lsp/document-symbols.test.js
  120 compiler/tests/lsp/hover.test.js
  464 compiler/tests/lsp/workspace-l2.test.js
 1004 total
```

LSP source line counts pre-change:

```
 1356 lsp/handlers.js
  226 lsp/server.js
  440 lsp/workspace.js
 2022 total
```

## Behavioral baseline

- L1 (commit `e1827e6`): 38 unit tests pass — document symbols, hover,
  completions, analysis pipeline.
- L2 (commit `14cc1d1`): 29 unit tests pass — workspace cache, cross-file
  go-to-def, cross-file diagnostics.
- Total LSP test count: 67 across 5 files.
- `lsp/handlers.js` still imports retired `runBPP` from
  `compiler/src/body-pre-parser.js` (PIPELINE.md v0.6.0 retired BPP as a no-op
  shim — no behavior change but the import is misleading).

## Worktree bootstrap

Required before tests pass:

```
bun install                 # root deps (vscode-languageserver etc)
cd compiler && bun install  # compiler deps
bun run pretest             # builds samples/compilation-tests/dist/
```

All three completed successfully.

## What L3 must add

1. SQL column completion inside `?{}` blocks driven by PA's `views` Map.
2. Component prop completion inside `<Component |...` tags.
3. Cross-file completion: `import { | }` lists exports from the target file.
4. (Bonus) `<` + capital letter in markup suggests cross-file imported
   components in addition to local components.

## Bundled trivial cleanup

`lsp-cleanup-retired-bpp-import` — first commit removes the dead `runBPP`
import + call from `lsp/handlers.js`. Pure cleanup; existing 67 LSP tests
must stay green after the cleanup.

## Tags
#lsp #l3 #pre-snapshot #scrml-unique-completions

## Links
- [intake](../lsp-cleanup-retired-bpp-import/intake.md) — bundled trivial cleanup
- [deep-dive](../../deep-dives/lsp-enhancement-scoping-2026-04-24.md) — L3 design
- [handlers.js](../../../lsp/handlers.js)
- [workspace.js](../../../lsp/workspace.js)
- [server.js](../../../lsp/server.js)
