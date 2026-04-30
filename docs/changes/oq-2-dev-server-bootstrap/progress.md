# Progress: oq-2-dev-server-bootstrap

- [start] Worktree: `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a94cd4a36019acf92`
- [start] Branch: `changes/oq-2-dev-server-bootstrap`
- [start] HEAD: `3dab098` (matches main — no rebase needed)
- [step 1] Bootstrapped node_modules at root + compiler. Compiled samples. Baseline `bun test` = 8,196p / 40s / 0f / 385 files. Matches brief expectation.
- [step 2] Reproduced OQ-2 failure. Root cause is identical under `compile` AND `dev` — codegen emits literal `import { ... } from "scrml:auth"` and Bun cannot resolve `scrml:*`. Documented in repro.md and diagnosis.md.
- [step 3] Selected fix shape: **Shape B with hand-written runtime shims**. Reasoning: stdlib `.scrml` source files do NOT compile cleanly via the standard pipeline (`server {}` blocks emit E-SCOPE-001 errors at TS stage — separate compiler gap). Compiling stdlib transitively is therefore out of scope for OQ-2. Smallest path to runnable dispatch: ship hand-written JS implementations for the 4 stdlib functions the dispatch app actually uses (hashPassword, verifyPassword, generateToken, createSessionStore), plus the bundling + import-rewrite infrastructure to wire them in. Future dispatch can replace shims with truly-compiled stdlib once the compiler can lower `server {}` blocks at TS time for stdlib sources.
- [step 4] Committed pre-snapshot + repro + diagnosis (commit e1b285b → 58cb308 post-rebase).
- [step 5] Begin implementation — write runtime shims, bundling pass, import rewriter. (Original agent crashed mid-step on api.js write loop with API ConnectionRefused.)

## CHECKPOINT — resumed after API ConnectionRefused crash (resume-1)

### Context observed at resume
- Worktree intact, branch `changes/oq-2-dev-server-bootstrap` checked out.
- 2 prior commits: `e1b285b` (snapshot+repro+diagnosis), `ce2bcef` (3 hand-written shims).
- Uncommitted WIP on `compiler/src/api.js`: imports + STDLIB_RUNTIME_DIR constant + `collectStdlibSpecifiers` + `bundleStdlibForRun` + `rewriteStdlibImports` + write-loop integration. Diff was ~149 lines.
- Sibling W0a (F-COMPILE-001) had landed on main (commit `268f190` and predecessors `05dc7fb` + `99d4909` + `287c1d7` + `7776907` + `cb5622b`) — branch needed rebase.

### Resume-1 actions
- [resume-1] Stashed WIP api.js work. `git rebase main` succeeded — both prior commits replayed cleanly (one touches docs+runtime, the other touches docs only; no overlap with W0a's api.js changes). Post-rebase HEAD = `7cdf938` and `58cb308`. Tests at 8,213p / 0f (matches post-W0a baseline).
- [resume-1] `git stash pop` produced 3 conflict regions in api.js — all in the write loop where W0a introduced `pathFor`/`writeOutput`/`writtenPaths` infrastructure. Auto-merge already preserved the import additions and `STDLIB_RUNTIME_DIR` block at the top.
- [resume-1] Resolved conflicts via Python script:
  - Kept W0a's `pathFor`/`writeOutput`/`writtenPaths` infrastructure (Option A + Option B + E-CG-015) verbatim.
  - For each emitted JS file (serverJs, libraryJs, clientJs), compute `targetDir` via `pathFor()` BEFORE the write so it can be passed to `rewriteStdlibImports` as the `bundleDir` argument.
  - Use `writeOutput()` for all writes — preserves E-CG-015 collision check.
  - clientJs now also gets `rewriteStdlibImports` (browser-loaded JS hits the same Cannot-find-package failure mode as server JS).
- [resume-1] `node --check compiler/src/api.js` → OK. Manual rebuild of `examples/23-trucking-dispatch/`: `dist/_scrml/{auth,crypto,store}.js` exist; emitted JS uses relative paths (`./_scrml/...` for top-level files, `../../_scrml/...` for nested-page files); zero `scrml:*` specifiers remain in emitted code.
- [resume-1] `bun test` (full suite, post-resolution): 8,213p / 0f / 40 skip / 386 files / 13.86s. Zero regressions vs post-W0a baseline.
- [resume-1] Committed (commit `84b78a0`): `WIP(oq-2): bundling + import-rewrite — collectStdlibSpecifiers, bundleStdlibForRun, rewriteStdlibImports`.

### Smoke-test partial result (resume-1)
- `bun -e 'await import("./examples/23-trucking-dispatch/dist/app.server.js")'` no longer fails with `Cannot find package 'scrml:auth'`. **PRIMARY OQ-2 BUG FIXED.**
- New error surfaced: `Cannot find module './models/auth.scrml'` — emitted JS imports a user-authored `.scrml` file by source extension. This is a **separate, pre-existing codegen issue** unrelated to OQ-2: `rewriteRelativeImportPaths` only handles `.js` imports per its docstring; codegen never rewrites `.scrml` imports to `.server.js`/`.js`. Documenting and surfacing per the brief's instructions ("don't fix").

### Step 6 — Tests
- [resume-1 step 6] Wrote `compiler/tests/integration/oq-2-stdlib-runtime-resolution.test.js` — 9 tests across 4 sections covering: helper unit tests, end-to-end smoke (compile → bundle → rewrite → `await import()` succeeds in Bun), nested-output W0a interaction (`../../_scrml/...` for sub/dir files), unbundled-name loud-failure preservation.
- [resume-1 step 6] Targeted run: 9p / 0f / 30 expect calls / 154ms.
- [resume-1 step 6] Full-suite: 8,222p / 0f / 40 skip / 387 files / 14.04s. Zero regressions; +9 = exactly the new tests.
- [resume-1 step 6] Committed (commit `56c1082`): `WIP(oq-2): regression test — stdlib bundling + import rewrite + Bun loadability`.

### Step 7 — Smoke-test the dispatch app
- [resume-1 step 7] `rm -rf examples/23-trucking-dispatch/dist && bun ./compiler/src/cli.js compile examples/23-trucking-dispatch/` → "Compiled 32 files in 1337ms → dist/" (13 warnings, all pre-existing W-PROGRAM-001 / W-AUTH-001).
- [resume-1 step 7] `dist/_scrml/{auth,crypto,store}.js` all bundled.
- [resume-1 step 7] `grep '^import' dist/**/*.{server,client}.js` shows: top-level files use `./_scrml/X.js`, nested-page files use `../../_scrml/X.js`. Zero remaining `scrml:` specifiers in emitted JS.
- [resume-1 step 7] Per-file `await import()` smoke test:
  - **OQ-2 acid test PASS**: zero `Cannot find package 'scrml:*'` errors.
  - All 21 `*.server.js` files now fail with `Cannot find module './*.scrml'` instead — that is the **separate, pre-existing** codegen `.scrml`-import bug confirmed via head-to-head check against pre-W0a main HEAD (compiled the same dispatch app on main's `compiler/src/api.js`; `.scrml` imports also unrewritten there). My changes do not introduce or affect this bug.
- [resume-1 step 7] Smoke-test summary: OQ-2's M16-stdlib half = **resolved**. Class A (4 files originally failing with Cannot-find-package) all pass the stdlib-import phase post-fix. Class B (the "Unexpected ./;" SQL boundary failures) is unchanged — still out of scope per repro.md / diagnosis.md.

### Step 8 — FRICTION + final commit
- [resume-1 step 8] Updated `examples/23-trucking-dispatch/FRICTION.md`:
  - Reworded standing caveat at end-of-file (line ~2013): F-COMPONENT-001 is now the only outstanding compiler-level blocker; both F-COMPILE-001 and OQ-2 are resolved; called out the pre-existing `.scrml`-import codegen gap surfaced during smoke-test as separate from OQ-2.
  - Appended new section: **"OQ-2 — `scrml:NAME` stdlib imports unresolvable at runtime (P0) — RESOLVED 2026-04-30 (S51, W0b)"** with full pre-fix/post-fix audit, fix-shape rationale (hand-written shims vs. truly-compiled stdlib), commit hashes, and test-coverage path.
- [resume-1 step 8] Final commit (next).
