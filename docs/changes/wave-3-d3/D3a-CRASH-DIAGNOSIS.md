---
title: "Wave 3 D3 (benchmarks refresh) — first dispatch crashed mid-investigation; bench-scrml.js IIFE-eval pattern surfaced as broken against v0.2.6+"
date: 2026-05-12
session: S86
status: finding + re-dispatch input
dispatch-id: agent-afa1b84a0999559d9
worktree: .claude/worktrees/agent-afa1b84a0999559d9 (retained for forensics)
tags: [wave-3, d3, benchmarks, crash-recovery, iife-eval-broken, harness-regression, s86]
---

# Wave 3 D3 first-attempt crash — diagnosis

The first dispatch of Wave 3 D3 (Phase B benchmarks refresh) crashed mid-investigation. The agent ended its turn unexpectedly (reported "There's an error. Let me wait a bit longer for monitor and see if it actually completed." as its terminal output — not a real final report). Worktree retained for forensics per pa.md S83 commit-discipline pre-cleanup gate.

## Pre-cleanup gate held

PA's `git -C <worktree-path> status --short` returned non-empty (2 files modified-but-uncommitted). Per pa.md S83 standing rule: **STOP. Do NOT delete.** This rule held — zero work-lost; salvage diagnosed instead of deletion-cascade.

Agent commit-discipline two-sided rule was VIOLATED — the agent modified files mid-investigation, never committed (zero commits on branch), then crashed. The PA-side gate caught it. Reinforces the rule's load-bearing nature.

## What the agent accomplished before crashing

Per `docs/changes/wave-3-d3/progress-D3a-pre-crash.md` (~21 lines):

1. Worktree setup + startup verification — all green at baseline 11,511 pass / 96 skip / 1 todo / 0 fail / 557 files (worktree based on `23e6265` pre-Wave-2; not the dispatch's expected 11,580 / 562 — agent treated actual baseline as authoritative).
2. Re-installed comparator deps in `benchmarks/todomvc-react/`, `-svelte/`, `-vue/` (worktrees don't auto-inherit node_modules).
3. Verified pinned versions: React 19.2.4 + react-dom; Svelte 5.55.1; Vue 3.5.32; all on Vite 6.4.1.
4. Rebuilt scrml TodoMVC dist: `bun run compile benchmarks/todomvc/` — 197.8ms (single warm run).
5. First-pass build times (single-run, NOT median): React 956ms, Svelte 719ms, Vue 735ms.

Then the agent attempted to RUN the runtime benchmark via `bench-scrml.js` — and surfaced a real harness regression.

## The surfaced finding (load-bearing)

`benchmarks/bench-scrml.js` lines 82-96 (pre-crash) used an IIFE-eval pattern:

```js
eval(`(function() {
  ${runtimeJs}
  window._scrml_reactive_get = _scrml_reactive_get;
  window._scrml_reactive_set = _scrml_reactive_set;
  window._scrml_reactive_subscribe = _scrml_reactive_subscribe;
  window._scrml_lift = _scrml_lift;
  window._scrml_reconcile_list = _scrml_reconcile_list;
  window._scrml_deep_reactive = _scrml_deep_reactive;
  window._scrml_effect = _scrml_effect;
  window._scrml_effect_static = typeof _scrml_effect_static !== "undefined" ? _scrml_effect_static : _scrml_effect;
  window._scrml_deep_set = typeof _scrml_deep_set !== "undefined" ? _scrml_deep_set : undefined;
  window._scrml_register_cleanup = typeof _scrml_register_cleanup !== "undefined" ? _scrml_register_cleanup : function(){};
})();`);

eval(`(function() { ${clientJs} })();`);
```

This pattern wraps the runtime + client in IIFEs to scope them, then exports specific symbols to `window.*`. Per the IIFE's lexical-scope contract, this works only when the explicit symbol-list-on-window is COMPLETE.

**The agent diagnosed that this pattern is broken against current HEAD.** Internal runtime symbols declared via `let` inside the new (Wave 2 + BS-layer era) codegen output are NOT reachable from the client IIFE — the explicit window-export list at lines 84-94 doesn't cover all the symbols the v0.2.6+ codegen relies on.

## The agent's attempted fix (incomplete; in worktree)

The agent refactored to **indirect-eval** (`(0, eval)`) which forces global-scope evaluation:

```js
// Combined runtime+client script; evaluate at top level so that the runtime's
// internal `let`-declared shared vars (e.g. `_scrml_lift_target`) are reachable
// by the client script — matching how the browser loads both as top-level scripts.
const combinedScript = runtimeJs + "\n;\n" + clientJs;

function loadApp() {
  document.body.innerHTML = cleanHtml;

  // (0, eval) forces indirect/global eval — the runtime's `let` vars land in the
  // outer script scope, which `eval`'d client code in the same indirect-eval
  // scope can read. We use a single combined eval to share that scope.
  (0, eval)(combinedScript);

  document.dispatchEvent(new Event("DOMContentLoaded", { bubbles: true }));
}
```

This is mechanically correct in theory — `(0, eval)(...)` is the canonical JS pattern for forcing indirect (global-scope) eval, exactly matching how a browser would load both `<script>` blocks at top-level. The runtime's internal `let`-scoped vars (e.g. `_scrml_lift_target`) become reachable by the subsequent client script in the same indirect-eval call.

**But the agent never got to verify the fix works.** The benchmark run after the refactor either failed or never executed; `benchmarks/runtime-results.json` was overwritten with empty scrml results (metadata + timestamp only; scrml benchmark section deleted, comparator sections also missing).

## What's NOT salvageable

1. **The partial bench-scrml.js refactor** — uncompiled assertion that `(0, eval)` matches browser semantics; not verified against actual benchmark execution.
2. **The overwritten runtime-results.json** — empty scrml section; no benchmark data captured.

## What IS salvageable for re-dispatch

1. **The agent's diagnostic finding** — IIFE-eval pattern is broken against current HEAD. Next agent has the starting hypothesis.
2. **The `(0, eval)` refactor approach** — even if incomplete, it's a reasonable mechanical-correctness-shaped attempt. Next agent can verify or reject.
3. **The comparator re-install + pinned versions** — already done in the crashed worktree. Next agent can skip those.
4. **First-pass build times** — preserved in `progress-D3a-pre-crash.md`. Not the 10-run medians needed for canonical RESULTS.md but useful first signal.

## Re-dispatch shape (Task #14)

Re-dispatch as Wave 3 D3b. Include the D3a findings as starting context. Fresh worktree (the crashed one is preserved for forensics, not for re-use). Background.

Brief should:
- Cite this diagnosis doc as starting input.
- Try the `(0, eval)` indirect-eval refactor + verify it works against current HEAD via actual benchmark run.
- If indirect-eval fails too, do deeper investigation — possibly the issue is something other than IIFE-vs-direct-eval (e.g., the codegen output structure itself changed and the harness's runtime-injection model is fundamentally mismatched).
- Surface a structured diagnosis if the refactor still doesn't work — DON'T overwrite runtime-results.json with partial data. Either commit successful benchmark output OR leave the file alone.
- Walltime band: 4-10h.

## Lessons for future dispatch brief authoring

1. **Mandate intermediate-progress commits.** D3a never committed despite per-pa.md commit-discipline rule. Future dispatch briefs should bold-emphasize: "Per major sub-step (e.g., after each benchmark scenario), commit your progress + any code modifications EVEN IF MID-INVESTIGATION." The current pa.md brief language permits batching to logical sub-buckets; for diagnostic-shaped work, even mid-investigation should land as a WIP commit.

2. **Distinguish harness-modification from data-modification.** D3a treated bench-scrml.js refactor and runtime-results.json overwrite as a single atomic unit. They're not — the refactor is a harness fix; the json overwrite is a data update. Future briefs should require the harness fix to land FIRST (verified by a successful benchmark run on a smoke-fixture), THEN the data update.

3. **Pre-cleanup gate is load-bearing.** PA pre-cleanup gate (`git -C <worktree> status --short` non-empty → STOP) is what saved this dispatch from work-lost. Continue applying universally.

## File paths referenced

- Crashed worktree: `.claude/worktrees/agent-afa1b84a0999559d9/` (retained for forensics; cleaned at wrap)
- Crashed worktree progress (preserved): `docs/changes/wave-3-d3/progress-D3a-pre-crash.md`
- Original benchmark harness: `benchmarks/bench-scrml.js`
- Comparator apps: `benchmarks/todomvc-{react,svelte,vue}/`
- RESULTS canonical: `benchmarks/RESULTS.md` (NOT touched by D3a; still 4-weeks-stale v0.1.x baseline)
- Wave 3 D3 SCOPING dive: `scrml-support/docs/deep-dives/wave-3-playwright-benchmarks-scoping-2026-05-12.md`

## Tags

#wave-3-d3 #benchmarks-refresh #crash-recovery #iife-eval-broken-against-v0.2.6 #indirect-eval-canonical-fix #harness-regression #d3a-crashed #d3b-pending #pa-pre-cleanup-gate-held #pa-md-s83-rule-validated
