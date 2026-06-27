# SURVEY — g-tier1-ssr-prerender (ss34 item 2, SURVEY-FIRST)

**By:** sPA ss34 (survey agent: scrml-js-codegen-engineer, read-only) · 2026-06-26 · base `spa/ss34` @ `964d1fc5`
**Verdict:** §52.8 SSR prerender is a **spec-ahead gap → MULTI-WAVE SSR/hydration arc. BANK as its own arc; do NOT build inside ss34.**

---

## LOAD-BEARING FINDING: scrml has NO server-side HTML render path today

The served HTML is a **compile-time static artifact** whose reactive DOM the `.client.js` builds entirely on mount. Proven on four axes:

1. **HTML assembled at COMPILE time, not per-request.** `codegen/index.ts:996-998` calls `generateHtml(nodes, compileCtx)` in a compile pass over the static AST; wrapped in a `<!DOCTYPE html>` shell (`index.ts:1143-1204`), written to a `.html` file. No request object in scope; baked-in values are declaration placeholders, never per-request server-resolved.
2. **Reactive content renders as EMPTY mount slots.** `${@count}` → `<span data-scrml-logic="_scrml_logic_1"></span>` (`samples/compilation-tests/dist/combined-001-counter.html`). A `for` list → `<ul><span data-scrml-logic=…></span></ul>` with ZERO `<li>` rows; the client builds them on mount. Initial paint is content-empty for ALL reactive state, not just server-authority.
3. **`.server.js` is a WinterCG RPC router with NO HTML response.** `combined-015-user-list.server.js:57-66`: `fetch(request)` matches `path`+`method`, dispatches to JSON handlers, `return null` otherwise. `grep text/html|renderToString|Bun.file|sendFile` across `emit-server.ts`+`index.ts` = ZERO server-render hits. No `renderToString`/`renderMarkup` anywhere.
4. **`bun scrml serve` is a compiler-as-a-service** (`commands/serve.js:104-218` — `/health`, `/compile`, `/compile-source`), not an app host.

This single fact governs (b) and (d).

## (a) Current path vs prerender seam

- **Client-mount-on-load IIFE:** `emitServerAuthorityLoad` at `codegen/emit-sync.ts:104-118`, wired at `emit-reactive-wiring.ts:726-741` (Tier-1) / 677-724 (Tier-2). Per instance, an `(async()=>{…})()` that runs **after first paint**: `fetch("/__serverLoad/cards",{method:"POST",…})` → `_scrml_reactive_set("cards", …)`.
- **The route:** `emit-server.ts:2700-2729` — synthetic `/__serverLoad/<var>` runs `SELECT * FROM <table>` server-side, returns JSON. (Tier-2 Pattern C sibling: `emit-server.ts:2740-2768` + `emitDeclRhsSqlLoad` `emit-sync.ts:152-166`.)
- The SELECT* **already runs server-side** — but invoked **client-side, post-paint**, via an HTTP round-trip. Data correct; **timing + placement** wrong per §52.8.
- **Prerender path cannot be a swap at this seam** (no server render to inject into). It needs: (1) per-request **server render** of the markup tree filling the `data-scrml-logic` slots, running the SELECT* **inline** during that render; (2) a **serialized hydration-state blob** (`<script>window.__scrml_state=…</script>`) so the client adopts the value; (3) client mount changed from build-from-empty to **hydrate-existing**; (4) the `emitServerAuthorityLoad` IIFE retained only as the **SPA-navigation fallback**, suppressed on the SSR'd first paint.

**Spec-internal tension (flag for PA):** §52.6.1 (`SPEC.md:29486-29490`) describes the placeholder-while-fetch-in-flight = the *currently-implemented* client-mount behavior. §52.8 (`29779`) says "no loading placeholder is shown on first paint." Reconciled only by an SSR leg. The implementation matches §52.6.1; **§52.8 is spec-ahead/unbuilt** (also the §52.5 table `SSR Pre-Rendered: Yes`, `29474-29475`).

## (b) Single-fix or multi-wave? → MULTI-WAVE

The single-fix framing presupposes an initial response that server-renders HTML — which does not exist. You cannot inject prerendered state into HTML that isn't server-rendered; the markup-tree-to-HTML render, hydration handoff, and client takeover are all absent. §52.8 is necessarily one leg of a larger SSR/hydration program.

## (c) W4 chunk-model coupling? → NO

W4 (dpa-014 reachability load-plan) = chunk **DELIVERY** over the static HTML at compile time (`augmentHtmlForChunks`, `emit-html.ts:2840`). SSR prerender = render-AUTHORITY **content in the first response body**. Orthogonal axes (delivery-of-code vs content-of-first-paint). Only shared seam: `index.ts:1143-1204` doc assembly — no semantic conflict. (List itself: item 2 "NOT the W4 chunk model".) Confirmed.

## (d) Recommended decomposition — BANK AS OWN ARC

Cross-cutting program touching emit-html (new server render), emit-client (hydration takeover), index.ts (doc assembly), the runtime, AND emit-server — not an emit-server endpoint item. Proposed waves (strict prereq chain):

- **W1 — Server HTML render path.** Per-request server render (GET page handler returning `text/html`, or a render fn off the WinterCG `fetch` aggregate that today returns `null`). Reactive slots render with content server-side. *Foundational.*
- **W2 — Hydration boundary / client takeover.** Client mount: build-from-empty → adopt-existing-DOM (attach listeners + bindings to server nodes). Touches whole emit-client mount + reactive-wiring. *Prereq: W1.*
- **W3 — §52.8 server-authority injection (the literal residual).** Run SELECT*/`?{}` load DURING the W1 render; inject into (a) rendered body + (b) serialized hydration blob. Derived pre-render iff all sources server-authoritative (§52.8 / `29791`). *Prereq: W1+W2; this is the named ss34 item, unreachable without W1/W2.*
- **W4 — Reconcile client-mount load.** Suppress `emitServerAuthorityLoad` IIFE on SSR'd first paint (avoid double-fetch/flash); retain as SPA-navigation fallback. *Prereq: W3.*

**Prior-art:** No dedicated SSR-render design doc / deferred SSR arc exists (grep'd docs/ handOffs/ spa-lists/ scrml-support/). Neighbors: §52 read-authority core (`docs/changes/g1-server-sync-codegen-2026-06-14/`, S196) + Tier-2 load Pattern C (`docs/changes/section52-server-cell-load-pattern-c-2026-06-23/`) — both client-mount, not SSR. §60.6 (`SPEC.md:33242`) SSR-gap prose is DIFFERENT (foreign-backend `<api>`/BYOB, no scrml server in path); for §52 server-authority scrml DOES have the server tier — the missing piece is purely the HTML render path. No §52.12 SSR open-question entry.

## Bottom line

§52.8 = spec-ahead gap, multi-wave SSR/hydration arc (W1 server-render → W2 hydration → W3 §52.8 injection → W4 client-load reconcile). Not coupled to W4 chunk delivery. **Recommendation: bank as its own SSR arc; ss34 item 2 = surveyed/deferred-to-arc.**
