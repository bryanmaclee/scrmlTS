# Gauntlet S19 — Phase 4 Fixture Index (Markup & Components)

Track A authoring-only corpus. 77 fixtures. Source dir:
`samples/compilation-tests/gauntlet-s19-phase4-markup/`.

Format per file: `.scrml` source + sibling `.expected.json`
(`{feature, shape, expectedOutcome, expectedCodes[], notes}`).

`UNKNOWN` in `expectedCodes` → spec silent/ambiguous; triage needed.

## Fixtures

| # | File | One-line description |
|---|---|---|
| 001 | phase4-tag-simple | Single `<div>hello</div>`. |
| 002 | phase4-tag-inferred-closer | `<div>hello</>` — §4.4.2 inferred closer. |
| 003 | phase4-tag-nested | Nested `<section>/<h1>/<p>` siblings. |
| 004 | phase4-tag-canvas | Canvas element from HTML registry. |
| 005 | phase4-tag-template | Template element (uncommon). |
| 006 | phase4-tag-unknown-name | `<fizzbuzz>` → E-MARKUP-001. |
| 007 | phase4-tag-mismatched-closer | `</span>` inside `<p>` → E-MARKUP-002. |
| 008 | phase4-tag-closer-in-logic | `</>` inside `${}` → E-CTX-002. |
| 009 | phase4-tag-leading-space | `< div>` → state opener → E-STATE-001. |
| 010 | phase4-void-br | Void `<br/>`. |
| 011 | phase4-void-hr | Void `<hr/>`. |
| 012 | phase4-void-img | Void `<img>` with attrs. |
| 013 | phase4-void-input | Void `<input>` with attrs. |
| 014 | phase4-void-with-content | Void element with body content (UNKNOWN code). |
| 015 | phase4-attr-string | Quoted string attribute value. |
| 016 | phase4-attr-boolean | Bare boolean attr `disabled`. |
| 017 | phase4-attr-boolean-as-string | `disabled="true"` → E-ATTR-002. |
| 018 | phase4-attr-reactive | Bare `@var` attribute value. |
| 019 | phase4-attr-interpolated | Template-literal attr with `${@var}`. |
| 020 | phase4-attr-braces-ghost | JSX `{expr}` attr value → ghost-pattern error. |
| 021 | phase4-attr-entities | `&amp;` entities in attribute values. |
| 022 | phase4-attr-entities-text | HTML entities in text content. |
| 023 | phase4-attr-fn-non-event | `attr=fn()` type mismatch → E-ATTR-001. |
| 024 | phase4-event-onclick | `onclick=fn()`. |
| 025 | phase4-event-onsubmit | `onsubmit=authenticate(a,b)`. |
| 026 | phase4-event-oninput | `oninput=track()`. |
| 027 | phase4-event-jsx-arrow-ghost | `onClick={()=>fn()}` ghost. |
| 028 | phase4-event-logic-wrapper | `onclick=${(event)=>...}` event-obj access. |
| 029 | phase4-bind-value-text | `bind:value=@x` on text input. |
| 030 | phase4-bind-checked | `bind:checked=@x` checkbox. |
| 031 | phase4-bind-group | `bind:group=@x` radio group. |
| 032 | phase4-bind-path | `bind:value=@obj.field` dotted path. |
| 033 | phase4-bind-non-reactive | `bind:` on non-reactive → E-ATTR-010. |
| 034 | phase4-bind-unsupported-attr | `bind:title` → E-ATTR-011. |
| 035 | phase4-bind-conflict | `bind:value` + `oninput` → E-ATTR-012. |
| 036 | phase4-class-directive | `class:active=@x`. |
| 037 | phase4-class-multiple | Multiple class: + static class. |
| 038 | phase4-class-bad-rhs | `class:active="true"` → E-ATTR-013. |
| 039 | phase4-class-bare-ident | `class:active=flag` → E-ATTR-013. |
| 040 | phase4-className-ghost | `className={...}` ghost. |
| 041 | phase4-style-flat-donut | Flat `#{prop:val;}` inline donut style. |
| 042 | phase4-if-attr-static | `<span if=@show>`. |
| 043 | phase4-if-attr-else | `if / else if / else` attr chain. |
| 044 | phase4-for-markup | `<li for @items / lift item />` markup form. |
| 045 | phase4-lift-inline-markup | `lift <li>` inside for-of. |
| 046 | phase4-lift-value | `lift <li>${expr}</>` body. |
| 047 | phase4-lift-nested | Nested lift — §10.6 targets innermost. |
| 048 | phase4-lift-conditional | if/else branch-only lift — §10.8.2. |
| 049 | phase4-lift-keyed | `key=` reconciliation. |
| 050 | phase4-lift-duplicate-keys | Dup keys → W-KEY-001. |
| 051 | phase4-extract-keyword | `extract` keyword → E-SYNTAX-003. |
| 052 | phase4-component-inline-def | `const Card = <div props={...}>`. |
| 053 | phase4-component-missing-prop | Missing required prop → E-COMPONENT-010. |
| 054 | phase4-component-extra-prop | Extra undeclared prop → E-COMPONENT-011. |
| 055 | phase4-component-props-dup | Prop dup in block + root attr → E-COMPONENT-012. |
| 056 | phase4-component-reactive-prop | Reactive prop passthrough. |
| 057 | phase4-component-jsx-brace-ghost | `<Card prop={@x}/>` ghost. |
| 058 | phase4-component-lowercase-ghost | Lowercase component name (disambiguation). |
| 059 | phase4-slot-basic | Named slots via `slot="name"`. |
| 060 | phase4-slot-default-children | `${children}` default-slot spread. |
| 061 | phase4-slot-no-spread | Unslotted body w/o spread → E-COMPONENT-021. |
| 062 | phase4-slot-in-lift | `slot=` inside lift → E-COMPONENT-022. |
| 063 | phase4-slot-non-snippet | `slot=` targets non-snippet prop → E-COMPONENT-023. |
| 064 | phase4-text-interp | `${@name}` text interpolation. |
| 065 | phase4-text-after-markup | Markup then lift same parent (§10.6). |
| 066 | phase4-comment-inside | `//` line comment between siblings. |
| 067 | phase4-whitespace-only | Whitespace-only body. |
| 068 | phase4-textarea-no-closer | Self-closed non-void → ghost. |
| 069 | phase4-attr-fragmented | Multi-line attribute list. |
| 070 | phase4-closer-midline | `</>` mid-line then sibling. |
| 071 | phase4-attr-component-sql | SQL inside component prop (UNKNOWN). |
| 072 | phase4-lift-outside-accumulation | Lift in top-level non-accumulating logic. |
| 073 | phase4-jsx-logical-and-ghost | `{cond && <El>}` JSX ghost. |
| 074 | phase4-onclick-tilde-decl | `onclick` adjacent `~{}` tokenization trap. |
| 075 | phase4-deep-nesting | 6-level nested tags. |
| 076 | phase4-dynamic-class-template | Template-literal class + class: directive. |
| 077 | phase4-attr-special-chars | Single-quoted attr + entity special chars. |

## Shape-cell coverage

- Plain tags — 001, 003, 004, 005, 070, 075
- Inferred `</>` closer — 002, 070
- Unknown tag, mismatched closer, `</>` in logic, leading-space state classification — 006-009
- Void elements (br/hr/img/input) — 010-013
- Void + content (negative) — 014
- Attributes: string/boolean/reactive/interpolated/JSX-ghost/entities/special-chars/fn-return — 015-023, 077
- Attribute-list fragmented multi-line — 069
- Event handlers (onclick/onsubmit/oninput/logic-wrapper) + ghost — 024-028
- bind: value/checked/group/path/non-reactive/unsupported/conflict — 029-035
- class: directive single/multiple/bad-rhs/bare-ident/ghost/template — 036-040, 076
- Flat `#{}` inline donut style — 041
- if= attr basic + else chain — 042-043
- for @items / lift item / markup form — 044
- lift: inline/value/nested/conditional/keyed/dup-key/extract-keyword/outside-accumulation — 045-051, 072
- Components: def/missing/extra/dup/reactive-prop/JSX-brace/lowercase-ghost — 052-058
- Slots: named/default/no-spread/in-lift/non-snippet — 059-063
- Text: interp/after-markup/comment/whitespace — 064-067
- Non-void self-closed ghost — 068
- SQL-in-component ghost — 071
- JSX logical-and ghost — 073
- onclick/~{} tokenization trap — 074

## Items skipped or deferred (with rationale)

- **Parametric snippets (§16.6) / E-COMPONENT-024** — requires snippet-scope binding syntax not well-scoped into a minimal fixture without expanding into multi-shape cells; defer to Track B dev personas.
- **`bind` on component props / E-COMPONENT-013, E-COMPONENT-014** — overlaps Phase 1 (component prop declaration) and Phase 6 surface; covered only indirectly.
- **`else` block on for/lift empty-state (§17.4a)** — shape warrants its own fixture cluster; deferred to a follow-up batch.
- **Tailwind utility class + mixing with `#{}`** — part of Phase 8 (Styles & CSS); not authored here.
- **`class=` on component (§5.5.5)** — component-class composition edge cases pushed to Phase 4 batch 2.
- **`<program>` nested / sidecar workers (§4.12)** — orthogonal block-grammar area; separate phase.
- **Rendering shorthand `< statename>` (state object openers)** — touched only by fixture 009 (classification); full state-block markup deferred to Phase 1/10.
- **BLOCK_REF split in fragmented lift body (BPP)** — hard to author deterministically without running the compiler; left to property-based Track C generator.

## Authoring notes

- All fixtures kept to **one shape per file**; no multi-feature bundles.
- Ghost-pattern fixtures exist expressly to document what scrml rejects. They typically carry `expectedCodes:["UNKNOWN"]` because SPEC.md does not enumerate a specific code for JSX-syntax rejections; triage will assign real codes after running the corpus.
- No compiler invocations; no `.test.js` files; no bug fixes attempted. Authoring only.
