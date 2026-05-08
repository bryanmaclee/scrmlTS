# Anomaly Report: server-keyword-deprecation-batch-1-2026-05-08

## Test behavior changes

### Expected
- **+38 new tests passing across §26 (D1, +6), §27 (D2, +11), §28 (D3, +9), §29 (D4, +7), §30 (D5, +5)**.
  Each section directly tests one of the 5 Insight 26 preconditions.
- **§8 cycle test (existing) modified** — pre-Insight-26, A→B→A cycle where B is server-annotated kept A client.
  Post-Insight-26 D3, A's only non-self caller is B (server) → A escalates via caller-context propagation.
  Test docstring updated to reference Insight 26 explicitly. This is the load-bearing semantic change.
- **§1 client-default test (existing) modified** — `errors.length === 0` filter expanded to also exclude
  W-DEAD-FUNCTION + W-DEPRECATED-SERVER-MODIFIER. The test asserts on ABSENCE of routing errors;
  advisory warnings introduced by D4/D5 are out of scope for that assertion.
- **LSP completions.test.js + document-symbols.test.js — `diagnostics.length === 0` assertions filtered**
  to exclude advisory warnings. Same rationale as above: the LSP tests check structural diagnostics
  in minimal fixtures; firing an advisory warning is correct behavior but noise for these tests.

### Unexpected (Anomalies)
- **None.** All test deltas trace cleanly to the Insight 26 preconditions.

## E2E output changes (samples/compilation-tests/)

### Expected
All 12 compilation-test samples compile successfully (pre-batch baseline preserved).
- `combined-001-counter`, `combined-002-todo`, `combined-003-form-validation`, `combined-021-component-basic`,
  `control-001-if-basic`, `control-002-if-else`, `control-011-if-reactive`, `reactive-014-form-state`,
  `reactive-016-bind-value`, `reactive-017-arrays`, `reactive-018-class-binding`, `transition-001-basic`:
  ALL emit only the pre-existing `W-PROGRAM-001` warning (no `<program>` root). NO new W-DEAD-FUNCTION
  or W-DEPRECATED-SERVER-MODIFIER fires on any compilation-test sample.

The reason: the markup-text-search heuristic correctly detects `onclick=fn()` `call-ref` AttrValue
shapes via the structured-AttrValue handling path (D4 implementation handles `kind: "call-ref"`,
`kind: "variable-ref"`, `kind: "expr"`, `kind: "string-literal"`, plus legacy string values).

### Unexpected (Anomalies)
- **None on compilation-test samples.** No byte-output diffs for any of the 12.

## Larger examples/ directory (real adopter-style code)

### Expected — W-DEPRECATED-SERVER-MODIFIER fires (the documented deprecation surface)

Sampled compilation of larger examples confirms W-DEPRECATED-SERVER-MODIFIER fires on
real adopter patterns of `server function` + SQL body:

- `examples/03-contact-book.scrml`: 2 fires (`persistContact`, `deleteContact`) — both have body SQL.
- `examples/07-admin-dashboard.scrml`: 1 fire (`deleteUser`) — body SQL.
- `examples/18-state-authority.scrml`: 3 fires (`addTask`, `toggleTask`, `deleteTaskById`) — body SQL.

Per dispatch, this is **expected behavior** — these warnings document the deprecation surface that
Batch 2 stdlib cleanup + migration tool will mechanically resolve. No source-text changes required
in Batch 1 (deferred to Batch 2).

### Caller-context-propagation reclassifications

All 12 compilation-test samples retain unchanged route classifications. The samples' helper functions
are either client-only (no server callers) or referenced from markup events (which means they have
"client callers" via the markup-text heuristic and stay client). No examples observed reclassifying
ambient → server during Batch 1 sampling.

Real adopter code (e.g. examples/03-contact-book) may have helper functions called only from
server-classified callers — those would now correctly reclassify. Per dispatch, this is the
intended behavior (Insight 26's load-bearing precondition 3). No anomaly.

### Other byte-output diffs

None observed. All 12 compilation-test samples produce identical structural output (same warning
codes, same compile success). The deprecation warnings are diagnostic-only and do not change
emitted JS/HTML/CSS bytes.

## New warnings or errors

| Code                          | Severity | Trigger                                                                                                |
|-------------------------------|----------|--------------------------------------------------------------------------------------------------------|
| W-DEPRECATED-SERVER-MODIFIER  | warning  | `isServer === true` AND (body trigger exists OR all non-self callers are server-classified)            |
| W-DEAD-FUNCTION               | warning  | function with NO non-self callers AND NOT exported AND NOT server-annotated AND NOT markup-referenced  |

Both new codes follow the existing warning-emission pattern in RI (`RIError.severity = "warning"`).
No spec amendments to §34 in Batch 1 — those land in Batch 2 alongside §11.4 / §52.10 / §47.10 /
§12.2 amendments.

## Anomaly Count: 0

## Status: CLEAR FOR MERGE

All test deltas, E2E behavioral changes, and new diagnostic emissions trace cleanly to Insight 26
preconditions. No surprises, no unexplained byte-output diffs, no new structural failures.
The 3 pre-existing self-host parity fails are preserved and remain out of scope.
