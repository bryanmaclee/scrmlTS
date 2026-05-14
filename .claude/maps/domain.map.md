# domain.map.md
# project: scrmlts
# updated: 2026-05-14T00:37:04-06:00  commit: ff9be0e

## Core Concepts

| Concept | Definition |
|---------|------------|
| scrml | Single-file, full-stack reactive web language: one .scrml file contains markup, CSS, logic, server functions, SQL, and state — the compiler splits it into HTML + client JS + server JS |
| Pipeline | 12+ ordered stages (BS → TAB → NR → MOD → CE → UVB → PA → RI → TS → META → DG → BP → RS → CG) plus Stage 3.007 LINT-TRY-CATCH + Stage 3.105 STDLIB-EXPORT-SEED + Stage 7.6 Reachability Solver |
| Reactive cell (@var) | Mutable reactive variable declared with `@name = expr`; all subscriptions update on set |
| Derived cell | Const-derived reactive variable (`const <name> = expr`); recomputed when deps change; shape:"derived" in AST |
| Engine | State machine over a reactive cell (`<engine>` tag); governs legal transitions via rule= attributes; variant-guarded markup rendering |
| State child | AST node inside an `<engine>` body representing a named variant; body is walkable AST |
| Match block | Pattern-match expression (`match expr { .A => ..., .B => ... }`); match-as-expression and match-block-form |
| Logic block (${ }) | Imperative code block; contains let/const/reactive decls, function defs, SQL blocks, control flow |
| Meta block (^{ }) | Compile-time code execution block; evaluated at CG Stage 8; `meta.emit()` inserts HTML at the block's DOM position |
| Error-effect block (!{ }) | Pattern-matched error handler; arms match on error type |
| SQL block (?{ }) | Inline SQL query with chained method; compiled to server-only prepared statement |
| Server function | `server function name(params)` — compiled to HTTP route handler; called from client via auto-generated fetch |
| Component | Reusable markup definition; expanded at Stage 3.2 CE |
| Channel | Real-time pub/sub topic (`<channel>` tag); WebSocket/SSE backed |
| PURE-CHANNEL-FILE | A .scrml file containing `<channel>` at file top and NO `<program>`. Canonical per §38.12.6 |
| Validator | Predicate on a state cell; synthesizes validity surface (@x.isValid, @x.errors, @x.touched, @x.submitted) |
| Batch Planner | Stage 7.5 BP; coalesces SQL calls within a logic block into batched queries |
| Protect Analyzer | Stage 4 PA; identifies protected fields requiring write guards |
| Route Inference | Stage 5 RI; infers HTTP method + path for server functions and channels; produces RouteMap |
| Dependency Graph | Stage 7 DG; builds reactive cell dependency graph; detects cycles; all A-1 edges (markup-read etc.) active |
| MarkupReadDGNode (A-1.2) | Per-interpolation markup-context read node (S88 A-1.2); enables §40.9.3 closure analysis |
| AuthGraph | Stage 7.55-ish: derived AFTER RI (needs RouteMap), BEFORE RS. Output: `gates: Map<MarkupNodeId, AuthGate>`, `roleEnum`, `gateToEntryPoint`, `redirectTargets`, `errors`. Four sub-phases: A-3.1 enumeration, A-3.2 role-enum resolution, A-3.3 classification, A-3.4 redirect cross-ref |
| `<auth>` element | NEW S90: `<auth role="admin">...</auth>` — sub-page component gate (SPEC §40.9.9). Registered in html-elements.js; `role=` attribute registered with supportsInterpolation: true |
| AuthSiteKind | "program-auth" \| "page-auth" \| "auth-role-block" \| "channel-auth" — four gate declaration sites |
| RoleClassification | Per-gate: closed_form (gated_for_role: Set<RoleVariant>) or runtime-fallback (gate_expr) |
| Reachability Solver | Stage 7.6 RS; five-component union + per-role ChunkPlan emission. A-2.1..A-2.6 wired at S90. A-2.7 (outer fixed-point) + A-2.8 (canonical JSON serialization) pending |
| ChunkPlan | Per-(entry-point, role) chunk decomposition: initialChunk + prefetchTier1 + prefetchTier2 + prefetchTierN |
| Wire Format (§57) | NEW S90: scrml absence (`not`) encodes as `{"__scrml_absent": true}` over the wire for `T | not` return types. Dual-decoder: accepts envelope + raw JSON null. Clean-break at v1.0 |
| null / undefined eradication | ABSOLUTE. `null` and `undefined` do NOT exist in scrml. `""` / `0` / `false` are DEFINED values. Canonical absence: `not`. SPEC §42 + §42.1.1 normative |
| Tier system | Tier 1 (basic reactive): if/for/match; Tier 2 (engines): state machines; Tier 3 (positional sugar): compound state shorthand |
| Self-host | Compiler compiled with itself; dist artifacts gitignored. Self-host is a from-scratch rewrite SHOWCASING scrml advantages — not a mechanical TS port |
| scrml:host | Stdlib module: `safeCall`, `safeCallAsync`, `HostError`. try/catch lives ONLY in compiler/runtime/stdlib/host.js — never in scrml source |

## v0.3.0 Status (as of S90 close — ff9be0e)

**CLOSED at S88/S89:**
- LIFT-1..5 (all codegen bug families) — S88 ✓
- Approach A wave A-1 (A-1.1..A-1.8 inclusive) — S89 ✓
- §36 input devices chain (SPEC + parser/typer + regression + conformance + integration + sample) — S89 ✓
- §13.2 auto-await chain (Sub-A + Sub-B + Sub-E; STDLIB-EXPORT-SEED pass) — S89 ✓
- Wave 4 adopter content (T-track 11/11 + D-track 17 articles) — S89 ✓
- Null/undefined eradication (SPEC §42.1.1, W-ABSENCE rename, corpus + stdlib sweep) — S89 ✓

**CLOSED at S90:**
- M-7C-D-12 runtime sentinel — Track 1 (AST cleanup), Track 2 (wire envelope codegen), Track 3 (codegen lint), Track 4 (SPEC §57), Track 5 (audit closure) ✓
- A-2.3 Component 2: reactive_dep_closure (537 LOC) ✓
- A-2.4 Component 3: server_fn_reachable_within (1,023 LOC) ✓
- A-2.5 Component 4: auth_gated_boundaries_visible_to + per-role ChunkPlan emission + W-AUTH-RUNTIME-FALLBACK + E-CLOSURE-002 ✓
- A-2.6 Component 5: vendor_units_used_by (451 LOC) ✓
- A-3.1 auth-site enumeration + `<auth>` element registration ✓
- A-3.2 role-enum resolution + E-AUTH-GRAPH-002 ✓
- A-3.3 per-gate classifier + W-AUTH-PAGE-INFERRED ✓
- A-3.4 redirect cross-ref + I-AUTH-REDIRECT-UNRESOLVED ✓

**CLOSED at S91:**
- A-2.7 outer fixed-point operator + E-CLOSURE-001 fire-site (`compiler/src/reachability/outer-fixpoint.ts`, ~463 LOC) ✓
- A-3.5 AuthGraph wired into api.js pipeline Stage 7.55 (RS Component 4 now receives real AuthGraph instead of degraded all-in floor) ✓
- A-2.8 canonical JSON serialization for `--emit-reachability` — stratified comparator (number < string < other), codepoint string compare, diagnostic canonical ordering by (code, severity, entryPoint, role, message); 21 determinism tests including 10-run replay + CLI two-spawn diff ✓

**CLOSED at S91 (A-4 wave initial-chunk dispatch):**
- A-4.1 codegen orchestrator slot + per-(EP, role, tier) iteration scaffold + opt-in `--emit-per-route` flag (13 unit tests) ✓
- A-4.2 initial_chunk(E, R) JS payload emission — `composeInitialChunk` in `compiler/src/codegen/route-splitter.ts` + atom emitters in `compiler/src/codegen/atom-emitter.ts` (`emitReactiveCellAtom` / `emitServerFnStubAtom` / `emitVendorUnitRef` / `emitComponentAtom`); 21 new unit tests + 16 new integration tests including §40.9.9 worked-example replay (viewer=Driver / viewer=Admin per-role variance + 2-build determinism + per-file .client.js byte-identical regression) ✓
- A-4.3 prefetch_tier_1(E, R) emission + idle-prefetch runtime wiring — `composeTier1Chunk` in `compiler/src/codegen/route-splitter.ts` (delta over initial via shared `appendAtomLines`); `_scrml_prefetch_tier1` runtime function in `compiler/src/runtime-template.js` (`requestIdleCallback` browser-side + `setTimeout(fn, 1)` Safari fallback per OQ-A4-G Option γ); `prefetch` runtime chunk marker in `compiler/src/codegen/runtime-chunks.ts` (tree-shake live/dead per `detectRuntimeChunks` scan of `reachabilityRecord.closures[ep].byRole[role].prefetchTier1`); initial-chunk IIFE-tail prefetch call when admission non-empty (elided when empty per §40.9.9 normative `prefetch_tier_1(/) = {}`); api.js write-loop skips empty-payload non-initial chunks + surfaces tier-1 byte total in verbose log. 7 new unit tests + 9 new integration tests including §40.9.9 worked-example empty-tier-1 normative replay + tree-shake DEAD assertion under embed mode ✓
- A-4.4 prefetch_tier_2(E, R) emission + cross-route hover-prefetch runtime wiring — `composeTier2Chunk` in `compiler/src/codegen/route-splitter.ts` (mirrors A-4.3 tier-1 contract for `prefetchTier2` admission); `_scrml_prefetch_tier2(routePath, role)` + `_SCRML_CHUNKS` manifest scaffold in `compiler/src/runtime-template.js` (same `prefetch` chunk as A-4.3; single marker covers both functions); `<a href="/internal-route">` wiring with `data-scrml-prefetch="<route>"` attribute in `compiler/src/codegen/emit-html.ts` (skips external/fragment/unresolved hrefs); `ctx.hasPrefetchableLinks` flag on CompileContext flipped by emit-html during walk; `composeInitialChunk` emits hover-handler attachment block (mouseenter + focus once-listeners with `_anonymous` role fallback) in IIFE tail when flag is true; `detectRuntimeChunks` activates `prefetch` chunk on EITHER non-empty tier-1 OR `hasPrefetchableLinks=true`; api.js write-loop surfaces tier-2 byte total in verbose log. 21 new integration tests including tree-shake LIVE/DEAD + role-fallback + `<a href>` resolution + multi-page `routes/` fixture + composer determinism + role variance ✓
- A-4.5 prefetch_tier_N(E, R) on-demand dispatch hook — `_scrml_fetch_chunk(epId, role, tier)` runtime function appended inside the existing `prefetch` chunk in `compiler/src/runtime-template.js` (returns `Promise<string>` via `fetch().text()` for registered tuples; returns JS `null` for unregistered tuples per §42.5/§42.8); `emit-client.ts:detectRuntimeChunks` extends the prefetch-chunk activation gate so it lights up when EITHER `prefetchTier1` OR `prefetchTierN` admission is non-empty (in v0.3 only the tier-1 branch ever fires; tier-N branch is structural-scaffolding for v0.4+ admission per OQ-A2-B Option a + OQ-A4-D Option a). 14 new unit tests in `compiler/tests/unit/codegen-route-splitter-tier-n.test.js` (presence, fetch resolution, null on missing entry / role / tier / no _SCRML_CHUNKS, tree-shake live v0.3 default, forward-compat tier-N + tier-1 activations, splitter tier-N key, assembleRuntime determinism, chunk-position invariant) ✓
- A-4.6 §47 content-addressing integration — FNV-1a base36 8-char hash over canonical `(componentNodeIds, reactiveCellNodeIds, serverFnNodeIds, vendorUnitNames, payloadJs)` concatenation (admission ids sorted via A-2.8 stratified comparator, joined with `,`; fields joined with `\x1F` US separator). Shared primitive at NEW `compiler/src/codegen/fnv1a-hash.ts` (extracted from `type-encoding.ts:fnv1aHash`; `type-encoding.ts` now re-exports — existing per-binding name encoding callers byte-identical). `route-splitter.ts:computeChunkHash` + `finalizeChunkHash` replace the A-4.1 `"00000000"` placeholder on EVERY emitted ChunkOutput before it surfaces externally. `chunks.json` on-disk artifact carries URL-style filenames (e.g. `"/app/Driver.initial.a4b9c2d1.js"`) via `serializeChunksManifest(manifest, chunks)` transform (in-memory manifest still ChunkKey-valued for in-process lookup). Determinism (§40.9.8 normative two-builds-same-hash): same source → same admission → same payloadJs → same hash byte-for-byte. The `CHUNK_HASH_PLACEHOLDER` constant retained as regression-guard sentinel (every chunk's hash MUST NOT equal it). 19 new unit tests in `compiler/tests/unit/chunk-content-addressing.test.js` + 4 new integration tests in `compiler/tests/integration/initial-chunk-emission.test.js` §40.9.8 block (5-run replay + source-change-flips-hash + no-placeholder-leak grep). ✓

**In Progress / Pending:**
- §34 catalog rows for I-AUTH-REDIRECT-UNRESOLVED + W-AUTH-PAGE-INFERRED deferred to A-3.5 SPEC dispatch
- stdlib/http async migration (4 try-catch sites tracked by W-TRY-CATCH lint)
- A-4.7 per-route HTML augmentation + W-CG-CHUNK-* lints + role-detection bootstrap (OQ-A4-E hybrid)
- Manifest `compiler` field hard-coded `"scrml-0.3.0"` — sourcing from package.json deferred (current package.json shows `0.2.0` which is stale relative to the in-progress v0.3.0 cut; defer until version-string source-of-truth is reconciled)

## Business Invariants

- No SQL execution calls may appear in client JS output (E-CG-006)
- No server-environment access (process.env, Bun.env) may appear in client JS output
- Engine transitions must match a declared rule= arm or throw E-ENGINE-001-RT at runtime
- Exception (§51.0.F.1): engine self-writes are runtime NO-OPs — no E-ENGINE-INVALID-TRANSITION
- Lin-declared variables must be consumed exactly once; unconsumed or double-consumed raises E-LIN-* at compile time
- Tilde-declared variables must be used; E-TILDE-001 on drop
- Batch Planner excludes .nobatch() SQL nodes from all coalescing candidate sets (§8.9.1)
- `null` / `undefined` are NOT valid scrml tokens in any context (SPEC §42, E-SYNTAX-042)
- `""` / `0` / `false` / `[]` / `{}` are DEFINED values — NOT absence (SPEC §42.1.1)
- `===` / `!==` are NOT valid in scrml source (E-EQ-004)
- `bun:` and `node:` prefixed imports are server-context-only (E-IMPORT-007)
- Server-function return types `T | not` encode absence as `{"__scrml_absent": true}` wire envelope (SPEC §57); client decoder accepts envelope + legacy raw JSON null (dual-decoder until v1.0 clean-break)
- `<auth>` blocks without `role=` AND without `check=` are malformed gates (E-AUTH-GRAPH-004)
- Apps using `<auth role=...>` variant-referencing gates with no app-scope role enum get E-CLOSURE-002

## Six NEW First-Fire-Sites (S90)

| Code | Severity | File | Description |
|------|----------|------|-------------|
| W-CG-UNDEFINED-INTERPOLATION | warning | codegen/lint-undefined-interpolation.ts | Bare `undefined` in compiled JS (M-7C-D-12 Track 3) |
| I-AUTH-REDIRECT-UNRESOLVED | info | auth-graph.ts crossRefRedirects() | Gate redirect target not in RouteMap.pages (A-3.4) |
| E-AUTH-GRAPH-002 | error | auth-graph.ts resolveRoleEnum() | Multiple role enums in same compilation unit (A-3.2) |
| W-AUTH-RUNTIME-FALLBACK | info | reachability/component-4.ts | Async-only auth check; static classification impossible (A-2.5) |
| E-CLOSURE-002 | error | reachability/component-4.ts | Auth-role-block gates with no app-scope role enum (A-2.5) |
| W-AUTH-PAGE-INFERRED | info | auth-graph.ts classifyGates() | Page lacks explicit auth= with program auth=required (A-3.3) |

## Domain Events (Compiler Pipeline)

| Event | When | Where |
|-------|------|-------|
| CompileContext populated | After analysis, before emission | codegen/index.ts |
| BindingRegistry seal | After HTML emit, before client JS emit | codegen/index.ts |
| `pushArmContext / popArmContext` | Around each engine state-child body emit | emit-variant-guard.ts |
| `drainMachineCodegenErrors` | After all machine emission | codegen/emit-machines.ts |
| channel placement pre-check | UVB Stage 3.3 | validators/ast-walk.ts |
| LINT-TRY-CATCH walk | Stage 3.007 | validators/lint-try-catch.ts |
| STDLIB-EXPORT-SEED | Stage 3.105 | api.js |
| wire-format encoder injection | Post-server-JS emit, if return type includes `| not` | codegen/emit-server.ts |
| lint-undefined-interpolation scan | Post-CG emission, before output write | codegen/lint-undefined-interpolation.ts |

## Aggregates

| Aggregate | File | Owns |
|-----------|------|------|
| FileAST | compiler/src/types/ast.ts | All ASTNodes for one .scrml file |
| CompileContext | compiler/src/codegen/context.ts | BindingRegistry, FileAnalysis, EncodingContext, error list |
| BindingRegistry | compiler/src/codegen/binding-registry.ts | EventBinding[], LogicBinding[] |
| FileAnalysis | compiler/src/codegen/analyze.ts | Pre-computed AST slices |
| AuthGraph | compiler/src/types/auth-graph.ts | gates Map, roleEnum, gateToEntryPoint, redirectTargets, errors — Stage 7.55 output [S90] |
| ReachabilityRecord | compiler/src/types/reachability.ts | closures Map<EntryPointId, RolePlayableSurface> — Stage 7.6 output |

## Task-Shape Routing

| Task shape | Where to look |
|------------|---------------|
| Auth graph wiring into api.js pipeline | auth-graph.ts runAuthGraph() exists but NOT yet called in api.js; next dispatch wires it into RS input |
| A-2.7 outer fixed-point + E-CLOSURE-001 | reachability-solver.ts orchestrator; docs/changes/a2-reachability-solver-scoping/SCOPING.md §5 A-2.7 |
| §34 catalog rows for A-3 diagnostic codes | A-3.5 SPEC dispatch (I-AUTH-REDIRECT-UNRESOLVED + W-AUTH-PAGE-INFERRED) |
| Wire format follow-on | SPEC §57 landed; codegen integration done |
| --emit-reachability canonical JSON | A-2.8 landed S91 — `serializeReachabilityRecord` in `compiler/src/reachability-solver.ts` enforces bit-identical output (stratified comparator + canonical diagnostic order); 21-test anchor at `compiler/tests/unit/reachability-record-determinism.test.js` |
| A-4 per-route artifact splitter | A-4.1 + A-4.2 + A-4.3 + A-4.4 + A-4.5 + A-4.6 closed S91 — `compiler/src/codegen/route-splitter.ts` (orchestrator + initial-chunk + tier-1 + tier-2 composers + IIFE hover-handler + content-address hash) + `compiler/src/codegen/atom-emitter.ts` (per-id atom helpers) + NEW `compiler/src/codegen/fnv1a-hash.ts` (shared FNV-1a primitive) + `_scrml_prefetch_tier1` + `_scrml_prefetch_tier2` + `_SCRML_CHUNKS` scaffold + `_scrml_fetch_chunk` runtime in `compiler/src/runtime-template.js` (shared `prefetch` runtime chunk) + `<a data-scrml-prefetch>` wiring in `compiler/src/codegen/emit-html.ts`. Opt-in via `--emit-per-route` CLI flag. **Only A-4.7 (HTML + role-bootstrap + W-CG-CHUNK-* lints) remains pending.** Test anchors: `compiler/tests/unit/codegen-route-splitter.test.js` (43 tests), `compiler/tests/unit/codegen-route-splitter-tier-n.test.js` (14 tests), `compiler/tests/unit/chunk-content-addressing.test.js` (19 tests), `compiler/tests/integration/initial-chunk-emission.test.js` (20 tests — §40.9.9 replay + A-4.6 determinism + source-change-flips-hash), `compiler/tests/integration/tier1-idle-prefetch.test.js` (9 tests), `compiler/tests/integration/tier2-hover-prefetch.test.js` (21 tests — cross-route hover + tree-shake + composer determinism + role variance) |
| A-4.2 atom-emitter extension | New atom emitters live in `compiler/src/codegen/atom-emitter.ts`; the per-file `.client.js` path (`emit-client.ts:generateClientJs`) is NOT touched at A-4.2 — atom emitters are an ADDITIVE parallel surface that `composeInitialChunk` calls. Future polish dispatch MAY fold the two paths together |
| A-4.3 tier-1 idle-prefetch runtime | `_scrml_prefetch_tier1(chunkUrl)` lives in the new `prefetch` runtime chunk; uses `requestIdleCallback` with `setTimeout(fn, 1)` Safari fallback (OQ-A4-G Option γ); tree-shake LIVE/DEAD driven by `detectRuntimeChunks` scan of per-file `reachabilityRecord.closures[ep].byRole[role].prefetchTier1` non-emptiness; initial-chunk IIFE tail emits `_scrml_prefetch_tier1(<url>)` only when (EP, role) admits non-empty tier-1 |
| A-4.5 tier-N on-demand dispatch runtime | `_scrml_fetch_chunk(epId, role, tier)` rides INSIDE the existing `prefetch` chunk in `compiler/src/runtime-template.js`. Returns `Promise<string>` via `fetch().text()` for registered (epId, role, tier) tuples; returns JS `null` for unregistered tuples. `detectRuntimeChunks` extends the gate so it also lights up on non-empty `prefetchTierN` admission — branch never fires in v0.3 per OQ-A2-B Option a + OQ-A4-D Option a |
| A-4.6 content-addressed chunk hash | `route-splitter.ts:computeChunkHash(contents, payloadJs)` computes FNV-1a base36 8-char hash over canonical concatenation of admission-sets + payload bytes per SPEC §47.5 + §40.9.8 + §47.1.3. Shared primitive lives at `compiler/src/codegen/fnv1a-hash.ts` (also re-exported from `type-encoding.ts` for the per-binding name-encoding call site). `finalizeChunkHash` in `route-splitter.ts` replaces every chunk's A-4.1 placeholder hash + filename with the real values BEFORE the chunk surfaces externally. On-disk `chunks.json` carries URL-style filenames via `serializeChunksManifest(manifest, chunks)` transform; in-memory `ChunksManifestEntry` retains ChunkKey values. `CHUNK_HASH_PLACEHOLDER = "00000000"` constant retained in `route-splitter.ts` as regression-guard sentinel only |
| A-4.4 tier-2 hover-prefetch runtime | `_scrml_prefetch_tier2(routePath, role)` ships in SAME `prefetch` runtime chunk as A-4.3; `_SCRML_CHUNKS = Object.create(null)` scaffold mirrors the per-app chunks.json manifest (A-4.6 populates). `<a href="/internal">` wiring in `emit-html.ts` resolves against `RouteMap.pages.urlPattern` Set and injects `data-scrml-prefetch="<route>"` for exact matches only (external/fragment/unresolved hrefs skip). `ctx.hasPrefetchableLinks` flag flipped during the markup walk; `composeInitialChunk` reads it to emit hover-handler attachment (mouseenter + focus once-listeners, `passive: true`); `_scrml_current_role` undefined → fallback to `"_anonymous"` sentinel (A-4.7 lands real role-bootstrap). `detectRuntimeChunks` activates `prefetch` chunk on EITHER non-empty tier-1 OR `hasPrefetchableLinks=true`. Per OQ-A4-E hybrid: ONE HTML per route + role bootstrap script |
| null/absence migration | docs/changes/null-eradication-*, undefined-eradication-*, stdlib-phase-1-5-null-sweep |
| stdlib/http async migration | stdlib/http/index.scrml lines 65/264 (W-TRY-CATCH fires) |

## Tags
#scrmlts #map #domain #concepts #pipeline #engine #reactive #s90 #v0.3 #approach-a #approach-a2 #approach-a3 #reachability #auth-graph #wire-format #null-eradication #input-devices #auto-await #wave4-closed

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
- [schema.map.md](./schema.map.md)
- [error.map.md](./error.map.md)
