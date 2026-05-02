# Progress: ast-shape-rename

- Branch created: `changes/ast-shape-rename` from `3deb87a` (S53 main tip).
- Worktree infrastructure: `bun install` (acorn missing), `bash scripts/compile-test-samples.sh` to populate dist/.
- Baseline confirmed: 8576 pass / 0 fail / 40 skip / 426 files.
- Inventory complete (see migration-plan.md):
  - `"machine-decl"` literal: 16 files (3 source, 1 LSP, 2 doc, 10 test).
  - `machineName` field: 17 files (3 source, 2 LSP, 12 test).
- Migration plan recorded. Commit `b9009c1`.

## Step 2: source-side renames

Updated source emitters/consumers. After this commit, tests still fail because they assert on old shape (expected).

- `compiler/src/ast-builder.js` — `kind: "engine-decl"` and `engineName: engineName` (the local already named `engineName` from P3-RENAME, now writes the new field name). Comments updated.
- `compiler/src/name-resolver.ts` — consumer reads `kind === "engine-decl"` and `anyN.engineName`.
- `compiler/src/type-system.ts` — comments + `decl.engineName` field read in `buildMachineRegistry`.
- `lsp/handlers.js` — `case "engine-decl"`, `md.engineName`, `node.engineName`, comment updated.
- `lsp/workspace.js` — `md.engineName` field read; comment updated.

Note: `ast.machineDecls` (file-level array) NOT renamed — out of scope per dispatch (only the AST node `kind` literal and the per-node field).

Test count: 8521 pass / 55 fail / 40 skip — as expected (tests assert on old shape; will be migrated in Step 3).
