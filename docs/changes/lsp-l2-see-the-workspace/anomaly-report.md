# Anomaly Report — LSP L2 "See the workspace"

**Date:** 2026-04-24
**Branch:** `worktree-agent-aeaa5c4ddb0cee89f`
**Pre-baseline:** 7670 pass / 40 skip / 0 fail / 27589 expect / 362 files
**Post-baseline:** 7699 pass / 40 skip / 0 fail / 27647 expect / 363 files
**Delta:** +29 pass, +58 expect, +1 file (`compiler/tests/lsp/workspace-l2.test.js`)

## Test Behavior Changes

### Expected
- `compiler/tests/lsp/workspace-l2.test.js` — 29 new tests added; all pass.
  Covers `scanScrmlFiles`, `tabFile`, `bootstrapWorkspace`,
  `lookupCrossFileDefinition`, cross-file diagnostics, cache invalidation,
  `pathToUri` / `uriToFilePath`, `buildDefinitionLocation` cross-file fall-
  through, and `analyzeText` workspace integration.
- All 38 L1 LSP tests in `compiler/tests/lsp/{analysis,completions,document-symbols,hover}.test.js`
  remain green — the workspace argument is opt-in and additive.
- The full `bun test` suite remains 0 fail.

### Unexpected (Anomalies)
- **None.**

## E2E Output Changes

### Expected
- Smoke test #1 (`docs/changes/lsp-l2-see-the-workspace/smoke-test.js`):
  Two-file workspace where page.scrml imports `CardMissing` (intentionally
  not exported by card.scrml). Expected: page.scrml diagnostics include
  `E-IMPORT-004` on line 2 char 9-44 (the import line). **Confirmed.**
- Smoke test #2 (`docs/changes/lsp-l2-see-the-workspace/smoke-test-2.js`):
  Two-file workspace where page.scrml legitimately imports `Card`. Expected:
  `textDocument/definition` on `<Card />` returns a Location pointing into
  card.scrml at the `export const Card = ...` line. **Confirmed** —
  response uri = card.scrml, range starts at line 1 (0-based) = line 2
  (1-based) of card.scrml.
- Pre-commit + post-commit hooks (TodoMVC compile + browser validation)
  pass on the L2 commits with no regressions:
  - 7699 pass / 0 fail
  - TodoMVC compile: PASS (3 files in 149.3ms, 2 warnings — pre-existing)
  - Browser validation: all checks passed (16 mangled defs, 0 bare calls,
    no dot-path subscriptions)

### Unexpected (Anomalies)
- **None.**

## New Warnings or Errors

- **None at compile time.** Note that `W-PROGRAM-001` ("No <program> root
  element found") appears in the smoke-test diagnostics — this is pre-
  existing behaviour for files without a `<program>` wrapper, NOT a
  regression introduced by L2.

## Files Changed (real changes)

### New files
- `lsp/workspace.js` (340 LOC) — workspace cache module: `createWorkspace`,
  `bootstrapWorkspace`, `updateFileInWorkspace`, `removeFileFromWorkspace`,
  `lookupCrossFileDefinition`, `getCrossFileDiagnosticsFor`,
  `scanScrmlFiles`, `tabFile`, `rebuildCrossFileGraph`.
- `compiler/tests/lsp/workspace-l2.test.js` (464 LOC) — 29 new tests.
- `docs/changes/lsp-l2-see-the-workspace/` — change artifacts directory:
  - `pre-snapshot.md`
  - `progress.md`
  - `smoke-test.js` + `smoke-test.out` (failure-path scenario)
  - `smoke-test-2.js` + `smoke-test-2.out` (success-path scenario)
  - `anomaly-report.md` (this file)

### Modified files
- `lsp/handlers.js` (+89 LOC):
  - Added imports of `lookupCrossFileDefinition`,
    `getCrossFileDiagnosticsFor` from `./workspace.js`.
  - Added `pathToUri` and `uriToFilePath` helpers.
  - `analyzeText(filePath, text, logger, workspace?)` — fourth optional
    `workspace` parameter. When provided, cross-file `E-IMPORT-*` errors
    from the workspace cache are appended to the per-file diagnostics.
  - `buildDefinitionLocation(uri, text, offset, analysis, workspace?, filePath?)`
    — fifth/sixth optional parameters. Same-file lookup runs first; on
    miss, `lookupCrossFileDefinition` walks the importer's import graph
    and returns a Location pointing into the foreign file.
  - Added `E-IMPORT-002` / `E-IMPORT-004` / `E-IMPORT-005` / `E-IMPORT-006`
    rows to `ERROR_DESCRIPTIONS` for hover.
  - Added `E-IMPORT-` routing in `getErrorSource` →
    `"scrml/module-resolver"`.
- `lsp/server.js` (+95 LOC):
  - `onInitialize`: reads `workspaceFolders` / `rootUri` / `rootPath` and
    calls `bootstrapWorkspace`. Falls back to single-file mode (L1
    behaviour) when no root is supplied.
  - `onDidChangeContent`: now calls `updateFileInWorkspace` first to
    refresh the cross-file graph, then re-publishes diagnostics for the
    changed buffer; if exports changed, also re-publishes diagnostics
    for every other open buffer (conservative L2 policy from deep-dive
    Q3).
  - `onDidClose`: keeps the on-disk file content in the workspace cache
    when the file still exists on disk, so closing a tab doesn't break
    cross-file resolution for other open buffers.
  - `onDefinition`: passes workspace + absolute filePath to
    `buildDefinitionLocation` so cross-file fall-through works.

## Backward Compatibility

- L1 callers of `analyzeText(filePath, text, logger)` work unchanged —
  the new `workspace` parameter is optional and the cross-file diagnostic
  branch only runs when it is supplied.
- L1 callers of `buildDefinitionLocation(uri, text, offset, analysis)`
  work unchanged — the new `workspace` and `filePath` parameters are
  optional and the cross-file fall-through only runs when both are
  supplied.
- All 38 L1 LSP tests confirm this experimentally.

## Out-of-Scope (per dispatch)

- L3 (SQL completion / component prop completion / cross-file completion)
  — separate phase.
- L4 / L5 — not touched.
- The retired BPP import in `lsp/server.js` (`runBPP` from
  `body-pre-parser.js`) — left alone per dispatch (parallel agent
  `lsp-cleanup-retired-bpp-import` owns it).
- `compiler/src/codegen/emit-server.ts` / `emit-logic.ts` — left alone
  per dispatch (parallel agent `fix-cg-sql-ref-placeholder`).
- Root `package.json`, `compiler/package.json`, `bun.lock` — left alone
  per dispatch (parallel agent `fix-acorn-implicit-dep`).

## Anomaly Count: 0

## Status: CLEAR FOR MERGE

## Tags

#anomaly-report #lsp #l2 #scrmlTS

## Links

- [pre-snapshot.md](./pre-snapshot.md)
- [progress.md](./progress.md)
- [smoke-test.out](./smoke-test.out)
- [smoke-test-2.out](./smoke-test-2.out)
- [docs/deep-dives/lsp-enhancement-scoping-2026-04-24.md](../../deep-dives/lsp-enhancement-scoping-2026-04-24.md)
- [lsp/server.js](../../../lsp/server.js)
- [lsp/handlers.js](../../../lsp/handlers.js)
- [lsp/workspace.js](../../../lsp/workspace.js)
- [compiler/tests/lsp/workspace-l2.test.js](../../../compiler/tests/lsp/workspace-l2.test.js)
