# TASK — exempt canonical scrml forms from ghost-lint false-positives

Change-id: `ghost-lint-canonical-exempt-2026-06-11`. SCOPE at the change-dir. Gap `g-ghost-lint-canonical-form-false-positive` (LOW). FILE-DISJOINT from the concurrent `type-system.ts` dispatch — touch ONLY `lint-ghost-patterns.js` + `lint-w-each-promotable.js`.

(Standard template: MAPS-first [watermark 1734b81b / HEAD cf954570], F4 startup-verify, S99/S126 Bash-edit path discipline — use single-quoted heredoc/python3 NOT `perl -e` for `@`/`$`/`§`/backtick/`=>` text (a sibling S184 perl edit mangled `§`→Latin-1 + dropped `@x`), NO `--no-verify`, S136/S138/S83.)

## FIX A — snippet-fill `prop={ (param) => <markup> }` trips ghost lints (lint-ghost-patterns.js)
Canonical parametric-snippet-fill (PRIMER §6.4(5)/§16.6; SPEC §955; corpus examples/07,27, samples/snippet-002) false-fires W-LINT-007 (~690; `prop={` JSX regex, markup-value exemption misses because first char is `(`), W-LINT-021 (~1012; `(label) =>` matches Angular `(click)=`), W-LINT-004 (~645).
Reproducer: `const Card = <div props={ body: snippet(label: string) }> ${render body("x")} </div>` + `<Card body={ (label) => <p>${label}</p> } />` → W-LINT-007 + W-LINT-021. EXPECTED: none.
Fix: skipIf disjunct (sibling of `isTypedCellDeclObjectLiteral` ~515) recognizing `<ident>={` whose body's first non-ws content is `( <params> ) =>` (the §16.6 snippet-fill) → exempt 007/021/004. MUST NOT weaken genuine JSX `<Comp prop={scalar}>` / Angular `(click)=h` / `onChange={h}` catches.

## FIX B — tableFor-generated iteration trips W-EACH-PROMOTABLE (lint-w-each-promotable.js)
`<tableFor for=T rows=@x/>` fires W-EACH-PROMOTABLE on tableFor's INTERNALLY-GENERATED `for...lift`. Reproducer: a `<program>` with `<tableFor for=Row rows=@rows/>` → W-EACH-PROMOTABLE on the tableFor line. EXPECTED: none.
Fix: don't fire on compiler-generated iteration (tableFor expansion). Trace where the lint runs vs expansion; exempt generated nodes. MUST NOT weaken a genuine adopter `${ for (x of @c) { lift } }` (STILL fires).

## SCOPE GUARD
ONLY the 2 lint files. Do NOT touch type-system.ts (concurrent dispatch). Exempt ONLY canonical forms; genuine catches intact.

## TESTS
A: snippet-fill → 0 ghost lints; real `<Comp x={scalar}>` + `(click)=h` + `onChange={h}` STILL fire. B: tableFor → 0 W-EACH-PROMOTABLE; genuine `${for...lift}` STILL fires. Full suite 0 regressions.

## R26 (before DONE)
snippet-fill → 0; tableFor → 0; genuine forms STILL fire (no over-exemption).

## FINAL REPORT
WORKTREE/FINAL_SHA/FILES/BRANCH; A+B loci + exemption + why; before/after + genuine-catch regression; test counts; R26; maps line; deferrals.

---
NOTE: abridged from the verbatim Agent prompt; full prompt carried the complete MAPS/F4/S99-S126/S138/S83 boilerplate.
