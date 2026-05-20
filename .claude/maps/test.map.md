# test.map.md
# project: scrmlts
# updated: 2026-05-20T00:30:00Z  commit: df1211d

## Test Framework

| Field | Value |
|-------|-------|
| Runner | bun:test (built-in) |
| Config | bunfig.toml (`root = "compiler/tests/"`, `timeout = 10000`) |
| Pretest | `bash scripts/compile-test-samples.sh` — compiles ~311 sample fixtures |
| Run all | `bun test compiler/tests/` |
| Run subset | `bun test compiler/tests/unit` / `compiler/tests/integration` / `compiler/tests/conformance` |
| Run single | `bun test compiler/tests/unit/<file>.test.js` |
| Run native-parser lexer | `bun test compiler/tests/parser-conformance-lexer.test.js` |
| With bail | `bun test ... --bail` (used by pre-commit hook) |
| Coverage | `bun test compiler/tests/ --coverage` |

## Test Counts (S108 / post-v0.3.3 era, 2026-05-19, HEAD `df1211d`)

Pre-commit subset (unit + integration + conformance): **13,304 pass / 88 skip / 1 todo / 0 fail / 690 files / 44,794 expect**
Full suite (`bun test compiler/tests/`): **16,147 pass / 169 skip / 1 todo / 0 fail / 723 files / 47,209 expect**
Native-parser conformance: **97 pass / 0 skip / 0 fail** (parser-conformance-lexer.test.js, M1.4 / M1.5 template-mode tracking)

Prior watermarks: S107 close (`c91fae0`) — 13,087 pass / 88 skip / 1 todo / 0 fail / 681 files / 44,430 expect (pre-commit); 15,930 pass / 169 skip / 714 files / 46,845 expect (full). S106 close (`c491b12`) — 13,024 pass / 92 skip / 677 files (pre-commit); 15,867 pass / 173 skip / 710 files / 46,721 expect (full). S105 close — 12,998 pass / 675 files (pre-commit); 15,841 pass / 708 files (full). S104 close — 12,872 / 670 files; 15,709 (full). S103 — 12,807 / 668. S101 — 12,645 / 658. S92 — 12,694 / 638.

S108 delta vs S107 close: **+217 pass / +9 files / +364 expect / 0 fail / 0 regressions** (full pre-push gate). New tests by track (~209 new tests across 9 new test files): 9 match-block Phase 3 + 6 match-block Phase 4 = 15 (match block-form codegen closure) + 14 bug-5 Phase 3 (const-fold) + 34 bug-1 floor (W-TAILWIND-UNRECOGNIZED-CLASS) + 66 bug-1 wave 1 (grid/flex/aspect) + 26 bug-1 wave 2 (transition/timing/transforms/outline) + 23 bug-1 wave 3 (transform shorthand + directional) + 8 bug-4 C-narrow + 25 PGO C2 fold.

## New Tests Since S107 Baseline (S108 — 9 new test files)

**Match block-form Phase 3 codegen (NEW S108 — `ef9d219`):**
- `compiler/tests/unit/match-block-phase3-codegen.test.js` — exercises `compiler/src/codegen/emit-match.ts` (~430 LOC) consumer reusing variant-source-agnostic `emit-variant-guard.ts:emitVariantGuardedRender` helper. on= resolution Shape A subscribe / Shape B effect / auto-implied via in-scope engine. Tree-shake on all-empty arms. Multiple match-blocks per file → independent dispatchers indexed by AST id. 9 tests.

**Match block-form Phase 4 `:`-shorthand body codegen (NEW S108 — `204b303`):**
- `compiler/tests/unit/match-block-phase4-shorthand.test.js` — `:`-shorthand body codegen via parseExprToNode + synthesized `logic > bare-expr` AST routed through generateHtml's interpolation case. Constants fold via Bug 5 P3; cells emit placeholder + reactive binding. 6 tests.

**Bug-5 `${IDENT}` const-interpolation Phase 3 const-fold (NEW S108 — `811181e`):**
- `compiler/tests/unit/bug-5-phase-3-const-fold.test.js` — exercises new `compiler/src/codegen/const-fold-env.ts` (~155 LOC) Option γ constant-folding env via partiallyEvaluateExpr. Cached env; `_constantFolded` marker threads through `collect.ts` + `emit-reactive-wiring.ts` to suppress orphan literal at file-scope. Closes Bug 5 arc end-to-end. 14 tests.

**Bug-1 Tailwind W-TAILWIND-UNRECOGNIZED-CLASS floor lint (NEW S108 — `0b2a8fe..dce4f06`):**
- `compiler/tests/unit/bug-1-tailwind-unrecognized-class.test.js` — exercises `findUnrecognizedClasses` lint wired into compileScrml via api.js; suppressible via `compilerSettings.lintTailwindUnrecognizedClass = "off"`. 34 tests.

**Bug-1 Tailwind FULL fix waves (NEW S108):**
- `compiler/tests/unit/bug-1-tailwind-arbitrary-value-emit.test.js` (wave 1, `37f8f62`) — grid/flex/aspect families + underscore-as-space + ratio shape + grid-track CSS functions (repeat/minmax/fit-content). 66 tests.
- `compiler/tests/unit/bug-1-tailwind-minor-families.test.js` (wave 2, `bdb9287`) — transition/timing family (transition/duration/delay/ease) + cubic-bezier/steps function support + individual transforms (rotate/scale/translate) + outline family. 26 tests.
- `compiler/tests/unit/bug-1-tailwind-transform-shorthand.test.js` (wave 3, `a40ac64`) — `transform-*` shorthand + 9 directional decl-transforms (translate-x/y, scale-x/y, rotate-x/y/z, skew-x/y) + 14 more function names in VALID_MATH_FUNCTIONS. 23 tests.

**Bug-4 `?{` markup-text-mode C-narrow gate (NEW S108 — `eba8ded`):**
- `compiler/tests/unit/bug-4-docs-mode-escape.test.js` — verifies removal of `?{` recognition from block-splitter.js markup-text loop (~line 1443 + comment block). `?{` is now a SQL opener only inside Logic context per SPEC §3.1 + §8.1 / §4.17. 8 dedicated tests; 3 existing block-splitter.test.js cases updated to C-narrow semantics.

**PGO Phase 3 C2 fold (NEW S108 — `1bf2135..ae9bca4`):**
- `compiler/tests/unit/pgo-c2-markup-forstmt-fold.test.js` — `detectMarkupForStmtChunkPresence` TAB-time walker caches `hasChunkedMarkupTag` + `hasForStmt` booleans on FileAST. emit-client.ts gates `buildFunctionBodyRegistry` (skip when no for-stmt) + elides markup tag-test per-node when no chunked-markup-tag. Mirrors S102 hasResetExpr + S106 hasEqualityExpr Option-2 pattern. 25 tests.

## New Tests Since S106 Baseline (S107 — carry-forward inventory)

**Match block-form Phase 1 + 2 (S107):**
- `match-block-parser-phase1.test.js` (236L, 9 tests) — ast-builder dispatcher `kind: "match-block"` AST node.
- `match-block-phase2.test.js` (354L, 18 tests) — match-statechild-parser.ts + 5 SYM PASS 20 diagnostics.

**Bug-3 [BS] / [TAB] file:line:col carry (S107):**
- `bug-3-diagnostic-file-paths.test.js` (147L, 6 tests) — api.js `collectErrors(stageName, errors, filePath)` enrichment.

**Bug-5 `${IDENT}` Phase 1+2 (S107):**
- `bug-5-const-interpolation.test.js` (375L, 26 tests) — Phase 1 (19) + Phase 2 (7); fixture-shape edits to `engine-event-handler-writes.test.js` (regex pattern for cross-test ordering stability).

**Match block-form Phase 1 (NEW S107 — `82c48fd`):**
- `compiler/tests/unit/match-block-parser-phase1.test.js` (236 lines, 9 tests) — exercises ast-builder.js dispatcher case `block.name === "match"` produces `kind: "match-block"` AST node directly (NOT via the markup pipeline). Verifies: forType (bareword from `for=`); onExprRaw (raw `on=` text or null); armsRaw (raw body text between opener + `</match>` / `</>` closer); STRUCTURAL_RAW_BODY_ELEMENTS BS gate; `:`-shorthand cases parsed correctly (Phase 1 deferred to Phase 2).

**Match block-form Phase 2 (NEW S107 — `c91fae0`):**
- `compiler/tests/unit/match-block-phase2.test.js` (354 lines, 18 tests) — exercises match-statechild-parser.ts re-tokenization + SYM PASS 20 diagnostics. Three body forms (self-closing / `:`-shorthand / bare-body) + wildcard `<_>` + parenthesized payload bindings. 5 SYM diagnostic firings: W-MATCH-RULE-INERT / E-MATCH-EFFECT-FORBIDDEN / E-MATCH-ONTRANSITION-FORBIDDEN / E-MATCH-NOT-EXHAUSTIVE / E-MATCH-ON-REQUIRED. Both fire-positive AND fire-negative happy-path cases.

**Bug-3 [BS] / [TAB] file:line:col carry (NEW S107 — `2e9f9c3`):**
- `compiler/tests/unit/bug-3-diagnostic-file-paths.test.js` (147 lines, 6 tests) — api.js `collectErrors(stageName, errors, filePath)` enrichment. BS error stamps filePath; TAB error stamps filePath; mixed-stream stability (sibling W-LINT-* unchanged); bsSpan→span normalization for legacy BS errors; backward-compatible default filePath=null.

**Bug-5 `${IDENT}` non-reactive interpolation (NEW S107 — `c70176e` + `a7fbfa8`):**
- `compiler/tests/unit/bug-5-const-interpolation.test.js` (375 lines, 26 tests) — **Phase 1** (19 tests): emit-event-wiring.ts:928 missing-else-branch + one-shot DOMContentLoaded textContent write for non-reactive (const-folded) identifier interpolations; tilde-context guard; reactive identifier path unchanged. **Phase 2** (7 tests): emit-html.ts:1672 stmtContainsRenderableLogic classifier (closes Anomaly B phantom `<span data-scrml-logic>` from decl-only bodies); emit-reactive-wiring.ts:389 orphan-filter regex (closes Anomaly C orphan `IDENT;` no-op JS).
- **Fixture-shape edits to existing tests:** `compiler/tests/browser/engine-event-handler-writes.test.js` had 4 brittle assertions on `_scrml_attr_onclick_2` hardcoded counter (Bug-5 Phase 1 surfaced + fixed via kind-guard restriction); refactored to regex pattern `_scrml_attr_onclick_\d+` for cross-test ordering stability.

## New Tests Since S101 Baseline (S102-S106 — carry-forward inventory)

**§41.16 tableFor (S105 — agent-dispatched + S67 file-delta land):**
- compiler/tests/unit/table-for.test.js — 68 unit tests covering 13 E-TABLEFOR-* error codes
- compiler/tests/integration/table-for.test.js — 16 integration tests covering end-to-end compile

**§48.6.4 pinned fn (S105 — PA-direct):**
- compiler/tests/unit/pinned-fn-parser.test.js — 16 tests; 6 form variants + regression baselines
- compiler/tests/unit/pinned-fn-forward-ref.test.js — 14 tests; SYM PASS 19 fires E-STATE-PINNED-FORWARD-REF

**REACTIVE_BOOL_ATTRS dispatch (S105 — PA-direct):**
- compiler/tests/unit/reactive-bool-attrs.test.js — 13 tests; disabled/readonly/required + formFor synth submit button

**§41.15 schemaFor (S104 — agent-dispatched):**
- compiler/tests/unit/schema-for.test.js — 53 unit tests covering 8 E-SCHEMAFOR-* codes
- compiler/tests/integration/schema-for.test.js — 9 integration tests; OQ-SCH-12 enum lowering verification

**§41.14 formFor (S102):**
- compiler/tests/unit/form-for.test.js — 8 E-FORMFOR-* error codes; +58 tests
- compiler/tests/unit/form-for-expander.test.js — expandFormFor() unit tests
- compiler/tests/conformance/conf-form-for-canonical.test.js — end-to-end conformance

**§42.2.4 paren-form `is some` / `is not` fix (S103):**
- compiler/tests/unit/not-keyword.test.js — updated; 6 tests covering tmpvar-free shape

**Phase 3.B B2 same-keys-in-same-order fast-path (S106 — `b267d36`):**
- 11 new unit tests in runtime-template tests: 1000-item canonical partial-update + swap-rows + count mismatch + key mismatch + keyFn invocation count + pre-existing fast-path hits unchanged

**PGO C1 hasEqualityExpr (S106 — `c491b12`):**
- 15 new unit tests: empty/one-`==`/`!=` in if-condition/no equality ops/deep equality in function bodies + markup attrs/coexistence with hasResetExpr

**COMPOUND-STATE-DECL-AUTOLIFT (S102):**
- compiler/tests/conformance/conf-COMPOUND-STATE-DECL-AUTOLIFT.test.js — conformance test for compound state declaration auto-lift behavior

**M1.5 native-parser template-mode tracking (S102):**
- compiler/tests/parser-conformance-lexer.test.js — updated: M1.5 template-mode tracking

**Self-host AST parity (S102+S106):**
- compiler/tests/self-host/ast.test.js — strip `hasResetExpr` + `_p3aExport*` (S102) + `hasEqualityExpr` (S106) before parity comparison

## A-5 Integration Fixtures  [compiler/tests/integration/fixtures/a5/]

| Fixture | Used by |
|---------|---------|
| fixtures/a5/multipage-multirole/routes/{index,loads,admin}.scrml | A-5.1 FX-1 cornerstone |
| fixtures/a5/cross-file/app.scrml + components/header.scrml | A-5.2 FX-2 cross-file |
| fixtures/a5/lint-large-initial-chunk.scrml | A-5.4 FX-7 W-CG-CHUNK-LARGE fixture |
| fixtures/a5/lint-no-prefetch/routes/{index,other}.scrml | A-5.4 FX-8a W-CG-CHUNK-NO-PREFETCH |
| fixtures/a5/lint-prefetch-unresolved/routes/{about,index}.scrml | A-5.4 FX-8b W-CG-CHUNK-PREFETCH-UNRESOLVED |
| fixtures/a5/runtime-fallback-async-gate.scrml | A-5.4 FX-5 W-AUTH-RUNTIME-FALLBACK |

## Test Categories

| Category | Path | Approx Count |
|----------|------|--------------|
| Unit (named) | compiler/tests/unit/ (top-level .test.*) | ~487 files (S107: +4 new files; up from ~484 at S105) |
| Integration | compiler/tests/integration/ | ~52 files |
| Conformance (top-level) | compiler/tests/conformance/ (top-level) | ~28 files |
| Conformance (subtrees) | compiler/tests/conformance/block-grammar, s32-fn-state-machine, tab | ~77 files |
| Parser conformance | compiler/tests/parser-conformance-lexer.test.js + parser-conformance.test.js | 2 test files + bench corpus |
| Browser | compiler/tests/browser/ | 11 files (S107: engine-event-handler-writes regex refactor) |
| LSP | compiler/tests/lsp/ | 10 files |
| Self-host | compiler/tests/self-host/ | 4 files |
| Commands | compiler/tests/commands/ | 6 files |
| E2E (Playwright) | e2e/tests/ | 5 spec files (3-browser) |

## Unit Test Coverage Highlights (S107 — new tracks)

**§18.0.1 match block-form [NEW S107]**
match-block-parser-phase1.test.js asserts `kind: "match-block"` AST node with `forType` + `onExprRaw` + `armsRaw` from ast-builder.js (Phase 1, BS-layer COMPOUND_LIFT_EXEMPT_TAGS extended + STRUCTURAL_RAW_BODY_ELEMENTS new Set). match-block-phase2.test.js exercises match-statechild-parser.ts re-tokenization + 5 SYM PASS 20 diagnostics (W-MATCH-RULE-INERT / E-MATCH-EFFECT-FORBIDDEN / E-MATCH-ONTRANSITION-FORBIDDEN / E-MATCH-NOT-EXHAUSTIVE / E-MATCH-ON-REQUIRED).

**Bug-3 `[BS]` + `[TAB]` file:line:col carry [NEW S107]**
bug-3-diagnostic-file-paths.test.js exercises api.js `collectErrors(stageName, errors, filePath)` enrichment. BS error stamps filePath; TAB error stamps filePath; bsSpan→span normalization for legacy BS errors. Sibling [W-LINT-*] stream unchanged.

**Bug-5 `${IDENT}` non-reactive interpolation [NEW S107]**
bug-5-const-interpolation.test.js exercises emit-event-wiring.ts:928 (Phase 1 — one-shot DOMContentLoaded textContent write) + emit-html.ts:1672 (Phase 2 — stmtContainsRenderableLogic classifier closes phantom `<span data-scrml-logic>`) + emit-reactive-wiring.ts:389 (Phase 2 — orphan-filter regex closes orphan `IDENT;` no-op JS).

## Unit Test Coverage Highlights (S102-S106 carry-forward)

**§41.14 formFor [S102]**
form-for.test.js (8 error-code validation tests + edge cases) + form-for-expander.test.js (AST expansion unit tests) + conf-form-for-canonical.test.js (end-to-end compile conformance). expandFormFor() is type-system-stage expansion — no codegen-stage changes.

**§42.2.4 paren-form fix [S103]**
not-keyword.test.js §42.2.4 Phase A describe (DQ-12): paren-form `is not` / `is some` / `is not not` lower without `_scrml_tmp_N` tmpvar.

**PGO P3.B follow-up [S102] + PGO C1 [S106]**
self-host/ast.test.js strips `hasResetExpr` (S102) and `hasEqualityExpr` (S106) before AST parity comparison.

**Phase 3.B B2 [S106]**
runtime-template tests: 11 new unit tests for `_scrml_reconcile_list` same-keys-in-same-order fast-path; -42% partial-update wall.

**M1.5 native-parser template-mode tracking [S102]**
parser-conformance-lexer.test.js tokenizer helper updated; template-mode tracking in Acorn oracle disambiguates regex-vs-division at template interpolation sites.

## M1.x Native Parser Conformance [S99-S103]

parser-conformance-lexer.test.js [M1.1 skeleton → M1.2 strings+templates+§51.0.Q.1 → M1.3 comments → M1.4 regex → M1.5 template-mode-tracking; 97 pass at M1.4+M1.5; Acorn bench-corpus token-by-token comparison; DD §D4 P3 regex-vs-division discrimination at Ident/RParen/return sites included]

## Pipeline Stage Coverage

| File | Stage / Area |
|------|-------------|
| code-generator.test.js | Stage 8 CG |
| type-system.test.js | Stage 6 TS (updated S102 for formFor) |
| dependency-graph.test.js | Stage 7 DG |
| protect-analyzer.test.js | Stage 4 PA |
| route-inference.test.js | Stage 5 RI |
| batch-planner.test.js | Stage 7.5 BP |
| symbol-table.test.js | Symbol resolution |
| binding-registry.test.js | CG binding tracking |
| ast-builder-*.test.js | Stage 1 TAB (multiple files) |
| tokenizer-*.test.js | Tokenizer |
| not-keyword.test.js | §42 absence/presence rewrites (updated S103 — paren-form fix) |
| html-elements.test.js | html-elements registry (updated S102 for formFor element) |
| form-for.test.js | §41.14 formFor error codes (S102) |
| form-for-expander.test.js | §41.14 expand pass (S102) |
| schema-for.test.js | §41.15 schemaFor error codes + expansion (S104) |
| table-for.test.js | §41.16 tableFor error codes + expansion (S105) |
| pinned-fn-parser.test.js | §48.6.4 pinned fn AST recognition (S105) |
| pinned-fn-forward-ref.test.js | §48.6.4 SYM PASS 19 forward-ref enforcement (S105) |
| reactive-bool-attrs.test.js | REACTIVE_BOOL_ATTRS dispatch (S105) |
| **match-block-parser-phase1.test.js** | **§18.0.1 ast-builder.js `kind: "match-block"` AST node + BS-layer gates (NEW S107)** |
| **match-block-phase2.test.js** | **§18.0.1+§18.0.2 match-statechild-parser.ts + SYM PASS 20 diagnostics (NEW S107)** |
| **bug-3-diagnostic-file-paths.test.js** | **api.js collectErrors filePath carry + bsSpan→span (NEW S107)** |
| **bug-5-const-interpolation.test.js** | **emit-event-wiring + emit-html + emit-reactive-wiring bug-5 Phases 1+2 fix (NEW S107)** |
| emit-match.test.js, emit-test.test.js, emit-library.test.js, emit-lift.test.js | CG emitters |
| auth-graph-*.test.ts | Stage 7.55 AuthGraph (A-3) |
| reachability-solver-*.test.js | Stage 7.6 RS (A-2) |
| codegen-route-splitter*.test.js, chunk-*.test.js | A-4 per-route artifact splitter |

## Tags
#scrmlts #map #test #bun-test #s107 #v0.3.3 #formfor #spec-41-14 #e-formfor #schemafor #spec-41-15 #e-schemafor #tablefor #spec-41-16 #e-tablefor #l22-4-of-6 #pinned-fn-shipped #spec-48-6-4 #sym-pass-19 #sym-pass-20 #match-block #spec-18-0-1 #spec-18-0-2 #e-match-not-exhaustive #w-match-rule-inert #bug-3-diagnostic-file-paths #bug-5-const-interpolation #known-gaps #reactive-bool-attrs #paren-form-fix #dq-12 #native-parser #m1-5 #template-mode #pgo-p3 #pgo-c1 #hasResetExpr #hasEqualityExpr #self-host-ast-parity #approach-a #approach-a5 #phase-3b-b2-shipped

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
- [error.map.md](./error.map.md)
- [domain.map.md](./domain.map.md)
