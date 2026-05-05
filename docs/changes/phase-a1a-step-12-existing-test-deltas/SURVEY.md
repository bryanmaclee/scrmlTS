# Phase A1a Step 12 — PA-side static survey (pre-stage)

**Drafted:** 2026-05-05 (S61) by PA, while Step 11.5 is in flight.
**Status:** PRE-STAGE static-pass survey. Step 12 dispatch will need to do its own dynamic-pass survey (compile-and-classify) — this static pass scaffolds the inventory.
**Authority:** BRIEF.md §3.1 inventory pass. Per BRIEF, "PA reviews enumeration before agent proceeds with edits. (Optional gate; agent may proceed without PA review per S56 destructive-ops directive.)"
**In-flight caveat:** Step 11.5 (FOLD `reactive-derived-decl` → `state-decl`) is running while this is drafted. Step 11.5 owns the 11 test files referencing `reactive-derived-decl`. Step 12 picks up AFTER 11.5 lands.

---

## §1 What this survey IS / IS NOT

**IS:**
- Static-pass grep + read of patterns the BRIEF enumerates as REWRITE / DROP candidates.
- Per-pattern hit counts + concrete file lists for high-signal patterns.
- Recommended dispositions for unambiguous categories.
- Open-question list for patterns that need agent-time dynamic verification.

**IS NOT:**
- A complete inventory. Step 12 dispatch must run the compiler against each candidate to confirm REWRITE-vs-DROP-vs-UNAFFECTED.
- Authoritative for ambiguous patterns. The BRIEF's "transition-decl tests" question is one such — needs PA + user policy decision before drop.

---

## §2 Patterns checked + dispositions

### §2.1 Already-clean (NO WORK)

| # | Pattern | Hits | Disposition | Why |
|---|---|---|---|---|
| A | `kind === "reactive-decl"` (old name pre-Step-3) | **0** | UNAFFECTED | Step 3 rename complete; no test references the old kind. |
| B | `kind === "machine-decl"` (old name pre-engine-rename) | **0** | UNAFFECTED | `ast-shape-rename` branch + downstream landed; no test references the old kind. |
| C | `loose` flag references in tests (L9 dropped) | **0** | UNAFFECTED | Already removed; no legacy probes survive. |

### §2.2 Owned by Step 11.5 (in flight)

| # | Pattern | Hits | Disposition | Why |
|---|---|---|---|---|
| D | `kind === "reactive-derived-decl"` (legacy AST kind) | **11 test files** | OWNED-BY-11.5 | Step 11.5 BRIEF §4.1 explicitly takes this. Step 12 does NOT touch. **Verify post-11.5 that these are all updated; if any survive, Step 12 cleans them up.** |

Files (for post-11.5 verification):
- `compiler/tests/lsp/analysis.test.js`
- `compiler/tests/integration/expr-node-corpus-invariant.test.js`
- `compiler/tests/integration/parse-shapes-v0next.test.js` (§S4.5)
- `compiler/tests/unit/derived-reactive-markup-wiring.test.js`
- `compiler/tests/unit/reactive-derived.test.js`
- `compiler/tests/unit/type-encoding-phase2.test.js`
- `compiler/tests/unit/code-generator.test.js`
- `compiler/tests/unit/tab.test.js`
- `compiler/tests/unit/dependency-graph.test.js`
- `compiler/tests/unit/collectexpr-newline-boundary.test.js`
- `compiler/tests/unit/gauntlet-s24/scope-001-logic-expr.test.js`

### §2.3 reset() empty-call shape — investigated; NOT a Step 12 concern

The legacy `reset()` no-arg keyword (L10, superseded by L18 `reset(@cell)`) has hits in 17 test files, but inspection shows **all hits are intentional**:

- `parse-reset-keyword.test.js` (L105, L146) — NEW v0.next tests probing the E-RESERVED-IDENTIFIER + E-RESET-NO-ARG codes (Step 8 + Step 9). KEEP.
- `parse-shapes-v0next.test.js` (L73) — NEW v0.next test probing E-RESERVED-IDENTIFIER for `function reset() {}`. KEEP.
- `tokenizer-reset-keyword.test.js` — NEW v0.next test (Step 1 + 8). KEEP.
- `type-encoding*.test.js`, `stdlib-auth.test.js`, `stdlib-store.test.js` — `checker.reset()` / `ctx.reset()` / docstring references to `createRateLimiter#reset()` / `createCounter#reset()` — these are JS-level method calls on test scaffold or stdlib stubs, NOT scrml-source `reset()` calls. KEEP.
- `transition-decl-*.test.js` — uses `< Solo name(string)>\n    reset() => < Other> { }` form — this is the v0.legacy machine-syntax `<state> ident(args) => <target>` arrow-form. **See §2.4 (transition-decl).** Disposition pending policy.

**Disposition:** No legacy no-arg `reset()` source-level usage in tests requiring a Step 12 drop. The legacy form was already dispositioned at Step 8 by E-RESERVED-IDENTIFIER. No work in this category.

### §2.4 Transition-decl tests — OUT-OF-SCOPE for Step 12

**S61 user-ratified 2026-05-05:** transition-decl tests (5 unit test files) are **OUT-OF-SCOPE** for Step 12. Their retirement is owned by separate, downstream phases:

- **P3** — deprecation transition for the legacy `<machine>` keyword + `transitions {}` block per SPEC §51.3.2 (`W-DEPRECATED-001` today → `E-DEPRECATED-001` in P3) + migration via `scrml-migrate`.
- **A2** — engine implementation phase, which may incidentally migrate or replace transition-decl semantics.

Step 12's scope is the V5-strict canon migration for STATE-CELL declarations (`<x>` vs `@x` decl-form). Transition-decl is a separate feature category whose retirement is governed by the deprecation policy, not by Step 12. The 5 test files probe a WORKING parser path (transition-decl is alive and load-bearing for current samples that use it). Dropping them now would leave working code untested.

| # | Pattern | Hits | Disposition |
|---|---|---|---|
| E | `<state> ident(args) => <target> { body }` (legacy machine syntax) | **5 test files** | **OUT-OF-SCOPE — owned by P3 (deprecation) + A2 (engine impl)** |

Files (no Step 12 action):
- `compiler/tests/unit/transition-decl-ast.test.js`
- `compiler/tests/unit/transition-decl-block-split.test.js`
- `compiler/tests/unit/transition-decl-scope.test.js`
- `compiler/tests/unit/transition-decl-purity.test.js`
- `compiler/tests/unit/transition-decl-registry.test.js`

### §2.5 Legacy `@x = init` decl form — REWRITE (V5-strict canon migration)

**S61 user-ratified Option A 2026-05-05:** rewrite ALL legacy `@x = init` first-appearance/decl-form usages (top-level AND inside-`${...}` blocks) to V5-strict canon `<x> = init`. Rationale: SPEC §6.1.2 reserves `@varname` for reads/writes/compound-assigns only; the canon-violating decl form is a transitional Step 4 mirror, not endorsed; deprecation phase is unscheduled and "later" is indefinite; we're already in a test-churn pass so marginal cost is low.

**Top-level (NOT inside `${...}`):**

| File | Disposition | Notes |
|---|---|---|
| `samples/compilation-tests/test-002-with-logic.scrml` | **REWRITE** | `@counter = 0` → `<counter> = 0`. |
| `samples/compilation-tests/test-009-test-reactive.scrml` | **REWRITE** | `@value = 42` → `<value> = 42`. |
| `samples/compilation-tests/modern-003-full-app.scrml` | **REWRITE** (S61 reclassified) | Top-level `@users = []` → `<users> = []`, `@filter = "all"` → `<filter> = "all"`. The `< userBadge name(string) role(Role)>` line is a **component-def** (NOT transition-decl) — separate concern, leave alone for Step 12. |

**Inside `${...}` blocks (the broader set):**

- `~85 sample files` (rough static-grep count of files containing `@\w+ = ` somewhere). Some hits are LEGAL writes (post-decl `@x = newVal`); only the FIRST-APPEARANCE hits are decls needing rewrite.
- **Step 12 dispatch must dynamically classify** each `@x = init` hit per-file: is this the first appearance of `x` in scope (decl, REWRITE candidate) or post-decl write (LEAVE)? Static grep cannot tell.
- **Mechanism:** Step 12 dispatch probes the compiler's symbol-table-as-built per-file: any `state-decl{structuralForm:false}` produced from a `@x = init` source line is a REWRITE candidate. The new structural form `<x> = init` produces equivalent `state-decl{structuralForm:true}`.
- **Anti-html-fragment guard** must hold on the rewritten samples (BRIEF §6.3).

**Effort delta vs PA's prior recommendation:** +~1-3h on Step 12 to enumerate, rewrite, and verify.

### §2.6 Examples directory — NO top-level legacy decls

`find examples -name "*.scrml" | xargs grep -lE "^@\w+\s*="` returns **0 hits**. Examples are already V5-strict for top-level decls. NO WORK on examples.

### §2.7 stdlib + self-host — OUT OF SCOPE

- `stdlib/` — 42 .scrml files. Compiler-bundled, parity-lagged. Step 12 does NOT touch stdlib.
- `compiler/self-host/` — parity-lagged per Step 4-7 policy. Step 12 does NOT touch self-host.

### §2.8 anti-html-fragment guard sweep — defer to Step 12 dispatch

BRIEF §4 + §6.3 note: "Anti-html-fragment guard MUST be added to any rewritten positive parse-test." Step 12 dispatch handles this per-rewrite as part of the edit, NOT as a separate sweep over already-passing tests.

---

## §3 Recommended Step 12 dispatch shape

Based on this static survey + S61 user ratifications, Step 12 dispatch is:

1. **Confirm Step 11.5 cleaned the 11 reactive-derived-decl test files.** Quick grep verification.
2. **REWRITE 3 top-level sample files** (`test-002-with-logic.scrml`, `test-009-test-reactive.scrml`, `modern-003-full-app.scrml`) — top-level `@x = init` → `<x> = init`.
3. **Dynamically classify + REWRITE inside-`${...}` legacy decl forms** across ~85 candidate sample files. Per-file: identify first-appearance `@x = init` lines, rewrite to `<x> = init`, leave post-decl writes (`@x = newVal`) alone. Anti-html-fragment guard on every positive case (samples that have an integration test).
4. **Skip transition-decl tests** (5 unit test files) — OUT-OF-SCOPE per Q1 ratification; owned by P3 + A2.
5. **No bare-name access pattern drops** — no tests assert legacy bare-name access; E-NAME-COLLIDES-STATE assertion in kickstarter-v2-smoke is correctly written.

**Estimated effort post-survey + Q1 + Q2 ratifications:** 4-8h (matches BRIEF estimate).

---

## §4 Resolved questions

1. ~~**Transition-decl test disposition:** leave alone for A2 migration, or drop now?~~ **RATIFIED 2026-05-05 (S61):** OUT-OF-SCOPE for Step 12. Owned by P3 (deprecation) + A2 (engine impl). Rationale captured in §2.4. Affects 5 unit test files; no Step 12 action.
2. ~~**Inside-`${...}` legacy `@x = init` expression-form decls:** mass-REWRITE or leave?~~ **RATIFIED OPTION A 2026-05-05 (S61):** REWRITE to V5-strict canon. Rationale captured in §2.5.
3. **Sample file count drift:** with Q1 OUT-OF-SCOPE + Q2 Option A, sample file count is unchanged (REWRITES preserve files); test file count is unchanged (transition-decl tests stay).

---

## §5 What this survey did NOT cover

- **Compile-each-candidate pass.** Static grep can flag candidates; only the compiler can confirm REWRITE-vs-DROP-vs-UNAFFECTED. Step 12 dispatch agent must do this.
- **The 786 .scrml files in `samples/compilation-tests/**`.** Top-level samples (277) checked for the most obvious patterns. Subdirectory gauntlet outputs (509 generated files in `gauntlet-s19-phase2-control-flow/` etc.) are mostly v0.next-spec-aligned at generation time and likely UNAFFECTED. Step 12 dispatch confirms via compile.
- **Browser test fixtures + dist/.** `samples/compilation-tests/dist/` is gitignored generated output; not a concern.

---

## §6 Tags

#phase-a1a #step-12 #pre-stage-survey #static-pass #pa-survey #q1-ratified-out-of-scope #q2-ratified-option-a
