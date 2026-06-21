# scrml — Session 212 (CLOSE)

**Date:** 2026-06-21. **Profile:** A — FULL ("read pa.md and start session" → default A). **Boot:** cold (fresh PA). Rotated S211 hand-off → `handOffs/hand-off-216.md`.

> **Thinned (S205).** Mechanical state → `bun scripts/state.ts` + `handOffs/digest.md` · `handOffs/delta-log.md` [S212 1-15] · `handOffs/deputy-state.md`. Irreducible + open below.

## Board / sync (live @ close)
- **HEAD `8ddc8448`** (+ wrap commit + deputy merge land on push). origin **0/1** pre-wrap (the ruling commit). deputy-maint `^main == 1` (final tick — merge at wrap-push, S205 gate). Board **HIGH 0 · MED 9 · LOW 14 · Nominal 8** @ **v0.7.0**. Tests: full **24837/0/210**, pre-commit subset 17604/0/68.
- **DEPUTY ACTIVE** all session (ticks 150-163+); maps refreshed mid-session to `a9c2108f`; **wrap dispatched project-mapper (agent a1f4cdb9) for a fresh maps refresh to HEAD `8ddc8448`** — PA commits maps explicit-pathspec at wrap.

## ✅ DONE this session — a big flogence-dogfood + A2-W4 + ss4 arc (all pushed)
**5 flogence dogfood bugs (browser-render surface — flogence's first real browser pass), triaged→fixed→landed→pushed:**
1. **g-tailwind-class-scan-skips-markup-block-bodies** (HIGH, `d0339df0`) — collector now descends `match-block`/`each-block` `bodyChildren`. BROADER than reported (each-block too).
2. **g-nested-each-no-own-subscription** (HIGH, `d8bbded7`) — RED-HERRING corrected: root was NESTING, not hidden/multi-consumer. Per-item `_scrml_effect` (Tier-1 + Tier-0).
3. **g-lift-concurrent-transitive-exclusion-tdz** (HIGH, `65f6b358`) — two-layer: scheduling.ts transitive-exclusion closure + body-dg-builder.ts lambda-body free-read (the residual TDZ — `.map` arrow captures were invisible reads).
4. **g-match-arm-drops-reactive-attr-class-effects** (HIGH, `93e02b35`) — match-arm-render skipped `_scrml_effect` for class:/attr-tpl bindings; arm-tagged bindings + per-mount effect in emitArmWireFunction. `<each>` block-form does NOT share it (verified). Landed via **3-way apply** onto the sibling bare-ref fix (disjoint regions — the parallel-dispatch clobber hazard, caught + auto-merged).
5. **g-bare-ref-event-handler-emits-literal-not-wired** (MED, `3d311fc9`) — §5.2.2 conformance: `on*=handler` bare-ref now wires (was literal `onclick="bump"` dead handler).

**A2 W4 — external-`<api>` codegen (`914029dc`):** crash-salvage from S211 applied PA-direct off current main (zero drift); per-endpoint typed `fetch(base+path)` callable + `<request api= args=>` reactive surface + ENUM-ResponseT parseVariant decode; client-only; §60 banner STAYS Nominal (W5 flips). **(b) honesty lint (user ruling):** non-variant ResponseT was raw-passed SILENTLY (parseVariant is variant-only) → NEW typer info-lint **W-API-RESPONSE-NOT-VARIANT** + §34 row + §60.5 variant-vs-non-variant amendment + §60.9 wired (the must-not-lie guard §60.3).

**sPA ss4 re-integrated (`09f30e00`):** item-2 (native-lexer "residuals") REFRAMED — a test-COMPARATOR bug, no native-parser source (12-file bench now strict byte-identical); item-3 g-block-analysis-fn-span-overshoot RESOLVED (4 fn-decl spanOf peek()→peek(-1)). **FINDING B filed** g-decl-span-overshoot-systemic (LOW deferred — ~40 non-fn decl sites share the overshoot; gated on a real consumer). item-1 RULED (below).

## ⚠️ READY / OPEN — for next session
- **A2 W5** (closes the external-API wave): tests + worked `examples/NN-external-api` + B-docs BYOB guide (incl. the SSR-of-external-data §60.6 limit) + **flip §60 Nominal→Implemented**. The W4 functional surface is complete + verified; W5 proves end-to-end then flips the banner.
- **g-block-match-in-lift `(b)` fix — RULED, READY (not fired), LOW.** User ruled (b): block-`<match>` inside `${for…lift}` → emit a NEW targeted §34 Error **E-MATCH-BLOCK-IN-LIFT** ("use `<each>`") REPLACING the misleading E-COMPONENT-035/-020 cascade; option (a) support-the-form REJECTED. Fire site: the lift-body re-parse (`liftBareDeclarations` / block-splitter lift-context). §34 row WITH impl (Rule 4). Small dispatch.
- **Next ss to fire = `ss4` is DONE; `ss12` (selfhost-mirror-parity) is the only healthy unfired list left (~55%, LOW priority post-v1.0).** All other Bucket-A lists drained/retired/thin (INDEX). ss11 carried escalations are PA-track (compiler-bug batch needs R26; 9 sample-drops user-auth-gated/destructive; 78 gauntlet-s19 drift; dev.to flag).
- **g-decl-span-overshoot-systemic** (LOW deferred) — the ~40-site ast-builder span pass; gate on a real non-fn-decl span consumer (none today).

## OPEN — carried from prior sessions (unchanged)
- bug-1 sub-arc 2 (safelist/@apply) §26.5-deferred · stdlib Phase 3 §40.4 ruling · flogence raw-route (dpa-002 or fold A2) · external-backend DEBATE (dpa verdict = run it) · g-tier1-ssr-prerender architecture · giti/6nz pa.md modernization LOCAL+UNPUSHED in siblings · 6nz AA (match-value-discard, no ss-cluster).

## Anomalies recovered (reasoning, not state)
- **Parallel-dispatch clobber hazard (Bug A + Bug B both touched 3 codegen files).** Bug B's agent self-flagged it; landed Bug B via **3-way apply** (Bug A's hunks already in main; disjoint line regions auto-merged) NOT wholesale file-delta — which would have silently overwritten Bug A. The `feedback_file_delta_vs_cherry_pick` / `feedback_parallel_dispatch_shared_test_baseline` precedent, handled cleanly.
- **Two fix-agents got DIFFERENT bases** (Bug A off origin `8dba968e`; Bug B off local `09cc6b21`) despite same-message dispatch — S112 worktree-base variability. Per-file clobber checks at each landing absorbed it.
- **Two agents used `--no-verify` on intermediate WIP commits** (self-flagged). MOOT — landed via file-delta (their commits never entered main); every PA-authored landing ran the full gate. Noted for the record, no action.
- **W4 finish was PA-direct** (not re-dispatch): zero drift + clean 3-way apply made the salvage trivial; verified complete-vs-incomplete empirically (R26) before committing — the struct-response §60.5 gap surfaced there → the (b) ruling.

## pa.md directives in force
R1–R5 · `---` delimiter · Profile A · digest-first · S88 isolation · S99/S126 path-discipline · S112 worktree-base-staleness (`git merge origin/main` startup) · S136 BRIEF.md · S138 R26 · S147 coherence · S164 bg-commit-race · S205 merge-before-push (deputy gate) · S119 explicit-pathspec · wrap 8-step (6b worktree-sweep done · 6c maps via project-mapper · 6d state-regen) · S206 flogence + co-location · S208 sPA role · S209 §2.1 deref-vs-mark.

## Tags
#session-212 #close #profile-a #flogence-5-bugs-fixed #a2-w4-done #ss4-integrated #board-high-0 #w5-ready #block-match-in-lift-ruled-b
