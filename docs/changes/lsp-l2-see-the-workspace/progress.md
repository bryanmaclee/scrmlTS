# Progress — LSP L2 "See the workspace"

- [start] Branch `worktree-agent-aeaa5c4ddb0cee89f` already at main `e1827e6` (post-L1).
- [start] Pre-snapshot written; baseline 7670 pass / 38 LSP pass.
- [step 1] Created `lsp/workspace.js` — workspace cache module with:
  - `createWorkspace()`, `bootstrapWorkspace()`, `updateFileInWorkspace()`,
    `removeFileFromWorkspace()`, `lookupCrossFileDefinition()`,
    `getCrossFileDiagnosticsFor()`, `scanScrmlFiles()`, `tabFile()`,
    `rebuildCrossFileGraph()`.
  - Hand-rolled smoke test confirmed: bootstrapped 2 files, resolved
    `lookupCrossFileDefinition(page,Card)` to card.scrml line 2,
    `E-IMPORT-004` surfaced after removing the export.
- [step 2] Updated `lsp/handlers.js`:
  - Added import of workspace helpers + `pathToUri`/`uriToFilePath`.
  - Added optional `workspace` param to `analyzeText`; when provided,
    `getCrossFileDiagnosticsFor` is appended to the diagnostic stream.
  - Added optional `workspace` + `filePath` params to `buildDefinitionLocation`;
    falls through to `lookupCrossFileDefinition` when same-file lookup misses.
  - Added `E-IMPORT-*` rows to `ERROR_DESCRIPTIONS` and routing in
    `getErrorSource`.
  - All 38 L1 LSP tests still pass after the change.
- [next] Wire workspace into `lsp/server.js` (initialize / didOpen / didChange / didClose).
- [next] Add cross-file LSP tests under `compiler/tests/lsp/`.
- [next] Smoke-test the live LSP via stdio.
