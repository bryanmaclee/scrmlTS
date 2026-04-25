# Progress: lsp-l1-see-the-file

- [start] Worktree rebased onto main `7fbbb4f`. Baseline tests: 7632 pass / 40 skip / 0 fail / 358 files.
- [start] Read deep-dive (574 lines) and current `lsp/server.js` (965 LOC). Confirmed VS Code extension is fully transparent — server-advertised capabilities flow through.
- [step 1] Pre-snapshot written, committed.
- [step 2] Refactored lsp/server.js into a thin LSP wiring shell. Created lsp/handlers.js with all the analysis + per-feature handler logic (pure, no transport side effects on import — necessary because createConnection demands a transport at module load).
- [step 2] Added documentSymbolProvider capability + onDocumentSymbol handler. Walks AST to emit hierarchical DocumentSymbol[] for state blocks (Module), state-constructor-defs (Class), machines (Class), components (Class), functions (Method/Function), reactives (Variable), tildes (Variable), lin (Variable), type-decls (Enum/Struct/Interface).
- [step 2] Improved hover: function signature with full kind/generator/canFail/boundary; reactive var with derived/debounced/shared badges; machines with governedType + sourceVar; components; tilde + lin badges.
- [step 2] Fixed completion triggers: `@<partial>` (was: only `@` end-of-line), `@var.|` member-access stub, component completion in `<` markup context, identifier completion (functions/types) inside `${}` logic.
- [step 2] Added `#` to triggerCharacters (CSS context).
- [step 2] Bug fix: extractAnalysisInfo previously checked `node.kind` against PascalCase names (`FunctionDecl`, `ReactiveAssign`) that the AST never emits — so the function/reactive analysis cache was permanently empty and hover/definition on function names silently failed. Now walks canonical lowercase-kebab kinds.
- [step 2] Verified by running buildDocumentSymbols against all 14 examples/*.scrml — 14/14 parse cleanly, 72 total symbols emitted.
- [step 2] Committed (c29b86e): `WIP(lsp-l1-see-the-file): split server into shell + handlers; add docSymbol provider`.
- [step 3] Wrote 4 LSP test files (38 tests) under compiler/tests/lsp/: analysis (8), document-symbols (11), hover (10), completions (9).
- [step 3] Discovered + fixed a pre-existing detectContext brace-balance bug surfaced by the function-completion test: bare `{` inside a logic context was unhandled but every `}` decremented context depth, so cursor placement after `${ type T = { ... } }` falsely returned top-level. Fixed with a plainDepth counter.
- [step 3] All 38 LSP tests pass. Full test suite: 7670 pass / 40 skip / 0 fail (+38, 0 regressions).
- [step 3] Committed (67967f3): `test(lsp-l1-see-the-file): 38 tests for documentSymbols/hover/completions/analysis`.
- [step 4] Wrote LSP stdio smoke test at smoke-test.js. Spawns the actual LSP via `bun run lsp/server.js --stdio`, sends initialize + didOpen + documentSymbol against examples/14-mario-state-machine.scrml. PASSES — initialize advertises documentSymbolProvider:true; documentSymbol returns 15 top-level symbols.
- [step 5] Wrote anomaly-report.md (CLEAR FOR MERGE) and updated this progress file.

## Final state

- Branch: `worktree-agent-aae4c42f243b4cb8b` rebased onto main `7fbbb4f`.
- Commits added on this branch:
  - `d779f35` WIP(lsp-l1-see-the-file): pre-snapshot + progress
  - `c29b86e` WIP(lsp-l1-see-the-file): split server into shell + handlers; add docSymbol provider
  - `67967f3` test(lsp-l1-see-the-file): 38 tests for documentSymbols/hover/completions/analysis
  - (pending) test(lsp-l1-see-the-file): smoke test + anomaly report
- Files changed (real changes only):
  - `lsp/server.js` — refactored to thin LSP wiring shell (965 → 132 lines)
  - `lsp/handlers.js` — new, all handler logic (~1100 lines)
  - `compiler/tests/lsp/analysis.test.js` — new
  - `compiler/tests/lsp/completions.test.js` — new
  - `compiler/tests/lsp/document-symbols.test.js` — new
  - `compiler/tests/lsp/hover.test.js` — new
  - `docs/changes/lsp-l1-see-the-file/pre-snapshot.md` — new
  - `docs/changes/lsp-l1-see-the-file/progress.md` — new (this file)
  - `docs/changes/lsp-l1-see-the-file/anomaly-report.md` — new
  - `docs/changes/lsp-l1-see-the-file/smoke-test.js` — new
- Final test count: **7670 pass / 40 skip / 0 fail / 362 files** (+38 tests, +4 files vs. baseline).
- LSP smoke-tested via stdio — both passes (initialize advertises documentSymbolProvider, documentSymbol returns symbols).
