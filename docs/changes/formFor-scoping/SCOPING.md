---
title: formFor — SCOPING + L22 family-discipline gate-walk
date: 2026-05-18
session: S102
authority: SPEC §53.14 + `scrml-support/docs/type-as-argument-family-2026-05-06.md` (gate-keeping reference) + L22 lock (S65)
status: SHIPPED S102 — SPEC §41.14 (`0c16f58`, 11 normative subsections + 8 error codes + §53.14.3/.5/.INDEX) + impl (`e7f5241`, 11 files / +2733 LOC / +58 tests / 8 E-FORMFOR-* codes confirmed firing). FLAGSHIP L22 family member shipped end-to-end. Deep-dive at `scrml-support/docs/deep-dives/formFor-design-2026-05-18.md` (`efdf757`) — 10 OQs deliberated (7 closed HIGH/MED-HIGH + 2 via debates + 1 skipped per HIGH+MED-HIGH methodology rule). OQ-FF-1 debate verdict: slot-style customization 51.5/60. OQ-FF-2 debate verdict: explicit-attr+slot+PE-default 52/60. Canonical example compiles end-to-end with full `<form>` element + PE-default `action=/api/__ri_route_*` + CSRF auto-injection + per-field render via shape-dispatched inputs + title-case labels + error anchors. v1.next deferred items (per-type renderer registry, `@label` annotation, auto-recurse into nested struct fields) tracked in §53.14.3 family-roster.
family: type-as-argument; FLAGSHIP member; second general-position member after parseVariant
predecessor: parseVariant (S65, `36a2d88` — first general-position member, set the precedent + helper extraction shape)
estimated_cost_at_intake: ~25-40h (family-roadmap rough; revised per survey at deep-dive close)
---

# formFor — SCOPING

## What this doc is for

S101 close named formFor as the v0.4 anchor. The L22 family discipline (SPEC §53.14.4) requires every future type-as-argument addition to pass four gates BEFORE spec or impl surface lands. This SCOPING walks all four gates honestly + structures the deep-dive briefing for gate 4.

**Bottom line up front:**
- Gate 1 (per-shape sliver test) — **PASSES** per SPEC §53.14.3.
- Gate 2 (synonym-detection precondition) — **PASSES** (no existing primitive emits markup from a struct definition; closes Gap #19 + #20).
- Gate 3 (asymmetric-forfeit-cost decomposition) — **WRITTEN** below; the asymmetry strongly favors SHIP-with-discipline.
- Gate 4 (deep-dive when convener has any doubt) — **FIRES**. formFor has at least 10 design-surface OQs that need structured deliberation before spec / impl land. Per family discipline, the cost of running a deep-dive is bounded; the cost of landing a wrong shape is unbounded.

The SCOPING's job is to STRUCTURE the deep-dive briefing, not to answer the OQs. The OQs are decided at deep-dive + debate.

---

## Pre-dispatch corpus-ouroboros check (S101 standing rule)

`git log --grep="formFor"` on scrmlTS — **no implementation commits**. References:
- `cb2c599` (S101 v0.3.2 wrap) — only mentions L22 family in changelog summary.
- `5efdd05` (S65) — type-as-argument family discipline doc created in scrml-support.
- `fc7fe93` (S65) — predicate-gaps inventory (Gap #19 closed by parseVariant; Gap #20 added — formFor target).

`grep -n formFor compiler/src/` — single comment at `type-system.ts:9641` (forward-looking note inside parseVariant impl).

`grep formFor compiler/SPEC.md` — formFor IS named in §53.14.3 (family roster — "planned FLAGSHIP") + §53.14.5 (compile-time recognition — listed alongside other planned members + struct-kind requirement) + §41.13 prologue (precedent paid).

**Verdict:** SCOPING is greenfield. No prior impl to harvest; SPEC framing exists but is roster-level only (no detailed surface). Authoring this SCOPING is clean per Rule 4 (SPEC is normative; we're not contradicting it — we're filling in the design surface).

---

## §1. Authority chain

1. **L22 lock (S65)** — type-as-argument is a first-class scrml language primitive. Every family member is a delta within L22's scope.
2. **SPEC §53.14** — family framing + four-gate discipline. formFor is named as a planned member with sliver-test status PASSES.
3. **`scrml-support/docs/type-as-argument-family-2026-05-06.md`** — gate-keeping reference doc. Names formFor as **FLAGSHIP** ("scrml.dev demo. One struct definition + five lines of glue → working form with validation + working table + working schema. The 'we are not React' pitch.")
4. **debate-05 verdict (S65)** — ratified the family at parseVariant; subsequent members ride this precedent.
5. **S101 user direction** — formFor named as v0.4 anchor at S101 close. User-authorized SCOPING.
6. **Pillar 5b — Reach discipline (S98)** — applies: formFor is a state/markup primitive (state primitives emit state-shaped scaffolding), not a calculation. Reach for state-shape first → formFor IS that reach for the "I need a form from this struct" problem.

---

## §2. Gate 1 — Per-shape sliver test (debate-02 + debate-04 methodology)

**Claim:** formFor produces a distinct semantic shape vs every existing primitive in scrml.

**Test:** Can the formFor behaviour be expressed by a 1-2 line composition of existing predicates, refinement types, family members, or stdlib functions?

**Adversarial composition attempt #1 — using Shape 2 decl-coupled-with-render-spec (§6.2):**

```scrml
type Signup:struct = { name: string, email: string, agree: boolean }

// Shape 2 today requires per-field hand-authoring:
<signup>
    <name  req length(>=2)> = <input type="text"/>
    <email req email>       = <input type="email"/>
    <agree req>             = <input type="checkbox"/>
</>
```

Shape 2 emits the input markup + bind:value + validity wiring per-field, but **the developer hand-authors each field**. It does NOT derive markup from the struct type. The struct type is independently declared; the form is independently declared; the binding is by-name-match. No primitive walks the struct definition and emits the form.

**Adversarial composition attempt #2 — using `<errors of=>` + auto-synth validity surface (§55):**

The auto-synth validity surface gives you `isValid`/`errors`/`touched`/`submitted` for free on compound state, AND `<errors of=>` renders error messages — but only AFTER the compound state has been hand-authored with each field's render-spec and validators. The validity surface CONSUMES the manual decl; it does not generate it.

**Adversarial composition attempt #3 — using components:**

A `<SignupForm>` component is one solution, but the developer must:
1. Define the struct type.
2. Define the component with one prop per field.
3. Manually wire each prop into Shape 2 decls inside the component body.
4. Manually wire validators on each decl.
5. Manually wire `<errors of=>` blocks.
6. Manually wire the submit handler.

Components require per-struct hand-authorship; they do not derive from the struct type.

**Verdict — Gate 1 PASSES.** formFor's semantic shape (compile-time structural walk of struct fields → emit `<form>` markup tree using existing Shape 2 + auto-synth validity surface + `<errors of=>` machinery) is **not expressible** by composing existing primitives. The struct-walk is the irreducible piece — predicates do not generate markup; refinement types do not generate markup; components require per-struct hand-authoring. formFor is the structural primitive that derives form-markup from struct-shape.

**SPEC §53.14.3 already records this verdict.** This SCOPING confirms it independently.

---

## §3. Gate 2 — Synonym-detection precondition (debate-04)

**Claim:** formFor is NOT a synonym for any existing surface.

**Cross-check against canonical synonyms (the precedent triplet from §53.14.4):**

| Synonym precedent | Was it a synonym? | Why | Does formFor look like this? |
|---|---|---|---|
| `parseShape(json, StructType)` | YES — synonym for §53.4 SPARK boundary refinement | The candidate offered no new shape; struct-boundary parsing is either server-fn normalization or boundary refinement on typed assignment | NO — formFor emits markup, not refined values |
| `parallel` attribute on `<engine>` | YES — synonym for nested engines + derived engines + `<onTransition>` direct-write | Per-kind mini-DSL eliminated by Pillar 5 | NO — formFor is not a per-kind variant of an existing primitive |
| `zod-schema-as-validator` adapter | YES — synonym for `custom(fn)` slot in `stdlib/data/validate.scrml` | Existing escape-hatch already covers the shape | NO — formFor is not a validator; it generates form markup |

formFor is structurally orthogonal to all three precedent synonyms. It generates markup from struct-shape, which no existing primitive does.

**Cross-check against existing markup-generating primitives:**

| Existing primitive | Generates markup from? | Same as formFor? |
|---|---|---|
| Shape 2 render-spec | A per-cell decl | NO — per-cell, not per-struct |
| `<errors of=expr/>` | A validity-surface read | NO — error display, not form-input rendering |
| Components | A component body (hand-authored) | NO — per-struct hand-authoring required |
| `<engine for=Type>` state-children | Hand-authored per variant | NO — per-variant hand-authoring required |
| Markup-typed derived cells | A reactive expression | NO — expression-driven, not struct-driven |
| `lift <foo>...</>` | A template literal | NO — template hand-authored |

**No existing primitive walks a struct definition and emits a derived markup tree.** Gate 2 PASSES.

**Verdict — Gate 2 PASSES.** formFor is not a synonym for any existing primitive. It carves a distinct surface: type-driven markup generation.

---

## §4. Gate 3 — Asymmetric-forfeit-cost decomposition (debate-03)

**Three cost cells, written honestly.**

### §4.1 SHIP-and-wrong

What if formFor turns out to be the wrong shape?

- **Lock-in cost:** the name `formFor` is committed; future "fixed" forms get an awkward sibling name OR `formFor` gets a breaking-change cycle.
- **Reversal cost:** deprecation cycle (W → E → parser-strip over 2-3 minor versions). Adopters who built on formFor must hand-roll or migrate.
- **Refactor cliff:** if formFor's per-field render-strategy is wrong-shape, the deprecation surface is broad — every adopter form needs rework.
- **Architectural cost:** the L22 family pays its architectural commit once at parseVariant (S65). formFor adds no NEW architectural commit; it harvests precedent. Reversal of formFor does not unwind L22.

**Magnitude:** bounded. The architectural commit is paid; SHIP-and-wrong costs name-lock-in + adopter migration surface. Single primitive can be deprecated cleanly.

### §4.2 DON'T-SHIP-and-wrong

What if we don't ship formFor and that turns out to be the wrong call?

- **Per-adopter hand-roll cost:** every scrml app with a form does this work per-struct. The 6-field signup form alone is ~30 lines of Shape 2 decl boilerplate + matching `<errors of=>` blocks + matching submit handler wiring. A 12-field admin form is ~60 lines per CRUD entity. For an app with 20 forms, this is ~600-1200 lines of boilerplate.
- **Compounded across the adopter base:** every adopter pays this cost every year. The cost compounds.
- **Flagship-narrative cost:** scrml.dev's "define type once → form derives" is the lead-with feature. Without formFor, the flagship demo is a hand-authored Shape 2 form — same as React + Formik but with Shape 2 sugar. The "we are not React" pitch goes hollow.
- **Adopter-migration-cost (the inverse):** every adopter who tried scrml and bounced because of form boilerplate is permanent loss. We don't get those adopters back.
- **Cross-family cascade:** schemaFor + tableFor in the family roadmap are siblings of formFor. If we don't ship formFor, the family discipline weakens — "FLAGSHIP planned" claims in SPEC §53.14.3 + the family doc become aspirational without a real precedent. The architectural-commit ROI (~14-23h at parseVariant for ~65-125h harvest across the family) doesn't materialize.

**Magnitude:** large, compounding, and asymmetric. DON'T-SHIP is the expensive side.

### §4.3 HYBRID-and-wrong

What if we ship a partial formFor (e.g., minimal customization, simple submit-handler model) and finish later?

- **Adopter-friction cost:** partial formFor that doesn't cover real adopter shapes forces adopters to hand-roll AROUND it — they get formFor for trivial cases + Shape 2 + manual wiring for everything else. Worst of both worlds.
- **Naming-lock cost:** the name + the SPEC entry are committed; expanding the surface later is a breaking-change cycle if the partial shape was wrong.
- **Marketing-cost:** "formFor exists but you'll still hand-roll for real forms" is a worse pitch than "formFor is planned, hand-roll for now." The half-shipped surface damages the flagship narrative more than the no-surface state.
- **Better alternative:** ship the FULL surface gated behind a feature-flag (e.g., `bun.eval()` style admission), OR ship as parseVariant did — recognized at type-system, codegen emits monomorphized per-call. The full surface is finite (struct walk + per-field-type → markup mapping); HYBRID is not the right tradeoff axis.

**Magnitude:** HYBRID is worse than either ship-full or close. The hybrid-and-wrong cell is the worst outcome.

### §4.4 Asymmetry verdict

Cost asymmetry strongly favors **SHIP-with-discipline-on-customization-slots**.

- DON'T-SHIP cost is large + compounding + cross-family.
- SHIP-and-wrong cost is bounded + reversible.
- HYBRID is worst of both.
- The architectural commit is paid; SHIP-and-wrong does not re-cost it.

**Verdict — Gate 3 PASSES with strong ship-bias.** The discipline that bounds the SHIP-and-wrong cost is **the customization-slot shape** + **the per-field render-strategy contract** + **the submit-handler interface contract**. Get those three right at the deep-dive → SHIP is bounded.

---

## §5. Gate 4 — Per-feature deep-dive (the convener has many doubts)

**Verdict — Gate 4 FIRES.** formFor has at least 10 design-surface open questions that need structured deliberation BEFORE spec / impl land. Listing them here as the deep-dive briefing.

### §5.1 OQ catalog (10 design-surface questions for deep-dive)

#### OQ-FF-1 — Per-field render-strategy customization shape

How does an adopter override the default rendering for a specific field?

**Candidates:**
- (a) Slot-style — formFor emits one named slot per field; adopter fills the slot with custom markup. *Pattern:* `<formFor for=Signup><slot name="email"><input type="email" class="custom"/></slot></>`. Composes with existing component slots (§16).
- (b) Per-field attribute on `formFor` call — `formFor(Signup, render={email: customRenderer})`. Object-with-function shape; runtime dispatch.
- (c) Per-field-type registry — `formFor` walks struct fields, looks up each field's TYPE in a custom-renderer registry. Type-driven, struct-agnostic. Adopter registers once per app.
- (d) NONE in v1 — formFor v1 is "no customization; live with default rendering or hand-roll." Defer customization to v2 once shape is known.

**Tradeoffs:** (a) is the most scrml-idiomatic (slots are first-class), but verbose for the common case. (b) is concise but introduces an attribute shape that doesn't exist elsewhere (object-with-functions as attribute value). (c) is most powerful but adds a registry concept. (d) is most conservative + matches "ship the precedent, expand on signal."

#### OQ-FF-2 — Submit handler wiring contract

How does the form submit dispatch into adopter code?

**Candidates:**
- (a) Auto-derived server-fn — `formFor` looks for a `submit<StructName>` server function in scope; if found, wires submit-button to call it with the form's compound state. Convention-over-configuration.
- (b) Explicit attribute — `<formFor for=Signup onsubmit=mySubmitFn>`. Bare-form event handler per §5.2.3.
- (c) Standalone — `formFor` emits a form with no submit button by default; adopter wraps formFor in their own form + button.
- (d) Both (a) + (b) — convention WITH explicit override slot.

**Tradeoffs:** (a) is the most flagship-demo-ready ("define struct → form just works"), but introduces a magic naming convention. (b) is most explicit, less magic, but more boilerplate. (d) is the JS-framework norm (e.g., React Hook Form's `onSubmit` prop with default behavior). The v0.3.0 `<auth role="X">` attribute shipped per OQ-A3-A user override S91 with full-interpolation grammar; formFor's onsubmit attribute should match that grammar.

#### OQ-FF-3 — `pick=` / `omit=` / `partial=true` attribute shape (Gap #20 closure)

The family-discipline doc and the predicate-gaps inventory both name Gap #20 (validator-set transformation) as **properly closed by `formFor(StructType, partial=true)` or `formFor(StructType, pick=...)`** — not by a parsePartial primitive. How does this surface look?

**Candidates:**
- (a) Attribute on the formFor call expression — `formFor(Signup, pick=["name", "email"])`. Array-valued attribute, comma-list of bare field-name strings.
- (b) Variadic call form — `formFor(Signup, .pick("name", "email"))`. Type-as-argument family chaining (similar to fluent builder).
- (c) Markup attribute — `<formFor for=Signup pick="name,email">`. String-encoded list, parser-recognized.
- (d) Type-level operation — `type SignupPartial = Pick<Signup, "name" | "email">` then `formFor(SignupPartial)`. Type-level transform; formFor takes the resulting type. Forces the type-system to support `Pick<>`/`Omit<>` first.

**Tradeoffs:** (a) is concise + readable but requires array-value attribute parser. (c) is the most scrml-attribute-idiomatic but limits to string lists. (d) is the type-systems-purist answer but requires type-level utility types as a precondition. (a) is the simplest first ship.

`partial=true` is binary; the question is interaction with pick/omit (e.g., does `partial=true pick=...` mean "make picked fields optional" or "pick fields then make all optional"?).

#### OQ-FF-4 — Multi-step forms (in v1 or deferred?)

Many real-world forms are multi-step (e.g., wizard signup, multi-page checkout). Does formFor support multi-step in v1?

**Candidates:**
- (a) NOT in v1 — single-step only. Multi-step is composed by adopter using multiple formFor calls with state-machine engine driving the step state.
- (b) `steps=` attribute — `<formFor for=Signup steps={[["name", "email"], ["agree"]]}>` defines step groupings.
- (c) Nested formFor — `<formFor for=Signup><step fields="name,email"/><step fields="agree"/></>`. Step-children declared in markup.
- (d) Type-driven — adopter declares `type SignupStep1:struct = Pick<Signup, "name" | "email">` etc., uses multi-step engine over the types.

**Tradeoffs:** Multi-step is real but composes naturally with engines (Tier 2 surface). (a) is the simplest first ship + composes with existing primitives. Defer to adopter friction signal.

#### OQ-FF-5 — Cross-field validation hookup

§55.11 cross-field validation already works for hand-authored compound state — `<confirm req eq(@signup.password)>`. Does formFor support cross-field validators at declaration time?

**Candidates:**
- (a) NOT in v1 — adopter adds cross-field validators by writing supplementary `<errors of=...>` blocks AFTER the formFor call.
- (b) Validator attribute on type field — type declarations gain a cross-field validator-attribute slot (`type Signup:struct = { password: string, confirm: string eq(@signup.password) }`). Requires type-system extension to accept reactive-cell-refs as validator args in type declarations.
- (c) Type-level cross-field — `type Signup:struct = { ..., confirm: string } where confirm == password`. Refinement-type-style cross-field.

**Tradeoffs:** (a) is conservative + composes; (b) and (c) require type-system work that may not be in scope for v1 formFor. (a) recommended for v1.

#### OQ-FF-6 — Form-level vs per-field error rendering — default

formFor will use existing auto-synth validity surface; how does it render errors BY DEFAULT?

**Candidates:**
- (a) Per-field — each field renders its own `<errors of=@signup.{field}/>` block immediately after the input.
- (b) Form-level summary — single `<errors of=@signup/>` at form top/bottom.
- (c) Both — per-field inline + form-level summary.
- (d) Configurable — `<formFor for=Signup error-strategy="per-field|summary|both">`.

**Tradeoffs:** Per-field is the modern UX default; form-level summary is the accessibility-friendly default; "both" is the React/Bootstrap norm. Probably want (a) default + (d) attribute opt-in.

#### OQ-FF-7 — Labels / placeholders / aria-attributes — derive from field names or require override?

Each field needs a human-readable label. Default derivation strategy?

**Candidates:**
- (a) Title-case the field name — `email` → "Email", `firstName` → "First Name", `agreeToTerms` → "Agree To Terms". Mechanical.
- (b) registerLabels stdlib analog — `data.registerLabels({Signup: {email: "Email address", agreeToTerms: "I agree to the terms"}})`. Project-wide, matches `registerMessages` (§41.12).
- (c) Type-field annotation — `type Signup:struct = { email: string @label("Email address") }`. Annotation syntax at type-declaration site.
- (d) Slot override — fall through to OQ-FF-1's per-field render slot when adopter needs custom label.

**Tradeoffs:** (a) + (b) is the family-economic pattern — mechanical default + project-scoped registry. (c) requires type-system annotation work. registerMessages (§55.10) is the precedent for project-scoped registries.

#### OQ-FF-8 — `schemaFor` cross-ref / symmetry

`schemaFor(StructType)` is the planned family-sibling that emits `<schema>` DDL from struct field predicates. formFor and schemaFor share a struct-walk shape. Should they share infrastructure?

**Candidates:**
- (a) Independent — each member implements its own struct-walk; no shared helpers beyond the L22 type-validation extraction.
- (b) Shared struct-walk helper — both members ride a `walkStructFields(typeId): FieldShape[]` helper. Each does its own emit.
- (c) formFor derived from schemaFor — formFor walks `<schema>` DDL output, generates form. Couples the two; questionable.
- (d) Both from a common AST — both walk the struct type's AST directly. Independent emit paths but shared traversal.

**Tradeoffs:** (b) is the family-economic answer — shared walker, distinct emitters. Mirrors the parseVariant pattern (shared type-validation helper, distinct codegen per primitive).

#### OQ-FF-9 — Type-argument shape — bare ident vs generic Type<...>?

parseVariant accepts a bare `IdentExpr` whose name resolves to an `:enum` type (per §53.14.5 + §41.13). Does formFor accept the same shape, or allow generic-parameterized types?

**Candidates:**
- (a) Bare ident only — `formFor(Signup)`. Matches parseVariant precedent.
- (b) Generic-parameterized — `formFor(List<Item>)`. Requires generics on structs (not in scrml v0.3).
- (c) Type-with-options — `formFor(Signup, pick=["name"])` — covered by OQ-FF-3; not a generic-parameter case.

**Tradeoffs:** (a) matches the precedent. (b) is a v0.4+ question because generics on structs is a separate language-level decision.

#### OQ-FF-10 — Server-fn submit contract type

If OQ-FF-2 lands on auto-derived server-fn convention, what is the type of the submit server function?

**Candidates:**
- (a) `server function submit<StructName>(values: StructName) ! SubmitError { ... }` — fixed name + fixed shape. Auto-bound by formFor.
- (b) `server function submit<StructName>(values: StructName) -> SubmitResult` — non-failable with explicit result type. Less idiomatic.
- (c) Adopter-defined name + attribute reference — `<formFor for=Signup onsubmit=mySubmitFn>` with type checked at compile time.
- (d) Both (a) + (c) — magic-by-convention OR explicit attribute.

**Tradeoffs:** (a) is the flagship-demo shape but is magic. (c) is explicit + plays well with §40.7 documentary attribute precedent. (d) is the realistic v1 ship.

### §5.2 Deep-dive structure recommendation

The deep-dive should follow the standard 5-phase shape (per `~/.claude/agents/scrml-deep-dive.md`):

1. **Scope Lock** — surface this SCOPING doc; lock the 10 OQs as the deliberation set.
2. **Research** — 5 source categories:
   - Project data: existing Shape 2 + auto-synth validity surface + `<errors of=>` codepaths; samples that hand-authored forms (likely many).
   - Dev agent polls: how would a dev agent generate a form from a struct today? What syntax do they reach for?
   - Expert agent consultation: forge `react-hook-form-expert` + `formik-expert` + `final-form-expert` (or rely on existing react-expert?) + `qwik-expert` (Qwik has a struct→form story) + `htmx-expert` (form-derivation via attributes).
   - Prior art (WebSearch): React Hook Form, Formik, Final Form, vee-validate, FormKit, Felte, AlpineJS x-data, Qwik forms, Remix forms, Phoenix LiveView forms.
   - Forge missing experts as needed.
3. **Curation** — per OQ, surface 2-4 candidate shapes with concrete code examples + tradeoff matrix.
4. **Output** — structured markdown to `scrml-support/docs/deep-dives/formFor-design-2026-05-1X.md`.
5. **Feed to Debate** — if any OQ has 3+ viable approaches with structural tradeoffs, recommend a debate. Likely candidates: OQ-FF-1 (customization shape) + OQ-FF-2 (submit wiring) + OQ-FF-7 (label-derivation). These three are the load-bearing UX-shape questions.

### §5.3 Deep-dive briefing — non-negotiables

The deep-dive MUST respect:

- **Pillar 5b (Reach discipline, S98)** — formFor IS the state-shape reach for "form from struct" problems. The deep-dive should NOT propose any fn-only path that bypasses Shape 2 + auto-synth validity surface + `<errors of=>`.
- **Markup-as-value pillar (L1)** — formFor outputs markup. The output composes with other markup primitives. Slots, components, validators, engines all interoperate.
- **V5-strict access (§6.1)** — every state cell formFor synthesizes is `<x>`-declared, `@x`-accessed. No exceptions.
- **No null/undefined (S89 ABSOLUTE rule)** — formFor field defaults use `not` not `null`. `default=not` is the canonical absence form per §6.8.1.
- **Pillar 5 — no per-kind mini-DSL** — formFor MUST emit standard scrml — Shape 2 decls, `<errors of=>`, standard event handlers. The output of formFor SHALL be readable as if hand-authored.
- **SPEC §53.14.4 family discipline** — every design decision SHALL trace back to gate 1 (sliver) + gate 2 (synonym-check) + gate 3 (forfeit-cost). New design that violates any gate triggers a re-walk.
- **S101 standing rule (pre-dispatch sanity check)** — every implementation dispatch post-deep-dive SHALL run `git log --grep=formFor` + read this SCOPING + read the deep-dive output BEFORE authoring code.

---

## §6. SPEC delta surface (anticipated post-deep-dive)

The deep-dive will determine final shapes; this section anticipates the SPEC sections that need editing.

| SPEC section | Anticipated delta | Cost-class |
|---|---|---|
| §53.14.3 | Update family-roster row for formFor — sliver-test PASSES → SHIPPED | trivial (1 row) |
| §53.14.5 | Compile-time recognition — add `formFor` to the recognized primitives list (already named; just status flip) | trivial |
| §41 — NEW §41.14 | `formFor(StructType)` API entry — sibling to §41.13 parseVariant; canonical shape, constraints, examples, error codes | ~30-50L SPEC |
| §34 | NEW per-primitive error codes — at minimum: `E-FORMFOR-TYPE-NOT-STRUCT`, possibly `E-FORMFOR-PICK-INVALID-FIELD`, `E-FORMFOR-OMIT-INVALID-FIELD`, `E-FORMFOR-NESTED-STRUCT-UNSUPPORTED` (if v1 doesn't support nested structs) | ~3-5 rows |
| §55 / §55.5 | Cross-ref — formFor uses existing auto-synth validity surface. Add cross-ref paragraph noting formFor as a consumer | ~5L SPEC |
| §55.8 | Cross-ref — formFor renders errors via `<errors of=>`. Add cross-ref paragraph | ~3L SPEC |
| §15 (Components) | Cross-ref — formFor vs components distinction. Add normative paragraph: formFor produces markup-tree-as-value; components produce per-instance reactive scopes. They compose | ~5-10L SPEC |
| §41.12 / §55.10 | If OQ-FF-7 lands on registerLabels, NEW `data.registerLabels` API entry, parallel to `registerMessages` | ~15-25L SPEC |
| §53.14.4 | Possibly amend gate 3 example list with formFor's forfeit-cost-decomposition shape (FLAGSHIP precedent) | optional |
| `compiler/SPEC-INDEX.md` | New row for §41.14 + Quick-Lookup updates | trivial |

**Anticipated total SPEC delta:** ~60-100L SPEC text + 3-5 §34 catalog rows + INDEX refresh. Modest; rides parseVariant precedent shape.

---

## §7. Implementation path (anticipated post-deep-dive, post-SPEC-amend)

Riding parseVariant precedent:

1. **Type-system recognition** (`compiler/src/type-system.ts`) — extend recognizer to admit `formFor(StructType)` alongside parseVariant. Validate type-argument is `:struct` kind (mirrors `E-ENGINE-004` / `E-PARSEVARIANT-TYPE-NOT-ENUM` shape). Emit `E-FORMFOR-TYPE-NOT-STRUCT` on misuse.
2. **Codegen** — NEW `compiler/src/codegen/emit-form-for.ts` (parallel to `emit-parse-variant.ts`). Walks the struct field shapes, emits the equivalent Shape 2 decls + `<errors of=>` blocks + submit handler bindings + form-level event wiring. The emit-output IS standard scrml shape — could be authored by hand (Pillar 5 discipline).
3. **Stdlib** — `formFor` exported from `stdlib/data/parse.scrml` (or NEW `stdlib/data/form.scrml`, TBD at deep-dive). Sibling of `parseVariant` export.
4. **Tests** — per-shape conformance tests + unit + integration. Cover: bare struct, pick/omit/partial, submit-handler wiring, label derivation, error rendering, cross-field validators (if v1), `E-FORMFOR-*` error codes.
5. **Samples + Examples** — at least one flagship sample at `samples/compilation-tests/` + at least one example app at `examples/` that uses formFor as the lead-with feature. Cross-ref scrml.dev demo.
6. **scrml.dev refresh** — landing-page demo + README + tutorial update + changelog entry.
7. **README compile-gate addition** — add a README block demonstrating formFor; the new release-tag pre-push gate (S101) will exercise it.

**Anticipated cost-class:**
- Type-system + codegen: ~10-15h.
- Stdlib export + tests: ~5-8h.
- Sample + example: ~3-5h.
- scrml.dev + README + tutorial + changelog: ~3-5h.
- SPEC amendments (post-deep-dive): ~2-4h.

**Total:** ~23-37h after deep-dive lands. Aligns with family-roadmap-doc estimate of ~25-40h.

---

## §8. Risks + mitigations

- **Risk: customization shape (OQ-FF-1) lands wrong.** Mitigation: deep-dive convene a debate on customization shape; require dev-agent polling (would they reach for slots? attributes? both?).
- **Risk: submit-handler magic-by-convention (OQ-FF-2 option a) is too magic, friction-prone.** Mitigation: ship explicit attribute as primary path; convention as opt-in via attribute. Avoid the React-magic-default trap.
- **Risk: emit-form-for.ts output diverges from hand-authored Shape 2 (Pillar 5 violation).** Mitigation: every emit-form-for.ts test SHALL have a snapshot pair — formFor output AND hand-authored equivalent. Verify they are structurally identical.
- **Risk: nested struct fields (struct containing struct fields) are common but complex.** Mitigation: v1 may reject nested structs with `E-FORMFOR-NESTED-STRUCT-UNSUPPORTED`. Add to OQ list if deep-dive surfaces real demand.
- **Risk: type-as-argument family bloat — every adopter "can we add Type.thing for X?" enters the language.** Mitigation: SPEC §53.14.4 four-gate discipline; this SCOPING is the canonical precedent for how new family additions are gated.

---

## §9. Open questions to surface to user BEFORE deep-dive

Per the user's pa.md Rule 5 (shoot straight, push back where warranted), these are PA-direct questions for user disposition before the deep-dive fires:

1. **Q-FF-OPEN-1 — Deep-dive timing.** This SCOPING recommends gate-4 deep-dive fires before any spec/impl. The deep-dive itself is ~8-15h (5 phases + expert forging + debate consideration). Authorize the deep-dive? Or hold and accumulate friction signal first?
2. **Q-FF-OPEN-2 — Heads-up coding pre-pipeline.** Bug-4 (dot-path) was queued S101 with "user runs heads-up coding sessions to validate look/feel" as pre-pipeline. Does formFor want the same pre-pipeline — author 2-3 forms by hand in heads-up coding mode to validate the deep-dive's surface-shape candidates? Or skip pre-pipeline (the existing samples corpus + adopter friction are signal enough)?
3. **Q-FF-OPEN-3 — Sequencing vs PGO.** S101 close also named PGO ("chip away wherever we can") as an authorized track. Are formFor + PGO parallel (different work tracks) or sequenced (formFor first, then PGO)?
4. **Q-FF-OPEN-4 — Companion family member sequencing.** schemaFor and tableFor are sibling family members. Does formFor land alone, OR is the v0.4 anchor "formFor + schemaFor + tableFor as a wave" (~85-145h total, the full family-economic harvest)? The family-economic ratio (1 architectural commit at parseVariant → 6-12mo harvest across the family) suggests a wave-shipping is high-leverage.

---

## §10. Sequencing within the L22 family roadmap

Per `scrml-support/docs/type-as-argument-family-2026-05-06.md`, shipping order: parseVariant ✅ → serialize → formFor → schemaFor → tableFor → variantNames.

- **serialize** (~6-12mo horizon per family doc) — symmetric counterpart to parseVariant. Not blocking formFor.
- **formFor** (this SCOPING) — FLAGSHIP.
- **schemaFor / tableFor** — siblings of formFor with shared struct-walk infrastructure (per OQ-FF-8).
- **variantNames** — small primitive; horizon-late.

**S101 user direction was formFor as v0.4 anchor.** This SCOPING respects that. But Q-FF-OPEN-4 surfaces the wave-shipping option for user disposition.

---

## §11. Family-precedent doc update — ANTICIPATED, NOT DONE

Per family-discipline doc §"Future PA's checklist" step 7, when a new family member is admitted, the doc is appended with the new member's sliver-test status + cost-class.

This SCOPING is the gate-walk for formFor admission. Once admitted (i.e., after deep-dive lands + user authorizes spec/impl dispatch), the family-discipline doc should be appended with:

- formFor status: SHIPPED (after impl lands)
- Sliver-test status: PASSES (per this SCOPING gate 1)
- Cost-class actual (post-impl): X-Yh
- Cross-ref to this SCOPING + the deep-dive output

NOT DONE in this SCOPING. Done at impl close.

---

## §12. Authority chain — gates passed, gate 4 fires

| Gate | Verdict | Authority |
|---|---|---|
| 1 (sliver test) | PASSES | SPEC §53.14.3 + §2 of this SCOPING |
| 2 (synonym-detection) | PASSES | §3 of this SCOPING + cross-check against existing primitives |
| 3 (asymmetric-forfeit-cost) | PASSES with SHIP-bias | §4 of this SCOPING |
| 4 (deep-dive when convener has doubt) | **FIRES** — 10 OQs need structured deliberation | §5 of this SCOPING |

**SCOPING status:** OPEN. Pending user disposition on Q-FF-OPEN-1 (deep-dive authorize) + Q-FF-OPEN-4 (wave-ship vs solo-ship).

---

## Tags

#formFor #L22 #type-as-argument-family #FLAGSHIP #scrml.dev-demo #v0.4-anchor #S102-SCOPING #gate-4-fires #deep-dive-pending #parseVariant-precedent #Pillar-5b-reach #§53.14
