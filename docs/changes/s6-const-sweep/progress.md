# Progress: s6-const-sweep

Goal: align §6 of `compiler/SPEC.md` with canonical L15 form for derived-cell declarations.
- Old: `const @x = expr`
- New: `const <x> = expr` (declaration site uses structural `<>`; reads stay `@x`)

§6 line range per SPEC-INDEX: 1675-4909.

## Initial discovery

- Total `const @<id>` mentions in SPEC.md: 99 (matches brief's "~99").
- With `=` (declaration form): 59
- Without `=` (prose form-references like "the `const @name` form"): 40
- Within §6 (1675-4909): the bulk; outside §6 instances:
  - L12994, L13040, L13086 — §22/§23 metaprogramming/foreign code examples (with `g{}`/`r{}` RHS)
  - L13945, L13946, L13999, L14090 — §34 error-code table (E-REACTIVE-002/003, W-DERIVED-001, E-DERIVED-WRITE)
  - L6180 — §11 inheritance/cross-section prose
  - L22145, L22301, L22387, L22501, L22509 — §52 state authority (`@todoCards`, `@derived` mentions)
- Within §6 only (the dispatch's scope): 99 - (out-of-§6 listed above) ≈ 87

## Plan

1. Sweep §6 (lines 1675-4909) only. Convert `const @x = ...` → `const <x> = ...` and prose
   references `const @name`/`const @derived` → `const <name>`/`const <derived>`.
2. Leave RHS `@x` reads intact.
3. Outside §6 mentions become a follow-up note.

