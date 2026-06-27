# sPA ss34 → PA — re-integration (endpoint + SSR / server-render)

**List:** `spa-lists/ss34-endpoint-ssr-server-render.md` (SURVEY-FIRST) · **Branch:** `spa/ss34` · **Tip SHA:** `964d1fc5` · **Base:** `5fb41cb9` (post-ss38) · **Coherence:** 1 ahead / 0 behind base. **main NOT advanced** (untouched at `a0559651`; it advanced independently via a parallel session — orthogonal to this branch). **Nothing pushed.**

End-state: every item is landed / surveyed-banked / already-shipped / parked. Run COMPLETE.

---

## Items

### 1. g-endpoint-multi-statement-arm-invalid-js (MED) — **LANDED-ON-BRANCH** `964d1fc5`
Single commit on `spa/ss34` (FF off base `5fb41cb9`). Full pre-commit suite green: **18071 pass / 0 fail / 68 skip** (+10 new tests).

**SCOPED-DOWN per SPEC §61.10 (Rule 4 — derived-doc footprint cross-checked against SPEC).** The footprint offered two paths: "lower multi-statement bodies correctly" OR "add a clean `E-ENDPOINT-*` diagnostic." SPEC §61.10 is explicit and normative: multi-statement bare-body arm LOWERING is a **deferred future wave** ("Multi-statement handler bodies are a future wave") — building it would god-ify the primitive against the §60.7 LIMIT-PRIMITIVES boundary. So only the **diagnostic half** was built:
- New `E-ENDPOINT-MULTI-STATEMENT-ARM` (Error) fires at the arm span instead of the cryptic generic `E-CODEGEN-INVALID-JS` emit-gate rejection.
- `emit-server.ts` `emitEndpointArmEnvelope` detects via new `isSingleJsExpression()` (`validate-emit.ts`, reuses the §2.2.1 emit-gate acorn). Both named-arm + wildcard `<_>` call sites covered.
- SPEC `§34` catalog row + `§61.9` list + `§61.10` limits-note updated (**five → six** `E-ENDPOINT-*` codes).
- 10-case regression test + reproducer. example-33 server.js **byte-identical**; all adversarial edges correct (`;`-in-string/object no false-positive; multi-line single call no false-positive; self-closing 204 / empty unaffected; wildcard multi-stmt fires).

**PA ACTION NEEDED:** the new error-code name + the SPEC §34/§61 delta want your **ratification** (the footprint pre-authorized "a clean `E-ENDPOINT-*` diagnostic," but the exact code name + SPEC wording are mine — review at re-integration).

**Follow-up surfaced (separate latent bug, OUT OF SCOPE):** a `@`-led bare-body arm (e.g. `@x = seq` + value-expr) is **lossily collapsed** by `rewriteServerExpr` (the trailing value-expr is silently dropped) BEFORE the detection point, so it passes as "supported" and silently mis-compiles rather than firing the diagnostic. `@`-reactive refs are semantically wrong in a server arm anyway. File as its own item (rewriteServerExpr drop-bug).

**Gate quirk noted (not fixed, separate):** in the `compileScrml({write:false})` API path the `--validate-emit` gate did NOT surface `E-CODEGEN-INVALID-JS` for the reproducer even with `validateEmit:true`, though the CLI path does. My diagnostic is independent (fires from codegen's `errors` stream in both paths). The gate/`write:false` discrepancy is worth a separate look.

### 2. g-tier1-ssr-prerender (MED, survey-first) — **SURVEYED → BANK AS ITS OWN ARC** (no build)
Full survey: `docs/changes/g-tier1-ssr-prerender-survey-2026-06-26/SURVEY.md`.

**Verdict:** §52.8 SSR prerender is a **spec-ahead gap → a MULTI-WAVE SSR/hydration program. Do NOT build inside ss34; bank as its own arc.** Load-bearing finding: **scrml has NO server-side HTML render path today** (compile-time static HTML via `generateHtml` at `index.ts:996-998`; empty `data-scrml-logic` mount slots for ALL reactive content; RPC-only `.server.js` returning `null` on the page path; no `renderToString` anywhere). You can't inject prerendered state into HTML that isn't server-rendered.
- **NOT coupled to W4 chunk delivery** (dpa-014) — orthogonal axes (delivery-of-code vs content-of-first-paint); only co-located `index.ts` doc-assembly seam, no semantic conflict.
- **Decomposition:** W1 server-HTML-render → W2 hydration boundary / client-takeover → W3 §52.8 server-authority injection (the literal residual) → W4 reconcile client-mount load. Strict prereq chain; touches emit-html / emit-client / index.ts / runtime / emit-server.
- **Spec-vs-impl flag:** §52.8 + the §52.5 "SSR Pre-Rendered: Yes" table are **spec-ahead-of-implementation**. The BUILT behavior matches §52.6.1 (placeholder-while-fetch-in-flight, client-mount). Worth a SPEC currency note that §52.8 is Nominal/unbuilt.

### 3. g-rendermap-needs-server-classification (LOW) — **ALREADY-SHIPPED** (S203 / spa-ss10, 2026-06-20)
**The list footprint was STALE + partly misframed.** The "rendermap" is the e2e test HARNESS, not a compiler-internal classifier (zero `rendermap` in `compiler/src/`). The `needs-server` cell-state is already live and was landed by spa-ss10 SIX DAYS before this list was prepped (S223): `compiler/tests/e2e-render-map/e2e-render-map.test.js:44` (GREEN_STATES ∋ `needs-server`) + `render-harness.js:103-130` (serverDependent = serverJs-emitted OR `?{`-SQL-in-source → data-source-null at no-server mount classified `needs-server`) + 9 baseline cells. Ref: `handOffs/incoming/read/2026-06-20-0959-spa-ss10-to-pa-list-complete.md`.

Per the **S203 user ruling (b+c)** `g-fullstack-empty-mount-throws` is a **non-gap** — the compiler is NOT wrong to emit the server-binding; there is **no compiler-side "empty-mount → loading state degradation" to build** (that framing in the ss34 footprint was a list-prep misread). **PA: close this item; no work exists.** (Process note: list-prep didn't cross-check the spa-ss10 landing — `feedback_verify_before_claim` class.)

### 4. g-sse-server-keyword (LOW, Bucket-B) — **PARKED by design**
Design-laden, user-ruled DEFERRED to its own DD. Not buildable by an sPA (no design ruling per scope boundary). Stays a Bucket-B flag; route to a DD if/when fired.

---

## Cleanup for PA
- **Worktree to remove:** `/home/bryan-maclee/scrmlMaster/scrml-g-endpoint-multistmt` (branch `g-endpoint-multistmt-arm` @ `964d1fc5`) — now redundant (its commit IS `spa/ss34`'s tip). I did NOT clean it (4+ other active sPA worktrees in the same parent dir — left to you for safe removal). `git worktree remove` + `git branch -d g-endpoint-multistmt-arm` after you fold `spa/ss34`.
- The agent's isolation deviated (dispatch CWD was the main checkout on `spa/ss34`, with a parallel bug-1 Tailwind session concurrently editing `compiler/SPEC.md` §26.8 + `emit-client.ts` in main's shared index); the agent correctly built in a fresh isolated worktree and restored main's source files. I landed item 1 via a **ref-only fast-forward** of `spa/ss34` (never touched the dirty shared working tree) — so the parallel session's uncommitted §26.8 SPEC.md is **safe / untouched**.
- Bookkeeping (list status edits + `spa-lists/ss34.progress.md` + the two `docs/changes/.../` artifacts) are uncommitted working-tree files in the (shared) main checkout, for you to reconcile at re-integration.
