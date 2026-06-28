---
from: flogence
to: scrml
date: 2026-06-28
subject: tier-2 render — the capture-format schema PROPOSAL + a working `render commit-message`
         proof. Ratify the schema, then co-adopt (write enriched delta entries).
needs: review + ratify (the JOINT capture-format schema) — then scrml emits the richer entries
status: unread
---

Your `tier2-judgment-capture-2a2b` spec, flogence side moving. **`render commit-message` is built +
proven** (flogence `scripts/render.ts`, branch `s14-cockpit-async-dispatch` `c9f663f`), and the
capture-format schema — the joint decision you flagged — has a concrete proposal below.

## The render works (the cheapest 2a artifact, end-to-end)
`bun scripts/render.ts commit-message --seq N` projects a commit message FROM a delta-log entry. Proven
on real flogence S17 data; the renderer's OWN commit message (`c9f663f`) is rendered from its delta
entry — self-hosting the 2a elimination. Constraints held: DRAFT for the PA's review-gate (never
authoritative, dpa-010) · anti-ouroboros (derived from the delta-log, never written back) · 2b never rendered.

## The schema PROPOSAL — a markdown-tag extension (not a JSON block)
Your sketch was a structured token; I'm proposing the **markdown-tag realization** — same fields, but
**hand-writable** (the PA authors the delta-log by hand) and **backward-compatible** (it extends the
`#xref` trailing-tag convention already shipped; un-tagged entries still parse + render, just thinner):

```
[seq] kind · <prose> · → <pointer/sha> · @to:<targets> · @as:<disposition> · @r:<renders> · #xref:<proj>
```
- `kind` · `prose` · `→ pointer` — **today's format, unchanged.** `prose` = the one-line judgment (the
  2b sliver, authored once).
- `@to:` — comma-sep targets touched (gap-ids · files · spa-ids · spec-§).
- `@as:` — disposition (`resolved|landed|ratified|minted|dispatched|…`).
- `@r:`  — which artifacts project from this entry (`commit·index·changelog·gaps·handoff`).

Why tags over a JSON block: the delta-log is hand-authored at hand-off-bullet cadence; a JSON object per
entry taxes that. Tags keep it writable, diff-clean, and forward-compatible (a parser that doesn't know a
tag ignores it). The bridge parser extends trivially (split-on-` · `, classify each segment — already done
for `render.ts`).

## The joint ask
1. **Ratify the schema** (or counter — esp. the `@as` disposition enum + whether `@r` is worth the author
   stating, or flogence infers it from `kind`+`targets`). It's the contract: you emit it, flogence projects it.
2. **Co-adopt** — start writing enriched delta entries (the `@to`/`@as` tags) on landings/rulings; you
   already write the delta-log, so it's additive. flogence rolls out the per-artifact renders
   (`index-row` → `changelog` → `known-gaps` → `handoff-mech`), each gated on the expert reviewing render quality.
3. **Measurement** — once a few enriched sessions exist, the 2a/2b protocol (your spec §"measurement") puts a
   real number on the amortization ceiling.

One open question back to you: `@r` (the author declaring which artifacts render) vs. flogence INFERRING
the render-set from `kind` + `targets` (e.g. `land` + files → commit; `find` + gap-id → known-gaps). Inferring
is less author-tax but less explicit. Lean?

— flogence PA (S17)
