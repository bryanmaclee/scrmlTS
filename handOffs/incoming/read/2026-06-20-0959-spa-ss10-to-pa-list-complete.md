# sPA ss10 (e2e-render-map-test-hygiene) → PA — list complete (re-integration request)

**needs: action** · from sPA-ss10 · to PA inbox

## TL;DR
List `ss10 e2e-render-map-test-hygiene` DISPOSITIONED. **6 items LANDED on `spa/ss10`, 2 PARKED (escalates).** Branch tip `070480b7`, base `85d9e958`, **5 ahead / 0 behind origin/main** — clean linear, ready to re-integrate (`git merge --ff-only spa/ss10` or file-delta per your single-writer discipline). Worktree `../scrml-spa-ss10` (sibling, outside `.claude/worktrees/`). No design rulings needed for the 6 landed; the 2 parked need your call (registry placement + oracle-strategy fork).

## Branch to re-integrate
**`spa/ss10`** @ `070480b7`
- `d77b58e5` — item 1: e2e-render-map baseline regen (bake per-cell tier)
- `9856a741` — items 2-4: VERIFIED.md ledger sync + AC7 fixme + test-examples de-suppression
- `8d2f6a16` — bookkeeping (items 1-4)
- `c09af7f1` — items 5-6: render-map needs-server classification
- `070480b7` — list disposition (items 5-6 landed, 7-8 parked)

## LANDED (6)

### item 1 — `e2e-render-map-tier-rebaseline` @ `d77b58e5`
Regenerated `e2e-render-map-baseline.json`; bakes the S202 per-cell `tier` field (was 0/438, now 438/438: flagship 35 / probe 375 / sample 13 / stress 12 / perf 3). Also captured the regen owed since S203 delta-log [15]: **0 green→red regressions**, 2 improvements folded DOWN (`03-contact-book#populated` smell→clean, `match-pipe-alternation#empty` fails-compile→clean), 1 red→red shift (`gauntlet-r10-svelte-dashboard#empty`). NOTE: superseded by item 5-6's re-regen (which preserves tier + adds needs-server) — the FINAL baseline is at `c09af7f1`.

### items 2-4 — test-hygiene + ledger @ `9856a741`
- **item 2 `examples-verified-md-human-seed`**: synced the 5 missing rows 23-27 (the ledger's own "pending VERIFIED sync" gap) — 23-trucking-dispatch, 24-tilde-pipeline, 25-triage-board, 26-type-derived-schema, 27-type-derived-table; header 28→31; ALL unchecked (only the USER flips `[x]` — I did not mark any).
- **item 4 `todomvc-ac7-test-conflation`**: AC7 (edit mode) was a permanently-red assertion encoding a SOURCE gap (edit UI never rendered; commitEdit/cancelEdit W-DEAD-FUNCTION) as a failing test. Marked `test.fixme` — gap RECORDED (body kept), not baked as red. Flip back to `test` when source renders `<input class="edit">` on `@editingId == todo.id`.
- **item 3 `test-examples-server-suppression-antipattern`**: removed the `_scrml_fetch_`/`SyntaxError` class-suppression (bug-2's codegen class) from the SERVER_EXAMPLES filter; kept only the genuine "Not found" network artifact. Disposition = **rely on render-map** (the no-suppression classifier; the 3 server examples mount server-less CLEAN per the baseline). **RESIDUAL for you:** `examples/dist` is not built, so the puppeteer behavior of the 3 server examples under the narrowed filter is unverified here (test-examples.js is not in the gated suite); render-map says clean, but a built/server-backed run should confirm.

### items 5-6 — `g-rendermap-{needs-server,server}-classification` @ `c09af7f1`
One fix, both facets. Implements the **S203 b+c disposition** (`g-fullstack-empty-mount-throws` = harness-realism non-gap, NOT a compiler bug). New non-gap `needs-server` cell-state: a server-DEPENDENT app (compile emits serverJs OR source has a `?{}` SQL block) that throws a **null/undefined-ACCESS** at no-server mount → `needs-server` instead of compiles-but-throws. ReferenceError ("is not defined") + TDZ ("before initialization") are EXCLUDED → genuine codegen bugs STAY red even for server apps (the conjunction never masks a codegen bug). Added to RENDER_STATES + GREEN_STATES (generate-baseline.js + e2e-render-map.test.js).
- **Verify:** re-regen (438 cells/171s) flipped EXACTLY 9 cells throws→needs-server, ZERO unexpected (17-schema-migrations, 23-trucking-dispatch/app, per-route-roles/loads, protect-001-basic-auth, s20-sql/server-var-{001,multiple-001}, s19-phase3-operators/{arith-in-sql-interp,is-not-in-sql,method-call-sql} — all `#empty`). The 22 remaining throws (TDZ/ReferenceError) correctly stay red. Detection compiler-grounded (serverJs) — correctly EXCLUDES 22-multifile (serverJs=false; UserRole-from-null is a multi-file-MOUNT issue, not server-absence). `bun test compiler/tests/e2e-render-map/` 7/7 pass; full pre-commit gate clean.
- **DEFERRED → you:** mock-server SEEDING (the S203 "b" realism path — stand up a mock `scrml:store`/server so full-stack apps reach a POPULATED render). It is a larger build and NOT required for the non-gap goal (stop recording server-absence as a throw), which the classification achieves. `seed-fixtures.js` untouched. Recommend: scope as a follow-up if you want populated-render coverage for full-stack apps.

## PARKED — escalates (2)

### item 7 — `e2e-render-map-gap-ingestion` → escalate (registry-placement ruling)
Design mostly specified (DD §379-388: cell→`@gap id=render-<app>-<smell> sev=HIGH status=open` token shape, `scripts/state.ts` checker). PARKED because EXECUTION reaches OUTSIDE the harness shared-ingestion: it writes into **`docs/known-gaps.md`** (your board — drives the session HIGH/MED/LOW counts) and **`scripts/state.ts`** (deputy/flograph checker). Open decisions that are yours: (a) auto-inject render-gaps into the known-gaps board vs a SEPARATE render-gap registry; (b) dedup vs hand-triaged gaps; (c) `needs-server` must be EXCLUDED from gap-emission (it's non-gap — post-dates the DD). Also deliberately DEFERRED at L1 by the DD. Needs a one-line ruling on registry placement + board-count semantics, then it's a bounded build.

### item 8 — `e2e-render-map-L2-L3` → escalate (oracle-strategy debate-fork)
The DD itself (§267-280) names L2/L3 "the only place a real debate-fork lives." L2 (snapshot baseline gated on VERIFIED.md provenance) carries the documented rubber-stamp risk; L3 (legacy-vs-native render differential) is ranked LAST/skip — it COUPLES to the native parser, which is FEATURE-stale (S162, and corroborated by my baseline: native parity is not render-ready). tier high, post-MVP. This is PA/dPA oracle-strategy territory, not sPA execution. Recommend a DD/debate framing (L2-with-provenance vs skip-L3-rely-on-within-node-canary).

## Operational note (corroborates ss9's flag)
The non-blocking **post-commit** hook runs the FULL `compiler/tests/` incl. browser; `browser-conditionals.test.js` fails in a FRESH worktree purely because gitignored `samples/compilation-tests/dist/` is not checked out by `git worktree add`. NOT a regression (the blocking pre-commit gate excludes browser + passed clean on every commit). Same worktree-recipe gap ss9 flagged — recommend `spa-scrml.md` §Worktree symlink that dir alongside node_modules.

## End-state
All 8 items dispositioned — **6 landed, 2 parked**. Branch `spa/ss10` @ `070480b7`, clean, 5 ahead / 0 behind. Per `spa-scrml.md` §Lifecycle the PA owns re-integration + all durable bookkeeping (known-gaps marks, master-list, changelog, push, worktree cleanup). Instance can be closed.
