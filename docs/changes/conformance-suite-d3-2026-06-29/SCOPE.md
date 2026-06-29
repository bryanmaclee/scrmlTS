# D3 conformance-suite extraction — SCOPE

**Change-id:** `conformance-suite-d3-2026-06-29`
**Status:** SCOPING (W1 design crux RATIFIED S231; remaining OQs scoped below)
**Authority:** the V1 = scrml-language-1.0 reframe — `scrml-support/docs/deep-dives/language-compiler-split-2026-06-29.md` (D3 RATIFIED: the language contract = which diagnostic CODES fire + the RUNTIME effect; message text / emitted-JS shape / AST = impl freedom).
**Why this is load-bearing:** the conformance suite IS the Road-B de-risking oracle (native impl#2 is correct iff it passes it) AND it operationally *defines* the scrml-language-1.0 surface (what's in 1.0 = what the suite requires). It dissolves the native-cutover breaking-change. This is THE build of the split.

---

## 1. The substrate (grounded S231 — "promote + label," not greenfield)

The conformance machinery already exists in seed; the net-new is the *agnostic extraction* + the *runtime-effect layer* + the *version labels*.

| Asset | Today | For D3 |
|---|---|---|
| `compiler/tests/conformance/**` (109 test files; incl. `block-grammar/conf-001..047`) | `*.test.js`: a `source` snippet + POS/NEG assertions on `errors.some(e => e.code === "E-X")`, driven by `compileScrml()` (`src/api.js`) + `bun:test` | the *(source → expected-codes)* pairs ARE the agnostic contract — embedded in JS bodies coupled to impl#1's API |
| `parser-conformance-within-node*` + `within-node-classifier.ts` + allowlist JSON | the proto cross-impl parity oracle (two impls agree per-node) | the seed of the parse-level conformance + the existing agnostic-JSON precedent |
| ad-hoc runtime checks (conf-AUTH-003, conf-LOOP-006/7, conf-error-boundary — happy-dom/`.toBe`) | partial, unsystematic behavioral coverage | the seed (but NOT a systematic layer) for the (b) half |

**The asymmetry that shapes the build:** the **(a) "which codes fire"** half is ~done (109 files of *source→codes* to *lift*, not author). The **(b) "runtime effect"** half — D3-ratified as equally load-bearing — is barely seeded and is the real design + authoring work.

## 2. W1 — the case format + adapter interface (design crux)

**Runtime-effect vocabulary — RATIFIED S231 (user "Final DOM + state snapshot"):** a case asserts the **normalized final rendered DOM + final state-cell values** at the scrml-semantic level (`cell x = 5`; `#foo` text = `"hi"`), after an optional declared input-event sequence. Trace-ordering (full effect-trace) is DEFERRED to v1.next (the ordering-sensitive deepening). Pure-evaluation-only was REJECTED (too thin for a UI language).

**Case shape (the agnostic contract):**
```
case = {
  source:          <scrml source>,
  language-version: 1.0 | deprecated | future,   // D2 partition; the 1.0 subset DEFINES the surface
  expect: {
    codes:   [ "E-X", "W-Y", ... ],              // (a) — code-SET presence (see OQ3)
    input:   [ <event>, ... ]?,                  // optional driver: click #btn, type "x" into #f, ...
    dom:     <normalized final DOM>?,             // (b) — final rendered tree, scrml-semantic-normalized
    state:   { cell: value, ... }?,              // (b) — final state-cell values
  }
}
```

**Adapter interface (what an impl must expose — minimal):**
```
compile(source) -> { codes: string[], artifact }     // (a) + the runnable
run(artifact, input[]) -> { dom, state }             // (b) — drives events, reads final dom+state
```
Impl#1 (TS) implements this over `compileScrml` + happy-dom (it already has both). Impl#2 (native) implements the same two functions — that IS the Road-B gate (W5).

**OQ2 — serialization (lean, scope-level):** one directory per case, `case.scrml` (real source — opens in editor/LSP, is itself dog-food) + `expected.json` (codes + input + dom + state + version). Precedent: the within-node allowlist is already JSON. Rejected: one mega-manifest with source-as-string (awkward, un-LSP-able).

**OQ3 — diagnostic-match granularity (lean, scope-level):** **code-SET presence**, NOT line/col position. The 109 existing tests already assert presence (`errors.some(e => e.code === X)`); D3 ratified text/shape/AST as impl freedom, and code *position* is the same class (different parsers legitimately attribute a code to slightly different loci). The contract = "this source fires exactly this code-set." (A future tightening to presence-at-locus is a v1.next option, not v1.0.)

## 3. The waves

| W | What | Shape | Est |
|---|---|---|---|
| **W1** | the case format + adapter interface (§2) | design — **crux RATIFIED**; OQ2/OQ3 leans above | small (design) |
| **W2** | lift the 109 *(source→codes)* into the format; the impl#1 adapter must reproduce the current pass/fail set EXACTLY (extraction is correct iff impl#1 still goes green) | mechanical / **sPA-able** | medium (bulk, low-risk) |
| **W3** | the systematic runtime/behavioral layer — author final-DOM+state cases for the core surface (reactive cells, engines, match, each, forms, errorBoundary, server-fn effects) | **net-new authoring** | large (the real work) |
| **W4** | language-version labeling (D1/D2): the `language` field in chunks.json (D1) + per-case `language-version` tags; the 1.0-labeled subset DEFINES the surface; known-gaps Nominal list → "v1.next" | wiring | small-medium |
| **W5** | the Road-B gate (D5): native impl#2 implements `compile`/`run`; "native is correct iff it passes the 1.0 suite" | native-era | (consuming milestone) |

**Critical-path note:** W1→W2 proves the extraction mechanism (impl#1 reproduces green) cheaply; W3 is where the contract gains its teeth (the (b) half no current test systematically covers). W2 is the safe first dispatch; W3 is the design-heavy core.

## 4. Open questions (downstream — do NOT block W1/W2)

- **OQ5 — where the suite lives.** Today: in `scrml/` (impl#1's repo) under e.g. `conformance/` (top-level) or `compiler/conformance/`. It is impl-AGNOSTIC content, so its *eventual* home is a dedicated language-spec artifact owned by the **language-PA** (the PA-mitosis stem). RESOLUTION: build it in `scrml/` now; relocate when the artifact-split lands (gated, per the genome-preservation guardrail). Don't pre-split the repo before the chromosomes are ready.
- **OQ-runtime-normalization** (W3 detail): the exact DOM-normalization rules (whitespace, attribute order, scrml-runtime wrapper elements stripped) so two impls' DOM compare equal at the scrml-semantic level — a W3 design sub-task, not a W1 blocker.
- **OQ-deprecation cases** (D4): a `deprecated`-labeled case asserts the W-lint fires AND the program still runs (accept-with-warning) — folds into W4.

## 5. What this is NOT (scope guard)

- NOT a rewrite of the 109 tests' INTENT — it's a *lift* of their (source, codes) into an agnostic format; impl#1 must stay green throughout (the within-node-allowlist re-baseline discipline applies if any fixture AST shifts).
- NOT the native parser build (that's W5 / Road-B, native-era — this suite is its *precondition*).
- NOT message-text / JS-shape / AST conformance (explicit impl freedom per D3).

## Authority + cross-refs
- Deep-dive (the reframe + D3 ratification): `scrml-support/docs/deep-dives/language-compiler-split-2026-06-29.md` §3 (D1–D5) + §10 (ledger).
- The v1.0 fail-closed-Nominal invariant (companion robustness rule): same deep-dive §4 criterion 3 + known-gaps `g-nominal-foreign-forms-not-failclosed`.
- delta-log: the build-scoping entry (S231).
- Existing substrate: `compiler/tests/conformance/**`, `compiler/tests/parser-conformance-within-node*`, `compiler/src/native-parser-canary/within-node-classifier.ts`.
