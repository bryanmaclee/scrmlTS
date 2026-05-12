# Happy-dom runtime perf regression — S87 diagnostic (2026-05-12)

**Status:** read-only diagnostic; no code changes. **Recommends:** separate dispatch for bisect-and-profile investigation.

**Surfaced by:** Wave 3 D3b benchmarks re-dispatch (S87). Agent flagged: "scrml runtime regression in happy-dom vs 2026-04-05 baseline: partial-update ratio vs React dropped 28.7x → 9.2x. Likely v0.2.4 → v0.2.6 codegen surface growth (Wave 2 / Approach A). Worth a separate perf investigation."

**This diagnostic correction:** the regression window is much WIDER than v0.2.4 → v0.2.6. The two compared measurements are:

| Measurement | Date | HEAD era | Bun | happy-dom |
|---|---|---|---|---|
| Baseline | 2026-04-05 | pre-v0.1.x split-from-scrml8 era | (older) | (older) |
| Current | 2026-05-12 | v0.2.6+ HEAD `149c979` (post Wave 2 + Approach A spec anchor) | 1.3.13 | (current) |

The Apr 5 baseline predates the v0.1.x → v0.2.x cut, the entire A1b/A1c codegen wave series (~24 sub-steps), and several runtime hot-path patches. **1,402 commits separate the two measurements.** D3b's "v0.2.4 → v0.2.6" framing in the report is approximate; the actual gap is broader.

## §1 The numbers (verbatim from `benchmarks/RESULTS.md`)

### scrml partial-update — absolute median (ms, lower is better)

| Source | scrml | React | Vue | Svelte |
|---|---|---|---|---|
| 2026-04-05 happy-dom (v0.1.x baseline) | **0.7** | 20.1 | 9.4 | 2.5 |
| 2026-05-12 happy-dom (v0.2.6+ HEAD) | **4.08** | 37.7 | 19.4 | 4.16 |
| **Δ** | **5.83×** slower | 1.88× slower | 2.06× slower | 1.66× slower |

### scrml partial-update — ratio vs React (higher = scrml advantage)

| Source | Ratio (React ÷ scrml) |
|---|---|
| 2026-04-05 | 20.1 / 0.7 = **28.7× faster than React** |
| 2026-05-12 | 37.7 / 4.08 = **9.2× faster than React** |

**Net interpretation:** scrml still wins partial-update by 9.2× in current measurement (no competitive loss). But scrml regressed MORE absolutely (5.8×) than React did (1.9×). Vue regressed 2.1×; Svelte 1.7×. So scrml is the WORST-regressed in the field.

Note: this regression DOES NOT change scrml's competitive ranking. Per current `RESULTS.md` line 66: *"scrml beats React in 9/11; Svelte in 6/11; Vue in 5/11"* — across-the-board domination intact. The regression is an absolute-time efficiency issue, not a market-position issue.

## §2 Confounders to rule out before code-blaming

The 5-week window contains MANY non-code changes. Each compounds with code changes; the right investigation methodology accounts for them.

### §2.1 Bun version

`package.json` currently declares `engines.bun: ">=1.3.13"`. Older measurements may have run on a substantially earlier Bun. happy-dom integrates with Bun's `BUN_DEBUG_QUIET_LOGS` + bun:test runner. Different Bun versions have different JS engine perf characteristics (V8 vs Bun's JavaScriptCore-derived engine — Bun uses JSC).

**Action:** `git log --all --oneline -- package.json` confirms several `engines.bun:` bumps in the window. Cannot pin the exact Apr 5 Bun version without checking that machine's installed runtime.

### §2.2 happy-dom version

happy-dom's bench impact is non-trivial. From `benchmarks/RESULTS.md` line 41-43:

> Svelte/Vue appeared faster in happy-dom because their async rendering wasn't being flushed
> happy-dom's `cloneNode(true)` and `innerHTML` are slower than `createElement` (opposite of real browsers)
> Chrome is 1.2-2x faster than happy-dom at DOM creation

If happy-dom's version changed in the window (likely — it's a moving target), the DOM mutation costs underlying every benchmark changed.

### §2.3 Hardware / environment

Same physical machine? CPU frequency, thermal state, background load — all affect microbenchmarks. happy-dom is single-threaded JS; CPU IPC differences move every number.

### §2.4 Methodology

The benchmark's IIFE-eval pattern (pre-D3b fix) was BROKEN against v0.2.6+ — internal `let`-scoped runtime symbols unreachable from the client.js portion. D3a observed this; D3b fixed via indirect-eval. **Did the Apr 5 numbers measure scrml CORRECTLY, or were they running degraded code paths?** If the IIFE-export pattern was already partial in v0.1.x but not catastrophic, the older numbers may overstate scrml's perf (some hot symbols may have been missing in the IIFE export but still resolved in the global window — masking later regression).

**This is the single most important confounder to verify.** If the pre-fix bench-scrml.js was already incomplete, the regression is partly methodological — what looks like a 5.8× slowdown could be 3× slowdown + 1.9× methodology correction.

## §3 Codegen surface growth in the window — likely culprits

Major codegen + runtime changes between Apr 5 and HEAD that COULD impact partial-update specifically:

### §3.1 Hot path (runtime-template + reactive primitives)

| Commit | Description | Hot-path impact hypothesis |
|---|---|---|
| `686ffcd` | `wrap effect dispatch in try/catch in _scrml_trigger` | **HIGH**. `_scrml_trigger` is called per reactive set. try/catch adds non-trivial overhead per dispatch in JSC (V8 too, but JSC has worse try/catch perf historically). Partial-update exercises many small sets → this overhead compounds. |
| `1e6da95` | `trigger effects for dirtied derived nodes on reactive set` | **HIGH**. Adds derived-node-dirty-tracking per set. Even when no derived cells exist in the running app, the dispatch path still checks. Partial-update is set-heavy. |
| `c0cce01` | `_scrml_reactive_get bridges to derived reactive cache` | **MEDIUM**. Adds cache-lookup branch on every get. Partial-update read-modify-write pattern triggers many gets. |
| `0d5a144` | C1 — shape-aware cell emitter (A1c Wave 1) | **HIGH** (architectural). Fundamental change to how cells are emitted. New shape discrimination (`plain` / `bindable` / `markup-typed` / `compound-parent`) means cell-creation cost grew; per-cell dispatch table introduced. |
| `90f8d16` | if-show-phase2a: runtime helpers + isMountToggle flag | **LOW for TodoMVC partial-update** (no if-mount toggles in the hot path) |
| `75f37cb` | route lifted elements to DOM placeholder spans, fix state display | **MEDIUM**. lift placeholder span pattern adds an extra DOM node per lift point. Partial-update with for/lift over the todos array — every list item is a lift. |
| `1e6da95` (counted) + several reconciler bugs | reconciler null-node safety, etc. | **MEDIUM**. `_scrml_reconcile_list` is the partial-update hot loop. |

### §3.2 Compile-time emission growth (per-app overhead)

For apps that DON'T use a feature, codegen tree-shakes it out. But two patterns leak overhead even when unused:

- **Validator runtime catalog** (C6, C7) — always-on if any cell has any validator. TodoMVC has no `req`/`length`/etc. so this should tree-shake. **Verify** the tree-shake actually holds.
- **Validity-surface synthesis** (C8) — only emits for compound parents with validators. TodoMVC has no compound parents (`@todos`, `@newTodoText`, etc. are top-level Variant-A cells, not compound). Should tree-shake.
- **Refinement-type runtime** (C16) — only emits if `let x: T(P) =` predicated decls exist. TodoMVC has none. Should tree-shake.
- **Engine state-child body render** (A10) — only emits for `<engine>` decls. TodoMVC has none. Should tree-shake.

**Action:** diff the v0.1.x-era emitted `todomvc/dist/app.client.js` vs current. Specifically:
- bytes (gzipped + raw)
- count of runtime imports
- count of `_scrml_*` calls per ms partial-update hot path
- presence of dead-but-emitted code from un-tree-shaken features

### §3.3 New-feature codegen that ALWAYS emits

Some changes added codegen that fires on every app regardless of feature use:

- **Cell dispatch table** (C1) — every state-decl now emits a discriminator. Compile-time and runtime.
- **Cell-shape-aware `_scrml_default_set`** (C5) — emits `default=` integration even for cells without explicit `default=` (uses inferred default).
- **`_scrml_reactive_set` write-guard** for engine cells (S83 bug 6) — `event-handler engine writes thread through write-guard` — adds guard call per write (even when not an engine cell).
- **Auto-`!`-wrap CPS stubs** (A9 ext 4, `dc98313`) — server-fn callsites now wrap with auto-fail-handler stub. TodoMVC has no server fns, should tree-shake. **Verify.**

## §4 Suggested investigation methodology

**This is a separate dispatch, NOT in-line PA work.** Estimate: 6-12h focused.

### §4.1 Bisect

1. Pin Bun + happy-dom versions to current. Re-run benchmark in baseline state — confirm reproducible.
2. `git bisect start HEAD <april-5-era-commit>` against a benchmark threshold (e.g., partial-update > 2.0ms = "bad").
3. Bisect identifies the FIRST commit that crosses the threshold. That's the load-bearing regression point.
4. Likely candidate from §3 hypothesis list, but bisect is empirical.

### §4.2 Profile

For the bisected culprit commit:

1. Use `bun --inspect-brk bench-scrml.js` to drop into JSC profiler.
2. Profile partial-update hot path.
3. Identify the per-set / per-get / per-effect-dispatch cost delta vs baseline.
4. Quantify: if try/catch adds 0.3ms per dispatch × N dispatches per partial-update, total impact is `0.3 × N` ms.

### §4.3 Codegen diff

Diff the emitted `app.client.js` between baseline and HEAD:

```bash
git stash  # if dirty
git checkout <baseline-commit>
bun scrml compile benchmarks/todomvc/app.scrml -o /tmp/todomvc-baseline/
git checkout HEAD
bun scrml compile benchmarks/todomvc/app.scrml -o /tmp/todomvc-head/
diff -u /tmp/todomvc-baseline/app.client.js /tmp/todomvc-head/app.client.js | wc -l
```

The diff size + content tells you which codegen growth landed in TodoMVC's specific shape.

### §4.4 Validate tree-shake

For each "should-tree-shake-when-unused" feature in §3.2:
- Confirm absence of validator-catalog symbols in TodoMVC's emitted output.
- Confirm absence of validity-surface synth-cell symbols.
- Confirm absence of refinement-type runtime helpers.
- Confirm absence of engine state-child body dispatcher.

Any presence = tree-shake bug = perf regression contributor.

## §5 Re-trigger conditions / disposition

This regression DOES NOT change scrml's competitive position. scrml still wins partial-update vs React/Vue/Svelte. **It is NOT a v0.3.0 ship-blocker.**

It IS worth investigating because:
- 5.8× absolute slowdown in 5 weeks is structurally concerning. If it continues at the same rate, scrml will lose its perf advantage in another 2-3 release windows.
- The Apr 5 baseline was scrml-favorable for marketing claims (README:429 "Partial update is 8x faster than React" — sourced from Chrome 2026-04-13 row, NOT happy-dom). If the absolute regression also lands in Chrome (next D3b-shaped re-measurement), the marketing claim becomes potentially overstated.
- The `try/catch` and `derived-trigger` hypotheses point to fixes that are cheap to land (replace try/catch with explicit isError flag; gate derived-dirty-tracking on derived-cell-presence flag).

## §6 Recommended dispatch shape

**Title:** "Runtime perf regression — bisect + fix the slowest landings"
**Estimate:** 6-12h walltime
**Type:** T2 (compiler/runtime source changes; runtime-template.js + emit-*.ts)
**Sequencing:** AFTER v0.3.0 cut (Wave 3 fixture-sweep + Wave 4 adopter content). Not a v0.3.0 blocker.
**Scope:**
- §4.1 bisect to identify primary culprit commit
- §4.2 profile to quantify the per-operation cost
- §4.3 codegen diff to confirm scope
- §4.4 tree-shake validation
- Fix the primary culprit (if mechanical — e.g., gate try/catch on debug flag; condition derived-trigger on presence)
- Re-measure; aim for < 2.0ms partial-update median (within 3× of Apr 5 baseline)

**NOT in scope:**
- Architectural reactive-runtime rewrite (out of scope; only mechanical fixes)
- Chrome benchmark rerun (separate dispatch per D3b finding)
- React/Vue/Svelte regression analysis (out of scope; their regression is happy-dom/Bun confound, not ours to fix)

## §7 Open questions for PA / user

1. **Should this be a v0.3.0 blocker?** PA lean: NO. Competitive position intact. But surface to user for ratification.
2. **Should the Apr 5 baseline numbers be RETIRED from `RESULTS.md`?** They're historical artifacts now from a different methodology + different runtime versions. Per pa.md Rule 4 (spec/current truth wins over derivative docs), the older row should probably get a "MEASUREMENT METHODOLOGY DIFFERS" footnote.
3. **Should marketing claims at README:429 / scrml.dev be retracted or restated** until Chrome benchmark rerun confirms / refutes the regression? PA lean: keep existing `Stale` callout at README:391-404; do NOT proactively edit. (Rule 1 — no marketing work unless Bryan brings it up.) Surface to user.

---

**Cross-refs:**
- `benchmarks/RESULTS.md` — measurements
- `docs/changes/wave-3-d3/progress.md` — D3b agent's progress log (surfaced this finding)
- `compiler/src/codegen/` — codegen emission territory
- `compiler/src/runtime-template.js` + `compiler/src/codegen/runtime-chunks.ts` — runtime hot path
- pa.md Rule 1 — no marketing work unless raised

**Tags:** #s87 #perf-regression #happy-dom #runtime-hot-path #read-only-diagnostic #v0.3.0-not-blocking #bisect-recommended
