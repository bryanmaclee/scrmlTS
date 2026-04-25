# Progress: lsp-l3-scrml-unique-completions

- [start] worktree branch `worktree-agent-afcf5f48dbb7af602`, rebased onto main `72011b3`.
- bootstrap: `bun install` + `cd compiler && bun install` + `bun run pretest` (built dist samples).
- baseline: `bun test` → 7714 pass / 0 fail / 40 skip.
- pre-snapshot.md written.

## Plan

1. **Step 1 — bundled trivial cleanup `lsp-cleanup-retired-bpp-import`** — DONE (commit `c89c980`).
   Removed dead `runBPP` import + call from `lsp/handlers.js`. Bundled tiny additive prep
   for L3 (analysis.filePath, analysis.protectAnalysis, components[i].raw).
   67 LSP tests pass.
2. **Step 2 — SQL column completion (L3.1)** — DONE.
   - Added `findEnclosingDbBlock(stateBlocks, offset)` — finds deepest `<db>` containing cursor.
   - Added `findEnclosingSqlContext(text, offset)` — returns { bodyStart, bodyEnd,
     bodyToCursor, fullBody } so alias parsing works in both directions.
   - Added `findEnclosingSqlBody(text, offset)` thin wrapper for the existing helper shape.
   - Added `parseSqlAliases(sql)` — tiny pre-parser for FROM/JOIN/AS aliases.
   - Added `buildSqlColumnCompletions(text, offset, analysis)` — emits ColumnDef-shaped
     completions with sqlType + table-name detail; alias-prefix narrows to the resolved table.
   - Wired into `buildCompletions` for sql context.
   - 15 unit tests in `compiler/tests/lsp/l3-sql-completions.test.js` (uses real Bun SQLite db).
3. **Step 3 — Component prop completion (L3.2)** — DONE.
   - Added `normalizeTokenizedComponentRaw(raw)` — mirror of CE's normalize pass.
   - Added `extractComponentProps(componentDef, filePath)` — runs BS+TAB on raw and pulls the
     `props={...}` propsDecl. Cached by `name::raw` so repeated completions don't re-parse.
   - Added `detectOpenComponentTag(text, offset)` — walks backwards to find an open `<Cap...`.
   - Added `findCrossFileComponent(workspace, importerPath, name)` — walks the importer's
     import graph for cross-file component lookup.
   - Added `findComponentDefInAST(ast, name)` — finds same-file component-defs AND synthesizes
     one from `ast.exports` for `export const Name = <markup>` (the wrapped-by-export-decl shape).
   - Added `buildComponentPropCompletions(text, offset, analysis, workspace)` — wires it all.
   - 11 unit tests in `compiler/tests/lsp/l3-component-prop-completions.test.js`.
4. **Step 4 — Cross-file import completion (L3.3)** — DONE.
   - Added `resolveScrmlImport(source, importerPath)` — LSP-local mirror of the compiler's
     module resolver (only handles `./` and `../` forms — sufficient for completion).
   - Added `detectImportClauseContext(text, offset)` — detects cursor inside `import {  }` braces
     and extracts the `from "..."` source plus partial-identifier prefix.
   - Added `buildImportCompletions(text, offset, analysis, workspace)` — pulls exports of the
     resolved target file from `workspace.exportRegistry`.
   - Added `listImportedCrossFileComponents(workspace, importerPath)` for the bonus
     `<Cap...` markup completion.
   - Wired both into `buildCompletions`.
   - 11 unit tests in `compiler/tests/lsp/l3-import-completions.test.js`.
5. **Step 5 — tests + smoke + anomaly + final commit** — DONE.
   - 3-test smoke at `docs/changes/lsp-l3-scrml-unique-completions/smoke.test.js` exercises
     all three sub-features end-to-end via `buildCompletions` and prints sample
     CompletionItem[] responses.
   - Final test count: 7751 pass / 0 fail / 40 skip (up from 7714 baseline; +37 new tests).
   - LSP suite: 105 pass / 0 fail (38 L1 + 29 L2 + 15 L3.1 + 11 L3.2 + 11 L3.3 + 3 smoke).
   - Anomaly report at `anomaly-report.md`.

## server.js touchups

- Added `" "` (space) to completion `triggerCharacters` so SQL column completion fires
  after typing `SELECT |`.
- Threaded `workspace` into the `onCompletion` handler so cross-file features see it.

## Out-of-scope confirmation

- No files outside `lsp/`, `compiler/tests/lsp/`, or
  `docs/changes/lsp-l3-scrml-unique-completions/` were modified.
- No PA / CE source semantics changed; LSP only consumes existing outputs.
- No `compiler/src/ast-builder.js`, `compiler/src/codegen/emit-server.ts`, or
  `compiler/src/codegen/emit-logic.ts` touched (parallel agent's territory).
