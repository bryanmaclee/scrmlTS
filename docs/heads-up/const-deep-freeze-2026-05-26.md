---
status: in-progress
started: 2026-05-26
session: S134
phase: HU resolutions per question
dd-source: scrml-support/docs/deep-dives/const-deep-freeze-2026-05-26.md (dispatched S134, agent `a22280161ec52b7fd`, BG)
findings-total: 6 (PA-drafted; Q6 added S134 after the running DD launched)
findings-closed: 0
---

# `const <state>` Deep-Freeze — Heads-Up Resolutions

Running log of per-question resolution decisions for the "is `const <state>` truly constant + is there a manual depth knob" design question, surfaced S134 during README review.

**Conventions:**
- HU-N = heads-up sub-session N. Sequentially numbered.
- Each HU section records: question discussed, decision ratified (verbatim user direction where applicable), findings closed / advanced, carry-forward open items.
- Option labels: ASCII `a` / `b` / `c` / `d` per the banked rule.
- DESIGNER-CARD axis flagged explicitly where retirement/existential-veto is on the table.

---

## Prelude — what's currently in the spec

### `const <x>` semantics today (verified S134 against SPEC text)

A `const <x>` declaration is:

1. **Reference-immutable** (§6.6.8 / §34 `E-DERIVED-WRITE`) — reassignment via `@x = newval` is a compile error.
2. **Value-immutable on direct paths** (§6.6.18 / L21 / `E-DERIVED-VALUE-MUTATE`, added S59) — the compiler statically rejects in-place mutation of the value the derived cell holds. Specifically rejected:
   - Array mutating methods (`push`, `pop`, `shift`, `unshift`, `splice`, `reverse`, `sort`, `fill`, `copyWithin`) on a derived cell receiver.
   - Object property writes (`@derivedObj.foo = x`, `@derivedObj.foo += 1`, `delete @derivedObj.foo`).
   - In-compound derived sub-cells (`@form.derivedField.push(x)`, `@form.derivedField.foo = x`).
   - Compound-assignment / property-mutation forms on derived object cells.

The recommended fix on a fire: **mutate the upstream dependency** (the derivation will refire and produce the new value).

### The gap — alias-escape

L21 is **path-aware static analysis**. The compiler tracks direct property paths through the cell reference (`@cell.a.b.c`) and catches in-place mutation along that path. What it isn't guaranteed to track (verify with the type-system author at impl-time):

```scrml
const <user> = computeUser()
${
    const localAlias = @user             // local references the same underlying object
    localAlias.email = "x@y.com"         // does L21 follow the alias chain to detect this?
}
```

If the static analysis only checks `@user.email = ...`-shaped LHS and not aliased-then-mutated chains, the underlying value the derived cell holds CAN be mutated through `localAlias`. The next derivation tick would still recompute `@user` from its upstream deps and overwrite — so the mutation is short-lived — but for that tick the cell's value disagrees with its derivation expression. Subtle bug class.

Also relevant: values handed to **third-party / foreign JS** (a `_{}` block, an `import:host` boundary, a `<program>` Web Worker, an MCP tool call) can be mutated freely once they cross the boundary; no scrml-level invariant follows. The receiving code is JS, and JS gets to mutate.

### What runtime tools the compiler already has

`Object.freeze` is in the compiler's emitted vocabulary (SPEC §22 example at line 14287 — `Object.freeze({ get selectedType() { ... }})`). The runtime model for adopting deep-freeze exists; it's not exposed as a developer-facing modifier on cell declarations.

---

## HU-Q1 — Is the alias-escape gap a real design issue worth closing?

**Frame.** L21 catches `@cell.x = y` direct paths. Adopter code aliasing-then-mutating (`const x = @cell; x.y = z`) MAY escape the static net, depending on how aggressively the type-system tracks alias chains. Two ways to look at it:

| Option | Position |
|---|---|
| **(a) Status quo — alias-escape is acceptable** | The recommended scrml pattern is "mutate the upstream"; adopters who alias-and-mutate are off-pattern; closing the gap is paying compiler complexity to prevent a footgun adopters don't reach for. |
| **(b) Real gap; close it** | L21's promise to adopters is "this value is constant from your perspective" — and that promise is broken if any local can mutate the underlying value graph. Closing the gap makes `const <x>` an honest contract. |
| **(c) Acknowledge but defer** | Document the gap explicitly in §6.6.18; revisit when an adopter friction report surfaces. |

**PA lean:** **(b)** — `const` is a contract; contracts that leak are worse than no contract because they teach adopters to assume invariants that don't hold. The right answer per pa.md Rule 3 is to close the gap, not document around it. The implementation route is HU-Q4 below.

**Verification needed at impl-time:** does today's `type-system.ts` L21 walker track alias chains? Grep `checkDerivedValueMutate` / similar to confirm the empirical state before scoping the fix.

---

## HU-Q2 — Should there be a manual depth-control knob?

**Frame.** Even with the alias-escape gap closed at compile time (HU-Q4), values handed to **third-party JS / foreign code / Web Workers** escape scrml's analysis entirely — they're just JS objects in JS-land, mutable by design. A runtime `Object.freeze` would close this too. The question: should adopters be able to opt into it?

| Option | Position |
|---|---|
| **(a) No runtime freeze surface — `const` is compile-time-only** | Adopters who pass values to JS must accept that JS mutates. Keep the language surface clean; defense-in-depth lives outside scrml. |
| **(b) Single `freeze` bare-attribute — shallow Object.freeze** | `const <state> freeze = {...}` — runtime `Object.freeze(value)` (one level). Predictable, cheap (O(1) at write-time), familiar JS semantic. |
| **(c) `freeze=deep` bare-attribute — recursive Object.freeze** | `const <state> freeze=deep = {...}` — recursive freeze of the entire value graph. Closes the foreign-mutation gap completely. O(value-size) at write-time. |
| **(d) `freeze=N` depth knob** | `const <state> freeze=2 = {...}` — freeze N levels. Adopter chooses cost/coverage. O(min(value-size, N)) at write-time. Most flexible; most knobs. |
| **(e) `freeze` as a unified modifier — `shallow` / `deep` / number** | `freeze=shallow` (b), `freeze=deep` (c), `freeze=N` (d). All three at once; single modifier word. |

**PA lean:** **(e) unified surface** — one modifier, three useful values. The bare form (`const <x> freeze = ...`) defaults to `shallow` (the JS-native `Object.freeze` default). `freeze=deep` and `freeze=N` are explicit. Opt-in always (no default freeze). The runtime cost is transparent because adopters explicitly request the depth.

**Composition note:** `freeze=` on a NON-derived cell (`<x> freeze = {...}`) — does that make sense? A non-derived cell is mutable by the developer (`@x = newval` is legal). `freeze=` on a non-derived cell could mean "the VALUE is frozen, but the cell can be reassigned to a new frozen value." Useful or footgun? Open sub-question.

---

## HU-Q3 — Should `freeze=` apply to non-derived cells too?

**Frame.** A `<x> = {...}` cell is mutable by `@x = newval` (rebind) AND by `@x.foo = y` (in-place — assuming the cell is not const-derived). Adding `freeze=` would let the developer say "the value is frozen, but the binding rebinds":

```scrml
<config freeze=deep> = { theme: "dark", flags: { ... } }
@config.theme = "light"           // error — value is frozen
@config = { theme: "light", flags: { ... } }   // OK — rebind to a new (also-frozen) value
```

| Option | Position |
|---|---|
| **(a) `freeze=` is `const`-only** — applies to derived cells only; non-derived cells don't get the modifier. | Keeps the language tight; non-derived cells are mutable by design. |
| **(b) `freeze=` applies anywhere a value RHS goes** — `<x> freeze = {...}`, `const <x> freeze = {...}`, even Shape-2 `<x req> freeze = <input/>` if meaningful. | Consistent surface; `freeze=` is about the VALUE, not the cell's mutability of the binding. |

**PA lean:** **(b)** — `freeze=` is a value-shape attribute, not a cell-shape attribute. Apply it anywhere a value goes; let the developer decide where it's useful. The compiler enforces — rebinding produces a frozen value; in-place mutation is rejected.

---

## HU-Q4 — Should L21 statically track alias chains?

**Frame.** This is the compile-time complement to HU-Q2/Q3. Today L21 tracks direct paths off `@cell.x.y.z`. Strengthening it to follow `let local = @cell` / `let local = @cell.x` aliases would catch alias-escape at compile time, with zero runtime cost.

| Option | Position |
|---|---|
| **(a) Don't extend L21** — alias-escape stays acceptable; HU-Q2 runtime `freeze=` is the only defense available. | Keeps the compiler simpler; matches the "mutate upstream" recommendation. |
| **(b) Extend L21 to follow let/const bindings of derived cells** — when `let x = @derivedCell` is detected, `x` carries an alias-tag; subsequent `x.foo = y` fires L21. | Compile-time, scrml-shaped enforcement. Compiler work but it's the right answer per Rule 3. |
| **(c) Extend L21 to track aliases AND require an explicit `transition()`-style annotation when an adopter intends to escape the freeze** — e.g., `clone(@derivedCell)` returns a mutable copy. | Adds a new built-in but gives a clean escape hatch. Heavier. |

**PA lean:** **(b)** — the right answer is to follow alias chains in the static analysis. The `clone()` escape (option c) is interesting but adds surface area for a use case that may not be load-bearing.

---

## HU-Q5 — Composition with lifecycle annotation + refinement types

**Frame.** Sister type-system features:

- **Lifecycle annotation** `(A to B)` — value starts as A, transitions to B; per-access transition state.
- **Refinement type predicate** — `string(.length > 7)`, `number(>0 && <100)` — boundary check; value satisfies the predicate.
- **`freeze=`** — value is immutable past some depth.

Do these compose orthogonally?

- `const <user>: User = ...` — derived value; L21 applies. Adding `freeze=deep` → runtime-immutable derived value.
- `<state>: (Idle to Active) freeze = ... = .Idle` — lifecycle + freeze on a Shape-1 cell. The transition rebinds to a frozen value; the value can't be mutated in-place between transitions.
- `<x>: string(.length > 7) freeze = ...` — refinement-typed value with runtime freeze. Composes naturally because refinement types are predicates on the value, not depth-related.

**PA lean:** Three orthogonal type-system surfaces (lifecycle, refinement, freeze) compose. Each addresses a different property of the value:
- **lifecycle** — when can it transition
- **refinement** — what value can it hold
- **freeze** — can it be mutated past some depth

Surface separately; document the composition in §14.x as a footnote.

---

---

## HU-Q6 — `reset(@cell)` on a lifecycle-annotated cell

**Frame.** Added S134 (after the running DD launched; pa.md Rule 4 spec spot-check turned up the gap).

A state cell `<state>: (not to User) = not` carries a lifecycle annotation `(not to User)` (§14.12). At runtime:
1. Init: `@state` is `not`; per-access transition state is `pre`.
2. Write: `@state = <someUser>` triggers the lifecycle transition; per-access state goes `pre → post`. Reads of `@state.field` now pass.
3. **Now**: someone calls `reset(@state)`.

§6.8 normatively says `reset(@cell)` re-evaluates the init expression (here: `not`) and writes the result. **The interaction with the lifecycle annotation's per-access transition state is NOT specified.** Three plausible behaviors:

| Option | Behavior | Implication |
|---|---|---|
| **(a) Symmetric reset** | `reset(@state)` writes `not` AND reverts per-access transition state to `pre` | Lifecycle contract holds; reads of `@state.field` post-reset fire `E-TYPE-001` again. Form-clearing flows work naturally. |
| **(b) Asymmetric reset** | `reset(@state)` writes the value but leaves transition state `post` | Breaks the lifecycle contract — value is `not` but the type-system says it's transitioned. Reads of `.field` would return `not` without firing. Footgun class. |
| **(c) Forbid the combination** | `reset(@cell)` on a lifecycle-annotated cell is a compile error | Cleanest semantic but rejects a legitimate use case (form-clearing). Heavy. |

**PA lean: (a)** — the lifecycle contract should hold under reset. If you reset the value to the pre-type (`not`), the per-access transition state should also revert. The §6.8 reset path is conceptually "set the cell to its init state" — the transition state IS part of the cell's state for a lifecycle-annotated cell.

**Cross-cutting implication.** Same question for the other lifecycle shape — `<state>: (.Draft to .Published)` with `default=.Draft`. `reset(@state)` writes `.Draft`. Does the per-access state revert? Per option (a) yes, symmetric.

**SPEC amendment needed regardless of Q1-Q5 outcomes.** This is orthogonal to the freeze design space — it's a `reset` × `lifecycle annotation` composition gap in the existing surfaces. Should land as a §6.8 + §14.12 amendment in any case.

**Estimated cost:** ~2-4h spec amendment + ~3-5h impl (type-system tracker needs to listen to `_scrml_reset_*` writes and revert per-access state when the written value matches the pre-type) + ~5-8 regression tests. ~10-20h total. Small + bounded.

---

## "Is `freeze=` extra weight?" — framing redirect (S134 user signal)

**Added S134 after agent dispatched** — user-flagged framing:

> "the type system already has the predicates and contracts, maybe its extra weight. unless the dd reveals inference channels we havent explored yet."

The intuition: scrml already has FOUR type-system surfaces that enforce value invariants:

| Surface | What it enforces | Where |
|---|---|---|
| **Refinement-type predicates** | Value satisfies a predicate (`string(.length > 7)`, `number(>0 && <100)`) | §53; three-zone enforcement |
| **L21 / E-DERIVED-VALUE-MUTATE** | No in-place mutation of derived-cell values | §6.6.18 |
| **Lifecycle annotation `(A to B)`** | Per-access transition state on value-shape progression | §14.12 |
| **`E-DERIVED-WRITE`** | Reference-immutability of derived cells | §6.6.8 |

Adding `freeze=` as a runtime modifier potentially duplicates the work the type system is supposed to do at compile-time. The right design move may be:
- Extend L21 (HU-Q4) to track alias chains — closes the gap at compile-time, zero runtime cost, scrml-shaped
- Possibly add a refinement-type-style annotation (`Frozen<T>` or `T frozen` or similar) that the type-system enforces at boundary, instead of a runtime modifier
- Leave runtime `Object.freeze` as an internal compiler tool, not user-facing

The DD's `simplicity-defender` expert consultation explicitly carries this question. Phase 3 §5 also asks "Per-question PA-recommendation re-check: does the DD's evidence shift any of the HU PA leans?" — so the framing redirect IS within the agent's scope.

**The right-answer-is-no-knobs argument** (PA lean to test):
- HU-Q4 (extend L21 alias tracking) is the right move — compile-time, type-system-shaped.
- HU-Q2 (runtime `freeze=` modifier) is potentially extra weight that the type-system extension subsumes.
- HU-Q3 / Q5 dissolve if `freeze=` doesn't ship.
- HU-Q1 (alias-escape gap real?) is still the empirical question — answer comes from the DD's type-system.ts walk-through.

**Open: does the DD reveal an inference channel we haven't explored?** Specifically — can the existing refinement-type three-zone enforcement model be extended to express "this value graph is frozen past depth N" as a TYPE predicate, with the compiler emitting Object.freeze only at boundary sites (the JS-host crossing point) and nowhere else? That would be:
- Type-level immutability invariant (compile-time check at boundary)
- Runtime O(value-size) freeze ONLY at the JS-host boundary, not on every cell update
- No new modifier syntax — uses the existing refinement-type surface

If the DD confirms this path, HU-Q2 / Q3 / Q5 collapse into HU-Q4 + a refinement-type extension. Single coherent type-system surface, no `freeze=` modifier needed.

---

## Carry-forward

Open until the user resolves the Q1-Q6 above. After ratifications, the right next step is:

- **If Q1 = (a) status quo** — close this HU; document the alias-escape gap in §6.6.18; revisit on adopter friction.
- **If Q1 = (b) close the gap** — spin up a DD for the implementation strategy (Q2/Q3/Q4 ratifications shape the scope). Estimate ~30-60h compiler-source work for alias-tracking; ~10-20h for the `freeze=` modifier surface; ~5-10h for SPEC amendments + tests; ~5h for PRIMER + kickstarter catch-up.
- **If Q1 = (c) acknowledge + defer** — file as a known-gap in `docs/known-gaps.md` MED bucket; revisit on adopter friction reports.

## Cross-references

- §6.6.8 — `E-DERIVED-WRITE` (reference-immutability)
- §6.6.18 — `E-DERIVED-VALUE-MUTATE` / L21 (value-immutability on direct paths)
- §14.12 — lifecycle annotation `(A to B)` (sister type-system surface)
- §22 line 14287 — emitted `Object.freeze` (runtime tool already in use)
- §34 — error catalog (E-DERIVED-WRITE, E-DERIVED-VALUE-MUTATE)
- README.md → "## Today's Tasks" Stage 2 — `const <visible> = match @filter {...}` is the kind of derived cell this question concerns.
