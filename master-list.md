# scrmlTS — Master List

**Purpose:** Live inventory of what exists in scrmlTS. Current truth only. Anything historical or aspirational lives in scrml-support.

**Last updated:** 2026-04-24 (S40 — Bun.SQL Phase 1 + Phase 2 (Postgres URI + driver helper), SPEC §8/§44 reconciliation, fix-lift-sql-chained-call (+parallel-sites), Phase 4d Step 8 .expr deletion + strict cleanup, LSP enhancement scoping deep-dive. **7,632 pass / 40 skip / 0 fail** across 358 files with 27,476 expects)
**Format:** `[x][x]` = complete + verified, `[x][ ]` = exists/in progress, `[ ][ ]` = not started

**Recent window (S35–S40):** S35–S37: 6 bugs fixed (Bugs 1/3/4/5/6 + mixed-case for-lift follow-on), SPEC §22.3 multi-`^{}` ratified via 5-expert debate, `emit.raw` classifier fix, Phase 0 `docs/external-js.md`. S38: string escape fix (Bug 1), return-after-ternary (Bug 3), for-lift wrapper (Bug 5), CSRF bootstrap GITI-010 (Option A), derived-reactive markup wiring (Bug 4), mixed-case hoist follow-on, multi-`^{}` debate + SPEC §22.3, `emit.raw` classifier. S39: boundary security deep-dive (3 approaches debated, Approach C won 54/60), closureCaptures + taint propagation in RI, transitive reactive deps BFS (Bug J), `_ensureBoundary` fail-safe (NC-4), Bug I name-mangle lookbehind, Bug H return-type match implicit return, Bug K sync-effect try/catch, GITI-009 import path rewrite, GITI-011 CSS at-rule tokenization, README giti link + broken 6nz links fixed, maps refresh, state-of-language audit. **S40:** Bun.SQL Phase 1 codegen migration (SPEC §44 alignment — `?{}` now emits `await _scrml_sql\`...\`` tagged-template; `_scrml_db`→`_scrml_sql` rename; `.prepare()`→E-SQL-006), SPEC §8/§44 reconciliation (§8 source-language vs §44 codegen target), fix-lift-sql-chained-call (`consumeSqlChainedCalls` helper in ast-builder.js + emit-logic.ts lift-expr `kind:"sql"` variant; latent `.get()` KEYWORD bug caught), Phase 4d Step 8 (BareExprNode.expr TS field deleted, hybrid `(any).expr` fallback in consumers), pipeline agent definition fixed (`scrml8`→`scrmlTS` paths).

---

## A. Compiler core (verified working S14)

**Entry:** `compiler/src/cli.js` (bin: `scrml`); published binary shebang at `compiler/bin/scrml.js` (S30 `8217dd9`)
**Tests:** **7,632 pass, 40 skip, 0 fail** (S40 2026-04-24) across 358 files with 27,476 expects. S38 resolved the 2 pre-existing self-host failures. S39 added 80 new tests. S40 added 70 net tests (Bun.SQL Phase 1 +3, SPEC reconciliation 0, fix-lift-sql +13, Phase 4d Step 8 0, parallel-sites +6, Phase 2 +47, strict-cleanup 0).
**Compile time:** ~44ms TodoMVC (post-ExprNode parsing overhead)
**Self-host flag:** `--self-host` loads 11 scrml modules from `compiler/self-host/` — deferred post-S30 public pivot

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

- [x][x] `compiler/SPEC.md` — 20,453 lines, 65 sections (§1–§54). AUTHORITATIVE. §22.3 multi-`^{}` added S38, §12.5 server return values added S37.
- [x][x] `compiler/SPEC-INDEX.md` — quick-lookup with line ranges.
- [x][x] `compiler/PIPELINE.md` — stage contracts. RI now includes closureCaptures + capture taint propagation (S39).

**All other spec history (drafts, updates, amendments) lives in `scrml-support/archive/spec-drafts/`**.

---

## E. Examples (14 files — verified S86)

**13/14 compile clean** (S39 2026-04-24 audit). Example 05 fails E-COMPONENT-020 (component forward-ref). 7 examples on Tailwind, 7 on `#{}` CSS.

- [x][x] 01-hello (Tailwind), 02-counter (Tailwind, reactive), 04-live-search (Tailwind, reactive)
- [x][x] 10-inline-tests (Tailwind), 14-mario-state-machine (Tailwind, fully interactive — machine, derived, match, if=)
- [x][ ] 05-multi-step-form — step components expand, onclick wiring fix landed, interactive testing incomplete
- [x][ ] 06-kanban-board — compiles, renders, call-ref handler fixed (S13), needs interactive verification
- [x][ ] 03-contact-book, 07-admin-dashboard, 08-chat — need running server
- [x][ ] 09-error-handling (Tailwind), 11-meta-programming, 12-snippets-slots, 13-worker (Tailwind) — compile clean, partial interactivity

---

## F. Samples

- [x][x] `samples/compilation-tests/` — 274 .scrml test files (250/274 compile clean, S39 audit). 24 failures mostly E-SCOPE-001 in gauntlet/meta samples. S20 gauntlet fixtures in 7 subdirs:
  - `gauntlet-s20-channels/`, `gauntlet-s20-error-test/`, `gauntlet-s20-error-ux/`, `gauntlet-s20-meta/`, `gauntlet-s20-sql/`, `gauntlet-s20-styles/`, `gauntlet-s20-validation/` (80 fixture files, S20/S21 regression corpus).

---

## G. Test infrastructure

- [x][x] `compiler/tests/unit/` — 175+ files (S34)
  - `gauntlet-s20/` — 5 files, 38 tests
  - `gauntlet-s22/` — 4 files, 45 tests
  - `gauntlet-s23/meta-bugs.test.js` — 9 tests
  - `gauntlet-s24/` — R14 bug tree
  - `gauntlet-s31/` — 11 tests for F5 bare-ident-referencing-reactive (`ebd4d1d`)
  - `transition-decl-block-split/ast/registry/scope/illegal/terminal/purity.test.js` — 7 files, 51 tests covering §54.3–6 state-local transitions end-to-end (S33)
  - S34 adopter-bug trees: 8 new/updated files covering all 11 S34 bugs (Bug E/A/D/B+F/C + GITI-001/002/003/004/005)
- [x][x] `compiler/tests/integration/` — 2 files
- [x][x] `compiler/tests/self-host/` — 4 files
- [x][x] `compiler/tests/conformance/s32-fn-state-machine/` — 4 files, 39 tests (9 green, 30 skipped with per-gate annotations)
- [x][x] `compiler/tests/browser/` — 11 files (happy-dom)
- [x][x] `compiler/tests/commands/` — 2 files
- **Total (S40 2026-04-24):** **7,632 pass, 40 skip, 0 fail** (27,476 expects across 358 test files).
- **Pretest:** `scripts/compile-test-samples.sh` compiles 12 browser test samples (run via `bun run pretest`)
- **Skipped:** 30 S32 conformance tests gated on parser/narrowing capabilities; `browser-reactive-arrays.test.js` (happy-dom hangs); 8 TodoMVC happy-dom tests (harness-IIFE-scope).
- **Previously failing (2):** self-host tokenizer parity + Bootstrap L3 — resolved S38.

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

- [x][x] `sql-batching/` — Tier 1+2 microbench (S17). ~2×/3×/4× at N=10/100/1000 on WAL `bun:sqlite`.

**Results:** scrml wins 6/10 runtime ops (S39 audit). 8-13x faster partial updates/swaps. ~10x faster builds. ~4x smaller JS.

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

**S31–S34 fixes (adopter-facing codegen + scope):**

15. ~~**F5 — missing `@` sigil silent break in markup interpolation**~~ — **FIXED S31** (`ebd4d1d`). `${count}` when `@count` was declared compiled to empty span + bare `count;` reference with zero diagnostics. Root cause: reactive-decl double-bind (bare + sigil form) silently absorbed bare-ident references in logic. Fix: reactive-kind check in `checkLogicExprIdents` + `visitAttr` with tailored "write `@name`" message. +11 tests in `gauntlet-s31/`.
16. ~~**F6 `init` in non-empty CWD + F10 README bun-link step**~~ — **FIXED S31** (`26df45d`). `init` now exits 1 with guidance when CWD is non-empty (dotfile-only accepts bare `init`). README Quick-start shows install → `bun link` → `init my-app`. +5 tests.
17. ~~**Bug E (6nz) — `^{}` meta-block Object.freeze missing commas**~~ — **FIXED S34** (`aa92070`). `Object.freeze({ get a() {...} get b() {...} })` produced `SyntaxError: Unexpected token 'get'`. Template joined properties with `\n` only. Fix: `props.join(",\n")` in `emit-logic.ts`. Same fix applied to `emitTypeRegistryLiteral`. +3 tests.
18. ~~**Bug A (6nz) — event arg dropped in bare-call handlers**~~ — **FIXED S34** (`eb86d31`). `onkeydown=handleKey()` emitted `function(event) { handleKey(); }` — event discarded. Per tutorial §1.5, bare-call event attrs receive event as first arg. Fix in `emit-event-wiring.ts`: `argsStr.length === 0 ? "event" : argsStr`. Tutorial snippet `docs/tutorial-snippets/01e-bindings.scrml` now compiles to the behavior it advertised. +2 new tests; 9 existing assertions updated.
19. ~~**Bug D (6nz) — name-mangle bleeds onto DOM methods**~~ — **FIXED S34** (`27ed6fe`). User fn `toggle()` → `_scrml_toggle_N` textually rewrote `classList.toggle(...)` → `classList._scrml_toggle_N(...)`. Any user fn sharing a name with a DOM method (toggle, forEach, add, remove, append, replace, ...) was silently corrupted. Fix: negative lookbehind `(?<!\.)` on the post-emit mangler regex in `emit-client.ts`. +3 tests in `mangle-property-access.test.js`.
20. ~~**GITI-002 — false E-SCOPE-001 on imports in server-fn bodies**~~ — **FIXED S34** (`881b411`). Codegen emitted imports correctly; scope-resolver `case "import-decl"` returned `tAsIs()` without binding names. Fix: bind each name from `importNode.names` as `kind: "import"` into scope chain. +6 tests in `import-scope-registration.test.js`.
21. ~~**Bug B + F (6nz) — `let x = A; if (c) x = B` emits shadow or derived-declare**~~ — **FIXED S34** (`70190a7`). Shared root: `IfOpts` and for/while helpers didn't accept/thread `declaredNames`, so nested bodies got fresh empty `declaredNames` and outer `let` bindings were invisible to the inner tilde-decl reassignment branch. Fix: widen signatures of `emitIfStmt`, `emitForStmt`, `emitWhileStmt` to accept `declaredNames`; thread through all nested `emitLogicBody` calls; dispatch in `emit-logic.ts` passes `opts.declaredNames`. +10 tests in `let-reassignment-in-branch.test.js`.
22. ~~**Bug C (6nz) — multi-statement arrow bodies dropped in call args**~~ — **FIXED S34** (`127d35a`). `arr.map((n, i) => { if (...) return n*2; return n })` compiled to `arr.map()` — entire callback lost. Two paired fixes: (a) `expression-parser.ts` CallExpression case now threads `rawSource` into arg recursion; arrow case slices its own raw via ESTree `node.start/end` with shape-validation fallback; (b) `rewrite.ts` adds `skipPresenceGuard` flag + `rewriteExprArrowBody` variant, consumed by `emitEscapeHatch` for Arrow/Function EscapeHatchExprs. +8 tests in `arrow-block-body-in-call-arg.test.js`.
23. ~~**GITI-005 — `${serverFn()}` in markup drops fetch result**~~ — **FIXED S34** (`e585dba`). Expression has no `@`-refs, so reactive-display-wiring loop skipped entirely; fetch fired at module top with result dropped. Fix: `buildServerFnNames(fnNameMap)` detection via `_scrml_(fetch|cps)_` prefix; when binding expression uses a server fn, emit async IIFE `(async () => { try { el.textContent = await (expr); } catch (_e) { el.textContent = ""; } })();`. Mixed `${@var + serverFn()}` also covered. +7 tests in `server-fn-markup-interpolation.test.js`.
24. ~~**GITI-003 — server-only imports leak to .client.js**~~ — **FIXED S34** (`e5f5b22`). `import { getGreeting } from './engine/probe.js'` used only inside server-fn bodies still wrote to `.client.js`, 500'ing browser load. Fix: post-emit prune pass in `emit-client.ts` drops imports with no client-body usage. Scoped to non-special paths (`scrml:`, `vendor:`, `.client.js` always preserved). `testMode` bypass for fixture-only unit tests.
25. ~~**GITI-004 — `lift <expr>` in server fn lowers to DOM code**~~ — **FIXED S34** (`e5f5b22`). Handler body emitted `_scrml_lift(() => document.createTextNode(...))` — uses `document` and client-only helper in Bun server context. Fix: added `boundary: "server" | "client"` to `EmitLogicOpts`; `case "lift-expr"` in server boundary emits `return <expr>;`; `emit-server.ts` threads `{ boundary: "server" }` through 6 fn-body emission sites (CPS/non-CPS × CSRF/non-CSRF × body-iter/last-stmt-return). +5 tests in `server-client-boundary.test.js`.
26. ~~**GITI-001 — `<request>` empty-URL fetch + unawaited `@data = serverFn()` Promise**~~ — **FIXED S34** (`d23fd54`). Two-part fix: (a) `emit-client.ts` post-emit rewrite wraps `_scrml_reactive_set("X", <stub>(ARGS))` in `(async () => _scrml_reactive_set("X", await <stub>(ARGS)))()` using a manual paren-depth walk (not regex) so nested args work; (b) `emit-reactive-wiring.ts` `emitRequestNode` returns early when no `url=` attribute. `<request url="...">` regression-guarded. +6 tests in `request-tag-and-server-fn-reactive.test.js`.

**All 11 S34 adopter bugs verified PASS by giti** 2026-04-20 in `handOffs/incoming/read/2026-04-20-1558-giti-*.md` (formalized follow-up: **GITI-006** — markup `${@var.path}` emits module-top bare read that throws on async-initialized reactives; pre-existing emission shape, low-priority per giti).

**S37–S38 fixes:**

27. ~~**Bug 1 (string escape)**~~ — **FIXED S38** (`41aa7c0`). 8 STRING-token re-quote sites double-escaped backslashes. Fix: `reemitJsStringLiteral`. +11 tests.
28. ~~**Bug 3 (return after ternary-const dropped)**~~ — **FIXED S38** (`3778d76`). `collectExpr` angle-bracket tracker bumped unconditionally on `<` after IDENT. Fix: value-position check. +11 tests.
29. ~~**Bug 5 (for-lift wrapper accumulation)**~~ — **FIXED S38** (`b37769c`). Outer `_scrml_effect` re-created wrapper div per mutation. +6 tests.
30. ~~**GITI-010 (CSRF bootstrap unbootstrappable)**~~ — **FIXED S38** (`40e162b`). 403 response didn't Set-Cookie. Fix: Option A (mint-on-403 + client retry). +9 tests.
31. ~~**Bug 4 (derived-reactive markup wiring)**~~ — **FIXED S38** (`adbc30c`). `collectReactiveVarNames` missed `reactive-derived-decl`. +8 tests.
32. ~~**Mixed-case for-lift hoist**~~ — **FIXED S38** (`8691f75`). Hoist for-lift setup outside effect for mixed keyed-reconcile + reactive reads. +11 tests.
33. ~~**`emit.raw` classifier bug**~~ — **FIXED S38** (`cfb1a14`). `testExprNode` missed MemberExpr callee `emit.raw`. +7 tests.

**S39 fixes:**

34. ~~**Bug I (name-mangling bleed)**~~ — **FIXED S39** (`6b3e63f`). Lookbehind `(?<!\.)` missed spaced member expressions. Fix: `(?<!\.\s*)`. +7 tests.
35. ~~**Bug J (markup-interp helper hides reactive)**~~ — **FIXED S39** (boundary security merge). `extractReactiveDeps` didn't recurse into function bodies. Fix: call-graph BFS. +15 tests (in boundary-security suite).
36. ~~**NC-4 (`_ensureBoundary` fail-open)**~~ — **FIXED S39** (boundary security merge). Graduated from silent console.warn to diagnostic fail-safe with `SCRML_STRICT_BOUNDARY=1` strict mode.
37. ~~**Bug H (function-rettype match drops return)**~~ — **FIXED S39** (`39782f0`). Missing `return` before match IIFE when function has return-type annotation. Fix: `hasReturnType` flag + implicit return. +5 tests.
38. ~~**Bug K (sync-effect throw halts caller)**~~ — **FIXED S39** (`686ffcd`). `_scrml_trigger` dispatched effects without try/catch. +5 tests.
39. ~~**GITI-009 (relative-import forwarding)**~~ — **FIXED S39** (`e926983`). Server JS emitted import paths verbatim from source. Fix: `rewriteRelativeImportPaths()` post-processor. +16 tests.
40. ~~**GITI-011 (CSS at-rule handling)**~~ — **FIXED S39** (`8b80138`). `tokenizeCSS()` had no `@` handler. Fix: `CSS_AT_RULE` token type + passthrough emission. +19 tests.

**S40 fixes:**

41. ~~**fix-lift-sql-chained-call (orphan `.method()` after lift+SQL)**~~ — **FIXED S40** (`15a0698`). `lift ?{`SELECT...`}.all()` in server functions emitted `return null; /* server-lift: non-expr form */` followed by orphan `.all()` chain. Pre-existing on bare `b3c83d3`; surfaced during Bun.SQL Phase 1 verification. Fix: `consumeSqlChainedCalls` helper in `ast-builder.js` (handles both IDENT and KEYWORD method names — `get` is KEYWORD, latent bug caught mid-impl); `emit-logic.ts::case "lift-expr"` extended to handle new `kind:"sql"` variant emitting `return await _scrml_sql\`...\`;`. Examples 03/07/08 now compile cleanly. +13 tests.
42. ~~**Bun.SQL Phase 1 — `?{}` codegen migration**~~ — **LANDED S40** (`6e21f76`..`cd8dea1`). SQLite branch now emits Bun.SQL tagged-template per SPEC §44 (was: `_scrml_db.query("...").all()`; now: `await _scrml_sql\`...\``). `.prepare()` now compiles to E-SQL-006 per §44.3. `_scrml_db`→`_scrml_sql` codegen identifier rename for grep clarity. Loop hoist (§8.10) batch path uses `sql.unsafe(rawSql, keys)` (Bun.SQL SQLite branch rejects array binding). Transaction envelopes use `sql.unsafe("BEGIN DEFERRED")`. +3 tests; 7 source files + 7 test files.
43. ~~**SPEC §8/§44 reconciliation**~~ — **LANDED S40** (`74881ea`). §8 now describes source-language `?{}` method API; §44 owns the codegen target. Stripped `bun:sqlite`-specific codegen claims from §8.2/§8.4/§8.5.1, replaced with §44 cross-refs. §8.5.2 rewritten as "Removed" with bulkInsert example; §8.6 added E-SQL-006 + E-SQL-007.
44. ~~**Phase 4d Step 8 — `BareExprNode.expr` TS field deletion**~~ — **LANDED S40** (`e478c99`). Deleted `expr?: string` from `BareExprNode` in `compiler/src/types/ast.ts`. Hybrid resolution: kept `(node as any).expr` fallback reads in 7 meta-checker sites to avoid breaking 30+ tests with synthetic fixtures missing `.exprNode`. 10 source files touched.
45. ~~**Phase 4d Step 8 strict cleanup**~~ — **LANDED S40** (`c9ebc78`). Strict-deleted all 7 `(node as any).expr` fallback reads in `meta-checker.ts`. Updated 13 synthetic test fixtures across 4 test files. Surfaced + fixed 2 latent bugs the hybrid was masking: (a) `bodyUsesCompileTimeApis` `compiler.*` detection (added `exprNodeContainsIdentNamed`); (b) `exprNodeContainsCompileTimeReflect` missing `assign` kind + wrong field names (`.operand`→`.argument`, `.test`→`.condition`).
46. ~~**fix-lift-sql-chained-call-parallel-sites**~~ — **LANDED S40** (`06c27f0`). Extracted `consumeSqlChainedCalls` helper, applied at all 4 BLOCK_REF chained-call sites in `ast-builder.js`. +6 tests.
47. ~~**Bun.SQL Phase 2 — Postgres driver resolution**~~ — **LANDED S40** (`9ef0ccb`). New `compiler/src/codegen/db-driver.ts` (151 LOC) for §44.2 URI resolution. `protect-analyzer.ts` Postgres URI path. RI `Bun.SQL` patterns. Driver-agnostic emission verified via sample compile. Negative paths: `mongodb://` → E-SQL-005 with `^{}` pointer. +47 tests. Real Postgres compile-time introspection deferred (would require async PA migration) — Phase 2.5 extension point in place.

---

## N. Open work (current truth, prioritized)

### P1 — Language Completeness
- [x][x] **Bun.SQL multi-driver target** (S40). SPEC §44 ratified Bun.SQL as the unified SQL codegen target. Phase 1 ✅ S40 (`6e21f76..cd8dea1`) — SQLite branch migrated to `await _scrml_sql\`...\`` tagged-template. Phase 2 (Postgres URI + introspection) in progress. Phase 3 (MySQL) deferred.
- [x][x] **§54 State-local transitions** (insight 21, S31–S33). Ratified S32 (`1d1c49d`): substates declared inside state blocks, transitions declared positively on their states (`validate() => < Validated> { body }`), `pure fn` modifier + E-STATE-COMPLETE + substate match exhaustiveness. Phase 4a–4g implementation end-to-end S33 (`36320ab..37f21f7`): block-splitter transition-decl recognition, AST node, StateType.transitions registry, `from` contextual keyword + param binding, E-STATE-TRANSITION-ILLEGAL call-site check, E-STATE-TERMINAL-MUTATION field-write check, fn-level purity in transition bodies per §33.6. Phase 4h (return-type narrowing at transition call site) still open — blocked on §54.6 code-assignment gap (NC-3).
- [x][x] **DQ-12 (Phase A)** — `is not`/`is some` on **parenthesized** compound expressions. **IMPLEMENTED S2 2026-04-10 (dq12-phase-a)** — `_rewriteParenthesizedIsOp` in `rewrite.ts`, temp-var single-evaluation per §42.2.4. Phase B (bare compound form, no parens) deferred as future work.
- [x][x] **DQ-7** — CSS `#{}` scoping strategy. **DECIDED + IMPLEMENTED S2 2026-04-10 (dq7-css-scope)** — native CSS `@scope` (Approach B). `emit-css.ts` + `emit-html.ts` + SPEC §9.1 + §25.6 rewrite landed. `data-scrml` attribute, donut scope, flat-declaration `#{}` → inline style.
- [x][x] **DQ-11** — WebSocket / server-push. Spec complete (§38). **CLI implementation complete S2 2026-04-10 (websocket-cli-batch)** — 6 bugs fixed in dev.js/build.js/emit-channel.ts, channel runtime unblocked end-to-end.
- [x][x] **Lin spec gaps — §35.2.1 working E2E as of S4.** Batch A ✅ S2; Batch B ✅ S3 (§35.2.1 lin-params parser + type-system, merge `90f1630`); Batch C Step 1 ✅ S4 (TS-G wiring fix, merge `503f5b9`); Batch C Step 2 PARKED in favor of structured expression AST migration. **§35.2.1 lin function parameters now work end-to-end for the first time** as of Phase 2 Slice 1+2 (Slice 1 merged S4 `9151f1a`, Slice 2 + ast-builder gap closures merged S4 `45208c6`). See P5 expression AST migration for ongoing work.

### P2 — DX
- [x][x] **Ghost error mitigation** — lint pre-pass landed S2 (ghost-lint-prepass, 10 W-LINT-* patterns, +71 tests). S30: ghost-lint diagnostics now visible by default (`f0e7222`). S30: +5 Vue/Svelte patterns W-LINT-011..015 (`e8ddc8d`).
- [x][x] **Adopter friction audit** — S30 (`a6ce8c6`), 13 findings. 4 critical landed same session: CSS tokenizer compound-selector fix (`2eb4513`), bin-script executable mode (`8217dd9`), ghost-lint default visibility (`f0e7222`), Vue/Svelte lint patterns (`e8ddc8d`). F5 missing-@-sigil silent break fixed S31 (`ebd4d1d`). F6 init-safety + F10 README bun-link S31 (`26df45d`). F7 audit error (false positive, no fix needed).
- [x][x] **11 adopter-blocking codegen bugs** (5 giti + 6 6nz) — all 11 fixed S34 (`aa92070..d23fd54`), verified PASS by giti. See §M items 17–26.
- [ ][ ] **GITI-006** — markup `${@var.path}` emits module-top bare read that throws on async-initialized reactives (e.g. `_scrml_reactive_get("data").value;` executes before the awaited fetch-stub set resolves). Pre-existing emission shape, formalized by giti 2026-04-20 as low-priority follow-up (workaround: `@data = { value: null }` default).
- [ ][ ] Async loading stdlib helpers (RemoteData — deferred)
- [ ][ ] Async loading sugar (Approach E — deferred)
- [x][x] **F8 + F9 scaffold polish** (scrml init `package.json` + `README.md` + inline orientation comments) — still open from S30 deferred list, carried through S31/S32/S33/S34.
- [x][x] **Fix example 12** — ex12-component-normalize S2. Examples now 14/14 clean.
- [x][x] **Library mode type declarations** — R18 #2 verified fixed S2 (was already resolved by prior work; regression tests + sample added via library-mode-types batch)

### P3 — Self-host completion (DEFERRED post-S30 public pivot)
- [ ][ ] CE + ME self-host (not yet ported) — deferred
- [ ][ ] Idiomification: ts.scrml (2,570), ast.scrml (3,539) — ~6,109 lines — deferred
- Three S29-surfaced adjacent bugs (export-decl name extraction for `export class X`; export-decl body scope check for `export function X`; destructuring `const { a, b } = ...` fragmentation) also deferred per S30 pivot decision.

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
- [x][x] **Tier 1 impl — Slice 1 `.nobatch()` marker** (§8.9.5) — commit `77bfa7b` S16. SQLNode.nobatch flag; ast-builder strips `.nobatch()` from chainedCalls in all three code paths; rewrite.ts pre-passes the string form. 8 tests.
- [x][x] **Tier 1 impl — Slice 2 BatchPlan scaffold + Stage 7.5 wiring** — commit `ad2f59e` S16. `compiler/src/batch-planner.ts` (670 LOC); `--emit-batch-plan` CLI flag. 7 tests.
- [x][x] **Tier 1 impl — Slice 3a candidate-set detection** — commit `fc30239` S16. `analyzeForLoop` + server function-decl walker. E-BATCH-001 (composition) + W-BATCH-001 (explicit BEGIN suppression). 9 tests.
- [x][x] **Tier 1 impl — Slice 3b implicit envelope codegen** — commit `8d68dc0` S16. `BEGIN DEFERRED` / try / COMMIT / catch-ROLLBACK around `!` handler CSRF-path IIFE. `needsImplicitEnvelope(funcName)` helper. 6 tests.
- [x][x] **Tier 2 impl — Slice 4 loop-hoist detection** (§8.10.1) — commit `3a55e67` S16. D-BATCH-001 near-miss diagnostic (4 reasons). 11 tests.
- [x][x] **Tier 2 impl — Slice 5 rewrite** (§8.10.2) — commit `3238af2` S16. Pre-loop `keys.map` + placeholders + `.all(...keys)` spread + `Map<key, Row>` + per-iteration `.get(x.id) ?? null` lookup. Module-level `_hoistMap` singleton avoids opts threading across 9 emit-server call sites. 8 tests.
- [x][x] **Tier 2 impl — Slice 5b E-BATCH-002 runtime guard** — commit `a0e5b3e` S16. `keys.length > 32766` check. 2 tests.
- [x][x] **Tier 2 impl — Slice 5b remainder** — E-PROTECT-003 (SELECT column-list parser + overlap check against `protectedFields`; `SELECT *` expands to every protected column; hoist is refused on overlap) and `verifyPostRewriteLift` (defensive §8.10.7 re-check — emits E-LIFT-001 if a hoist's `sqlTemplate` contains `lift(`). `BatchPlannerError.code` widened. Commit `f951064` S17. 6 tests.
- [x][x] **F9.C mount-hydration (Slice 6)** — `__mountHydrate` synthetic route aggregator. `collectServerVarDecls` + new `callableServerVarDecls` lifted to `collect.ts`. Client emits one unified `/__mountHydrate` fetch + demux when ≥2 callable `server @var`; fallback to per-var IIFE otherwise. Server emits `_scrml_route___mountHydrate` (POST) with `Promise.all` parallel loader dispatch. Writes stay 1:1 per §8.11.3. Commit `40a76c4` S17. 13 tests across 8 groups.
- [x][x] **Tier 1 + Tier 2 microbench** — `benchmarks/sql-batching/bench.js` + `RESULTS.md`, on-disk WAL `bun:sqlite`, 50 iters after 5 warmups. Tier 1 (read-only, 4 reads): 1.05× — snapshot consistency is the main win. Tier 2 scaling: **1.91× @ N=10, 2.60× @ N=100, 3.10× @ N=500, 4.00× @ N=1000**. Commit `42988ab` S17.
- [x][x] **README promotion** — "Why scrml" updated S17 to state "the compiler eliminates N+1 automatically" with link to `benchmarks/sql-batching/RESULTS.md`.

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
  - **Phase 4d — drop string fields** ✅ S40. Steps 1-7 merged S39 (ExprNode-first paths across body-pre-parser, component-expander, type-system, dependency-graph, meta-checker). Render preprocessor merged S39 (`1e304c8`) — `render name()` → `__scrml_render_name__()` placeholder unblocks structural matching. **Step 8 (`BareExprNode.expr` field deletion)** ✅ S40 (`e478c99`) — TS field deleted; consumer migration hybrid (kept `(any).expr` fallback in 7 meta-checker sites for synthetic test fixtures). Strict-deletion follow-up filed.
  - **Phase 5 — self-host parity** port `compiler/self-host/ast.scrml` (3,551 lines).
  - All other P1/P2 work continues in parallel unless it touches expression fields.

### P6 — Research (deferred to post-beta)
- Package manager alternative, scrml-native import system, sidecars, WASM, `?{}` multi-db, WASM sigils, `use foreign:`, refinement types, var reuse optimization.

---

## O. Pending cleanup (post-split)

- [x][x] **Non-compliance audit** (S2 2026-04-10) — 13 docs reviewed, 3 dereffed to `scrml-support/archive/`, 3 updated in place, 1 deleted (`shared/` fiction), 6 kept. See hand-off-2.
- [x][x] **Cold project map** (S2 2026-04-10) — re-enabled with scope discipline (`node_modules`, `dist`, framework-comparison benchmarks excluded; master-list as spine). 10 maps + INDEX + non-compliance written to `.claude/maps/`. Incremental refreshes S30, S33 (with `PHASE-4-TOUCH-POINTS.md` artifact for Phase 4), S34.
- [x][x] **Verify VS Code extension builds** (S2 2026-04-10) — added `@types/node` to devDeps, `bun install` + `bunx tsc` clean, produces `out/extension.js` (83 lines, `node --check` OK). Added `editors/vscode/{out,bun.lock}` to root `.gitignore`.
- [x][x] **Install git hooks** (S2 2026-04-10) — copied pre-commit, post-commit, pre-push from scrml8 unchanged; all targets (`compiler/src/cli.js`, `compiler/src/index.js`, `benchmarks/todomvc/app.scrml`) exist in this repo. Hooks fire on next compiler commit. **Caveat:** `.git/hooks/` is not versioned — fresh clones won't have them. Consider mirroring into `scripts/git-hooks/` with an install script.

---

## P. Cross-repo references

- **scrml-support** — deep-dives, ADRs, gauntlet reports, user-voice, design insights, historical spec drafts, friction audits
- **scrml** — primary working copy of self-host .scrml modules (idiomification happens there)
- **giti** — collaboration platform + its spec
- **6nz** — editor + z-motion spec
- **scrml8** — frozen reference archive (do not edit)
