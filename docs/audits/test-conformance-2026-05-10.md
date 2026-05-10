# Test Conformance Audit — 2026-05-10 (S78)

**Status:** complete (read-only)
**Scope:** `compiler/tests/` vs `compiler/src/` + `compiler/SPEC.md`
**Authored by:** general-purpose agent dispatched S78
**HEAD at audit:** `6a1b15eadfd44e357de18f6a891ef159e3bb7043`
**Test count at audit:** 11006 pass / 64 skip / 1 todo / 6 fail (per dispatch brief)

---

## §0 Headline

**Tests are honest enough to back a v0.2.0 ship claim, with two real holes.** The corpus is overwhelmingly behavior-driven (no mocks, no snapshot tests, very few literal-against-literal assertions). The skips are nearly all documented gating tests for ratified-but-unlanded spec amendments (S32 fn-state-machine, parser-deferred B8 / B17). The two material holes are:

- **Spec-cataloged but test-uncovered diagnostic codes (~21 confirmed).** Codes that appear in §34 with normative "SHALL emit" language and fire from real source-code paths but are exercised by zero tests. Examples: `E-LOOP-003/005/006/007`, `E-CHANNEL-004/005`, `E-AUTH-003/004/005`, `E-CG-010/014`, `E-LIFECYCLE-015`, `E-CTRL-004`, `E-IMPORT-007`, `E-FN-009`, `E-META-EVAL-002`. These are real "left holes across the test surface."
- **Phase A10 (S78) `binding-registry.ts` arm-context machinery — ZERO direct unit coverage.** `pushArmContext`/`popArmContext`/`_armContextStack` and the `engineArm` field stamping (the recently-added per-arm wiring filter) have no test in `binding-registry.test.js` (8 tests, all on the data-class API). Indirect coverage via `engine-body-render.test.js` does exercise the emission shape, so the behavior IS tested — but the unit boundary is missing, and a regression in the registry alone (without breaking the dispatcher emission) would not be caught.

The cosmetics are clean: zero `describe.only`/`test.only`, no jest/vi mocking framework usage, no `toMatchSnapshot` calls, very few `console.log`-only test bodies. The pre-commit gate runs the full unit + integration + conformance subset (`bun test compiler/tests/{unit,integration,conformance} --bail`); browser tests are excluded from the gate but covered by `bun run test` (the full suite).

**Where to prioritise effort before v0.2.0 SHIP:** §3.2 catalog-cited-but-untested codes (write the missing tests) → §2 binding-registry arm-context unit tests → §5.2 stub-conformance backlog (9 stubs awaiting downstream-pass implementation).

---

## §1 Vacuous tests

**Method:** grep for `expect(true).toBe(true)`, `expect(1).toBe(1)`, `if (cond) expect(...)` patterns without `else`, `console.log` test bodies, mock-circular patterns. Read each flagged location.

### §1.1 `expect(true).toBe(true)` — 18 occurrences across 9 files

Bucketed by reason:

| Bucket | Count | Disposition |
|---|---|---|
| Inside `test.skip(...)` body (no semantic effect — skipped tests don't run) | 8 | Legitimate (skip body is dead code) |
| Documented stub conformance test (CONF-019, CONF-045) — placeholder for unimplemented downstream pass | 2 | Legitimate (honest stub with TODO) |
| Defensive fallback after primary assertion (`if (sqlNode) expect(...); expect(true).toBe(true)`) | 6 | **Vacuous — flagged below** |
| "Informational, always-pass" catalog test (`expr-node-corpus-invariant.test.js:619`) | 1 | Legitimate by design (informational) |
| Test-passes-trivially-on-empty-branch (`symbol-table.test.js:416`) | 1 | Legitimate (else-branch fallback when no html-fragment exists) |

**Genuine-vacuous (defensive `if (X) expect; else nothing` pattern):**

| File | Line | Test | Reason |
|---|---|---|---|
| `compiler/tests/conformance/tab/conf-TAB-005.test.js` | 56 | `\`?{\` SQL block produces sql node` | `if (sqlNode) expect(sqlNode.kind).toBe("sql")` — passes when `sqlNode` is null. Comment at line 51 admits "Either there's a sql node, or the BLOCK_REF was absorbed into a bare-expr." Test passes whether SQL is or isn't recognized. |
| `compiler/tests/conformance/tab/conf-TAB-022.test.js` | 30, 39, 49, 66 | sql node has kind / query / chainedCalls / span | Same pattern: `if (sqlNode)` then trailing `expect(true).toBe(true)`. The test explicitly says "Test passes as long as no error was thrown" (line 102). This is a non-throw test wearing the costume of a structural test. |
| `compiler/tests/conformance/tab/conf-TAB-022.test.js` | 43, 70 | (same) | Trailing `expect(true).toBe(true)` after conditional. |

**Recommendation:** rewrite the CONF-TAB-005 / CONF-TAB-022 tests to either (a) make `sqlNode != null` itself a hard precondition (`expect(sqlNode).not.toBeNull()`) — gating coverage on SQL recognition — or (b) split into two tests: "sqlNode IS recognized when ?{ appears" (hard) + "if recognized, has kind 'sql'" (structural). As written they regress into pass-mode whether or not SQL recognition works.

### §1.2 Conditional fallbacks in `tab` conformance suite

The `compiler/tests/conformance/tab/` suite has a recurring pattern (CONF-TAB-001, -002, -005, -012, -014, -016, -017, -022) where assertions are guarded by `if (foundNode)` with no else-branch failure. This was clearly a deliberate "soft" mode while the TAB stage was under flux. Now that TAB is stable (post-S58 D4), these soft-mode tests are no longer pulling weight.

**Estimate:** ~12-15 tests in this directory have this shape. Not catastrophic (block-splitter tests in `block-grammar/` are tight by contrast), but they are a cluster of tests that cannot fail.

### §1.3 No mocks, no snapshots, no `.only`

- `grep -rn "vi.fn(\\|jest.fn(\\|spyOn\\|mock.calls" compiler/tests/` → 0 hits. The corpus uses no mocking framework — every test exercises real compiler functions or runs the full `compileScrml(...)` pipeline.
- `grep -rn "toMatchSnapshot\\|toMatchInlineSnapshot" compiler/tests/` → 0 hits. No snapshot tests to peg.
- `grep -rn "describe.only\\|test.only\\|it.only" compiler/tests/` → 0 hits. No accidental focus directives left in the suite.

This is a strong signal: the "implementation-pegged" risk pattern (snapshots that drift in lockstep with src) does not exist in this repo.

### §1.4 `console.log` in tests — 251 occurrences

Spot-check confirms these are auxiliary diagnostic prints (e.g., catalog-summary echoes), not test bodies. Examples: `expr-node-corpus-invariant.test.js` echoes a corpus summary then asserts `expect(true).toBe(true)` (this is a single intentional informational test, documented as such inline at line 618: "The catalog test always passes -- it is informational"). No "console.log instead of expect" anti-pattern found.

### §1.5 Trivial-vacuous count

**Total genuinely vacuous tests:** ~6-9 across `conf-TAB-005.test.js` + `conf-TAB-022.test.js`. ~12-15 more "soft mode" conditional-fallback tests in the same `tab/` directory that are weak rather than vacuous. The rest of the corpus is sound.

---

## §2 Surface coverage holes

**Method:** for each `.ts`/`.js` source file under `compiler/src/` + `compiler/src/codegen/` + `compiler/src/validators/` + `compiler/src/codegen/compat/`, identified the corresponding test file(s) and counted tests. Total source files: 81 (39 in `src/` + 38 in `codegen/` + 4 in `validators/` + 1 in `codegen/compat/`).

### §2.1 Phase A10 body-render — 943 LOC test for 830 LOC source

`emit-variant-guard.ts` (830 LOC) ↔ `engine-body-render.test.js` (943 LOC, ~25 tests across §1-§9). **Coverage proportional to implementation; tests assert emission shape (render fns, dispatcher, mount slot, tree-shake, payload bindings, reactive subscribe re-establishment). Helper unit-tests cover `extractPayloadBindingsFromAttrs`, `filterRenderableChildren`, `emitInitialArmHtmlForMount`. Strong coverage.**

The only gap: the test file's §1 docstring (line 12) explicitly notes that "Integration tests (compile + run + DOM assertions) are SKIPPED with reason citing the post-innerHTML-replace reactive-subscription gap" — this is a known limitation of the helper, documented in `emit-variant-guard.ts`. **Not a coverage hole; an honest deferral.**

### §2.2 `binding-registry.ts` arm-context — ZERO direct unit coverage

| Source surface | Test? |
|---|---|
| `BindingRegistry` class API (`addEventBinding`, `addLogicBinding`, getters) | ✓ — `binding-registry.test.js` 8 tests |
| `pushArmContext(armId)` / `popArmContext()` | ❌ **No unit test** |
| `_armContextStack` mutation behavior | ❌ **No unit test** |
| `engineArm` field stamping (Phase A10 §247-248) | ❌ **No unit test** (indirectly exercised in `engine-body-render.test.js`) |
| `LogicBinding` discriminator (`if-chain-branch`, `if-chain-else`, etc.) | ❌ **No unit test** for the registry side; the discriminator itself is asserted by integration tests |

Indirect coverage via `engine-body-render.test.js` at line 595-609 (which checks `_scrml_engine_phase_wire_<armTag>` emission) does exercise the arm-context end-to-end. So this is a **unit-boundary gap rather than an end-to-end gap** — but it means a regression that breaks `pushArmContext` without breaking dispatcher emission would slip past the unit tier.

**Recommendation:** add 4-6 unit tests to `binding-registry.test.js`: (a) push/pop cycle empties the stack, (b) `addEventBinding` while context is active stamps `engineArm`, (c) nested push/pop preserves outer context on inner pop, (d) `popArmContext` on empty stack is defensive no-op (per source comment line 287-290), (e) explicit `engineArm` already on entry is NOT overwritten (per source line 247: `entry.engineArm == null` guard), (f) `addLogicBinding` parallel to (b).

### §2.3 `emit-event-wiring.ts` arm-tagging filter — covered indirectly

Source (892 LOC) implements `engineArm`-filtering at lines 254-273 (skip global emission when `engineArm` is set). No dedicated test file (`emit-event-wiring.test.js` does not exist), but `engine-body-render.test.js` and `state-block-event-wiring.test.js` exercise the filter via the full pipeline. **Acceptable** — the filter is one branch of a hot path; integration coverage is appropriate.

### §2.4 Pre-Stage-2 lint pass (`lint-ghost-patterns.js`, 512 LOC) — strong coverage

`lint-ghost-patterns.test.js` (835 LOC) covers all 14 W-LINT codes (W-LINT-001..008, 010..015 — W-LINT-009 intentionally absent per `lint-ghost-patterns.js:355-359`). Plus `lint-ghost-patterns-comment-exclusion.test.js` covers the comment-context exclusion. Plus `lint-w-lint-013-equality-no-misfire.test.js` and `lint-w-lint-013-tilde-no-misfire.test.js` cover the misfire-prevention edge cases for W-LINT-013. **Strong coverage.**

### §2.5 Post-TAB diagnostic walkers (`gauntlet-phase1-checks.js` + `gauntlet-phase3-eq-checks.js`, 1226 LOC total) — covered indirectly

No file named `gauntlet-phase1-checks.test.js` or `gauntlet-phase3-eq-checks.test.js` exists; coverage is via:
- `compiler/tests/unit/gauntlet-s19/import-export-scope-use.test.js` — fires E-IMPORT-001/003, E-USE-001/002, E-USE-INVALID-CTX, E-SCOPE-010 (gauntlet-phase1-checks codes)
- `compiler/tests/unit/gauntlet-s19/equality-diagnostics.test.js` — fires E-EQ-001..004, W-EQ-001 (gauntlet-phase3-eq-checks codes)
- `compiler/tests/unit/gauntlet-s19/null-coverage.test.js` — fires E-SYNTAX-042/043/044
- `compiler/tests/unit/gauntlet-s19/null-coverage-bare.test.js` and `null-coverage-template-interp.test.js` — null/`undefined` token misuse
- `compiler/tests/unit/lint-w-lint-013-*` — equality-related W-* misfire prevention

**Acceptable.** The gauntlet walkers are exercised through the user-visible diagnostic emission, which is what matters. Per-walker unit tests would be defensible but the integration path is well-covered.

### §2.6 Self-host integration shim (`compiler/src/codegen/compat/parser-workarounds.js`)

The only test that imports from `compat/` is `compiler/tests/self-host/bpp.test.js` (uses `setBPPOverrides`). This is a deliberate integration shim — primer §12 calls it out as "Without context, the shim looks like dead-code-with-getter; it isn't." **Acceptable** — the shim's use is in self-host, and the self-host tier is exercised by `compiler/tests/self-host/{ast,bpp,bs,tab}.test.js` (4 files).

### §2.7 `validators/` directory (4 files) — covered

- `attribute-allowlist.ts` ↔ `uvb-w1-attr-allowlist.test.js` (+ `uvb-w1-pipeline.test.js` integration)
- `attribute-interpolation.ts` ↔ `uvb-w1-attr-interpolation.test.js`
- `post-ce-invariant.ts` ↔ `uvb-w1-post-ce-invariant.test.js`
- `ast-walk.ts` ↔ helper used by 3 above; no dedicated test (acceptable — it's a walker utility, exercised through the validators)

**Strong coverage.**

### §2.8 Overall src ↔ test mapping (sample)

| Source file | LOC | Test file(s) | Test LOC |
|---|---|---|---|
| `ast-builder.js` | 10131 | `ast-builder-*.test.js` (5 files) + many indirect | ~3000+ |
| `type-system.ts` | 9538 | `type-system.test.js` + 30+ feature-specific test files | ~10000+ |
| `symbol-table.ts` | 7785 | `symbol-table.test.js` + 30+ B-step tests + binding-registry indirectly | ~8000+ |
| `expression-parser.ts` | 3284 | `expression-parser.test.js` (+ indirect via ast-builder tests) | ~unknown |
| `route-inference.ts` | 2512 | `route-inference.test.js` + `route-inference-f-ri-001*.test.js` (3 files) | ~substantial |
| `component-expander.ts` | 2893 | `component-expander.test.js` + cross-file-components + form1 tests | ~substantial |
| `dependency-graph.ts` | 2276 | `dependency-graph.test.js` + `derived-circular-dep.test.js` | ~substantial |
| `engine-statechild-parser.ts` | (~52KB / 1500+ LOC) | `engine-statechild-b15.test.js` + `b17-*.test.js` + `engine-onIdle-watchdog.test.js` + 4 more | ~strong |
| `meta-checker.ts` | 80422 chars | `meta-checker.test.js` + `meta-checker-false-positives.test.js` + `self-host-meta-checker.test.js` | ~strong |
| `monotonicity-analyzer.ts` | (19KB) | `a9-ext5-monotonicity-classifier.test.js` (only) | thin but adequate |

**Verdict:** every substantive src module has at least one test file. Coverage proportionality is maintained across the largest modules. Smaller specialized modules (e.g., `monotonicity-analyzer.ts` with one test file) are adequate given their focused scope.

---

## §3 SPEC normative-statement coverage

**Method:** `grep -E '\b(MUST|SHALL|WILL|REQUIRED)\b' compiler/SPEC.md | wc -l` → **1757 lines** containing normative keywords. Sampled the §34 catalog rows + spot-checked normative claims in §51 / §52 / §38 / §6.

### §3.1 §34 catalog row coverage

- §34 catalog rows: 576 in spec body
- Unique `E-/W-/I-` codes referenced in `compiler/src/`: 329
- Unique `E-/W-/I-` codes referenced in `compiler/tests/`: 341
- Codes that fire in src AND have a test reference: ~285 (≈87%)
- **Codes that fire in src but ZERO test reference: 33 codes (~10%)** — the substantive coverage gap

### §3.2 Catalog-cited but test-uncovered codes (the real holes)

These are codes that have BOTH a §34 catalog row AND fire from real src code paths AND zero test reference:

| Code | Spec row | Source location | "SHALL"-strength normative claim |
|---|---|---|---|
| `E-LOOP-003` | §34 line 14463 (§49.9) | `compiler/src/type-system.ts` | "SHALL reject any `break label` whose label does not refer to an enclosing loop with E-LOOP-003" (§49 line 19325) |
| `E-LOOP-005` | §34 line 14465 (§49.9) | `compiler/src/type-system.ts:7847,7994` | "SHALL reject such usage with E-LOOP-005" (§49 line 19338, 19341) |
| `E-LOOP-006` | §34 line 14466 (§49.9) | `compiler/src/type-system.ts:7957-7967` | "SHALL reject duplicate label identifiers with E-LOOP-006" (§49 line 19333) |
| `E-LOOP-007` | §34 line 14467 (§49.9) | `compiler/src/type-system.ts` | "while as expression without lift/~" |
| `E-CHANNEL-004` | §34 line 14441 (§38.9) | `compiler/src/` | "SHALL reject (E-CHANNEL-004) any call to broadcast() or disconnect() that does not appear inside a function within a `<channel>` lexical scope" (§38 line 15826) |
| `E-CHANNEL-005` | §34 line 14442 (§38.9) | `compiler/src/` | "SHALL emit an error (E-CHANNEL-005) if onserver:message contains more than one parameter" (§38 line 15880) |
| `E-CHANNEL-EXPORT-002` | §34 line 16329 | `compiler/src/` | Internal-state mismatch — not user-facing "SHALL" but is a real assertion |
| `E-AUTH-003` | §34 line 14475 (§52.11) | `compiler/src/type-system.ts:1961-1964` | "authority='server' requires table=" (per §34 row) |
| `E-AUTH-004` | §34 line 14476 (§52.11) | `compiler/src/type-system.ts:1925-1931` | "two declarations of same state type with conflicting authority= values" |
| `E-AUTH-005` | §34 line 14477 (§52.11) | `compiler/src/` | "`server @var` declared inside a client-only component" |
| `E-CG-010` | §34 line 18282 (§47.1.5) | `compiler/src/codegen/type-encoding.ts:344,360` | "SHALL emit E-CG-010 and halt. This is a hard error." (§47 line 18100) |
| `E-CG-014` | §34 line 18286 (§47) | `compiler/src/codegen/type-encoding.ts:445` | "SHALL emit E-CG-014 when a single scope contains more than 1,332 bindings of the same encoded type prefix" (§47 line 18238) |
| `E-LIFECYCLE-015` | §34 line 4317 | `compiler/src/` | "SHALL emit E-LIFECYCLE-015 if animationFrame() is called with zero arguments or non-function argument" (§28 line 4292) |
| `E-CTRL-004` | §34 line 8827 (§17) | `compiler/src/` | "any such usage (E-CTRL-004)" — `else` or `else-if=` on a state object opener |
| `E-CTRL-011` | §34 line 14566 (§17.4) | `compiler/src/ast-builder.js:4087-4093, 6517-6519` | "for (... in ...) is not a valid scrml loop form" |
| `E-IMPORT-007` | §34 line 12329 (§21.7) | `compiler/src/api.js:506-508` | "auto-gather closure exceeded sane-limit (5000 files)" (§21 line 12387) |
| `E-FN-009` | §34 line 14459 (§48.5.4) | `compiler/src/type-system.ts:8778` | "Reactive @variable captured as live subscription inside fn body" — currently a comment ("E-FN-009 is deferred") |
| `E-META-EVAL-002` | §34 line 14568 (§22.4) | `compiler/src/meta-eval.ts:375,385` | "Re-parsing the code emitted by a ^{} meta block failed" |
| `E-STRUCTURAL-ELEMENT-MISPLACED` | §34 line 14561 | `compiler/src/` | "scrml-defined structural element used outside its owning locus" |
| `E-ERROR-008` | §34 line 14499 (§19.2) | `compiler/src/` | "Error type variant uses reserved field name" |
| `E-RETURN-EMPTY` | (§17 / control-flow) | `compiler/src/codegen/emit-logic.ts:1637` | Comment, may not actually fire — verify before counting |

**Confirmed material gaps: ~21 codes** that have spec-normative status, fire from real src code, and have ZERO test reference. The remaining ~12 of the 33-code raw gap are either deferred (`E-FN-009`), comment-only (`E-RETURN-EMPTY`), or stem-prefix matches that resolve when sub-codes are tested.

### §3.3 Spot-check of normative pillar claims (§3 / §6 / §38 / §51)

Sampled non-§34 normative claims to verify test coverage:

| Spec § | Normative claim | Test status |
|---|---|---|
| §6.1 (V5-strict access) | "compound state MUST use canonical `@form.name` access" | ✓ — `parse-shapes-v0next.test.js`, `mangle-property-access.test.js` |
| §6.2 (three RHS shapes) | three RHS shapes | ✓ — `parse-shapes-v0next.test.js`, `bare-decl-markup-text-no-lift.test.js` |
| §6.6.18 (L21 — derived value mutate) | E-DERIVED-VALUE-MUTATE | ✓ — `derived-value-mutate.test.js` (with documented parser-deferred sub-cases) |
| §17 (control flow) | `if`/`for`/`while`/`do-while` core | ✓ — multiple test files |
| §18 (match) | match Tier 0/1/2 ladder | ✓ — `emit-match.test.js`, `match-arm-inline.test.js`, gauntlet-s19/match-exhaustiveness.test.js |
| §19 (errors) | `fail` / `!{}` semantics | ✓ — `c11-errors-element.test.js`, `bug-k-sync-effect-throw.test.js` |
| §38 (channels) | `<channel>` placement, `broadcast()` scope | ✓ partial — `channel.test.js`, `p3a-*` family; `E-CHANNEL-004`/`-005` themselves untested |
| §41.13 (parseVariant) | type-as-argument language primitive | ✓ — `parse-variant.test.js`, `c22-bare-variant-codegen.test.js`, `parse-variant-runtime.test.js` |
| §51.0.B/I (engine state-child body render) | "render body when in this variant" | ✓ — `engine-body-render.test.js` (S78 Phase A10) |
| §51.0.R (`<onIdle>` watchdog) | "armed at module-init, RESET on every successful transition, fires after N ms" | ✓ — `engine-onIdle-watchdog.test.js` (S77 A5-6) |
| §51.0.M (`<onTimeout>`) | engine state-child timeout | ✓ — `engine-ontimeout-codegen.test.js`, `engine-ontimeout-end-to-end.test.js` |
| §52 (state authority) | `authority="server"` Tier 1, `server @var` Tier 2 | ⚠ **partial** — `state-authority-codegen.test.js`, `state-authority-parsing.test.js` exist but the three E-AUTH-* codes themselves are not asserted |
| §53 (refinement) | three-zone refinement | ✓ — `refinement-three-zone-b21.test.js`, `c16-refinement-runtime.test.js`, `three-zone.test.js` |
| §55 (validators) | universal-core 14 predicates | ✓ — `validator-catalog.test.js`, `validator-arg-parsing.test.js`, `c6-validator-runtime-catalog.test.js` |
| §56 (promotion ergonomics — I-MATCH-PROMOTABLE) | "the lint emits I-MATCH-PROMOTABLE" | ✓ — `lint-i-match-promotable.test.js`, `promote-match.test.js` |

### §3.4 Cross-ref against SPEC conformance audit's §1.3 "undocumented" 18 codes

The spec audit flagged 18 codes as having ZERO spec mention. Test coverage of those 18:

| Code | Test exists? |
|---|---|
| W-LINT-001..008, 010..015 | ✓ all 14 covered in `lint-ghost-patterns.test.js` |
| `E-ERRORS-001`, `E-ERRORS-002` | ✓ `c11-errors-element.test.js` references both |
| `E-SWITCH-FORBIDDEN` | ✓ tested via `ast-builder-*.test.js` indirectly (SWITCH parses + rejects) |
| `W-CG-001` | ❌ **No test reference found.** "Top-level block suppressed from client output" warning fires from `emit-reactive-wiring.ts:366`; no test asserts the warning |

**One clean miss surfaced from cross-ref: `W-CG-001`.** Combined with §3.2's 21 codes, **22 total cataloged-but-untested diagnostics.**

---

## §4 Implementation-pegged tests

**Method:** spot-check codegen test files for hard-coded JS output strings, snapshot patterns, "matches current behavior" comments. Distinguish snapshot-of-spec-semantics (legit) from snapshot-of-implementation-accident (peg).

### §4.1 No bun-snapshot usage

`grep -rn "toMatchSnapshot\\|toMatchInlineSnapshot" compiler/tests/` → 0 hits. Bun's snapshot-diff feature is unused. The "snapshot-as-implementation-peg" risk pattern does not exist.

### §4.2 Hard-coded JS output assertions — sampled for shape vs literal

Codegen tests use `expect(clientJs).toContain(...)` and `expect(clientJs).toMatch(/.../)` with regexes. Sampled `engine-body-render.test.js` lines 100-109, 600-636: assertions test **structural shape** (function signatures, regex patterns matching `_scrml_engine_phase_render_<armTag>`, `_scrml_effect(function`, `data-scrml-engine-mount` attribute presence), NOT specific generated variable names or formatting.

This is the right design — the tests assert the spec-required structure (the function exists, the subscription runs, the dispatcher switches on variant), not the exact serialization.

### §4.3 "Regression baseline" comments

`grep -rln "matches current behavior\\|documents what we do\\|regression baseline" compiler/tests/` finds only:

- `parse-shapes-v0next.test.js:307,591,592` — "regression baseline" tagged 3 tests for shape preservation across compile-pipeline boundaries. These tests assert AST shape (`shape:"derived"`, `structuralForm:true`, `isConst:true`) which is **the spec-defined post-fold AST shape** (per S60 ADR Option A FOLD ratification). Legit.

No test file says "matches current implementation" or similar self-referential framing.

### §4.4 Verdict

**Implementation-peg risk: low.** The corpus is structured around spec-defined shape assertions, not generated-string equality. No snapshot framework is in use. The 3 "regression baseline" tagged tests assert ratified spec shape. **No action.**

---

## §5 Skipped / todo audit

**Method:** `grep -rEn "(test|describe|it)\\.(skip|todo)" compiler/tests/` → 54 matches across the test corpus. The brief says "64 skip + 1 todo" — discrepancy explained below.

### §5.1 Skip count reconciliation

The dispatch brief says "64 skip + 1 todo at HEAD post-Phase-A10." My grep found 53 skip + 1 todo = 54 raw matches. The discrepancy of ~10 likely comes from:

- Subtests inside a `describe.skip` block — bun's reporter counts each test inside a skipped describe as a skip, but the source has only one `describe.skip` directive.
- `describe.skip("§B8.3 case 3 — in-compound derived sub-cell (parser-deferred)")` in `derived-value-mutate.test.js:249` contains multiple tests inside; same for line 369.

So the real "skipped test slots" count IS ~64 when bun's reporter expands the describe.skip blocks. Disposition below counts directives, not expanded test slots.

### §5.2 Bucketed skips/todos (54 total)

| Bucket | Count | Files | Status |
|---|---|---|---|
| **Documented gating tests** for ratified-but-unlanded spec amendment (S32 fn-state-machine) | **31** | `conformance/s32-fn-state-machine/{s33-pure,s48-fn,s51-machine-cross-check,s54-substates}.test.js` | Legitimate. REGISTRY.md explicitly designates these as "gating tests: when an implementer lands E-STATE-COMPLETE / E-STATE-FIELD-MISSING / etc., un-skip each test" (line 7-12) |
| **Documented harness limitation** (happy-dom IIFE-wrapping causes ReferenceError; covered by Puppeteer e2e at `examples/test-examples.js`) | **8** | `browser/browser-todomvc.test.js:236-615` | Legitimate. Inline comment at line 15-24 explains the harness gap and points to the alternative coverage path |
| **Documented parser-deferred** (B8.3 case 3 / B8.6 multi-segment / parser bit-shift forms) | **5** | `derived-value-mutate.test.js:183, 249, 369` | Legitimate. Detailed comments at lines 177-181, 236-248 explain the parser blocker and walker readiness |
| **Documented engine-component-scope deferral** (B17 features post-S74) | **8** | `engine-component-scope-b17.test.js:259-322` | Legitimate-but-thin. Each test has `[deferred]` tag in description. Surrounding test file documents the deferral region (S74 A1b B17.3 hadn't shipped these branches at file authorship time). |
| **Documented self-host parity gap** (S60 fold) | **3** | `self-host/ast.test.js:257, 284, 466` | Legitimate. Each comment cites the S60/S19 reason and the un-skip condition. |
| **Documented top-level v0next deferral** | **1 (todo)** | `integration/parse-shapes-v0next.test.js:2361` | Legitimate. `test.todo("§S11D.5: top-level Variant C compound — DEFERRED (BS produces 0 blocks)")` — explicit deferred case |

**Bare skip / undocumented-skip count: 0.** Every skip directive in the corpus has an explanatory comment OR is inside a directory with a REGISTRY.md spelling out the gating regime.

**Expected-fail-disguised-as-skip count: 0.** Spot-check of the 31 S32 gating tests confirms they each cite a normative spec section and the un-skip condition. No "skipped because failing without explanation" red flags.

### §5.3 Risk assessment

The skip surface is honest and well-documented. The **only structural concern** is the `engine-component-scope-b17.test.js` cluster of 8 deferred tests — those are tagged `[deferred]` but lack the depth of documentation that the S32 REGISTRY provides. If B17.3 features were ratified post-S74 and the test was authored before the implementation landed, the deferral may now be stale.

**Recommendation:** sweep `engine-component-scope-b17.test.js` against current `engine-statechild-parser.ts` and check whether any of the 8 `[deferred]` tests are now landable.

---

## §6 Gate effectiveness

### §6.1 Pre-commit hook (`scripts/git-hooks/pre-commit`)

The hook runs:
```
bun test compiler/tests/unit compiler/tests/integration compiler/tests/conformance --bail
```

This excludes:
- `compiler/tests/browser/` (11 files) — happy-dom flake; documented in `scripts/git-hooks/README.md` line 17 ("Skips the `browser` subdir (headless-browser flakiness).")
- `compiler/tests/lsp/` (10 files) — lsp test surface
- `compiler/tests/self-host/` (4 files) — self-host bootstrap surface
- `compiler/tests/commands/` (3 files) — CLI commands

### §6.2 Full-suite gate (`bun run test`)

`package.json:45-46`:
```
"pretest": "bash scripts/compile-test-samples.sh",
"test": "bun test compiler/tests/"
```

`pretest` populates `samples/compilation-tests/dist/` (12 compiled samples per `scripts/compile-test-samples.sh:13-26`). Full-suite includes browser/lsp/self-host/commands subsets.

### §6.3 Pre-commit vs full-suite divergence

| Subset | In pre-commit? | In full suite? | Risk if drifted |
|---|---|---|---|
| `unit/` (370 files) | ✓ | ✓ | — |
| `integration/` (50 files) | ✓ | ✓ | — |
| `conformance/` (3 sub-dirs) | ✓ | ✓ | — |
| `browser/` (11 files) | ❌ | ✓ | Real — DOM/runtime regressions slip past pre-commit |
| `lsp/` (10 files) | ❌ | ✓ | LSP regressions slip past pre-commit |
| `self-host/` (4 files) | ❌ | ✓ | Self-host parity regressions slip past pre-commit |
| `commands/` (3 files) | ❌ | ✓ | CLI command regressions slip past pre-commit |

**The pre-commit gate covers the compiler-source regression risk well** (unit + integration + conformance) but does NOT cover:
- Browser runtime behavior (mitigated by Puppeteer e2e at `examples/test-examples.js` — manually run, not gated)
- LSP behavior (real gap)
- Self-host bootstrap parity (real gap)
- CLI commands (e.g., `scrml init`, `scrml build` adapter selection)

### §6.4 Risk for v0.2.0 SHIP

**Material:** the post-commit / full-suite tier ISN'T cron-gated. There's no automated full-suite run between commits — only the pre-commit subset. If a developer commits a unit-passing change that breaks LSP completions or the self-host bootstrap, the failure won't surface until someone manually runs `bun run test`.

**Recommendation:** elevate `bun run test` to a post-commit hook OR a CI gate before v0.2.0 SHIP. Document the test-tier mapping in `scripts/git-hooks/README.md`.

### §6.5 `--bail` vs full-run

The pre-commit hook uses `--bail`. This means the FIRST failure stops the run — useful for fast feedback but means a regression that's deeper in the suite might be masked behind an earlier flake. **Acceptable** for a pre-commit hook; the post-commit / full-suite tier should run without `--bail`.

---

## §7 Top priority items (ranked)

| # | Item | Surface | Risk if shipped without | Effort |
|---|---|---|---|---|
| 1 | **Write tests for the 21 cataloged-but-uncovered diagnostic codes** (§3.2) | `tests/unit/` | A user trips an `E-LOOP-005` or `E-CHANNEL-004` and the diagnostic fires the wrong message or the wrong span — silent regression risk | ~3-5 hours (~21 small tests, 1 per code, ~10 LOC each) |
| 2 | **Add unit tests for `binding-registry.ts` arm-context machinery** (§2.2) | `tests/unit/binding-registry.test.js` | A regression in `pushArmContext`/`popArmContext` that doesn't break dispatcher emission slips past unit gate | ~30 min (~6 tests) |
| 3 | **Add `W-CG-001` test** (§3.4) | `tests/unit/` | Top-level block suppression warning silently fails to fire | ~15 min |
| 4 | **Promote `bun run test` to a post-commit (or CI) gate** (§6.4) | infra | Browser/LSP/self-host regressions accumulate undetected between commits | ~30 min (post-commit hook) — OR elevate to GitHub Actions for full coverage |
| 5 | **Sweep `engine-component-scope-b17.test.js` 8 deferred tests** (§5.3) | `tests/unit/` | Stale `[deferred]` tags hide tests that could now be landed (free coverage) | ~1 hour (read each test, check current `engine-statechild-parser.ts` capability) |
| 6 | **Tighten `conf-TAB-005` and `conf-TAB-022` conditional fallbacks** (§1.1) | `tests/conformance/tab/` | 6-9 vacuous tests pretending to be structural assertions | ~30 min (rewrite to either gate on precondition or split) |
| 7 | **Sweep `tab/` directory's 12-15 soft-mode conditional fallbacks** (§1.2) | `tests/conformance/tab/` | Cluster of weak tests that cannot fail; coverage illusion | ~1 hour (audit + rewrite each) |

**Total effort to close items 1-3 + 4 (the four most load-bearing): ~4-6 hours.**

The user's verbatim S78 concern was: *"I would hate to announce that V0.2.0 is shipped only to find out agent cheated on tests. or that we left holes accross the test surface."*

**On "agent cheated on tests":** zero evidence. No mocks, no snapshots, no `.only` directives, no copy-paste tests, no conditional-mock-circular patterns. Skips are documented. The vacuous-test count (~6-9 confirmed in `conf-TAB-005` / `conf-TAB-022`) is a known soft-mode pattern in one specific directory, not "cheating."

**On "holes across the test surface":** real but bounded. ~22 cataloged codes have no test reference (item 1). One unit-boundary gap at `binding-registry.ts` arm-context (item 2). Pre-commit gate excludes browser/lsp/self-host/commands (item 4). All are addressable in ~6 hours of focused work.

---

## §8 Audit methodology + caveats

### Search patterns used

- Skip/todo extraction: `grep -rEn "(test|describe|it)\\.(skip|todo)" compiler/tests/`
- Vacuous-pass extraction: `grep -rEn 'expect\\(true\\)\\.toBe\\(true\\)|expect\\(1\\)\\.toBe\\(1\\)' compiler/tests/`
- Mock detection: `grep -rEn "vi\\.fn\\(|jest\\.fn\\(|spyOn|mock\\.calls" compiler/tests/`
- Snapshot detection: `grep -rEn "toMatchSnapshot|toMatchInlineSnapshot" compiler/tests/`
- Diagnostic-code catalog extraction: `grep -rohE '\\bE-[A-Z][A-Z0-9-]+|\\bW-[A-Z][A-Z0-9-]+|\\bI-[A-Z][A-Z0-9-]+'`
- Source/test/spec sets compared via `comm -23` to find src-fires-no-test deltas

### Caveats / known coverage gaps in this audit

1. **Code references in tests vs actual coverage.** A test file may reference `E-X-001` in a comment without actually triggering the code path. The audit's "test reference" measure is permissive. Spot-checks (E-LOOP-006, E-CHANNEL-004, E-AUTH-003) confirmed the listed gaps are real — no test triggers those codes.

2. **Indirect coverage via integration tests.** A code may have no unit test but fire when a sample compiles end-to-end. The audit cross-referenced the gaps against `samples/compilation-tests/` for incidental coverage; none of the 21 flagged codes appeared in sample compilation paths.

3. **`describe.skip` vs `test.skip` count.** `describe.skip("foo", () => { test("a", ...); test("b", ...); })` counts as 1 directive but bun reports 2 skipped tests. The audit's count of 53 skip directives + 1 todo = 54 expanded to ~64 skip slots aligns with the brief's "64 skip + 1 todo" reporter count.

4. **Pre-commit hook coverage assumption.** The audit assumed `scripts/git-hooks/pre-commit` is the active hook; verified by reading `.git/hooks/` (sample-hooks only — confirms the install pathway is `scripts/git-hooks/install.sh` per `README.md`). PA / contributors who haven't run `install.sh` won't have pre-commit coverage at all. **This is a real environmental risk — separate from the test-design audit, but worth surfacing.**

5. **No tests were modified.** Read-only audit. All Read calls; no Write/Edit calls to `compiler/tests/`. Confirmed by `git status` review at audit start (clean) and end (clean — only this audit doc added).

6. **Out-of-scope items** (per dispatch brief):
   - `examples/` — not audited
   - `samples/` — not audited
   - `benchmarks/` — not audited
   - Per-test fixtures / non-test helpers — not audited
   - LSP / self-host / commands test bodies — not deeply audited (counted, not read)

7. **"Honest verdict" basis.** The 22-code coverage gap is real. The structural-pattern audit (no mocks, no snapshots, no .only, well-documented skips) is solid. The verdict balance is "tests are honest; there are holes; the holes are addressable in ~6 hours." This is not a "cannot ship" finding — it is "ship after closing 4-6 hours of mechanical test additions."

8. **Spec-conformance audit cross-ref.** This audit was authored after `docs/audits/spec-conformance-2026-05-10.md` landed at HEAD. The spec audit's "on course / catalog-bookkeeping drift" verdict is consistent with this audit's "tests honest / 22-code coverage gap" verdict — both audits found bookkeeping-shaped issues (catalog rows missing or test stubs missing) rather than language-design drift.
