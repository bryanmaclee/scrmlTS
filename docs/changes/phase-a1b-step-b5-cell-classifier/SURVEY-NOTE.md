# Phase A1b Step B5 — Survey Note (cell classifier)

**Date:** 2026-05-06.
**Branch baseline:** `8479e6d` (api.js gap fix).
**Scope owner:** B5 cell classifier — annotates each `state-decl` AST node with a discriminant tag that B6 (render-by-tag) and B7 (derived-cell dep DAG) consume.

---

## §1 Existing classifier-flag infrastructure on state-decl

**None.** Searched `compiler/src/` for `cellKind`, `_cellKind`, `isBindable`, `classifierFlags`, `markup-typed`. Hits are limited to:

- `ast-builder.js` — `bindable` flag for **component PROPS** (`bind name: type`), unrelated to state-cell shapes (B5's domain).
- `codegen/emit-html.ts:19-20` — `BIND_DIRECTIVE_TAGS` dictating that `bind:value` / `bind:valueAsNumber` / `bind:checked` are valid only on `input` / `textarea` / `select`. **This is the canonical bindable-element set** for B5 — no need to invent a new list.
- `types/ast.ts:547` — `RenderSpecNode` doc comment ("bindable markup AST node (input/textarea/select)") confirms the tag triplet.
- `types/ast.ts:543` — `RenderSpecNode` was created at A1a Step 5 specifically with the comment "matters for A1b's bindable-classifier" — i.e., the upstream Step left B5 a clean hook to read.

**Conclusion:** B5 introduces its annotation field from scratch on the state-decl node. No deprecated fields to migrate.

## §2 State-decl shape after B1+B2+B3+A1a

`ReactiveDeclNode` (`types/ast.ts:424-514`) carries everything B5 needs without further AST surgery:

- `shape: "plain" | "decl-with-spec" | "derived"` — the A1a Step 4 discriminant.
- `renderSpec?: RenderSpecNode | null` — Shape 2 only. `renderSpec.element: MarkupNode` with `tag: string`.
- `initExpr?: ExprNode` — Shape 1 + Shape 3 carry the RHS expression here.
- `children?: ReactiveDeclNode[]` — Variant C compound parents.
- `isConst?: boolean` — Shape 3 derived discriminant.
- `_record: StateCellRecord` — B1 already attaches; mirrors `isCompoundParent` boolean.

For Shape 3 derived, the RHS is reached via `initExpr`. To detect "markup-typed derived" we examine `initExpr.kind === "markup"` (or any wrapper convention used by ast-builder for markup expressions in expression contexts — verified below).

## §3 Where classifier work should live

**Decision: extend `compiler/src/symbol-table.ts` with PASS 4.**

Justifications:

1. **Single-walker model already established.** PASS 1 (B1 register) → PASS 2 (B2 collide) → PASS 3 (B3 resolve `@`). Adding PASS 4 keeps the AST traversal shape identical to its three siblings and re-uses the `_scope` annotations PASS 1 attached.
2. **Classifier is read-only over the AST shape A1a Step 4-6 already provides.** No fresh sub-grammar parsing, no diagnostic emission. Pure annotation.
3. **Forward-coupling.** B6 / B7 will run as further symbol-table passes (or as their own walkers reading `_record._cellKind`); keeping B5 in symbol-table.ts means a single import surface for B6/B7 consumers.
4. **PA lean was the same** (per brief §"Locate the implementation site").

A new `cell-classifier.ts` was considered and rejected: B5's surface is small enough (likely <100 lines of net code) that a sibling file would be more chrome than substance.

## §4 B5's actual surface area

Per the A1b plan B5 row + primer §4 + primer §5:

| State-decl situation | `cellKind` |
|---|---|
| `<count> = 0` (Shape 1, plain RHS) | `"plain"` |
| `<name req length(>=2)> = <input type="text"/>` (Shape 2, RHS markup is `<input>`) | `"bindable"` |
| `<bio> = <textarea/>` | `"bindable"` |
| `<role> = <select>...</select>` | `"bindable"` |
| `<agree req> = <input type="checkbox"/>` | `"bindable"` |
| `const <doubled> = @count * 2` (Shape 3 derived, non-markup) | `"plain"` |
| `const <badge> = <span class="badge">...</span>` (Shape 3 derived, markup RHS) | `"markup-typed"` |
| `<formRes> { <name> = ""; <email> = ""; }` (Variant C compound parent) | `"compound-parent"` |

Children of a compound parent classify recursively as if standalone (each is itself a Shape 1/2/3 state-decl).

The classifier is a pure switch over `shape`/`renderSpec`/`isConst`/`children` — every input is already on the AST. No deeper inspection required.

**Estimated implementation:** ~50-80 lines. **Estimated tests:** ~80 lines covering 8-10 cases. **Total:** ~1.5-2h. Likely **depth-of-survey discount #9 candidate** (planned 3-5h).

## §5 The annotated-AST field name(s)

- **`_cellKind: "plain" | "bindable" | "markup-typed" | "compound-parent"`** — required, set on `ReactiveDeclNode` via `Object.defineProperty(enumerable: false)` (same cycle-safety convention as B1's `_record` / B3's `_resolvedStateCell`).
- **`_isBindable: boolean`** — convenience accessor for B6's render-by-tag check (`<varname/>` use-site → look up cell record → if `_isBindable`, the use-site is renderable and binds; else fire `E-CELL-RENDER-SPEC-NOT-BINDABLE`). Implemented as `_cellKind === "bindable"` at classification time.

Read API: **`getCellKind(declNode: ReactiveDeclNode)`** returns `CellKind | undefined` (mirrors `getResolvedStateCell` return-shape convention — `undefined` means "not classified", which only happens for nodes not walked by SYM).

## §6 Expected B5 → B6 / B7 contract

- **B6 (render-by-tag):** at every `<x/>` markup use-site where `x` resolves to a state-cell, look up the cell's `_cellKind`. If `"plain"` (Shape 1 or non-markup Shape 3) → `E-CELL-NO-RENDER-SPEC`. If `"bindable"` or `"markup-typed"` or `"compound-parent"` → renderable. If `"bindable"` specifically → also wires bind-directive dispatch.
- **B7 (derived-cell dep DAG):** filter to `_cellKind === "plain"` or `"markup-typed"` AND `isConst === true` (i.e., Shape 3 derived) — these are the dep-graph nodes. Compound parents and Shape-2 bindables do not participate as derived sources.

The discriminant is sufficient; B6/B7 do not need additional flags from B5.

## §7 Bindable element set

Canonical: `{ "input", "textarea", "select" }`. Source of truth: `compiler/src/codegen/emit-html.ts:19-20` (`BIND_DIRECTIVE_TAGS["bind:value"]`). B5 will hard-code this set as a module-local constant; if the canon drifts, both sites must update (single-line change). Out-of-scope for B5 to wire a shared constant module.

Edge: a `<input type="checkbox"/>` is bindable (via `bind:checked` rather than `bind:value`). For B5's classification this is still `"bindable"` — the directive dispatch is A1c codegen's concern.

## §8 No errors fired

Per A1b plan §4.6 line 230: `B5 — locks L1, L3 — Error codes: — (annotates AST only)`. B5 RECORDS classification; B6 will FIRE based on B5's annotation. B5 stays scope-bounded.

## §9 Risk surface

1. **Shape 3 markup-RHS detection — VERIFIED in existing tests.** Per `tests/integration/kickstarter-v2-smoke.test.js:278-296`, the ast-builder routes `const <badge> = <span class="badge">...</span>` to a state-decl with `renderSpec` populated and `isConst === true`. The test explicitly tolerates `shape` being either `"decl-with-spec"` or `"derived"` — meaning today both share the markup-RHS routing AND A1b's classifier is the discriminator (per the test comment: "the semantic distinction between Shape 2 decl-coupled-with-render-spec (bindable input markup) and Shape 3 markup-typed derived (display markup) is A1b's job — A1b checks for `isConst` to discriminate"). **B5 IS the discriminator.** Algorithm:
   - `children` non-empty array (or empty `[]`) → `"compound-parent"` (Variant C parent).
   - Else `isConst === true` AND `renderSpec` present → `"markup-typed"`.
   - Else `isConst === true` (non-markup derived) → `"plain"` (treated same as plain for B6 render-by-tag — `<derived/>` use-site fires `E-CELL-NO-RENDER-SPEC` per primer §4 line 88).
   - Else `renderSpec` present AND `renderSpec.element.tag` ∈ {input, textarea, select} → `"bindable"`.
   - Else `renderSpec` present (non-bindable tag, non-const) → `"markup-typed"` (defensively classified; A1b/B6 may later reject as illegal Shape-2 form).
   - Else → `"plain"`.
2. **Engine state-decls (`<engine for=Phase>`)** — out of B5 scope. Engine bodies are stored as raw text per B1 docblock; B14 will introduce engine-scope walking. Defensive: if a non-`state-decl` node sneaks into the walker, no-op.
3. **Tier 3 predefined-shape compound** (`<userInfo>: UserInfo = (a, b, c)`) — has `typeAnnotation` set, `shape: "plain"`, no `children[]`. Classifies as `"plain"`. Acceptable: it has no bindable input nor markup-typed RHS. B6 will treat it as non-renderable.

## §10 Concurrency note

Brief warned: three other dispatches in flight on `compiler/src/lint-ghost-patterns.js`, `compiler/src/parser*.ts`, `compiler/src/ast-builder.js`. B5 touches **only `compiler/src/symbol-table.ts` and a new test file** — zero overlap. If `git pull --rebase` is needed mid-flight, fold and continue; the classifier code is local enough to be unaffected by any of those territories.
