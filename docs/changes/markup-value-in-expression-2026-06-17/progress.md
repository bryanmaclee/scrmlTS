# markup-value-in-expression-2026-06-17 — progress

Bug: g-markup-value-ternary-fnreturn-codegen (HIGH). Markup-as-first-class-value
(Pillar 1, SPEC §1.4/§7.4, PRIMER §6.4/§6.6.17) fails to codegen in 3 forms.

## 2026-06-17 — Phase 0 findings (verified empirically)

Repro dir: /tmp/mv-repro/{a-inline,b-derived,c-fnreturn,d-control}.scrml
All 3 forms reproduce E-CODEGEN-INVALID-JS; control (d) compiles + renders.

LAYER DIAGNOSIS (different per form):

(b) DERIVED TERNARY `const <badge> = @n > 0 ? <span>pos</span> : <span>neg</span>`
  - ROOT: block-splitter (block-splitter.js). At top level it gobbles the decl
    via scanShape12DeclEnd(); the expression-RHS branch (line ~1474) returns -1
    (markup not at RHS-head), so legacy per-char accumulation runs and STOPS at
    the first `<span` markup-opener -> the ternary arms are split into SEPARATE
    top-level markup blocks. ast-builder sees only text `const <badge> = @n > 0 ?`
    -> initExpr = escape-hatch raw `@n > 0 ?` (arms DROPPED).
  - FIX LAYER: block-splitter scanShape12DeclEnd expression-RHS branch must scan
    the FULL RHS (balancing markup elements within ternary arms) so the whole
    decl stays one text block, then emit-logic's derived-ternary path lowers the
    markup arms to node-producing exprs.

(c) FN-RETURN `fn label(n:int)->markup { return <span>${n}</span> }`
  - ROOT: ast-builder `return` parser (line ~6966) has hooks for SQL/match but
    NOT markup. `return <span>...` falls to collectExpr -> markup parsed as a
    JS expr -> acorn escape-hatch raw `< span >` (mangled) + orphaned `${n}`.
  - FIX LAYER: add a markup hook to the `return` parser mirroring `lift`'s inline
    markup parse (line ~6749): `<`+IDENT/KEYWORD -> parseLiftTag -> store
    markupNode on return-stmt; emit-logic return-stmt renders via
    emitCreateElementFromMarkup.

(a) INLINE TERNARY `<div>${ @n>0 ? <span>pos</span> : <span>neg</span> }</div>`
  - ROOT: markup stays inside the interpolation (block-splitter keeps the whole
    `<div>${...}</div>` as one markup block). Emit path: reactive-display wiring
    emits `el.textContent = _scrml_reactive_get("n") > 0 ? < span > pos < / span >`
    -- markup arms emitted RAW (rewriteExpr string-path preserves raw text but
    never lowers markup to nodes). Same expression-with-markup family as (b).
  - FIX LAYER: emit layer (interpolation lowering) — markup in expression
    position must lower to a node-producing expression (markup factory / inline
    createElement), routed through emitCreateElementFromMarkup.

CONTROL (d) `const <x> = <span>${@n}</span>`: bare-markup RHS -> renderSpec.element
  -> _scrml_markup_factory_x_2() via emitCreateElementFromMarkup. WORKS. The
  factory pattern is the lowering target for all three broken forms.

## Next
- [ ] Fix (c) fn-return markup hook (parse + emit) — smallest, self-contained.
- [ ] Fix (b) block-splitter RHS scan so markup-in-expr stays one block; emit lowering.
- [ ] Fix (a) interpolation emit lowering for markup in ternary arms.
- [ ] R26 verify all 3 + control; full suite; regression test.
