# scrmlTS — Master List

**Purpose:** Live inventory of what exists in scrmlTS. Current truth only. Anything historical or aspirational lives in scrml-support.

**Last updated:** 2026-04-14 (S16 — SQL batching spec-drafted: deep-dive + debate + reviewer + §8.9/8.10/8.11 + §19.10.5 draft awaiting sign-off)
**Format:** `[x][x]` = complete + verified, `[x][ ]` = exists/in progress, `[ ][ ]` = not started

---

## A. Compiler core (verified working S14)

**Entry:** `compiler/src/cli.js` (bin: `scrml`)
**Tests:** 6,153 pass, 14 fail (S14 2026-04-14) — 100% of lift-exprs now structured, match-as-expr live, all string-field consumers ExprNode-first
**Compile time:** ~44ms TodoMVC (post-ExprNode parsing overhead)
**Self-host flag:** `--self-host` loads 11 scrml modules from `compiler/self-host/`

### Pipeline stages (all working)

- [x][x] BS (Block Splitter): `compiler/src/block-splitter.js`
- [x][x] TAB (Tokenizer): `compiler/src/tokenizer.ts` + AST Builder: `compiler/src/ast-builder.js`
- [x][x] BPP (Body Pre-Parser): `compiler/src/codegen/compat/parser-workarounds.js`
- [x][x] PA (Protect Analyzer): `compiler/src/protect-analyzer.ts`
- [x][x] RI (Route Inference): `compiler/src/route-inference.ts`
- [x][x] TS (Type System): `compiler/src/type-system.ts`
- [x][x] DG (Dependency Graph): `compiler/src/dependency-graph.ts`
- [x][x] CG (Code Generator): `compiler/src/codegen/` (37 files, ~14,912 LOC)
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

**14/14 compile clean, 14/14 puppeteer smoke pass** (S12 2026-04-13). 7 examples on Tailwind (01, 02, 04, 09, 10, 13, 14), 7 on `#{}` CSS.

- [x][x] 01-hello (Tailwind), 02-counter (Tailwind, reactive), 04-live-search (Tailwind, reactive)
- [x][x] 10-inline-tests (Tailwind), 14-mario-state-machine (Tailwind, fully interactive — machine, derived, match, if=)
- [x][ ] 05-multi-step-form — step components expand, onclick wiring fix landed, interactive testing incomplete
- [x][ ] 06-kanban-board — compiles, renders, call-ref handler fixed (S13), needs interactive verification
- [x][ ] 03-contact-book, 07-admin-dashboard, 08-chat — need running server
- [x][ ] 09-error-handling (Tailwind), 11-meta-programming, 12-snippets-slots, 13-worker (Tailwind) — compile clean, partial interactivity

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
- **Total:** 6,130 pass, 15 fail (S13 2026-04-13). Puppeteer: `examples/test-examples.js` 14/14 pass.
- **Pretest:** `scripts/compile-test-samples.sh` compiles 12 browser test samples (run via `bun run pretest`)
- **Skipped:** `browser-reactive-arrays.test.js` — hangs in happy-dom (Puppeteer passes)
- **15 remaining:** 8 TodoMVC happy-dom, 2 self-host, 2 type-system, 1 if-as-expr, 1 ex05, 1 reactive-arrays codegen

---

## H. Editor support

**VS Code:** `editors/vscode/`
- [x][x] `package.json` — extension manifest
- [x][x] `syntaxes/scrml.tmLanguage.json` — 438 lines TextMate grammar
- [x][x] `src/extension.ts` — LSP client
- [x][x] `language-configuration.json`
- [x][x] `out/extension.js` — built S2 (run `cd editors/vscode && bunx tsc`)

**NeoVim:** `editors/neovim/`
- [x][x] `scrml.vim`, `scrml.lua`, tree-sitter highlights query at `queries/scrml/highlights.scm`
- [x][x] **User's local kickstart nvim config** wired up S2 2026-04-10: `~/.config/nvim/lua/custom/plugins/scrml.lua` (filetype + LSP autocmd, absolute path to `lsp/server.js`), `~/.config/nvim/after/syntax/scrml.vim` (minimal highlighting), `{ import = 'custom.plugins' }` uncommented in `init.lua`. Smoke-tested headless: `ft=scrml`, `syn=scrml`, 1 LSP client attached.

**LSP:** `lsp/server.js` — 966 lines. Script: `bun run lsp/server.js --stdio`

---

## I. Stdlib (13 modules — Wave 1)

`stdlib/` — auth (3), compiler (17), crypto (1), data (3), format (1), fs (1), http (1), path (1), process (1), router (1), store (2), test (1), time (1)

---

## J. Runtime

- [x][x] `compiler/src/runtime-template.js` — source of truth. S12: added `_scrml_lift_target` routing, `_scrml_reactive_get` → derived cache bridging, dirty propagation triggers effects for derived nodes.

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

1. ~~Example 12 — E-COMPONENT-020 (snippet expansion for `Card`)~~ — **FIXED** (ex12-component-normalize S2 — `normalizeTokenizedRaw` missed internal bare closers `</>` + open-tag trailing whitespace; multi-line component bodies now parse correctly)
2. ~~Example 13 — E-ROUTE-001 (computed array access in worker)~~ — **FIXED** (ex13-route-warning-fix: added `severity:"warning"` to E-ROUTE-001 + suppressed inside `<program name="...">` worker bodies)
3. ~~BUG-R15-005: `\n` literal in emit() HTML~~ — **FIXED** (meta-fix-batch S2 — verified already resolved by earlier S52 `normalizeEmitCode`)
4. ~~E-META-001 false positives (destructuring, rest params, default params)~~ — **FIXED** (meta-fix-batch S2 — destructuring/rest-params verified clean; for-of fixed via `serializeNode` `for-stmt` case)
5. 2 skipped tests — both in `compiler/tests/unit/callback-props.test.js` §I (lines 436, 440). Blocked on lack of inline-source compile API (`compileScrml` takes file paths only). Unblock path: either (a) add `compileScrmlSource({source, virtualPath})` sibling, or (b) lightweight temp-file harness inside the test. Audited S2 2026-04-10 — prior "10 skipped" claim was stale.
6. ~~E-SYNTAX-043 partial (complex expressions may pass through)~~ — **NON-ISSUE** (S6 2026-04-12 audit: all realistic presence guard patterns `(user) =>`, `(user.name) =>`, `(@user) =>`, `(a, b) =>` are correctly caught. Only keywords-as-variable-names like `(fn) =>` slip through, which is not a real-world scenario. The tokenizer classifies `fn` as KEYWORD, and `isOldPresenceGuardPattern` only accepts IDENT/AT_IDENT — correct behavior since keywords aren't valid variable names.)
7. ~~WebSocket CLI bugs — 6 in dev.js/build.js blocking `<channel>` runtime~~ — **FIXED** (websocket-cli-batch S2 — was already marked fixed in §P1 DQ-11 but this entry was missed during S2 cleanup)
8. ~~Ghost error patterns — 10 remaining~~ — **MITIGATED** (ghost-lint-prepass S2 — new lint pre-pass with 10 W-LINT-* patterns catches React/Vue/Svelte ghost syntax before the main compile)
9. ~~False E-DG-002 for @vars consumed inside runtime `^{}` blocks~~ — **FIXED** (meta-fix-batch S2)
10. ~~`reflect(variableName)` inside callback params rewritten to string literal~~ — **FIXED** (meta-fix-batch S2)

**S12→S13 issues (resolved via deep-dives + debates):**

11. ~~**Lift attribute `${expr}` splitting**~~ — **FIXED S13** (`a1c4300`). call-ref handler in `emitCreateElementFromMarkup` was discarding function arguments entirely. Fixed handler + added paren-space normalization to re-parse path + exhaustiveness guard. Approach C (structured LiftExpr AST, eliminate re-parse) queued as future refactor.
12. ~~**Parser: statements after match**~~ — **FIXED S13** (`a1c4300`). Root cause was NOT brace-depth — `lastEndsValue` in ASI check was missing `}`, `true`, `false`, `null`, `undefined`, `this`. Added trailing-content guard to `parseExprToNode`. Structured match-as-expression (Fix 1b) queued.
13. ~~**Tilde-decl DG false warnings**~~ — **FIXED S13** (`a1c4300`). Added `collectAllTildeDecls`, scan if-stmt conditions in `walkBodyForReactiveRefs` and `collectReadsAndCalls`.
14. ~~**Browser test harness**~~ — **FIXED S13** (`96a46d5`). 132 of 147 failures were missing compiled samples (added pretest script) or hanging test (reactive-arrays skipped). 15 pre-existing failures remain.

**Fix details + rationale for each:** `scrml-support/docs/` (look up by bug ID or topic).

---

## N. Open work (current truth, prioritized)

### P1 — Language Completeness
- [x][x] **DQ-12 (Phase A)** — `is not`/`is some` on **parenthesized** compound expressions. **IMPLEMENTED S2 2026-04-10 (dq12-phase-a)** — `_rewriteParenthesizedIsOp` in `rewrite.ts`, temp-var single-evaluation per §42.2.4. Phase B (bare compound form, no parens) deferred as future work.
- [x][x] **DQ-7** — CSS `#{}` scoping strategy. **DECIDED + IMPLEMENTED S2 2026-04-10 (dq7-css-scope)** — native CSS `@scope` (Approach B). `emit-css.ts` + `emit-html.ts` + SPEC §9.1 + §25.6 rewrite landed. `data-scrml` attribute, donut scope, flat-declaration `#{}` → inline style.
- [x][x] **DQ-11** — WebSocket / server-push. Spec complete (§38). **CLI implementation complete S2 2026-04-10 (websocket-cli-batch)** — 6 bugs fixed in dev.js/build.js/emit-channel.ts, channel runtime unblocked end-to-end.
- [x][x] **Lin spec gaps — §35.2.1 working E2E as of S4.** Batch A ✅ S2; Batch B ✅ S3 (§35.2.1 lin-params parser + type-system, merge `90f1630`); Batch C Step 1 ✅ S4 (TS-G wiring fix, merge `503f5b9`); Batch C Step 2 PARKED in favor of structured expression AST migration. **§35.2.1 lin function parameters now work end-to-end for the first time** as of Phase 2 Slice 1+2 (Slice 1 merged S4 `9151f1a`, Slice 2 + ast-builder gap closures merged S4 `45208c6`). See P5 expression AST migration for ongoing work.

### P2 — DX
- [x][x] **Ghost error mitigation** — lint pre-pass landed S2 (ghost-lint-prepass, 10 W-LINT-* patterns, +71 tests)
- [ ][ ] Async loading stdlib helpers (RemoteData — deferred)
- [ ][ ] Async loading sugar (Approach E — deferred)
- [x][x] **Fix example 12** — ex12-component-normalize S2. Examples now 14/14 clean.
- [x][x] **Library mode type declarations** — R18 #2 verified fixed S2 (was already resolved by prior work; regression tests + sample added via library-mode-types batch)

### P3 — Self-host completion
- [ ][ ] CE + ME self-host (not yet ported)
- [ ][ ] Idiomification: ts.scrml (2,570), ast.scrml (3,539) — ~6,109 lines

### P4 — SQL Batching (spec-drafted S16 2026-04-14, awaiting user sign-off)

Compiler-level SQL batching in two tiers. Pipeline addition + §8 extensions + §19.10 amendment.

- [x][ ] **Deep-dive** — `scrml-support/docs/deep-dives/sql-batching-2026-04-14.md` (10 design forks, 3 clusters, prior-art table for DataLoader/Prisma/Drizzle/Hibernate/Ecto/EdgeDB/Hasura/ActiveRecord)
- [x][ ] **Debate** — `debate-sql-batching-2026-04-14.md` + `design-insight-sql-batching-2026-04-14.md`. Winning positions: F1.A (Stage 7.5) · F2.A (syntactic + D-BATCH-001) · F3.A (Map lookup) · F4.A (implicit per-handler tx, `!`-only) · F5.C (mode-split errors) · F6.A (Map preserves iteration order) · F7.A (read-only v1) · F8.A+C (`.nobatch()` single opt-out — pragma dropped per reviewer) · F9.C (coalesce mount reads, writes 1:1) · F10.B (re-run E-LIFT-001 post-rewrite)
- [x][ ] **Reviewer + boundary-analyst reports** — reviewer BLOCK on F4.A resolved by bounding implicit tx to `!` handlers + new §19.10.5 + E-BATCH-001 composition error. Boundary analyst confirmed no classification changes, flagged `__mountHydrate` synthetic route aggregator requirement for F9.C.
- [x][ ] **Spec draft** — `scrml-support/archive/spec-drafts/spec-draft-sql-batching-2026-04-14.md`. Contains new §8.9 (per-handler coalescing), §8.10 (N+1 loop hoist), §8.11 (mount hydration), §19.10.5 amendment, new PIPELINE Stage 7.5 Batch Planner, new errors E-BATCH-001/002 + E-PROTECT-003 + D-BATCH-001. Prerequisite: resolve `.first()` vs `.get()` naming in §8.3.
- [x][x] **User sign-off on spec draft** — S16 2026-04-14.
- [x][x] **§8.3 `.first()` / `.get()` reconciliation** — `.get()` wins. 17 occurrences replaced across SPEC. S16 2026-04-14.
- [x][x] **Spec land** — §8.9/8.10/8.11, §19.10.5, new errors E-BATCH-001/002 + E-PROTECT-003 + D-BATCH-001 + W-BATCH-001 added to `compiler/SPEC.md`. SPEC-INDEX regenerated. S16 2026-04-14. Tests clean (6153/14, no regression).
- [x][x] **PIPELINE edit** — Stage 7.5 Batch Planner with `BatchPlan` / `CoalescingGroup` / `LoopHoist` contract + determinism/idempotency/boundary invariants. S16 2026-04-14.
- [ ][ ] **Tier 1 impl** — per-handler coalescing, `.nobatch()` chain method, E-BATCH-001 composition check, isolated benchmark.
- [ ][ ] **Tier 2 impl** — loop hoisting (`.get()`/`.all()` only), D-BATCH-001 diagnostic, `rowCacheColumns` × `protect` verification.
- [ ][ ] **F9.C mount-hydration** — `__mountHydrate` synthetic route aggregator in boundary pass + fetch-stub demux.
- [ ][ ] **README changelog entry** — after both tiers land + benchmarked.

**Deferred-complexity log (post-v1):** Tier-2 writes × `<machine>` transitions (§51); Tier-2 writes × `server @var` optimistic rollback (§52.4.2); tuple-WHERE key inference; F9 revisit inside explicit `transaction { }`; `--show-batch-plan` runtime observability.

### P5 — Architectural refactors
- [x][x] rewrite.ts visitor pattern (done S80)
- [ ][ ] TS migrations: ast-builder, block-splitter (tokenizer done)
- [ ][ ] Codegen IR (typed instruction nodes)
- [x][ ] **🏗 STRUCTURED EXPRESSION AST MIGRATION (multi-phase, in progress S4 2026-04-11)** — replace string-form expression fields (`init`, `expr`, `condition`, etc.) with structured `ExprNode` trees throughout the compiler. Root cause fix for lin enforcement, tilde precision, dep-graph edges, protect analyzer scoping, LSP identifier features, error span precision, and spec tightness. Design doc: `scrml-support/docs/deep-dives/expression-ast-phase-0-design-2026-04-11.md` (2028 lines, all 10 OQs decided).
  - **Phase 0** ✅ S4 — design ratified, OQs answered (notably: lin keyword promotion, lin-decl emission in Phase 2, idempotency invariant)
  - **Phase 1** ✅ S4 (merge `e43b7a2`) — `ExprNode` discriminated union in `types/ast.ts` (+392 LOC), `parseExprToNode`/`esTreeToExprNode`/`emitStringFromTree` in `expression-parser.ts` (+789 LOC, builds on existing Acorn parser), parallel ExprNode fields populated by `ast-builder.js`. 84 new unit tests.
  - **Phase 1.5** ✅ S4 (in `e43b7a2`) — swapped round-trip invariant from string-equality (broken: token-joined vs compact JS) to idempotency: `parse(emit(parse(x))) deep-equals parse(x)`. `deepEqualExprNode` helper added. Audit found only 3 escape hatches in 14-file corpus (3.66%, all C-style for loops in `13-worker.scrml`).
  - **Phase 2 Slice 1** ✅ S4 (merge `9151f1a`) — `lin` promoted to KEYWORDS in `tokenizer.ts`, `lin-decl` node emission added to both `ast-builder.js` parse loops, `case "lin-decl"` codegen case added to `emit-logic.ts` (was previously dropped silently). 13 new integration tests.
  - **Phase 2 Slice 2** ✅ S4 (merge `45208c6`) — `checkLinear` migrated to walk `ExprNode` trees via `forEachIdentInExprNode` (in `expression-parser.ts`) and `scanNodeExprNodesForLin` (in `type-system.ts`). **§35.2.1 lin function parameters work E2E for the first time** (the headline win for the entire migration). 9 new e2e scenarios pass (declare/consume, double-consume → E-LIN-002, never-consumed → E-LIN-001, branch asymmetry → E-LIN-003, lin-params, shadowing across function-decl scopes, lambda capture conservative). Two `ast-builder.js` `bare-expr` `exprNode:` gap closures (lines 2009 and 3962) included. Pass 2 string-scan fallback retained as a documented staging pattern until Slice 3 fixes `collectExpr` — primary path is the structured ExprNode walk; fallback is bounded with a precise removal condition.
  - **Phase 2 Slice 3** ✅ S5 — `collectExpr` newline-boundary fix. One-line deletion of redundant `lastTok !== startTok` identity guard in `ast-builder.js:875` (+ self-host twin). All six symmetric decl forms (`lin`, `let`, `const`, `const @reactive`, `tilde`, `@debounced`) now respect newline-as-statement-boundary for declaration RHS. +11 regression tests.
  - **Phase 2 Slice 4** ✅ S6 — deleted Pass 2 string-scan fallback from `scanNodeExprNodesForLin` (-240 LOC). `extractAllIdentifiersFromString`, `extractIdentifiersExcludingLambdaBodies`, the Pass 2 block, and the `consumedThisNode` dedup set all removed. ExprNode walker is now the sole lin enforcement path.
  - **Phase 2 MustUseTracker migration** ✅ S6 — `scanNodeExpressions` now walks ExprNode parallel fields via `forEachIdentInExprNode`; `tilde-decl` case walks `initExpr` directly. String fallback retained for nodes without ExprNode fields (Phase 1 gaps).
  - **Phase 2 remaining passes** ✅ S6 — all semantic passes migrated: protect-analyzer, extractReactiveDeps, dependency-graph, meta-checker, error-effect callee extraction. All have ExprNode-first paths with string fallback.
  - **Phase 3 — codegen migration** ✅ S7–S11. `rewriteExpr(string)` → `emitExpr(ExprNode)` across ~14k LOC codegen. `emit-expr.ts` (290 LOC, all 19 ExprNode kinds), 45+ `emitExpr` call sites. S11: `emitExprField` helper consolidates 27 dual-path ternaries across 6 codegen files.
  - **Phase 3.5 — escape hatch elimination** ✅ S8. Drove 19.86% → 0% via `shouldSkipExprParse()` guard.
  - **Phase 4a — ExprNode wiring + HTML fragment reclassification** ✅ S9. Wired exprNode on 12 unwired bare-expr creation sites across all 3 parse loops (+119 gaps). Added `HtmlFragmentNode` type — reclassified 137 bare-expr HTML fragments as `kind:"html-fragment"` with `content` field. Updated emit-logic, emit-lift, type-system. Coverage **86.2% → 98.8%**.
  - **Phase 4b — error-arm block handlers** ✅ S9. `_parseHandlerExpr` strips braces before parsing. 4 gaps closed. Coverage **98.8% → 99.0% (1858/1876)**.
  - **Phase 4c — C-style for-loop verification** ✅ S9. All 11 C-style for-loops confirmed to have `cStyleParts` with ExprNodes. No code changes needed.
  - **Phase 4 remaining gaps:** 18 irreducible (11 C-style iterables covered by cStyleParts, 3 `.all()` SQL chains, 4 `.Variant :>` match patterns). No further coverage improvement possible.
  - **Phase 4d — drop string fields** 🏗 S10–S11. Slice 2+3 (S10): 7 ExprNode walker utilities + ~25 semantic pass sites migrated. Slice 4a (S11): `emitExprField` consolidates 27 dual-path ternaries. S11: 15 of 17 consumer files converted to ExprNode-first with string fallback. Remaining: component-expander.ts (needs structural matching), body-pre-parser.ts (inherently string-based). Final step: delete string fields from AST types.
  - **Phase 5 — self-host parity** port `compiler/self-host/ast.scrml` (3,551 lines).
  - All other P1/P2 work continues in parallel unless it touches expression fields.

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
