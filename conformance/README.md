# scrml conformance suite (D3 — codes half, pilot)

Impl-agnostic conformance cases for **scrml-language-1.0**. The contract a case
asserts is the *language* contract per the language/compiler split (D3): **which
diagnostic CODES fire** + (later) the **runtime effect**. Message text, emitted-JS
shape, and AST are impl freedom and are NOT asserted here.

Change-id: `conformance-suite-d3-2026-06-29`. Authority: `docs/changes/conformance-suite-d3-2026-06-29/SCOPE.md`.

This is the **W2 pilot** (~15 representative cases). The full lift of the 109
`compiler/tests/conformance/**` source tests, and the (b) runtime-effect half,
are subsequent waves.

## Layout

```
conformance/
  cases/<category>/<case-id>/
      case.scrml       real scrml source (opens in editor/LSP; itself dog-food)
      expected.json    the agnostic contract (codes + provenance)
  adapters/impl1-ts.ts compile(source) -> { codes } over the TS reference compiler
  run.ts               loads + checks every case; exits non-zero on failure
  conformance-corpus.test.js   bun:test wrapper (one test() per case)
```

## `expected.json` schema

```json
{
  "id": "input-001-pos",
  "description": "one line",
  "language-version": "1.0",
  "source-test": "compiler/tests/conformance/conf-INPUT-001.test.js",
  "expect": {
    "codes":    ["E-INPUT-001"],
    "notCodes": []
  }
}
```

- `language-version` — `"1.0" | "deprecated" | "future"` (D2 partition; the 1.0
  subset DEFINES the surface).
- `source-test` — provenance: the `*.test.js` this case was lifted from.
- `expect.codes` — codes that MUST fire (**presence / superset**, not line/col;
  SCOPE OQ3). A POS test lifts to a case with `codes`.
- `expect.notCodes` — codes that MUST be ABSENT. A NEG test lifts to its own
  source where the code does not fire.
- `runtime-half-pending: true` (+ optional `runtime-half-ref`) — flags a case
  whose original test ALSO asserts a runtime EFFECT; only its codes half is
  lifted for now.
- **RESERVED (not yet populated)** — `expect.input` / `expect.dom` /
  `expect.state`: the (b) runtime-effect half (final DOM + state snapshot after
  an optional input-event sequence), built in W3.

### Matching semantics (load-bearing)

The check is `emitted ⊇ expect.codes` AND `emitted ∩ expect.notCodes = ∅` — a
**superset/disjoint** check, NOT exact-equality. Real compiles emit incidental
codes (`W-PROGRAM-*`, `W-WHITESPACE-001`, `W-SQL-ROW-UNTYPED`, …) that the source
conf tests ignore (they assert with `.some(e => e.code === X)`). The adapter
unions codes across BOTH `result.errors` AND `result.warnings` (a `W-`/`I-` code
lands only in `result.warnings`).

## Running

```sh
bun conformance/run.ts                                  # standalone; exit code = pass/fail
bun test ./conformance/conformance-corpus.test.js       # via bun:test (note the ./)
```

> `bunfig.toml` sets `[test] root = "compiler/tests/"`, so the top-level
> `conformance/` dir is NOT auto-discovered by the root-restricted pre-commit
> gate; run the corpus test with an explicit `./`-prefixed path. Wiring it into
> the gated suite is a full-W2 decision.

## Adding an impl#2 (native) adapter

Expose the same `compile(source) -> { codes }` (and later
`run(artifact, input[]) -> { dom, state }`). "Native is correct iff it passes
the 1.0 suite" is the Road-B gate (W5).
