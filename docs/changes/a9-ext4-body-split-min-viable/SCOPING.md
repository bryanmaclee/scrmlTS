# A9 — Body-Split Min-Viable: Extension 4 (S4 Wiring) — Implementation Scoping

**Status:** RATIFIED per pa.md / master-list § A9 row. Dispatch-ready.
**Authority:**
- `scrml-support/docs/deep-dives/soundness-analysis-for-body-split-2026-05-08.md` (S4–S8 soundness predicates)
- `scrml-support/docs/deep-dives/body-split-soundness-design-2026-05-08.md` §3.4 (Ext 4 option matrix + verdict: compose 3+4+5; algorithm sketch; diagnostics; prior art)
- `scrml-support/docs/deep-dives/body-split-integration-and-residual-design-2026-05-08.md` §5 (Q4 deprecation timeline — three-stage W- → E- → done, mirrors `<machine>` precedent)
- master-list §0.1 A9 row — A9 Ext 4 dispatch-ready post-Insight-26-Batch-1 (Trigger 5 caller-context propagation already shipped at `ea0ee5b`); v0.4 anchor feature.

**Estimate:** ~30h (per master-list row).
**v0.4 anchor:** YES — this is the v0.4 marketed feature ("ergonomic and correctness improvement for the server-function surface").

---

## §1 Scope

### What ships in Ext 4

The compiler retroactively annotates every CPS-emitted server-stub as `!`-typed (return shape `T | SqlError | NetworkError` per built-in scrml error variants); auto-propagates `!` through caller-context (extending Insight 26 Trigger 5 already shipped at `ea0ee5b`); statically rejects the corner case where the caller is non-`!` and not inside an `<errorBoundary>`.

The adopter-visible payoff: a function that today crosses the server boundary and may fail silently at runtime now fails *structurally* via scrml's `!` / `<errorBoundary>` / `?` error system — at compile time the compiler enforces handling.

The minimum-viable body-split adds NO new capability beyond what single-batch CPS does today. The capability extension (multi-batch CPS / loop-aware split / conditional-tier) lives in Ext 1 / Ext 2 / Ext 3 — out of THIS scope, deferred to a separate v0.next+1 cycle per body-split-integration-and-residual-design §6.

### In scope

1. **Implicit-`!` retro-wrap** — every CPS-emitted server-stub stub gets `!` semantics (option 3 of §3.4 verdict).
2. **Caller-context auto-`!`-propagation** — extending the existing Insight 26 Trigger 5 (`ea0ee5b`). When a function `F` calls a CPS-split function `G` and `F`'s body is inside an `<errorBoundary>` OR `F` is itself `!`, the call site satisfies §19.4. (Option 4 of §3.4 verdict.)
3. **Static-reject corner case** — when `F` is non-`!`, not inside an `<errorBoundary>`, and calls a CPS-split function, emit `E-CPS-NO-ERROR-HANDLER`. (Option 5 of §3.4 verdict.)
4. **Deprecation cycle** — 3-stage (v0.4 W- → v0.5 E- → done) per §5 Q4 verdict; mirrors `<machine>` precedent.
5. **Diagnostic surface** — `W-CPS-NEEDS-FAILABLE` (transitional) and `E-CPS-NO-ERROR-HANDLER` (post-cycle).
6. **Test coverage** — per Q5 sketch (~15-25 Ext-4-specific fixtures across the 5 test layers).
7. **SPEC amendment** — §19 catalog update (built-in `Error::Generic | SqlError | NetworkError` enum), §34 catalog rows for the 2 new codes; PIPELINE.md route-inference contract update.

### Out of scope

- Ext 1 multi-batch CPS (separate dispatch, sequence-blocked by Ext 4 + Ext 5).
- Ext 2 loop-aware splitting (separate, post-Ext-1).
- Ext 3 conditional-tier emission (separate, post-Ext-1).
- Ext 5 static monotonicity classifier + Idempotency-Key (separate dispatch; pending A1c Wave 5 C17 spec-edit ordering per master-list).
- Codemod tooling — deferred per Q4 verdict + S72 migration-tooling-deferral rule.
- Cross-function body-split — deferred to v0.5+ per Q7 verdict.

### Pre-conditions (already shipped)

- **Insight 26 Trigger 5** (`ea0ee5b`, S?). Adds caller-context propagation in `route-inference.ts`. THIS is the piece Ext 4 extends from. The trigger today propagates `<server>` annotation up the call graph; Ext 4 reuses the same call-graph walk to propagate `!`-handling-presence.
- `analyzeCPSEligibility` function exists at `compiler/src/route-inference.ts:1155`. Returns `cpsSplit: CPSSplit | null` per the type at line 17. Stage 5.5 consumes; emit-server.ts emits the server stub (line 104 cross-ref). Ext 4 lands on this same pipeline.

---

## §2 Sub-step decomposition

### A9.Ext4.1 — Implicit-`!` retro-wrap on CPS-emitted stubs (~6-8h)

**Locus:** `compiler/src/route-inference.ts` post-`analyzeCPSEligibility`; `compiler/src/codegen/emit-server.ts` server-stub emit; client-stub emit (TBD locus — confirm during dispatch).

**Work:**
- Where the CPS server-stub is emitted, annotate the symbol-table record with an implicit `!` marker (new `cpsImplicitFailable: true` field on the function's symbol-table record).
- The error variant set is the built-in `Error::Generic | SqlError | NetworkError` enum (declare in `stdlib/data/index.scrml` or `stdlib/errors/index.scrml` — confirm landing locus during dispatch).
- The client-wrapper stub awaits the server-fetch; on `await` throw, produces the corresponding error variant via §19.5 `?` propagation. (Today the wrapper lets the exception propagate uncaught.)

**Tests:** 5-7 fixtures — single-batch CPS with implicit-`!`; explicit `!{}` handler at call site; no-handler call site (triggers W- per Ext4.2); match-form call site; `?` propagation through caller.

**Acceptance:** `bun scrml compile` against a CPS-eligible call site emits a server stub whose typed return is `T | Error::Generic | SqlError | NetworkError`. Call sites without handlers fire `W-CPS-NEEDS-FAILABLE` (Ext4.2).

### A9.Ext4.2 — Caller-context auto-`!`-propagation (~8-10h)

**Locus:** `compiler/src/route-inference.ts` — extend the existing Insight 26 Trigger 5 caller-context walk (which already propagates `<server>` annotation). Reuse the call-graph traversal; add an orthogonal `failableHandlingAvailable` boolean per call-site.

**Algorithm (per §3.4 sketch):**
1. For each call-site `F → G` where `G` is CPS-split:
   a. If `G`'s body is inside an `<errorBoundary>` markup ancestor: `failableHandlingAvailable = true`, no diagnostic.
   b. If `F` itself carries `!` modifier OR has implicit-`!` from a prior Ext4.1 propagation: `failableHandlingAvailable = true`, no diagnostic.
   c. Otherwise: `failableHandlingAvailable = false` → fire `W-CPS-NEEDS-FAILABLE` at the call site, with the 3-option remediation list (per §3.4 diagnostic shape).

**Tests:** 7-10 fixtures — markup-context call site under `<errorBoundary>`; logic-context call site in `!` caller; logic-context call site in plain function (triggers W-); nested call-site (transitive propagation); multiple CPS callees in one caller; mixed `<errorBoundary>` boundaries; deep call-graph propagation.

**Acceptance:** the diagnostic fires correctly at the precise call site (not at the CPS-split callee's declaration), with span-precise pointer + 3-option remediation. No false-positives on call sites already inside an `<errorBoundary>` or `!` caller.

### A9.Ext4.3 — Static-reject for the uncovered corner (~3-4h)

**Locus:** same call-site walk as Ext4.2; the case where Ext4.2 would emit W- AND the function has been called from contexts that DEFINITIVELY cannot handle a failure (e.g., synchronous lifecycle hooks where wrapping in `!` would silently lose the handler).

**Algorithm:** during the deprecation cycle (Ext4.5), `W-CPS-NEEDS-FAILABLE` transitions to `E-CPS-NO-ERROR-HANDLER` — same fire conditions, severity change. In v0.4 (this dispatch), the static-reject is the FUTURE-state. In v0.4 we ship the W- ONLY; the E- transition happens in v0.5.

**Tests:** lock-in test verifying W- fires today; future-state test (`describe.skip` placeholder for the v0.5 transition) verifying E- shape.

**Acceptance:** the `E-CPS-NO-ERROR-HANDLER` code is REGISTERED at §34 in this dispatch (its row + diagnostic format text); fire-site is implemented as W- today; the W-→E- transition is a config-flag-flip OR a literal severity-edit in route-inference.ts (TBD at dispatch — confirm low-cost transition path).

### A9.Ext4.4 — SPEC amendments (~3-4h)

**Locus:** `compiler/SPEC.md` §19 + §34.

**Edits:**
1. §19.5 (existing `?` propagation rule) — extend with a normative paragraph: CPS-emitted server stubs are implicitly `!`-typed; their return shape is `T | SqlError | NetworkError`; the `?` propagation rule applies uniformly.
2. §19.8 (or appropriate §19.x for the error-enum catalog) — declare/document the built-in `Error::Generic | SqlError | NetworkError` enum that CPS stubs return. If a built-in enum already exists at this section, extend its prose; otherwise add the subsection.
3. §34 — 2 new rows: `W-CPS-NEEDS-FAILABLE` (warning, transitional; will become error per Q4 deprecation) and `E-CPS-NO-ERROR-HANDLER` (error, post-cycle; registered in v0.4 but fire-site activates in v0.5 per Ext4.3).

**Acceptance:** spec text matches the algorithm sketch in §3.4; cross-refs from §19 ↔ §34 ↔ this dispatch are bidirectional; `bun run scripts/regen-spec-index.ts` ran, SPEC-INDEX.md updated.

### A9.Ext4.5 — Deprecation cycle wiring (~2-3h)

**Locus:** `compiler/src/route-inference.ts` fire-site for `W-CPS-NEEDS-FAILABLE`.

**Today (v0.4):** emit warning at every uncovered call site.
**Future (v0.5):** flip severity to error; rename code to `E-CPS-NO-ERROR-HANDLER`; same fire-site, same span semantics.

**Path forward:** in v0.4, document the transition path in the §34 row for both codes; in v0.5, flip the severity flag in route-inference.ts (single-line change) + update the §34 W-row to "RETIRED — see E-row".

**Acceptance:** the W-/E- shape pair is documented; transition is a documented one-line flip.

### A9.Ext4.6 — Test corpus (~5-8h)

Per §3.4 algorithm + Q5 sketch, target ~15-25 fixtures total across these layers:

| Layer | Count | Coverage |
|---|---|---|
| Per-extension positive | 4-6 | implicit-`!` shape; correct error-variant emission |
| Per-extension negative | 4-6 | W-CPS-NEEDS-FAILABLE at every uncovered call-site shape |
| Soundness | 2-3 | S1 (existing semantics preserved at handled call sites); S4 (failures route through §19) |
| Composition | 3-5 | `<errorBoundary>` × CPS; `!` caller × CPS; nested CPS callees; `?` propagation through CPS-failable functions |
| Adopter-realistic | 1-2 | end-to-end small app (login form + DB fetch) exercising the full path |
| Negative | 1-2 | rejects ill-formed `!{}` against CPS-implicit-error-types |

**Locus:** `compiler/tests/conformance/conf-cps-implicit-failable.test.js` (new) + integration tests in `compiler/tests/integration/`.

**Acceptance:** pre-commit gate clean (baseline 12,645 pass / 0 fail at S101); +15-25 new tests; zero regressions in existing route-inference + error-handling tests.

### A9.Ext4.7 — PIPELINE.md update (~1-2h)

**Locus:** `compiler/PIPELINE.md` route-inference stage section.

**Edits:**
- Document the new `cpsImplicitFailable` field on the function symbol-table record (Stage 5.5 contract).
- Document the new caller-context propagation extension (extends Insight 26 Trigger 5).
- Document the W-/E- emission contract at the W-CPS-NEEDS-FAILABLE / E-CPS-NO-ERROR-HANDLER fire sites.
- Document the v0.4 → v0.5 deprecation flip path.

**Acceptance:** PIPELINE.md contract text matches the implementation; stage-failure-mode catalog gets a new entry per the diagnostic.

---

## §3 Sequencing

```
Ext4.4 (SPEC amendment) ──┐
                          ├──> Ext4.1 (implicit-`!` retro-wrap) ──┐
                          │                                       │
Ext4.7 (PIPELINE)         │                                       ├──> Ext4.6 (tests)
                          ├──> Ext4.2 (caller-context propagate) ──┤
                          │                                       │
                          └──> Ext4.3 (E-code register, W- fire) ──┘

Ext4.5 (deprecation wiring) — folds into Ext4.3 emission code; not a separate sub-step.
```

Ext4.4 (SPEC) leads — Rule 4 (SPEC is normative). Ext4.7 (PIPELINE) can land in parallel.
Ext4.1 / Ext4.2 / Ext4.3 are sequential within the route-inference layer.
Ext4.6 (tests) is the final close.

Total: ~30h aligning to the master-list estimate.

---

## §4 Cross-references

- pa.md Rule 4 — SPEC normative, derived docs are NOT. Apply at every sub-step.
- master-list § A9 row.
- `scrml-support/design-insights.md` Insight 26 (server-keyword deprecation Position B). The Trigger 5 piece ships at `ea0ee5b`.
- SPEC §19 (current error model), §19.5 (`?` propagation), §19.6 (`<errorBoundary>`), §19.8 (error variant catalog), §34 (diagnostics catalog).
- `compiler/src/route-inference.ts:1155` (analyzeCPSEligibility entry point).
- `compiler/src/codegen/emit-server.ts` (server-stub emit).

---

## §5 Open questions for the dispatch agent

1. **Error-enum locus** — is `Error::Generic | SqlError | NetworkError` declared today as a stdlib type (likely `stdlib/data/index.scrml` or `stdlib/errors/index.scrml`)? If not, this dispatch declares it. Confirm via grep + adjust the SPEC §19.8 edit accordingly.
2. **Client-wrapper exception-translation locus** — where exactly is the client-side fetch wrapper emitted? Likely `compiler/src/codegen/emit-client.ts` or similar; the dispatch needs to find the precise locus where `await serverStub(...)` throw → §19.5 `?` propagation translation happens.
3. **Lifecycle-hook static-reject scope** — the soundness DD §3.4 mentions "synchronous lifecycle hooks where wrapping in `!` would silently lose the handler" as an Ext4.3 target. Identify which lifecycle hooks qualify (e.g., `<onMount>`, `<onCleanup>`, `<onTransition>` per §6.7 + §51.0.H). The static-reject corner case set needs to be enumerated explicitly.
4. **`<errorBoundary>` ancestor walk** — how deep does the propagation walk? File-scope? Component-scope? Should match the existing §19.6 visibility rule; verify against current type-system.ts walker patterns.

These are the dispatch-time disambiguations. Surface them at dispatch open; resolve before code.

---

## §6 Acceptance / Definition of Done

- All 7 sub-steps shipped.
- Pre-commit gate clean: 12,645+ pass / 0 fail (S101 baseline).
- Pre-push gate clean: TodoMVC + full suite pass.
- SPEC §19 + §34 amended; SPEC-INDEX.md regenerated.
- PIPELINE.md route-inference section updated.
- 15-25 new tests across the 5 layers per Q5 sketch.
- W-CPS-NEEDS-FAILABLE fires at every uncovered call-site shape; correct span; correct 3-option remediation; doesn't false-positive inside `<errorBoundary>` or `!` callers.
- v0.4 → v0.5 deprecation path documented (one-line severity flip).
- No new architectural surface beyond what §3.4 verdict (Options 3+4+5) authorizes.

When all done: this dispatch closes A9 Ext 4. v0.4 cut blocker becomes A9 Ext 5 only (sequence-blocked by A1c Wave 5 C17).

---

## Tags

#a9 #ext-4 #body-split #v0.4-anchor #cps-implicit-failable #insight-26-trigger-5-extension #w-cps-needs-failable #e-cps-no-error-handler #deprecation-cycle #soundness-s4 #scoping-doc
