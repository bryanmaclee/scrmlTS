# A5-7 — Tests + Samples Inventory (S80, 2026-05-11)

**Purpose:** map current A5 (engine temporal + hierarchy + history + internal:rule= + parallel) coverage across unit tests, integration tests, and `samples/compilation-tests/` end-to-end fixtures. Surface gaps. Decompose A5-7 into sub-dispatches.

**Per-primer §7.1 + SPEC §51 surface map.**

---

## 1. A5 feature surface (from primer + SPEC)

| # | Feature | SPEC ref | Status | Spec landed | Codegen landed |
|---|---------|----------|--------|-------------|----------------|
| F1 | `<onTimeout after=D to=.V/>` (per-state timer) | §51.0.M | ✅ Full | S68 | S77 (A5-4) |
| F1a | `<onTimeout name=IDENT>` (named timer) | §51.0.M.1 | ✅ Full | S79 | S79 (A5-6 Feature 1) |
| F1b | `cancelTimer("name")` builtin (call-ref form only — v1) | §51.0.M.1 | ✅ v1 | S79 | S79 |
| F2 | `<onIdle after=D to=.V/>` (engine-wide watchdog) | §51.0.R | ✅ Full | S77 | S77 (A5-6) |
| F3 | Computed-delay `after=${expr}<unit>` (engine surface) | §51.12.3.1 | ✅ Full | S68 | S77 (A5-5) |
| F3a | Computed-delay (legacy `<machine>` surface) | §51.12.3.1 | ✅ Full | S68 | S77 (A5-5b) |
| F4 | Nested `<engine>` / hierarchy (composite state-children) | §51.0.Q.1 | 🟡 Spec only | S68 | NOT IMPLEMENTED |
| F5 | Parent-rule cascade dispatch | §51.0.Q.2 | 🟡 Spec only | S68 | NOT IMPLEMENTED |
| F6 | `history` attribute + `.Variant.history` target | §51.0.N | 🟡 Spec only | S68 | NOT IMPLEMENTED |
| F7 | `internal:rule=` prefix | §51.0.O | 🟡 Spec only | S68 | NOT IMPLEMENTED |
| F8 | `parallel` attribute on file-scope `<engine>` (naming sugar) | §51.0.P | 🟡 Spec only | S68 | NOT IMPLEMENTED |
| F9 | Machine Cohesion (E-COMPONENT-ENGINE-SCOPE) | §51.0.K | ✅ Full | S68 | S68 (B17) |

**Key finding:** features F4–F8 (hierarchy, history, internal:rule=, parallel) are SPEC-ONLY. They have **no codegen and only spec-test coverage** today. A5-7 sample coverage is bounded by what's implemented — only F1, F1a, F1b, F2, F3, F3a, F9 are sample-eligible.

---

## 2. Existing test coverage (unit + integration)

| Test file | Tests | Covers |
|-----------|------:|--------|
| `compiler/tests/unit/a5-2-parser-support.test.js` | 59 | F1, F2, F3 parser surface |
| `compiler/tests/unit/a5-3-typer-walker.test.js` | 51 | F1, F2 typer + validation |
| `compiler/tests/unit/engine-ontimeout-codegen.test.js` | 34 | F1 codegen (timer-config table, arm/clear) |
| `compiler/tests/unit/computed-delay.test.js` | 31 | F3 + F3a (both surfaces) |
| `compiler/tests/unit/a5-6-feature-1-named-timer.test.js` | 28 | F1a + F1b |
| `compiler/tests/unit/engine-onIdle-watchdog.test.js` | 13 | F2 |
| `compiler/tests/integration/engine-ontimeout-end-to-end.test.js` | 9 | F1 end-to-end (compile → run → verify) |
| `compiler/tests/unit/engine-body-render.test.js` | 31 | Phase A10 body rendering (orthogonal but engine-adjacent) |
| `compiler/tests/unit/engine-binding-b14.test.js` | 44 | Engine variable binding (B14 + adjacent) |
| `compiler/tests/unit/engine-body-children.test.js` | 8 | Engine body children parsing |
| **Subtotal — A5-direct** | **~166** | F1, F1a, F1b, F2, F3, F3a |
| **Plus engine-surface adjacent** | **~83** | binding, body-render, body-children (Phase A10 / B14 / B15) |
| **Total engine-surface tests** | **~249** | |

**Unit + integration coverage is comprehensive.** A5-7 should NOT add more unit tests for shipped features unless gaps are surfaced. Focus is samples.

---

## 3. Existing sample coverage (`samples/compilation-tests/`)

| Sample | Lines | Covers |
|--------|------:|--------|
| `engine-modern-001-basic.scrml` | ~50 | Engine basic (Tier 2 minimal) |
| `engine-modern-002-effects.scrml` | ~70 | Engine with `<onTransition>` effects |
| `machine-basic.scrml` | ~50 | Legacy `<machine>` basic |
| `machine-002-traffic-light.scrml` | ~80 | Legacy `<machine>` with temporal rules (F3a — pre-engine) |
| `combined-018-timer.scrml` | ~60 | A timer-related combined demo (verify against current spec — may use pre-S77 legacy form) |

**Total: 5 engine/machine samples.** Coverage of A5 temporal surface is **minimal** — no canonical samples exercise:

| Feature | Sample exists? | Gap |
|---------|:--------------:|-----|
| F1 — `<onTimeout>` per-state timer | ❌ | NO canonical sample with `<onTimeout>` |
| F1a — `name=IDENT` named timer | ❌ | NO sample with named timers |
| F1b — `cancelTimer("X")` builtin | ❌ | NO sample exercising cancellation |
| F2 — `<onIdle>` watchdog | ❌ | NO sample with engine-wide watchdog |
| F3 — computed-delay on `<onTimeout>` | ❌ | NO sample with `after=${expr}<unit>` |
| F3a — computed-delay on legacy `<machine>` | 🟡 maybe | `combined-018-timer.scrml` may exercise (needs verification) |
| F9 — Machine Cohesion negative | ❌ | NO sample asserting E-COMPONENT-ENGINE-SCOPE (negative-path) |

---

## 4. Gap matrix → proposed sub-dispatches

**A5-7 decomposes into 4 sub-phases**, each scoped to one feature group + 1 verified canonical sample per:

### Sub-phase A5-7a — `<onTimeout>` core + computed-delay (F1 + F3)
- Sample 1: `engine-005-ontimeout-basic.scrml` — engine with `<onTimeout after="3s" to=.Next/>`, demonstrates the canonical pattern. Verify timer fires correctly.
- Sample 2: `engine-006-ontimeout-computed.scrml` — `<onTimeout after="${@delay}ms" to=.Next/>` with reactive delay. Demonstrates computed-delay form.
- **Est: 1-2h** (sample-writing + verify-compile + verify-runtime).

### Sub-phase A5-7b — Named timers + cancellation (F1a + F1b)
- Sample 3: `engine-007-cancel-timer.scrml` — engine with named `<onTimeout name="alpha" after="5s" to=.Cancelled/>` + `<button onclick=cancelTimer("alpha")>Cancel</button>`. Demonstrates name= + cancelTimer call-ref.
- **Est: 1h** (one sample; tested pattern).

### Sub-phase A5-7c — Engine-wide watchdog (F2)
- Sample 4: `engine-008-onidle-watchdog.scrml` — engine with `<onIdle after="30s" to=.SessionExpired/>` + state-child writes that reset the watchdog. Demonstrates idle-detection canonical pattern.
- **Est: 1h**.

### Sub-phase A5-7d — Legacy machine surface (F3a verification + Machine Cohesion negative)
- Audit: read `combined-018-timer.scrml` + `machine-002-traffic-light.scrml`. Confirm they use current spec semantics for `.From after Ns => .To`. If they use pre-S77 form, migrate.
- Negative sample: `machine-component-engine-scope-error.scrml` — engine declared inside a component body, expected to emit E-COMPONENT-ENGINE-SCOPE at compile time. Verify negative-path coverage.
- **Est: 0.5-1h**.

### NOT IN A5-7 — features without codegen (F4 / F5 / F6 / F7 / F8)
These are spec-only; cannot have end-to-end samples until codegen ships. Surface separately as **A5-2/A5-3 codegen** dispatch (separate priority).

---

## 5. Estimated total effort (depth-of-survey adjusted)

| Sub-phase | Original estimate | Adjusted (post-survey) | Decomposition note |
|-----------|-------------------|------------------------|--------------------|
| A5-7a | (rolled into 12-18h) | **1-2h** | Two samples |
| A5-7b | (rolled into 12-18h) | **1h** | One sample |
| A5-7c | (rolled into 12-18h) | **1h** | One sample |
| A5-7d | (rolled into 12-18h) | **0.5-1h** | Audit + 1 negative sample |
| **Total A5-7 (implemented surface)** | **12-18h** | **3.5-5h** | **3-5x discount** |

**Depth-of-survey discount applies:** the 12-18h estimate assumed full coverage including F4-F8, which are not implemented. Adjusted estimate covers ONLY the implemented surface (F1, F1a, F1b, F2, F3, F3a, F9).

---

## 6. Dispatch shape

Each sub-phase is small enough to be PA-direct or single short worktree dispatch. Recommended order:
1. **A5-7a first** (most central feature; sets the pattern for sub-phases b/c)
2. A5-7b (depends on a's pattern)
3. A5-7c (independent; parallel-eligible)
4. A5-7d (audit-then-write; smallest)

Per pa.md, every dispatch writing scrml must include:
- `scrml-support/docs/gauntlets/BRIEFING-ANTI-PATTERNS.md`
- `docs/articles/llm-kickstarter-v1-2026-04-25.md`

PA verifies each sample post-landing via `bun scrmltsc <sample>` + `bun test` smoke.

---

## 7. Open questions to surface

1. **F3a verification — does `combined-018-timer.scrml` use current `.From after duration => .To` form, or pre-S77 legacy?** Answer drives whether A5-7d is "audit only" or "audit + migrate."
2. **Should samples target `samples/compilation-tests/` (compile-test-only) or `examples/` (full-app)?** A5-7 plan currently targets compilation-tests (smaller, focused). Examples could come later as a separate fixture pass.
3. **Does sample verification require running the compiled output in a browser, or is compile-time correctness enough?** End-to-end tests at `engine-ontimeout-end-to-end.test.js` already cover the runtime path; samples may suffice with compile-time verification + post-landing `bun test` smoke.

---

## Tags

`#a5-7` `#tests-and-samples` `#inventory` `#depth-of-survey-discount` `#s80` `#engine-temporal-surface`
