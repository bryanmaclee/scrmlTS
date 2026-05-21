# structure.map.md
# project: scrmlts
# updated: 2026-05-21T04:30:00-06:00  commit: e613621

## Entry Points
compiler/src/cli.js: CLI entry, subcommand router (compile/dev/build/serve/init/generate/migrate/promote); falls through to compile for a bare `.scrml` arg.
compiler/src/index.js: Thin legacy CLI wrapper — parses args, delegates to `compileScrml()` in api.js.
compiler/src/api.js: Programmatic compiler API — runs the full BS→TAB→CE→...→CG pipeline; consumed by CLI, tests, watch loops, LSP.
compiler/bin/scrml.js: npm `bin` shim — the `scrml` executable installed from package.json `bin`.
compiler/native-parser/lex.js: scrml-native lexer entry — `lex(source): Token[]`; parallel-track front-end, not wired into the pipeline (see Parallel Track below).
compiler/native-parser/parse-expr.js: scrml-native JS expression parser entry — consumes `lex()` tokens, emits `Expr` AST (M2 + M4.1 surface).
compiler/native-parser/parse-stmt.js: scrml-native JS statement parser entry — consumes the same tokens, emits `Stmt` AST (M3 surface; subsumes the live `body-pre-parser.ts`).
compiler/native-parser/parse-markup.js: scrml-native markup-layer trampoline — `BlockContext`-driven block-stream producer; integrates `TagFrame` (MK2), `BodyMode` + `DisplayTextLiteral` (MK3).
lsp/server.js: Language Server Protocol server (`bun run lsp/server.js --stdio`).
docs/build.ts: Static docs-site article builder (markdown → per-article HTML).

## Directory Ownership
compiler/             — The scrml compiler workspace; everything below is the toolchain.
compiler/src/         — TypeScript/JS compiler pipeline source (126 files): tokenizer, AST builder, validators, type system, dependency graph, codegen. UNCHANGED since commit 78faa65 — verified at `e613621` (`git diff 87453fb..HEAD -- compiler/src/` is empty across the entire S113 native-parser arc).
compiler/src/codegen/ — Stage 8 Code Generator — IR, per-construct emit-*.ts modules, source maps, runtime chunking.
compiler/src/codegen/compat/ — Compatibility / progressive-enhancement codegen helpers.
compiler/src/commands/ — Implementations of the 8 CLI subcommands (compile, dev, build, serve, init, generate, migrate, promote).
compiler/src/reachability/ — Stage 7.6 Reachability Solver components (component-1..5, outer-fixpoint, gate-classifier); SPEC-anchored, impl deferred.
compiler/src/validators/ — Validation passes (attribute allowlist, attribute interpolation, try/catch + async-source lint, post-CE invariant, AST walk).
compiler/src/types/   — Shared TypeScript type declarations: ast.ts (AST node shapes), auth-graph.ts, reachability.ts.
compiler/native-parser/ — scrml-native compiler FRONT-END (charter B, S111) — 27 paired `.scrml`/`.js` modules. At HEAD: M1 lexer ✅, M2 expression parser ✅, M3 statement parser ✅, M4.1 async/generator ✅, MK1 BlockContext ✅, MK2 TagFrame ✅, MK3 BodyMode + DisplayTextLiteral ✅. Parallel track — ships ALONGSIDE compiler/src/, not yet wired in (see Parallel Track).
compiler/native-parser/dist/ — generated compile artifacts of the native-parser `.scrml` files; not source.
compiler/runtime/     — Client/server runtime support shipped into compiled output (idempotency.js, stdlib).
compiler/self-host/   — Self-hosting compiler modules authored in scrml (`.scrml`) with `.js` dist; ast/bs/bpp/cg/dg/ri/ts/tab/meta-checker/module-resolver.
compiler/tests/       — 731 test files across unit/integration/conformance/browser/lsp/self-host/commands/parser-conformance.
compiler/SPEC.md      — Authoritative language specification (28,489+ lines, 57 sections + appendices).
compiler/SPEC-INDEX.md — Navigation map for SPEC.md — per-section line ranges, sizes, topic lookup.
compiler/PIPELINE.md  — Stage-contract document — 18-stage pipeline, lock enforcement map, failure-mode catalog.
stdlib/               — scrml standard library — 19 capability modules (auth, http, redis, time, fs, crypto, oauth, ...) authored in `.scrml`.
examples/             — Numbered canonical `.scrml` example programs + multi-file example dirs; `VERIFIED.md` tracks compile status.
samples/              — Larger demo `.scrml` apps + gauntlet round dirs + `compilation-tests/` sub-dirs.
e2e/                  — Playwright end-to-end suite — fixtures, tests, two configs (app + docs).
benchmarks/           — Performance and bundle-size benchmarks; `RESULTS.md` is the curated committed result file.
docs/                 — Project docs: articles, audits, changes (per-feature working dirs), tutorial, primer, changelog, website.
editors/              — Editor integrations — VS Code extension + Neovim queries.
scripts/              — Build / maintenance scripts — spec regen, test-sample compile, git hooks, benchmarks, migration helpers.
lsp/                  — Standalone LSP server entry.
handOffs/             — Historical session hand-offs (out of scope for maps — see non-compliance scan).

## Parallel Track — compiler/native-parser/ vs compiler/src/
`compiler/native-parser/` is a SEPARATE front-end implementation, not a replacement
of `compiler/src/` yet. Verified facts:
- `compiler/src/` does NOT import anything from `compiler/native-parser/` (grep-confirmed clean).
- The native-parser `.js` modules are imported ONLY by `compiler/tests/parser-conformance*`
  test files and `compiler/tests/integration/anomaly-2-export-fn-body-stripping.test.js`.
- Each native-parser module is a `.scrml` CANONICAL source + a 1:1 `.js` EXECUTABLE
  shadow. Tests import the `.js`. The `.scrml`↔`.js` shadow is an M4+ swap-in
  concession (compiler v0.3 strips `export function` bodies in `${...}` SPA blocks —
  native-parser README ANOMALY-2).
- The live `compiler/src/` pipeline still uses the heuristic block-splitter + Acorn +
  body-pre-parser. The native-parser swaps in behind `--parser=scrml-native` at
  milestone M5; M6 deletes the `compiler/src/` front-end stages.
- M-ladder status at HEAD `e613621` (S113 CLOSE): M1 + M2 + M3 + MK1 + MK2 + MK3 ✅;
  M4.1 ✅ (async/generator); M4.2 + M4.3 + MK4 + M5 + M6 pending.

## Native-parser file-ownership (M-step → file map)
Each M-/MK-step OWNS or EXTENDS a specific subset; agents dispatched against a
follow-up sub-step should consult this routing before editing.

M1 (lexer):         lex / lex-mode / cursor / span / token / bracket-stack /
                    error-recovery / lex-in-{code, single-string, double-string,
                    template, line-comment, block-comment, regex} / char-classify (K2 leaf)
M2 (expr parser):   parse-expr / parse-mode (+ ast-expr, token-cursor)
M3 (stmt parser):   parse-stmt / ast-stmt (+ extends parse-mode `.InBlock`)
M4.1 (async/gen):   parse-expr + parse-stmt + parse-mode + ast-expr (Await/Yield)
MK1 (BlockContext): parse-markup / block-context / parse-ctx
MK2 (TagFrame):     tag-frame (+ extends block-context, parse-markup at `.InMarkupTag`)
MK3 (§4.18):        body-mode / display-text-literal (+ extends parse-markup,
                    tag-frame bodyMode payload, block-context K1 fwd-ref)

K-ledger (open, see IMPLEMENTATION-ROADMAP §4.4):
- K3/K4/K5 — M1 lexer maximal-munch gaps (compound-assign / `?.` / `#`/`~`/`::`);
  parse-expr-coupled — sequence as a post-M4 dispatch.
- K6 — folded into M4.2.
- K8 — whole-native-parser `function`→`fn` refactor (K2-unblocked).
- K9 — markup-layer circular import (`block-context`↔`parse-ctx`); mirror K2
  recipe; pre-M6.
- K10 — `ast-expr.scrml` ~L575 `!= not` → `is not`; one-line, post-M4 to avoid
  collision with M4.2/M4.3.

## Ignored / Generated Paths
node_modules, compiler/node_modules, editors/vscode/node_modules — dependency installs
dist/, compiler/dist, examples/dist, samples/dist, editors/vscode/out — build artifacts
compiler/native-parser/dist/ — generated `.scrml`-compile output of native-parser modules
.git, .jj — VCS metadata
.claude — agent maps + worktrees (this directory)
.tmp/, compiler/tests/unit/__fixtures__/ — per-run scratchpads
e2e/test-results/, e2e/playwright-report/ (+ -docs variants) — generated test artifacts
docs/website/dist/, docs/website/**/dist/ — generated docs-site HTML
*.db / *.db-journal / *.db-wal / *.db-shm — runtime SQLite databases (examples + benchmarks)
docs/articles/*/, docs/articles/index.html — generated article HTML (source: docs/articles/*.md)
docs/m1-benchmark-results.md — local-only per-run benchmark dump (gitignored)

## Tags
#scrmlts #map #structure #compiler #pipeline #monorepo-workspace #native-parser

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
- [build.map.md](./build.map.md)
- [domain.map.md](./domain.map.md)
- [schema.map.md](./schema.map.md)
