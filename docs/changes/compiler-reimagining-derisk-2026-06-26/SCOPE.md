# Compiler re-imagining — de-risk design investigation

**Change-id:** `compiler-reimagining-derisk-2026-06-26` · **Status:** SCOPING (S221) · **Type:** design investigation (NOT a build)

> The strategic fork (S221 partner conversation): the "native" parser (Charter B) is TS, so it showcases nothing
> about scrml — its value is front-end tech-debt paydown, not flagship. The bigger move on the table is
> **re-imagining the compiler e2e in scrml from the spec + reasoning**, ditching the inherited TS-imperative
> structure. Both roads are rewrite-traps; Road B is the bigger one. **This investigation de-risks the fork for
> the cost of one design exercise** — the same move the OQ#1 probe did for feel-of-performance (answer a strategic
> fork with evidence before committing sessions to it).

## The question this answers
**If the compiler were idiomatic scrml from the foundations — not a parity-port of the TS compiler — would it be
(a) cleaner, (b) a genuine flagship showcase, and (c) feasible on the language as it stands?** A decisive yes →
Road B's prize is real, commit. A no (scrml fights the domain / hits language gaps / no clearer than TS) → the
language isn't ready; shelve both (Acorn stays, the JS native-parser is quietly retired, revisit post-v1.0).

## The slice — recommend: the LEXER as scrml `<engine>`s (alt: the DG builder)
**Primary: the lexer.** Rationale — the native parser is ALREADY a composed-engines state-machine
(`LexMode` + `BracketStack` + `ErrorRecovery` as file-scope singletons; LexMode a nested composite with a
template-interpolation sub-state). That design is a TS *simulation* of exactly what scrml's `<engine>` primitive
IS. So re-expressing it as *real* scrml engines is the sharpest possible test: if scrml's engine model expresses
a real lexer MORE cleanly than the hand-rolled TS state-machine, that's a decisive yes — AND it directly answers
the parser thread (it would mean the native parser should be scrml-native, written in scrml, which reframes Road A
from "hollow tech-debt" into "the flagship"). If scrml's engines are awkward here, that's a strong negative signal
about Road B on the hardest-fit domain.
**Alternative: the DG builder** (`dependency-graph.ts`). scrml IS a reactive language; a reactive-dep-graph builder
in scrml is near-recursive (the language's own model building its own graph). Meta-resonant, also a strong test —
but the lexer ties the parser thread harder, so lead with the lexer.

## Methodology (design, do NOT build)
1. **Read the slice's current TS** to understand WHAT it does (the lexer engines: `compiler/native-parser/` LexMode
   + BracketStack + ErrorRecovery; their state-children, transitions, error-recovery). Understand the *behavior*,
   not to copy the *structure*.
2. **Read the relevant SPEC + the reasoning** (the native-parser charter deep-dives; §51.0.Q composed-engines
   hierarchy; the lexer's job per the language def) — design from intent, not from the TS shape.
3. **Design the slice as idiomatic scrml** — actual `<engine>` declarations, state-children, `rule=`/`effect=`,
   the co-location axiom load-bearing, `_{}` only where it earns it. Write REAL scrml (compilable-shaped, even if
   not yet runnable), not pseudocode. Deliberately ignore the TS pipeline/AST/pass structure.
4. **Evaluate against the three criteria + a gap log:**
   - **Cleaner?** Side-by-side: the scrml engine-decl vs the TS state-machine. Lines, indirection, clarity.
   - **Showcase?** Would a skeptical adopter look at this and say "scrml does compilers BEAUTIFULLY" (not "scrml can
     do it too")? Be honest — flagship or merely-adequate.
   - **Feasible NOW?** Log EVERY language gap the design hits (a missing primitive, a Nominal feature it needs, a
     bug, an ergonomic hole). The gap count + severity is the feasibility verdict. Zero/cosmetic gaps → ready;
     fundamental gaps → premature.

## Deliverable
A deep-dive doc (`scrml-support/docs/deep-dives/compiler-reimagining-lexer-slice-<date>.md`): the scrml design,
the side-by-side, the three-criteria verdict, the gap log, and a one-line recommendation (commit Road B / shelve /
narrow). **Vehicle:** a `scrml-deep-dive` dispatch (5-phase: scope→research→design→evaluate→output), PA-briefed
with this scope + the lexer loci + the three-criteria rubric. ~1 session. NOT a build dispatch.

## Decision gate
This is a JUDGMENT input, not an auto-decision. The investigation reports; the USER rules Road A / Road B / shelve.
Out of scope: actually building any compiler-in-scrml; the "humans build V1" rule disposition (a separate ruling —
the investigation may inform it: if the lexer slice is clean, the parity-port framing is the thing to drop, and
human-authorship can stay; surface but don't decide).

## Links
- The S221 partner conversation (user-voice S221); the parser-thread framing (crocodile-dundee critique).
- Native-parser charter: `scrml-support/docs/deep-dives/scrml-native-parser-front-end-charter-2026-05-20.md` +
  `scrml-native-parser-design-2026-05-17.md`. Lexer: `compiler/native-parser/`.
- Precedent for the de-risk-before-commit move: the OQ#1 probe → `docs/changes/feel-of-performance-approach-a-impl-2026-06-26/SCOPE.md`.
- Memory: `feedback_self_host_is_from_scratch` (the "humans build V1 / WAY BETTER not too" framing — the rule under reconsideration).
