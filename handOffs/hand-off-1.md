# scrmlTS — Session 1 Hand-Off

**Date:** 2026-04-10
**Next hand-off filename:** `handOffs/hand-off-1.md`

## Stats
- **Source:** split from scrml8 (~/projects/scrml8/) S86
- **Tests:** 5,542 pass, 2 skip, 0 fail (verified in new location)
- **Compile time:** ~20ms single file (first example)
- **Size:** 21 MB (benchmark node_modules removed)
- **Deps installed:** 224 packages

## Session Work

### 1. Split from scrml8 (DONE)
Copied into `~/scrmlMaster/scrmlTS/`:
- `compiler/` (src, tests, SPEC.md, SPEC-INDEX.md, PIPELINE.md, self-host/, scripts/)
- `samples/compilation-tests/` (275 files)
- `examples/` (14 files)
- `benchmarks/` (node_modules excluded from framework comparisons)
- `stdlib/` (13 modules)
- `dist/scrml-runtime.js`
- `lsp/server.js`
- `editors/vscode/`, `editors/neovim/`
- `shared/`, `scripts/`
- `package.json` (workspaces trimmed: removed editor, platform)
- `bunfig.toml`, `bun.lock`

### 2. Verified working (DONE)
- `bun install` succeeded (224 packages)
- `bun run compiler/src/cli.js compile examples/01-hello.scrml` → compiled in 20ms
- `bun test compiler/tests/` → 5,542 pass, 2 skip, 0 fail

### 3. pa.md + master-list.md created (DONE)
- pa.md codifies "current truth only" principle
- master-list.md is the live inventory

## Next up

- [ ] Non-compliance audit (cleanup docs that don't match spec/code)
- [ ] Cold project map (small, scoped)
- [ ] Build VS Code extension (`tsc`)
- [ ] Verify pre-commit hooks work in new location
