---
from: spa-ss17
to: scrml (PA)
date: 2026-06-25
subject: ss17 (each-codegen) — 3 MED gaps LANDED on spa/ss17, ready for re-integration
needs: action
status: unread
---

sPA ss17 (each-codegen) ran the whole list autonomously. **All 3 items landed** on branch
`spa/ss17`. Ready for PA re-integration → main. **I did NOT advance main / did NOT push.**

## Branch
- **Branch:** `spa/ss17` · **tip SHA:** `1c4dcef6` (the single sPA landing commit) · prior commit
  `9ee717a4` (boot+scope bookkeeping).
- **Base:** `2a4bf8af` (origin/main at my boot).
- **Agent branch (per-item provenance, retained):** `worktree-agent-a8761ec73e6d4aca4`.

## Items landed (all `landed-on-branch`)
| # | item | per-item SHA (agent branch) | locus |
|---|------|------------------------------|-------|
| 1 | g-expr-event-handler-dead-in-each (Family-A Half-2) | `920fb3f7` | emit-each.ts buildEachExprHandlerBody |
| 2 | g-each-peritem-markup-value-ternary (GITI-032 follow-on) | `a336f6f9` | emit-each.ts emitEachPerItemMarkupValue |
| 3 | g-nested-each-outer-key-reuse-inner-frozen (Bug-72 / S212 residual) | `18f4c1a2` | emit-each.ts nested-each effect prelude |

All three: emit-each.ts ONLY (item 3 needed NO runtime-template.js change). + 3 new value-asserting
happy-dom browser tests + 1 coupled giti-032 unit update (S113, strengthened not weakened).

## Verification (sPA independent — R26 + adversarial S215)
- R26 reproducers (my own): arrow handler now INVOKED `(()=>...)(event)` (was dead stmt); arrow-assign
  compiles + `_scrml_reactive_set` (was **E-CODEGEN-INVALID-JS**); markup-ternary builds real DOM (was
  skip-comment). All confirmed against the landed emit-each.ts.
- New + each-regression browser tests + giti-032 unit: **35 pass / 0 fail**.
- TodoMVC: **57 / 0**. Full `bun run test`: 25068 pass / 0 real fail (the 2 transient = S209 startup
  dist-gap on `benchmarks/todomvc/dist`, 0 on re-run — env, not a regression).

## ⚠ Re-integration notes for the PA
1. **Base-staleness (clean):** main advanced 2 commits since my base 2a4bf8af (`45182694`
   W-INPUT-STATE-MARKUP-NONREACTIVE lint + `26ffea4e` S219 WRAP). I verified **NONE of my 5 files
   overlap** those commits — file-delta `spa/ss17 -- <5 files>` onto current main is conflict-free.
   The 5 files: `compiler/src/codegen/emit-each.ts` + the 3 new `compiler/tests/browser/g-*each*.test.js`
   + `compiler/tests/unit/giti-032-ternary-markup-in-match-arm.test.js`.
2. **New-lint interaction (low, please gate):** my new test fixtures were compiled under the OLD base
   (pre-`45182694`). Run the full merged-state suite at re-integration so the new
   W-INPUT-STATE-MARKUP-NONREACTIVE lint can't fire unexpectedly on them. (My tests are value-asserting,
   not warning-asserting, so risk is low — but confirm on merge.)
3. **Item 1 RESOLVES part of an open inbox finding:** flogence's `2026-06-25-1107-from-flogence-cockpit-dogfood`
   finding #1 says "the logic-wrapper `${(e)=>…}` is **dead inside a nested each**" — that IS ss17 item 1,
   now FIXED. The SEPARATE half of that finding (the each-mount `addEventListener("submit", …)` emitter
   does NOT inject `event.preventDefault()` the way the top-level registry path does) is **NOT in ss17
   scope and REMAINS open** — see residual below.

## New residuals to file (agent-surfaced + inbox-cross-ref; out of ss17 scope)
- **g-emit-lift-markup-text-interp-not-lowered** (MED) — emit-lift `emitCreateElementFromMarkup` renders a
  markup TEXT child's `${...}` LITERALLY for ALL callers (match/engine arm markup-value path too, not just
  each). ss17 item 2 worked around it INSIDE the each machinery (splits markup-text into interp children
  before emitMarkupValueExpr); the shared emit-lift gap remains for match/engine arms.
- **g-each-submit-handler-no-preventdefault** (MED, from flogence finding #1) — the each-mount submit
  handler emitter omits the `event.preventDefault()` prefix the top-level registry path injects → Enter
  reloads the page for a `<form onsubmit=fn()>` inside an `<each>`. Sibling each-emitter gap; natural ss17
  follow-on (same `renderTemplateAttrToJs` event-handler locus).
- (Awareness, pre-existing, not a bug) the each per-item factory mounts ONE root node per item — multiple
  sibling roots in an each body silently drop all but the first.

## Parked / dropped
None. Whole list dispositioned = landed.

Branch + `spa-lists/ss17.progress.md` (on the branch) carry the full record. The user will close this sPA
instance after this message.
