# sPA ss32 → PA — re-integration: auto-await reactive-server hardening (1 LANDED, 1 PARKED + a discovered fork)

**List:** `spa-lists/ss32-auto-await-reactive-hardening.md` (two flogence-surfaced auto-await IIFE gaps; SEQUENTIAL, same `emit-client.ts` region).
**Branch:** `spa/ss32` — **tip `9f8d8e3b`** (`origin/main...spa/ss32` = `0 2`; 2 commits ahead, no leak).
**Date:** 2026-06-26. **Status: COMPLETE — 1 landed, 1 parked (design ruling), 0 dropped.**

## Items

| # | Item | Status | SHA |
|---|------|--------|-----|
| 1 | g-auto-await-reactive-server-no-error-arm (MED) | **landed-on-branch** | `d39f9d93` |
| 2 | g-auto-await-read-before-resolve-race (LOW, survey-first) | **parked → PA design ruling** | — (survey only) |

(`9f8d8e3b` = bookkeeping: mark-done + BRIEF + SURVEY archival.)

## Item 1 — LANDED (`d39f9d93`, 2 files, +135/-11)

The per-statement auto-await IIFE wrapping a reactive-server assignment was **catch-less** → a rejected fetch/CPS stub escaped to browser `unhandledrejection` (silent drop, no scrml error surface — the flogence S15 residual). Fix: append a **uniform `.catch`** to the wrapped IIFE call (`emit-client.ts` `post-server-fn-iife-wrap`):
```js
(async () => _scrml_reactive_set(<name>, await <stub>(<args>)))().catch(_scrml_async_err => _scrml_error_boundary_log(<name>, _scrml_async_err));
```
- **R26 before/after** (real compiled source, executed): BEFORE → `unhandledRejection` fired; AFTER → no `unhandledRejection`, surfaces via `_scrml_error_boundary_log` (loud, non-swallowing, typed; lives in the always-included `errors` runtime chunk). Happy path byte-identical except the appended `.catch`. S84 stmt-vs-expr `;)` logic preserved (valid in both positions).
- **Justified deviation from the brief:** I briefed routing to `_scrml_error_boundary_uncaught`; the agent correctly chose `_scrml_error_boundary_log` instead — `_uncaught` *returns* an Error meant to be `throw`n, and re-throwing inside an async `.catch` would re-create the very `unhandledrejection` being eliminated. Accepted.
- **sPA verify:** target test re-run independently 16/0; cherry-pick onto `spa/ss32` re-ran the full pre-commit gate (**18061 pass / 0 fail**) + post-commit gauntlet (Browser: all checks passed). True top-level parser-conformance 4276/0. No `.scrml` fixture added → no re-baseline.

## ⚠ DISCOVERED FORK (g) — not in the list, escalated (pre-existing, NOT a regression)

While witnessing item 1, the agent found `@cell = serverFn() !{ ::NetworkError :> ... }` reactive-server assignments emit a **DEAD `!{}` dispatch**: the auto-await wrap leaves `let result = (async()=>...)()` capturing the **Promise**, so the sibling `if (result.__scrml_error) {...}` checks a Promise → **always falsy → the user's `!{}` handler never fires.** Independent of (and older than) the item-1 fix. My landed `.catch` *safety-nets* it (rejections now surface instead of `unhandledrejection`) but does NOT restore the handler. A correct fix moves the `!{}` envelope dispatch INSIDE the IIFE after the `await` — structural, earlier than the string-rewrite stage.

## Item 2 — SURVEYED → REPRODUCES (narrowly) → PARKED for your design ruling

Survey-first (S138 reverse), R26 on real compiled source. **Verdict: REPRODUCES.** Top-level `@derived = @data.field` off an async-server cell emits a **bare one-shot `_scrml_reactive_set`** (NOT wrapped in `_scrml_effect`) → reads `@data` pre-resolve:
- **No initializer** → synchronous `_scrml_reactive_get("data").value` reads `undefined` → **`TypeError` at module-init, whole page init aborts** (item-1's `.catch` does NOT cover this — it's on the async IIFE, not the sync successor).
- **With initializer** → `@derived` snapshots the initial value and **stays stale forever** (replay: 0 subscriptions on `@data`).
- **Display bindings `${@data.value}` are race-free** — wrapped in `_scrml_effect`, they subscribe and re-derive on the async set. So the corner is specifically **separate top-level derived cells**, not read-site derivations.

Full survey (emitted JS both sides, executed behavior, options): `docs/changes/g-auto-await-read-before-resolve-race/SURVEY.md` (on the branch).

**Why parked, not dispatched:** the fix is a **designer-axis call** — sPA does not make design rulings:
1. **Dependency-barrier / await-chaining** (narrow — the list's framing): sequence async-dependent successors into the IIFE `.then` continuation; needs DG async-taint marking.
2. **Reactive-derivation** (broad): emit top-level `@derived = expr` as a subscribing `_scrml_effect` → race-free + live, but changes top-level derived-cell semantics language-wide.
3. **Hybrid**: only async-tainted derivations get the barrier; pure-sync stays one-shot.
4. **Lint/diagnostic stance**: "data-dependent derived cell off an async-server assignment is a one-shot snapshot — derive in the binding or guard for absence." (The race is avoidable today by deriving at the read site.)

## Recommendation: item 2 + fork (g) share ONE structural root

Both are **"a synchronous successor statement reads an async-deferred producer before it resolves"** — fork (g) reads the IIFE *Promise* (error-routing), item 2 reads the pre-resolve *cell value* (data-ordering). A single data-dependency barrier (option 1/3) could subsume both. Suggest one PA deliberation covering the pair, then (if a codegen fix is chosen) one dispatch.

## PA actions
- **FF-merge `spa/ss32` (`9f8d8e3b`) → `main`; push.** Clean (`0 2`, rebased on current origin/main).
- **Design ruling owed:** item 2 + fork (g) — pick the barrier/reactive/hybrid/lint axis; create the sibling item(s) (list-building is yours).
- **flogence reply owed** re item 1 (per the list brief) — the S15 silent-drop residual is closed (errors now surface); the `!{}`-handler-fires expectation is the deeper fork (g), still open.
- **Prunable at re-integration:** agent worktree `agent-a11c7bfb051ec62a4` (locked; commit `c193797b` cherry-picked as `d39f9d93`) + branch `worktree-agent-a11c7bfb051ec62a4`; the ss32 sPA worktree `/home/bryan-maclee/scrmlMaster/scrml-spa-ss32` (gitignored `node_modules`/`dist` symlinks I added to provision the gate — harmless, uncommitted).
