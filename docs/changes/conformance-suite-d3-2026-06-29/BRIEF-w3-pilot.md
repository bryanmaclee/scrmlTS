# W3 (PILOT) — the (b)-runtime conformance layer

Dispatched S231 (2026-06-29) · agent a9f6365e · isolation:worktree · scrml-js-codegen-engineer · base HEAD e7718c04. Authority: the RATIFIED W3 DD (scrml-support/docs/deep-dives/conformance-runtime-layer-design-2026-06-29.md).

[F4 startup-verification + path-discipline (pwd under .claude/worktrees/agent-, ff-merge main if stale base per S112, bun install/pretest, Bash-edit on WORKTREE_ROOT-absolute paths S99/S126, no cd into main, WIP(w3) first commit). MAPS block.]

READ: the W3 DD IN FULL (every OQ ratified except OQ1-default = deferred to the agent to resolve empirically); SCOPE §6; the existing conformance/ (W2 (a)-half, keep its 15 codes-cases green); runtime-template.js:486-513 (the shipped _scrml_perf_snapshot/globalThis._scrml_perf_* — the hook precedent); 2-3 browser/*.test.js (the working 2/3 run() prototype + lift source).

TASK — build the (b)-runtime layer + pilot it:
1. __scrml_conformance hook in runtime-template.js — conformance-mode-GATED (like __SCRML_DEBUG_PERF): snapshot():{cells,derived} (flush derived; key by scrml-SOURCE names) + settled():Promise (server-fns/timers quiesce). Zero production surface when off. Absence -> §42.5 canonical, never undefined.
2. run(source,input[])->{dom,state} in conformance/adapters/impl1-ts.ts (extend, keep compile()): compile, execute in happy-dom, drive verbs, await settled(), snapshot()->state, normalized post-run <body>->dom. HARD INVARIANT: post-run LIVE DOM, never static .html.
3. conformance/normalize.ts (OQ1): strip data-scrml-* + comment markers + runtime <script>; unwrap marker-only {span} (guarded: tag-set + zero-attrs + was-binding-anchor); canonicalize attr-order/booleans/void/whitespace; <body> only. BOTH modes (whole-tree snapshot + anchored selector assertions) on one pipeline.
4. 7-verb input driver (OQ2): click/input/change/check/uncheck/submit/key/wait:"settle" over dispatchEvent, selector-addressed. No direct state-set.
5. Extend expected.json (input/dom/state) + run.ts (run (b)-cases alongside (a)-codes).
6. Lift ~6-8 P0 twins (reactive/each/match/engine/forms) — author BOTH whole-tree + anchored dom per case to RESOLVE OQ1 (report which mode is less brittle/more impl-neutral).

GATES (S198: FULL bun run test): new (b)-cases pass; W2 15 (a)-cases still pass; 0 regressions; production-surface=zero (normal compile w/ gate off behaviorally identical; browser tests unaffected); no within-node re-baseline expected; node --check clean; do NOT touch compiler/src/ beyond the gated runtime-template.js hook.

REPORT: N/N (b)-cases pass + sample (b)-case; OQ1 RESOLUTION (whole-tree vs anchored default + brittleness/impl-neutrality evidence); the hook (lines/gate/zero-surface proof); FRICTION for the full ~61-twin lift (server-fn/channel stubbed-boundary, timers, multi-step, components); WORKTREE_PATH/FINAL_SHA/FILES_TOUCHED/deferred. Commit incrementally; do NOT land to main; git status clean before DONE.
