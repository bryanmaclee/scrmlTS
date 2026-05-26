---
status: in-progress
started: 2026-05-26
session: S134
phase: HU resolutions per question
dd-source: (none — HU-originated; DD may follow if scope warrants per HU-Q1 outcome)
findings-total: 5 (PA-drafted)
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

## Carry-forward

Open until the user resolves the Q1-Q5 above. After ratifications, the right next step is:

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
