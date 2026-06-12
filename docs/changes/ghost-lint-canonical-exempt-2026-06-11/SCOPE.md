# SCOPE — exempt canonical scrml forms from ghost-lint false-positives

**Filed:** S184 (2026-06-11). **Source:** components/L22 dog-food. **Authorized:** user "dispose the ghost-lint candidates" (framed as "one fixable class: exempt scrml-canonical shapes from the ghost pass"). Gap: `g-ghost-lint-canonical-form-false-positive` (LOW).

## Two confirmed false-positive sub-classes (info/warning-level, non-blocking)

### A. Snippet-fill `prop={ (param) => <markup> }` — ghost lints (lint-ghost-patterns.js)
Canonical parametric-snippet-fill (PRIMER §6.4(5) / §16.6; SPEC §955; corpus: examples/07, examples/27, samples/snippet-002-parametric) fires:
- **W-LINT-007** (~690): `prop={` matches the JSX `<Comp prop={val}>` regex; the markup-value exemption (peek `<Tag` after `{`) misses because the first char is `(` (the lambda).
- **W-LINT-021** (~1012): the lambda param `(label) =>` matches the Angular `(click)=` event-binding family (`(IDENT) =`, taking the `=` of `=>`).
- **W-LINT-004** (~645): `onChange={handler}` family — matches the `prop={` on the fuller form.

**Fix:** add a snippet-fill exemption — a skipIf (sibling of the S184 `isTypedCellDeclObjectLiteral` helper at ~515) that recognizes `<ident>={ (<params>) => ...` (a prop-attr whose `{`-body opens with a parenthesized-param arrow lambda = the §16.6 snippet-fill) and exempts W-LINT-007/021/004 there. Do NOT weaken the genuine JSX/Angular catches (a real `<Comp prop={val}>` scalar / `(click)=handler` Angular binding STILL fires).

### B. tableFor-generated iteration — W-EACH-PROMOTABLE (lint-w-each-promotable.js)
`<tableFor for=T rows=@x/>` trips W-EACH-PROMOTABLE on tableFor's INTERNALLY-GENERATED `for...lift` (attributed to the `<tableFor>` line) — promotes code the adopter didn't write.
**Fix:** W-EACH-PROMOTABLE should not fire on compiler-generated iteration (e.g. tableFor expansion). Trace where the lint runs relative to tableFor expansion; exempt generated iteration (a marker on the generated node, or run the lint pre-expansion on adopter source only). Agent traces the cleanest exemption.

## SCOPE GUARD
- ONLY exempt the canonical forms (A: snippet-fill; B: tableFor-generated). Do NOT weaken the genuine framework-ghost catches.
- File-disjoint from the in-flight Gaps-1+2 typer dispatch (`type-system.ts`): this is `lint-ghost-patterns.js` + `lint-w-each-promotable.js`.

## TESTS
- A: `<Card body={ (l) => <p>${l}</p> }/>` → 0 W-LINT-007/021/004; a real `<Comp x={scalar}>` / `(click)=h` STILL fires.
- B: `<tableFor for=T rows=@x/>` → 0 W-EACH-PROMOTABLE; a genuine adopter `${ for (x of @c) { lift } }` STILL fires.
- Full suite 0 regressions.
