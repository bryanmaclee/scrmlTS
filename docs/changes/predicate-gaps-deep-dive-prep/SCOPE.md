---
title: Predicate-gaps deep-dive SCOPE — 4 P1 gaps from Zod-lens reprioritization
date: 2026-05-06
session: S65 prep
authority: Zod-replacement deep-dive 2026-05-06; predicate-gaps inventory 2026-05-06; family-precedent doc S65 (discipline that bounds vocabulary additions)
status: SCOPE PREPARED — awaits convener authorization to fire deep-dive (when corpus signal warrants)
trigger_conditions: A1c surfaces real-app friction OR an adopter reports `reqIf` as a blocker OR SPEC-ISSUE-§53.13.1-4 gets touched
---

# Predicate-gaps deep-dive SCOPE — 4 P1 gaps

## 1. Why this exists

The S64 predicate-gaps inventory captured 17 vocabulary gaps and parked them as orthogonal to the tier-ladder/switch arc. The S65 Zod-replacement deep-dive (`scrml-support/docs/deep-dives/predicate-system-zod-replacement-2026-05-06.md`) re-read that inventory through a **Zod-feature-matrix lens** and promoted four of the seventeen gaps to P1. The promotion criterion was *"this is a thing real Zod users reach for, often, in production form code."*

The four P1 gaps are: **#8 predicate aliases**, **#9 conditional-required (`reqIf`)**, **#12 async predicates**, **#17 normalization (`transform`/`preprocess`)**.

This doc is the **SCOPE that will guide the eventual deep-dive** — it is not the deep-dive itself. The deep-dive does not fire on SCOPE-existence; it fires on a trigger condition (§6 below). Frontloading the SCOPE makes the eventual dispatch one-shot: scope-lock work is already done.

The discipline that bounds this work is the **family-precedent doc** (`scrml-support/docs/type-as-argument-family-2026-05-06.md`) and the methodology stack from debates 02-03-04-05. Predicate-vocabulary additions are NOT in the type-as-argument family — they are a separate family — but the gate-keeping discipline transfers: each gap independently passes per-shape sliver test or it doesn't ship.

## 2. The 4 gaps in scope

### Gap #8 — Predicate aliases / composable predicates

- **Statement:** Define `passwordRules = req length(>=8) pattern(/[A-Z]/) pattern(/[0-9]/)` once, reuse: `<password passwordRules>`. Today every site repeats the stack.
- **Why P1 under Zod lens:** Zod's `.extend()` / shared schema fragments are a daily Zod pattern. Form-heavy apps DRY their predicate stacks; absence forces copy-paste.
- **Current scrml workaround:** Repeat the predicate stack at every use site, or hand-roll a state-fn helper that synthesizes the validity surface (which loses the L4 schema-lift property).
- **Cross-cuts:** **SPEC-ISSUE-§53.13.1 named-shape registry (open)** — predicate-aliases and named-shape-aliases share the registry-shape question. SPEC §53 (Inline Type Predicates), §55 (validators), primer §8.
- **Sliver-test framing (PA preliminary view, deep-dive owns final analysis):** Likely passes — aliasing is a distinct semantic shape from inline predicates (named bindable thing vs. anonymous stack). But synonym-detection precondition asks: *is `passwordRules = req length(>=8) ...` just sugar over a state-fn? Or does it carve a new home?* The L4 lift-to-all-three-loci property is the candidate distinguishing shape.

### Gap #9 — Conditional-required (`reqIf` / `requiredWhen`)

- **Statement:** `<perms reqIf(@userType === .Admin)>`. Today only direct equality cross-field via `eq(@x)`; no conditional gating on `req` itself.
- **Why P1 under Zod lens:** **The most-asked-about real-world predicate gap in form libraries.** Yup, Zod, ajv, react-hook-form all ship this. Discriminated-union forms (admin-vs-user, individual-vs-company) need it daily.
- **Current scrml workaround:** Hand-rolled derived `<formIsValid>` cell that branches on `@userType` and inspects sub-field state — loses per-field error attribution and the auto-synthesized validity surface.
- **Cross-cuts:** SPEC §55 (validators reactive surface), SPEC §53 (predicate vocabulary), primer §9 (cross-field via predicate args). Adjacent to the discriminated-union-state-shape pattern.
- **Sliver-test framing:** Likely passes sliver test. **Critical string-switch-trap analog (debate-04):** does shipping `reqIf` *entrench an anti-pattern* by giving devs a comfortable home that bypasses lifting the discriminating field to a state-type? If `reqIf(@userType === .Admin)` makes it ergonomic to keep `userType` as a string instead of a `.Admin | .User` enum, the predicate is a tier-0+ trap. Deep-dive must address this directly.

### Gap #12 — Async predicates

- **Statement:** Server-checked uniqueness — "is this username taken?" — appearing directly in the predicate slot. Currently requires a `server function` + reactive call; can't go in predicate position.
- **Why P1 under Zod lens:** Zod's `.refine(async ...)` exists; users reach for it. Async uniqueness is the canonical case.
- **Current scrml workaround:** Server-fn invoked from a derived cell, with manual reactive plumbing.
- **Cross-cuts:** SPEC §55 (validity surface — currently sync), server-fn boundary, SPEC §41 (effect/host boundary), reactive scheduler.
- **Sliver-test framing (PA preliminary view, hypothesis-only):** **Probably comes back DON'T-SHIP-as-predicate.** Predicates are sync compile/runtime checks; async checks *belong at the server-fn boundary or in a derived-cell reactive surface*. The right deep-dive output is likely an **explicit design statement**: "predicates are sync; async checks live elsewhere, here is the canonical pattern." That documentation gap is itself worth closing. Deep-dive must verify this is not motivated reasoning before stamping it.

### Gap #17 — Normalization vs validation (`transform` / `preprocess`)

- **Statement:** "trim whitespace, normalize case" before validation. Today this is a derived-cell pattern. Could be a predicate-modifier.
- **Why P1 under Zod lens:** **The most-named gap from the Zod feature matrix.** Zod's `.transform()` and `.preprocess()` are core; almost every Zod schema has at least one trim/normalize step.
- **Current scrml workaround:** Derived cell with normalization expression; or normalize-on-input handler. Loses the predicate-stack's lift-to-schema property (DB CHECK can't see it).
- **Cross-cuts:** SPEC §53 (predicate semantics — currently boolean), SPEC §39 (schema lowering — only sees boolean predicates), SPEC §55 (validity surface — currently checks, doesn't transform), primer §8.
- **Sliver-test framing:** **Hardest call of the four.** Transformation is *not* validation — it changes the value. Mixing the two locus-by-locus has a real risk: schema-locus can't lift transformations to DB ergonomically (DB normalizes via triggers/computed columns, separately). Probable deep-dive output: HYBRID — normalize-on-state (input boundary) is its own primitive, distinct from predicates, possibly a `<field normalize=trim,lower req length(>=2)>` modifier-shape that fires before predicates per-locus.

## 3. Methodology stack the deep-dive must apply

Explicit reference to the bounds:

- **Per-shape sliver test** (debate-02 + debate-04) — for each gap, candidate must carve a distinct semantic shape vs. existing vocabulary.
- **Synonym-detection precondition** (debate-04) — if a candidate is just sugar over an existing primitive with no new semantic territory, it's a synonym, earns L7-anti-pattern status, not vocabulary status.
- **Asymmetric-forfeit-cost decomposition** (debate-03) — three cost cells per gap: accept-and-wrong / defer-and-wrong / reject-and-wrong, each with reversal cost.
- **String-discriminator trap awareness** (debate-04) — does adding the predicate entrench an anti-pattern by giving a comfortable home to a shape that should have been lifted to a stronger type? Explicitly applies to **#9 reqIf**.
- **Family-precedent doc discipline** (S65) — predicate-vocabulary additions are NOT in the type-as-argument family. Separate family. But the discipline transfers: don't lock in answers before the actual question is framed (the `parsePartial` lesson from debate-05 — a candidate was closed proactively to prevent locking before framing).

## 4. Anticipated debate framings (if methodology splits the verdicts)

PA preliminary hypothesis per gap (deep-dive may overturn):

| Gap | Hypothesis | Reasoning |
|---|---|---|
| #8 aliases | **SHIP** | Likely passes sliver test cleanly; cross-cuts a registry question already open. |
| #9 reqIf | **SHIP-WITH-GUARDRAIL** | Real demand, but string-switch-trap risk requires deep-dive to design a guardrail (e.g., predicate body must reference an enum-shaped state cell, not a free-form string compare). |
| #12 async | **DON'T-SHIP-AS-PREDICATE; ship-as-design-statement** | Predicates are sync; async lives elsewhere. The output is documentation, not vocabulary. |
| #17 transform | **HYBRID** | Normalize ≠ validate. Likely a separate `normalize=` modifier-shape distinct from predicates, fires before predicate stack at the form/state locus. |

**Likely panel composition for downstream debate (if needed):**

- **simplicity-defender** — anti-add baseline for each gap; high signal especially on #12.
- **scrml-dev-typescript** — Zod-shaped use cases in idiomatic dev voice; high signal on #8/#9/#17.
- **crystal-multi-dispatch-expert** — compile-time predicate primitives lens (relevant to #8 aliases as a compile-time named shape).
- **roc-expert** — platform/host effect-boundary precedent (highly relevant to #12 async-as-effect).
- **(possibly forge needed)** — a "form-library-lens" expert (yup/zod/react-hook-form distilled) if scrml-dev-typescript doesn't cover the form-DSL angle deeply enough.

## 5. Required reading checklist for the eventual deep-dive

The dispatching agent must read:

1. `scrml-support/docs/predicate-gaps-inventory-2026-05-06.md` — 17-gap inventory.
2. `scrml-support/docs/deep-dives/predicate-system-zod-replacement-2026-05-06.md` — Zod deep-dive that produced the P1 promotions.
3. `scrml-support/docs/debates/debate-05-boundary-parsing-primitive-2026-05-06.md` + judgment + `scrml-support/docs/type-as-argument-family-2026-05-06.md` — methodology stack + family-precedent discipline.
4. `scrmlTS/docs/PA-SCRML-PRIMER.md` §8 (validators + auto-synthesized validity surface), §9 (channels/schema/predicates), §13.6 (type-as-argument family — for negative-precedent: predicate gaps are NOT this family).
5. `scrmlTS/compiler/SPEC.md` §53 (Inline Type Predicates), §55 (validators), §41 (host/server-fn boundary — relevant to #12), §39 (schema lowering — relevant to #8/#17). Use SPEC-INDEX.md.
6. `scrmlTS/stdlib/data/validate.scrml` — current runtime validate API surface.
7. `scrmlTS/compiler/src/type-system.ts` ~5267-5297 (`checkEnumExhaustiveness`) and ~1273-1372 (`resolveTypeExpr`) — compile-time predicate machinery context.
8. `scrmlTS/docs/articles/llm-kickstarter-v1-2026-04-25.md` — S64 PA-orchestration discipline.
9. SPEC-ISSUE-§53.13.1 through §53.13.4 (named-shape registry, constraint arithmetic, type-alias for predicates, boolean predicates) — open issues that cross-cut #8 and #13.

## 6. Trigger conditions to fire

Don't fire just because the SCOPE exists. Fire when **any one** of:

- A1c surfaces real-app friction tied to one of these 4 gaps.
- An adopter reports `reqIf` as a blocker (most likely first trigger; #9 is the highest-demand gap in form libraries).
- SPEC-ISSUE-§53.13.1-4 gets touched in any other dispatch (natural moment to address #8 / #13).
- Stdlib `serialize` / `formFor` work surfaces a connection — formFor's `pick=/omit=/partial=` overlaps Gap #20 territory which is adjacent to #8 (alias-as-named-shape) and #17 (transform-as-form-modifier).
- Sample-app or example produces an unwieldy predicate stack that #8 would clean up.

## 7. Risks if fired prematurely

- **Designing-for-hypothetical** (anti-pattern; debate-04 simplicity-defender lens). Without corpus signal, the deep-dive risks designing predicates real apps don't actually need shaped this way.
- **Surface-bloat risk.** Adding 4 predicate vocabulary items at once is a non-trivial vocabulary expansion. The discipline must hold per-gap: each independently passes sliver test or it doesn't ship. The deep-dive must not accept package-deal reasoning ("ship #8 + #9 together because they share registry").
- **Locking before framing** (the debate-05 `parsePartial` lesson). Especially relevant for #17 transform — the actual question may be "what is the input-normalization boundary?" and a predicate-shaped answer locks before that frame.

## 8. Out of scope for the deep-dive

- The other 13 inventory gaps (P2/P3) — they get their own future deep-dives if signal warrants.
- Type-as-argument family questions (parseVariant, formFor, serialize) — separate track, governed by family-precedent doc.
- Tier-ladder questions — settled by debate-04 (hard-error switch; no new rungs).
- Boundary-parsing — settled by debate-05 (#19 closed by parseVariant; #20 planned via formFor).
- The `custom(...)` keyword's full semantics (Gap #13) — open SPEC-ISSUE territory; addressed when those issues are touched.

## 9. Tags + cross-references

- Inventory: `scrml-support/docs/predicate-gaps-inventory-2026-05-06.md`
- Source deep-dive: `scrml-support/docs/deep-dives/predicate-system-zod-replacement-2026-05-06.md`
- Methodology source: `scrml-support/docs/debates/debate-05-boundary-parsing-primitive-2026-05-06.md` + judgment
- Family-precedent discipline: `scrml-support/docs/type-as-argument-family-2026-05-06.md`
- Primer: `scrmlTS/docs/PA-SCRML-PRIMER.md` §8, §9, §13.6
- SPEC: `scrmlTS/compiler/SPEC.md` §53, §55, §41, §39
- Open SPEC issues: §53.13.1 (named-shape registry), §53.13.2-4 (constraint arithmetic, type-alias for predicates, boolean predicates)

#predicate-gaps #deep-dive-scope #P1-promotion #zod-lens #s65-prep #SPEC-ISSUE-53.13 #methodology-debates-02-03-04-05 #family-precedent-discipline #awaits-trigger
