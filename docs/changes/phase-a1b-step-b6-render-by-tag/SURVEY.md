# A1b B6 — Phase 0 Survey: Render-by-tag classifier

**Branch:** `changes/phase-a1b-step-b6-render-by-tag`
**Base:** 7334fb0 (S65 wrap)
**Baseline test count:** 9019 pass / 44 skip / 1 todo / 0 stable fail (transient ECONNREFUSED noise pre-existing)

This survey walks every named touchpoint per pa.md Rule 4 + primer §12 depth-of-survey discipline, BEFORE writing any code. Halt-and-report triggers per the dispatch brief are evaluated; surface dispositions for Bryan ratification before Phase 1 begins.

---

## §1 Spec normative reads (Rule 4 verifications)

Every B6 spec-derivative claim verified against `compiler/SPEC.md` directly.

### §1.1 §6.4 Render-By-Tag Semantics — the §6.4.1 table (line 1899)

| Cell kind | `<varname/>` legal? | Spec disposition |
|---|---|---|
| Shape 1 plain cell | NO | E-CELL-NO-RENDER-SPEC |
| Shape 2 decl-with-render-spec | YES | Expands; bind: dispatched per §5 |
| Shape 3 numeric/string derived | NO | E-CELL-NO-RENDER-SPEC |
| Shape 3 markup-typed derived | YES (via `${@varname}`) | Tag form `<varname/>` is **not supported**; line 3027 makes it E-CELL-NO-RENDER-SPEC |

**Verified (lines 1898-1904, 1927, 3027).** The §6.4 table itself omits Shape 3 markup-typed from the "tag-form is illegal" rows, but §6.4.3 line 1927 ("`<badge/>` as a tag in markup is NOT supported (use interpolation)") and §6.6.17 line 3027 ("`<derivedMarkupCell/>` as a tag SHALL be E-CELL-NO-RENDER-SPEC regardless of whether the cell is markup-typed. The tag form is for Shape 2 cells (decl-coupled-with-render-spec) only; derived cells do not have render-specs") are unambiguous: every Shape 3 (whether numeric/string or markup-typed) → E-CELL-NO-RENDER-SPEC.

### §1.2 Shape-2 with non-bindable RHS — E-CELL-RENDER-SPEC-NOT-BINDABLE

**Spec line 1798 (§6.2 Shape 2):** *"E-CELL-RENDER-SPEC-NOT-BINDABLE (compile error): The RHS markup is a non-input element (e.g., `<div>`, `<span>`). Shape 2 requires bindable markup. Use Shape 3 (`const <derived>`) for display-only markup cells."*

**Spec line 1339 (§5.4.7-ish):** *"A render-spec that is NOT bindable (a `<div>` element, a non-input HTML element with no recognised bindable shape) yields `E-CELL-RENDER-SPEC-NOT-BINDABLE` when the cell is used in markup with `<x/>` render-by-tag — the cell can be displayed via `${@x}` interpolation (the markup-as-value path, §1.4) but cannot be used as an input."*

**Critical reading.** The error fires AT the use site (`<x/>`), not at the declaration. The error message is "this Shape 2 cell's render-spec is not bindable" — the cell itself is malformed-as-Shape-2. The §34 row at line 14204 cross-references §6.2 (declaration site spec) but the line-1339 normative statement is "yields E-CELL-RENDER-SPEC-NOT-BINDABLE WHEN the cell is used in markup with `<x/>` render-by-tag." So the fire happens at the use-site walk in B6.

### §1.3 Component render-specs (PascalCase tags) — line 1341

**Spec line 1341:** *"For component render-specs (PascalCase tag): the component's prop catalog identifies the bindable prop. If a component declares no bindable prop, `<x/>` render-by-tag is `E-CELL-RENDER-SPEC-NOT-BINDABLE`."*

This requires component-prop-catalog inspection. **B6 cannot implement this today** without the component-prop substrate (B14/M18/M20 territory per the brief's halt-trigger list).

### §1.4 §34 catalog row text

**E-CELL-NO-RENDER-SPEC (§34 line 14203):** *"`<varname/>` used as render-by-tag in markup, but the cell has no render-spec (Shape 1 plain cell or Shape 3 non-markup derived). Use `${@varname}` interpolation to display the value."*

**E-CELL-RENDER-SPEC-NOT-BINDABLE (§34 line 14204):** *"Shape 2 declaration (`<name req> = <markup>`) where the RHS markup element is not bindable (e.g., `<div>`, `<span>`). Shape 2 requires a bindable form element. Use `const <name>` (Shape 3) for display-only markup cells."*

### §1.5 Compound parents — SPEC IS SILENT on `<compoundParent/>` self-closed render-by-tag

`grep "compound.*render-by-tag\|<formRes/>\|compound parent.*tag" SPEC.md` returns nothing for the self-closed form. The §6.4.1 table (line 1899) enumerates Shape 1/2/3 only — no compound-parent row. The §34 row at line 14203 explicitly enumerates "(Shape 1 plain cell or Shape 3 non-markup derived)" — no compound-parent.

The closest spec mention is §6.3.3 line 1882: *"`<formRes><name/></>` would be valid render-by-tag for `name` if `name` has a render-spec — this is the structural form at the nested level."* — describes the WRAPPING form (compound parent as a wrapper around a child render-by-tag), not the self-closed bare form.

**Disposition (proposed; see §3 for ratification):** Fire E-CELL-NO-RENDER-SPEC for compound-parent. Compound parents structurally have no render-spec (they have `children[]`, mutually exclusive with `renderSpec` per ast.ts lines 480-491). The §34 row text "(Shape 1 plain cell or Shape 3 non-markup derived)" is enumerative-not-closed; compound parents fit the broader contract "cell has no render-spec." Error message tightens to mention the compound-specific alternative (`<formRes><field/></>` wrapping form, or `${@formRes.field}` interpolation).

---

## §2 Substrate verification

### §2.1 B5 cell-classifier API

`compiler/src/symbol-table.ts` lines 1147-1494:

- **`classifyStateDecl(decl)`** (private, lines 1147-1157) — returns `"plain" | "bindable" | "markup-typed" | "compound-parent"`.
- **`getCellKind(decl)`** (public, lines 1473-1479) — reads `_cellKind` annotation.
- **`isCellBindable(decl)`** (public, lines 1488-1494) — reads `_isBindable` annotation.
- **`B5_BINDABLE_TAGS`** = `{"input", "textarea", "select"}` (line 1123) — canonical bindable HTML element set.

**API sufficiency check.** B5 collapses two spec-distinct cases into one bucket:

| Spec case | B5 `_cellKind` | B5 `decl.isConst` | Required B6 fire |
|---|---|---|---|
| Shape 1 plain (`<count> = 0`) | `"plain"` | `false` | E-CELL-NO-RENDER-SPEC |
| Shape 3 numeric/string derived (`const <doubled> = @count*2`) | `"plain"` | `true` | E-CELL-NO-RENDER-SPEC |
| Shape 2 bindable (`<x> = <input/>`) | `"bindable"` | `false` | (none — accept) |
| Shape 2 non-bindable HTML RHS (`<x> = <div/>`) | `"markup-typed"` | `false` | **E-CELL-RENDER-SPEC-NOT-BINDABLE** |
| Shape 3 markup-typed derived (`const <badge> = <span>...</span>`) | `"markup-typed"` | `true` | **E-CELL-NO-RENDER-SPEC** |
| Variant C compound parent (`<formRes><name/></>`) | `"compound-parent"` | `false` | (proposed) E-CELL-NO-RENDER-SPEC |

**The `"markup-typed"` bucket is the discriminator-required case.** B6 distinguishes via `decl.isConst`:
- `markup-typed && isConst === true` → Shape 3 markup-typed derived → E-CELL-NO-RENDER-SPEC
- `markup-typed && isConst === false` → Shape 2 non-bindable RHS → E-CELL-RENDER-SPEC-NOT-BINDABLE

**B5 API is sufficient — no extension required.** Both `_cellKind` and `decl.isConst` are already on the AST (B5 stamps the former; A1a Step 4 stamps the latter, see ast.ts:447). B6 reads both.

**Sub-finding — component render-specs (PascalCase RHS tag):** A `<x> = <MyComp/>` decl where `MyComp` is PascalCase falls into B5's rule-5 (defensive `"markup-typed"` bucket) because `B5_BINDABLE_TAGS` is HTML-only. With `isConst: false`, the §2.1 table above would fire E-CELL-RENDER-SPEC-NOT-BINDABLE. **This is wrong** for component render-specs with bindable props (spec line 1341 — needs prop-catalog lookup, deferred).

**Disposition:** B6 examines `decl.renderSpec.element.tag`. If the tag's first character is uppercase (PascalCase), DEFER (no fire) with an explicit follow-up comment pointing at component-prop-catalog substrate (B14/M18/M20). This preserves spec-faithfulness — better to under-fire than mis-fire on a case the spec explicitly says requires prop-catalog support that doesn't exist yet.

### §2.2 SYM pipeline integration site

`compiler/src/api.js` Stage 3.06 (lines 676-709): `runSYMBatch` is called once; collected errors flow through `collectErrors("SYM", sym.errors)`. Adding a new PASS inside `runSYM` automatically integrates with the pipeline error stream — no api.js changes needed.

### §2.3 AST shape — markup nodes

`compiler/src/types/ast.ts` lines 212-242 — `MarkupNode { kind: "markup", tag, attrs, children, selfClosing, ... }`.

**Use-site detection:**
- `<x/>` parses as `MarkupNode { tag: "x", selfClosing: true, children: [], attrs: [...] }`.
- `<x>` (declaration site, structural form) parses as `ReactiveDeclNode { kind: "state-decl", name: "x" }` — **different node kind**. So the walker discriminates trivially: walk `kind === "markup"` nodes only.
- A render-by-tag use is `kind === "markup" && selfClosing === true && tag.match(/^[a-z]/) && lookupStateCell(scope, tag) !== null`.
- HTML built-ins (`<br/>`, `<input/>`, `<img/>`, ...) are also self-closed lowercase markup — but they don't resolve to a state cell (not in `stateCells` map). **The `lookupStateCell !== null` test is the decisive filter.** B6 only fires when the lowercase self-closed tag matches a registered state cell name.

### §2.4 Markup walker locus

No existing SYM pass walks `MarkupNode` exhaustively:
- PASS 1 (B1): walks state-decls + scope-introducers, registers cells.
- PASS 2 (B2): walks local-decl nodes inside function/scope bodies.
- PASS 2.b (B4): walks `fileScope.importBindings` (no AST walk).
- PASS 3 (B3): walks every `ExprNode` payload via `forEachIdentInExprNode`.
- PASS 4 (B5): walks state-decls only (classification).

**B6 adds PASS 5: walk every `MarkupNode` in the AST, checking if `tag` is a lowercase self-closed render-by-tag of a registered cell.** Mirrors the existing PASS-shape (recursion through `children` / `body` / `consequent` / `alternate` / `arms` / `lift-expr`).

**Scope handling:** `lookupStateCell(fileScope, tag)` walks the parent chain. Since use-sites can appear inside compound RHS markup (rare — only Shape 3 markup-typed derived has markup RHS that gets walked), inside component bodies (file-scope-equivalent for the cell registry), or inside `<program>` markup, **starting from the file scope is correct** for the typical case. Compound sub-scope cells (Shape 1/2/3 children of a compound parent) are NOT addressable as bare `<childName/>` from outside the compound — they're addressed as `<parent><childName/></>` (wrapping form, line 1882). So file-scope lookup matches spec.

**An edge case:** a use-site inside a compound parent's nested markup (e.g., a Shape 3 markup-typed derived child whose RHS contains a `<sibling/>` reference). The compound's children are sub-scoped; nested-from-within reference would resolve `<sibling/>` against the compound's sub-scope, NOT the file scope. **But** B5 doesn't walk into Shape-3 markup-typed RHS markup either (the renderSpec markup is part of the cell's value, not a use-site context). For B6 v1, file-scope lookup is sufficient and matches the spec's documented use-cases. Compound-internal sibling render-by-tag is a follow-up; flag in the impl as a known scope-limitation.

### §2.5 Reuse vs. new pass

Decision: **NEW pass (PASS 5).** Reasons:
- Existing passes don't walk `MarkupNode` structurally.
- Adding to PASS 4 (B5 classifier) would muddle "classify state-decls" (read-only on existing decls) with "fire diagnostics on use-sites" (different concern, different node kind).
- Adding to PASS 1 would conflict with the "B1 fires NO diagnostics" foundational invariant (line 683).
- A clean PASS 5 mirrors the B-step decomposition in `runSYM` and matches the §13.7 contracts table convention.

### §2.6 Error fire shape

Mirror B4's `E-STATE-PINNED-FORWARD-REF` fire shape (symbol-table.ts ~line 593, ~line 1080):
- `errors.push({ code, message, span, severity: "error" })`
- `span` = the `MarkupNode.span` of the offending `<x/>` use-site
- `message` carries cell name + spec-faithful guidance ("use `${@x}` interpolation to display the value")

---

## §3 Halt-and-report dispositions (Rule 3 — surface shortcuts as veto-checks)

Two non-trivial dispositions surfaced by the survey. Both are spec-faithful resolutions; neither structurally blocks B6. Surfacing for Bryan ratification before Phase 1 commits.

### §3.1 Compound-parent self-tag → E-CELL-NO-RENDER-SPEC

**Spec status:** silent on bare `<compoundParent/>` self-closed form. §6.4 table omits compound-parent row; §34 row text enumerates "(Shape 1 plain cell or Shape 3 non-markup derived)".

**Proposed disposition:** Fire E-CELL-NO-RENDER-SPEC. Compound parents have `children[]` (mutually exclusive with `renderSpec`); structurally they have no render-spec. The §34 row's enumeration is examples-not-closed-list. Error message tightened to mention the wrapping form (`<formRes><field/></>`) as the spec-canonical alternative AND interpolation `${@formRes.field}` for field-level value access.

**Why this is correct:** the brief's framing aligns with this. Spec is silent rather than contradictory. The same broad invariant ("cell has no render-spec → E-CELL-NO-RENDER-SPEC") applies. Firing rather than silently accepting is the production-language-fidelity choice (Rule 2 — scrml is not a toy).

**Veto path:** if Bryan reads this and disagrees ("compound parents should be a separate error code" or "spec silence means accept"), surface STOP and re-scope before writing code.

### §3.2 Component render-spec (PascalCase RHS) → DEFER

**Spec status:** line 1341 says E-CELL-RENDER-SPEC-NOT-BINDABLE applies via component-prop catalog inspection.

**Proposed disposition:** Defer. B6 examines `decl.renderSpec.element.tag`; if PascalCase, no fire. Document follow-up: when B14/M18/M20 introduces component-prop substrate, extend B6's PASS 5 with the prop-catalog check.

**Why defer:** the brief explicitly lists this as a halt-trigger ("if survey reveals component-prop substrate doesn't exist and B6 would need to add it → STOP, report (this is structurally B14/M18/M20 territory)"). B6 stays in scope.

**Risk:** under-firing today (PascalCase render-specs accept silently) for cases that should fire (component without bindable prop). This is acceptable: under-fire is recoverable via a follow-up; mis-fire on currently-undefinable cases is a worse footgun.

**Veto path:** if Bryan wants component-prop-catalog support folded into B6, surface STOP and re-scope. (Materially expands B6 scope.)

### §3.3 No other halt-triggers fire

- B5 API is sufficient — `_cellKind` + `decl.isConst` distinguish every fire-required case. **No B5 extension.**
- No markup-walker conflict — adding PASS 5 to `runSYM` is purely additive; no existing pass overlaps.
- Estimate is within 3-5h budget (§5 below).
- No spec text contradicts the SCOPE row's framing — §6.4 + §34 substantiate both error codes; the SCOPE row B6 cleanly encodes the intent.

---

## §4 Phase 1 implementation plan (post-survey, post-disposition-ratification)

### §4.1 PASS 5 walker — `walkRenderByTagUses`

Mirrors PASS-1's `walk` shape. Recurses through `children`/`body`/`consequent`/`alternate`/`arms`/`lift-expr`. For each `MarkupNode` encountered:

```typescript
function checkRenderByTag(node: MarkupNode, fileScope: Scope, errors: SYMDiagnostic[]) {
  if (!node.selfClosing) return;
  if (!/^[a-z]/.test(node.tag)) return;          // PascalCase = component (different path)
  const decl = lookupStateCell(fileScope, node.tag);
  if (!decl) return;                              // not a state cell — HTML built-in / unresolved
  // The decl is the state-cell's declNode; access via _record
  const declNode = (decl.declNode as ReactiveDeclNode);
  const kind = getCellKind(declNode);
  switch (kind) {
    case "bindable":
      return;                                     // accept — Shape 2 with bindable HTML render-spec
    case "plain":
      // Shape 1 OR Shape 3 numeric/string derived
      return fire(errors, "E-CELL-NO-RENDER-SPEC", node, declNode);
    case "compound-parent":
      return fire(errors, "E-CELL-NO-RENDER-SPEC", node, declNode);  // §3.1 disposition
    case "markup-typed": {
      const isConst = declNode.isConst === true;
      if (isConst) {
        // Shape 3 markup-typed derived → spec line 3027
        return fire(errors, "E-CELL-NO-RENDER-SPEC", node, declNode);
      }
      // Shape 2 with non-bindable RHS — but defer if PascalCase component
      const renderTag = declNode.renderSpec?.element?.tag;
      if (renderTag && /^[A-Z]/.test(renderTag)) {
        // Component RHS — §3.2 disposition: defer pending B14/M18/M20
        return;
      }
      return fire(errors, "E-CELL-RENDER-SPEC-NOT-BINDABLE", node, declNode);
    }
  }
}
```

### §4.2 Test plan — `compiler/tests/unit/render-by-tag.test.js`

Comprehensive coverage matrix (spec-faithful per Rule 2):

| § | Cell decl | Use-site | Expected fire |
|---|---|---|---|
| §B6.1 | `<count> = 0` | `<count/>` in markup | E-CELL-NO-RENDER-SPEC |
| §B6.2 | `<userName req length(>=2)> = <input type="text"/>` | `<userName/>` | (no fire) |
| §B6.3 | `<agree req> = <input type="checkbox"/>` | `<agree/>` | (no fire) |
| §B6.4 | `<bio> = <textarea/>` | `<bio/>` | (no fire) |
| §B6.5 | `<role> = <select><option/></select>` | `<role/>` | (no fire) |
| §B6.6 | `<photo> = <input type="file"/>` | `<photo/>` | (no fire) |
| §B6.7 | `<msg> = <div>hi</div>` | `<msg/>` | E-CELL-RENDER-SPEC-NOT-BINDABLE |
| §B6.8 | `<note> = <span>note</span>` | `<note/>` | E-CELL-RENDER-SPEC-NOT-BINDABLE |
| §B6.9 | `const <doubled> = @count * 2` | `<doubled/>` | E-CELL-NO-RENDER-SPEC |
| §B6.10 | `const <greeting> = "hi" + @name` | `<greeting/>` | E-CELL-NO-RENDER-SPEC |
| §B6.11 | `const <badge> = <span class="b">${@name}</span>` | `<badge/>` | E-CELL-NO-RENDER-SPEC (spec line 3027) |
| §B6.12 | `<formRes><name>="" <email>="" </>` | `<formRes/>` | E-CELL-NO-RENDER-SPEC (§3.1 disposition) |
| §B6.13 | (any cell) used via `${@cell}` | not `<cell/>` | (no fire — interpolation alternative) |
| §B6.14 | `<count> = 0` (no use-site) | absent | (no fire — no use-site walked) |
| §B6.15 | `<x> = <MyComp/>` (PascalCase RHS) | `<x/>` | (no fire — §3.2 deferred) |
| §B6.16 | Multi-use: `<userName/>` 3x in same file | 3x use-sites | 0 fires (Shape 2 bindable) |
| §B6.17 | Multi-use: `<count/>` 3x in same file | 3x use-sites | 3 fires (each independent) |
| §B6.18 | Diagnostic shape — span points at use-site MarkupNode, not decl | E-CELL-NO-RENDER-SPEC | span verification |
| §B6.19 | Unresolved tag `<undefinedThing/>` | not in cell registry | (no fire — out of B6 scope; existing E-SCOPE-* covers) |
| §B6.20 | HTML built-in self-closed `<br/>` | not a state cell | (no fire — `lookupStateCell` returns null) |

### §4.3 Phase ordering

1. **Phase 0 (DONE):** survey + disposition surfacing → SURVEY.md + progress.md scaffold + WIP commit.
2. **Phase 1a:** test scaffolding (red tests for the matrix). WIP commit.
3. **Phase 1b:** PASS 5 implementation in `symbol-table.ts`. WIP commit (tests turn green).
4. **Phase 2:** primer §13.7 row addition. WIP commit.
5. **Phase 3:** final `bun run test` verification, progress.md final-state, summary commit.

---

## §5 Estimate

- Phase 0 (this doc): ~30 min — DONE.
- Phase 1a (test scaffolding): ~45 min.
- Phase 1b (PASS 5 impl): ~1.5h (walker + 4-way switch + helper fns + recursion correctness).
- Phase 2 (primer §13.7): ~15 min.
- Phase 3 (verification + final commit): ~30 min.

**Total: ~3.5h.** Within the brief's 3-5h budget.

---

## §6 Open dispositions for Bryan ratification

Both are surfaced for veto BEFORE Phase 1 lands. Default-proceed if no veto: I will commit Phase 0 + proceed to Phase 1a unless a STOP appears.

1. **§3.1 — compound-parent self-tag fires E-CELL-NO-RENDER-SPEC.** Spec is silent; this is the spec-faithful extension. Tightened error message mentions the `<formRes><field/></>` wrapping form + `${@formRes.field}` interpolation alternatives.
2. **§3.2 — component render-spec (PascalCase RHS) is DEFERRED.** Spec line 1341 requires component-prop-catalog substrate that B14/M18/M20 will land. B6 v1 under-fires this case rather than mis-firing. Documented as a follow-up in code comments + this survey.

---

## §7 Tags + Links

## Tags

#a1b #b6 #render-by-tag #symbol-table #spec-fidelity #rule-4 #survey

## Links

- `compiler/SPEC.md` §6.4 (lines 1893-1939), §6.2 (lines 1762-1821), §34 (lines 14203-14204), §6.6.17 (lines 3015-3033)
- `compiler/src/symbol-table.ts` (B5 substrate — lines 1118-1494)
- `compiler/src/types/ast.ts` (MarkupNode lines 212-242, ReactiveDeclNode lines 424-514)
- `compiler/src/api.js` Stage 3.06 (lines 676-709)
- `docs/PA-SCRML-PRIMER.md` §13.7 (lines 504-528)
- `docs/changes/phase-a1b-step-b4-import-pinned-cycles/progress.md` (B-series progress.md precedent)
- `compiler/tests/unit/cell-classifier.test.js` (B5 test pattern)
