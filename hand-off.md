# scrmlTS — Session 2 Hand-Off

**Date:** 2026-04-10
**Next hand-off filename:** `handOffs/hand-off-2.md`

## Carry-over from Session 1
- Repo split from scrml8 verified working: 5,542 tests pass, example compiles in ~20ms
- pa.md + master-list.md created
- Per-repo PA scope block added to pa.md

## Open from Session 1 "Next up"
- [ ] Non-compliance audit (cleanup docs that don't match spec/code)
- [ ] Cold project map — **SKIP**: project-mapper disabled per user-voice S86 (context monster)
- [ ] Build VS Code extension (`tsc`)
- [ ] Verify pre-commit hooks work in new location

## Session 2 Work

### Non-compliance audit (DONE)
13 markdown docs in scrmlTS reviewed against current spec/code.

**Dereffed to scrml-support/archive/** (with `status: superseded` frontmatter):
- `compiler/docs/changes/match-codegen-fix/progress.md` → `archive/changes/match-codegen-fix/progress.md` (stale `~/projects/scrml8` paths, BUG-R13-001 closed)
- `samples/compilation-tests/PROGRESS.md` → `archive/conformance/sample-suite-progress-2026-03-28.md` (claimed 180 samples; disk has 275, tokenizer.js → tokenizer.ts)
- `samples/DEVELOPER-NOTES.md` → `archive/root-archive/developer-notes-2026-03-24.md` (compiler v8 bootstrap friction notes; all open Qs since resolved)

**Updated in place:**
- `README.md` (root) — was a stub; now has real description + quickstart
- `compiler/src/codegen/README.md` — was listing 24 .js files; regenerated to current 34 .ts modules with accurate purposes (added emit-channel, emit-machines, emit-predicates, emit-sync, emit-test, emit-worker, emit-library, type-encoding, source-map, runtime-chunks, context)
- `editors/neovim/README.md` — Section 3 acknowledged: tree-sitter highlights query exists at `queries/scrml/highlights.scm`

**Deleted:**
- `shared/` directory — fictional README describing nonexistent `types/` + `utils/` subdirs. Removed dir + workspace entry from root `package.json`.

**Kept (already current truth):**
benchmarks/RESULTS.md, benchmarks/fullstack-react/{CLAUDE,README}.md, benchmarks/todomvc-{react,svelte}/README.md, examples/README.md

**pa.md side update:** clarified per-repo PA scope is *cognitive* (one PA tracks one repo) not a write firewall — PAs DO write into scrml-support (storage repo) for user-voice, archive deref, design-insights, resource-mapper increments.

### VS Code extension build (DONE)
- `editors/vscode/package.json` was missing `@types/node`. Added.
- `bun install` + `bunx tsc` clean → `out/extension.js` (83 lines, `node --check` OK).
- Added `editors/vscode/{out,bun.lock}` to root `.gitignore`.

### Git hooks installed (DONE)
Copied from scrml8 unchanged (paths are repo-relative, all targets exist):
- `pre-commit` — runs `bun test compiler/tests/` if any `compiler/` files staged. Blocks on fail.
- `post-commit` — on `compiler/` change: full test suite + TodoMVC compile + browser-quality checks (CSS braces, bare function calls, dot-path subscriptions).
- `pre-push` — full test suite + TodoMVC gauntlet check. Blocks push on fail.

**Caveat:** `.git/hooks/` is not versioned. A fresh clone won't have them. Future TODO: mirror into `scripts/git-hooks/` + install script.

### Section O — non-compliance / cleanup: COMPLETE
All four resolved: audit, cold-map (re-enabled with scope discipline), VS Code build, hooks.

### Cold project map (DONE)
Re-enabled with scope discipline (excluded `node_modules`, `dist`, framework-comparison benchmarks; master-list as spine). 10 maps + INDEX + non-compliance written to `.claude/maps/`. ~30 file reads — sustainable. Zero non-compliance findings (S2 audit cleared everything).

### Scripts/ trim (DONE)
24 → 8. 16 archived to `scrml-support/archive/scripts/scrmlTS-2026-04-10/` (with README + frontmatter):
- 12 round/session/section-specific patches (`apply-r21-*`, `apply-s37-*`, `apply-spec-patch-§14`, `splice-section-18`, `check-round3`, `diagnose-round3`, `gauntlet-check`, `fix-double-closers`, `test-design-qs`, `apply-reflect-hybrid-patches`)
- 4 broken/superseded sample-verifiers (`verify-all.{js,sh}`, `verify-batch.js`, `verify-mission.js`)

Kept 8: update-spec-index.sh, pull-worktree.sh, assemble-spec.sh, bundle-size-benchmark.js, generate-api-reference.js, verify-js.js, migrate-closers.js, rebuild-bs-dist.ts.

### Next up
- Section N (P1 language completeness): DQ-12 / DQ-7 / DQ-11 / Lin spec gaps
- Or: scripts/git-hooks/ versioning if user wants the safety net first

