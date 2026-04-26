# Scope C Stage 1 — Sample Classification

**Run:** 2026-04-25 by sample-classification agent
**Compiler SHA:** b1ce43217a50abe882b148d5eff66757cf6b4929
**Total samples (top-level):** 275
**Buckets:** clean=22, warn-only=229, fail=24

> S41-close baseline was clean=27 / warn=224 / fail=24. Current run shows clean=22 / warn=229 / fail=24. The shift (5 samples that previously emitted no warnings now emit `W-PROGRAM-001`) is consistent with the spec calling for explicit `<program>` roots; nothing has regressed in the FAIL bucket (still 24).

## Bucket totals

| Bucket | Count |
|---|---|
| Clean | 22 |
| Warn-only | 229 |
| Fail | 24 |

## Failing samples (24 files)

### Negative-tests (correct failures) — 1

| File | Error code(s) | Why it's negative |
|---|---|---|
| `lin-002-double-use.scrml` | E-LIN-002 | top-of-file comment indicates intentional rejection |

### Stale failures — 23

| File | Error code(s) | Probable reason |
|---|---|---|
| `channel-basic.scrml` | E-SCOPE-001 | superseded by gauntlet-s20-channels variant |
| `combined-012-login.scrml` | E-DG-002, E-SCOPE-001 | missing @ sigil idiom (post-S20 stricter scope rule); classic pattern sample using pre-strict-scope idioms |
| `comp-004-modal.scrml` | E-DG-002, E-SCOPE-001 | missing @ sigil idiom (post-S20 stricter scope rule) |
| `comp-006-alert.scrml` | E-DG-002, E-SCOPE-001 | missing @ sigil idiom (post-S20 stricter scope rule) |
| `comp-009-dropdown.scrml` | E-SCOPE-001 | missing @ sigil idiom (post-S20 stricter scope rule) |
| `comp-013-tooltip.scrml` | E-DG-002, E-SCOPE-001 | missing @ sigil idiom (post-S20 stricter scope rule) |
| `component-scoped-css.scrml` | E-SCOPE-001 | classic pattern sample using pre-strict-scope idioms |
| `css-scope-01.scrml` | E-SCOPE-001 | classic pattern sample using pre-strict-scope idioms |
| `func-007-fn-params.scrml` | E-SCOPE-001 | classic pattern sample using pre-strict-scope idioms |
| `gauntlet-r10-bun-admin.scrml` | E-SCOPE-001 | round-10 gauntlet attempt — written before strict-scope tightening |
| `gauntlet-r10-elixir-chat.scrml` | E-SCOPE-001 | round-10 gauntlet attempt — written before strict-scope tightening |
| `gauntlet-r10-odin-filebrowser.scrml` | E-DG-002, E-SCOPE-001, E-TYPE-045 | round-10 gauntlet attempt — written before strict-scope tightening |
| `gauntlet-r10-solid-spreadsheet.scrml` | E-SCOPE-001, E-SYNTAX-042 | round-10 gauntlet attempt — written before strict-scope tightening |
| `gauntlet-r10-svelte-dashboard.scrml` | E-SCOPE-001 | round-10 gauntlet attempt — written before strict-scope tightening |
| `gauntlet-r10-ts-components.scrml` | E-DG-002, E-MU-001, E-SCOPE-001 | round-10 gauntlet attempt — written before strict-scope tightening |
| `gauntlet-r10-zig-buildconfig.scrml` | E-CG-006, E-SCOPE-001 | round-10 gauntlet attempt — written before strict-scope tightening |
| `gauntlet-s79-signup-form.scrml` | E-TYPE-025 | match on asIs subject (E-TYPE-025 — needs typed subject) |
| `gauntlet-s79-theme-settings.scrml` | E-SYNTAX-002 | uses `lift` in standard function body (E-SYNTAX-002) |
| `meta-004-clean-config.scrml` | E-SCOPE-001 | uses bun.eval inside ^{} meta block (idiom changed) |
| `meta-005-nested-meta.scrml` | E-SCOPE-001 | uses bun.eval inside ^{} meta block (idiom changed) |
| `meta-010-reflect-with-config.scrml` | E-SCOPE-001 | uses bun.eval inside ^{} meta block (idiom changed) |
| `modern-006-canvas-with-helpers.scrml` | E-SCOPE-001 | classic pattern sample using pre-strict-scope idioms |
| `protect-001-basic-auth.scrml` | E-SCOPE-001 | classic pattern sample using pre-strict-scope idioms |

### Unknown failures (manual review) — 0

_None._

## Warning-only samples (229 files)

### Warning code frequency

| Warning code | Count | Bucket-leaning interpretation |
|---|---|---|
| W-PROGRAM-001 | 224 | Systemic — fires on every sample without `<program>` root. Compiler default. |
| W-LINT-007 | 9 | Stale-shape — flags `<Comp prop={val}>` JSX-style attribute braces (§5). |
| W-CG-001 | 5 | Testing-of-warnings on `sql-*` — top-level `<sql>` block suppressed from client output. |
| W-LINT-013 | 4 | Stale-shape — flags Vue-style `@click=` event shorthand (§5). |
| W-AUTH-001 | 3 | Systemic on protect/server — auto-injected auth middleware without explicit `auth=`. |
| W-LINT-002 | 2 | Stale-shape — flags `oninput=${e => @x = e.target.value}` instead of `bind:value=@x` (§5). |

### By bucket

**testing-of-warnings (6):**

- `server-002-protect.scrml` — warns: W-AUTH-001, W-PROGRAM-001
- `server-003-protect-multi.scrml` — warns: W-AUTH-001, W-PROGRAM-001
- `sql-005-insert.scrml` — warns: W-CG-001, W-PROGRAM-001
- `sql-006-update.scrml` — warns: W-CG-001, W-PROGRAM-001
- `sql-007-delete.scrml` — warns: W-CG-001, W-PROGRAM-001
- `sql-010-create-table.scrml` — warns: W-CG-001, W-PROGRAM-001

**systemic-warning (209):** all samples in this bucket emit only `W-PROGRAM-001` (no `<program>` root). Listing only the count — the entire warn-only bucket minus the special cases above.

<details><summary>Click to expand systemic-warning file list (209)</summary>

- `basic-001-empty.scrml`
- `basic-002-single-tag.scrml`
- `basic-003-nested-tags.scrml`
- `basic-004-self-closing.scrml`
- `basic-005-attributes.scrml`
- `basic-006-deep-nesting.scrml`
- `basic-007-siblings.scrml`
- `basic-008-semantic-html.scrml`
- `basic-009-lists.scrml`
- `basic-010-table.scrml`
- `basic-011-form.scrml`
- `basic-012-mixed-content.scrml`
- `basic-013-inferred-closers.scrml`
- `basic-014-multiple-attrs.scrml`
- `basic-015-heading-levels.scrml`
- `combined-001-counter.scrml`
- `combined-002-todo.scrml`
- `combined-003-form-validation.scrml`
- `combined-004-data-table.scrml`
- `combined-005-dashboard.scrml`
- `combined-006-search-filter.scrml`
- `combined-007-crud.scrml`
- `combined-008-wizard.scrml`
- `combined-009-chat.scrml`
- `combined-010-theme-switcher.scrml`
- `combined-011-shopping-cart.scrml`
- `combined-013-blog.scrml`
- `combined-014-settings.scrml`
- `combined-015-user-list.scrml`
- `combined-016-notification.scrml`
- `combined-017-color-picker.scrml`
- `combined-018-timer.scrml`
- `combined-019-gallery.scrml`
- `combined-020-calculator.scrml`
- `combined-021-component-basic.scrml`
- `comp-001-basic.scrml`
- `comp-002-card.scrml`
- `comp-003-button.scrml`
- `comp-005-tabs.scrml`
- `comp-007-breadcrumb.scrml`
- `comp-008-avatar.scrml`
- `comp-010-progress.scrml`
- `comp-011-badge.scrml`
- `comp-012-pagination.scrml`
- `comp-014-accordion.scrml`
- `comp-015-search-input.scrml`
- `control-001-if-basic.scrml`
- `control-002-if-else.scrml`
- `control-003-if-elseif.scrml`
- `control-004-for-array.scrml`
- `control-005-for-index.scrml`
- `control-006-nested-if.scrml`
- `control-007-while.scrml`
- `control-008-for-in-markup.scrml`
- `control-009-conditional-attr.scrml`
- `control-010-nested-loops.scrml`
- `control-011-if-reactive.scrml`
- `control-012-for-lift-complex.scrml`
- `control-013-switch.scrml`
- `control-014-break-continue.scrml`
- `control-015-try-catch.scrml`
- `css-001-inline.scrml`
- `css-002-multiple-props.scrml`
- `css-003-custom-props.scrml`
- `css-004-layout.scrml`
- `css-005-typography.scrml`
- `edge-001-empty-logic.scrml`
- `edge-002-empty-css.scrml`
- `edge-003-empty-meta.scrml`
- `edge-004-only-comments.scrml`
- `edge-005-deep-logic.scrml`
- `edge-006-url-in-attr.scrml`
- `edge-007-special-chars.scrml`
- `edge-008-mixed-closers.scrml`
- `edge-009-nested-sql-in-logic.scrml`
- `edge-010-css-in-markup.scrml`
- `error-001-basic.scrml`
- `error-002-multiple-arms.scrml`
- `error-003-wildcard.scrml`
- `error-004-in-logic.scrml`
- `error-005-typed.scrml`
- `func-001-basic.scrml`
- `func-002-params.scrml`
- `func-003-onclick.scrml`
- `func-004-reactive-mutation.scrml`
- `func-005-multiple.scrml`
- `func-006-fn-shorthand.scrml`
- `func-008-onsubmit.scrml`
- `func-009-oninput.scrml`
- `func-010-server.scrml`
- `func-012-multiple-events.scrml`
- `func-013-return-value.scrml`
- `func-014-nested-calls.scrml`
- `func-015-event-with-args.scrml`
- `gauntlet-r10-go-contacts.scrml`
- `gauntlet-r10-htmx-feedback.scrml`
- `gauntlet-r10-vue-datatable.scrml`
- `gauntlet-s79-calculator.scrml`
- `gauntlet-s79-counter-todo.scrml`
- `integration-001-stripe-mini.scrml`
- `is-not-compound.scrml`
- `lift-001-basic.scrml`
- `lift-002-transformed.scrml`
- `lift-003-nested-markup.scrml`
- `lift-004-conditional.scrml`
- `lift-005-table-rows.scrml`
- `lift-006-list-items.scrml`
- `lift-007-with-index.scrml`
- `lift-008-self-closing.scrml`
- `lift-009-string-expr.scrml`
- `lift-010-complex.scrml`
- `logic-001-let-decl.scrml`
- `logic-002-const-decl.scrml`
- `logic-003-arithmetic.scrml`
- `logic-004-string-ops.scrml`
- `logic-005-boolean-expr.scrml`
- `logic-006-ternary.scrml`
- `logic-007-multiple-blocks.scrml`
- `logic-008-nested-logic.scrml`
- `logic-009-expressions.scrml`
- `logic-010-array-decl.scrml`
- `logic-011-object-decl.scrml`
- `logic-012-nested-objects.scrml`
- `logic-013-method-calls.scrml`
- `logic-014-template-literal.scrml`
- `logic-015-multiline.scrml`
- `machine-002-traffic-light.scrml`
- `match-001-nested-with-call.scrml`
- `match-as-expression.scrml`
- `match-colon-arrow.scrml`
- `meta-001-basic.scrml`
- `meta-002-with-logic.scrml`
- `meta-003-function.scrml`
- `meta-003-runtime-var-error.scrml`
- `meta-005-nested.scrml`
- `meta-006-reflect-unknown-type.scrml`
- `meta-007-reflect-enum-buttons.scrml`
- `meta-008-reflect-struct-form.scrml`
- `meta-009-multiple-runtime-vars-error.scrml`
- `modern-001-state-with-tests.scrml`
- `modern-005-ref-and-state.scrml`
- `reactive-001-basic-decl.scrml`
- `reactive-002-multiple.scrml`
- `reactive-003-string.scrml`
- `reactive-004-number.scrml`
- `reactive-005-boolean.scrml`
- `reactive-006-array.scrml`
- `reactive-007-object.scrml`
- `reactive-008-null.scrml`
- `reactive-009-empty-string.scrml`
- `reactive-010-empty-array.scrml`
- `reactive-011-with-logic.scrml`
- `reactive-012-computed.scrml`
- `reactive-013-nested-markup.scrml`
- `reactive-014-form-state.scrml`
- `reactive-015-complex-init.scrml`
- `reactive-016-bind-value.scrml`
- `reactive-017-arrays.scrml`
- `reactive-018-class-binding.scrml`
- `ref-001-basic.scrml`
- `ref-002-in-logic.scrml`
- `ref-003-attribute-access.scrml`
- `ref-004-with-state.scrml`
- `ref-005-multiple-refs.scrml`
- `server-001-state-block.scrml`
- `server-004-server-func.scrml`
- `server-005-mixed.scrml`
- `server-006-state-with-tables.scrml`
- `server-007-client-only.scrml`
- `server-008-form-handler.scrml`
- `server-009-server-fn.scrml`
- `server-010-multiple-state.scrml`
- `sql-001-basic-select.scrml`
- `sql-002-where.scrml`
- `sql-003-join.scrml`
- `sql-004-count.scrml`
- `sql-008-order-limit.scrml`
- `sql-009-multiple.scrml`
- `state-001-basic-constructor.scrml`
- `state-002-typed-attrs.scrml`
- `state-003-constructor-with-logic.scrml`
- `state-004-instantiation.scrml`
- `state-005-const-binding.scrml`
- `state-006-nested-state.scrml`
- `state-007-html-attrs.scrml`
- `state-008-default-values.scrml`
- `test-001-basic.scrml`
- `test-003-multiple-tests.scrml`
- `test-004-assert-equals.scrml`
- `test-005-test-state.scrml`
- `test-006-test-sql.scrml`
- `test-007-test-function.scrml`
- `test-010-nested-context.scrml`
- `transition-001-basic.scrml`
- `type-001-enum.scrml`
- `type-002-struct.scrml`
- `type-003-tuple.scrml`
- `type-004-enum-use.scrml`
- `type-005-multiple-types.scrml`
- `type-006-struct-nested.scrml`
- `type-007-enum-simple.scrml`
- `type-008-type-no-kind.scrml`
- `type-009-with-functions.scrml`
- `type-010-struct-many-fields.scrml`
- `type-011-enum-many-variants.scrml`
- `type-012-struct-optional.scrml`
- `type-013-type-with-reactive.scrml`
- `type-014-type-before-markup.scrml`
- `type-015-combined.scrml`

</details>

**stale-shape (14):** files emitting one or more `W-LINT-*` codes (anti-pattern lints fire on samples that still use foreign-framework idioms or pre-strict-scope shapes).

- `gauntlet-r10-rails-blog.scrml` — warns: W-AUTH-001, W-CG-001, W-LINT-002, W-PROGRAM-001
- `gauntlet-r10-rust-orders.scrml` — warns: W-LINT-002
- `library-mode-types.scrml` — warns: W-LINT-007
- `meta-004-config.scrml` — warns: W-LINT-007, W-PROGRAM-001
- `meta-012-reflect-callback-param.scrml` — warns: W-LINT-007
- `meta-013-runtime-meta-dg002.scrml` — warns: W-LINT-013
- `modern-002-projection.scrml` — warns: W-LINT-007, W-PROGRAM-001
- `modern-003-full-app.scrml` — warns: W-LINT-007, W-LINT-013, W-PROGRAM-001
- `snippet-002-parametric.scrml` — warns: W-LINT-007
- `state-009-enum-in-state.scrml` — warns: W-LINT-007, W-PROGRAM-001
- `state-010-struct-state-combo.scrml` — warns: W-LINT-007, W-PROGRAM-001
- `test-002-with-logic.scrml` — warns: W-LINT-013, W-PROGRAM-001
- `test-008-test-enum.scrml` — warns: W-LINT-007, W-PROGRAM-001
- `test-009-test-reactive.scrml` — warns: W-LINT-013, W-PROGRAM-001

**unknown (0):**

_None._

## Clean samples (22 files)

- `gauntlet-r10-react-wizard.scrml`
- `lin-001-basic-linear.scrml`
- `machine-basic.scrml`
- `meta-001-emit-html.scrml`
- `meta-001-reflect-enum.scrml`
- `meta-002-reflect-struct.scrml`
- `meta-002-reflect.scrml`
- `meta-011-for-of-loop.scrml`
- `meta-component-gen.scrml`
- `meta-conditional-markup.scrml`
- `meta-data-table.scrml`
- `meta-loop-gen.scrml`
- `meta-style-gen.scrml`
- `modern-004-canary-pattern.scrml`
- `modern-007-dnd-with-helpers.scrml`
- `multi-meta-source-order.scrml`
- `payload-variants-001.scrml`
- `postgres-program-driver.scrml`
- `snippet-001-basic-slot.scrml`
- `state-type-001-custom.scrml`
- `when-001-basic-effect.scrml`
- `when-002-message-handler.scrml`

## Notes for the PA

### Surprising findings

1. **Zero failures matched the negative-test filename heuristic** (`error-`, `invalid-`, `bad-`, etc.). Only one sample (`lin-002-double-use.scrml`) self-identifies as a negative test via top-of-file comment ("The compiler should reject this with E-LIN-002"). Effectively the `samples/compilation-tests/*.scrml` top-level set is **almost entirely happy-path samples**; intentionally-failing examples live elsewhere or are encoded only by content. Worth confirming whether the project intends to keep negative tests in this directory at all.
2. **Half the FAIL bucket (12 of 24) is the same root cause: missing `@` sigil on reactive vars in attribute values.** The error message ("Unquoted identifier \`isOpen\` in attribute \`if\` references the reactive variable \`@isOpen\` without its \`@\` sigil.") fires on `comp-004-modal`, `comp-006-alert`, `comp-009-dropdown`, `comp-013-tooltip`, `combined-012-login`, and several gauntlet-r10 files. This is one stale idiom, not 12 distinct bugs — a single batch refresh of these samples (and a clear note in the spec migration log) would unstick most of the FAIL bucket.
3. **`W-PROGRAM-001` dominates the warn-only bucket (224 of 229 samples ≈ 97.8%).** Effectively every top-level sample triggers it. Either (a) the warning is too eager — many samples are intentionally minimal demos that don't need a `<program>` root, or (b) the samples should be migrated to wrap content in `<program>`. Recommendation below.

### Top 3 stale-shape patterns observed

1. **Missing `@` sigil on reactive vars in attribute values** (12+ FAIL samples): `<div if=isOpen>` instead of `<div if=@isOpen>`. Post-S20 strict-scope tightening means unqualified identifiers in attributes resolve to nothing.
2. **Foreign-framework event syntax in lint warnings**: `@click="handler"` (Vue) flagged by `W-LINT-013`, `oninput=${e => @x = e.target.value}` (React) flagged by `W-LINT-002`, `<Comp prop={val}>` (JSX) flagged by `W-LINT-007`. These appear in larger gauntlet samples (`gauntlet-r10-rails-blog`, `modern-003-full-app`, `gauntlet-r10-svelte-dashboard`) where the dev imported their home-framework's idioms wholesale.
3. **`bun.eval` inside meta blocks** (`meta-004-clean-config`, `meta-005-nested-meta`, `meta-010-reflect-with-config` all FAIL with `E-SCOPE-001`). The `^{} let X = bun.eval(...)` pattern doesn't bind `X` into the surrounding markup-evaluation scope under current rules.

### Warning codes worth investigating

- **`W-PROGRAM-001` (224 hits):** by far the highest volume, but probably *correct* — it is the compiler nudging samples toward explicit `<program>` wrapping. Decision needed: do we want every sample to gain a `<program>` root (mass migration), or do we want to soften this warning to fire only when DB/auth/HTML-spec config is implicitly required? Either is fine — the current state pollutes warn-only counts.
- **`W-LINT-007` (9 hits), `W-LINT-013` (4), `W-LINT-002` (2):** these are doing exactly their job — flagging foreign-framework migrations. The 9 `W-LINT-007` hits cluster in larger sample files (`modern-002-projection`, `modern-003-full-app`, `state-009-enum-in-state`, etc.). Worth a one-time refresh pass to either (a) clean up the JSX braces, or (b) tag these files as "dev-onboarding showcase: see how lints catch your old habits" so the warnings are intentional.
- **`W-CG-001` (5 hits, all `sql-*`):** likely intentional — the `sql-005-insert`/`-006-update`/`-007-delete`/`-010-create-table` samples demonstrate top-level SQL blocks getting suppressed from client output. Confirm with the SQL feature owner; if intentional, mark these as testing-of-warnings explicitly.
- **`W-AUTH-001` (3 hits, all server/protect):** also likely intentional — `protect-001-basic-auth`, `server-002-protect`, `server-003-protect-multi`, `gauntlet-r10-rails-blog` exercise auth-middleware auto-injection. Worth one explicit acknowledgement so it's not classified as drift.

## Tags

#scope-c #stage-1 #sample-classification

## Links

- /home/bryan-maclee/scrmlMaster/scrmlTS/master-list.md
- /home/bryan-maclee/scrmlMaster/scrmlTS/compiler/SPEC.md
- Raw audit data (TSV + per-file logs): `/home/bryan-maclee/scrmlMaster/scrmlTS/docs/audits/.scope-c-audit-data/`
