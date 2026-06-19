# sPA ss9 — server-authority-keyword

**Launch:** `read spa.md ss9` · **Branch:** `spa/ss9` · **Worktree:** `../scrml-spa-ss9`
**Merged from:** server-authority-tier-ssr · server-keyword-deprecation-residuals

## Shared ingestion
The §52 State Authority server-side surface (`route-splitter.ts` SSR-injected-`<script>` ~:1167,
`type-system.ts` W-AUTH-002 ~:8044-8065, §52.6.1 read-authority core landed S196, §52.8 SSR pre-render)
+ the deprecated `server` keyword elimination arc (S180 RULING-A; `route-inference.ts`
W-DEPRECATED-SERVER-MODIFIER ~:3054, `isServer` ~:3098, `isSSE = isServer && isGenerator` ~:3562-3563;
§12.2 escalation triggers; §37 SSE). Threads: the two-tier authority model, the retracted auto-persist
(Q1=C S194 — persist is an explicit `?{}` server fn), flash-free hydration, the SSE-keyword-drop DD.

## Core files
`compiler/src/codegen/route-splitter.ts` · `compiler/src/type-system.ts` · `compiler/src/route-inference.ts` · `scrml-support/docs/deep-dives/sse-server-keyword-deferred-2026-06-11.md`

## Items (least-ingestion-first)
1. **`g-server-keyword-full-migration`** `[open]` feature LOW · tier med — deprecated `server` keyword pervades canon; read-surfaces fixed S180 (gap-id `g-server-keyword-drift`); samples left by design, SSE deferred, error-msg residual. Full corpus migration scoped/deferred. Entry: known-gaps §S175 (:66-79) + route-inference.ts:3054.
2. **`g-sse-server-keyword-deferred`** `[open]` feature LOW · tier med — should the deprecated `server` keyword drop from SSE `server function*`? Deferred to its own DD (KEEP de-facto); turns on `isSSE = isServer && isGenerator` (:3562-3563). Re-trigger gated on giti-025/026 closed + adopter pressure. Entry: sse-server-keyword-deferred DD + route-inference.ts.
3. **`g-sse-server-keyword`** `[open]` experiment LOW · tier med — same SSE-keyword decision (DD run S181, KEEP stands; design space fully scoped). NOTE STALE route-inference.ts:3226 hint; live `isSSE` at :3562-3563. Entry: sse-server-keyword-deferred DD. _(near-dup of #2.)_
4. **`g-tier1-ssr-prerender`** `[open]` feature MED · tier high — Tier-1 `authority="server"` instances load client-side on mount (placeholder flash) instead of SSR pre-rendered per §52.8. **Substantial new SSR-pre-render subsystem** (server-render rows + inline state + flash-free hydration; no existing path to mirror). W-AUTH-002 becomes obsolete on land. Entry: route-splitter.ts:1167 + type-system.ts:8044-8065.
5. **`flux-mmorpg-build`** `[open]` experiment n-a · tier high — Flux MMORPG dogfood (v1 spike built, reframed to shared server-authoritative MMORPG; architecture+audit DDs done). Big dogfood build (ASCII+Three.js-FPS+puzzle-portal). NOTE: the "§52 server-sync blocker" framing is STALE (auto-persist retracted S194; persist is explicit `?{}`). Entry: flux-mmorpg-architecture DD + examples/28-flux.scrml. _(arguably Bucket-B design; kept here as it's a buildable dogfood.)_

## Progress
`ss9.progress.md`. Land on `spa/ss9`; ping PA inbox when ready. Do not advance main / do not push.
