# scrmlTS — Master List

**Purpose:** Live inventory of what exists in scrmlTS. Current truth only. Anything historical or aspirational lives in scrml-support.

**Last updated:** 2026-04-10 (S86 — initial split from scrml8)
**Format:** `[x][x]` = complete + verified, `[x][ ]` = exists/in progress, `[ ][ ]` = not started

---

## A. Compiler core (verified working S86)

**Entry:** `compiler/src/cli.js` (bin: `scrml`)
**Tests:** 5,542 pass, 2 skip, 0 fail (verified in new location)
**Compile time:** ~20ms single file, ~73ms TodoMVC
**Self-host flag:** `--self-host` loads 11 scrml modules from `compiler/self-host/`

### Pipeline stages (all working)

- [x][x] BS (Block Splitter): `compiler/src/block-splitter.js`
- [x][x] TAB (Tokenizer): `compiler/src/tokenizer.ts` + AST Builder: `compiler/src/ast-builder.js`
- [x][x] BPP (Body Pre-Parser): `compiler/src/codegen/compat/parser-workarounds.js`
- [x][x] PA (Protect Analyzer): `compiler/src/protect-analyzer.ts`
- [x][x] RI (Route Inference): `compiler/src/route-inference.ts`
- [x][x] TS (Type System): `compiler/src/type-system.ts`
- [x][x] DG (Dependency Graph): `compiler/src/dependency-graph.ts`
- [x][x] CG (Code Generator): `compiler/src/codegen/` (36 files, ~14,135 LOC)
- [x][x] CE (Component Expander): `compiler/src/component-expander.ts`
- [x][x] ME (Meta Eval): `compiler/src/meta-eval.ts`
- [x][x] MC (Meta Checker): `compiler/src/meta-checker.ts`

### Other compiler src

`api.js`, `code-generator.js`, `expression-parser.ts`, `html-elements.js`, `module-resolver.js`, `runtime-template.js`, `schema-differ.js`, `serve-client.js`, `tailwind-classes.js`, `chart-utils.js`, `types/`, `index.js`

**Total compiler src:** ~24,739 LOC (codegen: ~14,135 LOC)

---

## B. CLI commands (all verified)

- [x][x] `scrml compile <file|dir>` — compile
- [x][x] `scrml init [dir]` — scaffold project
- [x][x] `scrml dev <file|dir>` — compile + watch + serve (`compiler/src/commands/dev.js`)
- [x][x] `scrml build <dir>` — production build (`compiler/src/commands/build.js`)
- [x][x] `scrml serve` — persistent compiler server (`compiler/src/commands/serve.js`)
- [x][x] `scrml compile --self-host` — use self-hosted modules

---

## C. Self-host modules (reference copies)

`compiler/self-host/` contains the 11 .scrml modules that bootstrap the compiler. The **primary** working copy lives in `~/scrmlMaster/scrml/`. The copies here are what the compiler builds against for `--self-host`.

| File | LOC | Purpose |
|---|---|---|
| bs.scrml | 894 | Block splitter |
| tab.scrml | 1,115 | Tokenizer |
| ast.scrml | 3,551 | AST builder |
| bpp.scrml | 230 | Body pre-parser |
| pa.scrml | 444 | Protect analyzer |
| ri.scrml | 984 | Route inference |
| ts.scrml | 2,570 | Type system |
| dg.scrml | 1,052 | Dependency graph |
| cg.scrml | 21 | Codegen stub |
| module-resolver.scrml | 305 | Module resolver |
| meta-checker.scrml | 882 | Meta checker |

**Total:** 12,048 LOC. L2 + L3 bootstrap complete.

---

## D. Spec + authoritative docs

- [x][x] `compiler/SPEC.md` — 18,753 lines, 53 sections. AUTHORITATIVE.
- [x][x] `compiler/SPEC-INDEX.md` — quick-lookup with line ranges.
- [x][x] `compiler/PIPELINE.md` — 1,569 lines. Stage contracts.

**All other spec history (drafts, updates, amendments) lives in `scrml-support/archive/spec-drafts/`**.

---

## E. Examples (14 files — verified S86)

13/14 compile clean. Locations at `examples/`:

- [x][x] 01-hello, 02-counter, 03-contact-book, 04-live-search, 05-multi-step-form
- [x][x] 06-kanban-board, 07-admin-dashboard, 08-chat, 09-error-handling, 10-inline-tests
- [x][x] 11-meta-programming, 14-mario-state-machine
- [x][x] 13-worker — **FIXED** (ex13-route-warning-fix: E-ROUTE-001 severity + worker body suppression)
- [ ][ ] 12-snippets-slots — E-COMPONENT-020 (snippet expansion bug)

---

## F. Samples

- [x][x] `samples/compilation-tests/` — 275 .scrml test files

---

## G. Test infrastructure

- [x][x] `compiler/tests/unit/` — 147 files
- [x][x] `compiler/tests/integration/` — 2 files
- [x][x] `compiler/tests/self-host/` — 4 files
- [x][x] `compiler/tests/conformance/` — 2 files
- [x][x] `compiler/tests/browser/` — 11 files (happy-dom)
- [x][x] `compiler/tests/commands/` — 2 files
- **Total:** 5,542 pass, 2 skip, 0 fail

---

## H. Editor support

**VS Code:** `editors/vscode/`
- [x][x] `package.json` — extension manifest
- [x][x] `syntaxes/scrml.tmLanguage.json` — 438 lines TextMate grammar
- [x][x] `src/extension.ts` — LSP client
- [x][x] `language-configuration.json`
- [x][x] `out/extension.js` — built S2 (run `cd editors/vscode && bunx tsc`)

**NeoVim:** `editors/neovim/`
- [x][x] `scrml.vim`, `scrml.lua`, tree-sitter queries in `queries/scrml/`

**LSP:** `lsp/server.js` — 966 lines. Script: `bun run lsp/server.js --stdio`

---

## I. Stdlib (13 modules — Wave 1)

`stdlib/` — auth (3), compiler (17), crypto (1), data (3), format (1), fs (1), http (1), path (1), process (1), router (1), store (2), test (1), time (1)

---

## J. Runtime

- [x][x] `dist/scrml-runtime.js` — 452 lines

---

## K. Benchmarks

`benchmarks/`
- [x][x] `RESULTS.md` — 129 lines (Puppeteer Chrome benchmarks)
- [x][x] `runtime-benchmark.js` + `runtime-results.json`
- [x][x] `bench-scrml.js`
- [x][x] `browser/` (Puppeteer)
- [x][x] `todomvc/` — scrml TodoMVC
- [x][x] `todomvc-react/`, `todomvc-svelte/`, `todomvc-vue/` — framework comparisons
- [x][x] `fullstack-scrml/`, `fullstack-react/` — full-stack comparisons

**Note:** framework comparison `node_modules/` removed for repo slimness. Run `bun install` in each to restore.

**Results:** scrml wins 5/10 runtime ops. 10-15x faster builds. 5.2x smaller JS.

---

## L. Scripts

`scripts/` — 8 utility scripts (trimmed S2 from 24; 16 round/session/section-specific patches and broken sample-verifiers archived to `scrml-support/archive/scripts/scrmlTS-2026-04-10/`):
- `update-spec-index.sh` — regen `compiler/SPEC-INDEX.md`
- `assemble-spec.sh` — spec assembly
- `bundle-size-benchmark.js` — bundle-size measurement
- `generate-api-reference.js` — API doc generation
- `verify-js.js` — generic `node --check` wrapper
- `migrate-closers.js` — codemod with `--dry-run`
- `pull-worktree.sh` — agent worktree workflow helper
- `rebuild-bs-dist.ts` — rebuild `compiler/dist/self-host/bs.js` from `bs.scrml`

---

## M. Known bugs + issues

1. Example 12 — E-COMPONENT-020 (snippet expansion for `Card`)
2. ~~Example 13 — E-ROUTE-001 (computed array access in worker)~~ — **FIXED** (ex13-route-warning-fix: added `severity:"warning"` to E-ROUTE-001 + suppressed inside `<program name="...">` worker bodies)
3. ~~BUG-R15-005: `\n` literal in emit() HTML~~ — **FIXED** (meta-fix-batch S2 — verified already resolved by earlier S52 `normalizeEmitCode`)
4. ~~E-META-001 false positives (destructuring, rest params, default params)~~ — **FIXED** (meta-fix-batch S2 — destructuring/rest-params verified clean; for-of fixed via `serializeNode` `for-stmt` case)
5. 10 skipped tests (2 callback-props bind codegen, others minor)
6. E-SYNTAX-043 partial (complex expressions may pass through)
7. WebSocket CLI bugs — 6 in dev.js/build.js blocking `<channel>` runtime
8. Ghost error patterns — 10 remaining
9. ~~False E-DG-002 for @vars consumed inside runtime `^{}` blocks~~ — **FIXED** (meta-fix-batch S2)
10. ~~`reflect(variableName)` inside callback params rewritten to string literal~~ — **FIXED** (meta-fix-batch S2)

**Fix details + rationale for each:** `scrml-support/docs/` (look up by bug ID or topic).

---

## N. Open work (current truth, prioritized)

### P1 — Language Completeness
- [ ][ ] **DQ-12** — `is not`/`is some` on compound expressions (§42.2.4). Parser change needed.
- [x][ ] **DQ-7** — CSS `#{}` scoping strategy. **DECIDED S2 2026-04-10: native CSS `@scope` (Approach B)**. Implementation pending: update `emit-css.ts` + `emit-html.ts` + SS24.6 spec text. See `scrml-support/design-insights.md` for rationale. Prerequisite: fix `tokenizeCSS` brace-stripping bug first.
- [x][x] **DQ-11** — WebSocket / server-push. Spec complete (§38). **CLI implementation complete S2 2026-04-10 (websocket-cli-batch)** — 6 bugs fixed in dev.js/build.js/emit-channel.ts, channel runtime unblocked end-to-end.
- [ ][ ] **Lin spec gaps** — `read lin`, lin params v2, loop-body carve-out, `~` double-obligation errors.

### P2 — DX
- [x][ ] Ghost error mitigation — 10 patterns pending
- [ ][ ] Async loading stdlib helpers (RemoteData — deferred)
- [ ][ ] Async loading sugar (Approach E — deferred)
- [ ][ ] Fix example 12 (example 13 now fixed)

### P3 — Self-host completion
- [ ][ ] CE + ME self-host (not yet ported)
- [ ][ ] Idiomification: ts.scrml (2,570), ast.scrml (3,539) — ~6,109 lines

### P5 — Architectural refactors
- [x][x] rewrite.ts visitor pattern (done S80)
- [ ][ ] TS migrations: ast-builder, block-splitter (tokenizer done)
- [ ][ ] Codegen IR (typed instruction nodes)

### P6 — Research (deferred to post-beta)
- Package manager alternative, scrml-native import system, sidecars, WASM, `?{}` multi-db, WASM sigils, `use foreign:`, refinement types, var reuse optimization.

---

## O. Pending cleanup (post-split)

- [x][x] **Non-compliance audit** (S2 2026-04-10) — 13 docs reviewed, 3 dereffed to `scrml-support/archive/`, 3 updated in place, 1 deleted (`shared/` fiction), 6 kept. See hand-off-2.
- [x][x] **Cold project map** (S2 2026-04-10) — re-enabled with scope discipline (`node_modules`, `dist`, framework-comparison benchmarks excluded; master-list as spine). 10 maps + INDEX + non-compliance written to `.claude/maps/`. ~30 file reads, sustainable. Zero non-compliance findings (S2 audit cleared everything).
- [x][x] **Verify VS Code extension builds** (S2 2026-04-10) — added `@types/node` to devDeps, `bun install` + `bunx tsc` clean, produces `out/extension.js` (83 lines, `node --check` OK). Added `editors/vscode/{out,bun.lock}` to root `.gitignore`.
- [x][x] **Install git hooks** (S2 2026-04-10) — copied pre-commit, post-commit, pre-push from scrml8 unchanged; all targets (`compiler/src/cli.js`, `compiler/src/index.js`, `benchmarks/todomvc/app.scrml`) exist in this repo. Hooks fire on next compiler commit. **Caveat:** `.git/hooks/` is not versioned — fresh clones won't have them. Consider mirroring into `scripts/git-hooks/` with an install script.

---

## P. Cross-repo references

- **scrml-support** — deep-dives, ADRs, gauntlet reports, user-voice, design insights, historical spec drafts, friction audits
- **scrml** — primary working copy of self-host .scrml modules (idiomification happens there)
- **giti** — collaboration platform + its spec
- **6nz** — editor + z-motion spec
- **scrml8** — frozen reference archive (do not edit)
