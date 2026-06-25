# scrml — Session 219 (OPEN)

**Date:** 2026-06-24. **Profile:** A — FULL ("read pa.md and start session"). **Boot:** digest `current`. **Deputy:** LIVE (tick T260, on `deputy-maint`).

> **Thinned (S205).** Board/counts → `bun scripts/state.ts` + `handOffs/digest.md`. Fine-grained stream → `handOffs/delta-log.md`. This carries the IRREDUCIBLE + open threads.

## Board @ boot
**HIGH 0 · MED 15 · LOW 15 · Nom 8** · v0.7.0 · suite 25050/0/213 (S218 wrap). Boot integration: FF'd `deputy-maint` ticks 259/260 (S218-wrap maps-batch + digest lag-fix) → main `50aa6728`, **2 ahead of origin (unpushed deputy maintenance)**, deputy-maint ^main == 0, maps watermark current to S218-wrap.

## ⚠️ Boot anomaly — 5 uncommitted working-tree files in main (S218 residue, surfaced to user)
S218 pushed code (6 commits) but left additive bookkeeping uncommitted in main's working tree:
- `handOffs/dpa-queue.md` (M) — the dPA's S218 banking (dpa-010 source-of-truth debate COMPLETE/ADVISORY + dpa-011).
- `docs/graph/graph.json` + `graph.mmd` (new) — `scripts/flograph.ts` projection output; **never committed** (new dir; deputy-surface per the write-partition).
- 2 inbox→read moves (giti `conditional-markup-in-match-arm`, 6nz `each-empty-fallback-leak`) — S218 processed these.
Disposition PENDING user direction (see open Q1).

## ⏸️ OPEN — S219 (priority order)
0. **Disposition of the 5 S218-residue files** (Q1) + **push the 2 unpushed deputy commits** (needs auth).
1. **6nz inbox (READ this boot) — 3 NEW codegen findings to triage** (`handOffs/incoming/2026-06-23-1917-6nz-...idiomatic-rewrite-findings.md`):
   - **B1** `<pre>`/`<code>` raw-content (§4.17) silently drops `${...}` → ships literal source text; broke 6nz p4/p6. 6nz Q: is §4.17 enforcement newly tightened? lint is `info` for a silent-render-break — promote to `warning`?
   - **B2** arrow-form `<engine>` (`.A => .B`) emits NO `_scrml_reactive_set` init → governed cell `undefined` at mount, `<match on=@var>` renders empty. State-child form (`<A rule=.B/>`) DOES emit init. Context-wrinkle: 6nz p1/p5/p7 arrow+`name=` DO emit init; minimal `name=PM` repro does NOT.
   - **B3** bare `.Variant` in ternary value position (`@x = cond ? .B : .A`) → emits string literals `? "B" : "A"` (representation leak; harmless under string-repr enums). Direct `@x=.B` + if/else emit correctly. **(This is the SAME shape 6nz reported, and matches the carried S218 gap `g-each-peritem-markup-value-ternary` family + the bare-variant-in-ternary class.)**
   - PART A (FYI/closure): gaps #2/#3/#4/#5 all NOT-REPRODUCED on current main; 6nz retired the stale workaround comments. No action.
2. **4 NEW S218 deferred gaps** (filed): `g-each-peritem-markup-value-ternary` (MED) · `g-nested-interp-in-markup-value-literal` (LOW) · `g-nested-each-outer-key-reuse-inner-frozen` (MED, Bug-72) · `g-foreign-inline-crossing-shadow` (LOW → future E-FOREIGN-006).
3. **dpa-003 follow-ons:** standalone/library-mode-db `?{}` (OQ-F1) · dpa-009 arbitrary-lang inline · dpa-006 build-story×`_{}` · dpa-008 `_{}` capability-gating.
4. **escalation-2 typer-scope** — `g-sse-route-object-typer-scope` (MED; blocks resumable-SSE cursor).
5. **Half-2 convergence** (`<each>` bind: + buildHandlerExpr dedup, Family-A) · g-enum-toenum-not-lowered-server-side (MED) · giti three-codegen library-mode cluster.
6. **Multi-user PA MVP refinements:** user-voice-scrml→-bryan rename · methodology-memory-lift residual · full pa-scrml→pa-base+overlay migration (coordinate with pa-global.md) · `$SCRML_HOME`. **User's step: add Ryan (rjantz3) as scrml-support GitHub collaborator.**
7. **S215 random-sample-10× audit** — re-run normally at S219+ (S218 deferred; all 3 S218 landings had per-fix adversarial passes).

## Open questions to surface immediately
- **Q1 — the 5 S218-residue files:** commit the inbox-moves + dpa-queue as S218-residue bookkeeping (main-side PA/dPA surface)? The `docs/graph/*` flograph output is deputy-surface — route to deputy or commit to main? (flograph never been committed before.)
- **Q2 — push:** 2 unpushed deputy commits on local main (`50aa6728`, 2 ahead of origin). Push now or hold?
- **Q3 — S219 priority:** the 6nz B1/B2/B3 triage (concrete adopter findings) is the highest-signal ready work. B2 (arrow-engine no-init) is the most concerning (silent empty render).

## pa.md directives in force
R1–R5 · `---` · Profile A · digest-first · S88/S99/S126 path-discipline · S136 BRIEF · S138 R26 (fwd+reverse) · S147 coherence · S199/S205 deputy + merge-before-push · S119 explicit-pathspec · S215 adversarial-verify + random-sample-10× · S217 per-user profile · S218 BOOT GATE + pa-global.md relocation · wrap 8-step.

## Tags
#session-219 #open #boot-complete #6nz-b1-b2-b3-triage #s218-residue-files #deputy-ff-integrated
