# v0.next parser audit — 2026-05-05 (S59)

> **Note (Step 3 / 2026-05-05):** when this audit was written, the AST kind was `"reactive-decl"`. Phase A1a Step 3 (commit `8fa26e1`) renamed it to `"state-decl"`. References below have been mass-renamed to `kind: "state-decl"` for forward-consistency. The historical name `"reactive-decl"` is preserved in this banner only. (The rename also swept this banner originally — fixed in a follow-up commit.)

**Status:** diagnostic snapshot of compiler/src/ parser support for v0.next language features as of HEAD `92ef014`. Driven by Phase A1a re-decomposition after rev-3 dispatch surfaced a fundamental parser-vs-spec mismatch.

**Methodology:** PA-direct probe (general-purpose audit agent stalled). 25 v0.next features + 2 legacy-path sanity checks compiled via `bun run compiler/src/cli.js compile`. Each probe also AST-dumped via `splitBlocks + buildAST` to determine whether the parser produces an actual decl-shape AST node or silently swallows the source as `html-fragment` text. **Compile-OK is NOT sufficient** — many forms compile clean but produce `html-fragment` raw text instead of state-decl AST. Audit table classifies on AST shape, not compile status.

---

## §1 Summary

**The vast majority of v0.next is NOT supported by the current parser.** The sole parser-recognized state-decl form today is `@NAME = RHS` inside `${...}` logic blocks, producing `kind: "state-decl"`. The V5-strict `<NAME> = RHS` form — central to v0.next per SPEC §6 + L1/L2/L3 pillars — is **silently parsed as `html-fragment` text in every position probed**. Compile passes return zero errors, masking the gap. The deception is the danger: tests that round-trip "compile clean" without inspecting AST shape would falsely greenlight v0.next migration progress.

**Three error-shape buckets across 25 v0.next probes:**

- **17 features parse-as-html-fragment** (silent swallow, no actual decl-shape AST node): F1b, F1c, F2-F15 (most of §6 + §6.8 + §6.10 + most basics), F23, F24.
- **6 features hard-error**: F1a (top-level `<NAME>=` outside `<program>`), F16 (block-form `<match>`), F18/F19 (engine + onTransition — legacy `<machine>` sentence form expected), F20/F21 (file-level `<channel>`), F25 (`<errors of=...>`).
- **2 features parse partially** as existing legacy nodes: F17 (JS-style match expression — works as a statement form somehow), F22 (`<schema>` parses as `kind: "state" stateType="schema"` via existing markup-tag-style state opener path; content body is text not parsed against the shared-core vocabulary).

**Legacy `@NAME = init` paths** parse cleanly into `state-decl` nodes (L1) — confirms the current scrml syntax is alive and well; v0.next migration is genuinely additive, not a rewrite of working parser code.

**Biggest gaps (priority-ordered for re-decomposition):**

1. **Lexer/block-splitter/expr-parser need a `<NAME> = RHS` recognition path** — this is the universal gate for V5-strict. Today, `<NAME>` in expression context consistently reduces to html-fragment text.
2. **Engine block needs new opener parsing** — current parser still expects pre-S25 `<machine>` sentence form (E-ENGINE-020); v0.next form `<engine for=Type initial=.Variant>` is unrecognized.
3. **Channel block + V5-strict-cell-inside-channel** — `<channel>` opener is tokenized as a markup tag; closer `</channel>` mismatches inner `<messages>` opener.
4. **`<match for=Type>` block-form** — uppercase variant tags inside (`<Red>`, `<Green>`) get classified as components and trip E-COMPONENT-035.
5. **`<errors of=expr/>`** — `of=expr` attribute parsing tries to resolve `@signup.email` as an unquoted identifier in attribute scope (E-SCOPE-001).

**The smaller gap:** schema, JS-style match, refinement-type predicates either work or partially work today — the lift for those is incremental, not greenfield.

---

## §2 Audit table

Status legend:
- **PARSES-NOW** — literal v0.next snippet compiles to a meaningful AST shape (decl-node or equivalent).
- **HTML-FRAGMENT** — compiles clean but the source is silently swallowed as raw text in an `html-fragment` node. **Effectively NOT-AT-ALL parsed**; compile-success is misleading.
- **NOT-AT-ALL** — hard parse error.
- **PARTIAL** — some forms work, others fail.

| ID | Feature | SPEC ref | Status | Current path / observed AST | Migration cost |
|---|---|---|---|---|---|
| F1a | Shape 1 plain `<count>=0` (top-level outside `<program>`) | §6.2 | NOT-AT-ALL | E-CTX-003 unclosed | Front-end: same as F1b/c |
| F1b | Shape 1 plain inside `<program>` body | §6.2 | NOT-AT-ALL | E-CTX-001 closer mismatch | Front-end: lex/block-split rework |
| F1c | Shape 1 plain inside `${...}` | §6.2 | HTML-FRAGMENT | `html-fragment content="< count > = 0"` | High — new expr-parser path for `<NAME>` decl-site |
| F2 | Shape 1 various literals inside `${}` | §6.2 | HTML-FRAGMENT | same: html-fragment swallow | Subsumed by F1c |
| F3 | Shape 2 decl-with-render-spec inside `${}` | §6.2 | HTML-FRAGMENT | `html-fragment content="< userName req length(>=2) > = < input type=\"text\" / >"` | High — Shape 2 needs render-spec sub-node + bareword validators |
| F4 | Shape 3 derived `const <doubled>=…` inside `${}` | §6.6 | HTML-FRAGMENT | `html-fragment content="< count > = 0\nconst < doubled > = @count * 2"` | High — also const-decl recognition collides |
| F5 | Shape 3 in-compound (§6.6.16) | §6.6.16 | HTML-FRAGMENT | same | Subsumed by F4 + F7 |
| F6 | Markup-typed derived (§6.6.17) | §6.6.17 | HTML-FRAGMENT | same | Subsumed by F4 |
| F7 | Variant C compound `<form>{<name>=...;<email>=...}` | §6.3 | HTML-FRAGMENT | `html-fragment content="< form >\n< name > = ...` | High — block-splitter rework for nested decl bodies |
| F8 | Render-by-tag `<userName/>` inside markup | §6.4 | HTML-FRAGMENT (decl side) | decl side swallowed; usage `<userName/>` is just a markup tag with no resolver linkage | Subsumed by F1c (resolver linkage is A1b) |
| F9 | V5-strict access read `if(@count>0)` | §6.1 | PARSES-NOW (via @-form) | `@count` is `member-access` / `at-ident` token; parser handles | Low — already works |
| F10 | Bare-name local after `<count>=0` | §6.1 | HTML-FRAGMENT (decl side); `let count = 5` parses as plain JS | decl swallowed; collision detection is A1b anyway | Subsumed by F1c |
| F11 | `<startTime default=null>=Date.now()` | §6.8 | HTML-FRAGMENT | swallowed: `< startTime default = null > = Date . now ( )` | Subsumed by F1c + attr scan |
| F12 | `reset(@count)` keyword in expr position | §6.8.2 | HTML-FRAGMENT (decl side, inside swallow); the `reset` token IS keyword post-S59 Step 1 | swallowed in current probe (because the surrounding decl swallowed too) | Independent — needs expr-parser case for `reset` keyword call |
| F13 | `reset()` zero-arg | §6.8.2 | HTML-FRAGMENT | same | Subsumed by F12 |
| F14 | `<x pinned>=1` | §6.10 | HTML-FRAGMENT | swallowed | Subsumed by F1c + attr scan |
| F15 | `import { foo pinned } from '...'` | §21.8 | HTML-FRAGMENT inside `<program>`; outside it's plain text | needs proper recognition in import parser | Medium — touches import-decl parser |
| F16 | `<match for=Type on=expr>` block-form | §18 | NOT-AT-ALL | E-COMPONENT-035 — variant tags `<Red>` etc. classified as components | High — new structural-element registration for `<match>` |
| F17 | JS-style `match expr {...}` | §18 | PARTIAL | parses as bare-expr / logic statement; semantics unknown | Low-medium — verify exhaustiveness/expansion shape |
| F18 | `<engine for=Phase initial=.Idle>` block | §51 | NOT-AT-ALL | E-ENGINE-020 expects pre-S25 `<machine>` sentence form | Very High — new opener parsing + state-children + transitions |
| F19 | `<onTransition from=A to=B>` element | §51.10 | NOT-AT-ALL | same E-ENGINE-020 + opener mismatch | Subsumed by F18 |
| F20 | File-level `<channel name="..." topic="...">` | §38 | NOT-AT-ALL | E-CTX-001 inner `<messages>` closer mismatches `</channel>` | High — `<channel>` opener + V5-strict body recognition |
| F21 | V5-strict cell `<messages>=[]` inside channel body | §38.4 | NOT-AT-ALL | same E-CTX-001 | Subsumed by F20 |
| F22 | `<schema>` with shared-core vocab | §39 | PARTIAL | `kind: "state" stateType="schema"` (existing markup-tag-style state opener); body content is text — not validated against shared-core vocabulary | Medium — opener works; need vocab validation + lowering |
| F23 | Refinement-type predicate `<email>: string(pattern(...)) req = <input/>` | §53 | HTML-FRAGMENT | swallowed | Subsumed by F1c + type-annotation parser |
| F24 | Auto-synth `${@signup.isValid}` read | §55.5 | HTML-FRAGMENT (compound side); `@signup.isValid` parses as member-access | compound decl swallowed; member access works | Subsumed by F7 (and A1b synthesizes the surface — A1a just needs to parse compound) |
| F25 | `<errors of=expr/>` element | §55.8 | NOT-AT-ALL | E-SCOPE-001 — `of=@signup.email` rejected as unquoted ident | Medium — new structural element + attribute-as-expression parsing |
| L1 | `@count = 0` inside `${}` | (current scrml) | PARSES-NOW | `kind: "state-decl" name="count" init="0"` | n/a — baseline |
| L2 | Plain JS `${ const x = 1 }` | (current scrml) | PARSES-NOW | parses as expected | n/a — baseline |

---

## §3 Per-feature detail (high-signal entries only)

### F1c — Shape 1 plain inside `${...}` (the central case)

**Probed source:**
```scrml
<program>${ <count> = 0 }<div>${@count}</div></program>
```

**Result:** compiles with 0 errors. AST contains `kind: "html-fragment"` with `content: "< count > = 0"`. **There is no `state-decl`, `state`, or `const-decl` node corresponding to the source** — the `<count>` opening token is consumed by markup-fragment tokenization inside the logic-block expression position, and `= 0` follows as raw text. The reference `${@count}` later does NOT resolve to a state cell (because the cell was never registered).

**Current path:** `${ @count = 0 }` parses cleanly as `kind: "state-decl" name="count" init="0"`.

**Migration shape:** lexer or expression-parser must recognize `<NAME>` at expression-statement-start as a decl-site marker, not a markup-tag opener. Likely needs a context-aware rule: in logic-block / expression-statement position with `<IDENT>` followed by `=` (or `:` for typed decls, or end-of-line for compound parents), treat `<IDENT>` as decl-site. Decision affects block-splitter (which currently produces markup-fragment text from `<` in expression context).

### F18 — `<engine for=Phase initial=.Idle>` block

**Probed source:**
```scrml
<engine for=Phase initial=.Idle><Idle>idle</><Loading>loading</><Done>done</></engine>
```

**Result:** E-ENGINE-020 — `< machine>` opener uses the pre-S25 sentence form. Use the attribute form: `< machine name=for=Phase initial=.Idle for=TypeName>`.

**Current path:** legacy `<machine>` keyword still wired; engine opener is unrecognized.

**Migration shape:** new structural-element registration for `<engine>`, replacing or aliasing the `<machine>` path; state-children with `rule=` attributes; `initial=` + `derived=` attribute parsing; `<onTransition>` child elements.

### F20 — File-level `<channel name="..." topic="...">`

**Probed source:**
```scrml
<channel name="chat" topic="lobby">
  <messages> = []
</channel>
<program>...</program>
```

**Result:** E-CTX-001 — `</channel>` tries to close `<messages>`. The `<messages>` opener is parsed as a regular markup tag opener (not as a V5-strict decl-site inside channel body), so the closer `</channel>` doesn't match.

**Migration shape:** `<channel>` block needs to be recognized as a structural element with V5-strict-decl semantics inside its body — same recognition path as F1c but at the file level rather than inside `${...}`.

### F22 — `<schema>` with shared-core vocab — PARTIAL

**Probed source:**
```scrml
<schema>users { name: text req length(>=2); age: integer min(18) max(120) }</schema>
```

**Result:** compiles clean. AST has `kind: "state" stateType="schema"` via existing markup-tag-style state opener. Body is `text` content, not parsed against shared-core vocabulary.

**Migration shape:** `<schema>` opener already works (keep it); body parser needs shared-core vocab validation + lowering rules (§39.5.8).

### L1 — `@count = 0` inside `${}` (legacy baseline)

**Result:** parses to `kind: "state-decl" name="count" init="0" initExpr={Literal: 0}`. **This is the only state-decl form parser produces today.** All v0.next paths must either extend this node kind OR introduce a new kind that A1b/A1c handle alongside.

---

## §4 Cross-cutting findings

### §4.1 The deceptive-success pattern

The most dangerous finding: 17 of 25 v0.next features compile WITH ZERO ERRORS while producing AST that doesn't reflect the source intent. The `<NAME> = RHS` form is consistently parsed as `html-fragment` raw text; downstream codegen emits the text as DOM content; tests asserting "compiles cleanly" pass without catching the gap. **Any A1a sub-step DoD that checks compile-success without AST-shape introspection is meaningless.** Phase A1a tests must assert `ast contains { kind: "state-decl"|"state-decl"|... }` not just "no compile errors."

### §4.2 Subsystem cluster of gaps

| Gap | Subsystem | Severity |
|---|---|---|
| `<NAME>` decl-site recognition | block-splitter / body-pre-parser / expression-parser context-aware tokenization | **Foundational** — blocks F1c-F15, F23-F24 |
| `<engine>` opener parsing | ast-builder structural-element registry | High |
| `<channel>` opener + V5-strict body | block-splitter / structural-element registry | High |
| `<match for=Type>` block + variant tags | component-expander / structural-element registry | High |
| `<errors of=expr/>` attribute-as-expression | attribute parser | Medium |
| Shared-core vocab in schema body | schema-differ / schema body parser | Medium |
| Refinement-type predicate on type annotation | type-system / type-annotation parser | Medium |
| `pinned` modifier on import items | import-decl parser | Low-medium |

### §4.3 What ALREADY works (good news)

- `@NAME = RHS` inside `${...}` → `state-decl` (L1).
- Plain JS `let`/`const` inside `${...}` → standard JS decls (L2).
- `@cell.path` reads + writes → member-access expressions (F9).
- `<schema>` opener — at least the wrapper.
- `match expr {...}` JS-style — at least at parse position (F17).

The `@`-form is the load-bearing bridge: V5-strict access for reads/writes (`@x = ...`, `@x.foo`) is fine as canonical-access; the gap is purely on the **declaration site** (`<x>` form vs `@x =` form).

### §4.4 Existing AST node kinds (current roles)

| Kind | Current role | v0.next migration shape |
|---|---|---|
| `state-decl` | `@NAME = init` decl in `${}` | Either rename / extend with `shape`, `isConst`, `validators`, `defaultExpr`, `pinned`, `renderSpec`, OR introduce parallel `state-decl` kind |
| `state` | markup-tag-style state opener `<StateName attrs>...</>` (e.g. `<schema>`, type-constructor decls) | Used unchanged for `<engine>`, `<match>`, `<channel>`, `<errors>` after structural-element registry expansion |
| `state-constructor-def` | typed state-constructor definition | Existing — no v0.next interaction |
| `html-fragment` | raw markup text inside expression context | The "drain" that silently swallows misclassified `<NAME>` decls — the central diagnostic signature |
| `const-decl` | plain JS `const x = ...` | Used unchanged for non-reactive constants per §6.6.2 (drop the `<>` for frozen non-reactive) |
| `markup` | DOM markup nodes | Unchanged |
| `logic` | `${...}` block contents | Unchanged but body-parser needs new decl-recognition path |

---

## §5 Implications for A1a re-decomposition

### §5.1 Scope shift

Original A1a brief estimated **11-19h** assuming "Shape 1 already supported, just add fields." Reality:

- **Foundational lex/block-split/expr-parse rework** to recognize `<NAME>` decl-site: ~10-15h alone.
- **Structural-element registration for engine/match/channel/errors**: ~10-15h.
- **Shape 2 render-spec sub-node + bareword validator scan**: ~5-8h.
- **`default=`, `pinned`, `reset(@cell)`, refinement-type predicate parsing**: ~5-8h.
- **AST tests + existing-test rewrites**: ~5-10h.

**Realistic A1a wall-time: 35-55h focused work** (~3x the original estimate).

### §5.2 Affected sub-steps in S60 decomposition

The S60 11-step plan in `AST-CONTRACTS-AND-DECOMPOSITION.md` is partially salvageable:

- **Step 1 (lexer reserve `reset`)** — DONE, landed S59 (`9cd7779`). Stays.
- **Step 2 (parser shape discriminant)** — premise broken; needs re-scoping into ~3-4 sub-steps for the new lex/parse path before any "shape" field work makes sense.
- **Steps 3-7** — premises also broken (all assume `<NAME> = RHS` parses today). Re-scope AFTER Step 2 lands the foundational path.
- **Step 8 (E-RESERVED-IDENTIFIER)** — Stays. Independent of the decl-form issue.
- **Steps 9-11** — Stay, but pushed later in the sequence.

### §5.3 Suggested architectural moves (descriptive, not prescriptive)

1. **Foundational pass first:** introduce `<NAME>` decl-site recognition in expression-statement position. The simplest framing: in `${...}` logic-body parsing, when a top-level statement starts with `<` followed by IDENT followed by `>` (or attributes-then-`>`) followed by `=` (or `:` for typed) or block-start `{`, treat as state-decl form. Output AST: extend `state-decl` with `shape`, `isConst`, etc., OR introduce parallel `state-decl` kind. Per the AST contracts doc S60 leans on `kind: "state"` extension — that target was wrong; the correct extension target is `state-decl`.
2. **Then per-shape variants:** Shape 2 adds `renderSpec` sub-node + validator scan; Shape 3 adds `isConst` + derived-cell linkage.
3. **Then structural elements:** `<engine>`, `<channel>`, `<match>`, `<errors>` each need registration in the structural-element registry (§4 + §24) so their openers parse to dedicated `kind`s rather than html-fragment / E-COMPONENT-035 / E-ENGINE-020.
4. **Then refinement types + schema vocab + pinned-on-imports** in any order.

### §5.4 Test invariant strengthening

Every A1a sub-step's DoD must include: **AST shape assertions, not just compile-clean**. Specifically: after parsing the v0.next form, assert that the resulting AST contains a node of the expected kind with expected fields, AND that NO `html-fragment` node contains the source text. The second assertion is the diagnostic for the deceptive-success pattern.

### §5.5 Re-decomposition recommendation

PA should re-write `AST-CONTRACTS-AND-DECOMPOSITION.md` based on this audit:
- Correct AST extension target (`state-decl`, not `kind: "state"`).
- Add foundational pass as the first ~3-4 steps before any shape-discriminant work.
- Update wall-time estimate to ~35-55h.
- Strengthen test invariants per §5.4.

The original 11-step plan is salvageable in spirit; the targets are wrong.

---

## §6 Tags

#audit #v0next #phase-a1a #parser-survey #breaking-language-change #deceptive-success-pattern #re-decomposition-needed
