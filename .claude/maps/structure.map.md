# structure.map.md
# project: scrmlts
# updated: 2026-05-19T14:37:51-06:00  commit: 6616a69

## Entry Points

compiler/src/cli.js            — CLI entry; routes compile/dev/build/serve/migrate/promote/init/generate subcommands
compiler/src/api.js            — programmatic API; orchestrates full BS→TAB→NR→MOD→CE→UVB→PA→RI→TS→META→DG→BP→RS→CG pipeline (includes Stage 3.007 LINT-TRY-CATCH + Stage 3.105 STDLIB-EXPORT-SEED + Stage 7.55 AuthGraph + Stage 7.6 Reachability Solver). S107: `collectErrors(stage, errors, filePath)` enriched with optional filePath + bsSpan→span normalization (Bug-3 fix `2e9f9c3`)
compiler/bin/scrml.js          — installed binary (points to cli.js via package.json `bin`)
lsp/server.js                  — Language Server Protocol server; started via `scrml lsp --stdio`
compiler/src/codegen/index.ts  — Stage 8 CG entry point; runCG() exported; emitPerRouteChunks() wired; PGO P3.A regex collapse + P3.B detect-runtime-chunks deferred assembly (S102)

## Directory Ownership

compiler/                      — workspace root; compiler/package.json declares acorn + astring deps
compiler/src/                  — all pipeline stage implementations: tokenizer, block-splitter, ast-builder, type-system, etc.
compiler/src/codegen/          — Stage 8 (CG) emitters; 35+ emit-*.ts files + IR, BindingRegistry, CompileContext, errors; route-splitter.ts, atom-emitter.ts, fnv1a-hash.ts; S102: emit-form-for.ts (§41.14 formFor); S104: emit-schema-for.ts (§41.15 schemaFor); S105: emit-table-for.ts (§41.16 tableFor); S107 P2 bug-5 fix sites: emit-html.ts:1672 stmtContainsRenderableLogic + emit-reactive-wiring.ts:389 orphan-filter regex; S107 P1 bug-5 fix site: emit-event-wiring.ts:928 missing-else-branch one-shot textContent write
compiler/src/codegen/compat/   — integration shim: parser-workarounds.js (setBPPOverrides hook for self-hosted BPP modules)
compiler/src/commands/         — CLI subcommand implementations: compile.js, dev.js, build.js, serve.js, migrate.js, init.js, promote.js, generate.js; S107: dev.js + build.js diagnostic formatters mirror W-LINT-* `path:line:col` shape per Bug-3 fix
compiler/src/types/            — AST type definitions (ast.ts, ~1,858 LOC); reachability.ts (A-2.1); auth-graph.ts (A-3.1, ~354 LOC)
compiler/src/validators/       — UVB sub-passes: post-ce-invariant.ts, attribute-interpolation.ts, attribute-allowlist.ts, ast-walk.ts, lint-try-catch.ts, lint-async-user-source.ts
compiler/src/reachability/     — Components 1-5 + entry-points.ts + gate-classifier.ts + outer-fixpoint.ts (A-2.7)
compiler/native-parser/        — bottom-up scrml-native JS lexer (M1.1..M1.5 complete; S102 template-mode tracking). 17 .scrml/.js shadow pairs + README. NOT self-host; NOT Acorn port. Replaces Acorn pre-v1.0.
compiler/runtime/              — server-side runtime JS shims; copied to dist/_scrml/ at compile time
compiler/runtime/stdlib/       — hand-written ES modules for stdlib (auth.js, crypto.js, store.js, host.js)
compiler/tests/                — 714 test files (S107 full pre-push gate; 15,930 pass / 169 skip / 1 todo / 0 fail / 46,845 expect); organized by category
compiler/tests/unit/           — unit tests (~487 files; S107 added bug-3-diagnostic-file-paths + bug-5-const-interpolation + match-block-parser-phase1 + match-block-phase2)
compiler/tests/conformance/    — conformance tests (~105 files); S102: conf-COMPOUND-STATE-DECL-AUTOLIFT.test.js + conf-form-for-canonical.test.js
compiler/tests/integration/    — integration tests (~52 files; S105: table-for.test.js integration)
compiler/tests/parser-conformance/ — parser conformance infrastructure: bench corpus, parsers.js, tier-diff.js
compiler/tests/browser/        — browser-environment tests (11 files, happy-dom)
compiler/tests/lsp/            — LSP server protocol tests (10 files)
compiler/tests/self-host/      — compiler self-host tests (4 files); ast.test.js updated S102 (strip hasResetExpr + _p3aExport fields)
compiler/tests/commands/       — CLI command tests (6 files)
compiler/tests/fixtures/       — shared test fixtures
compiler/tests/helpers/        — test utilities (expr.ts, extract-user-fns.js)
compiler/self-host/            — self-hosted compiler; dist/ artifacts gitignored (built locally)
compiler/self-host/cg-parts/   — code-generation partials for self-host compiler
lsp/                           — LSP server (hover, diagnostics, completion, workspace management)
stdlib/                        — scrml standard library source .scrml files (auth, crypto, data, format, fs, http, etc.)
stdlib/auth/templates/         — adopter-owned login template (login.scrml, emitted by `scrml generate auth`)
samples/                       — sample .scrml programs; samples/compilation-tests/ has ~311 .scrml fixtures
scripts/                       — build, test, and maintenance scripts (shell + .ts); scripts/git-hooks/ pre-commit + pre-push hooks
benchmarks/                    — performance benchmarks; benchmarks/perf-baseline.json (PGO P1.4 baseline capture, S102)
docs/                          — project documentation: articles, audits, changelog, changes dirs, curation, pinned-discussions; **S107: NEW `known-gaps.md` at docs/ root (adopter-direct spec-vs-impl drift ledger)**
docs/changes/                  — active dispatch directories; 60+ entries total; S102: pgo-scoping/, formFor-scoping/, formFor-impl/, runtime-perf-scoping/; S104: schemaFor-scoping/, runtime-perf-phase-3-partial-update-and-swap/; S105: tableFor-scoping/; **S107: NEW `match-block-form-scoping/` (5-phase plan SCOPING.md + progress.md; Phases 1+2 SHIPPED)**
docs/audits/                   — audit snapshots; articles-currency-table, wave-3-7-corpus-ouroboros, etc.
editors/                       — editor integrations (VSCode extension, neovim)
examples/                      — standalone scrml usage examples
e2e/                           — Playwright e2e test suite (3-browser)
handOffs/                      — historical hand-offs (read-only; current hand-off at hand-off.md). S107: `handOffs/incoming/read/` archived 6 dogfood bug reports from side-session

## Notable New Additions (S107, since S106 baseline `c491b12`)

**compiler/src/match-statechild-parser.ts (NEW S107 — §18.0.1 match block-form Phase 2):**
- 530 lines. Mirrors `engine-statechild-parser.ts` (S68 / B15) but for the Tier-1 `<match>` locus.
- Exports interfaces: `MatchArmEntry`, `MatchArmAttr`, `MatchParseDiagnostic` (see schema.map.md for shapes).
- Input: `armsRaw` text stamped on `match-block` AST nodes by ast-builder.js (Phase 1).
- Output: `MatchArmEntry[]` consumed by SYM PASS 20 (5 diagnostics) and future Phase 3 codegen.
- Body-form recognition: self-closing (`<Variant/>`) / `:`-shorthand (`<Variant>: expr`) / bare-body (`<Variant>...</>` or `</Variant>`). Wildcard `<_>` recognized as opaque match-anything arm. Parenthesized payload-binding text captured raw (Phase 4 will reuse §51.0.B.1 parser per Q-MB-3).
- Span tracking: local byte-offsets within `armsRaw`; absolute positions computed by adding the `match-block` AST node's `span.start`.

**compiler/src/block-splitter.js (updated S107):**
- Line 123-125: NEW `STRUCTURAL_RAW_BODY_ELEMENTS = new Set(["match"])` — gates raw-body capture for `<match>` block-form (mirrors §4.17 `RAW_CONTENT_ELEMENTS` pattern, but for STRUCTURAL containers whose body needs downstream re-tokenization). `</match>` explicit closer required (in addition to scrml's `</>` shortcut).
- Line 140-144: `COMPOUND_LIFT_EXEMPT_TAGS` Set extended with `"match"` (one-line fix in Phase 1) — prevents the parser auto-lifting `<match>` as a compound state-decl shape (which would consume arm-children as if they were state-children).

**compiler/src/ast-builder.js (updated S107 Phase 1):**
- Line 10521+: dispatcher case `block.name === "match"` produces `kind: "match-block"` AST node directly (not via the markup pipeline). Fields: `forType` (bareword struct/enum type from `for=`), `onExprRaw` (raw text of `on=` attribute, or `null`), `armsRaw` (raw body text between opener and explicit `</match>` / `</>` closer).

**compiler/src/symbol-table.ts (updated S107 Phase 2):**
- Line 8952+: NEW SYM PASS 20 fires 5 match-block diagnostics: E-MATCH-ON-REQUIRED → E-MATCH-NOT-EXHAUSTIVE → W-MATCH-RULE-INERT → E-MATCH-EFFECT-FORBIDDEN → E-MATCH-ONTRANSITION-FORBIDDEN. Walks `match-block` AST nodes; re-tokenizes via match-statechild-parser; builds a set of in-scope `<engine for=T>` governedTypes for the auto-implied-`on=` precondition check.

**compiler/src/api.js (updated S107 Bug-3):**
- Line 570+: `collectErrors(stageName, errors, filePath = null)` enriched with optional `filePath`; lifts `bsSpan → span`; stamps `enriched.filePath` and `enriched.span.file` from per-file path. Backward-compatible default `filePath = null`.

**compiler/src/codegen/emit-event-wiring.ts (updated S107 Phase 1 — bug-5):**
- Line 928: missing-else-branch in interpolation dispatch — when identifier is non-reactive (const-folded), emit one-shot `textContent` write inside DOMContentLoaded callback. Closes Bug 5 headline.

**compiler/src/codegen/emit-html.ts (updated S107 Phase 2 — bug-5):**
- Line 1672: NEW `stmtContainsRenderableLogic(node)` classifier gates synth-`<span data-scrml-logic>` emission on body content (decl-only logic bodies no longer produce empty spans). Closes Anomaly B.

**compiler/src/codegen/emit-reactive-wiring.ts (updated S107 Phase 2 — bug-5):**
- Line 389: orphan-filter regex matches pure-read shapes (`IDENT;` / `IDENT.path;` / `_scrml_reactive_get("x");`) and elides them from file-scope output. Closes Anomaly C.

**docs/ + docs/changes/ (NEW S107):**
- `docs/known-gaps.md` (85 lines, NEW) — adopter-direct curated list of spec-vs-impl drift. Severity legend HIGH/MED-HI/MED/LOW-MED; status `spec'd`/`scoping`/`in-impl`/`blocked`. Initial 4 open entries + 3 closed-in-S107.
- `docs/changes/match-block-form-scoping/SCOPING.md` (~26KB) — 5-phase plan + 10 OQs + reproducer + AST observations
- `docs/changes/match-block-form-scoping/progress.md` (~15KB) — per-phase progress notes

**Test additions (S107 — 4 new test files, 1112 lines total):**
- `compiler/tests/unit/bug-3-diagnostic-file-paths.test.js` (147 lines) — 6 unit tests covering BS error + TAB error + mixed-stream stability + bsSpan→span normalization
- `compiler/tests/unit/bug-5-const-interpolation.test.js` (375 lines) — 26 unit tests covering Phase 1 textContent write + Phase 2 phantom-span + orphan-no-op
- `compiler/tests/unit/match-block-parser-phase1.test.js` (236 lines) — 9 unit tests covering ast-builder produces `kind: "match-block"` with forType / onExprRaw / armsRaw fields
- `compiler/tests/unit/match-block-phase2.test.js` (354 lines) — 18 unit tests covering match-statechild-parser body forms + wildcard + payload bindings + 5 SYM PASS 20 diagnostics

## Notable Earlier Additions (S102-S106 — carry-forward inventory)

**compiler/src/codegen/emit-table-for.ts (S105 — §41.16 tableFor):**
- Exports `expandTableForElement()`; produces `<table>`+`<thead>`+`<tbody>` AST tree
- 84 tests (68 unit + 16 integration)
- 13 E-TABLEFOR-* error codes via type-system.ts §41.16 pass

**compiler/src/codegen/emit-schema-for.ts (S104 — §41.15 schemaFor):**
- 386 lines; FUNCTION-CALL form `${ schemaFor(StructType) }` inside `<schema>` body
- 8 E-SCHEMAFOR-* error codes; 62 tests

**compiler/src/codegen/emit-form-for.ts (S102 — §41.14 formFor):**
- Exports: `expandFormFor(expansion: FormForExpansion, ctx): ASTNode[]`
- Exports interfaces: `FormForStructLike`, `FieldInfo`, `FormForValidator`, `FormForExpansion`
- Source-level AST expansion; produces compound state-decl (Variant C, §6.3.2) + `<form>` markup tree

**compiler/src/codegen/emit-client.ts (updated S102 — PGO P3.A + P3.B + P3.B-followup):**
- P3.A: single alternation regex replaces per-name regex loop (~−44% pipeline alone)
- P3.B: fused iterative ExprNode probe with structural skip; assembleRuntime deferred + placeholder splice
- P3.B-followup: O(1) `FileAST.hasResetExpr` gate replaces per-node descent

**compiler/src/codegen/rewrite.ts (updated S103 — paren-form `is not`/`is some` fix):**
- `_rewriteParenthesizedIsOp()` — handles `(expr) is not`, `(expr) is some`, `(expr) is not not` without tmpvar interposition
- Prior `(_scrml_tmp_N = (expr))` pattern removed — undeclared tmpvar threw ReferenceError in ES-module strict mode

**compiler/src/dependency-graph.ts (updated S102 — PGO P3.C):**
- P3.C owner-stack: AST-walk-derived owner-stack Map replaces per-call O(n) findOwningRenderDGNode scan
- 99.7% reduction on findOwningRenderDGNode hotspot

**compiler/src/ast-builder.js (updated S106 — PGO C1 hasEqualityExpr):**
- S102: `detectResetExprPresence(nodes)`: single-pass DFS with first-hit sentinel; caches boolean to `FileAST.hasResetExpr`
- S102: `liftBareDeclarations`: `_p3aSynthCounter` + `_p3aChannelExport`/`_p3aIsExport`/`_p3aExportName` fields
- S106: NEW `detectEqualityExprPresence` walker (throw-sentinel short-circuit DFS); caches `FileAST.hasEqualityExpr`

**compiler/src/tokenizer.ts (updated S102 — formFor pick=/omit= array-literal):**
- Recognizes `omit=["c"]` / `pick=["a","b"]` array-literal form normative for §41.14.5

**compiler/src/html-elements.js (updated S102 — formFor element registration):**
- `<formFor>` element spec: `for=` (required struct-type ident), `onsubmit=`, `as=`, `pick=`, `omit=`, `partial=`, `error-strategy=`; error codes noted in comments

**compiler/src/attribute-registry.js (updated S102 — formFor attribute registration):**
- formFor attribute surface registered (pick=, omit=, partial=, error-strategy=, as=)

**compiler/src/type-system.ts (updated S105/S106):**
- S105: `_resolveAndCheckL22TypeName` pattern + tableFor §41.16 pass
- S106 `6faf7a6`: OQ-TF-13 helper extraction — sub-case-3 (unknown type) + sub-case-4 (wrong kind) shared across parseVariant + formFor + schemaFor + tableFor

**compiler/runtime/runtime-template.js (updated S106 — Phase 3.B B2):**
- `_scrml_reconcile_list` same-keys-in-same-order fast-path landed AFTER empty + bulk-create paths, BEFORE LIS pipeline. Single forward pass; bails on first key mismatch; -42% partial-update wall

**scripts/ files (S102):**
- scripts/benchmark-perf-baseline.ts — per-stage baseline capture (PGO P1.4); writes benchmarks/perf-baseline.json
- scripts/perf-regression-check.ts — reads baseline, re-runs harness, diffs per stage; exit 1 on regression
- scripts/extract-readme-scrml.js — compile-gate for `scrml` fenced blocks in README.md; runs on release-tag push via pre-push hook
- scripts/git-hooks/pre-push — full test suite + gauntlet check + README gate on `refs/tags/v*` push

**benchmarks/ (S102):**
- benchmarks/perf-baseline.json — versioned baseline JSON written by benchmark-perf-baseline.ts (PGO P1.4 tooling)

## Ignored / Generated Paths
node_modules/, compiler/node_modules/, dist/, compiler/dist/self-host/, compiler/self-host/dist/,
build/, .git/, .jj/, samples/compilation-tests/dist/, handOffs/, stdlib/*/dist/

## Tags
#scrmlts #map #structure #compiler #cli #pipeline #s107 #v0.3.3 #formfor #emit-form-for #schemafor #emit-schema-for #tablefor #emit-table-for #match-block #match-statechild-parser #sym-pass-20 #spec-18-0-1 #spec-18-0-2 #bug-3-diagnostic-file-paths #bug-5-const-interpolation #known-gaps #native-parser #m1-ladder-complete #raw-content #typography #approach-a #route-splitter #fnv1a-hash #generate-auth #pgo-phase-3 #hasResetExpr #hasEqualityExpr #paren-form-fix #perf-baseline #pre-push

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
- [dependencies.map.md](./dependencies.map.md)
- [build.map.md](./build.map.md)
