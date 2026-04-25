# Progress — LSP L2 "See the workspace"

- [start] Branch `worktree-agent-aeaa5c4ddb0cee89f` already at main `e1827e6` (post-L1).
- [start] Pre-snapshot written; baseline 7670 pass / 38 LSP pass.
- [step 1] Created `lsp/workspace.js` — workspace cache module.
  - `createWorkspace`, `bootstrapWorkspace`, `updateFileInWorkspace`,
    `removeFileFromWorkspace`, `lookupCrossFileDefinition`,
    `getCrossFileDiagnosticsFor`, `scanScrmlFiles`, `tabFile`,
    `rebuildCrossFileGraph`.
  - Hand-rolled smoke confirmed it bootstraps a 2-file workspace,
    resolves cross-file lookups, and emits `E-IMPORT-004` after an export
    is removed.
- [step 2] Updated `lsp/handlers.js`:
  - Added imports of workspace helpers + `pathToUri`/`uriToFilePath`.
  - `analyzeText` gains optional `workspace` arg → cross-file diagnostics.
  - `buildDefinitionLocation` gains optional `workspace` + `filePath` →
    cross-file fall-through.
  - Added `E-IMPORT-*` to ERROR_DESCRIPTIONS + getErrorSource routing.
  - All 38 L1 LSP tests still pass.
- [step 3] Updated `lsp/server.js`:
  - `onInitialize` reads `workspaceFolders`/`rootUri`/`rootPath` and
    calls `bootstrapWorkspace` (single-file mode when no root supplied).
  - `onDidChangeContent` refreshes workspace first, then re-publishes;
    re-publishes ALL open buffers when exports change.
  - `onDidClose` keeps on-disk content cached so closed-tab files still
    resolve for other importers.
  - `onDefinition` threads workspace + filePath through.
  - Pre-commit hooks + post-commit gauntlet check pass.
- [step 4] Wrote `compiler/tests/lsp/workspace-l2.test.js` — 29 tests.
  - 67 total LSP tests pass (38 L1 + 29 L2).
  - Full suite: 7699 pass / 40 skip / 0 fail / 363 files.
- [step 5] Wrote two stdio smoke tests:
  - `smoke-test.js` — failure-path: import a non-exported name, verify
    `E-IMPORT-004` surfaces. PASS.
  - `smoke-test-2.js` — success-path: import + use `<Card />`, verify
    `textDocument/definition` returns Location into card.scrml.
    Confirmed: response.uri = card.scrml, range.start.line = 1
    (= line 2 1-based, the `export const Card = ...` line).
- [step 6] Wrote anomaly-report.md — CLEAR FOR MERGE.

## Final state
- Tests: 7699 pass / 40 skip / 0 fail (was 7670 / 40 / 0).
- LSP tests: 67 pass (was 38) / 0 fail.
- New files: lsp/workspace.js, compiler/tests/lsp/workspace-l2.test.js,
  docs/changes/lsp-l2-see-the-workspace/* (artifacts).
- Modified: lsp/handlers.js, lsp/server.js.
- Branch: `worktree-agent-aeaa5c4ddb0cee89f`.
- Commits (range): c84c843 .. (final commit).
