# structure.map.md
# project: scrmlts
# updated: 2026-05-20T00:15:42Z  commit: df1211d

## Entry Points

compiler/src/cli.js            — CLI entry; routes compile/dev/build/serve/migrate/promote/init/generate subcommands
compiler/src/api.js            — programmatic API; orchestrates full BS→TAB→NR→MOD→CE→UVB→PA→RI→TS→META→DG→BP→RS→CG pipeline (includes Stage 3.007 LINT-TRY-CATCH + Stage 3.105 STDLIB-EXPORT-SEED + Stage 7.55 AuthGraph + Stage 7.6 Reachability Solver). S107: `collectErrors(stage, errors, filePath)` enriched with optional filePath + bsSpan→span normalization (Bug-3 fix). S108: `findUnrecognizedClasses` wired as W-TAILWIND-UNRECOGNIZED-CLASS lint (Bug 1 FLOOR fix); `lintTailwindUnrecognizedClass` compilerSettings knob
compiler/bin/scrml.js          — installed binary (points to cli.js via package.json `bin`)
lsp/server.js                  — Language Server Protocol server; started via `scrml lsp --stdio`
compiler/src/codegen/index.ts  — Stage 8 CG entry point; runCG() exported; emitPerRouteChunks() wired; PGO P3.A regex collapse + P3.B detect-runtime-chunks deferred assembly (S102)

## Directory Ownership

compiler/                      — workspace root; compiler/package.json declares acorn + astring deps
compiler/src/                  — all pipeline stage implementations: tokenizer, block-splitter, ast-builder, type-system, etc.
compiler/src/codegen/          — Stage 8 (CG) emitters; 35+ emit-*.ts files + IR, BindingRegistry, CompileContext, errors; route-splitter.ts, atom-emitter.ts, fnv1a-hash.ts; S102: emit-form-for.ts (§41.14 formFor); S104: emit-schema-for.ts (§41.15 schemaFor); S105: emit-table-for.ts (§41.16 tableFor); **S108 NEW: emit-match.ts (642L, §18.0.1 match block-form Phase 3+4 codegen) + const-fold-env.ts (171L, Bug 5 P3 Option γ constant-folding env)**; S107 P2 bug-5 fix sites: emit-html.ts:1672 stmtContainsRenderableLogic + emit-reactive-wiring.ts:389 orphan-filter regex; S107 P1 bug-5 fix site: emit-event-wiring.ts:928 missing-else-branch one-shot textContent write
compiler/src/codegen/compat/   — integration shim: parser-workarounds.js (setBPPOverrides hook for self-hosted BPP modules)
compiler/src/commands/         — CLI subcommand implementations: compile.js, dev.js, build.js, serve.js, migrate.js, init.js, promote.js, generate.js; S107: dev.js + build.js diagnostic formatters mirror W-LINT-* `path:line:col` shape per Bug-3 fix
compiler/src/types/            — AST type definitions (ast.ts, ~1,858 LOC); reachability.ts (A-2.1); auth-graph.ts (A-3.1, ~354 LOC)
compiler/src/validators/       — UVB sub-passes: post-ce-invariant.ts, attribute-interpolation.ts, attribute-allowlist.ts, ast-walk.ts, lint-try-catch.ts, lint-async-user-source.ts
compiler/src/reachability/     — Components 1-5 + entry-points.ts + gate-classifier.ts + outer-fixpoint.ts (A-2.7)
compiler/native-parser/        — bottom-up scrml-native JS lexer (M1.1..M1.5 complete; S102 template-mode tracking). 17 .scrml/.js shadow pairs + README. NOT self-host; NOT Acorn port. Replaces Acorn pre-v1.0.
compiler/runtime/              — server-side runtime JS shims; copied to dist/_scrml/ at compile time
compiler/runtime/stdlib/       — hand-written ES modules for stdlib (auth.js, crypto.js, store.js, host.js)
compiler/tests/                — 714+ test files (full pre-push gate); organized by category (S108 +9 new test files)
compiler/tests/unit/           — unit tests (~496 files; S108 added match-block-phase3-codegen + match-block-phase4-shorthand + bug-5-phase-3-const-fold + bug-1-tailwind-unrecognized-class + bug-1-tailwind-arbitrary-value-emit + bug-1-tailwind-minor-families + bug-1-tailwind-transform-shorthand + bug-4-docs-mode-escape + pgo-c2-markup-forstmt-fold)
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
docs/                          — project documentation: articles, audits, changelog, changes dirs, curation, pinned-discussions; S107: NEW `known-gaps.md` at docs/ root (adopter-direct spec-vs-impl drift ledger)
docs/changes/                  — active dispatch directories; 60+ entries total; S102: pgo-scoping/, formFor-scoping/, formFor-impl/, runtime-perf-scoping/; S104: schemaFor-scoping/, runtime-perf-phase-3-partial-update-and-swap/; S105: tableFor-scoping/; S107: NEW `match-block-form-scoping/` (5-phase plan SCOPING.md + progress.md; Phases 1+2 SHIPPED); **S108: Phases 3+4 SHIPPED**
docs/audits/                   — audit snapshots; articles-currency-table, wave-3-7-corpus-ouroboros, etc.
editors/                       — editor integrations (VSCode extension, neovim)
examples/                      — standalone scrml usage examples
e2e/                           — Playwright e2e test suite (3-browser)
handOffs/                      — historical hand-offs (read-only; current hand-off at hand-off.md). S107: `handOffs/incoming/read/` archived 6 dogfood bug reports from side-session

## Notable New Additions (S108, since S107 baseline `6616a69`)

**compiler/src/codegen/emit-match.ts (NEW S108 — §18.0.1 match block-form Phase 3+4 codegen):**
- 642 lines. Mirrors `emit-engine.ts` (Phase A10 engine state-child render dispatch).
- Exports: `emitMatchMountHtml(node, ctx)` (emit-html.ts dispatch: `<div data-scrml-match-mount=...>` slot at source position) + `emitMatchBodyRenderForFile(fileAST, ctx)` (emit-client.ts aggregator: `{ renderFunctions, dispatchers }` appended next to C12/C14 engine body-render block).
- Reuses `emit-variant-guard.ts:emitVariantGuardedRender` — the same helper as the engine consumer. Local types: `MatchBlockAstNode` + `OnExprResolution`.
- Phase 3 v1 scope: walks every `kind: "match-block"` node; resolves `on=` to JS accessor (Shape A: bare `@cell` subscribe / auto-implied engine cell; Shape B: non-cell expression effect mode); supports unit variants + parenthesized payload bindings; wildcard `<_>` arms rendered as fall-through; tree-shake: all-empty-arm match-blocks emit nothing.
- **Not in Phase 3 v1 scope (deferred):** `:`-shorthand arm body codegen (Phase 4); per-arm reactive re-wire for `${@cell}` inside non-initial arm bodies; bare-variant inference (§18.0.3).

**compiler/src/codegen/const-fold-env.ts (NEW S108 — Bug 5 P3 Option γ constant-folding env):**
- 171 lines. Builds `ConstFoldEnv` from `constant-folder.ts` populated with every file-scope `const-decl` whose `initExpr` partially evaluates to a constant. Three exports: `getConstFoldEnvForFile(fileAST)` (cached on `fileAST._constFoldEnvCache`), `tryFoldInterpolation(exprNode, fileAST)` (returns folded string or null), `escapeHtmlText(s)` (XSS-safe HTML body text escape).
- Pattern mirrors `auth-graph.ts:buildConstEnvForFile`; one-pass forward fold; cyclic consts silently stay RUNTIME.
- SPEC §7.4.2 (S108 amendment) normative permission: "When `expr` references NO reactive cells AND the expression collapses to a compile-time-known constant value, the compiler MAY inline the string value directly into the emitted HTML."

**compiler/src/block-splitter.js (updated S108 — Bug 4 C-narrow):**
- Line ~1443: `?{` is now a SQL opener ONLY in Logic context (per SPEC §3.1 + §8.1 normative placement). Pre-S108, BS recognized `?{` at the markup/text level — catastrophic EOF-cascade when bare `?{` appeared in markup-text prose. Fix: removed `?{` from the markup-text brace-loop at ~line 1443; the `${...}` inner-brace-loop at line ~1245 still recognizes `?{` (that IS the §3.1 SQL-inside-Logic case). Composes with S101 `RAW_CONTENT_ELEMENTS`. SPEC §4.17 amended (§3.1 + §8.1 cross-ref).

**compiler/src/ast-builder.js (updated S108 — PGO C2 walker):**
- NEW `detectMarkupAndForPresence` walker that simultaneously detects `kind === "markup"` nodes with CHUNKED_MARKUP_TAGS membership AND `kind === "for-stmt"` nodes. Caches both results as `FileAST.hasChunkedMarkupTag` + `FileAST.hasForStmt` booleans in a single DFS pass (sibling Option-2 pattern to hasResetExpr / hasEqualityExpr).

**compiler/src/codegen/emit-client.ts (updated S108 — PGO C2 consumer):**
- Reads `fileAST.hasChunkedMarkupTag` + `fileAST.hasForStmt` TAB-time flags: when `false`, gates downstream work in `buildFunctionBodyRegistry` (hasForStmt gate) and in-walk markup tag-test scan (hasChunkedMarkupTag gate). Eliminates redundant scan work when neither pattern is present in the file.

**compiler/src/codegen/emit-form-for.ts (updated S108 — formFor B5 L2 label-store consultation):**
- S108 B5: Level-2 label-store consultation per SPEC §41.14.7. The expander now consults a per-compilation label registry (registered via `registerLabels`) at Step 2 of the 4-step label resolution chain (mechanical default → label-store → slot override → fallback title-case). Closes formFor B5 L2 follow-up item.

**compiler/src/tailwind-classes.js (MODIFIED MAJOR S108 — Bug 1 full-fix 3-wave + FLOOR lint):**
- NEW export `findUnrecognizedClasses(source)` — W-TAILWIND-UNRECOGNIZED-CLASS FLOOR-fix lint. Severity: `info`. Scans `class="..."` attrs for any class name that does NOT resolve via `getTailwindCSS()`. Covers typos, unsupported arbitrary values, and custom CSS classes (acknowledged false-positive at floor level — suppressed via `compilerSettings.lintTailwindUnrecognizedClass: "off"`).
- Wave 1 (S108 e9bd611): §26.4 + §26.5 SPEC sections for grid/flex/aspect + arbitrary-value families.
- Wave 2 (S108 bdb9287): minor families — transition, timing (cubic-bezier/steps), individual transforms (rotate/scale/skew/translate), outline.
- Wave 3 (S108 a40ac64): transform shorthand + directional transforms (rotate-x/y/z, scale-x/y/z, translate-x/y/z, skew-x/y).
- Net CSS-emission expansion: `grid-cols-[...]`, `grid-rows-[...]`, `flex-[...]`, `aspect-[...]`, `transition-[...]`, `duration-[...]`, `ease-[...]`, `rotate-[...]`, `scale-[...]`, `translate-[...]`, `skew-[...]`, `outline-[...]`, `outline-offset-[...]` + 3D transform variants all now emit valid CSS.

**compiler/src/codegen/emit-reactive-wiring.ts (updated S108 — Bug 5 P3 orphan-literal suppression):**
- `_constantFolded` flag check at line ~390: skips file-scope emit for logic nodes marked by emit-html.ts as constant-folded (`(stmt as any)._constantFolded === true`). Prevents `"hello";` orphan statement at file scope when const-folded interpolation `${"hello"}` lands.

**compiler/src/codegen/emit-html.ts (updated S108 — Bug 5 P3 const-fold inline):**
- Line ~1707: SPEC §7.4.2 inline constant-fold path for `${IDENT}` interpolations. Calls `tryFoldInterpolation(exprNode, fileAST)` from `const-fold-env.ts`; when a constant folds, inlines the escaped value directly into HTML body. Stamps `(node as any)._constantFolded = true` on the logic node to suppress the corresponding file-scope emit.

**compiler/SPEC.md (updated S108):**
- NEW §7.4.2 Bug 5 P3 constant-fold normative permission; §4.17 amended with Bug 4 C-narrow cross-ref (§3.1 + §8.1); §26.4 / §26.5 Tailwind expansion (arbitrary-value families); §41.14.7 formFor B5 Codegen subsection; §34 +1 row W-TAILWIND-UNRECOGNIZED-CLASS.

**Test additions (S108 — 9 new test files):**
- `compiler/tests/unit/match-block-phase3-codegen.test.js` (331L, 9 tests) — emitMatchMountHtml + emitMatchBodyRenderForFile dispatch; Shape A subscribe mode; Shape B effect mode; wildcard `<_>` fall-through; tree-shake all-empty-arm case; nested match-blocks; auto-implied engine resolution
- `compiler/tests/unit/match-block-phase4-shorthand.test.js` (231L, 6 tests) — Phase 4 `:`-shorthand arm body codegen path
- `compiler/tests/unit/bug-5-phase-3-const-fold.test.js` (359L, 14 tests) — const-fold-env.ts getConstFoldEnvForFile + tryFoldInterpolation + emit-html.ts inline fold path + _constantFolded flag + orphan suppression in emit-reactive-wiring.ts
- `compiler/tests/unit/bug-1-tailwind-unrecognized-class.test.js` (450L, 39 tests) — findUnrecognizedClasses W-TAILWIND-UNRECOGNIZED-CLASS severity:info + compilerSettings suppression knob
- `compiler/tests/unit/bug-1-tailwind-arbitrary-value-emit.test.js` (495L, 66 tests) — grid/flex/aspect + transition/timing/transform/outline arbitrary-value CSS emission
- `compiler/tests/unit/bug-1-tailwind-minor-families.test.js` (244L, 26 tests) — transition/timing/individual-transform/outline minor families
- `compiler/tests/unit/bug-1-tailwind-transform-shorthand.test.js` (212L, 23 tests) — transform shorthand + directional transforms (rotate/scale/translate/skew x/y/z axes)
- `compiler/tests/unit/bug-4-docs-mode-escape.test.js` (207L, 8 tests) — block-splitter.js C-narrow: `?{` inert in markup-text; recognized inside `${...}` unchanged
- `compiler/tests/unit/pgo-c2-markup-forstmt-fold.test.js` (282L, 25 tests) — ast-builder.js detectMarkupAndForPresence walker; emit-client.ts hasChunkedMarkupTag + hasForStmt gate consumers

## Notable Earlier Additions (S102-S107 — carry-forward inventory)

**compiler/src/match-statechild-parser.ts (NEW S107 — §18.0.1 match block-form Phase 2):**
- 530 lines. Mirrors `engine-statechild-parser.ts` (S68 / B15) but for the Tier-1 `<match>` locus.
- Exports interfaces: `MatchArmEntry`, `MatchArmAttr`, `MatchParseDiagnostic` (see schema.map.md for shapes).
- Input: `armsRaw` text stamped on `match-block` AST nodes by ast-builder.js (Phase 1).
- Output: `MatchArmEntry[]` consumed by SYM PASS 20 (5 diagnostics) and Phase 3 codegen (emit-match.ts, S108).

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

**compiler/src/codegen/emit-client.ts (updated S102/S106/S108 — PGO P3.A + P3.B + C1 + C2):**
- P3.A: single alternation regex replaces per-name regex loop (~−44% pipeline alone)
- P3.B: fused iterative ExprNode probe with structural skip; assembleRuntime deferred + placeholder splice
- P3.B-followup: O(1) `FileAST.hasResetExpr` gate replaces per-node descent
- C1 (S106): `FileAST.hasEqualityExpr` O(1) gate pre-activates equality chunk or skips needEquality probe
- **C2 (S108):** `FileAST.hasChunkedMarkupTag` + `FileAST.hasForStmt` TAB-time booleans gate downstream work

**compiler/src/codegen/rewrite.ts (updated S103 — paren-form `is not`/`is some` fix):**
- `_rewriteParenthesizedIsOp()` — handles `(expr) is not`, `(expr) is some`, `(expr) is not not` without tmpvar interposition

**compiler/src/dependency-graph.ts (updated S102 — PGO P3.C):**
- P3.C owner-stack: AST-walk-derived owner-stack Map replaces per-call O(n) findOwningRenderDGNode scan; 99.7% reduction

**compiler/src/ast-builder.js (updated S102/S106/S107/S108):**
- S102: `detectResetExprPresence` single-pass DFS → `FileAST.hasResetExpr`
- S106: `detectEqualityExprPresence` throw-sentinel DFS → `FileAST.hasEqualityExpr`
- **S107 Phase 1**: `case "match"` dispatcher → `kind: "match-block"` AST node (forType / onExprRaw / armsRaw)
- **S108 C2**: `detectMarkupAndForPresence` single DFS → `FileAST.hasChunkedMarkupTag` + `FileAST.hasForStmt`

**scripts/ files (S102):**
- scripts/benchmark-perf-baseline.ts — per-stage baseline capture (PGO P1.4); writes benchmarks/perf-baseline.json
- scripts/perf-regression-check.ts — reads baseline, re-runs harness, diffs per stage; exit 1 on regression

## Ignored / Generated Paths
node_modules/, compiler/node_modules/, dist/, compiler/dist/self-host/, compiler/self-host/dist/,
build/, .git/, .jj/, samples/compilation-tests/dist/, handOffs/, stdlib/*/dist/

## Tags
#scrmlts #map #structure #compiler #cli #pipeline #s108 #v0.3.3 #formfor #emit-form-for #schemafor #emit-schema-for #tablefor #emit-table-for #match-block #emit-match #const-fold-env #match-statechild-parser #sym-pass-20 #spec-18-0-1 #spec-18-0-2 #bug-1-tailwind #bug-4-c-narrow #bug-5-phase-3 #pgo-c2 #hasChunkedMarkupTag #hasForStmt #w-tailwind-unrecognized-class #spec-7-4-2 #spec-26-4 #spec-26-5 #spec-41-14-7 #known-gaps #native-parser #m1-ladder-complete #raw-content #typography #approach-a #route-splitter #fnv1a-hash #generate-auth #pgo-phase-3 #hasResetExpr #hasEqualityExpr #paren-form-fix #perf-baseline #pre-push

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
- [dependencies.map.md](./dependencies.map.md)
- [build.map.md](./build.map.md)
