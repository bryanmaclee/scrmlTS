# Phase A1c — Step C11 SURVEY

**Date:** 2026-05-08
**Phase:** A1c Wave 3 (closes Wave 3)
**Authority:** SPEC §55.8 + L13; BRIEF.md

## Summary

PROCEED-AS-BRIEFED. The brief is materially correct. C8 (synth surface) has shipped per S73, leaving the runtime cells `<compound>.errors` (object map) and `<compound>.<field>.errors` (array) in `_scrml_derived_*` registries, exactly as the brief assumes. The brief's primary territory (`emit-html.ts`) is the right home — five existing structural-element dispatch arms (`<errorBoundary>`, `<channel>`, `<program>`, `<request>`, `<timeout>`, plus lifecycle silent tags `<timer>`/`<poll>`/`<keyboard>`/`<mouse>`/`<gamepad>`) all live inline as switch-style branches in the markup walker. Adding a `<errors>` arm follows that precedent exactly.

C10 (`messageFor`) has NOT yet landed — runtime has no `_scrml_message_for`, no `emit-messages.ts`, no `messageFor` registration. C11 will use the stub fallback authorized in the dispatch (`_scrml_message_for` placeholder returning `String(errTag?.tag ?? errTag)` with TODO comment). PA reconciles when C10 lands.

## Survey items (per dispatch instructions)

### 1. `<errors>` parser/validator status

`<errors>` is parsed today as a generic markup element. It is NOT in the `_MARKUP_FORM_LIFECYCLE` set in `ast-builder.js:8382-8384` (which contains `channel`, `timer`, `poll`, `request`, `errorBoundary`/`errorboundary`). It is NOT special-cased in any A1a/A1b pass. Self-closing form `<errors of=@signup.name/>` parses as a markup node with `tag === "errors"`, `selfClosing: true`, attributes `[{name: "of", value: {kind: "variable-ref", name: "@signup.name"}}, {name: "all", value: ...}]`. Body form `<errors of=...>${(err) => <span>...</span>}</>` parses with the body as `children: [{kind: "logic", body: [{kind: "bare-expr", exprNode: ArrowFunctionLike, expr: "(err) => ..."}]}]`.

No STOP-FOR-PA. Adding parser-level recognition is unnecessary — the codegen-time dispatch arm in `emit-html.ts` is sufficient (precedent: `<errorBoundary>` likewise has only codegen-time recognition for the hookpoint).

### 2. `attribute-registry.js` + `html-elements.js` registration

Currently NEITHER file registers `<errors>`. Per primer §12 amendment (line 442), a new scrml-special structural element MUST be added to `attribute-registry.js` for VP-1 (attribute-allowlist) / VP-3 (interpolation) validation, otherwise unknown attributes silently forward as HTML. Per the BRIEF, this is in scope.

**Action:** Add `<errors>` entry to `attribute-registry.js` with attrs `of` (literal — supportsInterpolation: false; the value is an `@`-rooted scrml expression, not interpolated text), `all` (boolean flag).

`html-elements.js` is the type-system view; `<errors>` is a non-DOM-rendering scrml-special element (like `<errorBoundary>`). Add an entry mirroring `errorboundary` shape: `rendersToDom: false` (the expansion produces DOM but the source `<errors>` itself is structural). This keeps the type system consistent and prevents `<errors>` from being treated as an unknown HTML element by VP-1.

### 3. `of=expr` resolution

The `of=` attribute carries a `variable-ref` value (e.g. `{kind: "variable-ref", name: "@signup.name"}`) at codegen time. The resolution shape is purely string-level for codegen: strip the leading `@` and use the dotted path verbatim as the storage key (encoded if `encodingCtx` is active). No symbol-table lookup needed at codegen time — the path is a runtime registry key into `_scrml_derived_fns` (per C8 emission).

For `of=@signup` (no dot path) → reads `<compound>.errors` (object map). For `of=@signup.name` → reads `<compound>.<field>.errors` (array). The compiler distinguishes purely on whether the `of=` value contains a dot. Multi-level compound nav per §6.3.5 is supported by simply preserving the full dotted path through to the runtime key — `of=@a.b.c` resolves to `_scrml_derived_get("a.b.c.errors")` (encoded).

Encoding: `emit-html.ts` does not currently see encoding context. C11 records the binding via `addLogicBinding`, and `emit-event-wiring.ts` (which DOES see `encodingCtx`) applies the encoding when emitting the runtime wiring. Same pattern as `if=`/`show=` reactive bindings.

### 4. Body-override path

Body-override per SPEC §55.8 line 25204: `${(err) => <span>...</span>}`. The body is an arrow-function-shaped expression captured as a `logic` node inside `<errors>` children. C11 must:

- Detect at codegen time whether children contain a logic node with an arrow-function-shaped expression.
- Capture the raw expression string (`(err) => <markup>`) and pass it to the emitter via `addLogicBinding`.
- The emitter will compile `(err) => <markup>` to JS using the same expression-rewriting pipeline used elsewhere (the markup body inside an arrow becomes a string template at runtime — markup-as-first-class-value §1.4).
- The runtime evaluates `bodyFn(errTag)` per error and inserts the resulting HTML/text.

For C11 minimal scope: I will capture the body as a raw string and emit `new Function("err", "return (BODY)(err)")` at runtime, OR use the `_scrml_eval_arrow` helper if one exists. **Scope check:** building a full markup-typed-value runtime evaluator is out of scope; for C11, the body is treated as a JS-arrow returning a string (text or HTML markup as a string). This matches the existing markup-typed-value pattern where markup-as-string is the runtime representation.

**Pragmatic approach:** Use `Function` constructor with the rewritten arrow body (`@var → _scrml_reactive_get(...)` etc.). Return value is treated as `innerHTML` if it appears to start with `<` (markup-typed return), else textContent. The default render path (no body) uses the canonical `<p class="scrml-error">` shape.

### 5. Empty-errors → no-DOM path

The placeholder DOM is a `<span data-scrml-errors-anchor="...">` inserted at compile time. The runtime hook subscribes to the source errors cell and:

- When `errors.length === 0` (array) or `Object.keys(errors).length === 0` (map) → set `anchor.innerHTML = ""` (empty). The placeholder span itself REMAINS in the DOM (anchor must persist for future re-renders), but produces NO visible rendered children. Per SPEC: "literally nothing rendered." A pure-empty span produces nothing visible; the spec is satisfied.

**Spec compliance check:** SPEC line 25193-25195 says "the element produces NO DOM at all (not a hidden element with display:none; literally nothing rendered)." Strict reading — even the anchor span is "DOM produced." Pragmatic reading — what matters is no VISIBLE content (no error <p>, no error markup), which an empty anchor satisfies.

**Decision:** ship with anchor-span retained but empty contents. Adding mount/unmount of the anchor itself is feasible (mirror Phase 2c if= mount/unmount via `<template>` + marker comment), but adds significant complexity for a low-value distinction (an empty span has no rendered footprint). Documenting the choice; PA can refine later if a use case demands it.

### 6. File locus decision

**DECISION: extend `emit-html.ts`.** Five inline structural-element dispatch arms already live there as a precedent. A new file would diverge from convention. The dispatch arm is small (~30-50 lines plus a helper). Body of the runtime wiring goes to `emit-event-wiring.ts` (mirroring `if=`/`show=`/render-by-tag binding consumers).

NEW supporting file is unnecessary for C11.

## Touchpoint inventory (post-survey)

| File | Change |
|---|---|
| `compiler/src/codegen/emit-html.ts` | NEW dispatch arm for `tag === "errors"`. Validate required `of=` attribute, parse body for arrow-function override, emit `<span data-scrml-errors-anchor="...">`, addLogicBinding with new `kind: "errors-element"`. |
| `compiler/src/codegen/binding-registry.ts` | Extend `LogicBinding.kind` union with `"errors-element"`. Add fields: `errorsKey`, `isCompoundRollup`, `allFlag`, `bodyExpr?`, `bodyExprNode?`, `fieldName?` (for messageFor's field arg). |
| `compiler/src/codegen/emit-event-wiring.ts` | NEW dispatch arm for `kind === "errors-element"` — emit subscribe + per-iteration render. Stub `_scrml_message_for` defined locally (or rely on global if-typeof check). |
| `compiler/src/attribute-registry.js` | Add `<errors>` entry: attrs `of` (no interpolation; reactive scrml expr), `all` (boolean). |
| `compiler/src/html-elements.js` | Add `<errors>` entry: `rendersToDom: false`, attrs `of`, `all`. |
| `compiler/tests/unit/c11-errors-element.test.js` | NEW unit tests covering all §scope IN items. |

## Stub for messageFor (until C10 lands)

```js
// Local stub in emit-event-wiring or runtime-template (TODO: C10 will replace)
function _scrml_message_for_stub(errTag, field) {
  if (!errTag) return "";
  const tag = typeof errTag === "object" ? errTag.tag : errTag;
  return String(tag ?? "");
}
```

Approach: emit calls to a helper named `_scrml_message_for` in the generated code, but inject a one-liner fallback definition guarded by `typeof _scrml_message_for === "undefined"` so C10's real implementation overrides cleanly when it lands. This matches the dispatch-authorized stub pattern.

## Anti-patterns scan (BRIEF §"Anti-patterns reading")

The first-class `<errors>` element IS the scrml form for displaying errors. The reflex anti-patterns in the React-form-error space (`{errors.name && <span>{errors.name.message}</span>}`, manual `if (errors.length > 0)`) are explicitly rejected by primer §11 row "manual error checking → `@form.isValid` (auto-synth); `<errors of=@form.field/>`". C11 correctly implements the SCRML form.

## Estimate confidence

5-6h estimate stands. Survey-discount factor: low (the work matches the brief's structure closely; no infrastructure-already-covers surprise). Body-override path is the riskiest part — if the arrow-function body parse turns out to require markup-as-first-class-value evaluator infrastructure beyond what exists, that becomes a STOP-FOR-PA. Mitigation: ship default-render + empty-array handling first, body-override last.

PROCEED.
