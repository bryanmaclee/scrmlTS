# Phase A1c — Step C11: `<errors of=expr/>` first-class element emission (L13)

**Phase:** A1c. Wave 3 sibling (parallel with C9, C10 after C8 land). **CLOSES Wave 3.**
**Estimate:** ~5-6 h focused.
**Dispatched:** 2026-05-08 (S73).
**Authority chain:** SPEC §55.8 (`<errors of=expr/>` first-class element) + L13. SCOPE-AND-DECOMPOSITION row C11 (`docs/changes/phase-a1c-codegen/SCOPE-AND-DECOMPOSITION.md:224`).

## Goal (one paragraph)

`<errors of=expr/>` is a first-class scrml structural element (per §55.8) that renders error messages from a cell's `errors` array/map. **Two scope shapes:**
- `of=@compound.field` (per-field) → reads `<compound>.<field>.errors` array; default renders first error wrapped as `<p class="scrml-error">${messageFor(errors[0])}</p>` per §55.8 line 25188-25191; `all` flag iterates the full array.
- `of=@compound` (compound rollup) → reads `<compound>.errors` object map; `all` iterates `Object.entries(...)` rendering each tag.

When `errors.length == 0`, NO DOM is produced (literally nothing rendered — not hidden via `display:none`). Body override per §55.8 line 25197-25207 lets developers replace the default render with custom markup `${(err) => <span>...</span>}`. C11 reads `messageFor` from C10's runtime helper.

## What's already in place (depth-of-survey signal)

- **C7+C8:** `<compound>.<field>.errors` arrays (per-field) and `<compound>.errors` object map (compound rollup) are derived cells emitted as of S73.
- **C10's `messageFor` helper** is the rendering function. C11 calls `messageFor(errorTag, fieldName)` for each error.
- **Existing structural elements** in the codebase: `<engine>`, `<match>`, `<onTransition>`, `<channel>`, `<schema>` — find their emit-html.ts dispatch arms as the precedent for adding `<errors>`. SPEC §4 + §24 register structural elements; survey-confirm whether `<errors>` is already in `attribute-registry.js` (per pa.md primer §12 amendment requiring this for new structural elements).
- **`<errors>` placeholder:** the markup AST already has a kind/tag for `<errors>` (this is at A1a/A1b); C11 emits the runtime DOM behavior at codegen time.

## Scope (in / out)

**IN scope (C11):**
1. **`<errors>` markup-emit dispatch** in `emit-html.ts` (or equivalent home): when the markup walker encounters an `<errors>` element, route to a NEW emitter that:
   - Reads the `of=expr` attribute. The expression is one of `@compound`, `@compound.field` (multi-level compound nav allowed per §6.3.5).
   - Reads the boolean `all` attribute (default: false → render first error only).
   - Reads the optional body — if present, body is an arrow-function-shaped expression `${(err) => <markup>}`; body REPLACES the default render.
2. **Runtime emission shape:**
   - Create a placeholder DOM element (e.g., `<span data-scrml-errors-anchor="...">`).
   - Wire a derived computation that: subscribes to the source `errors` cell; iterates entries (per `all` flag); calls `messageFor(tag, field)` per entry; produces markup; replaces the placeholder children.
   - When source `errors` is empty (`[]` or `{}`), the placeholder produces NO DOM (not hidden — empty).
3. **Body-override path:** when an arrow-function body is present, route each error tag through the body to produce the rendered markup. Body executes in a new scope with `err` as the bound parameter.
4. **No-validator-field rendering** (§55.8 line 25209-25210): `<errors of=@signup.someUnvalidated/>` is legal and produces no DOM. C11 handles trivially since `errors === []` for no-validator fields per C7+C8.
5. **Tests:** per-field of= renders first error; per-field of= with `all` renders all; compound rollup renders first per field; compound rollup with `all` iterates Object.entries; empty errors renders no DOM; body override fires per error; messageFor integration works (Level 1 inline → Level 2 registered → Level 3 default).

**OUT of scope (deferred):**
- 4-level message chain implementation — **C10 sibling**. C11 just calls `messageFor`.
- Cross-field deps — **C9 sibling**.
- Engine-state-cell validators — §55.14.

## Spec verification (pa.md Rule 4)

- **§55.8 lines 25158-25210** verbatim: `<errors of=expr/>` required attribute; `all` optional flag; default render shape (`<p class="scrml-error">${messageFor(errors[0])}</p>`); empty-errors → no DOM (not hidden); body override REPLACES default; body is arrow-function-shaped `(err) => markup`; no-validator-field legal + no DOM. ✓

## Dispatch protocol

S67 worktree-as-scratch landing.

## Authorized decisions

- **File locus:** Likely an extension to `compiler/src/codegen/emit-html.ts` (where structural elements dispatch) OR a NEW `compiler/src/codegen/emit-errors-element.ts` if cleaner separation. Survey-confirm.
- **`attribute-registry.js`:** if `<errors>` is missing from the registry, add it per pa.md primer §12 amendment (new scrml-special structural element requires registry update for VP-1 / VP-3 validation).
- **`html-elements.js`:** if `<errors>` needs adding to validator allowlist, do so.
- **Test file:** `compiler/tests/unit/c11-errors-element.test.js`.

## Sibling-dispatch awareness

Two SIBLING dispatches running in parallel: **C9** (cross-field deps; mostly test-only) and **C10** (4-level error message resolution; touches `runtime-template.js` + NEW `emit-messages.ts` + stdlib `scrml:data`). C11's PRIMARY surface (`emit-html.ts`) is YOUR territory. Avoid touching files C10 names: `runtime-template.js` (unless you ABSOLUTELY need a new helper — coordinate adds-only at end), `emit-messages.ts`, stdlib data. If `messageFor` isn't fully wired by C10 when you need it, emit a TODO + use a stub `_scrml_message_for` placeholder; PA will reconcile when both land.

## Anti-patterns reading

`scrml-support/docs/gauntlets/BRIEFING-ANTI-PATTERNS.md` if React form-error patterns creep in (`{errors.name && <span>{errors.name.message}</span>}` etc.). The first-class `<errors>` element IS the scrml form.

## File-modification inventory expected

| File | Reason |
|---|---|
| `compiler/src/codegen/emit-html.ts` (likely) | `<errors>` structural-element dispatch arm |
| `compiler/src/codegen/emit-errors-element.ts` (POSSIBLE NEW) | if cleaner separation |
| `compiler/src/attribute-registry.js` (possible) | `<errors>` attr schema if missing (per primer §12) |
| `compiler/src/html-elements.js` (possible) | validator allowlist entry if missing |
| `compiler/tests/unit/c11-errors-element.test.js` (NEW) | unit tests |
| `docs/changes/phase-a1c-step-c11-errors-element/{progress,SURVEY}.md` | crash-recovery + survey |

## Definition of Done

- All §scope IN items shipped.
- 0 regressions vs baseline (10,176 / 60 / 1 / 0 post-C8 land).
- Spec re-verified (§55.8) against SPEC.md text.
- C10's `messageFor` integration verified (or stub-noted if C10 not yet landed).
- **Wave 3 declared closed** in the final report (C8 + {C9, C10, C11} all shipped).
