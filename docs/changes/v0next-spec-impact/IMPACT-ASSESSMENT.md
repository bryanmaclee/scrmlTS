# v0.next — SPEC + PIPELINE Impact Assessment (Stage 0a)

**Date:** 2026-05-04
**Session:** S56
**Mode:** PA-direct, comprehensive
**Status:** WORK IN PROGRESS — produced as the dispatch brief for Stage 0b (spec rewrite execution)
**Goal:** map every S55 active move (M1-M20, with M7+M21 dropped) and every S56 lock (L1-L20) to the SPEC.md sections they affect, with disposition (small edit / partial rewrite / full rewrite / new section / negative-space removal) and rewrite ordering. Output is the brief that drives the actual rewrite.

---

## §0 What this document is

**This document is the bridge between the deliberation arc (S52-S56) and the implementation phase.** It catalogs every architectural change voted by the deliberation, maps it to the SPEC.md surface, and produces a dispatchable rewrite plan.

It is NOT itself a rewrite. It does not change SPEC.md. It is the impact assessment that the rewriter (PA-direct continuation OR a scrml-dev-pipeline T3 dispatch in a future session) will execute.

### Sources consulted (load-bearing for this assessment)

1. **S56 outcomes ledger:** `scrml-support/docs/deep-dives/v0next-s56-deliberation-outcomes-2026-05-04.md` — locks L1-L20 with full §3.x detail
2. **S55 outcomes ledger:** `scrml-support/docs/deep-dives/v0next-s55-deliberation-outcomes-2026-05-04.md` — moves M1-M21 (M7 dropped to editor; M21 dropped entirely)
3. **S54 synthesis:** `scrml-support/docs/deep-dives/state-as-primitive-redesign-synthesis-2026-05-03.md` — narrative context for the moves
4. **Kickstarter v2 (post-S56-edits):** `docs/articles/llm-kickstarter-v2-2026-05-04.md` — locked anchor doc for any agent writing scrml under v0.next
5. **User-voice S55 + S56 entries:** `scrml-support/user-voice-scrmlTS.md` — verbatim user claims, pillars, methodology directives
6. **SPEC-INDEX.md:** current section table-of-contents + line numbers as of 2026-04-29

### Authorization

User-authorized PA-direct comprehensive audit at S56 (verbatim S56):
> local with a stub on support, pa direct super comprehensive. in fact as comprehensensive as we can be given everything that is fresh
> we can go into the 60s % wise to get the plan concrete

---

## §1 Cross-cutting concerns (threaded through multiple sections)

These are NOT single-section additions — they are pillars or principles that thread through many sections. They get a dedicated treatment in the SPEC near the top (§1 Overview or §3 Context Model).

### §1.1 The markup-as-first-class-value pillar (L1)

**Claim:** Markup is a first-class value type in scrml. Markup elements can sit anywhere expressions sit — passed as args, stored in cells, returned from functions, on the RHS of `=`. The markup/value distinction collapses across the language.

**Held since:** scrml8 era (pre-user-voice). Resurfaced explicit at S56.

**Spec touchpoints (incomplete; threading throughout):**
- §1 Overview — pillar should be NAMED in the design principles
- §3 Context Model — markup-as-value mentioned with current rules
- §6 Reactivity — markup-typed cells (decl-coupled-with-render-spec L3, derived markup-typed cells §3.15 / Edge S)
- §7 Logic Contexts — markup-as-expression already exists; pillar reframes this from special case to canonical
- §10 The `lift` keyword — lift semantics under markup-as-value
- §15 Component System — components-as-markup-values (pillar's natural extension)
- §50 Assignment as Expression — markup on LHS/RHS of assignment

**Disposition:** SPEC §1.4 NEW SUBSECTION declaring the pillar. Cross-references inserted into all the touchpoint sections. Each affected section gets a "[Pillar L1] markup-as-value applies here" callout where relevant.

### §1.2 The north star — UI as a fully-handled state machine (S55 §3)

**Claim:** The UI of a scrml application SHOULD be a fully-handled state machine (engine, in scrml's vocabulary). Not aspiration — design intent. **The structural shape of the UI tree IS the structural shape of the application's state.**

**Process clause:** apps don't START at the north star; they EVOLVE toward it. Booleans-as-lifecycle in early sketch code are not violations; they're in-progress pins.

**Spec touchpoints:**
- §1 Overview — north star NAMED in design principles
- §51 State Transition Rules / `<machine>` (renaming to `<engine>` per S53 — already complete) — north-star explicitly stated as the section's design rationale
- §17 Control Flow — Tier 0 (`if=` chains) explicitly framed as "prototype tier on the easy-street ladder"
- §18 Pattern Matching — Tier 1 (`<match>` block-form) explicitly framed as "structural exhaustiveness without commitment to transitions"

**Disposition:** SPEC §1.5 NEW SUBSECTION declaring the north star + process clause + Tier 0/1/2 ladder. Touchpoint sections cross-reference.

### §1.3 V5-strict access model (M3, M1)

**Claim:** Two-form access for reactive state. `<varname>` is structural (declaration site, render-by-tag); `@varname` is canonical expression access (reads, writes, compound assignments). Bare names in expressions are LOCALS only. `@` is canonical, NOT a JS-framework concession.

**Spec touchpoints:**
- §1 Overview — V5-strict NAMED in design principles
- §3 Context Model — access form context per locus
- §5 Attribute Quoting — `bind:value=@x` form preserved; bare names in attribute values are LOCALS only
- §6 Reactivity — MASSIVE rewrite around `<x>` decl + `@x` access
- §7 Logic Contexts — bare names = locals; `@x` for state access
- §11 State Objects — likely subsumed by §6 expansion; reframe or fold

**Disposition:** SPEC §1.6 NEW SUBSECTION naming V5-strict. §6 takes the bulk of the rewrite (see §2 below).

---

## §2 Per-section disposition table

Reading: each row maps a SPEC section to (1) which locks/moves touch it, (2) the disposition (size of edit), (3) a brief description of what changes, (4) cross-refs to other sections that compose with this change.

| § | Current title | L/M touches | Disposition | What changes | Composes with |
|---|---|---|---|---|---|
| 1 | Overview | L1, M1, M3, S55 §3 north-star | **PARTIAL REWRITE** | Add §1.4 markup-as-value pillar; §1.5 north star + Tier ladder; §1.6 V5-strict naming. Update existing principles to reflect post-S56 framing | §3, §6, §17, §18, §51 |
| 2 | File Format and Compilation Model | (none direct) | NO CHANGE | — | — |
| 3 | Context Model | L1, M3 | **SMALL EDIT** | Add bullets noting V5-strict access form per context (logic = `<x>` decl + `@x` access; markup = `${@x}` interp + `<x/>` render-by-tag; attribute = `=@x` for binds + bare = literals); add markup-as-value cross-ref | §1, §5, §6, §7 |
| 4 | Block Grammar | M7-DROPPED, M15, L13 | **PARTIAL REWRITE** | Remove any `<///>` references (M7 negative-space — likely never landed; check); add §4.X for `:`-shorthand single-expression body (M15); add `<errors>` and `<onTransition>` as recognized structural elements with their attribute slots | §6, §13(L13), §51 |
| 5 | Attribute Quoting | L17, L19, M3 | **PARTIAL REWRITE** | §5.2.2 event handler binding — restrict to bare-call / bare-assignment / bare-single-expression (L19); §5 bind:value/bind:checked/bind:files dispatch table by render-spec shape (L17); confirm V5-strict on `=@x` form | §6, §52 |
| 6 | Reactivity — `@` Sigil | L1, L2, L3, L11, L15, L16, L17, L18, M1, M2, M3, M10, M11, M16 | **MAJOR REWRITE** | The biggest section, biggest rewrite. Rename principle from "@ sigil" to "V5-strict access model." Cover three RHS shapes (literal / bindable-markup / const-derived); Variant C compound state (structural-children + canonical access); decl-coupled-with-render-spec; auto-synthesized validity surface (per-compound + per-field); `default=` attribute; `reset(@cell)` keyword; `pinned` keyword; hoisting model. ~2,812 current lines → likely ~3,500-4,500 lines after rewrite | §1, §3, §5, §11, §53, §55-NEW |
| 7 | Logic Contexts | L1, L19, M3, M8, M11 | **PARTIAL REWRITE** | Reframe markup-as-expression as instance of L1 pillar; clarify bare names = locals (V5-strict); add §7.x for multi-statement-handlers-need-name (L19); update §7.6 file-level scope per hoisting + `pinned` (M11); logic-markup interleaving (M8) explicit | §1, §6 |
| 8 | SQL Contexts | (none direct) | NO CHANGE | — | — |
| 9 | CSS Contexts | (none direct) | NO CHANGE | — | — |
| 10 | The `lift` Keyword | L1 | **SMALL EDIT** | Reframe lift semantics under markup-as-value pillar; existing rules preserved | §1, §6, §15 |
| 11 | State Objects and `protect=` | L2, M3 | **REVIEW + LIKELY FOLD** | Under V5-strict + Variant C, much of §11 may be subsumed by §6 expansion. Audit: does §11 still hold its own concept distinct from §6's compound state? If yes, partial rewrite to align vocabulary; if no, fold into §6. PA leans FOLD (compound state IS state objects under V5-strict) | §6 |
| 12 | Route Inference | (none direct) | NO CHANGE | — | — |
| 13 | Async Model | L11(synthesis-pass-implications), §13.5 RemoteData | **PARTIAL REWRITE** | §13.5 RemoteData enum should now CROSS-REFERENCE the engine recipe as the canonical idiom (per kickstarter v2 §11.5 / §11.1); existing match-based RemoteData remains for value-return contexts | §18, §51 |
| 14 | Type System | M9, M10 | **PARTIAL REWRITE** | §14 add bare-variant inference (M9) — single LHS type known; §14 add positional binding for predefined-shape (M10) | §6, §18 |
| 15 | Component System | L1, M20 | **SMALL EDIT** | §15 add explicit "components stay distinct from engines" framing per M20; reaffirm component reactive scope; markup-as-value note | §1, §51 |
| 16 | Component Slots | L1 | **SMALL EDIT** | Slots take markup; reaffirm under markup-as-value pillar | §1, §15 |
| 17 | Control Flow | L6 (Tier 0 framing) | **PARTIAL REWRITE** | §17 add Tier 0 framing — `if=` attribute is the prototype tier on the easy-street ladder; cross-ref to Tier 1 (§18 match-block) and Tier 2 (§51 engine); render-by-tag rules per L16 (no override syntax; multi-render via interpolation/component props) | §1, §18, §51 |
| 18 | Pattern Matching and Enums | L6, L7, L8, M9 | **MAJOR REWRITE** | NEW SUBSECTION for `<match for=Type [on=expr]>` block-form (Tier 1); existing JS-style match preserved as value-return form (L8); rules in match are inert annotation (W-MATCH-RULE-INERT lint); `effect=`/`<onTransition>` REJECTED at grammar level inside `<match>`; bare-variant inference in arm patterns (M9) | §1, §17, §51 |
| 19 | Error Handling | (none direct) | NO CHANGE | — | — |
| 20 | Navigation API | (none direct) | NO CHANGE | — | — |
| 21 | Module and Import System | M18 | **SMALL EDIT** | §21 add cross-file engine import semantics (M18 — engine use-site only for cross-file mount, e.g., `import { MarioMachine } from './engines.scrml'` then `<MarioMachine/>` as use-site); confirm `pinned` works on imports | §51 |
| 22 | Metaprogramming | (review for L1) | **REVIEW** | Audit whether `^{}` meta-context interactions with markup-as-value pillar require updates; likely small or nil | §1 |
| 23 | Foreign Code Contexts | (none direct) | NO CHANGE | — | — |
| 24 | HTML Spec Awareness | L13 | **SMALL EDIT** | §24 register `<errors>` and `<onTransition>` as scrml-defined structural elements (not HTML); confirm element-registry knows them | §4, §6 |
| 25 | CSS Variable Syntax | (none direct) | NO CHANGE | — | — |
| 26 | Tailwind Utility Classes | (none direct) | NO CHANGE | — | — |
| 27 | Comment Syntax | (none direct) | NO CHANGE | — | — |
| 28 | Compiler Settings | (review) | **REVIEW** | Whether any v0.next features warrant compiler settings (e.g., lint enforcement levels for W-LIFECYCLE-CANDIDATE); likely small additions | — |
| 29 | Vanilla File Interop | (none direct) | NO CHANGE | — | — |
| 30 | Compile-Time Eval | (none direct) | NO CHANGE | — | — |
| 31 | Dependency Graph | L11, L14 | **SMALL EDIT** | §31 add dependency tracking through validator predicate args (L14 cross-field) and through derived state expressions; cycle detection error codes | §6, §51 |
| 32 | The `~` Keyword | (none direct) | NO CHANGE | — | — |
| 33 | The `pure` Keyword | (none direct) | NO CHANGE | — | — |
| 34 | Error Codes | L11, L12, L13, L14, L17, L19, L20, M11, M14 | **PARTIAL REWRITE** | Add ~15-20 new error/warning codes: E-NAME-COLLIDES-STATE, E-DERIVED-WRITE, E-STATE-PINNED-FORWARD-REF, E-CELL-NO-RENDER-SPEC, E-CELL-RENDER-SPEC-NOT-BINDABLE, E-MATCH-RULE-INERT (warning W-MATCH-RULE-INERT), E-MATCH-EFFECT-FORBIDDEN, E-MATCH-ONTRANSITION-FORBIDDEN, E-DERIVED-ENGINE-NO-RULES, E-DERIVED-ENGINE-NO-INITIAL, E-DERIVED-ENGINE-NO-WRITE, E-DERIVED-ENGINE-INITIAL-UNDEFINED, E-VALIDATOR-CIRCULAR-DEP, E-SYNTHESIZED-WRITE, E-MULTI-STATEMENT-HANDLER, E-RESERVED-IDENTIFIER (for `reset`), W-LIFECYCLE-CANDIDATE, W-MATCH-RULE-INERT, W-ENGINE-INITIAL-MISSING (M17 lint) | many |
| 35 | Linear Types — `lin` | (none direct) | NO CHANGE | — | — |
| 36 | Input State Types | (none direct) | NO CHANGE | — | — |
| 37 | Server-Sent Events | (none direct) | NO CHANGE | — | — |
| 38 | WebSocket Channels | M19 | **MAJOR REWRITE** | §38 channels move to FILE-LEVEL (NOT inside `<program>`); auto-declare their variable; drop `@shared` modifier (state declared inside channel body auto-syncs); body is V5-strict (`<x>` decl, `@x` access). Existing onserver:/onclient: handlers preserved | §6 |
| 39 | Schema and Migrations | L4 | **PARTIAL REWRITE** | §39 add additive shared-core vocabulary (`req`, `length`, `pattern`, etc.) alongside SQL-mirror words (`not null`, `unique`, `references`); shared-core lowers to standard SQL DDL on emit; emitted DDL SQL UNCHANGED | §53, §55-NEW |
| 40 | Middleware and Request Pipeline | (none direct) | NO CHANGE | — | — |
| 41 | Import System — `use`/`import` | L12 | **SMALL EDIT** | §41 add `scrml:data` `registerMessages` for L12 project-level error message registration; cross-ref `messageFor(errorTag)` helper | §55-NEW |
| 42 | `not` — Unified Absence Value | L5 | **SMALL EDIT** | §42 clarify `is some` vs `req` coexistence (Edge from L5 deliberation): `is some` = exists at all; `req` = non-empty / meaningful value. For string cells, `"" is some` is TRUE; `req` would still fail. Both predicates exist; both are needed | §6, §55-NEW |
| 43 | Nested `<program>` | (none direct) | NO CHANGE | — | — |
| 44 | `?{}` Multi-Database | (none direct) | NO CHANGE | — | — |
| 45 | Equality Semantics | (none direct) | NO CHANGE | — | — |
| 46 | Worker Lifecycle | (none direct) | NO CHANGE | — | — |
| 47 | Output Name Encoding | (review) | **REVIEW** | Verify auto-synthesized properties (`@x.isValid`, `@x.errors`, etc.) are encoded coherently; engine auto-declared variables (M6); derived engines (L20). Likely small additions | §6, §51 |
| 48 | The `fn` Keyword | (none direct) | NO CHANGE | — | — |
| 49 | `while` and `do...while` Loops | (none direct) | NO CHANGE | — | — |
| 50 | Assignment as Expression | L1, L19 | **SMALL EDIT** | §50 reaffirm under markup-as-value pillar; assignment-as-expression interaction with multi-statement-handler restriction (L19 — assignment IS legal as a single expression in event handler) | §1, §5 |
| 51 | State Transition Rules / `<machine>` (rename to `<engine>`) | L6, L7, L9, L20, M4, M5, M6, M12, M13, M14, M15, M16, M17, M18 | **MAJOR REWRITE — LARGEST** | §51 substantially rewritten. State-children (M4) — sugar over `if=(@engineVar == .ThisVariant)` plus rule= contract. Engine declaration position = mount position (M5). Auto-declared variable (M6). Direct write validation via rule= contract (M12). `.advance(.X)` explicit-throws variant (M13). `effect=` + `<onTransition>` (M14). `:`-shorthand for single-expression body (M15). Auto-derived var name (M16). `initial=` attribute + lint (M17). Engine use-site for cross-file mount only (M18). Derived engines `derived=expr` (L20) — derived engines reject rule=, initial=, direct writes; `<onTransition>`/`effect=` still fire on derived state changes; chained derivation legal with cycle detection. ~1,723 current lines → likely 2,500-3,500 lines after rewrite | §1, §6, §17, §18, §21, §34 |
| 52 | State Authority Declarations | (review) | **REVIEW** | Under V5-strict, server-state @var semantics intact; verify two-tier authority composes with auto-synthesized validity surface (likely yes, no changes needed) | §6, §11 |
| 53 | Inline Type Predicates | L4 | **PARTIAL REWRITE** | §53 add shared-core vocabulary cross-ref (`req`, `length`, `pattern`, etc.) — note these compose with refinement-type predicates; partial unification framing per L4. Refinement types stay strongest (compile-time + runtime boundary); state validators are runtime-only-reactive; schema constraints are DBMS-enforced. Three loci, one shared word vocabulary | §39, §55-NEW |
| 54 | Nested Substates and State-Local Transitions | (review under M4) | **PARTIAL REWRITE** | §54 may need updates to compose with M4 state-children; verify nested substates work under engine state-children syntax (probably yes; nested = state-children-of-state-children) | §51 |
| **NEW §55** | **Validators + Validity Surface** | L4, L11, L12, L13, L14, L18 | **NEW SECTION** | Brand new section. Covers: (a) shared validator core vocabulary (`req`, `length`, `pattern`, `min`, `max`, `gt`, `lt`, `gte`, `lte`, `eq`, `neq`, `oneOf`, `notIn`); (b) auto-synthesized validity surface per compound (compound-level + per-field; isValid/errors/touched/submitted; read-only); (c) `<errors of=expr/>` first-class element with body override + `all` attribute; (d) cross-field validation via predicate args; (e) error message resolution chain (4 levels: inline / project-registered / scrml:data defaults / match escape hatch); (f) `reset(@cell)` keyword + `default=` attribute. Estimated 800-1200 lines | §4, §6, §39, §41, §42, §53 |

### Sections summary by disposition

| Disposition | Sections | Count |
|---|---|---|
| NO CHANGE | 2, 8, 9, 12, 19, 20, 23, 25, 26, 27, 29, 30, 32, 33, 35, 36, 37, 40, 43, 44, 45, 46, 48, 49 | 24 |
| SMALL EDIT | 3, 10, 15, 16, 21, 24, 31, 41, 42, 50 | 10 |
| PARTIAL REWRITE | 1, 4, 5, 7, 13, 14, 17, 34, 39, 53, 54 | 11 |
| MAJOR REWRITE | 6, 18, 38, 51 | 4 |
| REVIEW (likely small) | 22, 28, 47, 52 | 4 |
| FOLD | 11 (into §6) | 1 |
| NEW SECTION | 55 (validators + validity surface) | 1 |

**Total existing sections: 54.** Of those, 24 unchanged (44%), 30 changed (56%). One new section (§55). One section folded (§11 → §6).

---

## §3 New section detail — proposed §55

### §55 Validators and Validity Surface

This section is BIG enough to warrant its own slot. It can't reasonably go inside §6 because §6 is already the largest section and a self-contained validator+UI+message-resolution surface deserves a clean home.

**Proposed structure:**

- §55.1 The shared validator core vocabulary (table of predicates and their semantics)
- §55.2 Validators on state-cell declarations (bare-attribute syntax; firing semantics; reactive recomputation)
- §55.3 Validators on refinement type expressions (cross-ref §53; compile-time + runtime-boundary firing)
- §55.4 Validators on `<schema>` columns (cross-ref §39; additive to SQL-mirror)
- §55.5 Auto-synthesized validity surface — compound-level (`@x.isValid`, `@x.errors`, `@x.touched`, `@x.submitted`)
- §55.6 Auto-synthesized validity surface — per-field (`@x.field.isValid`, etc.)
- §55.7 Synthesized-property semantics: read-only, reactive, edge-case behaviors (no-validator compounds, single-value cells)
- §55.8 The `<errors of=expr/>` first-class element
- §55.8.1 Default rendering (first error via messageFor)
- §55.8.2 Body override
- §55.8.3 The `all` attribute
- §55.8.4 `of=` attribute resolution rules (always required; implicit `.errors` lookup)
- §55.9 Error tag enum (`ValidationError`) — built-in variants + `.Custom(tag)` extensibility
- §55.10 Error message resolution — 4-level chain
- §55.10.1 Inline override on field declaration (highest priority; static-string only)
- §55.10.2 Project-registered messages via `scrml:data registerMessages`
- §55.10.3 `scrml:data` shipped English defaults
- §55.10.4 `match` over `ValidationError` (escape hatch)
- §55.11 Cross-field validation via predicate args
- §55.11.1 Dependency tracking through expression args
- §55.11.2 Circular dependency detection (E-VALIDATOR-CIRCULAR-DEP)
- §55.11.3 Cross-cell expression args beyond bare references
- §55.12 Multiple errors per field — short-circuit on `req`, compose otherwise
- §55.13 The `reset(@cell)` keyword
- §55.13.1 Language-keyword status (not stdlib)
- §55.13.2 Mutation semantics (no return value)
- §55.13.3 The `default=` attribute (γ semantics — re-eval init unless override)
- §55.13.4 Per-field reset on compound (`reset(@signup.name)`)
- §55.13.5 Reserved identifier (cannot define local `function reset()`)
- §55.14 Validators on engine state-cells (cross-ref §51)
- §55.15 Error code listing (cross-ref §34)

**Estimated size:** 800-1200 lines. Roughly comparable in size to §15 (Components, 731 lines) or §13 (Async Model, 269 lines, but smaller surface). Validators are a substantial new surface — sized like a major v0.next addition, which they are.

---

## §4 PIPELINE.md impact

`compiler/PIPELINE.md` is 1,941 lines. Tracks per-stage contracts. Major impacts:

### §4.1 Stage contracts that need rewriting

- **Tokenizer / Lexer stage:** `<x>` decl-vs-render-by-tag-vs-engine-statechild disambiguation; `:`-shorthand body recognition; `is some` and `is not` as composite operators
- **Parser stage:** `<engine for=Type initial=...>` block; `<match for=Type [on=expr]>` block; `<errors of=expr/>` element; `<onTransition>` element; `pinned` keyword; `default=` attribute; render-spec-RHS in declarations; bare-variant inference; positional binding for predefined-shape; multi-statement-handler restriction
- **Resolver stage:** auto-declared engine variable per type-name; auto-derived var name (lowercase-first-run-strip-Machine); compound state Variant C field resolution; pinned forward-ref detection; cross-cell expression dependency tracking
- **Typer stage:** auto-synthesized validity surface type-checking; `ValidationError` enum + `.Custom(tag)` extension; render-spec validity (bindable vs display-only); engine `derived=expr` type compatibility; bare-variant inference type completion
- **Codegen stage:** `<x/>` render-by-tag expansion to bound input element with `bind:value`/`bind:checked`/`bind:files` dispatch by render-spec; engine state-child rendering as conditional-on-engine-variant; transition validation (rule= contract) including compile-time check inside state-child bodies; auto-synthesized validity property emission; `<errors of=expr/>` rendering; reset() keyword expansion; default= attribute capture and reset-time evaluation
- **Optimization stage:** SQL coalescing (existing) — verify no regression; reactive dependency graph for validator predicate args
- **Output stage:** auto-name encoding (cross-ref §47) for synthesized properties + auto-declared engine variables

### §4.2 Disposition

PARTIAL REWRITE. ~30-40% of PIPELINE.md needs updating. Stages without v0.next changes (output runtime, error reporting, source maps, hot reload, test harness) stay intact.

Estimated PIPELINE.md size after rewrite: ~2,400 lines (from 1,941 current).

---

## §5 SPEC-INDEX.md impact

The index is auto-generated from SPEC.md section headers. After SPEC rewrite:

1. Run `bash scripts/update-spec-index.sh` (per the existing process)
2. Verify line numbers align with the rewritten sections
3. Add Quick Lookup entries for new topics:
   - "validators / req / length / pattern" → §55
   - "auto-synthesized validity / isValid / errors / touched" → §55.5-§55.7
   - "errors element / `<errors of=>`" → §55.8
   - "error message resolution / messageFor" → §55.10
   - "cross-field validation" → §55.11
   - "reset / default=" → §55.13
   - "match block / `<match for=Type>`" → §18.X (new subsection number)
   - "engine `derived=`" → §51.X (new subsection number)
   - "decl-coupled-with-render-spec" → §6.X
   - "`pinned` keyword" → §6.X
   - "auto-declared engine variable" → §51.X
   - "Tier 0/1/2 ladder" → §1.5 + §17 + §18 + §51
   - "markup-as-first-class-value pillar" → §1.4

---

## §6 Suggested rewrite order (dependency-respecting)

Stage 0b should rewrite in this order to minimize churn and respect dependencies:

### Tier 1 — Foundational pillars (must land first)
1. **§1 Overview** — add §1.4 markup-as-value, §1.5 north star + Tier ladder, §1.6 V5-strict naming. Establishes the framework everything else references.
2. **§3 Context Model** — small edit per V5-strict access form per locus. Cross-refs into the new §1 subsections.

### Tier 2 — State model rewrite (largest single piece)
3. **§6 Reactivity (V5-strict access model)** — MAJOR rewrite. ~3,500-4,500 lines. The biggest single piece. Once landed, references throughout the spec resolve.
4. **§11 State Objects → fold into §6** — verify the fold; remove §11 if subsumed; cross-references throughout the spec updated.

### Tier 3 — Engines (largest behavior-shift)
5. **§51 State Transitions / Engines** — MAJOR rewrite. ~2,500-3,500 lines. Folds in M4-M6, M12-M18, L20.
6. **§54 Nested Substates** — partial rewrite to compose with §51's state-children form.

### Tier 4 — Validators (new surface)
7. **§55 NEW Validators and Validity Surface** — NEW SECTION. 800-1200 lines. References §6 (decl shape) + §53 (refinement types) + §39 (schema) + §41 (scrml:data).

### Tier 5 — Match block (downstream of engines)
8. **§18 Pattern Matching** — major rewrite for block-form addition. References §51 for engine analogs.
9. **§17 Control Flow** — partial rewrite for Tier-0 framing; cross-refs to §18 + §51.

### Tier 6 — Channels rewrite
10. **§38 WebSocket Channels** — major rewrite for file-level + drop @shared.

### Tier 7 — Schema + refinement-type vocabulary alignment
11. **§39 Schema** — partial rewrite for additive shared-core.
12. **§53 Inline Type Predicates** — partial rewrite for shared-core cross-ref.
13. **§42 `not` keyword** — small edit for `is some`/`req` coexistence clarification.

### Tier 8 — Smaller updates
14. **§4 Block Grammar** — :-shorthand, `<errors>` registration, `<onTransition>` registration.
15. **§5 Attribute Quoting** — bind dispatch table, event handler restrictions.
16. **§7 Logic Contexts** — small updates per V5-strict + multi-statement.
17. **§14 Type System** — bare-variant inference + positional binding.
18. **§15 Component System** — components-distinct-from-engines framing.
19. **§16 Component Slots** — markup-as-value reaffirmation.
20. **§21 Module/Import** — cross-file engine import.
21. **§24 HTML Spec Awareness** — register new structural elements.
22. **§31 Dependency Graph** — validator predicate-arg tracking.
23. **§41 Import System** — scrml:data registerMessages.
24. **§50 Assignment as Expression** — markup-as-value reaffirmation.
25. **§13 Async Model** — RemoteData → engine recipe cross-ref.

### Tier 9 — Error codes consolidation
26. **§34 Error Codes** — add ~15-20 new codes from L11-L20 + various M-moves. Done last because most of the codes only stabilize once their generating sections are rewritten.

### Tier 10 — Reviews (likely no change, but verify)
27. **§22 Metaprogramming** — interaction with markup-as-value pillar.
28. **§28 Compiler Settings** — new lint settings if any.
29. **§47 Output Name Encoding** — auto-synthesized property encoding.
30. **§52 State Authority** — composition with new validity surface.

### Tier 11 — PIPELINE.md
31. **PIPELINE.md** — partial rewrite per §4 above. Probably one batch alongside the SPEC rewrite, since stage contracts directly mirror SPEC behavior.

### Tier 12 — Index regeneration
32. **SPEC-INDEX.md** — regenerate via script + add Quick Lookup entries.

---

## §7 Open questions for the rewrite phase

These should NOT block the rewrite but should be resolved DURING it:

### §7.1 §11 fold decision
Does §11 (State Objects and `protect=`) get FOLDED into §6 or remain a distinct section? PA leans fold but the rewrite phase should make this call after seeing §6 in its rewritten form. If §11 retains "schema-reading + protect= types + authority relationship" content that doesn't naturally fit §6's V5-strict access framing, keep it.

### §7.2 §55 numbering
Is `§55` actually the right slot? The current SPEC ends at §54. Adding §55 is natural. But IF §11 folds into §6, we'd have a gap (no §11). Two options: (a) leave the gap and put validators at §55; (b) renumber §12 onwards down by one, putting validators at §54 (shifting current §54 → §55). PA leans (a) — gaps are cheap; renumbering hurts every cross-reference.

### §7.3 Error message format consistency
L12's 4-level resolution chain uses `(field, n) => ...` arrow-function-style messages in the `data.registerMessages` map. Is this the existing scrml message format? If `scrml:data` already has a different shape, the registerMessages format needs reconciliation.

### §7.4 `<errors of=expr/>` body override syntax
The kickstarter v2 §6.3 shows:
```scrml
<errors of=@signup.name>
  ${(err) => <span class="my-error">⚠️ ${messageFor(err)}</span>}
</>
```
The body uses an arrow-function-shaped expression that takes `err` and returns markup. Does scrml's existing function-body-as-template machinery support this exact shape? Verify against §15 (component bodies) and §16 (slot bodies) for consistency.

### §7.5 Engine `<EngineName/>` cross-file mount semantics
M18 says cross-file mount is the only use-site form for engines. If the engine is imported via `import { MarioMachine } from './engines.scrml'`, what's the rendered semantics — does it create a NEW instance per use-site? Or share a single instance? Engines are SINGLETON-by-design (per M20's components-vs-engines distinction), so probably ONE instance shared by all use-sites of `<MarioMachine/>` — but this needs explicit specification.

### §7.6 `pinned` keyword interaction with derived engines
L20 says derived engines reject direct writes. If a derived engine is also `pinned`, what does the lint-to-error upgrade apply to? Probably moot (no writes possible regardless), but worth noting.

### §7.7 Component instance-state vs engine singleton-state
M20 says components are multi-instance and engines are singleton. What happens if a component INSTANTIATES an engine in its body? Per-instance engine? Shared engine? Probably forbidden (E-COMPONENT-ENGINE-SCOPE) because engines render at decl position and component bodies expand at call sites — semantic conflict.

### §7.8 `<errors of=@signup.field>` when `field` doesn't have validators
If `<email>` has no validators, what does `<errors of=@signup.email/>` render? Per L11 Edge B (always synthesize), `errors` is empty array; rendering produces no DOM element. Verify this is the locked behavior.

### §7.9 Validator firing on derived cells
`const <derived> = expr` doesn't accept validators (L15 — derived is read-only; validators imply gating). Verify `<derived req>` is `E-DERIVED-WITH-VALIDATORS` or similar; lock the error code.

### §7.10 The `<channel>` body under V5-strict
M19 + L1: channels declare state at file-level, body uses V5-strict (`<x>` decl, `@x` access). Verify that the existing channel handlers (`onserver:open`, `onserver:message=handler(msg)`) compose with V5-strict.

---

## §8 Estimated rewrite scope (lines + complexity)

Rough estimates for Stage 0b execution:

| Section | Current lines | Target lines | Complexity |
|---|---|---|---|
| §1 Overview | 20 | 80-120 | Small (additions only) |
| §3 Context Model | 40 | 60-80 | Small |
| §4 Block Grammar | 650 | 750-850 | Medium |
| §5 Attribute Quoting | 518 | 580-680 | Medium |
| §6 Reactivity | 2,812 | 3,500-4,500 | **VERY HIGH** |
| §7 Logic Contexts | 174 | 230-280 | Medium |
| §11 State Objects | 144 | 0 (folded) | Medium (deletion + cross-ref updates) |
| §13 Async Model | 269 | 290-310 | Small |
| §14 Type System | 523 | 620-720 | Medium |
| §15 Component System | 731 | 770-810 | Small |
| §16 Component Slots | 268 | 280-300 | Small |
| §17 Control Flow | 675 | 800-900 | Medium |
| §18 Pattern Matching | 1,133 | 1,500-1,800 | **HIGH** |
| §21 Module/Import | 266 | 290-320 | Small |
| §24 HTML Awareness | 26 | 40-60 | Small |
| §31 Dependency Graph | 24 | 60-100 | Small |
| §34 Error Codes | 205 | 320-400 | Medium (+ many new codes) |
| §38 WebSocket Channels | 306 | 450-600 | **HIGH** |
| §39 Schema | 276 | 350-450 | Medium |
| §41 Import System | 207 | 240-280 | Small |
| §42 `not` keyword | 232 | 250-280 | Small |
| §50 Assignment-as-expr | 467 | 480-510 | Small |
| §51 State Transitions / Engines | 1,723 | 2,500-3,500 | **VERY HIGH** |
| §53 Inline Predicates | 939 | 1,050-1,200 | Medium |
| §54 Nested Substates | 288 | 350-450 | Medium |
| **§55 NEW Validators** | 0 | 800-1,200 | **VERY HIGH** |
| Other unchanged sections | (various) | (unchanged) | None |

**Total current: ~21,861 lines.** Target after rewrite: ~26,000-30,000 lines (estimated). Net add: ~4,000-8,000 lines. Of those, §55 NEW alone is 800-1200; §6 expansion is ~700-1700; §51 expansion is ~800-1800.

**Complexity weight (PA judgment):**
- VERY HIGH: §6, §51, §55 (these three are 60% of the rewrite work)
- HIGH: §18, §38
- MEDIUM: §4, §5, §7, §14, §17, §39, §53, §54, §34
- SMALL: everything else

---

## §9 Stage 0b execution recommendation

**Mode:** scrml-dev-pipeline T3 dispatch (NOT PA-direct). Reasons:
1. Total scope (4,000-8,000 line net add) is too big for PA-direct execution
2. The mechanical-rewrite portions (small edits, error code additions) are standard pipeline work
3. Design-context advantage matters less for execution than for the audit

**Dispatch shape:**
- ONE T3 dispatch with this impact-assessment doc as the brief
- Scope: ALL of Tier 1-12 from §6 above
- Worktree-isolation per pa.md F4 (the spec is large; isolation prevents accidental main pollution)
- Incremental commits per pa.md global rules (commit each tier as it lands)
- Progress.md at `docs/changes/v0next-spec-impact/progress.md`
- Full `bun test` after the rewrite to verify no spec-vs-code drift broken (the compiler will fail many tests until the implementation phase A1 lands; that's expected — note in the brief)

**Estimated wall-time:** 1-2 substantial sessions worth of dispatch work.

**Alternative — staged dispatch:**
Dispatch tiers in chunks (e.g., Tier 1-4 first, then Tier 5-9, then Tier 10-12). Each chunk is one dispatch. Lower risk per dispatch; higher coordination overhead. Probably better than one giant dispatch — recommend this alternative.

**Recommended staging:**
- Dispatch 1: Tiers 1-3 (Overview, Context, §6 V5-strict massive rewrite + §11 fold) — the foundation
- Dispatch 2: Tiers 4-5 (§55 NEW + §51 engines + §54 nested substates + §17 + §18 match) — the engine + match + validators block
- Dispatch 3: Tiers 6-7 (§38 channels + §39 schema + §53 predicates + §42 not) — channels + vocabulary alignment
- Dispatch 4: Tiers 8-12 (smaller updates + §34 error codes + reviews + PIPELINE.md + SPEC-INDEX.md) — cleanup

Each dispatch is bounded; each fails independently if it fails; each has its own progress.md.

---

## §10 Cross-references

- **S56 outcomes ledger:** `scrml-support/docs/deep-dives/v0next-s56-deliberation-outcomes-2026-05-04.md`
- **S55 outcomes ledger:** `scrml-support/docs/deep-dives/v0next-s55-deliberation-outcomes-2026-05-04.md`
- **S54 synthesis:** `scrml-support/docs/deep-dives/state-as-primitive-redesign-synthesis-2026-05-03.md`
- **Kickstarter v2:** `docs/articles/llm-kickstarter-v2-2026-05-04.md` (locked anchor doc; substantially edited this session per L11-L20)
- **User-voice S55 + S56:** `scrml-support/user-voice-scrmlTS.md` Sessions 55 and 56
- **SPEC-INDEX.md (current):** `compiler/SPEC-INDEX.md`
- **SPEC.md (current):** `compiler/SPEC.md`
- **PIPELINE.md (current):** `compiler/PIPELINE.md`
- **scrml-support stub for this assessment:** `scrml-support/docs/deep-dives/v0next-spec-impact-stub-2026-05-04.md` (pointer doc for cross-repo discovery)

---

## §11 Tags

#v0next #s56 #spec-impact-assessment #stage-0a-audit #pre-rewrite-brief #L1-L20-mapping #M1-M20-mapping #pipeline-impact #spec-rewrite-order #stage-0b-execution-plan
