# Stage 0b — Dispatch 2 Brief: Engines + Match + Validators + Substates + Control Flow

**Target agent:** `scrml-dev-pipeline` (T3 tier, worktree-isolated)
**Scope:** Tiers 4-5 of `IMPACT-ASSESSMENT.md` §6 — SPEC.md §17 + §18 + §51 + §54 + NEW §55 + relevant §34 error codes
**Output:** rewritten SPEC.md sections + new §55 + updated SPEC-INDEX.md (regenerate via script)
**Authorization:** scoped to this brief; "no holds barred" carries forward from S56 deliberation phase per user re-confirmation.
**Date drafted:** 2026-05-04 (S56)
**Drafted by:** PA (this conversation)
**Depends on:** Dispatch 1 (Foundation) — MUST be committed and pushed before this dispatch starts; this dispatch references Dispatch 1's §1 pillars + §6 V5-strict throughout.

---

## CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE

Your worktree path is: `<ABSOLUTE-WORKTREE-PATH-FILL-AT-DISPATCH-TIME>`

### Startup verification (do this BEFORE any other tool call)

1. Run `pwd` via Bash. Output MUST equal the worktree path above. Save the
   output as your WORKTREE_ROOT for the rest of the dispatch.
2. Run `git rev-parse --show-toplevel` via Bash. Output MUST equal WORKTREE_ROOT.
3. Run `git status --short` via Bash. Confirm tree is clean (or matches the
   expected pre-snapshot).
4. Verify Dispatch 1 has landed: run `git log --oneline | head -20` and confirm
   the spec-foundation commit exists. If Dispatch 1 has NOT landed, DO NOT
   proceed — report and exit.

If ANY check fails: DO NOT proceed. Report the mismatch and exit.

### Path discipline (enforce on EVERY Read/Write/Edit call)

- For Read: relative paths or paths under WORKTREE_ROOT are safe. Reading
  from main via absolute path will give you the wrong file content.
- For Write/Edit: ONLY use paths under WORKTREE_ROOT. NEVER use absolute
  paths starting with the main repo root directly.
- If an intake doc / hand-off doc / conversation context references a path
  like `/home/bryan-maclee/scrmlMaster/scrmlTS/foo/bar.ts`, translate it to
  `$WORKTREE_ROOT/foo/bar.ts` before writing.

If you find yourself about to write to a path starting with the main repo
root, STOP. Re-derive the path from WORKTREE_ROOT.

---

## §1 What this dispatch is

The HEAVIEST of the 4 staged dispatches that rewrite `compiler/SPEC.md`. This dispatch covers the core BEHAVIOR-SHIFT of v0.next: engines as singleton state machines, match as a structural-exhaustiveness mid-tier, validators as a brand-new declarative surface, and the auto-synthesized validity surface that ties form-state to UI.

This dispatch CANNOT begin until Dispatch 1 (Foundation) has landed, because §51 references §6 V5-strict, §18 references §17, §55 references §6 + §53 + §39 + §41 — all of which Dispatch 1 establishes.

**You are NOT changing compiler source code.** The compiler will fail many tests after the spec rewrite — that is EXPECTED. Phase A1+ implementation dispatches will bring the compiler into compliance. Your job is to PRODUCE THE SPEC ENGINEERING TARGET, not to maintain test parity.

### Sources you must read in full before any edit

These are LOAD-BEARING. Do not skim. Read in this order:

1. `docs/changes/v0next-spec-impact/IMPACT-ASSESSMENT.md` — your master plan. §2 disposition table covers your scope (rows for §17, §18, §51, §54, NEW §55, §34 partial). §3 details the proposed §55 structure. §6 ordering rules. §7 open questions (resolve during rewrite).
2. `docs/changes/v0next-spec-impact/DISPATCH-1-BRIEF-foundation.md` — for shape; mirror its dispatch shape and crash-recovery discipline.
3. `../scrml-support/docs/deep-dives/v0next-s56-deliberation-outcomes-2026-05-04.md` — locks L1-L20 with full §3.x detail. THE locks for this dispatch: L1 (pillar — markup-as-value), L4 (validators), L6 (match Tier 0/1/2 ladder), L7 (match attributes), L8 (two match shapes), L11 (auto-synth validity), L12 (error message resolution), L13 (`<errors of=expr/>`), L14 (cross-field), L20 (derived engines).
4. `../scrml-support/docs/deep-dives/v0next-s55-deliberation-outcomes-2026-05-04.md` — moves M4 (state-children), M5 (decl=mount), M6 (auto-declared var), M9 (bare-variant inference), M12 (rule= contract), M13 (.advance), M14 (effect= + onTransition), M15 (:-shorthand), M16 (auto-derived var name), M17 (initial= + lint), M18 (cross-file mount).
5. `../scrml-support/docs/deep-dives/state-as-primitive-redesign-synthesis-2026-05-03.md` — narrative context.
6. `docs/articles/llm-kickstarter-v2-2026-05-04.md` — the LOCKED kickstarter. Particularly §4 Engines (your spec must match), §6 Validators (your §55 must match), §11.1 Engine recipe + §11.5 Loading-state-prefer-engine, §3.1 three RHS shapes (already specced in Dispatch 1). Tiebreaker if spec contradicts — kickstarter wins.
7. `compiler/SPEC.md` — the current spec, AS REWRITTEN BY DISPATCH 1.
8. `compiler/SPEC-INDEX.md` — section table-of-contents (regenerated post-Dispatch-1).
9. `pa.md` (project root) — for repo conventions.

### Anti-patterns brief (mandatory)

- `../scrml-support/docs/gauntlets/BRIEFING-ANTI-PATTERNS.md` — re-read before writing scrml code examples in the spec.
- `docs/articles/llm-kickstarter-v2-2026-05-04.md` §7 — anti-pattern table is the canonical source of LLM-failure modes; your code examples must match.

---

## §2 Crash recovery directives (PERMANENT — pa.md global rules)

This is the LARGEST dispatch in the staging plan (~14,000-25,000 lines net add). Crashes happen. Make partial progress recoverable.

1. **Commit after each meaningful change** — don't batch. After each subsection rewritten or each error-code added, commit with WIP message. Examples:
   - `WIP: §51.4 state-children + structural transitions`
   - `WIP: §55.8 <errors of=expr/> first-class element`
   - `WIP: add E-DERIVED-ENGINE-NO-RULES error code`
2. **Update progress.md after each step** — append-only, timestamped. Path: `docs/changes/v0next-spec-impact/progress-dispatch-2.md`.
3. **WIP commits are EXPECTED.** Final cleanup commit can squash if desired; never delay committing for a "clean" state.
4. **If you crash, your commits + progress.md are how the next agent picks up.**

---

## §3 Scope — what to do, in order

The order below respects dependencies: §17 establishes Tier-0 framing first; §18 establishes Tier-1 (match-block) referenced by §51; §51 is the heart of v0.next; §54 composes with §51's state-children; §55 NEW is the validators section that §6 (Dispatch 1) cross-references forward to; §34 closes with the new error codes.

### §3.1 §17 Control Flow — PARTIAL REWRITE

Read current §17 (lines 7352-8026 per pre-Dispatch-1 SPEC-INDEX; verify post-Dispatch-1 line numbers). 675 lines covering "if=, show=, lifecycle, iteration, overloading, if-as-expression."

**Add a new subsection at the start of §17:**

#### §17.X (NEW) The easy-street ladder for case analysis

The Tier 0/1/2 commitment ladder for state-driven UI:

- **Tier 0 (this section, §17)** — `if=` attribute on elements; `${ if (...) lift ... }` blocks in logic contexts. Prototype-friendly; no exhaustiveness check; no commitment to a state shape.
- **Tier 1 (§18)** — `<match for=Type [on=expr]>` block-form. Structural exhaustiveness over an enum without commitment to transitions. The compiler verifies all variants have arms.
- **Tier 2 (§51)** — `<engine for=Type initial=...>`. Full deal: exhaustiveness + transition rules + transition handlers.

Promotion is mechanical/additive: state-children carry forward verbatim from Tier 1 to Tier 2; only the wrapper changes. The wrapper swap IS the commitment moment.

Cross-ref §1.5 (north star + ladder).

**Add the `W-LIFECYCLE-CANDIDATE` lint reference:**

When a `<program>` body or function body has more than 2 reactive booleans gating the same UI region, the compiler emits `W-LIFECYCLE-CANDIDATE` suggesting promotion to Tier 1 or Tier 2. Cross-ref §34.

**Existing §17 content (if=, show=, iteration, overloading, if-as-expression):** PRESERVE. Update terminology to align with the ladder (e.g., introduce `if=` as "the Tier-0 form for conditional rendering"). Cross-ref §18 / §51 where appropriate.

### §3.2 §18 Pattern Matching and Enums — MAJOR REWRITE

Read current §18 (lines 8027-9159 per pre-Dispatch-1 SPEC-INDEX). 1,133 lines covering "match syntax, exhaustiveness, guards, literals, `is` operator, partial match."

**Add new subsections (numbering follows existing §18 structure; reserve appropriate slots):**

#### §18.X (NEW) Two match shapes — block-form for markup, JS-style for value-return (L8)

scrml has TWO match forms, distinguished by syntactic context:

- **Block-form** `<match for=Type [on=expr]>` — markup-emit context. Used in UI for case analysis on enums. Tier 1 of the easy-street ladder.
- **JS-style** `match expr { .Variant => ... }` — value-return context (server logic, derivations, computed expressions). Pre-existing form; preserved verbatim.

Both undergo the same exhaustiveness analysis internally. Different output category.

#### §18.X+1 (NEW) Block-form `<match for=Type [on=expr]>` (L6)

Syntax:
```scrml
<match for=LoadPhase [on=@loadPhase]>
  <NotAsked>          : <p>Press to load.</p>
  <Loading>           : <p>Loading…</p>
  <Ready(rows)>       : <ul>${ for (let r of rows) { lift <li>${r.name}</li> } }</ul>
  <Failed(msg)>       : <p class="error">${msg}</p>
</>
```

- **`for=Type`** — required. The enum type the match is over.
- **`on=expr`** — required when the matched-on value is not auto-implied. Auto-implied ONLY when an engine for `Type` is in scope (Reading 2 from L7 — the most local-semantics-friendly).
- **State-children** with variant names match enum variants. Payload variants destructure (`<Ready(rows)>` binds `rows` for the arm body).
- **Bodies** can use `:`-shorthand for single-expression bodies (L7 / M15 — cross-ref §4 / §51.11). Bodies with `</>` closer use bare-body form.
- **Exhaustiveness** — the compiler verifies every variant of `Type` has a state-child OR a wildcard `<_>` catch-all is present. Otherwise `E-MATCH-NOT-EXHAUSTIVE`.

#### §18.X+2 (NEW) Match attributes — rules legal but inert; effect= and <onTransition> engine-only (L7)

- **`rule=` on a state-child inside `<match>`** — LEGAL but INERT. Lint `W-MATCH-RULE-INERT` warns: "Rules in match-block don't enforce; promote to engine to activate." Forward-staging is the explicit purpose — rules can be progressively added at Tier 1 in preparation for Tier 2 promotion.
- **`effect=` and `<onTransition>` inside `<match>`** — REJECTED at the grammar level. `E-MATCH-EFFECT-FORBIDDEN` / `E-MATCH-ONTRANSITION-FORBIDDEN`. Reasoning: transitions don't occur in match (read-only on the matched-on value); effects/handlers presuppose transitions.

#### §18.X+3 (NEW) Bare-variant inference in arm patterns (M9)

When the matched-on type is statically known, arm patterns may omit the type qualifier:

```scrml
<match for=MarioState on=@marioState>
  <Small> : "🧍"           // .Small inferred as MarioState.Small
  <Big>   : "🧍 🧍"
</>
```

When the type is a UNION (`MarioState | HealthRisk` and both have `.Small`), bare arm patterns are AMBIGUOUS → `E-VARIANT-AMBIGUOUS`. Otherwise prefer bare for density.

**Existing §18 content (JS-style match syntax, exhaustiveness, guards, literals, `is` operator, partial match):** PRESERVE. Cross-reference the block-form addition where appropriate ("see §18.X for the markup-emit form"). Update terminology to make the two-form coexistence explicit.

### §3.3 §51 State Transition Rules / Engines — MAJOR REWRITE (LARGEST)

Read current §51 (lines 16970-18692 per pre-Dispatch-1 SPEC-INDEX). 1,723 lines covering existing machine syntax. Target: 2,500-3,500 lines.

**Note on title:** the section was renamed from "machine" to "engine" in S53 (already complete). This dispatch keeps the engine terminology but substantially restructures the section.

**Proposed new structure (replacing/augmenting existing §51):**

#### §51.1 Overview — engines as singleton state machines (north star tie-in)

Cover:
- The north star (cross-ref §1.5): UI as a fully-handled state machine
- Engines are SINGLETON-by-design (cross-ref §15 — components are multi-instance, distinct from engines)
- Engines own one state cell (the auto-declared variable) + one or more state-children that define the variants and their behaviors
- The Tier 2 commitment moment — full deal: exhaustiveness + active rules + transition handlers

#### §51.2 Engine declaration syntax

```scrml
<engine for=Type [initial=.Variant] [derived=expr] [pinned]>
  <Variant1 ...>...</>
  <Variant2 ...>...</>
  ...
</>
```

Attributes:
- `for=Type` — required. The enum type the engine is over.
- `initial=.Variant` — required for non-derived engines (lint `W-ENGINE-INITIAL-MISSING` if omitted; defaults to first state-child if user ignores). Forbidden on derived engines (`E-DERIVED-ENGINE-NO-INITIAL`).
- `derived=expr` — optional; cross-ref §51.12.
- `pinned` — optional; opt-out from hoisting (cross-ref §6.10). Covers BOTH the engine identifier AND the auto-declared variable.

#### §51.3 Auto-declared variable and auto-derived var name (M6, M16)

When you declare `<engine for=MarioState ...>`, the compiler auto-declares a state cell with a variable name derived from the type:
- Lowercase-first-run-strip-Machine: `MarioMachine` → `marioMachine` (BUT note the engine renaming). For `MarioState` → `marioState`.
- Default rule: lowercase-first-run of the type name.
- Override via `var=` attribute on the engine for disambiguation.

The variable is reactive; readable everywhere via canonical access (`@marioState`); writable per the rules in §51.8.

You DO NOT separately declare `<marioState> = .Small` — that would be a duplicate declaration (`E-ENGINE-VAR-DUPLICATE`). The engine OWNS its variable.

#### §51.4 State-children and structural transitions (M4)

State-children are tags inside the engine body, named for the type's variants:

```scrml
<engine for=MarioState initial=.Small>
  <Small  rule=.Big>                                  : "🧍"
  <Big    rule=(.Fire | .Cape | .Small)>              : "🧍 🧍"
  <Fire   rule=.Small>                                : "🔥"
  <Cape   rule=.Small>                                : "🦸"
</>
```

Two semantic shapes:
- **State-child WITH body** — sugar over `if=(@engineVar == .ThisVariant)`. Renders the body conditionally on engine value.
- **State-child WITHOUT body (self-closing)** — declares transitions only via `rule=`. No rendering. Useful when application handles the visual side elsewhere.

Mixed engines (some bodied, some bare) are legal and useful.

Bodies may use `:`-shorthand for single-expression (cross-ref §4 / §51.11). Bodies with `</>` closer use bare-body form.

#### §51.5 Engine declaration position = mount position (M5)

Where you declare the engine in source IS where it renders. Same-file engines have NO separate `<EngineName/>` mount tag; the engine's body IS the rendered output at the engine's source position.

```scrml
<div class="game">
  <h1>Mario</h1>

  <engine for=MarioState initial=.Small>     <!-- renders here -->
    <Small rule=.Big> : "🧍"
    <Big rule=.Small> : "🧍 🧍"
  </>

  <p>Press the button to grow.</p>
</div>
```

#### §51.6 Engine use-site for cross-file mount only (M18)

Cross-file engine use:
1. Import: `import { MarioMachine } from './engines.scrml'` (cross-ref §21 — module/import).
2. Mount: `<MarioMachine/>` use-site renders the imported engine at this position.

Note the SINGLETON semantics: per S55 north star + L20 derived engines — engines are singleton-by-design. **`<MarioMachine/>` at multiple use-sites in different files all reference the SAME instance.** (This needs explicit specification — see §7.5 in the impact assessment for the open Q. PA-recommended resolution: shared singleton across all use-sites; instantiating a separate engine per site requires defining a different engine.)

If you need multi-instance, you want a COMPONENT (cross-ref §15), not an engine.

#### §51.7 The `initial=` attribute and W-ENGINE-INITIAL-MISSING lint (M17)

`initial=.Variant` sets the starting state. Required on non-derived engines.

Lint behavior:
- If `initial=` is OMITTED on a non-derived engine, the compiler emits `W-ENGINE-INITIAL-MISSING` and defaults to the FIRST state-child's variant.
- The lint can be silenced (per S55 lint policy — "lint rules teach the scrml way; turning them off is the developer's prerogative") via the standard lint suppression mechanism.

Forbidden on derived engines (`E-DERIVED-ENGINE-NO-INITIAL`) — derived engines compute initial from the source.

#### §51.8 Direct write validation via rule= contract (M12)

Direct assignment to the engine's auto-declared variable:

```scrml
function grow() {
  @marioState = .Big                       // direct write — silent-validated
}
```

The engine intercepts the write and validates against the FROM-state's `rule=` attribute. Invalid throws `E-ENGINE-INVALID-TRANSITION` at runtime.

**Compile-time validation when the from-state is statically known:** inside a state-child body, the compiler knows `@marioState == .ThisVariant`. So `@marioState = .Cape` written inside `<Small>` body is a COMPILE-TIME ERROR if `.Cape` isn't in `.Small.rule`. This is genuinely powerful — exhaustiveness for transitions, free, from M4 + M5 + M12 composing.

The `rule=` attribute therefore becomes a CONTRACT on writes, not just metadata.

#### §51.9 `.advance(.X)` explicit-throws variant (M13)

`@marioState.advance(.Big)` is the loud-explicit transition: same validation as direct write, but the developer is asserting "this MUST work." Failure throws with an "asserted advance failed" tag.

Use direct write when you have the target value as an expression. Use `.advance` when you want LOUD failure on invalid transitions.

**`.tryAdvance` (silent no-op) is OUT.** Explicitly considered + rejected. Silent failures hide bugs. Conditional intent uses `if (@marioState == .Small) @marioState = .Big`.

#### §51.10 effect= attribute and <onTransition> structural element (M14)

Two forms for transition effects, picked by complexity:

**`effect=`** — simple, single-target only:
```scrml
<Small rule=.Big effect=${ playSound("grow") }> : "🧍"
```
Legal only when `rule=` is single-target. Multi-target + `effect=` is `E-ENGINE-EFFECT-AMBIGUOUS`.

**`<onTransition>`** — multi-target or attribute-bearing:
```scrml
<Big rule=(.Fire | .Cape | .Small)>
  <onTransition to=.Fire>${ playSound("fire"); animateFlame() }</>
  <onTransition to=.Cape once>${ playSound("cape") }</>
  <onTransition to=.Small if=(@gameOver == false)>${ log("regression") }</>
  "🧍 🧍"
</>
```

**Built-in `<onTransition>` attributes:** `to=` (target), `from=` (source — for to-side hooks placed in target state-child), `once`, `if=(condition)`.

**Default semantics:** `effect=` and `<onTransition to=X>` placed in the FROM state-child fire when LEAVING that state. To-side semantics achieved via `<onTransition from=X>` placed in the TARGET state-child. Single concept; bidirectional via from/to.

**Skipped:** `<onEnter>` / `<onLeave>` lifecycle elements. The from/to bidirectionality covers both directions.

#### §51.11 :-shorthand for single-expression body (M15) — cross-ref §4

A state-child with NO `</>` closer can use `<tag attrs> : expr` shorthand where `expr` becomes the body. Cross-ref §4 (block grammar).

Three legitimate body forms:
| Form | Job |
|---|---|
| `<tag/>` | Self-closing, no body |
| `<tag>...</>` | Bare body — text, `${}`, nested tags |
| `<tag> : expr` | Single-expression body shorthand |

Mutually exclusive by syntactic shape (closer presence).

#### §51.12 Derived engines `derived=expr` (L20)

```scrml
<engine for=Health derived=match @marioState {
  .Small | .Big => .Healthy
  .Fire | .Cape => .AtRisk
  _              => .Critical
}>
  <Healthy/>
  <AtRisk>
    <onTransition from=.Healthy>${ playSound("warning") }</>
  </>
  <Critical>
    <onTransition from=.AtRisk effect=showDangerOverlay()/>
  </>
</>
```

Rules for derived engines:
- `derived=expr` accepts any reactive expression of the engine's type. JS-style `match` block is the typical shape; function calls and conditionals also work.
- `rule=` on state-children — REJECTED: `E-DERIVED-ENGINE-NO-RULES`.
- `initial=` on the engine — REJECTED: `E-DERIVED-ENGINE-NO-INITIAL`. Initial value computed from source at engine-init time.
- Direct writes — REJECTED: `E-DERIVED-ENGINE-NO-WRITE`.
- `<onTransition>` and `effect=` on state-children — LEGAL and FIRE on derived state changes (the value changed; transition is real, just initiated by the source not user code).
- Initial value computation — compile-error if the derived expression returns no value when the source is in its `initial=` state: `E-DERIVED-ENGINE-INITIAL-UNDEFINED`.
- Chained derivation — LEGAL (`A → B → C`). Cycle detection at compile time (same machinery as L14's circular-dep check) → `E-DERIVED-ENGINE-CIRCULAR`.
- For plain (non-engine) derived state, use `const <derived> = expr` (cross-ref §6).

#### §51.13 Existing §51 content — PRESERVE

The current §51 contains substantial content that should be preserved:
- §51.11 audit clause
- §51.3.2 attribute-form opener
- §51.12 temporal transitions (`after Ns =>`)
- §51.13 auto-property-tests (`--emit-machine-tests`)
- §51.15 three-sites cross-check (S32)

Audit each pre-existing subsection. Preserve content; renumber if the subsection-number conflicts with new content (e.g., §51.11 audit clause → §51.14 audit clause if §51.11 is now :-shorthand). Update terminology to align with new framing.

### §3.4 §54 Nested Substates and State-Local Transitions — PARTIAL REWRITE

Read current §54 (lines 20161-20448 per pre-Dispatch-1 SPEC-INDEX). 288 lines covering "Nested substate grammar, state-local transitions, field narrowing, terminal states, 4 new error codes, interaction matrix."

**Verify composition with new §51:**
- Nested substates SHOULD work as state-children-within-state-children under M4. Confirm the grammar still parses.
- State-local transitions (§54.3) — verify they compose with the new `rule=` contract.
- Field narrowing (§54.4) — verify with V5-strict access.
- Terminal states (§54.5) — verify.
- Update terminology throughout to match the new §51 vocabulary.

**Likely small changes** unless an interaction is broken. If you find one, surface it in progress.md and propose a fix in §54 + cross-ref §51.

### §3.5 §55 NEW Validators and Validity Surface — NEW SECTION (BIGGEST NEW CONTENT)

Brand new section. ~800-1200 lines target. Located after §54.

Per the impact assessment §3 and the kickstarter v2 §6 as the canonical reference shape:

#### §55.1 The shared validator core vocabulary

Table of predicates with descriptions, semantics, and example use:

| Predicate | Meaning | Example | Error tag on failure |
|---|---|---|---|
| `req` | Non-empty value (string `""` fails; null/undefined fail) | `<name req>` | `.Required` |
| `is some` | Value exists (null/undefined fail). Coexists with `req` because `""` IS some. | `<x is some>` | `.NotSome` |
| `length(predicate)` | String/array length matches the predicate | `<name length(>=2)>` | `.LengthFailed(predicate)` |
| `pattern(regex)` | String matches the regex | `<email pattern(/^[^@]+@[^@]+$/)>` | `.PatternMismatch(regex)` |
| `min(n)`, `max(n)` | Numeric range bounds | `<age min(18) max(120)>` | `.MinFailed(n)` / `.MaxFailed(n)` |
| `gt(expr)`, `lt(expr)`, `gte(expr)`, `lte(expr)` | Comparisons | `<endDate gte(@startDate)>` | `.GtFailed(expected)` etc. |
| `eq(expr)`, `neq(expr)` | Equality | `<confirm eq(@password)>` | `.EqFailed(expected)` etc. |
| `oneOf([...])`, `notIn([...])` | Set membership | `<role oneOf([.Admin, .Editor])>` | `.OneOfFailed(set)` etc. |

Each predicate fires in its layer's enforcement context (state validators, refinement types, schema constraints). See §55.2-§55.4.

#### §55.2 Validators on state-cell declarations (L4)

Bare-attribute syntax on the structural decl:

```scrml
<signup>
  <name      req length(>=2)>           = <input type="text"/>
  <email     req>                       = <input type="email"/>
  <password  req length(>=8)>           = <input type="password"/>
  <confirm   req eq(@signup.password)>  = <input type="password"/>
</>
```

Firing semantics:
- Reactive — recompute when cell value changes (or when any cell referenced in the predicate args changes).
- Failures populate the auto-synthesized `errors` array (see §55.5).
- Form-validity gating — `@signup.isValid` is false until ALL fields pass (see §55.5).

Cross-ref §6 for the underlying decl-coupled-with-render-spec mechanism.

#### §55.3 Validators on refinement type expressions (cross-ref §53)

Refinement types use predicate expressions on type annotations:

```scrml
let age: number(>=18 && <=120) = readAge()
type Email = string(pattern(/^[^@]+@[^@]+$/))
```

Stronger than state validators — compile-time + runtime boundary check. A value that doesn't satisfy the predicate cannot inhabit the type.

Cross-ref §53.

#### §55.4 Validators on `<schema>` columns (cross-ref §39)

Schema columns retain SQL-mirror vocabulary (`not null`, `unique`, `references`, `default(literal)`) as the canonical source-level form. The shared core vocabulary is ADDITIVE — both forms legal, both lower to standard SQL DDL on emit.

```scrml
<schema>
  users {
    email: text not null unique          // SQL-mirror native
    name:  text req length(>=2)          // shared-core additive — req lowers to NOT NULL
  }
</>
```

`req` lowers to `NOT NULL`. `length(>=N)` lowers to `CHECK (length(col) >= N)`. Etc.

Cross-ref §39.

#### §55.5 Auto-synthesized validity surface — compound-level (L11)

When a compound state declaration contains any field with validators, the compiler auto-synthesizes a reactive validity surface accessible at the compound level:

```
@signup.isValid       : boolean
                        (true ↔ ALL fields pass their validators)
@signup.errors        : { fieldName: [...errorTags], ... }
                        (map of arrays of ValidationError enum tags per field)
@signup.touched       : { fieldName: bool, ... }
                        (per-field first-interaction tracking)
@signup.submitted     : boolean
                        (true after first submit attempt)
```

All synthesized properties are READ-ONLY (`E-SYNTHESIZED-WRITE` if you try to assign them).

When a compound has NO validators, `isValid` is trivially `true`; `errors` is empty per-field. Predictability over namespace savings.

Single-value cells (Tier 1, e.g., `<count req min(0)>`) do NOT get the auto-namespace (per L11 Edge A). The validator fires; failure is tracked; access is via the type-check, not via `.isValid`/`.errors`.

#### §55.6 Auto-synthesized validity surface — per-field (L11)

Same surface scoped per-field:

```
@signup.name.isValid  : boolean
@signup.name.errors   : [...errorTags]
@signup.name.touched  : bool
```

Reactive recomputation: changes to `@signup.name` recompute that field's surface; changes to a referenced cell in a cross-field predicate recompute the dependent field's surface.

#### §55.7 Synthesized-property semantics

- All read-only (E-SYNTHESIZED-WRITE).
- Reactive — recompute when their dependencies change.
- `touched` becomes true on first interaction with the field (any `bind:value`/`bind:checked` change OR first focus-out — most permissive). Per-field timing.
- `submitted` becomes true on first submit-form attempt. Compound-level flag.
- For cells without validators on a compound: `isValid` is trivially true; `errors` is empty.

#### §55.8 The `<errors of=expr/>` first-class element (L13)

Errors render via the first-class `<errors of=expr/>` markup element. Composable per-field or compound:

```scrml
<form onsubmit=submit()>
  <div class="field">
    <label>Name</label>
    <name/>
    <errors of=@signup.name/>      <!-- per-field; renders first error -->
  </div>
  ...
  <button type="submit" disabled=!@signup.isValid>Save</button>
  <errors of=@signup all/>          <!-- compound rollup, all errors -->
</form>
```

Attributes:
- `of=expr` — REQUIRED. References either a per-field cell (`@signup.name`) or a compound cell (`@signup`). The compiler reads `.errors` from the referenced cell by convention (the element name implies it — same logic as `<engine for=Type>`).
- `all` — optional flag. Renders the full error array (default: first-error-only).

Default rendering: single first error wrapped as `<p class="scrml-error">${messageFor(errors[0])}</p>`. Returns no DOM element when `errors.length == 0` (not a hidden element).

**Body override** for full custom rendering:
```scrml
<errors of=@signup.name>
  ${(err) => <span class="my-error">⚠️ ${messageFor(err)}</span>}
</>
```

Body, when present, replaces the default render.

#### §55.9 Error tag enum (`ValidationError`) (L12)

Built-in `ValidationError` enum with variants for every shipped validator failure:
- `.Required`
- `.NotSome`
- `.LengthFailed(predicate: string)`
- `.PatternMismatch(re: regex)`
- `.MinFailed(threshold: number)`
- `.MaxFailed(threshold: number)`
- `.GtFailed(expected: any)`, `.LtFailed(expected)`, `.GteFailed(expected)`, `.LteFailed(expected)`
- `.EqFailed(expected: any)`, `.NeqFailed(forbidden: any)`
- `.OneOfFailed(set: array)`, `.NotInFailed(set: array)`
- `.Custom(tag: string)` — for developer-defined custom validators (Edge G from L12)

`@signup.errors` arrays contain these enum values. Render via `messageFor` (§55.10) or `match` over `ValidationError`.

#### §55.10 Error message resolution chain — 4-level (L12)

Resolution order when rendering an error tag to a user-facing string:

1. **Inline override on field declaration** (highest priority, static-string only):
   ```scrml
   <name req("Please enter your name") length(>=2, "Name must be at least 2 chars")> = <input/>
   ```
   Per-field, per-validator. Static-string only (Edge F — no expression interpolation).

2. **Project-registered messages** (i18n + brand-voice hook):
   ```scrml
   ${
     use scrml:data
     data.registerMessages({
       .Required:    (field) => `Please fill in ${field}.`,
       .TooShort:    (field, n) => `${field} must be at least ${n} characters.`,
       ...
     })
   }
   ```
   Cross-ref §41 (import/use system).

3. **`scrml:data` shipped English defaults** (zero-config; works for prototype-phase apps).

4. **`match` escape hatch** (full developer control):
   ```scrml
   <match for=ValidationError on=@signup.name.errors[0]>
     <Required>     : "Name is required"
     <LengthFailed("(>=2)")>  : "Name must be at least 2 characters"
   </>
   ```
   Cross-ref §18 block-form match.

`messageFor(errorTag)` (auto-imported via `use scrml:data`) walks levels 1-3 automatically.

#### §55.11 Cross-field validation via predicate args (L14)

Cross-field validation falls out of the universal-core predicate vocabulary when predicate args contain expressions referencing other cells:

```scrml
<signup>
  <password req length(>=8)>           = <input type="password"/>
  <confirm  req eq(@signup.password)>  = <input type="password"/>
</>
```

The compiler tracks dependencies through the predicate arg expression. Reactive recomputation: when ANY cell referenced in the expression changes, the validator recomputes.

Edges:
- **Circular deps:** `<a eq(@b)>` + `<b eq(@a)>` → `E-VALIDATOR-CIRCULAR-DEP` at compile time. Cross-ref §31 (dependency graph).
- **Predicate args beyond bare cell-reference:** `<endDate gte(@startDate.plus(1, "day"))>` is legal. Dependency tracker recurses through expressions.
- **Cells outside the compound:** legal. Predicate args are arbitrary expressions in scope.

#### §55.12 Multiple errors per field

When `req` fails, the validator chain SHORT-CIRCUITS — only `.Required` is reported (other validators on an empty cell are vacuous).

Otherwise validators COMPOSE — a non-empty value can fail both `length` and `pattern` simultaneously, producing two error tags in `errors`.

Default `<errors of=...>` shows `errors[0]` only. Use `all` attribute for full-list rendering.

#### §55.13 The `reset(@cell)` keyword + `default=` attribute (cross-ref §6.8)

Brief overview + cross-ref to §6.8 (Dispatch 1) for the full treatment. Mentions:
- `reset` is a language keyword (not stdlib).
- `reset(@cell)` mutates in place; no return value.
- `reset(@signup)` resets every field; `reset(@signup.name)` resets one field.
- Per-cell semantics use `default=` attribute if present (γ); else re-evaluate init.
- `reset` is a reserved identifier.

#### §55.14 Validators on engine state-cells (cross-ref §51)

Engine auto-declared variables — can they have validators? Probably no — engines have rule= contracts which subsume validation for transitions. But individual values within a payload variant could conceivably have validators. Open question; consult kickstarter v2 §4 + §6 for canonical treatment, document the resolution.

#### §55.15 Error code listing (cross-ref §34)

Brief listing of all error/warning codes introduced by §55:
- `E-SYNTHESIZED-WRITE`, `E-VALIDATOR-CIRCULAR-DEP`, `W-MATCH-RULE-INERT`, `E-MATCH-EFFECT-FORBIDDEN`, etc.

Full definitions in §34 (this dispatch's contribution to §34 — see §3.6 below).

### §3.6 §34 Error Codes — partial rewrite for this dispatch

Add the following error/warning codes (in §34's existing format):

**Match-related:**
- `W-MATCH-RULE-INERT` (warning) — rules legal in match-block but inert; promote to engine to activate. Reference §18.X+2.
- `E-MATCH-EFFECT-FORBIDDEN` — `effect=` rejected in match-block. Use engine. Reference §18.X+2.
- `E-MATCH-ONTRANSITION-FORBIDDEN` — `<onTransition>` rejected in match-block. Use engine. Reference §18.X+2.
- `E-MATCH-NOT-EXHAUSTIVE` — `<match>` block missing variants and no wildcard. Reference §18.X+1.
- `E-VARIANT-AMBIGUOUS` — bare variant arm pattern ambiguous in union-typed context. Reference §18.X+3.

**Engine-related:**
- `E-ENGINE-INVALID-TRANSITION` (runtime) — direct write or `.advance` violates rule= contract. Reference §51.8.
- `E-ENGINE-EFFECT-AMBIGUOUS` — `effect=` on a multi-target `rule=`. Use `<onTransition>`. Reference §51.10.
- `E-ENGINE-VAR-DUPLICATE` — separate decl of engine's auto-declared variable. Reference §51.3.
- `W-ENGINE-INITIAL-MISSING` (warning, lint) — `initial=` omitted on non-derived engine. Reference §51.7.

**Derived-engine-related:**
- `E-DERIVED-ENGINE-NO-RULES` — `rule=` on state-child of derived engine. Reference §51.12.
- `E-DERIVED-ENGINE-NO-INITIAL` — `initial=` on derived engine. Reference §51.12.
- `E-DERIVED-ENGINE-NO-WRITE` — direct write to derived engine variable. Reference §51.12.
- `E-DERIVED-ENGINE-INITIAL-UNDEFINED` — derived expression undefined for source's initial state. Reference §51.12.
- `E-DERIVED-ENGINE-CIRCULAR` — chained derivation forms a cycle. Reference §51.12.

**Validator-related:**
- `E-SYNTHESIZED-WRITE` — assignment to auto-synthesized property (e.g., `@signup.isValid = false`). Reference §55.5.
- `E-VALIDATOR-CIRCULAR-DEP` — circular dependency via cross-field predicate args. Reference §55.11.
- `E-DERIVED-VALUE-MUTATE` — value-mutation on result of `const <derived>` (e.g., `@filteredItems.push(x)`). PA-recommended lock per S56 alignment Q&A; if controversial, escalate to user. Reference §6.6.

**Component/engine-interaction:**
- `E-COMPONENT-ENGINE-SCOPE` — component body instantiates an engine (PA-recommended forbid per impact assessment §7.7). Reference §15 + §51. Escalate to user if controversial during rewrite.

For each: add an entry following the existing §34 format (error code, severity, description, example trigger, fix recommendation).

---

## §4 Cross-cutting work

### §4.1 SPEC-INDEX.md regeneration

After all the above:
1. Run `bash scripts/update-spec-index.sh`
2. Verify line numbers align with rewritten sections
3. Add new Quick Lookup entries:
   - "match block / `<match for=Type>`" → §18
   - "engine `derived=`" → §51.12
   - "engine state-children" → §51.4
   - "engine `effect=` / `<onTransition>`" → §51.10
   - "auto-declared engine variable" → §51.3
   - "validators / req / length / pattern" → §55
   - "auto-synthesized validity / isValid / errors / touched" → §55.5-§55.7
   - "errors element / `<errors of=>`" → §55.8
   - "ValidationError enum" → §55.9
   - "error message resolution / messageFor" → §55.10
   - "cross-field validation" → §55.11
   - "registerMessages / scrml:data" → §41
   - "Tier 0/1/2 ladder" → §1.5 + §17 + §18 + §51 (already in Dispatch 1)

### §4.2 Cross-reference sweep

Before declaring done, grep SPEC.md for:
- `<machine>` references — should all be `<engine>` post-rename
- "old §51" references that need updating to new subsection numbers
- Any §55 refs that don't resolve (you're creating §55, so verify resolution)
- "as primitive" / "primary" terminology consistency

### §4.3 Forward references from Dispatch 1

§6 (Reactivity, rewritten by Dispatch 1) has a forward stub at §6.11 referencing §55 (the auto-synthesized validity surface). After this dispatch lands §55, verify the cross-ref text in §6.11 still resolves correctly.

---

## §5 What you do NOT do in this dispatch

- **DO NOT** rewrite §38 (channels), §39 (schema), §53 (predicates), §42 (not keyword). Those are Dispatch 3.
- **DO NOT** modify §6 (Reactivity) or §11 (folded by Dispatch 1) — even if you find issues, surface them in progress.md and propose a Dispatch 4 cleanup item.
- **DO NOT** modify compiler source code. Test breakage is EXPECTED.
- **DO NOT** modify tests. Test breakage from spec drift is expected.
- **DO NOT** modify kickstarter v2. Align spec to kickstarter, not the other way.
- **DO NOT** modify `pa.md`, `master-list.md`, `hand-off.md`. PA-only files.

---

## §6 Success criteria

The dispatch is DONE when:

1. **§17 has the new "easy-street ladder" subsection** added. Tier 0 framing for `if=`. Cross-refs to §18 + §51. Existing content preserved.
2. **§18 has 3 new subsections** (two-shape framing, block-form, attributes) + bare-variant inference. JS-style match preserved.
3. **§51 is fully restructured** per §3.3 above. All M4-M18 + L20 covered. Existing §51 content (audit, attribute-form, temporal, tests, three-sites cross-check) preserved.
4. **§54 verified to compose with new §51.** Issues surfaced in progress.md if any.
5. **§55 NEW exists** with all subsections §55.1-§55.15. ~800-1200 lines. §55.13 cross-refs §6.8.
6. **§34 has the new error/warning codes** in §3.6 above (~17 new codes). All have severity, description, trigger, fix.
7. **SPEC-INDEX.md regenerated** + new Quick Lookup entries.
8. **Cross-reference sweep complete.** No broken refs; `<machine>` → `<engine>` consistent.
9. **Forward refs from Dispatch 1's §6.11 verified.**
10. **Each subsection committed independently.** Progress.md captures the timeline.
11. **Final commit message:** "spec(dispatch-2): engines + match + validators + substates + control flow rewrite — §17 ladder, §18 block-form, §51 full restructure, §54 verified, §55 NEW, §34 +17 codes" or similar.

The dispatch is NOT required to make `bun test` pass.

---

## §7 Open questions you may need to resolve

These are listed in IMPACT-ASSESSMENT.md §7. The ones most likely to affect THIS dispatch:

### §7.5 Engine `<EngineName/>` cross-file mount semantics
Per §51.6 — singleton-shared instance across all use-sites in cross-file scenarios. Document this explicitly. If you find this contradicts existing behavior or is implementation-impractical, surface in progress.md.

### §7.6 `pinned` keyword interaction with derived engines
Probably moot (no writes possible on derived). Document briefly in §51.12.

### §7.7 Component instance-state vs engine singleton-state
Component bodies shouldn't instantiate engines (PA-recommended `E-COMPONENT-ENGINE-SCOPE`). Document in §15 or §51 — your call, but cross-ref both.

### §7.8 `<errors of=@signup.field>` when field has no validators
Per L11 Edge B — synthesize anyway; `errors` is empty array; rendering produces no DOM. Document in §55.5/§55.6.

### §7.9 Validator firing on derived cells
`const <x req>` — derived cells are read-only; validators imply gating. Probably `E-DERIVED-WITH-VALIDATORS` or the validators are simply rejected at parse-time. Document in §55.2 + §6.6 cross-ref.

### §7.4 `<errors of=expr/>` body override syntax
The body uses arrow-function-shaped expression `${(err) => <span>...</>}`. Verify this composes with §15 (component bodies) and §16 (slot bodies) for consistency. If a different shape is needed, surface in progress.md.

### S56 alignment Q&A — `E-DERIVED-VALUE-MUTATE`
PA-leans-forbidden per outcomes ledger §3.14. This dispatch's §34 lists it. If during rewrite you find evidence the mutation should be allowed, surface to user — DO NOT silently flip it.

---

## §8 Estimated wall-time

- §17 update: 1-2 hours
- §18 rewrite: 4-6 hours
- §51 full restructure: 12-20 hours (the big one)
- §54 verification + small edits: 1-3 hours
- §55 NEW (entire section): 8-14 hours
- §34 error code additions: 2-3 hours
- SPEC-INDEX regen + cross-ref sweep: 1-2 hours

**Total: 29-50 hours of focused dispatch work.** Plan accordingly. The largest dispatch in the staging plan. Make commits and progress.md updates frequent.

If a single dispatch session can't reach completion, partial-commits + progress.md let a continuation dispatch pick up cleanly. The dispatch is structured so each numbered subsection (§3.1, §3.2, ...) can be a checkpoint.

---

## §9 Dispatch authorization

- **Worktree-isolated** per pa.md F4 path discipline.
- **Pre-commit hook** must NOT be bypassed without explicit authorization.
- **No destructive operations without prompting** per S56 user directive ("I am terrified of agents autonomously deleting things"). Rejected destructive ops include: `rm`, `git reset --hard`, force-push, deletion of files outside this dispatch's scope. The §51 / §18 / §17 / §54 rewrite permits MODIFICATION of section content within SPEC.md; deletion of file-level content (entire files) is not in scope.

---

## §10 Cross-references

- **Master plan:** `docs/changes/v0next-spec-impact/IMPACT-ASSESSMENT.md`
- **Dispatch 1 brief:** `docs/changes/v0next-spec-impact/DISPATCH-1-BRIEF-foundation.md`
- **S56 outcomes ledger:** `../scrml-support/docs/deep-dives/v0next-s56-deliberation-outcomes-2026-05-04.md`
- **S55 outcomes ledger:** `../scrml-support/docs/deep-dives/v0next-s55-deliberation-outcomes-2026-05-04.md`
- **S54 synthesis:** `../scrml-support/docs/deep-dives/state-as-primitive-redesign-synthesis-2026-05-03.md`
- **Kickstarter v2 (locked anchor):** `docs/articles/llm-kickstarter-v2-2026-05-04.md`
- **Anti-patterns brief:** `../scrml-support/docs/gauntlets/BRIEFING-ANTI-PATTERNS.md`
- **User-voice S55 + S56:** `../scrml-support/user-voice-scrmlTS.md`
- **Repo PA directives:** `pa.md`
- **Worktree path discipline source:** `pa.md` §"Worktree-isolation: startup verification + path discipline (S42 finding F4)"
- **Progress.md target:** `docs/changes/v0next-spec-impact/progress-dispatch-2.md`

---

## §11 Tags

#stage-0b #dispatch-2 #engines-match-validators-substates #spec-major #§17-tier-ladder #§18-match-block-form #§51-full-restructure #§54-verify #§55-NEW #§34-error-codes #scrml-dev-pipeline-T3 #worktree-isolated #depends-on-dispatch-1
