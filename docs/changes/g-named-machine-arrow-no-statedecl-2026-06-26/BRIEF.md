# BRIEF — g-named-machine-arrow-no-statedecl-silent-empty (ss39 item 3, SURVEY-FIRST)

**Dispatch:** scrml-js-codegen-engineer · isolation:worktree · model opus · **SURVEY-ONLY**
**Outcome:** verdict (c) AMBIGUOUS → PARKED, escalated to PA. See `SURVEY.md` (same dir).

The dispatch was a STOP-first survey (read SPEC §51.3.2 in full, locate the codegen/typer
locus, study the B2 `d71a6dcc` precedent, reproduce the bug + working differential, and
return a scope verdict (a)/(b)/(c)/(d) with an explicit "safe for sPA to land?" call). No
source edits; repros confined to scratchpad.

Result: the brief's determinate options were both unavailable — (a) is SPEC-forbidden for
non-derived named machines, and (b) is gated on a contested Model-1-vs-Model-2 read-name
ruling (the deliberate S192 typer pre-bind at `type-system.ts:11314`). Parked for a PA
design ruling. Full verdict + post-ruling decomposition in `SURVEY.md`.
