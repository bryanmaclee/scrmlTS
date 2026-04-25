# Pre-snapshot — lsp-l4-standards-polish

## Branch
- worktree branch: `changes/lsp-l4-standards-polish`
- rebased onto main `7a91068`

## Bootstrap
- `bun install` (root): clean
- `cd compiler && bun install`: clean
- `bun run pretest`: 12 samples compiled into `samples/compilation-tests/dist/`

## Test baseline (compiler/)
- `bun test tests/lsp`: **104 pass / 0 fail / 256 expect calls / 8 files**
- `bun test` (full):
  - 7766 pass
  - 40 skip
  - **2 fail** — both ECONNREFUSED (postgres not running) — PRE-EXISTING infra failures
  - 27798 expect() calls
  - 7808 tests across 368 files

## L1+L2+L3 capability surface (already shipped)
- `documentSymbolProvider: true` (L1)
- `hoverProvider: true` (L1)
- `definitionProvider: true` (L1 same-file, L2 cross-file)
- `completionProvider`: HTML/scrml/SQL keywords + reactive vars + member-access stub +
  L3 (SQL columns, component props, cross-file imports/components)
- L2 workspace cache: cross-file go-to-def + cross-file E-IMPORT-* diagnostics

## L4 plan (this change)
1. **L4.1 — Signature help** (`textDocument/signatureHelp`)
   - Trigger chars: `(` and `,`
   - Walk back from cursor, find the open `(` on a function call, count
     commas after it for active param.
   - Look up function in `analysis.functions` (same-file) and via L2's
     `lookupCrossFileDefinition` for cross-file functions.
   - Return `SignatureHelp` with `SignatureInformation` containing parameter
     names + types + (return marker if available).

2. **L4.2 — Code actions** (`textDocument/codeAction`)
   - Capability: `codeActionProvider: { codeActionKinds: ["quickfix"] }`
   - Diagnostics surface error codes via `diagnostic.code`.
   - Pick top 5 mechanical-fix candidates:
     1. **E-IMPORT-004** (export not found) — Levenshtein-rank similar
        export names from the foreign file's exportRegistry; offer rename.
     2. **E-LIN-001** (linear var declared, never consumed) — prefix var
        with `_` to silence.
     3. **E-SQL-006** (`.prepare()` removed) — drop `.prepare()` call.
     4. **E-IMPORT-005** (bare npm-style import specifier) — prefix with
        `./` if the user likely meant a relative path.
     5. **E-PA-007** (protect= field matches no column) — suggest similar
        column names from the listed tables.

   Each yields a `CodeAction` with `kind: "quickfix"` + `edit:
   WorkspaceEdit` containing a single `TextEdit`.

## What can't change
- The 104 L1+L2+L3 LSP tests must stay green.
- The 7766 non-LSP passes must stay green.
- No touch to `compiler/src/codegen/emit-server.ts` or `emit-logic.ts` (parallel agent).
- No touch to `.claude/maps/` (parallel agent).

## Tags
#lsp #lsp-l4 #pre-snapshot #standards-polish

## Links
- Deep dive: `docs/deep-dives/lsp-enhancement-scoping-2026-04-24.md` (L4 at line 451)
- L1 commit: `e1827e6`
- L2 commit: `14cc1d1`
- L3 commit: `24712f5`
- Handlers: `lsp/handlers.js` (2110 lines)
- Server shell: `lsp/server.js`
- Workspace cache: `lsp/workspace.js`
