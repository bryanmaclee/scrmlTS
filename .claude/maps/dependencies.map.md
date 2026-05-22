# dependencies.map.md
# project: scrmlts
# updated: 2026-05-22T00:00:00Z  commit: 5d2003dd

## Runtime Dependencies (root package.json)
vscode-languageserver@^9.0.1 — LSP server framework for lsp/server.js
vscode-languageserver-textdocument@^1.0.11 — text-document model for the LSP

## Runtime Dependencies (compiler/package.json)
acorn@^8.16.0 — JS expression/statement parser; drives the live TAB-stage `parseExprToNode` (ESTree nodes); native-parser conformance ORACLE
astring@^1.9.0 — ESTree → JS source generator; used by codegen to print expressions

## Dev / Build Dependencies (root)
@happy-dom/global-registrator@^20.8.9 — registers happy-dom globals for browser-mode unit tests
happy-dom@^20.8.9 — DOM implementation for non-Playwright browser tests
@playwright/test@^1.49.0 — e2e test runner (e2e/)
puppeteer@^24.40.0 — headless browser automation (benchmarks / browser tests)
marked@^14.1.3 — markdown renderer for docs:build

## Runtime / Toolchain
Bun >=1.3.13 — required engine; test runner (`bun test`), bundler, package manager (bun.lock).
No npm/pnpm lockfile; bun.lock is canonical. package.json version: 0.6.0.

## Internal Module Graph (pipeline orchestration)
api.js → block-splitter.js, ast-builder.js, compute-pgo-flags.ts, compute-program-config.ts,
         component-expander.ts, protect-analyzer.ts, route-inference.ts, monotonicity-analyzer.ts,
         idempotency-store-resolver.ts, type-system.ts, meta-checker.ts, meta-eval.ts,
         dependency-graph.ts, batch-planner.ts, reachability-solver.ts, auth-graph.ts,
         code-generator.js, module-resolver.js, name-resolver.ts, symbol-table.ts
api.js → native-parser/parse-file.js (`nativeParseFile`) — C2 routing; consumed only when
         `--parser=scrml-native` is set (the TAB-stage `_buildAST` override, api.js:730).
api.js → validators/{post-ce-invariant, attribute-interpolation, attribute-allowlist, lint-try-catch, lint-async-user-source}.ts
api.js → lint-ghost-patterns.js, lint-i-match-promotable.js, tailwind-classes.js,
         gauntlet-phase1-checks.js, gauntlet-phase3-eq-checks.js
code-generator.js → codegen/index.ts (runCG) → codegen/emit-*.ts (~55 emitters)
codegen/index.ts → codegen/route-splitter.ts, codegen/ir.ts, codegen/source-map.ts, codegen/runtime-chunks.ts
reachability-solver.ts → reachability/{component-1..5, entry-points, gate-classifier, outer-fixpoint}.ts
cli.js → commands/{compile, dev, build, migrate, promote, generate, init, serve}.js → api.js
commands/build.js, commands/dev.js → api.js findOutputFiles

## Native-parser Internal Module Graph
lex.js → lex-mode.js, lex-in-{code,single-string,double-string,template,line-comment,block-comment,regex}.js,
         char-classify.js
parse-expr.js → ast-expr.js, token.js, token-cursor.js, parse-ctx.js, parse-mode.js
parse-stmt.js → ast-stmt.js, ast-expr.js, parse-expr.js, token.js, parse-ctx.js, block-context.js, body-mode.js
parse-markup.js → tag-frame.js, body-mode.js, display-text-literal.js, parse-seam.js,
         parse-css-body.js, parse-sql-body.js, parse-state-body.js, parse-error-body.js, delegation-frame.js
parse-file.js → parse-markup.js (`parseMarkupTrace`), collect-hoisted.js (`collectHoisted`,
         `isEngineBlock`, `synthEngineDecl`), translate-stmt.js (`translateStmtList`),
         parse-state-body.js (`isStateBlock`)
translate-stmt.js → ast-stmt.js, translate-expr.js (rides expression children through the expr bridge)
translate-expr.js → ast-expr.js
collect-hoisted.js → ast-stmt.js (reads StmtKind to classify Block-stream Stmt nodes)
tag-frame.js → (exports VOID_ELEMENTS / isVoidElementName — consumed by parse-markup self-close logic)
parse-state-body.js → (exports STATE_FORM_KEYWORDS / isStateBlock / shapeStateBlock)

## Native-parser → live-pipeline bridge + assembler (C1/C2 — landed and routed)
The native parser produces SEPARATE catalogs (Token[], Stmt[], Expr, Block[]). The
bridge layer + assembler now compose them into a `FileAST` and the pipeline routes it:
  - translate-stmt.js  `translateStmtList(nativeBody, idGen)` — R1; native Stmt[] →
    live LogicStatement[] (PascalCase ESTree-shape → lowercase scrml kinds; N×M structural).
  - translate-expr.js  `translateExpr(nativeExpr)` / `translateExprList(...)` — A2;
    native Expr (40 ExprKinds) → live ExprNode (20 lowercase kinds).
  - collect-hoisted.js `collectHoisted(blocks, idGen, source)` / `hasProgramRoot(blocks)` /
    `isEngineBlock(block)` / `synthEngineDecl(block, stamp, source)` — A3; native Block[]
    → { imports, exports, typeDecls, components, machineDecls, channelDecls, hasProgramRoot }.
  - parse-file.js `nativeParseFile(filePath, source)` — C1; composes `parseMarkupTrace` +
    the three bridges into the full live `FileAST` shape. Drop-in analogue of `buildAST`.
The C1 assembler is wired into api.js's TAB seam (C2): `--parser=scrml-native` swaps
`_buildAST` to `nativeParseFile` (api.js:729-736). Strictly opt-in — `parser` defaults
to `null`; every other caller uses the untouched live BS+TAB path.

## Tags
#scrmlts #map #dependencies #bun #acorn #native-parser #m5-swap #bridge

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
- [structure.map.md](./structure.map.md)
- [build.map.md](./build.map.md)
