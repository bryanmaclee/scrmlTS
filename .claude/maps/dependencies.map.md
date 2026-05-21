# dependencies.map.md
# project: scrmlts
# updated: 2026-05-21T04:30:00-06:00  commit: e613621

The repo is a Bun workspace: root `scrmlts` + `compiler` workspace member.
External-dependency surface is intentionally tiny — scrml's "no-build" pitch.

## Runtime Dependencies (root — package.json)
vscode-languageserver@^9.0.1 — LSP protocol implementation for lsp/server.js
vscode-languageserver-textdocument@^1.0.11 — text-document model for the LSP

## Runtime Dependencies (compiler workspace — compiler/package.json)
acorn@^8.16.0 — JavaScript parser; used in logic-context expression parsing
astring@^1.9.0 — JS AST → source serializer; codegen output stringification

## Dev / Build Dependencies (root)
@happy-dom/global-registrator@^20.8.9 — registers happy-dom globals for `bun test` (DOM in unit tests)
happy-dom@^20.8.9 — headless DOM implementation for runtime/browser tests
@playwright/test@^1.49.0 — e2e test runner (e2e/playwright.config.ts)
puppeteer@^24.40.0 — headless-browser automation (benchmarks, browser tests)
marked@^14.1.3 — markdown → HTML for the docs-site builder (docs/build.ts)

## Editor Extension Dependencies (editors/vscode/package.json)
vscode-languageclient@^9.0.1 — VS Code ↔ LSP client glue
typescript@^5.0.0 (dev) — extension build

## Engine / Runtime
Bun >= 1.3.13 (package.json `engines`) — the only supported runtime
No transpile step — `.ts` source runs directly under Bun.

## Internal Module Graph — live pipeline (compiler/src/)
The compiler pipeline is a linear chain orchestrated by `api.js`.
api.js imports, in pipeline order:
  block-splitter → ast-builder → name-resolver / symbol-table → module-resolver
  → component-expander → validators/{post-ce-invariant, attribute-interpolation, attribute-allowlist}
  → protect-analyzer → route-inference → monotonicity-analyzer → idempotency-store-resolver
  → type-system → meta-checker / meta-eval → dependency-graph → batch-planner
  → reachability-solver / auth-graph → codegen/route-splitter → code-generator

Lint passes called from api.js: lint-ghost-patterns, lint-i-match-promotable,
gauntlet-phase1-checks, gauntlet-phase3-eq-checks, validators/lint-try-catch,
validators/lint-async-user-source.

code-generator.js → codegen/index.ts, which fans out to ~50 `emit-*.ts` modules
(emit-html, emit-css, emit-server, emit-client, emit-machines, emit-match,
emit-control-flow, emit-bindings, emit-validators, ...) plus support modules
(ir.ts, runtime-chunks.ts, var-counter.ts, fnv1a-hash.ts, source-map.ts,
binding-registry.ts, type-encoding.ts).

reachability-solver.ts → reachability/{component-1..5, entry-points,
gate-classifier, outer-fixpoint}.

## Internal Module Graph — native-parser (compiler/native-parser/)
SEPARATE track. NOT reachable from api.js or any compiler/src/ module
(grep-confirmed: no compiler/src/ file imports native-parser). Each module is a
`.scrml` canonical + `.js` shadow; the graph below is the `.js` import structure
at HEAD `e613621` (27 paired modules; 2 added since the prior map — see below).

JS layer (M1 lexer + M2 expr + M3 stmt + M4.1 async/gen):
  lex.js → cursor, span, token, lex-mode, bracket-stack, error-recovery,
           lex-in-{code, single-string, double-string, template,
                   line-comment, block-comment, regex}
  lex-in-code.js → token, span, char-classify (K2 leaf — added S113)
                   + delegates to the per-mode lex-in-* dispatchers
  lex-in-regex.js → char-classify (K2 leaf — added S113)  // cycle to lex-in-code broken
  lex-in-{double-string,template}.js → reuse `scanStringEscape` from lex-in-single-string
  char-classify.js — NEW S113 (K2 fix). Leaf module: 6 char-classification
                     predicates (isWhitespaceCode / isNewlineCode / isDigit /
                     isHexDigit / isIdentStart / isIdentCont). Zero internal
                     native-parser imports. Breaks the lex-in-code ↔ lex-in-regex cycle.
  parse-expr.js → token-cursor, ast-expr, parse-mode, span, token + M2.4 +
                  M4.1 Await/Yield surface
  token-cursor.js → token  (walks lex()'s Token[])
  ast-expr.js → span  (Expr-node constructors; 37 ExprKind variants at HEAD)
  parse-mode.js → engine declaration (ParseMode; extended at M3.1 with `.InBlock`)
  parse-stmt.js — NEW S113 (M3). → ast-stmt, parse-expr, parse-mode, token, span
                  + error-recovery (M3.4 panic-mode resync)
  ast-stmt.js   — NEW S113 (M3). → span (Stmt-node constructors + binding-pattern
                  enums BindingKind/BindingPropertyKind/BindingElementKind)

Markup layer (MK1 BlockContext + MK2 TagFrame + MK3 BodyMode/DisplayTextLiteral):
  parse-markup.js → block-context, parse-ctx, token, span, tag-frame (MK2),
                    body-mode (MK3), display-text-literal (MK3)
  parse-ctx.js → extends M1's makeLexContext; adds node-sink + delegation-stack
  block-context.js → engine declaration (BlockContext); `.InMarkupTag` nests
                     BodyMode (K1 forward-ref RESOLVED at MK3.1); `.InLogicEscape`
                     nests LexMode (markup→JS seam — MK4 pending)
  tag-frame.js — NEW S113 (MK2). → token, span, parse-ctx, error-recovery.
                  Exports TagFrame engine + TagKind / TagClass calcs +
                  STRUCTURAL_ELEMENTS registry + tokenizeOpener / recognizeOpener /
                  classifyTag + closer-form pairing (`</>`, `</name>`, `/>`) +
                  mismatch-recovery (E-MARKUP-002) + EOF-recovery (E-CTX-001) +
                  stray-closer (E-CTX-003).
  body-mode.js — NEW S113 (MK3). → minimal deps; declares BodyMode engine
                  (`.FreeText` / `.CodeDefault`) + ProgramBodyMode enum
                  (§40.8 third mode) + bodyModeForChildOf / isCodeBearingParentName.
  display-text-literal.js — NEW S113 (MK3). → span, body-mode, parse-expr
                  (interpolation delegates to M2). Exports scanDisplayTextLiteral
                  + `{segments, exprs}` ONE-node AST shape + E-UNQUOTED-DISPLAY-TEXT
                  detection. Escape set: `\"` / `\\` / `\${` (3-escape union
                  reconciling SPEC §4.18.3 + §4.18.4; see non-compliance report).

Consumers (tests only):
  compiler/tests/parser-conformance-lexer.test.js  → lex.js (vs Acorn oracle)
  compiler/tests/parser-conformance-expr.test.js   → parse-expr.js + ast-expr.js
  compiler/tests/parser-conformance-stmt.test.js   → parse-stmt.js + ast-stmt.js  (NEW S113)
  compiler/tests/parser-conformance-markup.test.js → parse-markup.js + parse-ctx.js +
                                                      tag-frame.js + body-mode.js +
                                                      display-text-literal.js
  compiler/tests/parser-conformance/parsers.js     → harness adapter
  compiler/tests/integration/anomaly-2-export-fn-body-stripping.test.js → reproduces ANOMALY-2

## Tags
#scrmlts #map #dependencies #compiler #bun #native-parser

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
- [build.map.md](./build.map.md)
- [structure.map.md](./structure.map.md)
