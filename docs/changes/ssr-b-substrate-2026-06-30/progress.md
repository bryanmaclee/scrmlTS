# SSR Dispatch 1 — B-substrate (inline-state seed)

Change-id: ssr-b-substrate-2026-06-30
Worktree: /home/bryan-maclee/scrmlMaster/scrml/.claude/worktrees/agent-a0ca311aa926db22b

## Goal
Request-time server-side injection of server-authoritative cell values as inline
`<script>window.__scrml_ssr_state={…}</script>`, a client seed-before-mount hook,
and conditional `/__serverLoad` fetch IIFEs. B-substrate ONLY — does NOT close
g-tier1-ssr-prerender, does NOT retire W-AUTH-002.

## Design (verified against current source)
- emit-server.ts: SSR HTML-composition GET route (sibling `<base>.html` read via
  import.meta.url + inject seed before </head>), reusing the /__serverLoad query
  logic + §14.8.9 protect tag/redact sink. First compiler-emitted text/html route.
- Seed set = Tier-1 instances + Tier-2 Pattern-C + coalesced-callable-init
  (mountHydrate set). Derived = source-seeded (recomputes at construction).
- runtime-template.js: `_scrml_ssr_seeded(name)` + `_scrml_ssr_seed_apply()` in a
  NEW `ssr` chunk (tree-shaken; post-emit scan activation).
- emit-sync.ts: seed-skip guard on emitServerAuthorityLoad / emitDeclRhsSqlLoad /
  emitUnifiedMountHydrate (runtime check → graceful degrade when no SSR).
- emit-reactive-wiring.ts: emit `_scrml_ssr_seed_apply()` at start of Step 4c
  (after cell-init, before fetch IIFEs + engine hydration).

## Fire-site corrections vs brief
- (to be recorded)

## Steps

- [step] runtime ssr chunk: _scrml_ssr_seeded + _scrml_ssr_seed_apply in NEW 'ssr'
  chunk (runtime-template.js before log marker); RUNTIME_CHUNK_ORDER + CHUNK_MARKERS
  (runtime-chunks.ts); post-emit `_scrml_ssr_` scan activation (emit-client.ts).
  Verified: ssr chunk resolves (1373B), map/log intact, runtime node --check OK.

- [step] emit-sync.ts: seed-skip guards on emitServerAuthorityLoad / emitDeclRhsSqlLoad
  (`if (_scrml_ssr_seeded("v")) return;`) + emitUnifiedMountHydrate (all-seeded AND-guard).
- [step] emit-reactive-wiring.ts: `_scrml_ssr_seed_apply()` at start of Step 4c (gated on
  serverVarDecls||serverAuthorityTypes), after cell-init + before fetch IIFEs/engine hydration.
- [step] emit-server.ts: SSR HTML-composition GET route (computeServedPath + sibling
  <base>.html read via import.meta.url; <-escape via String.fromCharCode(92)) seeding
  Tier-1 + Pattern-C + coalesced-callable-init, reusing the §14.8.9 tag/redact sink.

## R26 — PASS (repro: Tier-1+protect, Tier-2 ?{}, derived, engine server=@cell)
- A: _scrml_route___ssr emitted, path:"/app", method:GET, text/html, in routes[].
- B: Tier-1 users -> _scrml_protect_tag(...,["passwordHash"]) -> _scrml_protect_redact -> seed["accounts"]; passwordHash redacted.
- C: client _scrml_ssr_seed_apply() before fetch IIFEs; `if (_scrml_ssr_seeded("driver"/"accounts")) return;` skips /__serverLoad.
- D: engine E-leg __scrml_eleg_h() reads _scrml_reactive_get("driver") at construction (after seed-apply) -> hydrate; no post-mount fetch.
- node --check OK on app.server.js / app.client.js / scrml-runtime.*.js; ssr helpers tree-shaken into the used runtime variant; 0 server-leak (passwordHash/_scrml_sql/__scrml_ssr_state=) in client.js.
- XSS escape verified: </script> in data -> </script>, JS round-trips.

## Fire-site corrections vs brief
- All brief line refs accurate (emit-sync 104/152/205; runtime _scrml_reactive_set 730 /
  _scrml_engine_hydrate_init 3864; protect sink emit-server ~2852-2864). No drift to report.

- [step] tests: integration/ssr-b-substrate.test.js (17 — a/b/c/d/e + Tier-1/Pattern-C/derived
  parity; runCG harness + compileFull for the §51.0.E engine E-leg) + unit/ssr-seed-runtime.test.js
  (6 — happy-dom runtime execution of _scrml_ssr_seed_apply/_scrml_ssr_seeded, incl. falsy-defined
  "" / 0 / false own-property semantics). All pass.

## GATE — full `bun test compiler/tests/` (browser+lsp+within-node parity)
- 25905 pass · 211 skip · 1 todo · 0 fail · 26117 tests / 1130 files · 232.6s.
- 0 within-node OVER-BUDGET (no allowlist rebaseline needed).
- chunk-count baselines 29->30 (runtime-tree-shaking + c10) the only test edits.

## Disposition
- B-substrate COMPLETE. W-AUTH-002 NOT retired (R26 confirms it still fires).
  g-tier1-ssr-prerender does NOT close (no markup pre-render — that is the A-terminus).
## Deferred (surfaced, not built)
- Dev hot-reload on SSR pages: the SSR GET route preempts dev.js static serving, so
  injectHotReloadScript is skipped for server-authority pages in dev. Natural A-terminus
  fix (it already touches the hosts). No prod impact.
- Single (non-coalesced) `<var server> = loadFn()` (emitInitialLoad, NOT in the brief's
  named conditional set) is not seeded — §52.8-completeness for that shape is a follow-on.
- e2e served-HTML round-trip (serve→fetch→seed→render) — A-terminus domain.
- SSR route matches the clean-URL only; `/foo.html` direct-access bypasses SSR.
