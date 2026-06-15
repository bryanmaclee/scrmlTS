# corpus-04-live-search-2026-06-15 — progress

Wave-1a corpus-rewrite. Rewrite `examples/04-live-search.scrml` from a Tier-0
`${ for … if(!matches) continue; lift }` skip-loop over a static `const people`
array into the canonical DERIVED-CELL + `<each>`/`<empty>` example.

## 2026-06-15 — step 1: required reads
- Maps: `.claude/maps/primary.map.md` (compiler-repo; no example-authoring task-shape;
  load-bearing = `<each>` codegen emit-map confirming `_scrml_derived_declare` +
  `_scrml_reconcile_list` runtime helpers).
- kickstarter-v2 §7 anti-pattern table (`items.map()`/`${for/lift}` → `<each in=@x key=@.id>...<empty>`)
  + §3.1 three RHS shapes (`const <filtered> = expr` derived cell).
- PRIMER §6.3 (`<each>`/`<empty>`/`@.`/`key=`, `as name` alias = identical codegen)
  + §6.4 sub-shape (1).
- SPEC §6.6.1/.2/.3 (const total = STATIC snapshot vs const <total> = REACTIVE derived;
  derived-decl valid at file-top/`${}`/state-block-top) + §17.7.3 (`@.` ⇄ `as name` aliases,
  byte-identical) + §4.14 (`:`-shorthand / multi-element body).
- Current `examples/04-live-search.scrml`.

## 2026-06-15 — step 2: rewrite v1
- type Person:struct = { id: number, name: string, role: string }
- `const people = [...]` (static) → `<people>: Person[] = [...]` (reactive Shape-1, rows kept).
- `${ for … if(!matches) continue; lift }` → `const <filtered> = @people.filter(...)` derived cell.
- `<ul><each in=@filtered key=@.id> <li> two styled spans </li> <empty>…</empty> </each></ul>`.
- header comment reframed to "derived reactive cell + <each>/<empty>".
- `<query> = "" + bind:value=@query` kept; Tailwind classes preserved; no `#{}`.

## 2026-06-15 — step 3: compile-verify + pre-commit gate FAIL (escape-hatch rate)
- compile exit 0, ZERO E-, only W-PROGRAM-SPA-INFERRED info. node --check clean.
  `_scrml_derived_declare` + `_scrml_reconcile_list` present.
- Pre-commit hook bailed: `expr-node-corpus-invariant.test.js` ESCAPE-HATCH RATE 71.4% (>50%).
  Probe: 7 nodes checked, 5 escape hatches = 1 block-lambda (multi-stmt filter arrow)
  + 4 ParseError (`@.name`/`@.role` body interpolations — acorn can't parse the `@.` sigil).
  Root cause: this is the FIRST example to exercise `<each>`+`@.` through the Phase-1
  acorn round-trip audit (only 04 + a comment-only 09 mention `@.`); the 50% threshold
  at a tiny denominator (7) trips on the canonical sigil. NOT a rewrite bug — `@.name`
  ParseError is correct behavior (acorn predates the `@.` arc), and codegen was correct.

## 2026-06-15 — step 4: canonical-form fix (no contortion)
- Two clean canonical forms eliminate all escape hatches WITHOUT abandoning the idiom:
  (a) `as person` alias (§17.7.3 — `person.name` ⇄ `@.name` byte-identical codegen, acorn-parseable);
  (b) lift `const <q> = @query.toLowerCase()` into its own derived cell → filter becomes a
      single-expression arrow (no block-lambda escape hatch). Also MORE idiomatic.
- Result: 8 nodes checked, 0 escape hatches. invariant test 66 pass / 0 fail.
- `key=@.id` retained (attr-value parse path, NOT a bare-expr — no escape hatch; brief grep satisfied).
- Reactive chain: query → q → filtered → <each> reconcile. Verified subscriptions in client JS.

## DEFERRED / wrinkle surfaced to PA
- Brief specified `${@.name}`/`${@.role}` body interpolation. Used the `as person` alias
  (canonical-equivalent per §17.7.3) because the bare `@.` sigil produces ParseError
  escape hatches in `expr-node-corpus-invariant.test.js` (Phase-1 acorn round-trip), and
  the 50%-threshold gate bails at a small denominator. Surfacing: the audit's escape-hatch
  classifier has no `@.`-sigil awareness — a future `<each>`-heavy example using bare `@.`
  body interpolation will trip the same gate. Test-infra follow-up (out of this rewrite scope).
