# Progress: ast-shape-rename

- Branch created: `changes/ast-shape-rename` from `3deb87a` (S53 main tip).
- Worktree infrastructure: `bun install` (acorn missing), `bash scripts/compile-test-samples.sh` to populate dist/.
- Baseline confirmed: 8576 pass / 0 fail / 40 skip / 426 files.
- Inventory complete (see migration-plan.md):
  - `"machine-decl"` literal: 16 files (3 source, 1 LSP, 2 doc, 10 test).
  - `machineName` field: 17 files (3 source, 2 LSP, 12 test).
- Migration plan recorded.
