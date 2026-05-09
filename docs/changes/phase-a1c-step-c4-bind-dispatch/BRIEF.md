# Phase A1c — Step C4: Bind:* dispatch (L17)

**Phase:** A1c (codegen+runtime). Wave 1 (foundational state-decl emission). **CLOSES Wave 1.**
**Position:** C4 — fourth and final step of Wave 1 (C0 ✓ S70, C1 ✓ S72, C2 ✓ S72, C3 ✓ S73, **C4 = closer**).
**Estimate:** ~3-4 h focused.
**Dispatched:** 2026-05-08 (S73).
**Authority chain:** SPEC §5.4.1 (Bind-dispatch table) + L17 (Compiler dispatches binding by render-spec; writable requires bindable). SCOPE-AND-DECOMPOSITION row C4 (`docs/changes/phase-a1c-codegen/SCOPE-AND-DECOMPOSITION.md:207`). Builds directly on C3's `LogicBinding.kind === "render-by-tag"` hookpoints.

## Goal (one paragraph)

C3 left explicit hookpoints in `binding-registry.ts` — `LogicBinding` entries with `kind === "render-by-tag"` carrying `placeholderId`, `cellName`, `renderSpecTag`, `renderSpecAttrs`, `declValidators`. C4 reads those entries and emits the JS wiring that connects each rendered DOM element to its underlying reactive cell, dispatched by render-spec element type per §5.4.1's table:

| Render-spec | bind: flavour | Event | Read | Write |
|---|---|---|---|---|
| `<input type="text"/>` (and email/url/password/etc.) | `bind:value` | `input` | `elem.value = _scrml_reactive_get("x")` | `_scrml_reactive_set("x", e.target.value)` |
| `<input type="number"/>` / `<input type="range"/>` | `bind:value` (numeric coercion) | `input` | same | `_scrml_reactive_set("x", Number(e.target.value))` |
| `<input type="checkbox"/>` | `bind:checked` | `change` | `elem.checked = _scrml_reactive_get("x")` | `_scrml_reactive_set("x", e.target.checked)` |
| `<input type="file"/>` | `bind:files` | `change` | (effect tracks @x) | `_scrml_reactive_set("x", e.target.files)` |
| `<input type="radio"/>` | `bind:group` | `change` | `elem.checked = (read === elem.value)` | `_scrml_reactive_set("x", e.target.value)` |
| `<textarea/>` | `bind:value` | `input` | same as text | same as text |
| `<select/>` | `bind:value` | `change` | same | enum-coerce per §5.4 / §14.4.1 if cell is enum-typed |

The dispatch is keyed off the `placeholderId`-based DOM selector emitted by C3 (`[data-scrml-render-by-tag="<id>"]`). The wiring shape mirrors `emit-bindings.ts:269-362` — reuse existing helper code paths where possible (don't duplicate the bind:value / bind:checked / bind:files / bind:group emission).

## What's already in place (depth-of-survey signal)

- **C3 hookpoint:** `BindingRegistry.logicBindings` already holds `kind: "render-by-tag"` entries. Filter via `registry.logicBindings.filter(b => b.kind === "render-by-tag")`.
- **Existing bind dispatch:** `emit-bindings.ts:269-362` emits the JS wiring for **source-level** `bind:*=@x` attributes. The shapes are 100% reusable for C4 — only the DRIVING SOURCE differs (LogicBinding entry vs source-level attr).
- **Numeric coercion:** existing logic at `emit-bindings.ts:280-286` reads `inputType` from element attrs to dispatch `Number(event.target.value)` for `type="number"` / `type="range"`. C4's render-by-tag bindings need the same path — the `renderSpecAttrs` field on the LogicBinding carries the input's `type` attr.
- **Enum coercion:** existing logic at `emit-bindings.ts:278, 284-286` for `<select>` + enum-typed cells uses `enumVarMap`. C4 reuses.
- **Predicate gating:** existing logic at `emit-bindings.ts:288-306` gates writes through runtime predicate checks for predicated-typed cells (§53.7.2). C4 reuses where applicable to render-by-tag wiring.
- **DOM selector:** C3 emits `data-scrml-render-by-tag="<placeholderId>"` on the rendered element. `document.querySelector('[data-scrml-render-by-tag="<id>"]')` is the C4 read.

## Scope (in / out)

**IN scope (C4):**
1. New emitter (likely in `emit-bindings.ts` or a new sibling) that walks `registry.logicBindings.filter(b => b.kind === "render-by-tag")` and emits JS wiring per the §5.4.1 dispatch table above.
2. Bind-flavour selection by render-spec element type — read from `renderSpecTag` + `renderSpecAttrs` on each LogicBinding. The dispatch logic is:
   - `tag === "input"` + attr `type === "checkbox"` → `bind:checked`
   - `tag === "input"` + attr `type === "file"` → `bind:files`
   - `tag === "input"` + attr `type === "radio"` → `bind:group`
   - `tag === "input"` + attr `type === "number"` OR `"range"` → `bind:value` with numeric coercion
   - `tag === "input"` + any other type (text/email/url/password/tel/search/etc.) → `bind:value`
   - `tag === "textarea"` → `bind:value`
   - `tag === "select"` → `bind:value` with enum-coercion if cell is enum-typed
3. Numeric coercion + enum coercion + predicate-gating pass-through where applicable (mirror `emit-bindings.ts` paths).
4. Tests covering: text input value flow (read + write); checkbox checked flow; file input change handler; number-input numeric coercion; textarea value flow; select value flow; select with enum-typed cell coercion; multi-render of same cell (two `<userName/>` placements update both DOM nodes when @userName changes).

**OUT of scope (deferred):**
- Validity-surface wiring (`@cell.isValid` / `.errors` reactivity) — **C7+ Wave 3**.
- Component render-specs (PascalCase tags) — defer per A1b B6 specifics + C3's same deferral. PascalCase use-sites pass through unchanged.
- `<x/>` for engine state-children — **C12-C15 Wave 4**.
- Custom validators (Custom() enum tag from §55.9 escape hatch) — out of L17's scope.
- Refinement-type runtime emission (§53.7.2 boundary checks) — **C16 Wave 5**. C4 only reuses the existing predicate-gating helper if it's ALREADY firing for render-by-tag bindings; do NOT extend C16's territory.

## Spec verification (pa.md Rule 4)

I (PA) verified the following spec claims before encoding them in this brief:

- **§5.4.1 table** (`SPEC.md:1318-1343`): bind:value default; bind:checked ONLY for `input type="checkbox"`; bind:files ONLY for `input type="file"`; bind:group ONLY for `input type="radio"`; non-bindable shapes already gated by B6 / C3 (E-CELL-RENDER-SPEC-NOT-BINDABLE). ✓
- **§5.4 / §14.4.1 enum coercion**: `<select>` + enum-typed cell → auto-coerce via `<EnumName>_toEnum[event.target.value]`. ✓ (Existing logic in emit-bindings.ts:278-286.)
- **§53.7.2 runtime predicate gating**: Writes to predicated-typed cells gated through `predicateToJsExpr` check. ✓ (Existing logic in emit-bindings.ts:288-306.) C4 reuses; does NOT extend.

## Dispatch protocol (worktree-as-scratch + file-delta landing)

S67 standing rule. Agent commits incrementally to its worktree branch; PA lands via `git checkout <branch> -- <files>` from main.

**On completion, agent reports:**
- WORKTREE_PATH
- FINAL_SHA
- FILES_TOUCHED list
- Tests pass count delta vs baseline (baseline at C4 dispatch: **9,895 / 60 / 1 / 0**)
- Any deferred items + reasoning
- Confirmation that C4 closes Wave 1 (C0+C1+C2+C3+C4 all shipped → Wave 1 DONE)

## Authorized decisions

- **File locus:** Most likely extension to `compiler/src/codegen/emit-bindings.ts` (where existing bind:* dispatch lives). A new sibling is also fine if cleaner. Per depth-of-survey-discount: agent is authorized to correct the locus during survey.
- **Helper refactoring:** if the existing emit-bindings.ts dispatch paths can be lifted into shared helpers consumed by both source-level bind:* AND render-by-tag bindings, that's encouraged (DRY). If lifting requires substantial restructuring beyond C4's scope, leave the helpers inline-duplicated and surface a Wave-2 cleanup follow-up.
- **Commit cadence:** WIP commits expected per global crash-recovery directive.
- **Test addition:** add unit test file `compiler/tests/unit/c4-bind-dispatch.test.js` (mirrors C1+C2+C3 naming).

## Anti-patterns reading (mandatory)

Compiler TS dispatch (NOT scrml-writing). Read for context:
- `scrml-support/docs/gauntlets/BRIEFING-ANTI-PATTERNS.md` — JSX/React/Vue/Svelte reflex catalog; relevant if you find yourself reaching for v-model / two-way binding sugar from another framework while reasoning about bind: dispatch.

## File-modification inventory expected

| File | Reason |
|---|---|
| `compiler/src/codegen/emit-bindings.ts` (most likely) OR new sibling | render-by-tag bind dispatch emitter |
| `compiler/tests/unit/c4-bind-dispatch.test.js` (NEW) | unit test coverage |
| `docs/changes/phase-a1c-step-c4-bind-dispatch/progress.md` (NEW, append-only) | crash-recovery progress trace |
| `docs/changes/phase-a1c-step-c4-bind-dispatch/SURVEY.md` (NEW) | survey output |

## Definition of Done

- All authorized items in §scope IN landed.
- Test count: 0 regressions vs baseline (9,895 pass / 0 fail). Net delta: +N pass tests (forecast +20 to +35 per Wave-1-step velocity, ~10 fewer than C3 since C4 reuses more existing infra).
- Spec claims verified against SPEC.md text directly (Rule 4).
- Progress.md captures incremental commits.
- **Wave 1 declared closed** in the final report (C0-C4 all shipped).

## Cross-refs

- C3 brief + survey: `docs/changes/phase-a1c-step-c3-render-spec-expansion/`
- A1c parent: `docs/changes/phase-a1c-codegen/SCOPE-AND-DECOMPOSITION.md`
- Master-list §0.1 (A1c row): `master-list.md`
- Existing bind dispatch reference: `compiler/src/codegen/emit-bindings.ts:269-362`
