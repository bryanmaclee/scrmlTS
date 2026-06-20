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
1. **`g-server-keyword-full-migration`** `[landed-on-branch 4a703df4]` feature LOW · tier med — deprecated `server` keyword pervades canon; read-surfaces fixed S180 (gap-id `g-server-keyword-drift`); samples left by design, SSE deferred, error-msg residual. Full corpus migration scoped/deferred. Entry: known-gaps §S175 (:66-79) + route-inference.ts:3054.
   _ss9: bulk arc DONE (S180 read-surface scrub + S181 teaching-strings). Landed the ONE remaining mechanical residual — the 2 **emitted-JS** comments (emit-logic.ts:1699/1805 `use a server function.` → `server-side function.`, the deferred sub-residual of g-server-keyword-error-msg). No test coupling (tests assert the `// SQL-init for @X` prefix only); targeted unit 21/21. **Remaining sub-residual FLAGGED to PA (not mechanical):** SPEC §20.5 example-input blocks (SPEC.md:14060/14098 `server function getProfile/checkAuth`) escalate ONLY via `session` access — migrating them turns on whether `session`-access is a §12.2 escalation trigger (escalation-semantics judgment, exactly why S181 deferred it). The §20.5 examples may be a correctly-left carve-out like session-only/SSE._
2. **`g-sse-server-keyword-deferred`** `[parked → PA design-track]` feature LOW · tier med — should the deprecated `server` keyword drop from SSE `server function*`? Deferred to its own DD (KEEP de-facto); turns on `isSSE = isServer && isGenerator` (:3562-3563). Re-trigger gated on giti-025/026 closed + adopter pressure. Entry: sse-server-keyword-deferred DD + route-inference.ts.
   _ss9: PARK — design-deferred, NOT sPA-executable. DD run S181 ruled KEEP; both re-trigger conditions UNMET (giti-025/026 SSE-wiring OPEN + zero `.scrml` corpus pressure). KEEP stands as the standing disposition. No code change._
3. **`g-sse-server-keyword`** `[parked → PA design-track]` experiment LOW · tier med — same SSE-keyword decision (DD run S181, KEEP stands; design space fully scoped). NOTE STALE route-inference.ts:3226 hint; live `isSSE` at :3562-3563. Entry: sse-server-keyword-deferred DD. _(near-dup of #2.)_
   _ss9: PARK — near-dup of #2; same design-deferred KEEP disposition. Verified the live `isSSE` IS at route-inference.ts:3563 (not :3226 — :3226 is now an S180-D3.1 comment region). The stale `:3226` ref lives in **known-gaps.md:82** (a PA-owned durable doc) — flagged for PA correction (NOT a code-comment fix; nothing landable here)._
4. **`g-tier1-ssr-prerender`** `[parked → PA/dPA — architecture]` feature MED · tier high — Tier-1 `authority="server"` instances load client-side on mount (placeholder flash) instead of SSR pre-rendered per §52.8. **Substantial new SSR-pre-render subsystem** (server-render rows + inline state + flash-free hydration; no existing path to mirror). W-AUTH-002 becomes obsolete on land. Entry: route-splitter.ts:1167 + type-system.ts:8044-8065.
   _ss9: PARK/ESCALATE — exceeds a bounded sPA dispatch. Already SPLIT per the S196 STOP/SPLIT gate; "no existing SSR-pre-render path to mirror" → the FIRST step is an architecture/design pass (how scrml SSR-renders markup with loaded rows + flash-free hydration), which is PA/dPA territory (sPA is not a deliberator). NOT a blocker (client-side load works; brief first-paint placeholder flash). §52.8 names BOTH tiers — a unified server-authoritative-SSR pass covers Tier-1+Tier-2. Recommend PA route to a DD/architecture pass, then a multi-dispatch build._
5. **`flux-mmorpg-build`** `[parked → PA — project-scale]` experiment n-a · tier high — Flux MMORPG dogfood (v1 spike built, reframed to shared server-authoritative MMORPG; architecture+audit DDs done). Big dogfood build (ASCII+Three.js-FPS+puzzle-portal). NOTE: the "§52 server-sync blocker" framing is STALE (auto-persist retracted S194; persist is explicit `?{}`). Entry: flux-mmorpg-architecture DD + examples/28-flux.scrml. _(arguably Bucket-B design; kept here as it's a buildable dogfood.)_
   _ss9: PARK/ESCALATE — project-scale, not a list-item. A shared server-authoritative MMORPG (ASCII + Three.js-FPS + puzzle-portal) is a multi-session build the PA/user should own as a project (the list itself says "arguably Bucket-B"). The original §52-server-sync blocker is dissolved (S194 auto-persist retraction → persist is explicit `?{}`), but the build is partly gated on #4's server-authoritative-SSR infra. Recommend PA move to Bucket-B / own as a project._

## Progress
`ss9.progress.md`. Land on `spa/ss9`; ping PA inbox when ready. Do not advance main / do not push.
