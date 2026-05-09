# Phase 0 SURVEY — A9 Ext 5 (S5 replay safety / idempotency-key storage)

**Date:** 2026-05-09 (S75 close)
**Author-context:** Phase 0 survey-only dispatch (no source/spec/test changes).
**Predecessor blockers cleared:**
- C17 schema additive shared-core lowering — SHIPPED `77b86c9` (S75).
- C18 channel WebSocket emission — SHIPPED `e28a022` (S75).
- C19 §40.7 documentary attrs — CLOSED (already shipped at S59).
- A9 Ext 4 S4-wiring — SHIPPED `dc98313` (S72).
- Insight-26 Batch-1 Trigger 5 caller-context propagation — SHIPPED `ea0ee5b` (S70).

**Conclusion of survey:** Ext 5 is **dispatch-ready**. No further Phase 0 deep-dive needed. Recommended next-session structure: 2-wave dispatch (W1 = §1 spec edit T1 + parser-extension T2; W2 = analyzer + emission + runtime + tests T2-T3) running ~46h end-to-end, with parallelism opportunities flagged in §4.

**Critical surprise from Ext 4 dispatch (avoid repeating):** the integration design dive cites "§47 server functions" but **§47 in SPEC is "Output Name Encoding"**. The actual server-functions/CPS locus is **§19.9** (Server Function Errors). Ext 5's spec edit MUST route to §19.9.x, NOT §47. Ext 4 corrected this trap at dispatch-time; Ext 5 should encode the correct anchors UP-FRONT.

---

## §0 Reading list traversed (corpus this survey is grounded in)

**Primary canon (read in full):**
- `/home/bryan/scrmlMaster/scrml-support/docs/deep-dives/body-split-integration-and-residual-design-2026-05-08.md` (979 lines) — Q1-Q7 verdicts; §2 Q1 `<program>` attribute mechanism; §3 Q2 `.idempotent()` modifier verdict.
- `/home/bryan/scrmlMaster/scrml-support/docs/deep-dives/body-split-soundness-design-2026-05-08.md` (897 lines) — §3.5 Ext 5 algorithm sketch + diagnostic shapes; §5.1 cost decomposition.
- `/home/bryan/scrmlMaster/scrml-support/docs/deep-dives/soundness-analysis-for-body-split-2026-05-08.md` (553 lines) — S5 predicate; CALM-monotonic structural property; gap analysis identifying S5 as the surviving GAP.

**Supporting context (targeted reads):**
- `/home/bryan/scrmlMaster/scrml-support/user-voice-scrmlTS.md` lines 5835-5926 (S72 ratifications: scrmlconfig = `<program>` attr; weave-into-v0.2.0 directive; migration-tooling deferred).
- `/home/bryan/scrmlMaster/scrml-support/design-insights.md` Insights 22-26 (server-mount; B1+B3; tier-gated NPM; effects-as-data; server-keyword HYBRID disposition).
- `/home/bryan/scrmlMaster/scrmlTS/master-list.md` lines 30-82 (A1c row + A9 row + §0.4 deferral records).
- `/home/bryan/scrmlMaster/scrmlTS/compiler/SPEC.md` §4.12 nested `<program>`; §8.1.1 db driver resolution; §8.9 per-handler coalescing; §8.10 N+1 loop hoisting; §19.6 errorBoundary; §19.6.7 multi-batch granularity (Ext 4 ship); §19.9 server-fn errors; §19.9.5 auto-`!`-wrap CPS stubs (Ext 4 ship); §19.10 SQL transactions; §34 error registry; §39 schema; §40 middleware + §40.7 documentary attrs; §47 output name encoding (NOT server fns); §51.0 + §51.3 machines.
- `/home/bryan/scrmlMaster/scrmlTS/compiler/PIPELINE.md` Stage 5 RI; Stage 7 DG; Stage 7.5 BP (BatchPlan IR); Stage 8 CG.
- `/home/bryan/scrmlMaster/scrmlTS/compiler/src/route-inference.ts` (2499 LOC; analyzeCPSEligibility @ 842; cpsSplit field @ 17/108; CPSSplit shape).
- `/home/bryan/scrmlMaster/scrmlTS/compiler/src/codegen/emit-server.ts` (1030 LOC; CPS server-stub emission @ 580-870; Ext 4 try/catch envelopes @ 630, 800).
- `/home/bryan/scrmlMaster/scrmlTS/compiler/src/codegen/emit-functions.ts` (408 LOC; CPS client wrapper emission @ 200-340; Ext 4 envelope @ 225-339).
- `/home/bryan/scrmlMaster/scrmlTS/compiler/src/codegen/usage-analyzer.ts` (697 LOC; FeatureUsage interface @ 51; the C0 precedent for new-flag addition).
- `/home/bryan/scrmlMaster/scrmlTS/compiler/src/codegen/emit-channel.ts` (530 LOC; just shipped C18 — must verify intersection with replay safety).
- `/home/bryan/scrmlMaster/scrmlTS/compiler/src/batch-planner.ts` (766 LOC; existing §8.9 BatchPlan emitter — closest precedent for monotonicity-analyzer shape).
- `/home/bryan/scrmlMaster/scrmlTS/docs/changes/a9-ext4-s4-wiring-2026-05-08/progress.md` (Ext 4 dispatch progress log; surprises captured).

---

## §1 Spec edit shape (the new spec text Ext 5 introduces)

Ext 5 introduces ONE new normative SPEC section (the monotonicity-classifier surface), adds ONE new `<program>` documentary attribute (storage-backend resolution), extends an existing modifier-set with ONE new modifier (`.idempotent()`), and adds ~3 new error-code rows to §34. Total estimated SPEC delta: ~250-350 lines across the changes below.

### §1.1 NEW §19.9.6 — Static Monotonicity Classification + Idempotency-Key Replay (PRIMARY)

**Section number:** §19.9.6 (immediately after §19.9.5 "Auto-`!`-Wrap of CPS Server Stubs", which Ext 4 added).
**Adjacent existing sections:** §19.9.4 normative statements; §19.9.5 auto-`!`-wrap (Ext 4); §19.10 SQL transactions.
**Insertion point:** between §19.9.5 and §19.10 (the `<errorBoundary>` content stays contiguous; transactional content follows).

**Normative prose draft (3 paragraphs):**

> **Static monotonicity classification.** Per the body-split soundness predicate **S5 (replay safety)**, every CPS-emitted server batch SHALL be statically classified as either *monotone* (idempotent under repeated application) or *non-monotone* (potentially observable under repeated application). The classifier is conservative: in cases of static ambiguity, the batch SHALL be classified non-monotone. A batch SHALL be classified monotone if and only if it contains exclusively: (a) `?{}` SELECT statements (read-only); (b) `?{}` INSERT statements with no auto-increment column read-back; (c) `?{}` UPDATE statements where the assignment expression is independent of the prior column value (e.g., `SET status = 'approved'` is monotone; `SET counter = counter + 1` is non-monotone); (d) `?{}` DELETE statements; (e) pure-function calls (per §48 `fn`); (f) `<machine>` `.advance()` transitions whose §51 allowed-from-states guards make the transition idempotent under repeated application. A batch matching none of (a)-(f) — for example a batch containing a `<channel>` broadcast emit, a stdlib server-side I/O call (`scrml:fs`, `scrml:email`, `scrml:redis`-write), or any expression with non-deterministic right-hand side (e.g., `NOW()`, `random()`, auto-increment read-back) — SHALL be classified non-monotone.

> **Idempotency-key emission.** Server batches classified non-monotone SHALL receive an idempotency-key envelope: the CPS client wrapper SHALL generate a UUIDv4 per call site invocation, transmit it via the HTTP request header `Idempotency-Key`, and the CPS server stub SHALL consult a per-app idempotency-key store before executing the batch. On a key-hit, the stub SHALL return the stored result without re-executing the batch. On a key-miss, the stub SHALL execute the batch, store the key + result tuple under the configured TTL (default: 24 hours per Stripe convention; see §1.4 below), and return the result. Batches classified monotone SHALL NOT emit an idempotency-key envelope; the CPS wrapper invokes them without the header. The `Idempotency-Key` header name is the IETF-draft standard name (cross-ref: [HTTP idempotency-key RFC draft](https://httptoolkit.com/blog/idempotency-keys/)); scrml SHALL emit per draft, NOT a scrml-specific header name.

> **Storage-backend resolution.** The idempotency-key store backend SHALL be declared on the enclosing `<program>` element via the new attribute `idempotency-store=` (see §1.2 below). When the attribute is absent, the compiler SHALL apply the default resolution: (1) if the app's `<program db=>` driver supports a SHADOW-TABLE (SQLite, Postgres, MySQL — i.e., the §8.1.1 driver matrix), use a compiler-emitted `_scrml_idempotency_keys` table on that database; (2) otherwise, if the app imports `scrml:redis` anywhere in its module graph (per §41.4 stdlib resolution), prefer Redis (faster); (3) otherwise, no storage backend is available — non-monotone batches SHALL produce a static compile-time error E-CPS-NONIDEM-NO-STORAGE (see §1.5). When a non-monotone batch is bounded by a `<machine>` `.advance()` transition (clause (f) above), the §51 allowed-from-states guards provide intrinsic idempotency by construction; no idempotency-key emission is required for this case (informational diagnostic D-CPS-MACHINE-INTRINSIC-MONOTONE — see §1.5).

**Cross-references the new section MUST include:**
- §8.1.1 (db driver resolution — the precedent shape).
- §8.9 / §8.9.5 (`.nobatch()` precedent for the `.idempotent()` modifier shape).
- §17.6 (NOTE: the integration design dive cites "§17.6 db driver resolution" but the actual section is **§8.1.1** — section-number reroute to flag at dispatch).
- §19.6.7 (Ext 4 multi-batch granularity — Ext 5 is the recovery path for non-tail batch failures).
- §19.9.5 (Ext 4 auto-`!`-wrap — Ext 5 layers replay-safety on top).
- §40.2 (compiler-auto middleware — Ext 5's storage-backend dispatch is a sibling pattern).
- §41.4 (stdlib resolution — for `scrml:redis` detection in default-backend resolution).
- §43 (nested `<program>` — nested-program override semantics for `idempotency-store=`).
- §51.0.G (`.advance(.X)` — intrinsic-monotone leg).

### §1.2 NEW `<program>` attribute — `idempotency-store=`

**Section number:** §40.2 (Compiler-Auto Middleware — `<program>` Attributes) — extend the existing attribute table.
**Adjacent existing attributes:** `cors=`, `log=`, `csrf=`, `ratelimit=`, `headers=` (the five compiler-auto middleware attrs).
**Insertion point:** add a new row to the §40.2 attribute table, plus a new sub-section `#### 39.2.6 idempotency-store=` (NOTE: §40 sub-anchors are inconsistently numbered as §39.2.x in current SPEC — Ext 5's spec edit may need to renormalize OR use the existing §39.2.6 anchor pattern; this is a section-number coherence issue inherited from main, NOT introduced by Ext 5).

**Normative prose draft:**

> `idempotency-store="auto"` (default) | `"sqlite"` | `"postgres"` | `"mysql"` | `"redis"` | `"none"` declares the per-app idempotency-key storage backend used by §19.9.6 replay-safety machinery. The compiler SHALL resolve the attribute as follows: `"auto"` triggers the default-resolution rules of §19.9.6 paragraph 3 (db-driver-shadow-table → scrml:redis import → none-with-static-rejection). `"sqlite"` / `"postgres"` / `"mysql"` SHALL each emit a compiler-generated `_scrml_idempotency_keys` shadow table on the closest-ancestor `<program db=>` of matching driver; the driver in `<program db=>` MUST match the `idempotency-store=` value or compile-time error E-CPS-IDEMPOTENCY-STORE-DRIVER-MISMATCH fires (see §1.5). `"redis"` SHALL require `scrml:redis` to be importable in the module graph; absence is E-CPS-IDEMPOTENCY-STORE-MISSING-IMPORT. `"none"` explicitly disables the store; any non-monotone CPS batch in the app SHALL produce E-CPS-NONIDEM-NO-STORAGE.

**Closest-ancestor resolution (mirrors §8.1.1 `db=`):**

> Like `db=` (§8.1.1), `idempotency-store=` resolves by walking up the `<program>` ancestor tree from each CPS-eligible function's emission site to the closest `<program>` carrying the attribute. Nested `<program>` (§4.12) MAY override the parent's `idempotency-store=` to scope the storage backend to a sub-tree.

**Worked example:**

```scrml
<program db="postgres://app:pass@localhost/app" idempotency-store="auto">
  <!-- "auto" resolves to: postgres shadow table _scrml_idempotency_keys -->

  ${ function approveOrder(id: number) {
      ?{`UPDATE orders SET status = 'approved' WHERE id = ${id}`}.run()
      // Monotone (assignment is independent of prior value) → no key emitted.
  } }

  ${ function incrementView(id: number) {
      ?{`UPDATE counters SET val = val + 1 WHERE id = ${id}`}.run()
      // Non-monotone (val + 1 reads prior value) → idempotency-key emitted;
      // server stores key+result in _scrml_idempotency_keys (postgres).
  } }
</program>
```

### §1.3 NEW `.idempotent()` modifier on server functions

**Section number:** new §19.9.7 — `.idempotent()` Function Modifier (immediately after §19.9.6).
**Parallel structure:** §8.9.5 `.nobatch()` modifier.
**Grammar locus:** function-decl modifier suffix; `ast-builder.js` extension to recognize the modifier (single new token; no new keyword).

**Normative prose draft:**

> A function declaration MAY carry the `.idempotent()` modifier as a developer-asserted escape hatch from the static monotonicity classifier (§19.9.6). When present, the compiler SHALL NOT emit an idempotency-key envelope for the function's CPS-emitted server batches, regardless of the classifier's verdict. The modifier is semantically a developer assertion that the function's batches are idempotent under repeated application by construction (e.g., SQL `INSERT ... ON CONFLICT DO NOTHING`, idempotent UPSERT patterns the conservative classifier cannot prove). The compiler SHALL emit informational diagnostic D-CPS-IDEMPOTENT-OVERRIDE at the modifier site naming the classifier's would-be verdict (so the developer sees what they overrode). When the developer assertion is wrong, retries may double-write; this consequence is bounded (same-shape as ordinary application bugs) but documented.

**Worked example:**

```scrml
function upsertProfile(userId: number, email: string).idempotent() {
  ?{`INSERT INTO profiles (user_id, email) VALUES (${userId}, ${email})
     ON CONFLICT (user_id) DO UPDATE SET email = EXCLUDED.email`}.run()
  // Classifier flags non-monotone (ON CONFLICT not in monotone-whitelist);
  // .idempotent() asserts the SQL is monotone-by-construction at this site;
  // no idempotency key emitted; D-CPS-IDEMPOTENT-OVERRIDE fires (informational).
}
```

**Cross-references the new section MUST include:**
- §8.9.5 (`.nobatch()` — direct precedent shape).
- §19.9.6 (the static classifier this modifier overrides).
- §51.0.G (`<machine>`-bounded batches — the structural alternative; no `.idempotent()` needed when present).

### §1.4 Reuse — TTL constant + UUID generation

**Already-spec'd content reused:** UUID generation per Web Crypto `crypto.randomUUID()` (no new spec text — JS runtime contract).
**TTL value:** 24 hours per Stripe convention. Land as a compiler-internal constant; surface in §19.9.6 normative prose only.

### §1.5 §34 catalog rows (NEW error/diagnostic codes)

| Code | Section | Trigger | Severity |
|------|---------|---------|----------|
| E-CPS-NONIDEM-NO-STORAGE | §19.9.6 | Non-monotone CPS batch in scope of `<program>` with `idempotency-store="none"` OR no resolvable backend (default-resolution falls through). Per S72 body-split integration design dive Q1 ratification. | Error |
| E-CPS-IDEMPOTENCY-STORE-DRIVER-MISMATCH | §40.2 | `idempotency-store="postgres"` / `"sqlite"` / `"mysql"` does not match the closest-ancestor `<program db=>` driver. | Error |
| E-CPS-IDEMPOTENCY-STORE-MISSING-IMPORT | §40.2 | `idempotency-store="redis"` set but `scrml:redis` not in module graph (per §41.4 resolution). | Error |
| D-CPS-MACHINE-INTRINSIC-MONOTONE | §19.9.6 | CPS batch bounded by a `<machine>` `.advance()` transition with allowed-from-states guards; classifier elides idempotency-key emission and notes structural reason. | Diag (info) |
| D-CPS-IDEMPOTENT-OVERRIDE | §19.9.7 | `.idempotent()` modifier applied to a function whose batches the static classifier would have flagged non-monotone. | Diag (info) |
| D-CPS-MONOTONE | §19.9.6 | (OPTIONAL) batch is monotone-by-classification — emitted at `--verbose` only to avoid noise. | Diag (info) |

**Anchor format reuse:** existing `W-CPS-NEEDS-FAILABLE` / `E-CPS-NEEDS-FAILABLE` (Ext 4 ship; SPEC §11449-11450 + §14345-14346) provide the exact §34 row format precedent. Ext 5 adds these rows to BOTH the §11.x running-summary AND §34 master registry (§14000+) — Ext 4's commit does both.

### §1.6 Optional: §6.X Worked-example section for `server @var` concurrent regimes (Q6)

**Per integration design dive Q6 verdict** (§7 of the dive), a §52.X worked-example section documents the three concurrent-multi-client regimes for `server @var` cells (CRDT-shape / compute-over-prior-value / last-write-wins). **DOCUMENTATION ONLY**; no new normative mechanism. **Optional in Ext 5 scope**: can be deferred to a separate doc-only commit if Ext 5's surface gets crowded. Recommend INCLUDING it in Ext 5 for cohesion — same dispatch updates §19.9.6 + §52.X together.

**Section number:** new §52.X (immediately after §52.10 "Interaction with `server function` (Deprecated)") — `<server var>` Cells Under Concurrent Multi-Client Writes.
**Estimated LOC:** ~80-120 lines (three worked examples; no new normative statements; documentation-only cross-ref to §19.9.6).

---

## §2 Implementation surface map

Each entry: file + approximate location + change shape + estimated LOC delta. All LOC estimates conservative (round up).

### §2.1 Static monotonicity classifier — NEW FILE `compiler/src/monotonicity-analyzer.ts`

**Location:** `/home/bryan/scrmlMaster/scrmlTS/compiler/src/monotonicity-analyzer.ts` (NEW).
**Pipeline stage:** new sub-stage **Stage 5.5** (between RI Stage 5 and DG Stage 7) OR fold into RI Stage 5 as a post-pass. Recommend: separate sub-stage for pipeline cleanliness; same shape as Stage 7.5 BP separating from Stage 7 DG.
**Exported function:** `classifyBatchMonotonicity(serverStmtIndices: number[], stmts: ASTNode[]): "monotone" | "non-monotone" | "machine-intrinsic"` — operates on an existing `cpsSplit` per-function. Returns one verdict per batch (each `cpsSplit` is one batch in current single-batch CPS — Ext 1 multi-batch is post-v0.2.0 deferred).
**Algorithm:** AST-walk over the server-statement subset of a CPS-eligible function body. For each statement, classify per the §19.9.6 (a)-(f) rules. Conservative: any unrecognized statement shape returns `"non-monotone"`. Reuse `compiler/src/codegen/reactive-deps.ts` walker primitives where possible (the existing per-statement walker).
**LOC estimate:** ~250-400 LOC (new file + tests). Walker shape similar to `usage-analyzer.ts` (697 LOC; Ext 5's classifier is narrower scope so shorter).
**Pipeline integration:** RI populates `route.cpsSplit`; classifier runs over `route.cpsSplit.serverStmtIndices` per route; result attached as new field `route.cpsSplit.monotonicity`.
**Hookpoint in route-inference.ts:** between line ~2200 (where `cpsSplit` is constructed) and line ~2260 (where the route is finalized). Insert classifier call; attach result.

### §2.2 `<program>` attribute parsing — `idempotency-store=`

**File:** `/home/bryan/scrmlMaster/scrmlTS/compiler/src/attribute-registry.js` (existing) — add `idempotency-store` to allowed-`<program>`-attrs registry.
**File:** `/home/bryan/scrmlMaster/scrmlTS/compiler/src/codegen/usage-analyzer.ts` — add `idempotencyStore: "auto" | "sqlite" | "postgres" | "mysql" | "redis" | "none" | undefined` to the `FeatureUsage` interface (line 51-142). C19 territory precedent (programDocAttrs flag; line 140-141).
**LOC estimate:** ~50 LOC across the two files.
**Validation:** the per-app default-resolution algorithm (§19.9.6 paragraph 3) lives in a small new helper `resolveIdempotencyStore(programNode, db, moduleGraph): StoreBackend | "none"`. Recommend land in the new `monotonicity-analyzer.ts` to keep the Ext 5 surface co-located.

### §2.3 `.idempotent()` modifier parsing — `ast-builder.js`

**File:** `/home/bryan/scrmlMaster/scrmlTS/compiler/src/ast-builder.js` (existing) — extend the function-declaration modifier parser to recognize `.idempotent()` (parallel to `.nobatch()` if it exists in ast-builder; verify at dispatch).
**Reuse:** the existing modifier-suffix parsing for `!` and (if present) `.nobatch()` — Ext 5 follows the exact same shape.
**LOC estimate:** ~30-60 LOC (small lexer/parser extension + AST node-shape extension).
**Field to add:** `FunctionDecl.idempotentModifier: boolean` (new optional field). RI consumes via `route.cpsSplit` — when `true`, RI sets `monotonicity = "monotone"` regardless of the analyzer verdict (developer override).

### §2.4 Idempotency-key emission — `emit-functions.ts`

**File:** `/home/bryan/scrmlMaster/scrmlTS/compiler/src/codegen/emit-functions.ts` (408 LOC; existing).
**Location:** the CPS client wrapper region (~lines 200-340; per Ext 4 file shape — Ext 4 added the try/catch envelope at lines 225-339).
**Change:** at fetch-stub generation, when `route.cpsSplit.monotonicity === "non-monotone"`:
  1. Generate a UUIDv4 client-side: `const _scrml_idempotency_key = crypto.randomUUID();`
  2. Add `Idempotency-Key: ${_scrml_idempotency_key}` to the fetch stub's headers.
  3. (No client-side stored-result handling — the server-side middleware does the dedup; client just receives the result either way.)
When `monotonicity === "monotone"` or `"machine-intrinsic"`: no key generation (current Ext 4 emission shape unchanged).
**LOC estimate:** ~30-50 LOC (small headers-extension + UUID generation; conditional on classifier verdict).

### §2.5 Server-side dedup middleware — `emit-server.ts`

**File:** `/home/bryan/scrmlMaster/scrmlTS/compiler/src/codegen/emit-server.ts` (1030 LOC; existing).
**Location:** the CPS server-stub region (~lines 580-870; Ext 4 added the try/catch envelopes at lines 630 and 800 for both `useBaselineCsrf=true` and `=false` paths).
**Change:** in both CSRF paths, before invoking the CPS body, when `route.cpsSplit.monotonicity === "non-monotone"`:
  1. Read the `Idempotency-Key` request header.
  2. Consult the idempotency-key store (selected by `idempotency-store=`-resolved backend at codegen time).
  3. On hit: return the stored result (skip CPS body entirely).
  4. On miss: invoke the CPS body, store key+result tuple under TTL, return result.
**LOC estimate:** ~60-100 LOC (two paths; both follow the same structure; backend-dispatch shape matches Ext 4's compile-time elision pattern).
**Backend-dispatch shape:** at codegen time, the resolved backend selects the inline runtime call. SQLite/Postgres/MySQL drivers emit `?{}` SQL on the `_scrml_idempotency_keys` shadow table; Redis backend emits a `scrml:redis` `set ... NX EX` call. Each backend has its own emit-helper inside the codegen.

### §2.6 Runtime support — NEW MODULE `compiler/runtime/idempotency.js`

**File:** `/home/bryan/scrmlMaster/scrmlTS/compiler/runtime/idempotency.js` (NEW).
**Function:** runtime helpers for the three backends — `_scrml_idempotency_lookup_sqlite(key)`, `_scrml_idempotency_lookup_redis(key)`, etc. The codegen emits inline calls; the runtime helpers do the actual storage work. Same pattern as `runtime-validators.js` (C6).
**LOC estimate:** ~150-250 LOC (three backend helpers + shadow-table CREATE-IF-NOT-EXISTS bootstrap).
**New runtime chunk:** `idempotency` chunk added to `runtime-chunks.ts` registry (line 1-200 of `compiler/src/codegen/runtime-chunks.ts`); compiler conditionally includes it when `featureUsage.idempotencyStore !== undefined && featureUsage.idempotencyStore !== "none" && app has any non-monotone CPS batch`.

### §2.7 Integration with `<channel>` (just-shipped C18) — VERIFY SCOPE

**File:** `/home/bryan/scrmlMaster/scrmlTS/compiler/src/codegen/emit-channel.ts` (530 LOC; SHIPPED at C18 / `e28a022`).
**Question:** do channel server-fns (`<channel>`'s WebSocket-over-`server function` per §38) need replay safety wiring?
**Answer (preliminary):** WebSocket connections are persistent + per-connection-keyed by the WS protocol; HTTP retry semantics do NOT apply. **Channel server-fns are out-of-scope for Ext 5's idempotency-key envelope.** The classifier MUST recognize channel server-fns and skip them (no key emission, no rejection).
**LOC estimate:** ~10-20 LOC in monotonicity-analyzer (early-return for channel-tagged routes; verify channel routes are distinguishable in `route.cpsSplit` shape — `route.kind === "channel"` likely).
**OPEN QUESTION:** does the WS frame-level retry need its own replay safety? **Answer (Ext 5 scope):** NO — that's a `<channel>`-specific concern, post-v0.2.0; flag for OQ.

### §2.8 Integration with `<engine>` / `<machine>` — verify Q2.6 finding

**File:** none — verification only.
**Verdict per design dive §3.6.E + §3.5:** `<machine>` `.advance()` transitions are S5-safe by §51 allowed-from-states guards alone; no idempotency key needed. The classifier MUST recognize `.advance()` calls + the §51-bounded shape and emit the `"machine-intrinsic"` verdict (D-CPS-MACHINE-INTRINSIC-MONOTONE).
**Implementation:** in `monotonicity-analyzer.ts`, statement-walker recognizes `.advance(...)` member-access on machine-bound variables (per §51.0.G); when the entire batch is bounded by a single `.advance()` call, classify as `"machine-intrinsic"`. Reuse `route-inference.ts` machine-call detection (Trigger 1/3 already detect `<machine>` advance methods).
**Audit point:** verify post-S67/A5 amendments (§51.0.M onTimeout, §51.0.N history, §51.0.O internal:rule, §51.0.Q hierarchy) don't break the intrinsic-monotone leg. **Preliminary read:** they don't — guards still gate transitions; intrinsic-monotone still holds.
**LOC estimate:** ~30-50 LOC in monotonicity-analyzer (recognition pattern).

### §2.9 Static-reject diagnostic — `type-system.ts`

**File:** `/home/bryan/scrmlMaster/scrmlTS/compiler/src/type-system.ts` (existing; Ext 4 territory at the W-CPS-NEEDS-FAILABLE fire site).
**Location:** the function-body / RI integration site where Ext 4 added `fnCpsImplicitFailable` set + W-CPS-NEEDS-FAILABLE emission.
**Change:** add fire-sites for the three new error codes (E-CPS-NONIDEM-NO-STORAGE, E-CPS-IDEMPOTENCY-STORE-DRIVER-MISMATCH, E-CPS-IDEMPOTENCY-STORE-MISSING-IMPORT) + the two diagnostic codes. Reuse Ext 4's diagnostic-emission infrastructure.
**LOC estimate:** ~80-120 LOC (5 new diagnostic shapes + their fire-site predicates).

### §2.10 Summary file-touch list (NEW + EDIT)

**NEW files (3):**
- `compiler/src/monotonicity-analyzer.ts` (~300 LOC)
- `compiler/runtime/idempotency.js` (~200 LOC)
- (optional, may roll into above) idempotency-store backend dispatch helper

**EDITED files (8):**
- `compiler/src/route-inference.ts` (~+30 LOC; classifier hook + monotonicity field on `cpsSplit`)
- `compiler/src/type-system.ts` (~+100 LOC; new diagnostic fire-sites)
- `compiler/src/ast-builder.js` (~+50 LOC; `.idempotent()` modifier parsing)
- `compiler/src/attribute-registry.js` (~+10 LOC; `idempotency-store=` registration)
- `compiler/src/codegen/usage-analyzer.ts` (~+30 LOC; `idempotencyStore` flag)
- `compiler/src/codegen/runtime-chunks.ts` (~+30 LOC; new `idempotency` chunk)
- `compiler/src/codegen/emit-functions.ts` (~+40 LOC; client-side UUID + header emission)
- `compiler/src/codegen/emit-server.ts` (~+80 LOC; server-side dedup middleware in both CSRF paths)

**TOTAL implementation LOC:** ~870-1100 (mostly new-file content + small targeted edits to existing files). Conservative — round to ~1000 LOC.

---

## §3 Test shape

Test suites land per spec section / per emission shape / per error code.

### §3.1 Test corpus location

**Per body-split integration design dive §6.1, predecessor §6.2:**
- `compiler/tests/unit/a9-ext5-monotonicity-classifier.test.js` (NEW) — classifier verdict unit tests.
- `compiler/tests/unit/a9-ext5-program-attr.test.js` (NEW) — `idempotency-store=` parsing + default resolution.
- `compiler/tests/unit/a9-ext5-idempotent-modifier.test.js` (NEW) — `.idempotent()` modifier parsing + override.
- `compiler/tests/integration/a9-ext5-emission.test.js` (NEW) — emitted JS contains/lacks `Idempotency-Key` header per classification.
- `compiler/tests/integration/a9-ext5-runtime-replay.test.js` (NEW) — runtime: replay scenario verifies dedup hit/miss paths against a real SQLite shadow table.
- `compiler/tests/spec/a9-ext5-spec-amendments.test.js` (NEW) — assert SPEC contains §19.9.6 + §19.9.7 + §40.2 attribute table row + §34 rows (precedent: Ext 4 has spec-presence tests at `tests/spec/`).

### §3.2 Coverage list

**Classifier (positive):**
- SELECT-only batch → monotone.
- INSERT (no auto-increment read-back) → monotone.
- UPDATE assignment-only-of-literals → monotone.
- DELETE-only → monotone.
- pure-`fn`-only → monotone.
- `.advance(.X)` only → machine-intrinsic.

**Classifier (negative):**
- UPDATE `counter = counter + 1` → non-monotone.
- INSERT with auto-increment read-back → non-monotone.
- INSERT with `NOW()` / `random()` → non-monotone.
- Mixed-tier batch (SELECT + email send) → non-monotone (catches stdlib I/O).
- Channel server-fn → out-of-scope (no classification; no key).

**`<program> idempotency-store=` (positive):**
- `auto` + db=postgres → resolves to postgres shadow table.
- `auto` + db=sqlite → resolves to sqlite shadow table.
- `auto` + scrml:redis imported → resolves to redis.
- `auto` + nothing → "none" (triggers static rejection on non-monotone).
- `redis` + `scrml:redis` imported → resolves to redis.
- nested `<program>` overrides parent → closest-ancestor wins.

**`<program> idempotency-store=` (negative):**
- `redis` without `scrml:redis` → E-CPS-IDEMPOTENCY-STORE-MISSING-IMPORT.
- `postgres` with `db=sqlite:./app.db` → E-CPS-IDEMPOTENCY-STORE-DRIVER-MISMATCH.
- `none` + non-monotone batch → E-CPS-NONIDEM-NO-STORAGE.

**`.idempotent()` modifier (positive):**
- Function with non-monotone batch + `.idempotent()` → no key emitted; D-CPS-IDEMPOTENT-OVERRIDE fires.
- Function with monotone batch + `.idempotent()` → no-op; no diagnostic.

**Runtime-replay (integration):**
- Two retries with same key → second returns stored result; SQL UPDATE counter NOT double-applied.
- Two retries with different keys → second re-executes; counter applied twice (correct under different keys).
- Cross-process replay (multi-server) — DEFERRED OQ.

**Composition with Ext 4 (`!`-wrap):**
- Non-monotone + Ext 4 fail-path → key stored before fail; replay returns stored fail variant (S5 + S4 composition).
- Machine-intrinsic + Ext 4 → no key; §51 guards catch duplicate transition.

**SPEC presence (mirror Ext 4 shape):**
- §19.9.6 prose contains "static monotonicity classification" anchor.
- §19.9.7 prose contains `.idempotent()` anchor.
- §40.2 attribute table contains `idempotency-store=` row.
- §34 contains 3 new error rows + 2 new diagnostic rows.

### §3.3 Estimated test count

- Classifier unit tests: ~30-40 (positive 12 + negative 12 + edge 8-15)
- Program-attr tests: ~12-15
- Modifier tests: ~6-10
- Emission integration: ~15-20
- Runtime-replay integration: ~8-12
- SPEC presence: ~6-10

**Total: ~75-110 new tests.** Comparable scale to Ext 4 (which delivered +16 tests + spec coverage; Ext 5 is larger because of the runtime-replay layer).

---

## §4 Sequencing within v0.2.0

### §4.1 Dependencies (what must precede Ext 5)

**Already-shipped (no longer blocking):**
- C17 schema additive shared-core lowering (`77b86c9`) — clears the `<program>`-attribute spec-edit ordering constraint per S72 master-list amendment.
- C18 channel WS emission (`e28a022`) — Ext 5 must skip channel server-fns, but no spec-edit conflict.
- C19 §40.7 documentary attrs — closed; the §40 attribute table is stable.
- A9 Ext 4 S4 wiring (`dc98313`) — Ext 5 layers on top of the auto-`!`-wrap envelope.
- Insight-26 Batch-1 Trigger 5 caller-context propagation — Ext 5 reuses the same fnCpsImplicitFailable-style infrastructure for new diagnostics.

**Cleared as of S75: ALL Ext 5 prerequisites met.** No further sequencing constraints.

### §4.2 What depends on Ext 5

Per body-split integration design dive §10.1 + master-list:
- **Full body-split (Ext 1 multi-batch + Ext 3 conditional + Ext 2 loop)** is DEFERRED to v0.next+1 separate cycle (~94h additional). Ext 5 is a prerequisite for Ext 1 (every multi-batch CPS path with non-monotone batches needs idempotency-key infrastructure).
- **A8 test-bind** sequenced AFTER Ext 4 (already shipped); A8 does not depend on Ext 5 directly.
- **Cross-function body-split** DEFERRED to v0.3.0+ (~200-400h, Links territory). Independent of Ext 5.

**Within v0.2.0:** no other phase depends on Ext 5. Ext 5 is the LAST step of the body-split min-viable.

### §4.3 Recommended dispatch sequencing — wave count + parallel-cap

**Single-session 1-dispatch shape (recommended):**

The dispatch can fit in ONE focused-session dispatch (~46h × ~2-day calendar at typical PA cadence). Scope is similar to Ext 4 (which shipped in one S72 session).

**Sub-step decomposition (mirror Ext 4's D1-D4 pattern):**
- **A9-5-D0** Pre-snapshot + spec-edit prose (§19.9.6 + §19.9.7 + §40.2 attribute row + §34 rows). T1 tier; ~6-8h. **Land FIRST** so all subsequent commits cite finalized spec text. **Section-number reroute: §19.9.6, NOT §47** — encode this in the dispatch BRIEF.
- **A9-5-D1** `.idempotent()` modifier parsing (ast-builder.js + AST node-shape). T1 tier; ~2-4h. Smallest delta; lands second.
- **A9-5-D2** `idempotency-store=` attribute parsing + default-resolution helper + FeatureUsage flag. T2 tier; ~4-6h.
- **A9-5-D3** Static monotonicity classifier (NEW `compiler/src/monotonicity-analyzer.ts` + RI hookpoint). T2-T3 tier; ~10-14h. Largest single delta.
- **A9-5-D4** Codegen — emit-functions.ts client wrapper (UUID + header) + emit-server.ts dedup middleware (both CSRF paths). T2 tier; ~6-10h.
- **A9-5-D5** Runtime helpers — `compiler/runtime/idempotency.js` + new `idempotency` runtime chunk wired into runtime-chunks.ts. T2 tier; ~6-8h.
- **A9-5-D6** Static-reject diagnostics (E-CPS-NONIDEM-NO-STORAGE + E-CPS-IDEMPOTENCY-STORE-DRIVER-MISMATCH + E-CPS-IDEMPOTENCY-STORE-MISSING-IMPORT + 2 D- codes) in type-system.ts. T2 tier; ~4-6h.
- **A9-5-D7** Tests — classifier unit + modifier unit + program-attr unit + emission integration + runtime-replay integration + SPEC presence. T2 tier; ~10-14h.
- **A9-5-D8** Friction burn-in + ship commit. T2 tier; ~4-6h.

**Total: ~52-76h (rounded to design-dive's 46h estimate; my breakdown is more conservative).**

**Parallelism opportunities (only if dispatch is split into 2 agents):**
- D0 (spec) + D1 (modifier) can dispatch as one fast pass.
- D3 (classifier) and D5 (runtime) are file-disjoint and can dispatch in parallel after D2 lands.
- D4 + D6 (codegen + diagnostics) are the merge-point; serial after D3.
- D7 + D8 (tests + ship) are serial close.

**Recommendation: 1-dispatch (single agent, sequential D0→D8) for cohesion.** Parallelism opportunity is small (~6-8h savings on a 46-76h budget) and adds coordination risk. Ext 4 shipped in 1-dispatch successfully; Ext 5 follows the same shape.

### §4.4 Parallel-track compatibility

Ext 5 dispatch can run in parallel with these other v0.2.0 tracks (file-disjoint per §9.3 of the integration design dive matrix, re-verified at S75):

- **A1c remaining waves** — A1c Wave 6 closed at C23; Waves 4-5 closed at S73-S75. **No A1c work is currently outstanding.** Ext 5 has no parallel A1c contention.
- **A8 test-bind** (~6-12h, pending) — file-disjoint from Ext 5 (A8 touches `~{}` block parsing + server-fn-call-site dispatch hook; Ext 5 touches CPS classifier + idempotency middleware). Can dispatch in parallel; recommend serial (A8 first; smaller; clears the queue).
- **A2-A7 remaining** — currently no other v0.2.0 phases are in-flight per master-list S74 close.

**Conclusion:** Ext 5 can be the next-session ONLY dispatch with no contention; or it can run alongside A8 (recommend A8 serial-first to keep next-session focused).

---

## §5 Estimated revised scope

### §5.1 vs design-dive estimate (predecessor §5.1: 46h)

| Dispatch component | Design-dive estimate | This survey's estimate | Notes |
|--------------------|---------------------:|-----------------------:|-------|
| Spec edit (§19.9.6 + §19.9.7 + §40.2 + §34) | 8h | **6-8h** | aligns; the new `.idempotent()` section adds ~30 lines but cribs §8.9.5 structure |
| `.idempotent()` modifier parsing | (within impl) | **2-4h** | small lexer/AST extension; reuses existing modifier-suffix shape |
| `idempotency-store=` attribute parsing + resolution | (within impl) | **4-6h** | reuses `db=` resolution shape (§8.1.1) + FeatureUsage extension |
| Static monotonicity classifier (NEW file) | (within impl) | **10-14h** | new analyzer file; AST-walker similar to usage-analyzer; ~250-400 LOC |
| Codegen emission (client + server) | (within impl) | **6-10h** | targeted edits to existing files; reuses Ext 4 envelope shape |
| Runtime helpers (NEW file + chunks) | (within impl) | **6-8h** | new runtime-chunks entry + 3 backend dispatchers |
| Static-reject diagnostics | (within impl) | **4-6h** | reuses Ext 4 diagnostic-emission patterns |
| **Implementation subtotal** | **20h** | **32-48h** | survey is conservative; design-dive estimate may be optimistic |
| Tests | 12h | **10-14h** | aligns; ~75-110 new tests |
| Friction burn-in | 6h | **4-6h** | aligns |
| **TOTAL** | **46h** | **52-76h** | Survey is **~13-65% over** design-dive estimate; recommend 60h budget for safety |

**Calibration notes:**
- The design-dive estimate (46h) bundles "implementation: 20h" too aggressively. My breakdown gets to 32-48h on implementation alone. Either the dive under-estimated, or my breakdown over-estimates each piece. **Conservative calibration:** budget 60h for Ext 5; if it lands faster, the surplus rolls into A8 or v0.2.0 polish.
- **Depth-of-survey-discount opportunities found:**
  - Reuses §8.1.1 db-driver-resolution shape (Q1 ratification core insight) — saves ~4-6h vs. designing the resolution from scratch.
  - Reuses Ext 4 try/catch envelope structure in emit-functions/emit-server — Ext 5 lays inside Ext 4's existing wrappers; no new envelope shape needed. Saves ~4-6h.
  - Reuses §8.9.5 `.nobatch()` shape for `.idempotent()` — same parser/AST/codegen treatment. Saves ~2-4h.
  - Reuses Ext 4 W-CPS-NEEDS-FAILABLE diagnostic-emission infra in type-system.ts — Ext 5's 5 new diagnostic codes piggyback. Saves ~3-5h.
  - **Net: ~13-21h discount available.** Adjusted scope estimate: **40-55h** (vs. dive's 46h, vs. my naive 52-76h). **Recommend dispatch budget: 50h** (mid-point of the discount-adjusted range).

### §5.2 Test scope estimate

~75-110 new tests. Comparable to Ext 4's +16 tests but Ext 5 has more surfaces (classifier × backend × modifier × runtime-replay) so larger naturally.

### §5.3 Total revised v0.2.0 body-split min-viable scope

**A9 Ext 4 SHIPPED:** ~30h actual (per S72 dispatch close).
**A9 Ext 5 PENDING:** ~50h budget (this survey, discount-adjusted).
**Body-split min-viable total:** ~80h actual (vs. design-dive's 76h estimate). Within rounding error; on-budget.

---

## §6 Deferred items (out of Ext 5 scope)

Per the integration design dive's Q2-Q7 verdicts + this survey's audit:

### §6.1 Already DEFERRED (do not re-propose):

1. **Ext 1 multi-batch CPS** (`~38h`) — DEFERRED to v0.next+1 separate cycle per master-list §0.4. Ext 5 is a prerequisite, not a co-dispatch. Multi-batch CPS introduces per-batch monotonicity classification (Ext 5's classifier extends naturally; the data structure already supports `serverStmtIndices` per batch).
2. **Ext 3 conditional-tier emission** (`~22h`) — DEFERRED with Ext 1.
3. **Ext 2 loop-aware splitting** (`~34h`) — DEFERRED with Ext 1.
4. **Cross-function body-split** (`~200-400h`) — DEFERRED to v0.3.0+ (Q7 verdict). Links territory. Ext 5 is intra-function only.
5. **Codemod for `.idempotent()` modifier auto-insertion** — DEFERRED per S72 migration-tooling rule. Manual `.idempotent()` annotation only; bryan can add manually.
6. **Multi-process server replication / cross-process replay coordination** — DEFERRED to v1.0.0+ (Q6 cleanup). Ext 5's idempotency-key store is per-app-instance; multi-process replication of the store is post-scope.
7. **`.nonidempotent()` modifier (force-emit-key opt-in)** — REJECTED per Q2 verdict (option 3 eliminated). No use case; can be added later if needed.
8. **Per-batch annotation `?{ } as idempotent`** — REJECTED per Q2 verdict (option 4 eliminated). Function-grain (`.idempotent()`) is the natural granularity.
9. **Compiler-inferred natural-key from batch contents** — REJECTED per design dive §3.5 (option 5 eliminated; "too much heuristic"). UUID-only.
10. **CRDT-shape integration for `server @var`** — DEFERRED beyond Ext 5 (Q6 worked-example documentation only; no normative mechanism in Ext 5). Future capability work.

### §6.2 Surfaced AND deferred (NEW within this survey):

11. **WebSocket frame-level replay safety for `<channel>`** — Ext 5 SKIPS channels (per §2.7). Channel-specific replay is a separate concern — flag for `<channel>` post-v0.2.0 hardening if needed.
12. **TTL configurability** — Ext 5 hard-codes 24h Stripe convention. If adopters need configurable TTL, future spec amendment adds `idempotency-ttl=` attribute. Out of Ext 5 scope.
13. **Per-route idempotency-store override** — currently only at `<program>` granularity. Per-function override (e.g., function-modifier `.store("redis")`) is post-scope. The design dive did not propose this; defer.
14. **Batch-grain monotonicity classification within multi-batch CPS** — only relevant when Ext 1 (multi-batch) ships. Ext 5's classifier currently operates per-`cpsSplit` (which is one batch under current single-batch CPS). The data structure already accommodates per-batch verdicts; trivial to extend when Ext 1 lands. Document the extension shape in Ext 5's spec but don't implement.

---

## §7 Open questions (surface for next-session PA)

These are points where the design dives + spec are silent or where this survey identified ambiguity. PA should resolve at dispatch-time or surface to user before implementation.

### §7.1 OQ-Ext5-1 — Section-number for primary spec edit (HIGH)

**Status:** **HIGH PRIORITY. Encode resolution in dispatch BRIEF up-front.**
**Question:** the integration design dive cites "§47 server functions" (e.g., §10.1 dispatch order, design dive §3.5 algorithm sketch). Ext 4 dispatch surfaced that **§47 is "Output Name Encoding"** — the actual server-fn locus is **§19.9**. Ext 4 amended §19.9.5; Ext 5's analogous monotonicity-classifier section should land at **§19.9.6** (after Ext 4's §19.9.5).
**Recommendation:** dispatch BRIEF MUST encode "§19.9.6, NOT §47" up-front. Same reroute Ext 4 made; bake into Ext 5 dispatch from the start. **Resolved by this survey.**

### §7.2 OQ-Ext5-2 — `idempotency-store=` exact attribute name (LOW-MED)

**Status:** dispatch-time call; not blocking.
**Question:** integration design dive §11 OQ #7 flags this. Candidate names: `idempotency-store=` (this survey's recommendation; matches `db=` brevity), `idempotency-key-store=`, `cps-key-store=`, `replay-store=`.
**Recommendation:** `idempotency-store=` per design dive default; ergonomic and aligns with §40 attribute naming pattern.
**Resolution path:** dispatch BRIEF picks one; user can rename in PR review if disliked.

### §7.3 OQ-Ext5-3 — `_scrml_idempotency_keys` shadow-table schema (MED)

**Status:** dispatch-time call; not blocking.
**Question:** what columns does the shadow table have? Stripe/Brandur pattern is `(key TEXT PRIMARY KEY, response_body TEXT, created_at TIMESTAMP, expires_at TIMESTAMP)`. Need to confirm:
- Response body serialization format (JSON?).
- Whether to store HTTP status code separately (yes, recommended).
- TTL eviction strategy (lazy on read? background sweep?). Recommend lazy on read for simplicity.
**Recommendation:** dispatch BRIEF specifies the table schema explicitly. Suggested: `_scrml_idempotency_keys (key TEXT PRIMARY KEY, response_body TEXT NOT NULL, response_status INTEGER NOT NULL, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL)` — INTEGER timestamps for cross-driver portability.

### §7.4 OQ-Ext5-4 — Emit `D-CPS-MONOTONE` info diagnostic by default? (LOW)

**Status:** dispatch-time call; not blocking.
**Question:** the design dive §3.5 lists D-CPS-MONOTONE as an info-level diagnostic. Should it fire on EVERY monotone-classified batch (noisy), only at `--verbose` (recommended), or only at `--emit-monotonicity` (debug-only flag)?
**Recommendation:** verbose-only. Production builds elide.

### §7.5 OQ-Ext5-5 — `<channel>` server-fns: SKIP or REJECT? (MED)

**Status:** dispatch-time call; affects channel-emission.test invariants.
**Question:** §2.7 above proposes the classifier SKIPs channel server-fns (no key emission, no rejection). Alternative: REJECT all channel server-fns from CPS-eligibility entirely (channel routes are not CPS-split today; need to verify).
**Recommendation:** verify at dispatch — likely channel routes are already non-CPS-eligible (per emit-channel.ts shape), so the question is moot. If not, SKIP (no key emission) is the conservative choice.

### §7.6 OQ-Ext5-6 — Default-resolution algorithm precedence: db-driver vs scrml:redis (MED)

**Status:** dispatch-time call; affects user expectations.
**Question:** §19.9.6 paragraph 3 default-resolution: db-shadow-table FIRST, then scrml:redis. Is this the right precedence? Argument for db-first: most apps have a db before they import redis; default-aligns with majority case. Argument for redis-first: redis is faster; sophisticated apps that import redis explicitly probably want it. Integration design dive §2 picks db-first.
**Recommendation:** db-first per integration design dive. **Resolved by integration design dive.** Re-surface if implementation shows friction.

### §7.7 OQ-Ext5-7 — Stage placement of monotonicity classifier (LOW)

**Status:** dispatch-time call; not blocking.
**Question:** new Stage 5.5 (own sub-stage) OR fold into existing Stage 5 RI as a post-pass? §2.1 above recommends new Stage 5.5 (mirroring Stage 7.5 BP).
**Recommendation:** new Stage 5.5 for cleanliness. PIPELINE.md gets a small new section (§Stage 5.5: Monotonicity Classifier). ~30 LOC of PIPELINE prose addition. Already accounted for in spec-edit budget.

### §7.8 OQ-Ext5-8 — `<program>`-attribute conflicts: section-numbering (LOW)

**Status:** spec-coherence cleanup, NOT Ext 5 scope.
**Question:** §40.2's sub-anchors are mis-numbered as "39.2.x" in current SPEC (e.g., line 16662 `#### 39.2.1 cors=`). This is a pre-existing inconsistency NOT introduced by Ext 5. Adding `idempotency-store=` will land it under the same mis-numbered family.
**Recommendation:** Ext 5 follows the existing inconsistency (use `#### 39.2.6 idempotency-store=`). Spec-coherence cleanup is a separate doc-only commit, OUT OF Ext 5 scope. Surface as a wrap-cleanup item.

---

## §8 Dispatch artifact starter-pack (for next-session PA)

When PA dispatches Ext 5, the BRIEF should include:

1. **Spec section reroute up-front:** "Spec edit lands at §19.9.6 + §19.9.7 + §40.2 attribute table + §34 rows. NOT §47."
2. **§1 of this survey** as the spec-edit deliverable spec (paste prose drafts).
3. **§2 of this survey** as the implementation surface map (file-by-file work list).
4. **§3 of this survey** as the test scope.
5. **OQ-Ext5-2 / 3 / 4 / 5** as call-out points where PA should make a decision before dispatching the brief OR include the question in the brief for the agent to flag at appropriate dispatch step.
6. **Reuse-discount audit** (§5.1) ensures dispatch budget is right-sized — recommend 50h.
7. **Sub-step decomposition** (§4.3) provides the dispatch's commit-cadence shape. Mirror Ext 4's D0-D8 progress.md pattern.

---

## §9 References

### Primary corpus
- Body-split integration + residual design dive: `/home/bryan/scrmlMaster/scrml-support/docs/deep-dives/body-split-integration-and-residual-design-2026-05-08.md`
- Body-split soundness-precise design dive: `/home/bryan/scrmlMaster/scrml-support/docs/deep-dives/body-split-soundness-design-2026-05-08.md`
- Body-split soundness analysis (predecessor): `/home/bryan/scrmlMaster/scrml-support/docs/deep-dives/soundness-analysis-for-body-split-2026-05-08.md`
- User-voice S72 ratifications: `/home/bryan/scrmlMaster/scrml-support/user-voice-scrmlTS.md` lines 5835-5926.
- master-list.md A9 row: `/home/bryan/scrmlMaster/scrmlTS/master-list.md` line 46.

### SPEC anchors (for spec-edit landing)
- §8.1.1 db driver resolution: `/home/bryan/scrmlMaster/scrmlTS/compiler/SPEC.md` line 5286.
- §8.9.5 `.nobatch()` modifier (parallel-shape precedent): line 5727.
- §19.6.7 multi-batch granularity (Ext 4 ship): line 10904.
- §19.9 server function errors: line 11001.
- §19.9.5 auto-`!`-wrap (Ext 4 ship): line 11069.
- §19.10 SQL transactions: line 11167.
- §34 error registry (running summary): line 14208 + master at 14345.
- §40.2 compiler-auto middleware attributes: line 16643.
- §40.7 documentary attributes (C19 ship): line 16852.
- §41.4 stdlib resolution: line 17040.
- §43 nested `<program>`: line 17549.
- §51.0.G `.advance(.X)` transitions: line 20502.

### Compiler file landings (for implementation)
- `compiler/src/route-inference.ts` (CPSSplit @ line 17/108; analyzeCPSEligibility @ 842; cpsSplit attachment @ 2200-2260).
- `compiler/src/codegen/emit-functions.ts` (CPS client wrapper @ 200-340; Ext 4 envelope @ 225-339).
- `compiler/src/codegen/emit-server.ts` (CPS server stub @ 580-870; Ext 4 envelopes @ 630, 800).
- `compiler/src/codegen/emit-channel.ts` (C18 ship; channel-fn emission — Ext 5 SKIPs).
- `compiler/src/codegen/usage-analyzer.ts` (FeatureUsage @ 51; C0 precedent for new flag).
- `compiler/src/codegen/runtime-chunks.ts` (chunk registry @ 1-200; new `idempotency` chunk).
- `compiler/src/batch-planner.ts` (existing §8.9 BatchPlan emitter; closest precedent for monotonicity-analyzer shape).
- `compiler/src/type-system.ts` (Ext 4 W-CPS-NEEDS-FAILABLE fire-site; Ext 5 reuses pattern).
- `compiler/src/ast-builder.js` (modifier-suffix parsing).
- `compiler/src/attribute-registry.js` (allowed-attrs registry).

### Ext 4 dispatch landing (mirror shape)
- `/home/bryan/scrmlMaster/scrmlTS/docs/changes/a9-ext4-s4-wiring-2026-05-08/progress.md` — D0-D8 dispatch shape Ext 5 should mirror.
- Commit `dc98313` — Ext 4 SHIP.

### Prior-art (for reviewer / spec rationale)
- Stripe idempotency: https://stripe.com/blog/idempotency
- Brandur Postgres idempotency keys: https://brandur.org/idempotency-keys
- HTTP Idempotency-Key RFC draft: https://httptoolkit.com/blog/idempotency-keys/
- Hellerstein/Alvaro CALM (CACM 2020): https://cacm.acm.org/research/keeping-calm/

---

## Tags

a9-ext5, S5-replay-safety, idempotency-key-storage, static-monotonicity-classifier, dot-idempotent-modifier, idempotency-store-program-attribute, scrmlconfig-program-attribute-resolved, CALM-monotonicity, machine-section-51-intrinsic-monotone, channel-skip, multi-process-deferred, ext-4-composition, section-19-9-6-correct-anchor, section-47-trap-avoided, dispatch-ready, single-dispatch-recommended, 50h-budget, reuse-discount-15h, db-driver-precedent-reused, nobatch-modifier-shape-reused, ext-4-envelope-reused, ext-4-diagnostic-infra-reused, deep-dive-2026-05-09-survey

## Links

- Predecessor integration dive: `/home/bryan/scrmlMaster/scrml-support/docs/deep-dives/body-split-integration-and-residual-design-2026-05-08.md`
- Predecessor soundness-precise design: `/home/bryan/scrmlMaster/scrml-support/docs/deep-dives/body-split-soundness-design-2026-05-08.md`
- Predecessor soundness analysis: `/home/bryan/scrmlMaster/scrml-support/docs/deep-dives/soundness-analysis-for-body-split-2026-05-08.md`
- User-voice S72: `/home/bryan/scrmlMaster/scrml-support/user-voice-scrmlTS.md` lines 5835-5926
- Ext 4 progress (mirror shape): `/home/bryan/scrmlMaster/scrmlTS/docs/changes/a9-ext4-s4-wiring-2026-05-08/progress.md`
- master-list A9 row: `/home/bryan/scrmlMaster/scrmlTS/master-list.md` line 46
- SPEC §19.9.5 (Ext 4 prior-art for §19.9.6 shape): `/home/bryan/scrmlMaster/scrmlTS/compiler/SPEC.md` line 11069
- SPEC §8.1.1 (db-driver-resolution precedent): `/home/bryan/scrmlMaster/scrmlTS/compiler/SPEC.md` line 5286
- SPEC §8.9.5 (.nobatch() shape precedent): `/home/bryan/scrmlMaster/scrmlTS/compiler/SPEC.md` line 5727
- SPEC §40.2 (compiler-auto middleware): `/home/bryan/scrmlMaster/scrmlTS/compiler/SPEC.md` line 16643
- Stripe idempotency: https://stripe.com/blog/idempotency
- Brandur Postgres idempotency-keys: https://brandur.org/idempotency-keys
- HTTP Idempotency-Key RFC: https://httptoolkit.com/blog/idempotency-keys/
- CALM (CACM 2020): https://cacm.acm.org/research/keeping-calm/
