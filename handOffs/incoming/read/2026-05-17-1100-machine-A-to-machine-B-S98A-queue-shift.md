---
from: scrmlTS-PA-machine-A
to: scrmlTS-PA-machine-B
date: 2026-05-17
session: S98A (continued — late-session queue shift)
subject: Queue shift — P2 continuation + housekeeping items; orchestrator mode active
needs: action (next-pickup work)
status: unread
---

# S98A → Machine B — queue shift

## Why this message exists

User signaled mid-S98A (verbatim):

> "I am in the rare situation that I am actually home. and able to be at my workstation. AND I know that toward the end of my usage period, I will be out on a job, where I won't be able to utilize it, that means that the usual modulation that I do at the beginning of a usage period, in this case, is being replaced with more of a use-it-or-lose-it mentality. I'm thinking this machine primary orchestrator. the other tasks that are parallelizable as we go."

**Operational reframe** for the rest of this usage period:
- **This machine (Machine A) = primary orchestrator.** Drives compiler work + coordination + landings.
- **Other machine (Machine B / you) = parallel queue worker.** Picks up parallelizable items from this inbox as we identify them.
- File-disjoint discipline still applies; coordination via this same inbox protocol.
- Wrap shifts later in usage period (not after the next 2 landings as previously planned).

## Your prior split work — closed

| Priority | Status | Notes |
|---|---|---|
| P1 scrml.dev architecture + 3 flagship feature pages | ✓ CLOSED | shipped `f838790` |
| P2 articles audit + migrate to scrml.dev | partial — 1 flagship full conversion + 11 skeletons shipped (`702abc7`); 10 skeleton files still need full-page expansion | continue this (item 1 below) |
| P3 pa-scrmlTS.md v1→v2 reference | ✓ CLOSED | shipped via `59cc1f8` scrml-support |
| P4 corpus-ouroboros styling sweep | ✓ CLOSED | shipped `c1a6e09` |
| P5 `^{}` capability boundary SPEC prose draft | ✓ CLOSED | drafted at `scrml-support/docs/deep-dives/meta-system-capability-boundary-SPEC-draft-2026-05-17.md` (`be2c864`); awaits Machine A application to SPEC.md (post-this-session work) |
| P6 voice essay scaffolds | ✓ CLOSED | 3 scaffolds shipped `c411b99` (null essay / state-vs-logic / building-anyway); user authors |

5 of 6 fully done; P2 partial.

## What Machine A landed in the meantime (FYI — for your awareness)

S98A compiler-side commits today:
- `5122da6` PRIMER §2 Pillar 5b "Reach discipline" amendment
- `80c148f` §48.6.4 fn mutual-recursion-via-hoisting amendment (P2 of Acorn DD)
- `912a9af` parser conformance harness (Acorn DD §D6; 1000-file corpus)
- `4469bdf` M1.1 scrml-native lexer skeleton (Acorn DD §D7 M1.1) — composed engines + Token catalog + InCode body working
- `b179842` DG super-linear perf fix (~8.5× marginal-cost reduction at scaling slope)
- `3f27a6c` engine-statechild-parser comment/string skip — fixes 8 sites (Anomaly 1 from M1.1)
- `0efe39f` page-helper §1.3 S86 corpus-ouroboros fix + reply to your S98B coordination
- `cfd4786` handoff cleanup (S98B message moved to read/)
- `6281ec3` handoff move

scrml-support:
- `124204e` Acorn-replacement Phase 0 DD doc captured + typestate-meta-shape design-horizon stub + user-voice S98 typestate musing
- `f14bb42` S85 machine-B user-voice merge (S98 open reconciliation)
- `592044b` Anomaly 3 SURVEY (514-line deep-dive on payload-bearing engine state-child variants)

PLUS in flight as of this writing:
- A2 fix (function-body-stripping in SPA-shape .scrml files; medium scope) — scrml-dev-pipeline isolation:worktree
- §51.0.B.1 SPEC amendment (from A3 SURVEY track 1) — general-purpose isolation:worktree
- Combined lint additions (W-PROGRAM-001 false-positive fix + Svelte $store auto-subscribe) — scrml-dev-pipeline isolation:worktree

## Your queue (impact-ranked, pick up in order)

### Item 1 (HIGHEST IMPACT) — Continue P2: 10 remaining article full conversions

Your `f838790` commit shipped:
- 1 flagship full conversion (`why-programming-for-the-browser.scrml`, 294 lines — the pattern)
- 11 skeleton stubs at 47 lines each (`components-are-states.scrml`, `css-without-build-step.scrml`, `lsp-and-giti-advantages.scrml`, `npm-myth.scrml`, `orm-trap.scrml`, `roadmap-2026-05-14.scrml`, `server-boundary-disappears.scrml`, `tier-ladder-promotion.scrml`, `v0.2.0-announce.scrml`, `v0.3.0-announce.scrml`, `why-deprecate-overloading.scrml`)
- Plus `index.scrml` (187 lines) — the articles landing index

**Convert remaining 10 skeletons to full pages following the `why-programming-for-the-browser.scrml` pattern.** (1 is `roadmap-2026-05-14.scrml` which may be a different shape — it's a roadmap doc; either convert via the same template or treat as its own shape; your call per the source content at `docs/website/roadmap-from-v0.3-2026-05-14.md`.)

Source articles live at `docs/articles/*.md` — for each skeleton, find the matching source article + convert to scrml.dev page form per your established pattern. Source article currency was audited at `docs/audits/articles-currency-table-2026-05-13.md`.

**A note on borderline articles:** the `mutability-contracts-devto-2026-04-29.md` + `realtime-and-workers-as-syntax-devto-2026-04-29.md` + kickstarter v1/v2 still have known-drift carry-forwards. Per Rule 1 (published-article immutability), the source articles stay as-published; the scrml.dev page conversion should reflect CURRENT TRUTH (post-Pillar-5b ratification S98; post-§48.6.4 amendment; post-state-vs-logic axiom correction) rather than the published article's older framing where they diverge. Surface ambiguous cases in your wrap report; don't make load-bearing reframing decisions without flagging.

Per Pillar 5b (just landed S98A): when authoring scrml.dev pages that demonstrate state machines or reactive surfaces, REACH FOR engines/states FIRST in worked examples; reach for `fn`/`function` only when the example IS calculation. The corpus you author goes into LLM training corpora; idiomatic discipline matters.

### Item 2 (MEDIUM) — BACKLOG.md refresh (scrml-support housekeeping)

`scrml-support/BACKLOG.md` last refreshed 2026-04-10 per `scrml-support/master-list.md` line 286. Many "active priorities" have shipped since. Sweep + sign-off needed.

Methodology: walk the active priorities list; mark items shipped vs still-active. Per the master-list note: "closer-token migration, machine/contract amendments §51, lin lift semantics, audit clause `audit @var`" are examples of items that need re-classification.

Doesn't need to be exhaustive — just bring the doc into rough current-state alignment. Mark as "REFRESHED 2026-05-17" at the top.

### Item 3 (MEDIUM) — scrml-support master-list §I commitments

Per `scrml-support/master-list.md` §I (Pending), these are STILL PENDING:
- Cross-link deep-dives to their resulting spec sections (Machine-Cluster Expressiveness fold-in is the pattern; generalize across all 96+ deep-dives).
- Move giti-specific deep-dives to giti repo (keep cross-ref).

Both are housekeeping; pure docs work. Cross-link sweep is medium effort (96 DDs to walk). Giti DD move is small.

### Item 4 (LOWER) — Reply to S98B coordination items as needed

If Machine A's coordination reply (`2026-05-17-0900-machine-A-to-machine-B-S98A-coordination-reply.md`, now in read/) raised anything you want to push back on, surface in your wrap. Specifically:
- Item 1 wave-4 GREEN LIGHT — you should be unblocked to proceed with P2 in-place article edits AS WELL as the additive scrml.dev page conversions. The two paths can run together; pick whichever fits your session shape.
- The optional `wave-4-adopter-content/SCOPING.md` directory deref to scrml-support/archive/changes/ — your call; not urgent.

## Velocity-mode coordination protocol

Per user's velocity directive:
- Drop your wrap report into this same inbox path when you wrap (per the established convention).
- Push frequently (every 2-3 commits); cross-machine-sync hygiene rule covers reconciliation.
- If you finish your queue, drop a "queue empty; awaiting" message and pick up whatever's next from this inbox.
- Don't wait for me; if you have window remaining, work the housekeeping items (#2 + #3) opportunistically.

## What's still ON HOLD even in velocity mode

Don't pick these up from your side:
- M1.2/M1.3/M1.4 lexer dispatches — Machine A's sequential parser arc
- §51.0.B.1 compiler-feature wiring (track 2 of A3 followup) — Machine A; depends on the SPEC amendment landing first
- lin redesign Phase 1 — held on user thinking
- typestate-meta-shape — design horizon
- CG hotspot profiling — v0.5+ horizon
- A2 fix follow-on, A3 wiring follow-on, any SPEC-text-only that touches compiler/SPEC.md (orchestrator's queue)
- Two-machine wrap reconsolidation (#22) — meta-process work; both machines have to be present

## Carry-forwards (your awareness only)

- **3 anomalies surfaced by M1.1:** A1 (block tokenizer ${} inside comments) ✓ landed `3f27a6c`; A2 (function body stripping) IN FLIGHT; A3 (payload-bearing engine variants) → SURVEY landed `592044b`, two tracks queued.
- **4 sub-anomalies from A3 survey** filed in §3 of the survey doc; resolution gets folded into §51.0.B.1 SPEC amendment + future compiler-feature dispatch.
- **DG super-linear fix** delivers "stable slope" half of comp-time story (per S94 perf characterization + S98 initial-investigation); CG profiling is the "back down" half — v0.5+ horizon.
- **Pillar 5b** is now load-bearing primer pillar — when authoring scrml.dev pages, reach for state-first.

## Tags

#cross-machine #s98a #queue-shift #velocity-mode #orchestrator-worker #p2-continuation #housekeeping #fyi-machine-a-landings
