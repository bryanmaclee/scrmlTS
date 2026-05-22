# structure.map.md
# project: scrmlts
# updated: 2026-05-22T00:00:00Z  commit: 5d2003dd

## Entry Points
compiler/bin/scrml.js — CLI executable shim; re-exports src/cli.js so `bun run scrml` / `npx scrml` / direct invocation all work.
compiler/src/cli.js — subcommand router; dispatches compile / dev / build / migrate / promote / generate / init / serve; falls through to compile when arg 0 is a .scrml file or directory.
compiler/src/api.js — programmatic compiler API; `compileScrml(options)` runs the full BS→TAB→PRECG→…→CG pipeline; the M5 native-parser swap seam. As of C2 (S119), `--parser=scrml-native` ROUTES the per-file TAB stage through `nativeParseFile` (api.js:729-736).
compiler/native-parser/parse-file.js — `nativeParseFile(filePath, source)` — the C1 FileAST assembler; the native-parser analogue of `buildAST`. Returns `{ filePath, ast: FileAST, errors }`.
lsp/server.js — Language Server Protocol entry; `bun run lsp`.
docs/build.ts — docs-site builder; `bun run docs:build`.

## Directory Ownership
compiler/src/                  — JS+TS compiler pipeline stages (BS, TAB, CE, PA, RI, MC, TS, META, DG, BP, AG, RS, CG) plus lints and validators.
compiler/src/codegen/          — Stage 8 code generation; ~55 emit-* modules + index.ts (runCG), route-splitter, IR, source-map.
compiler/src/codegen/compat/   — parser-workaround shims (BPP overrides via parser-workarounds.js).
compiler/src/commands/         — CLI subcommand implementations (compile.js, dev.js, build.js, migrate.js, promote.js, generate.js, init.js, serve.js).
compiler/src/reachability/     — Stage 7.6 Reachability Solver components (component-1..5, entry-points, gate-classifier, outer-fixpoint).
compiler/src/types/            — shared TypeScript type declarations (ast.ts, auth-graph.ts, reachability.ts).
compiler/src/validators/       — post-CE / lint validators (attribute-allowlist, attribute-interpolation, post-ce-invariant, lint-try-catch, lint-async-user-source, ast-walk).
compiler/native-parser/        — the scrml-native composed-engines front-end. M1 (lexer) complete; expr/stmt/markup parsers + the native→live FileAST bridge + the `nativeParseFile` assembler all landed. `--parser=scrml-native` now ROUTES the TAB stage through it (C2, S119). .scrml canonical sources + 1:1 .js shadow files. 37 .js modules. See "Native-Parser Layout" below.
compiler/native-parser/dist/   — compiled native-parser artifacts (client.js + html); generated.
compiler/self-host/            — from-scratch scrml self-host compiler sources (.scrml) + JS bridge; separate post-v1.0 effort.
compiler/runtime/              — hand-written ES-module runtime shims; runtime/stdlib/*.js bundled into emitted output as _scrml/*.js; idempotency.js.
compiler/tests/                — 721 .test.js files: unit, integration, conformance, parser-conformance, browser, commands, lsp, self-host, fixtures, helpers.
compiler/bin/                  — CLI executable shim.
compiler/dist/                 — compiled compiler artifacts; generated.
stdlib/                        — scrml standard library .scrml sources (auth, crypto, data, host, store, etc.).
lsp/                           — Language Server Protocol implementation.
editors/                       — editor integrations / syntax files.
examples/                      — numbered example .scrml apps + multifile dirs (22-multifile, 23-trucking-dispatch).
samples/                       — ad-hoc sample apps + gauntlet repro sets; samples/compilation-tests/ holds ~318 test-case dirs (count only — not enumerated).
benchmarks/                    — perf + LLM-efficiency + framework-comparison benchmarks.
e2e/                           — Playwright end-to-end tests + configs.
docs/                          — articles, audits, changes (per-dispatch BRIEF/SCOPING/progress files), website, tutorial, PA-SCRML-PRIMER, changelog.
scripts/                       — build/maintenance scripts (compile-test-samples, regen-spec-index, rebuild-*-dist, git-hooks).
handOffs/                      — historical session hand-off docs (out of scope).

## Native-Parser Layout
Front-end flow: lex → parse-stmt/parse-expr → parse-markup → bridge layer → nativeParseFile → live FileAST.

  Lexing      — lex.js + lex-mode.js + 7 lex-in-* dispatchers (code, single/double-string,
                template, line/block-comment, regex); token.js + token-cursor.js + cursor.js.
  Statements  — parse-stmt.js, ast-stmt.js (StmtKind: 20 variants), parse-ctx.js,
                parse-mode.js, parse-seam.js, block-context.js, body-mode.js.
  Expressions — parse-expr.js, ast-expr.js (ExprKind: 40 variants).
  Markup      — parse-markup.js, tag-frame.js (TagKind calc + VOID_ELEMENTS void-element
                set + isVoidElementName, S119 HTML void-element support),
                display-text-literal.js, parse-css-body.js, parse-sql-body.js,
                parse-state-body.js (shapeStateBlock + STATE_FORM_KEYWORDS `{db,schema}`
                + isStateBlock — S119 no-space `<db>`/`<schema>` recognition),
                parse-error-body.js, delegation-frame.js.
  BRIDGE      — translate-stmt.js (R1 — native Stmt[] → live LogicStatement[]),
                translate-expr.js (A2 — native Expr → live ExprNode),
                collect-hoisted.js (A3 — native Block[] → imports/exports/typeDecls/
                components/machineDecls/channelDecls/hasProgramRoot; also exports
                isEngineBlock + synthEngineDecl).
  ASSEMBLER   — parse-file.js — `nativeParseFile(filePath, source)` (C1, S119). Composes
                parseMarkupTrace + the three bridges into the live `FileAST` shape; the
                drop-in analogue of `buildAST`. 11 per-BlockKind synthesizers
                (synthMarkupNode / synthStateNode / synthEngineNode / synthTextNode /
                synthCommentNode / synthSqlNode / synthCssNode / synthMetaNode /
                synthErrorEffectNode / synthLogicNode + drop path). One shared `idGen`.
  Support     — span.js, bracket-stack.js, error-recovery.js, char-classify.js.
  Docs        — native-parser/README.md (current reference), M5-ast-bridge-scoping.md,
                M5-divergence-ledger.md, M5-SWAP-residual-decomposition.md.

## Parser-Conformance Suite (compiler/tests/parser-conformance/)
  dual-pipeline-canary.js — the C2 proof instrument: runs LIVE (splitBlocks→buildAST)
                AND NATIVE (nativeParseFile) on a source, structurally diffs the two
                FileASTs along the top-level AND recursive node-kind sequences + 6 hoist
                counts + hasProgramRoot + the diagnostic streams. `classifyDivergence`
                tags EXACT / DIFF-top-seq / DIFF-deep-seq / DEFERRAL-* classes.
  corpus-enumerator.js, parsers.js (Acorn-oracle adapter), tier-diff.js, bench/, markup-bench/.

## Compiler Spec / Pipeline References
compiler/SPEC.md         — normative scrml language spec (58 sections; §34.1 is the native-parser diagnostic catalog — 81 codes as of S119).
compiler/SPEC-INDEX.md   — navigation map into SPEC.md (section anchors).
compiler/PIPELINE.md     — pipeline-stage reference.

## Ignored / Generated Paths
node_modules, dist, compiler/dist, compiler/native-parser/dist, build, target, .git, .jj, .claude, vendor, *.db (SQLite test DBs), examples/dist, samples/dist

## Monorepo Note
package.json declares a Bun workspace `["compiler"]`. compiler/package.json is the
sub-package manifest (acorn + astring). Single map set covers the whole repo.

## Tags
#scrmlts #map #structure #compiler #native-parser #pipeline #m5-swap

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
- [build.map.md](./build.map.md)
- [dependencies.map.md](./dependencies.map.md)
