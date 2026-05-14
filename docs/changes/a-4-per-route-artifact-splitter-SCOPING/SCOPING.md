# A-4 — Per-Route Artifact Splitter — Implementation SCOPING

**Status:** DRAFT — awaits PA + user OQ disposition before any A-4.* sub-phase dispatches.
**Authority:** Insight 29 (`scrml-support/design-insights.md` L1827; 5-voice debate verdict 2026-05-11). SPEC anchors LANDED at S86 (commit landing §40.9 prose). SPEC.md §40.9.7 + §40.9.8 + §47.5 cross-ref are the normative contract. PIPELINE.md Stage 8 (L2414-2495) is the codegen-stage contract.
**Predecessor waves:** A-1 closed S89 (markup-context DG edges, 523 nodes + 523 edges). A-2 closing now via A-2.7 outer fixpoint (in-flight). A-3 closed S91 (commit `bf2b098` — AuthGraph + role-enum resolver + per-gate classifier + redirect cross-ref).
**Underwriting empirical study:** S84 diagnostic — 99-100% static-resolvability gate PASS.
**Estimate band per Insight 29 architect decomposition (design-insights L1880):** ~60-120h for A-4 in the 300-640h A-1..A-5 aggregate. This scoping refines that band per sub-phase.
**User ratification of full Approach A scope:** S88 verbatim — *"I know we talked about deferring A to 0.4, but I am not seeing the reason now, start on those tasks as they are unblocked."*

---

## §1 Scope Lock — what A-4 produces, consumes, replaces

### 1.1 What A-4 consumes

| Input | Source | Shape |
|---|---|---|
| `ReachabilityRecord` | RS Stage 7.6 (A-2; `compiler/src/reachability-solver.ts`) | `Map<EntryPointId, RolePlayableSurface>` per `types/reachability.ts` L98-101 |
| `RolePlayableSurface.byRole` | RS Component 4 + per-role projection | `Map<RoleVariant, ChunkPlan>` |
| `ChunkPlan.initialChunk` | RS A-2.4 + A-2.5 + A-2.6 | `ChunkContents` (componentNodeIds + reactiveCellNodeIds + serverFnNodeIds + vendorUnitNames) |
| `ChunkPlan.prefetchTier1` | RS A-2.4 (server-fn tier-1 delta) | `ChunkContents` (currently only serverFnNodeIds populated; component-side empty per A-2.5 floor) |
| `ChunkPlan.prefetchTier2` | RS A-2.4 (server-fn tier-2 delta) | `ChunkContents` (currently only serverFnNodeIds populated) |
| `ChunkPlan.prefetchTierN` | RS (currently always empty per OQ-A2-B Option a) | `ChunkContents[]` |
| Per-file ASTs + `RouteMap` + `DepGraph` + `AuthGraph` | Stage 5/6/7/7.55 (existing) | unchanged from current Stage 8 input |

The ChunkPlan tier-math is performed UPSTREAM in RS — A-4 receives differenced sets, not cumulative ones. Cross-ref `reachability-solver.ts` L303-330 `makeChunkPlan` for the differencing implementation.

### 1.2 What A-4 produces

Per `SPEC.md §40.9.7` (L17774-17793) the four chunk forms are normative:

```
initial_chunk(E)          := minimize_payload(playable_surface(E, N=0))
prefetch_tier_1(E)        := playable_surface(E, N=1) − initial_chunk(E)        [idle-prefetched]
prefetch_tier_2(E)        := playable_surface(E, N=2) − playable_surface(E, N=1)  [hover-prefetched]
prefetch_tier_N(E)        := playable_surface(E, N) − playable_surface(E, N−1)    [on-demand, N ≥ 3]
```

A-4 produces, per entry point `E` and per role variant `R`:

1. **Initial chunk JS artifact.** Contains every `componentNodeId` + `reactiveCellNodeId` + `serverFnNodeId` stub + `vendorUnitName` in `playable_surface(E, R, N=0)`. Filename per §47 content-addressing (OQ-A4-C below).
2. **Tier-1 prefetch JS artifact.** Contains the delta-set for `N=1`. Idle-prefetched.
3. **Tier-2 prefetch JS artifact.** Contains the delta-set for `N=2`. Hover-prefetched (link-hover for routes / focus-or-hover for interactive components).
4. **Tier-N (N≥3) prefetch artifacts.** On-demand. Per OQ-A2-B Option a the RS solver currently emits `prefetchTierN: []`, so A-4.5 is structurally a no-op for v0.3.0 — A-4 emits the dispatch hook but no chunks. (OQ-A4-D ratifies the formal disposition.)
5. **Per-route HTML.** The page's HTML shell — references the initial chunk script + tier-1/tier-2 prefetch hints. One HTML per (route URL, role) tuple. (OQ-A4-E covers the per-role-HTML question.)
6. **Optional `chunks.json` manifest.** Maps `(EntryPointId, RoleVariant, Tier)` → content-addressed chunk filename. (OQ-A4-A covers the formal shape decision.)
7. **Server.js per route.** Existing per-source-file server.js emission is unchanged — server-fn route handler emission remains a per-source-file concern (one `.server.js` per `.scrml` source). The chunk-side server-fn admission is a CLIENT-SIDE stub admission (the fetch wrapper); the server route handler itself is unchanged.

### 1.3 What A-4 replaces / augments in current codegen

The current codegen orchestrator at `compiler/src/codegen/index.ts` is a per-FILE loop:

```
for each fileAST in input.files:
  emit serverJs (one per source file)
  emit clientJs (one per source file, ONE monolithic per-file IIFE)
  emit html (one per source file)
  emit css (one per source file)
```

Per-file output is keyed by source path: `Map<filePath, CgFileOutput>` (see `index.ts` L141, L821).

**A-4 inserts a per-(entry-point, role, tier) emission phase that runs ABOVE the per-file emission phase.** The per-file emission phase stays in place (it produces atoms — function bodies, validator emitters, etc.); the per-route splitter composes those atoms into the per-(EP, R, T) chunk shape per `ChunkPlan.<tier>.componentNodeIds` admission.

**A-4 augments — does not replace — the existing per-source-file output mapping.** Per-source-file `.server.js` is preserved (existing route-handler concern). The existing single-file `.client.js` is REPLACED for entries that have a `ChunkPlan` (i.e., live under a `<page>` declaration or are the SPA-program entry-file); files that produce no `<page>` and no `<program>` (component-only files imported by entry files) become atoms that the splitter composes — they no longer emit a sibling per-source `.client.js`. Per the bridge OQ-A4-F backwards-compat ratification this is the v0.3.0 default; legacy per-file emission for non-entry files is preserved via the opt-out flag.

### 1.4 Out-of-scope for A-4 (explicit)

- **Approach B (telemetry-PGO).** Insight 29 M2: deferred to v2 per llvm-pgo-expert flip-vote. SPEC §40.9.8 explicitly forbids any non-static input to the chunking surface in v0.3.
- **Approach C (`^{}` overrides on splitting policy).** Gated on dive E `compiler.*` phantom; not in v0.3 scope.
- **A-5 (integration tests).** A-4 has its own per-sub-phase test coverage; A-5 anchors the §40.9.9 worked-example E2E replay across A-2/A-3/A-4. Not in this SCOPING.
- **Refining `prefetchTier1` / `prefetchTier2` component-side admission.** Per `reachability-solver.ts` L316-326, the component-side of tier-1 / tier-2 is currently empty (only server-fn-side admission is populated, per A-2.5 conservative ship-eagerly floor). A-4 emits the chunks AS-IS — refinement of WHICH components go in tier-1/tier-2 vs. initial is RS's concern (queued as A-2.X future refinement; see OQ-A4-B).

---

## §2 Investigation Findings — codegen, content-addressing, prefetch landscape at HEAD

### 2.1 Codegen orchestrator structure

`compiler/src/codegen/index.ts:150-845`. Three-phase model:

1. **Analyze** (L203-229) — per-file AST walk, collect symbol data into `fileAnalyses`. Dependency-graph validation. Worker-program extraction.
2. **Plan** (L470-560) — per-file `CompileContext` construction (`./context.ts` `makeCompileContext`). Threads `reachabilityRecord` into per-file ctx at L552 (A-2.1 pre-wire).
3. **Emit** (L570-820) — per-file emission: `generateServerJs` → `generateHtml` → `generateClientJs` → `generateCss`. Output assembled into `CgFileOutput { html, css, clientJs, serverJs, ... }`. Result map keyed by source path (L821: `outputs.set(filePath, browserOutput)`).

The `reachabilityRecord` field is already on `CgInput` (L120 of `index.ts`) and threaded into `CompileContext.reachabilityRecord` (L552). **No emit-* function currently reads it** — A-4 is the consumer.

### 2.2 Output write loop (api.js)

`compiler/src/api.js:1410-1542`. Per-source-file output paths computed by `pathFor(filePath, suffix)` at L1435 — uses `computeOutputBaseDir(sourcePaths)` + `dirname(relative(outputBaseDir, filePath))` + `basename(filePath, ".scrml") + suffix`. Per-source-file writes:

| Suffix | Always-on | Notes |
|---|---|---|
| `.server.js` | always | One per source file (preserved by A-4) |
| `.client.js` | browser-mode | A-4 splits this into per-(EP, R, T) chunk files |
| `.html` | browser-mode | A-4 augments to per-(EP, R) shape |
| `.css` | browser-mode | A-4 leaves per-source-file (CSS is component-scoped already; tree-shaking happens per-class in `tailwind-classes.js`) |
| `.client.js.map` | sourceMap | Per-chunk map files in A-4 |
| `.server.js.map` | sourceMap | Unchanged (per source file) |
| `.machine.test.js` | emitMachineTests | Unchanged (per source file) |
| `.test.js` | testMode | Unchanged (per source file) |

Per-source-file `_scrml/<stdlib-name>.js` bundle dir (api.js L1394-1408) is unaffected — stdlib bundling is per-app, not per-route.

The collision guard `E-CG-015` (§47.9.3) is a per-source-file backstop. A-4's per-(EP, R, T) outputs must NOT collide with per-source-file outputs — see OQ-A4-C for the filename namespace question.

### 2.3 §47 content-addressing surface

`SPEC.md §47.1-§47.4` content-addresses JS *binding names* (per-binding FNV-1a hash + base36-seq disambiguator). `§47.5` (L19152-19174) was amended S86 to incorporate §40.9.8 closure-analysis determinism:

> "The §47 content-addressing surface incorporates the closure-analysis output without modification — same source produces same closure produces same per-tier chunk assignments produces same content addresses per chunk." (§47.5 cross-ref to §40.9.8.)

`§47.9` (L19261-19371) governs per-source-file *output paths* (per `<base>.<suffix>` shape). **§47.9 does NOT yet address per-route chunk filenames.** A-4 surfaces this gap as OQ-A4-C (the chunk-filename + chunks.json question).

The FNV-1a hash inputs for binding names (§47.1.3) are stated unchanged by §40.9.8 — A-4's chunk-filename hash inputs are a DIFFERENT hash (chunk-content addressing, not binding addressing). The two surfaces compose; A-4 introduces the chunk-level hash.

### 2.4 Prefetch infrastructure status

**Critical finding.** Grep over `compiler/src/` for `prefetch`, `requestIdleCallback`, `link rel`, `hover`:

- `compiler/src/batch-planner.ts` references "synthetic prefetch" — this is the DATABASE-level prefetch for `?{}` query batching (unrelated to chunk prefetching).
- `compiler/src/runtime-template.js:1200` defines `_scrml_navigate(path)` — uses `window.location.href = path`. No client-side route navigation, no prefetch link.
- `compiler/src/codegen/emit-html.ts` (1570 LOC) — no `<link rel="prefetch">` emission, no hover-event wiring.

**There is NO existing link-prefetch infrastructure in scrml.** The dispatch brief's reference to "existing link-prefetch infrastructure that A-4 reuses" is inaccurate — A-4 builds this from scratch. This affects sub-phase sizing (A-4.3 and A-4.4 are larger than they would be against an existing surface) and adds OQ-A4-G on the runtime prefetch mechanism.

### 2.5 `runtime-chunks.ts` is unrelated

`compiler/src/codegen/runtime-chunks.ts` (203 LOC) is named-subsections of `SCRML_RUNTIME` for runtime-side tree-shaking (chunks: `core`, `reset`, `validators`, `derived`, `lift`, `scope`, `timers`, …). **This is NOT per-route chunking and must not be conflated.** A-4's chunk emission must avoid naming collisions on `runtime-chunks` symbol — recommended A-4 module name: `compiler/src/codegen/route-splitter.ts` or `compiler/src/codegen/chunk-emitter/index.ts`.

### 2.6 Entry-point enumeration is already done

`compiler/src/reachability/entry-points.ts` (RS sub-component) enumerates `ReachabilityEntryPoint[]` per SPEC §40.8 — one entry per `<page>` declaration; one entry per SPA-program. **A-4 does not re-enumerate** — it iterates `ReachabilityRecord.closures.keys()`. The page→file mapping is in the per-page `EntryPointId` shape (`filePath` + `routePath` + `shape: "page" | "spa-program"` + `rootNodeId` per `types/reachability.ts:199-213`).

### 2.7 Adopter context: trucking-dispatch

`examples/23-trucking-dispatch/`. 4 top-level role areas (`pages/dispatch/`, `pages/driver/`, `pages/customer/`, `pages/admin/`), 24+ page files total. Role-enum is `UserRole:enum = { Anonymous, Driver, Dispatcher, Customer, Admin }` (per A-3's role-enum resolver). Per-role chunk variance is load-bearing:

- A `/dispatch/board` page reachable to `Dispatcher` and `Admin` but NOT to `Driver` or `Customer`.
- The `<Header>` component has `<auth role="Admin">` blocks; admit-set varies per role.
- The `<DriverCard>` component is used in both `/dispatch/drivers` (Dispatcher view) and `/driver/home` (Driver view) — different reachability closures per role.

This is the post-A-4-MVP integration test target.

### 2.8 What A-4 inherits structurally from RS

Per `reachability-solver.ts` L213-237 the RS orchestrator already produces the per-(EP, R) `ChunkPlan` shape:

```ts
for (const ep of entryPoints) {
  const rps: RolePlayableSurface = { byRole: new Map() };
  for (const role of c4.effectiveRoles) {
    const roleComponents = filterComponentsByRole(componentIds, role, c4);
    const plan = makeChunkPlan(roleComponents, reactiveCellIds, serverFnTiers, vendorUnitNames);
    rps.byRole.set(role, plan);
  }
  record.closures.set(ep.id, rps);
}
```

**A-4's outer loop is structurally `for (const [epId, rps] of record.closures) for (const [role, plan] of rps.byRole)`.** The per-tier admission is read from `plan.initialChunk` / `plan.prefetchTier1` / `plan.prefetchTier2` / `plan.prefetchTierN`. A-4 does not re-compute closures; it consumes the already-differenced plan.

---

## §3 Sub-phase Decomposition

A-4 decomposes into 7 sub-phases plus a per-sub-phase test suite. Numbering follows the A-2.X / A-3.X precedent (decimal sub-phases).

| ID | Name | h-band | Authority | Dependencies |
|---|---|---:|---|---|
| A-4.1 | Codegen orchestrator slot + per-(EP, role) iteration scaffold | 8-14h | §40.9.7 + PIPELINE Stage 8 | A-2.5 (per-role ChunkPlan), A-3.5 (AuthGraph wired) |
| A-4.2 | `initial_chunk(E, R)` emission — JS atom composition + chunk-file write | 12-20h | §40.9.7 + §47.5 | A-4.1 |
| A-4.3 | `prefetch_tier_1(E, R)` emission + idle-prefetch runtime wiring | 10-18h | §40.9.7 (tier-1 normative) | A-4.2 |
| A-4.4 | `prefetch_tier_2(E, R)` emission + hover-prefetch runtime wiring | 10-18h | §40.9.7 (tier-2 normative) | A-4.3 |
| A-4.5 | `prefetch_tier_N` (N≥3) on-demand dispatch hook | 4-8h | §40.9.7 (tier-N normative) | A-4.4; structurally no-op v0.3 |
| A-4.6 | §47 content-addressing integration — per-chunk hash + chunks.json manifest | 10-18h | §47.5 (§40.9.8 cross-ref) | A-4.2 |
| A-4.7 | Per-route HTML augmentation + role-aware emission + W-CG-CHUNK-* lints | 8-14h | §40.9.7 + §40.8 | A-4.2..A-4.6 |
| | **A-4 sub-total** | **62-110h** | | |
| (A-4.X) | Integration tests + worked-example replay | folded into A-5 | | post-A-4 |

The h-band totals **62-110h** — sits inside the Insight 29 architect band of 60-120h. Margin reserved for the prefetch-mechanism question (OQ-A4-G — Bun primitive vs `requestIdleCallback`) and the chunks.json shape ratification (OQ-A4-A) which may add 4-8h depending on disposition.

### 3.1 A-4.1 — Codegen orchestrator slot + per-(EP, role) iteration scaffold

**Scope.** Author the per-(EP, R, T) iteration scaffold in a new module `compiler/src/codegen/route-splitter.ts` (or `compiler/src/codegen/chunk-emitter/` directory). Wire it into `compiler/src/codegen/index.ts:runCG` after the per-file analyze/plan/emit pass. The scaffold reads `input.reachabilityRecord` (already threaded at L120) and produces an empty per-(EP, R, T) plan-iteration log — no actual emission yet.

**Files touched.**
- `compiler/src/codegen/route-splitter.ts` (new, ~150 LOC scaffold)
- `compiler/src/codegen/index.ts` (modify ~30 LOC at the per-file emit-loop boundary)
- `compiler/src/codegen/context.ts` (modify ~10 LOC if route-splitter context needs a new field)

**Spec authority.** SPEC §40.9.7 (per-tier output structure), PIPELINE Stage 8 (codegen orchestrator).

**Tests.** A scaffold test asserting that for a 3-page-2-role corpus the splitter is invoked `3 * 2 = 6` times with the correct (EpId, RoleVariant) pair each invocation. No file output yet.

**Risk surface.** Low. Scaffold-level.

### 3.2 A-4.2 — `initial_chunk(E, R)` emission

**Scope.** Compose the initial-chunk JS payload per (EP, R) from the existing per-file atom emission. Per `ChunkPlan.initialChunk`:

1. **componentNodeIds** — for each NodeId, look up the originating fileAST and component-block; emit the component's runtime-render code into the chunk. Reuse `emit-client.ts:generateClientJs` atom-emission helpers — they currently emit per-file IIFE; A-4.2 calls them per-component-id, accumulates into the chunk buffer.
2. **reactiveCellNodeIds** — emit the reactive subscription scaffolding for each cell.
3. **serverFnNodeIds** — emit the fetch-wrapper client-side stubs (these are already emitted today by `emit-client.ts`; A-4.2 emits ONLY the subset admitted by the chunk).
4. **vendorUnitNames** — emit the vendor-unit import/inline per §41 (chunks reference the vendor unit by name; the unit itself is a separate per-app artifact).

The initial-chunk file is written to: `<outputDir>/<route-path>/<role-tag>.initial.<hash>.js` (filename shape ratified at OQ-A4-C).

The chunk's JS shape is a self-contained IIFE that registers components/cells with the runtime — same shape as current per-file `.client.js` but admission-filtered to the chunk's set.

**Files touched.**
- `compiler/src/codegen/route-splitter.ts` (~250 LOC)
- `compiler/src/codegen/emit-client.ts` (refactor: extract atom-emitters from the monolithic IIFE; ~80 LOC churn — additive, no semantics change)
- `compiler/src/codegen/index.ts` (~10 LOC — invoke splitter per CG output)
- `compiler/src/api.js` (~30 LOC — extend write loop to emit chunk files)

**Spec authority.** SPEC §40.9.7 (initial_chunk normative); §47.5 (content-addressing cross-ref); §47.9 (path-preserve rule applies to the route-URL portion of the chunk path).

**Tests.**
- The §40.9.9 worked-example replay (SPA `/` page, viewer = Driver): asserts initial chunk contains `{ Header (without admin link), Dashboard, button handler, @count, ProfileWidget, fetchUser stub, @user }` per the SPEC L17871-17872 normative example.
- Per-role variance test: same SPA, viewer = Admin admits the admin-link; viewer = Driver doesn't.
- Determinism test: two builds of identical source produce identical chunk-content hashes (R1 reproducibility per dive A).

**Risk surface.** Medium. The atom-emitter extraction from `emit-client.ts` is the biggest churn — needs care to not regress the existing single-file emit path during the transition. Per OQ-A4-F backwards-compat (opt-in flag) the per-file path remains the default until A-4 ships fully.

### 3.3 A-4.3 — `prefetch_tier_1(E, R)` emission + idle-prefetch runtime wiring

**Scope.** Emit the tier-1 delta chunk file per (EP, R) AND the idle-prefetch runtime mechanism that fetches it after first paint.

The runtime mechanism (OQ-A4-G — disposition needed before this sub-phase dispatches) is one of:

- **Option α — `requestIdleCallback`.** Standard browser API; falls back to `setTimeout(fn, 1)` for Safari (which still lacks support as of 2026). SPEC §40.9.7 SHOULD-suggests this.
- **Option β — Bun-runtime primitive.** SPEC §40.9.7 mentions "or the equivalent Bun-runtime primitive" but no such primitive exists in Bun 1.2.x as of S91 — confirmed via Bun docs grep.
- **Option γ — Hybrid.** Use `requestIdleCallback` browser-side; the Bun-runtime primitive remains a v0.4 extension point.

Default disposition: Option α (concrete, ships now). Bun-primitive is deferred to v0.4 if/when one exists.

The idle-prefetch wiring is one runtime function (`_scrml_prefetch_tier1(chunkUrl)`) emitted into `SCRML_RUNTIME` as a new chunk-section in `runtime-chunks.ts` (named e.g. `prefetch`). Called from the initial-chunk IIFE tail.

**Files touched.**
- `compiler/src/codegen/route-splitter.ts` (~80 LOC for tier-1 emit)
- `compiler/src/runtime-template.js` (~40 LOC for `_scrml_prefetch_tier1` + idle-callback fallback)
- `compiler/src/codegen/runtime-chunks.ts` (~10 LOC for the new `prefetch` chunk marker)
- `compiler/src/codegen/emit-client.ts` (~10 LOC for IIFE-tail `_scrml_prefetch_tier1` call)

**Spec authority.** SPEC §40.9.7 tier-1 normative paragraph (L17788).

**Tests.** Chunk-shape test (tier-1 file contains only the delta set); runtime test (initial-chunk IIFE issues idle-callback fetch for the tier-1 URL); determinism test.

**Risk surface.** Medium-low. The runtime mechanism choice is the load-bearing OQ (G); once disposed, emission shape is straightforward.

### 3.4 A-4.4 — `prefetch_tier_2(E, R)` emission + hover-prefetch runtime wiring

**Scope.** Emit the tier-2 delta chunk file per (EP, R) AND the hover-prefetch runtime mechanism. Hover-prefetch fires when:

- An `<a href="/other-route">` link is hovered or focused — the tier-2 chunk for `/other-route` is fetched (the route is itself an entry point with its own initial chunk; tier-2 corresponds to the **target route's initial chunk** prefetched on hover, NOT the current route's tier-2).
- A focus-or-hover-trigger on an interactive component within the current route fires the chunk fetch for that component's tier-2 cascade.

**Critical disambiguation per §40.9.9 worked example.** The §40.9.7 tier-2 semantics has two distinct shapes:

1. **Cross-route hover prefetch.** `<a href="/loads">` in the current page hovered → fetch `/loads`'s initial chunk. This is a **cross-route** tier-2 hint; the chunk URL is `<other-route>/<role>.initial.<hash>.js`, NOT a "tier-2" chunk of the current page.
2. **Intra-route deep-interaction prefetch.** A component within the current page whose deep-interaction cascade (N=2) admits new components — those components are in `ChunkPlan.prefetchTier2.componentNodeIds`. Hover-or-focus on the interactive component fires the fetch.

Cross-route hover prefetch is the dominant case (corresponds to `<a>` link hovers — the trucking-dispatch nav bar use case). Intra-route deep-interaction is currently empty per RS A-2.5 floor (`prefetchTier2.componentNodeIds = new Set()`); it remains structurally supported but admits no content in v0.3.

**Files touched.**
- `compiler/src/codegen/route-splitter.ts` (~100 LOC for tier-2 emit + cross-route hover-prefetch wiring)
- `compiler/src/runtime-template.js` (~50 LOC for `_scrml_prefetch_tier2(routePath, role)` + hover handler attachment)
- `compiler/src/codegen/emit-html.ts` (~30 LOC — wire `data-scrml-prefetch="<route>"` attributes onto `<a href>` elements during HTML emission so the runtime can attach hover handlers)
- `compiler/src/codegen/runtime-chunks.ts` (~5 LOC — extend the `prefetch` chunk to cover tier-2)

**Spec authority.** SPEC §40.9.7 tier-2 normative paragraph (L17789).

**Tests.** Cross-route hover prefetch test (hover on `<a href="/loads">` fires fetch for `/loads/<role>.initial.<hash>.js`); intra-route hover prefetch test (focus-or-hover on the interactive component fires fetch — empty in v0.3 but the wiring is present); determinism test.

**Risk surface.** Medium. The cross-route-vs-intra-route disambiguation requires care; getting it wrong produces wasted fetches (false positives) or missing fetches (false negatives, hurting feel-of-performance).

### 3.5 A-4.5 — `prefetch_tier_N` (N≥3) on-demand dispatch hook

**Scope.** Emit the dispatch hook in the runtime that fetches an N≥3 chunk on actual user traversal. Per OQ-A2-B Option a (ratified S89) the RS solver currently emits `prefetchTierN: []` — no N≥3 chunks are produced. A-4.5 emits the runtime-side machinery (`_scrml_fetch_chunk(epId, role, tier)`) so it's wired and ready when RS extends to N≥3 in v0.4 or later. In v0.3.0 the dispatch never fires (empty tier-N).

**Files touched.**
- `compiler/src/runtime-template.js` (~20 LOC for `_scrml_fetch_chunk(epId, role, tier)`)
- `compiler/src/codegen/runtime-chunks.ts` (~3 LOC marker extension)

**Spec authority.** SPEC §40.9.7 tier-N normative (L17790-17791).

**Tests.** Runtime test asserting `_scrml_fetch_chunk` is callable and resolves a chunk URL deterministically; no integration test required (RS emits empty tier-N in v0.3).

**Risk surface.** Trivial.

### 3.6 A-4.6 — §47 content-addressing integration

**Scope.** Compute the content-address hash for each emitted chunk per OQ-A4-C disposition and integrate into the chunk filename. Emit the `chunks.json` manifest if OQ-A4-A disposes IN FAVOR of it.

Hash inputs per §47.5 (§40.9.8 cross-ref): all inputs to `playable_surface(E, R, N)` PLUS the chunk's content-bytes itself. Deterministic-from-source-only per §40.9.8. The hash is FNV-1a (§47.1.3 algorithm) over a canonical concatenation:

```
canonical_chunk_input := <serialized ChunkContents (ordered)> | <chunk_js_bytes>
chunk_hash := fnv1a_base36(canonical_chunk_input)[0..8]
```

The chunk filename incorporates `chunk_hash`; the chunks.json manifest maps `(EntryPointId, RoleVariant, Tier) → chunk_filename`.

**Files touched.**
- `compiler/src/codegen/route-splitter.ts` (~80 LOC for hash + manifest emit)
- `compiler/src/codegen/type-encoding.ts` (extract FNV-1a helper into a shared util — no semantic change to existing per-binding name encoding)
- `compiler/src/api.js` (~30 LOC for chunks.json write)

**Spec authority.** §47.5 (closure-analysis content-addressing cross-ref); §40.9.8 (determinism preservation). §47.1.3 (FNV-1a algorithm) unchanged.

**Tests.** Determinism test — same source produces same chunk hashes byte-for-byte; chunks.json manifest is well-formed JSON; the manifest entries match the emitted chunk filenames.

**Risk surface.** Medium-low. The hash-input ordering must be canonicalized carefully (per §47.1.4 canonical-string normalization analogue).

### 3.7 A-4.7 — Per-route HTML augmentation + role-aware emission + W-CG-CHUNK-* lints

**Scope.** Augment the per-route HTML to:

1. Reference the initial-chunk script (`<script src="<route>/<role>.initial.<hash>.js"></script>`).
2. Emit `<link rel="modulepreload">` or equivalent hints for tier-1 chunks. (Tier-1 is fetched via runtime `requestIdleCallback` not via `<link rel="prefetch">` browser-driven — the SHOULD-suggest in §40.9.7 is runtime-mediated; modulepreload is an additional belt-and-suspenders surface.)
3. Wire `data-scrml-prefetch="<route>"` attributes on `<a href>` elements that target other entry points (consumed by the hover-prefetch runtime per A-4.4).

The per-(route, role) HTML question is OQ-A4-E: does scrml emit ONE HTML per route with runtime role-detection, or per-(route, role) HTML with server-side role-routing?

**Files touched.**
- `compiler/src/codegen/route-splitter.ts` (~30 LOC for HTML augmentation orchestration)
- `compiler/src/codegen/emit-html.ts` (~80 LOC for chunk-aware script/link emission + `data-scrml-prefetch` wiring)
- `compiler/src/codegen/errors.ts` (~20 LOC for the W-CG-CHUNK-* lint catalog)

**Spec authority.** SPEC §40.9.7 (per-tier output structure); §40.8 (v0.3 program shape); §47.9.2 (route URL inference).

**Tests.** HTML-output assertion test (initial-chunk script tag present, hover-prefetch `data-` attributes wired, role-aware script src); determinism test; lint test for new W-CG-CHUNK-* codes.

**Risk surface.** Medium. The per-role HTML question (OQ-A4-E) is load-bearing — defer until ratified.

---

## §4 Implementation-Shape Proposals

Three shapes catalogued. Recommended at §5.

### 4.1 Shape A — Per-file orchestrator extension

**Codegen orchestrator pattern.** Each source-file emission produces `N × M × T` outputs where N = entry-points in this file, M = role variants, T = tier count. Chunk dispatch lives inside the per-file emit code at `emit-client.ts`. The existing per-file loop in `index.ts:runCG` iterates files; each iteration internally iterates per-(EP, R, T).

**Output file structure.**
```
dist/
  app.scrml's outputs:
    app.<role>.initial.<hash>.js
    app.<role>.tier1.<hash>.js
    app.<role>.tier2.<hash>.js
    app.html
  pages/dispatch/board.scrml's outputs:
    dispatch/board.<role>.initial.<hash>.js
    dispatch/board.<role>.tier1.<hash>.js
    dispatch/board.<role>.tier2.<hash>.js
    dispatch/board.html
  chunks.json (optional, see OQ-A4-A)
```

**Runtime prefetch machinery.** Per-file IIFE tail calls `_scrml_prefetch_tier1(myEpId, myRole)`; hover handlers attached during initial-chunk DOM hydration.

**Effort.** ~50-90h (lower end of the band — minimal new module structure, mostly modify-in-place to existing emit-client.ts).

**Risks.**
- **Loose coupling between emit-client.ts and ChunkPlan iteration.** The per-(EP, R, T) iteration is buried inside per-file emit code; new contributors hunting "where do chunks come from" land in emit-client.ts which is already 1371 LOC. Cognitive cost.
- **Component atoms duplicated across chunk files when shared.** A `<DriverCard>` used in 3 routes would be inlined in 3 initial-chunks (each emit-client.ts pass produces its own copy). Inhibits the §41 vendor-unit-sharing equivalent for component atoms.
- **Per-(EP, R) HTML emission lives in a file-aware loop that doesn't know about cross-file entry points** — A-4.7's per-route HTML needs to compose across files for `<page>` declarations that import components from other files. Awkward inversion.

### 4.2 Shape B — New per-route orchestrator above per-file codegen (RECOMMENDED)

**Codegen orchestrator pattern.** A NEW module `compiler/src/codegen/route-splitter.ts` (or `chunk-emitter/` dir) sits ABOVE the existing per-file codegen pipeline. It iterates `for ([epId, rps] of reachabilityRecord.closures) for ([role, plan] of rps.byRole) for (tier in plan)` — three nested loops at the outermost orchestrator level. Per-tier emission composes per-component atoms PRODUCED by the existing per-file codegen (which is unchanged at the atom-production level).

The contract: per-file codegen produces a *registry* of component atoms `Map<NodeId, ComponentAtom>` (where `ComponentAtom` is `{ js, css, htmlScaffold, references: { reactiveCellIds, serverFnIds, vendorUnits } }`). The route-splitter consumes this registry per ChunkPlan and composes atoms into per-(EP, R, T) chunk files.

**Output file structure.**
```
dist/
  _atoms/         # per-app shared atoms, content-addressed (optional — see OQ-A4-A)
    _c<hash>.js
  pages/dispatch/board/<role>.initial.<hash>.js
  pages/dispatch/board/<role>.tier1.<hash>.js
  pages/dispatch/board/<role>.tier2.<hash>.js
  pages/dispatch/board.html         # one per route; role-disambiguated at runtime OR
  pages/dispatch/board.<role>.html  # one per (route, role) — OQ-A4-E
  pages/dispatch/customers.scrml's outputs … (same shape)
  app.server.js, app.html, pages/dispatch/board.server.js  # per-source-file outputs preserved
  chunks.json                        # manifest, content-address indexed
```

**Runtime prefetch machinery.** A new SCRML_RUNTIME chunk `prefetch` ships `_scrml_prefetch_tier1` / `_scrml_prefetch_tier2` / `_scrml_fetch_chunk(epId, role, tier)`. Initial-chunk IIFE tail invokes tier-1 idle-prefetch; hover handlers attached via `data-scrml-prefetch="<route>"` attributes from A-4.7.

**Effort.** ~62-110h (per §3 sub-phase sum).

**Risks.**
- **Atom-registry contract is a new spec surface.** `ComponentAtom`'s shape is internal to the compiler; no SPEC text yet. Manageable — it's a compiler-internal contract not visible to adopters.
- **Bigger upfront refactor** of `emit-client.ts` to extract atom-emitters (A-4.2 churn). Larger blast radius during the transition wave.
- **Cross-route hover-prefetch wiring is non-trivial** — needs per-link route-URL lookup against the entry-point set during HTML emission (A-4.7).

### 4.3 Shape C — Inline transform of existing codegen output (post-processing pass)

**Codegen orchestrator pattern.** The existing per-file codegen runs UNCHANGED; produces per-file `.client.js` exactly as today. A NEW post-processing pass takes each per-file output, parses it (light JS AST or string-walking), and splits the exports across the per-(EP, R, T) chunk shape per `ChunkPlan` admission. Output is the chunk files; per-file `.client.js` is discarded (or kept under the opt-out flag per OQ-A4-F).

**Output file structure.** Same as Shape B at the chunk level; but the source-of-truth for chunk contents is the post-processed per-file `.client.js` — not a clean atom-registry.

**Runtime prefetch machinery.** Same as Shape B.

**Effort.** ~50-80h (smallest blast radius — minimal change to existing emit code; new post-processing pass is the main item).

**Risks.**
- **String-walking or re-parsing the emitted JS is fragile.** The existing `.client.js` is a monolithic IIFE with closed-over scope. Splitting it across chunks while preserving closure semantics requires either re-parsing back to AST (expensive, error-prone) or careful regex-shape post-hoc string-splitting (brittle).
- **Per-tier dispatch wiring needs to be IN the emit code, not post-hoc.** Idle-callback fetch trigger, hover-handler attachment, runtime `_scrml_fetch_chunk` dispatch — these need to be present in the initial-chunk JS itself, not bolted on post-emit. Post-processing has to inject these strings, which is fragile.
- **Cross-route hover prefetch needs per-link route lookups** — even more fragile when computed post-HTML-emit than at emit time.
- **Determinism is harder.** A post-processing pass that string-splits introduces a non-source input (the emitted JS string), even though that JS is itself deterministic. The content-addressing hash inputs must include the post-processing logic version, which adds a "compiler version" axis that §40.9.8 forbids.

The §40.9.8 determinism issue is particularly load-bearing — Shape C effectively re-introduces the kind of "compiler-version-as-axis" that the Insight 29 verdict explicitly deferred to v2 (B-camp). Shape C structurally violates the §40.9.8 spec constraint.

---

## §5 Recommendation + Rule-3 Justification

**RECOMMEND Shape B.** Three reasons:

1. **Aligns with `ReachabilityRecord`'s already-computed per-(EP, R) iteration shape.** RS already produces per-(EP, R) `ChunkPlan` (`reachability-solver.ts` L213-237). Shape B's outermost loop literally iterates `record.closures.entries()`; the impedance match is exact. Shape A inverts the iteration order (file-outer, EP-inner) which forces re-keying through per-file context; Shape C runs the iteration TWICE (once during per-file emit, again during post-processing).

2. **Cleanest §47 content-addressing integration.** The per-chunk hash needs canonical input ordering (§47.1.4 analogue). With Shape B the canonical input is `(EpId, RoleVariant, Tier, componentAtoms[], reactiveCells[], serverFns[], vendorUnits[])` — every input is already structured at the orchestrator. Shape A's per-file inversion makes the canonical-input boundary unclear (which file's iteration "owns" the cross-file component atom?). Shape C derives chunk hashes from string-split outputs, which §40.9.8 explicitly forbids (it would introduce a compiler-version axis through the post-processing logic).

3. **Preserves per-file codegen as the atom-emission stage.** The existing per-file emitters (`emit-client.ts`, `emit-html.ts`, `emit-server.ts`, etc.) stay as the source of truth for HOW a component is compiled to JS. Shape B introduces a route-splitter ABOVE them that composes their output — separation of concerns is clean. Shape A buries the chunk dispatch inside `emit-client.ts` which is already 1371 LOC; Shape C reaches INTO the emitted JS string, which is the strongest possible coupling against the worst possible interface.

Rule-3 ("right answer beats easy answer"): Shape C is the easiest (smallest diff to existing code) but its determinism violation per §40.9.8 makes it structurally wrong. Shape A is medium effort but has the iteration-order inversion + the component-atom-duplication issue. Shape B is the largest effort (62-110h vs Shape C's 50-80h) but is the only shape that:

- Cleanly consumes RS output without re-iterating.
- Preserves §47 / §40.9.8 determinism without introducing a compiler-version axis.
- Separates atom production (per-file codegen, unchanged) from chunk composition (new module, well-scoped).

The right answer absorbs the higher upfront cost.

---

## §6 Open Questions for PA / User Ratification

Six OQs. Each provides 2-4 options + default + load-bearing reason. Bracketed `[OQ-A4-X]` is the citation tag used by sub-phase tests + downstream specs.

### OQ-A4-A — chunks.json manifest shape

Does A-4 emit a per-app `chunks.json` manifest mapping `(EntryPointId, RoleVariant, Tier) → chunk_filename`?

| Option | Description | Cost |
|---|---|---|
| a | YES, emit `chunks.json` always (single per-app manifest, JSON, content-addressed) | +5-10h A-4.6; observable manifest enables adopter debug tooling + future Bun dev-server integration |
| b | NO, do not emit a manifest; chunks self-discover via filename convention | -5-10h A-4.6; harder for adopter tools to introspect; no manifest = no canonical content-address index |
| c | OPT-IN flag `--emit-chunks-manifest` (default off in v0.3, on in v0.4 after the shape stabilizes) | 0h (cheap to add); preserves optionality |

**Default recommendation: a (YES, always emit).** Load-bearing reason: the manifest is the content-addressed index — without it, the chunks.json contract that adopter tools (Bun dev-server hot-reload, debug inspectors, future telemetry-PGO surface in v2) need to consume requires re-derivation from filename conventions. Per §40.9.8 the manifest is itself deterministic-from-source-only — same source produces same manifest. The cost is trivial; the absence is permanent.

**Shape suggestion** (for ratification at A-4.6 dispatch, not pre-disposed):
```json
{
  "version": 1,
  "compiler": "scrml-0.3.0",
  "entryPoints": {
    "/dispatch/board": {
      "Dispatcher": {
        "initial": "_atoms/_c<hash>.js",
        "tier1": "_atoms/_c<hash>.js",
        "tier2": "_atoms/_c<hash>.js"
      },
      "Admin": { … }
    },
    "/": { … }
  }
}
```

### OQ-A4-B — refinement of `prefetchTier1` / `prefetchTier2` component-side admission (DEFER)

Currently `ChunkPlan.prefetchTier1.componentNodeIds` and `prefetchTier2.componentNodeIds` are always empty (`reachability-solver.ts` L316-326 — per A-2.5 conservative ship-eagerly floor; only server-fn-side admission has content). Should A-4 surface a follow-up to refine RS's component-side tier admission so it admits N=1 / N=2 components, or accept the floor and ship A-4 against it?

| Option | Description | Disposition |
|---|---|---|
| a | DEFER — A-4 ships against the RS floor (component-side tier-1/tier-2 always empty); RS extension is queued separately | recommended |
| b | A-4 includes a follow-up RS sub-phase (A-2.X) to refine component-side admission as a precondition | costly; +40-80h pre-A-4 work |

**Default recommendation: a (DEFER).** Load-bearing reason: A-4 is structurally complete against the RS floor — the tier-1/tier-2 chunks are emitted, the runtime mechanism is wired, the determinism is preserved. RS refining its tier admission is additive (chunks become non-empty over time) without breaking A-4's output shape. Per OQ-A2-B Option a (S89 ratification) the N≥3 floor IS the v0.3 disposition; the same posture applies to component-side admission. A-2.X future-refinement work tracks the open question separately.

### OQ-A4-C — chunk filename + per-role disambiguation

What filename shape does A-4 emit for chunk files? Three sub-questions:

(i) **Per-route directory or flat?**
- `dist/pages/dispatch/board/Dispatcher.initial.<hash>.js` (per-route directory)
- `dist/dispatch_board_Dispatcher_initial_<hash>.js` (flat)

(ii) **Role tag in filename or in directory?**
- `<route>/<role>.initial.<hash>.js` (role in filename) — recommended
- `<route>/<role>/initial.<hash>.js` (role in directory)

(iii) **Hash position?**
- `<role>.initial.<hash>.js` — recommended (hash is the disambiguator; suffix is `.js`)
- `<role>.initial.js.<hash>` — non-standard

**Default recommendation:** `dist/<route-path>/<RoleVariant>.<tier>.<8-char-hash>.js`. Per the §47.9.2 path-preserve rule the route portion of the chunk path mirrors the source-tree relative position. Per-role is a leaf disambiguator. Per-tier is `initial` / `tier1` / `tier2` / `tierN<N>`. The hash is FNV-1a base36 (8 chars per §47.1.3).

Example: `dist/pages/dispatch/board/Dispatcher.initial.a4b9c2d1.js`.

Per-route directory (i.a) preferred over flat (i.b) because filesystem inspectors group routes by directory naturally; the flat shape collapses to underscore-separated identifiers that are hard to read.

Role tag in filename (ii.a) preferred over role tag in directory (ii.b) because the per-route directory contains a small number of files (4 tiers × ~3-5 roles = 12-20 files) — filesystem-flat is easier to scan than nested.

### OQ-A4-D — `prefetch_tier_N` (N≥3) policy in v0.3

| Option | Description |
|---|---|
| a | A-4.5 emits the runtime dispatch hook `_scrml_fetch_chunk(epId, role, tier)`; RS emits empty `prefetchTierN: []` per OQ-A2-B Option a; v0.3 ships the wiring with zero N≥3 chunks |
| b | A-4.5 is dropped from v0.3; tier-N is queued to v0.4 as a separate sub-phase |
| c | A-4 hard-caps at tier-2; the runtime mechanism does not exist; v0.4 introduces both RS-side admission AND runtime-side dispatch |

**Default recommendation: a.** Load-bearing reason: A-4.5 is 4-8h scaffold cost that wires the dispatch surface NOW so v0.4 can populate it later without re-touching A-4's runtime emission. The wiring is structurally a no-op in v0.3 (no chunks fire it) but it lifts the future-compat surface into the v0.3.0 cut. Option b adds two waves of churn (drop now, re-add later). Option c is the most conservative but leaves a future-compat hole that's harder to fill in v0.4.

### OQ-A4-E — Per-role HTML emission shape

Per the §40.9.9 worked example, the same route URL `/` admits different playable surfaces for `Driver` vs `Admin` (Admin sees the admin-link; Driver doesn't). Does A-4 emit:

| Option | Description |
|---|---|
| a | ONE HTML per route; runtime detects role via `_scrml_role()` and conditionally renders the chunk script for the role | one HTML per route; client-side role detection |
| b | ONE HTML per (route, role) tuple; server-side role-routing dispatches to the right HTML at request time | one HTML per (route, role); server-side role-aware delivery |
| c | Hybrid — ONE HTML per route + per-role chunk scripts; the route HTML imports a small role-detection bootstrap script which then loads the right initial chunk | recommended |

**Default recommendation: c (hybrid).** Load-bearing reason: option (a) is brittle — the HTML body is statically rendered, but the admit-set differs per role (Header includes Admin link or doesn't); a single HTML cannot statically encode all role-specific markup. Option (b) explodes the per-route output count (24 trucking-dispatch pages × 5 roles = 120 HTML files) and couples HTML emission to server-side role-routing infrastructure which scrml doesn't have today. Option (c) emits ONE HTML per route with a small (~200-byte) bootstrap script that reads `document.cookie` / `localStorage` / `<meta>` role hint and dispatches to the role-appropriate initial chunk; per-role markup variance is rendered client-side as the initial chunk hydrates. This composes with the existing `<auth role=>` runtime gating (per A-3's runtime-fallback semantics — admit-set differences ARE classified at compile time; the HTML reflects the per-role variance via the initial chunk's IIFE).

Per-route HTML is the SAME bytes for every role. Per-role variance is in the initial chunk. This is the simplest spec-shape.

### OQ-A4-F — Backwards-compatibility (opt-in vs opt-out)

Does A-4 replace per-file `.client.js` emission with chunk emission by default, or is the per-file path preserved with chunk emission gated behind a flag?

| Option | Description |
|---|---|
| a | DEFAULT-ON. A-4 chunks become the v0.3.0 default; per-file `.client.js` is removed for any source that declares a `<page>` or is a SPA-program entry-file. Non-entry files (component-only files imported by entry files) no longer emit a sibling `.client.js`. |
| b | OPT-IN flag `--emit-chunks` for v0.3.0 (default off). v0.3.1 turns default on. v0.4 removes the per-file path entirely. |
| c | OPT-IN flag during v0.3.0 development; default-on at the v0.3.0 cut release. |

**Default recommendation: c.** Load-bearing reason: A-4 lands during v0.3.0 active development. The default-off opt-in (option b) loses the integration test signal — bugs in chunk emission don't surface during normal compiler tests because the chunks aren't built. Option a (default-on from the first A-4.1 dispatch) is brittle — A-4.1 through A-4.7 land incrementally and adopters between A-4.1 and A-4.7 land would hit half-built chunks. Option c builds during v0.3.0, opt-in during the wave, default-on at the cut release — gives test signal during development (the opt-in flag is set in test fixtures) without breaking adopter builds mid-wave.

### OQ-A4-G — Tier-1 prefetch runtime mechanism

| Option | Description |
|---|---|
| α | `requestIdleCallback` browser-side; `setTimeout(fn, 1)` fallback for Safari and older browsers |
| β | Bun-runtime primitive — DOES NOT EXIST in Bun 1.2.x as of S91 |
| γ | Hybrid — `requestIdleCallback` browser-side now; reserved Bun-primitive extension point for v0.4 if Bun ships one |

**Default recommendation: γ.** Load-bearing reason: option β is empirically not available — Bun 1.2.x has no idle-callback primitive. Option α is the concrete browser-side mechanism that ships now. Option γ is α with a v0.4 extension reservation — the runtime function `_scrml_prefetch_tier1` has a single implementation today (`requestIdleCallback` + Safari fallback) and the extension surface is added to `runtime-template.js` as a comment block flagging the future Bun integration. Zero cost; positive future-compat.

---

## §7 Effort + Sequencing

### 7.1 Sub-phase sequencing

```
A-4.1 (orchestrator scaffold)
   │
   ▼
A-4.2 (initial chunk emission) ──┬──> A-4.6 (content-addressing)
   │                             │
   ▼                             ▼
A-4.3 (tier-1 idle)           A-4.7 (HTML augmentation)
   │
   ▼
A-4.4 (tier-2 hover)          dispatch sequencing: A-4.6 + A-4.7 can run
   │                          in parallel after A-4.2 lands
   ▼
A-4.5 (tier-N hook)
```

Critical path: A-4.1 → A-4.2 → A-4.3 → A-4.4 → A-4.5. Each dispatches sequentially once the prior lands. A-4.6 + A-4.7 are parallelizable post-A-4.2.

### 7.2 Aggregate effort

| Phase | h-band | Cumulative |
|---|---:|---:|
| A-4.1 | 8-14 | 8-14 |
| A-4.2 | 12-20 | 20-34 |
| A-4.3 | 10-18 | 30-52 |
| A-4.4 | 10-18 | 40-70 |
| A-4.5 | 4-8 | 44-78 |
| A-4.6 | 10-18 | 54-96 |
| A-4.7 | 8-14 | 62-110 |

**Total: 62-110h.** Sits inside Insight 29 band (60-120h). Margin reserved for OQ disposition + per-sub-phase test surface (each sub-phase carries ~2-4 unit tests).

### 7.3 Dependencies external to A-4

- **A-2.7 outer fixpoint** must close before A-4.1 dispatches (A-4.1 reads `ReachabilityRecord`'s post-fixpoint shape).
- **A-3.5** is already closed (S91 `bf2b098`) — AuthGraph + per-gate classification is in-tree.
- **A-1** closed S89 — markup-context DG edges are populated.

No external dependencies block A-4 once A-2.7 closes.

---

## §8 References

### 8.1 SPEC.md anchors

- `compiler/SPEC.md` §40.9.0 (L17645-17653) — closure analysis overview, normative motivation.
- `compiler/SPEC.md` §40.9.1 (L17655-17677) — `playable_surface(E, N)` formalization (RS contract, A-4 input).
- `compiler/SPEC.md` §40.9.7 (L17774-17793) — per-tier output structure (A-4's primary normative anchor).
- `compiler/SPEC.md` §40.9.8 (L17794-17812) — determinism preservation (A-4 must preserve §47 content-addressing).
- `compiler/SPEC.md` §40.9.9 (L17814-17882) — worked example (A-4.2 integration test target).
- `compiler/SPEC.md` §40.9.11 (L17899-17912) — error codes (E-CLOSURE-001/002, W-AUTH-RUNTIME-FALLBACK — fire-sites are RS, NOT A-4; A-4 introduces no new error codes in v0.3 but adds W-CG-CHUNK-* lints in A-4.7).
- `compiler/SPEC.md` §47.5 (L19152-19174) — content-addressing scope of application + §40.9.8 cross-ref.
- `compiler/SPEC.md` §47.9 (L19261-19371) — output path encoding + path-preserve rule (the rule A-4 extends to per-route chunk directories).
- `compiler/SPEC.md` §47.10 (L19373-19410) — relative import path rewrites (A-4 must NOT regress this; chunk-imports stay in dist tree, not source tree).
- `compiler/SPEC.md` §40.8 (L17540-17600) — v0.3 program shape (entry-point enumeration source).

### 8.2 PIPELINE.md anchors

- `compiler/PIPELINE.md` Stage 7.6 (L2332-2412) — Reachability Solver stage contract (A-4 input contract).
- `compiler/PIPELINE.md` Stage 8 (L2414-2495) — Code Generator stage contract (A-4's stage).

### 8.3 Compiler source

- `compiler/src/types/reachability.ts` (360 LOC) — `ReachabilityRecord` / `RolePlayableSurface` / `ChunkPlan` / `ChunkContents` type shapes. The full A-4 input surface.
- `compiler/src/reachability-solver.ts:213-330` — RS per-(EP, R) ChunkPlan production (the loop A-4 mirrors).
- `compiler/src/reachability-solver.ts:303-330` — `makeChunkPlan` (the tier-differencing logic A-4 consumes).
- `compiler/src/codegen/index.ts:120` — `CgInput.reachabilityRecord` field (already wired, A-2.1 pre-wire).
- `compiler/src/codegen/index.ts:150-845` — `runCG` orchestrator (A-4.1 inserts the route-splitter here).
- `compiler/src/codegen/index.ts:809-821` — per-file `browserOutput` assembly (A-4 replaces single-`.client.js` with per-(EP, R, T) chunks for entry-bearing files).
- `compiler/src/codegen/context.ts:90, 132` — `CompileContext.reachabilityRecord` per-file threading.
- `compiler/src/api.js:1410-1542` — output write loop (A-4 extends with chunk-file writes + chunks.json).
- `compiler/src/api.js:1435-1467` — `pathFor` + `writeOutput` (A-4 augments with per-(EP, R, T) path computation).
- `compiler/src/reachability/entry-points.ts` — entry-point enumeration (A-4 does not re-enumerate; reads from RS output).
- `compiler/src/runtime-template.js:1200` — `_scrml_navigate` (the closest existing routing primitive; A-4 introduces `_scrml_prefetch_tier1/2`, `_scrml_fetch_chunk`).
- `compiler/src/codegen/runtime-chunks.ts` (203 LOC) — named-subsection tree-shaking; A-4 adds a new `prefetch` chunk for the prefetch runtime functions. NOTE: do not conflate this with per-route chunking.
- `compiler/src/codegen/emit-html.ts` (1570 LOC) — A-4.7 inserts chunk-aware script tags + hover-prefetch `data-` attributes.
- `compiler/src/codegen/emit-client.ts` (1371 LOC) — A-4.2 refactors atom-emitters out of the monolithic IIFE.
- `compiler/src/codegen/type-encoding.ts` — FNV-1a helper (A-4.6 extracts the hash function into a shared util).
- `compiler/src/route-inference.ts:2506-2521` — pages/ convention (entry-point routePath source, A-4 reads via RS output).

### 8.4 Design-insight + deep-dive anchors

- `scrml-support/design-insights.md` L1827-1925 — **Insight 29** (perf-feel debate verdict — A-4 is the per-route artifact splitter named in the engineering decomposition at L1880).
- `scrml-support/docs/deep-dives/smart-app-splitting-feel-of-performance-2026-04-26.md` — 588-line formal analysis underwriting §40.9 (dive H).
- `scrml-support/docs/deep-dives/living-compiler-recoverability-and-comp-time-shape-2026-04-26.md` — R1-R4 reproducibility (A-4 preserves R1 by construction per §40.9.8).
- `scrml-support/docs/deep-dives/dependency-model-no-npm-2026-03-30.md` — vendor model context (A-4 treats vendor units as opaque atoms per §40.9.6).

### 8.5 Adjacent SCOPING docs

- `docs/changes/a2-reachability-solver-scoping/SCOPING.md` — A-2 scoping (A-4 mirrors structure).
- `docs/changes/a3-auth-graph-scoping/SCOPING.md` — A-3 scoping (closed S91; A-4 consumes A-3 output).
- `docs/changes/a-2-8-emit-reachability-canonical/` — `--emit-reachability` CLI flag wave (A-4's CLI surface follows this precedent).

### 8.6 Empirical / corpus

- `examples/23-trucking-dispatch/` (24+ pages × 5 roles) — A-4 integration test corpus.
- `scrml-support/docs/diagnostics/reactive-graph-static-resolvability-S84.md` — 99-100% static-resolvability gate (A-4 inherits this assumption from A-1/A-2).

---

## Tags

deep-dive, scoping, a-4, per-route-artifact-splitter, chunk-emission, codegen-stage-8, reachability-record-consumer, spec-40-9-7, spec-47-5-content-addressing, spec-47-9-output-paths, insight-29-ratified, approach-a-v0-3-0, sub-phase-decomposition, implementation-shape-proposals, route-splitter-shape-b-recommended, chunks-json-manifest, prefetch-runtime-from-scratch, idle-callback-tier1, hover-prefetch-tier2, on-demand-tier-n, per-role-chunk-variance, content-addressing-determinism, opt-in-flag-during-wave, trucking-dispatch-integration-target, runtime-chunks-naming-disambiguation, rule-3-shape-b-justification, oq-ratification-needed, 60-120h-band, atom-registry-contract, role-aware-html-bootstrap, document.cookie-role-detection, scrml-runtime-prefetch-chunk-new, w-cg-chunk-lints, sequencing-critical-path

## Links

- `/home/bryan-maclee/scrmlMaster/scrmlTS/compiler/SPEC.md` §40.9.0-.11 (L17640-17912) + §47.5 (L19152-19174) + §47.9 (L19261-19371) + §47.10 (L19373-19410) + §40.8 (L17540-17600)
- `/home/bryan-maclee/scrmlMaster/scrmlTS/compiler/PIPELINE.md` Stage 7.6 (L2332-2412) + Stage 8 (L2414-2495)
- `/home/bryan-maclee/scrmlMaster/scrmlTS/compiler/src/types/reachability.ts`
- `/home/bryan-maclee/scrmlMaster/scrmlTS/compiler/src/reachability-solver.ts`
- `/home/bryan-maclee/scrmlMaster/scrmlTS/compiler/src/codegen/index.ts`
- `/home/bryan-maclee/scrmlMaster/scrmlTS/compiler/src/codegen/context.ts`
- `/home/bryan-maclee/scrmlMaster/scrmlTS/compiler/src/codegen/emit-client.ts`
- `/home/bryan-maclee/scrmlMaster/scrmlTS/compiler/src/codegen/emit-html.ts`
- `/home/bryan-maclee/scrmlMaster/scrmlTS/compiler/src/codegen/runtime-chunks.ts`
- `/home/bryan-maclee/scrmlMaster/scrmlTS/compiler/src/codegen/type-encoding.ts`
- `/home/bryan-maclee/scrmlMaster/scrmlTS/compiler/src/runtime-template.js`
- `/home/bryan-maclee/scrmlMaster/scrmlTS/compiler/src/api.js` L1410-1580
- `/home/bryan-maclee/scrmlMaster/scrmlTS/compiler/src/reachability/entry-points.ts`
- `/home/bryan-maclee/scrmlMaster/scrmlTS/compiler/src/route-inference.ts`
- `/home/bryan-maclee/scrmlMaster/scrmlTS/compiler/src/commands/compile.js`
- `/home/bryan-maclee/scrmlMaster/scrmlTS/docs/changes/a2-reachability-solver-scoping/SCOPING.md`
- `/home/bryan-maclee/scrmlMaster/scrmlTS/docs/changes/a3-auth-graph-scoping/SCOPING.md`
- `/home/bryan-maclee/scrmlMaster/scrmlTS/docs/changes/a-2-8-emit-reachability-canonical/`
- `/home/bryan-maclee/scrmlMaster/scrmlTS/examples/23-trucking-dispatch/`
- `/home/bryan-maclee/scrmlMaster/scrml-support/design-insights.md` L1827-1925 (Insight 29)
- `/home/bryan-maclee/scrmlMaster/scrml-support/docs/deep-dives/smart-app-splitting-feel-of-performance-2026-04-26.md`
- `/home/bryan-maclee/scrmlMaster/scrml-support/docs/deep-dives/living-compiler-recoverability-and-comp-time-shape-2026-04-26.md`
- `/home/bryan-maclee/scrmlMaster/scrml-support/docs/deep-dives/dependency-model-no-npm-2026-03-30.md`
- `/home/bryan-maclee/scrmlMaster/scrml-support/docs/diagnostics/reactive-graph-static-resolvability-S84.md`
- `/home/bryan-maclee/scrmlMaster/scrmlTS/docs/changes/a-4-per-route-artifact-splitter-SCOPING/progress.md`
