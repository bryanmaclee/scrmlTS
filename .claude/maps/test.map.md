# test.map.md
# project: scrmlts
# updated: 2026-06-04T20:50:00Z  commit: 452a212b

## Test Framework
Runner: bun test (built-in Bun test runner)
Config: bunfig.toml (timeout + happy-dom preload settings)
Run all: `bun test compiler/tests/`
Run single: `bun test compiler/tests/unit/<filename>.test.js`
Coverage: `bun test compiler/tests/ --coverage`
Full suite at S159 close: 22,856 pass / 0 fail / 220 skip (~886 files counted by the runner — includes +4 unit + +1 browser new files since S158)

## Test Categories

| Category | Location | Count |
|----------|----------|-------|
| Unit | compiler/tests/unit/ | ~623 files |
| Browser (DOM) | compiler/tests/browser/ | ~32 files |
| Conformance | compiler/tests/conformance/ | ~40 files |
| Integration | compiler/tests/integration/ | ~30 files |
| Parser conformance | compiler/tests/parser-conformance*.test.js | 10 files |
| LSP | compiler/tests/lsp/ | ~8 files |
| Self-host | compiler/tests/self-host/ | ~5 files |
| CLI commands | compiler/tests/commands/ | ~5 files |
| **Total** | compiler/tests/ | **~886 .test.js files** |

## S153 New Test Files (each-in-dynamic-context sweep)

| File | Covers |
|------|--------|
| compiler/tests/browser/nested-each-in-enclosing-scope.browser.test.js | nested `<each>` (the `as` pattern) renders end-to-end (e6870f25) |
| compiler/tests/browser/component-each-in-prop-scope.browser.test.js | `<each>` in a component body over a prop-scope binding (e6870f25) |
| compiler/tests/browser/each-in-block-form-match.browser.test.js | `<each>` w/ `@.` inside a block-form `<match>` arm (3429b385) |
| compiler/tests/unit/engine-statechild-colon-shorthand-child.test.js | `:`-shorthand child inside an engine arm parses (c89c1cb1) |
| compiler/tests/unit/each-block.test.js | updated for the S153 emit-each dep-first read + reconcile-lines refactor |

## S154-S156 New Test Files

| File | Covers |
|------|--------|
| compiler/tests/conformance/conf-engine-message-dispatch-s155.test.js | E-ENGINE-ACCEPTS-NOT-ENUM / E-ENGINE-MSG-* / message-arm exhaustiveness |
| compiler/tests/unit/enum-subset-refinement.test.js | `parseEnumSubsetAnnotation()` happy + error paths |
| compiler/tests/unit/enum-subset-match-exhaustiveness.test.js | E-MATCH-SUBSET-DEAD-ARM at both match loci (type-system + PASS 20) |
| compiler/tests/unit/enum-subset-predicates.test.js | `predicateToJsExpr` `kind:"variant-set"` → `.includes()` emission |
| compiler/tests/unit/enum-subset-schemafor.test.js | `classifyFieldForSql` subset → `CHECK IN` DDL |
| (+ prior S154-S155 unit files for accepts= parser + message-arm lexer) | |

## S157-S158 New Test Files

| File | Covers |
|------|--------|
| compiler/tests/unit/each-in-tier0-lift-bug72.test.js | emit-lift.js nested `<each>` → inline reconcile, not literal DOM `<each>` |
| compiler/tests/unit/per-item-live-keyed-effect-bug64.test.js | `maybeWrapEachPerItemEffect` emits `_scrml_effect`+`_scrml_resolve_item` wrapper |
| compiler/tests/unit/reconcile-list-same-keys-fast-path.test.js | B2 fast-path still triggers `_scrml_item_by_key` rebuild |
| compiler/tests/unit/render-by-tag-nested-compound-bug60.test.js | `enclosingCompoundStack` + qualified lookup resolution |
| compiler/tests/unit/each-sigil-outside-each-bug70.test.js | `@.` outside `<each>` fires E-SYNTAX-064 not E-CODEGEN-INVALID-JS |
| compiler/tests/unit/derived-const-match-exhaustiveness-bug71.test.js | `const x = match @cell` exhaustiveness via dual-parse side-field |
| compiler/tests/unit/return-match-exhaustiveness-bug67.test.js | `return match expr { ... }` exhaustiveness |
| compiler/tests/unit/schemafor-positional-payload-enum-bug68.test.js | schemaFor payload-binding field names |
| compiler/tests/unit/lift-engine-advance-bug65.test.js | emit-lift.js engine-ctx threading; `.advance(.X)` lowers correctly |
| compiler/tests/unit/markup-attr-advance-typecheck-bug63.test.js | `onclick=@phase.advance(.V)` variant checking → E-TYPE-063 |
| compiler/tests/browser/each-per-item-reactivity-bug64.browser.test.js | live-keyed TEXT/class: bindings re-resolve on reconcile (happy-dom) |
| compiler/tests/browser/each-in-tier0-lift-bug72.browser.test.js | nested `<each>` inside lift renders correctly (happy-dom) |
| compiler/tests/browser/render-by-tag-nested-compound-bug60.browser.test.js | render-by-tag compound field end-to-end (happy-dom) |
| compiler/tests/browser/lift-engine-advance-bug65.browser.test.js | engine transition from lifted handler fires (happy-dom) |

## S159 New Test Files (Bug 73 + S154 ruling (a) HTML `:`-shorthand content-model)

| File | Covers |
|------|--------|
| compiler/tests/unit/per-item-handler-live-keying-bug73.test.js | Emit-shape assertions: Tier-1 + Tier-0 iter-reading handlers get resolve-prelude+null-guard; global handlers stay plain (iter-scope token scan negative case). 4 tests. |
| compiler/tests/unit/html-colon-shorthand-content-model-s159.test.js | §4.14 content-model rule: non-void `<span : @label>` emits interpolated body byte-identical to bare-body form; void `<input : @val>` fires E-COLON-SHORTHAND-ON-VOID; `@.`-sigil body outside `<each>` fires E-SYNTAX-064; component `:`-shorthand unaffected; E-DG-002 cleared for cells consumed via `:`-shorthand. 18 tests. |
| compiler/tests/browser/each-per-item-handler-live-keying-bug73.browser.test.js | Runtime: Tier-1 + Tier-0 array-replace-same-key handler fires with live item, not create-time snapshot; in-place field mutation handler fires with live data; global handler after removal skips correctly (happy-dom). 6 tests. |
| compiler/tests/unit/each-block.test.js | Updated for S159 Bug 73 per-item handler emit shape |

## S160 New Test Files (S154 rulings (b) and (c))

| File | Covers |
|------|--------|
| compiler/tests/unit/colon-shorthand-inside-opener-s154b.test.js | S154 ruling (b): inside-opener `:`-shorthand is canonical; after-`>` placement detected and emits `W-COLON-SHORTHAND-LEGACY-PLACEMENT` (info-level); both engine state-child and `<match>` arm paths covered; `rewriteColonShorthandPlacement()` migrates legacy arms correctly; `migrate --fix` output verified. |
| compiler/tests/unit/typed-array-no-rhs-default.test.js | S154 ruling (c): no-RHS typed decl Shape 4 — primitive types synthesize canonical-empty (`0`/`false`/`""`); bare named type synthesizes `not` init with implicit `(not to T)` lifecycle; `T[]` still synthesizes `[]`; refinement-typed no-RHS: SATISFIES predicate → no error, VIOLATES → E-REFINEMENT-NO-DEFAULT; `const` no-RHS non-array → E-DECL-NEEDS-INITIALIZER (preserved); union-admitting-absence → `not` with no lifecycle. |

## S162 New Test Files (native-parser each-promotion arc + F3 same-line match-arm)

| File | Covers |
|------|--------|
| compiler/tests/unit/native-each-promotion.test.js | S162 unit A: native parser promotes `<each>` → structural `each-block` FileAST node (`isEachBlock`/`synthEachBlockNode`); the synthesized node carries the live `each-block` shape; mirrors the `<match>` → `match-block` promotion. |
| compiler/tests/parser-conformance-each-contextual-sigil.test.js | S162 unit C: native lexer recognizes the `@.` contextual iteration sigil; bare `@.`, `@.field`, `@.a.b` dotted-chain forms lex as one `ScrmlAt` token. |
| compiler/tests/browser/each-contextual-sigil-native.browser.test.js | S162 unit B+C: end-to-end runtime — native-parsed `<each>` with `@.` per-item interp renders correctly (emit-each honors the `exprNode` contract). |
| compiler/tests/native-match-arm-same-line.test.js | S162 F3: same-line match-arm boundary detection in `parse-expr.js isAtArmBoundary` (NEWLINE gate dropped; `inMatchArmBody` + `peekStartsArmPattern`). |
| compiler/tests/parser-conformance-markup.test.js | updated S162 for the markup-classification parity surface (touched by the each-promotion arc). |

## Fixtures & Factories

| Path | Contents |
|------|----------|
| compiler/tests/fixtures/ | shared .scrml test fixtures and multi-file app stubs |
| compiler/tests/helpers/ | compile harness utilities (compileSrc, expectError, cross-stream helpers) |
| compiler/tests/conformance/block-grammar/ | block-grammar conformance fixtures |
| compiler/tests/conformance/s32-fn-state-machine/ | fn-as-state-machine conformance + REGISTRY.md |
| compiler/tests/conformance/tab/ | TAB-stage conformance fixtures |
| compiler/tests/integration/fixtures/ | integration test .scrml inputs |
| compiler/tests/parser-conformance-within-node-allowlist.json | native-parser parity allowlist (updated GITI-024) |

## Pattern

Tests are written as Bun test files using `describe` / `test` / `expect` from `bun:test`.
Unit tests invoke individual compiler passes (block-splitter, ast-builder, type-system, codegen
emit-* modules) directly via `compileSrc(source)` helpers or direct pass calls.
Conformance tests assert that specific E-/W-/I- codes appear in compile output; they use
a cross-stream helper because W-*/I-* codes land in result.warnings, not result.errors —
tests that check `result.errors.filter(e => e.code === "W-...")` silently false-pass.
Browser tests use happy-dom via `@happy-dom/global-registrator` to run emitted client JS
in a DOM environment and assert reactive behavior. The S153 each-in-dynamic-context fixes AND
the S158-S159 per-item-reactivity / handler-live-keying fixes are gated by happy-dom canaries
(not emit-string-only checks) — the S140/S152 lesson that emit-string tests mask runtime
miscompiles applies directly to these classes.
Parser conformance tests compare live-pipeline (block-splitter + ast-builder) output to
native-parser output for a large corpus; parity gaps are tracked in the within-node allowlist.
Bug 73 emit-shape tests assert the resolver-prelude pattern in the emitted JS and complement the
happy-dom browser tests that verify the runtime live-keying effect.
S160 ruling (b) tests cover both the `W-COLON-SHORTHAND-LEGACY-PLACEMENT` detection path (info-level,
so cross-stream helper required) and the `rewriteColonShorthandPlacement()` migrate output.
S160 ruling (c) tests cover the full Shape 4 dispatch matrix including the refinement-predicate
SATISFIES/VIOLATES/UNDETERMINABLE trichotomy and the `synthesizedFromNoRhs` lifecycle note path.

## Tags
#scrmlts #map #test #bun #conformance #parser-parity #happy-dom #each-in-dynamic-context #per-item-reactivity #live-keyed #bug64 #bug65 #bug72 #bug73 #colon-shorthand-html #colon-shorthand-canonical #shape4-no-rhs #s153 #s154 #s155 #s156 #s157 #s158 #s159 #s160 #native-parser #native-parser-swap #each-promotion #match-promotion #f3-match-arm #s161 #s162

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
- [build.map.md](./build.map.md)
