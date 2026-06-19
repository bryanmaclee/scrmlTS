# sPA ss3 — codegen-expr-attr

**Launch:** `read spa.md ss3` · **Branch:** `spa/ss3` · **Worktree:** `../scrml-spa-ss3`
**Merged from:** emit-expr-residuals · is-op-bare-literal-attr · render-expr-asis

## Shared ingestion
The emit-expr accessor surface + the attribute-value/is-op/render-expr codegen+diagnostic loci:
`emit-expr.ts` `_scrml_reactive_get` module-top read emission + map-literal build + `emitSqlRef`
placeholder; `codegen/rewrite.ts` `_rewriteParenthesizedIsOp` (§42 not-unified-absence); `tokenizer.ts`
START class (`/[A-Za-z_@]/`, leading-colon exclusion); `type-system.ts` `visitAttr` per-attribute
exemption + the render-expr `of=` exhaustiveness fence (E-RENDER-NOT-ENUM); `component-expander.ts`
prop-typing (W-COMPONENT-001). Threads: how exprs lower to accessor calls; the asIs/unknown
escape-hatch must-not-false-fire rule; per-attribute value-registration.

## Core files
`compiler/src/codegen/emit-expr.ts` · `compiler/src/codegen/rewrite.ts` · `compiler/src/tokenizer.ts` · `compiler/src/type-system.ts` · `compiler/src/component-expander.ts`

## Items (least-ingestion-first)
1. **`g-component-001-coverage`** `[open]` bug LOW · tier low — W-COMPONENT-001 function-typed-prop nudge is vestigial; `isFunctionType` (:312) matches only `=>`/`(`-prefix sigs, can't fire until block-splitter `scanAttributes` tracks plain `{` depth. Entry: component-expander.ts (STALE fileHints — real :312/:1071).
2. **`s169-ordered-unordered-build`** `[open]` bug LOW · tier med — `@ordered` cell built UNORDERED from a `[:]` literal; map-literal codegen hardcodes `ordered=false` (the `@ordered` TYPE affix not propagated). Documented §59 v1 limit. Entry: emit-expr.ts:572 + runtime/stdlib/data.js.
3. **`g-bare-literal-attr-value`** `[open]` bug LOW · tier med — bare-integer `interval=` (`<poll>`/`<timer>`) + sibling value-attrs reject E-SCOPE-001 (bare numeric/bool read as ident). Extend the S186 reconnect exemption. Entry: type-system.ts `visitAttr` (:10687, exemption :10693-10704).
4. **`g-render-not-enum-asis-miss`** `[open]` bug LOW · tier med — `<render of=X/>` doesn't fence a non-enum target when X resolves to asIs (inert empty-switch no-op vs E-RENDER-NOT-ENUM). Concretize more cell-init types in the `of=` scope-lookup. Entry: type-system.ts:7673-7760.
5. **`r28-2b`** `[open]` bug LOW · tier med — leading-`:` on `:let` stripped by tokenizer START class (`:let`→`let`); admitting `:` ripples across every leading-colon attr (`bind:`/`class:`/`on:`). Works via `let` alias. Entry: tokenizer.ts:451.
6. **`emit-sql-ref-placeholder`** `[open]` experiment LOW · tier med — structured SQL ref emission unimplemented; `emitSqlRef` returns `/* sql-ref:N */` placeholder (statement-level SQL emission is the prereq). Entry: emit-expr.ts:1850 (dispatch :332).
7. **`giti-006-async-reactive-module-top-read`** `[open]` bug LOW · tier med — markup `${@var.path}` emits a module-top bare read that throws on async-initialized reactives before the fetch-stub resolves. Workaround `@data default`. Entry: emit-expr.ts (:449/:626) + emit-html.ts + emit-bindings.ts.
8. **`dq12-phase-b-bare-compound-is-op`** `[open]` feature n-a · tier med — extend the Phase-A parenthesized is-op rewrite to bare (no-parens) compound LHS exprs. Entry: codegen/rewrite.ts `_rewriteParenthesizedIsOp` (:715-775).

## Progress
`ss3.progress.md`. Land on `spa/ss3`; ping PA inbox when ready. Do not advance main / do not push.
