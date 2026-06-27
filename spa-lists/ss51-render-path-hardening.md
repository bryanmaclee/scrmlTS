# ss51 — render-path hardening: SSR + rendermap + reactive-server error-arm — VERIFY-FIRST/SURVEY

**Fill-note:** three render/hydration-path gaps (2 MED + 1 LOW) clustered by the server-render + reactive-data-hydration ingestion. The looser fit is item 3 (emit-client auto-await — an ss32/ss41 residual); items 1-2 are the SSR/rendermap pair. **VERIFY-FIRST** (+ item 1 has a banked survey to read). **S215 adversarial.**

**⚠️ Looser-than-usual ingestion** (server-render emit + client auto-await) — kept together for the "few lanes" ask. If the sPA finds item 3 wants a different fire-site than 1-2, split it back out as an ss32-followon.

**Shared ingestion:** the server-render / hydration path — SSR pre-render (§52.8 Tier-1 `authority="server"`), the rendermap server/client classification, and the emit-client auto-await IIFE error-routing. coreFiles: `emit-server` SSR pre-render + the rendermap classifier + `emit-client.ts` auto-await IIFE.

**Brief reminders:** VERIFY-FIRST per gap. Item 1 — **READ the banked survey** `docs/changes/g-tier1-ssr-prerender-survey-2026-06-26/` first (multi-wave SSR arc already scoped). R26 (compile + `node --check` + runtime/hydration correctness) + full `bun run test`; re-baseline within-node parity if fixtures shift.

## Items

1. **g-tier1-ssr-prerender** (MED) `[status=open]` **SURVEY-BANKED — read the survey first**
   - Tier-1 `authority="server"` instances load client-side on mount instead of being SSR pre-rendered (§52.8) — the read-authority SSR residual (the read-authority core landed S196). A multi-wave SSR arc; the survey at `docs/changes/g-tier1-ssr-prerender-survey-2026-06-26/` scopes it.
   - Build per the survey's wave decomposition. Footprint: `emit-server` SSR pre-render + the §52.8 hydration handoff.

2. **g-rendermap-needs-server-classification** (LOW) `[status=open]` **VERIFY-FIRST**
   - The rendermap needs server/client classification (a node's render locus isn't classified server-vs-client) — pairs with item 1's SSR work (SSR needs to know which subtree pre-renders server-side).
   - Footprint: the rendermap classifier. Likely lands alongside / as a prerequisite of item 1.

3. **g-auto-await-reactive-server-no-error-arm** (MED) `[status=open]` **VERIFY-FIRST · ss32/ss41 sibling**
   - The per-statement auto-await IIFE is catch-less → a failed reactive-server assignment (`@cell = serverFn()` with NO `!{}` arm) silently drops (browser `unhandledrejection`, no scrml error). Distinct from ss41 (which fixed the WITH-`!{}`-arm dead-handler) — this is the NO-arm catch-less case.
   - Fix = the auto-await IIFE must route a no-error-arm rejection to scrml's error surface (`_scrml_error_boundary_log`), not drop it. Mirror ss41's seam (the resolved-envelope check inside the IIFE). Adversarial: no-arm vs with-arm (ss41, must stay correct) vs CPS-stub vs fetch-stub.
   - Footprint: `emit-client.ts` auto-await IIFE wrap (the ss32/ss41 region). Surfaced flogence S15 residual.
