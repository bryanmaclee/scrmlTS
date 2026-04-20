# S32 Conformance Registry — fn Minimize + State/Machine Completeness

**Amendment:** commit `1d1c49d` (2026-04-20) — ratifies Insight 21 (Flavor A+B).
**Status:** SPEC-ONLY. Compiler implementation of §54.6 codes and §51.15
cross-check has NOT landed as of this registry's creation.

All tests in this directory are `test.skip(...)`. They are gating tests: when
an implementer lands E-STATE-COMPLETE / E-STATE-FIELD-MISSING /
E-STATE-TRANSITION-ILLEGAL / E-STATE-TERMINAL-MUTATION /
E-STATE-MACHINE-DIVERGENCE / W-PURE-REDUNDANT, un-skip each test, wire the
`diagnose()` harness stub to `compileScrml(...)`, and confirm the test
catches a correct implementation while rejecting the pre-S32 behavior.

## Status legend

- `Gating` — test skipped, awaiting implementation
- `Passing` — implementation lands, test un-skipped and green
- `Failing` — implementation lands but test red; implementer to fix one or the other

## Statement Inventory

| ID           | Spec § | Statement (abbreviated)                                                                 | Test File                          | Status |
|--------------|--------|-----------------------------------------------------------------------------------------|------------------------------------|--------|
| CONF-S32-001 | §33.2  | State-local transition bodies SHALL be pure by default                                  | s33-pure.test.js                   | Gating |
| CONF-S32-002 | §33.6  | Transitions MAY NOT call non-deterministic built-ins (Date.now, Math.random, …)         | s33-pure.test.js                   | Gating |
| CONF-S32-003 | §33.4  | W-PURE-REDUNDANT fires on `pure fn` / `pure transition`                                 | s33-pure.test.js                   | Gating |
| CONF-S32-004 | §48.11 §48.13 | `fn` SHALL be semantically equivalent to `pure function` at the declaration site | s48-fn.test.js                     | Gating |
| CONF-S32-005 | §48.13 | Existing `fn` declarations SHALL be accepted without modification                       | s48-fn.test.js                     | Gating |
| CONF-S32-006 | §48.13 §54.6.1 | State-literal completeness SHALL be enforced at the literal's `</>` (universal) | s48-fn.test.js                     | Gating |
| CONF-S32-007 | §48    | E-FN-006 is retired — MUST NOT be emitted                                                | s48-fn.test.js                     | Gating |
| CONF-S32-008 | §51.3.2 | Empty machine body is legal iff governed state type has state-local transitions         | s51-machine-cross-check.test.js    | Gating |
| CONF-S32-009 | §51.15.2 | Every state-local transition SHALL correspond to a machine edge (override mode)        | s51-machine-cross-check.test.js    | Gating |
| CONF-S32-010 | §51.15.2 | Every substate-sourced machine edge SHALL correspond to a state-local transition       | s51-machine-cross-check.test.js    | Gating |
| CONF-S32-011 | §51.15.2 | Temporal transitions (`after Ns =>`) exempt from cross-check                            | s51-machine-cross-check.test.js    | Gating |
| CONF-S32-012 | §51.15.2 | Wildcard transitions (`* => *`, `* => .To`) exempt from cross-check                     | s51-machine-cross-check.test.js    | Gating |
| CONF-S32-013 | §51.15.2 | Guarded machine transitions DO require a state-local counterpart                        | s51-machine-cross-check.test.js    | Gating |
| CONF-S32-014 | §51.15.3 | State-local transition target SHALL be permitted by type-level `transitions {}` graph   | s51-machine-cross-check.test.js    | Gating |
| CONF-S32-015 | §54.3  | Transition body SHALL terminate with explicit `return < SubstateName>` literal          | s54-substates.test.js              | Gating |
| CONF-S32-016 | §54.3  | `from` SHALL be parsed as a keyword ONLY inside transition bodies                       | s54-substates.test.js              | Gating |
| CONF-S32-017 | §54.3  | `from` SHALL NOT be reserved outside transition bodies (param/binding/field name OK)    | s54-substates.test.js              | Gating |
| CONF-S32-018 | §54.4  | `match` over a substated state type SHALL require exhaustive substate coverage          | s54-substates.test.js              | Gating |
| CONF-S32-019 | §54.5  | Terminal substates accept no state-local transition calls (E-STATE-TRANSITION-ILLEGAL)  | s54-substates.test.js              | Gating |
| CONF-S32-020 | §54.5  | Terminal substates reject all field mutations (E-STATE-TERMINAL-MUTATION)               | s54-substates.test.js              | Gating |
| CONF-S32-021 | §54.6.1 | E-STATE-COMPLETE fires at state-literal close with unassigned field (universal scope)  | s54-substates.test.js              | Gating |
| CONF-S32-022 | §54.6.2 | E-STATE-FIELD-MISSING on cross-substate field read (with cross-substate hint)           | s54-substates.test.js              | Gating |
| CONF-S32-023 | §54.6.3 | E-STATE-TRANSITION-ILLEGAL on transition call not declared on current substate          | s54-substates.test.js              | Gating |
| CONF-S32-024 | §54.6.4 | E-STATE-TERMINAL-MUTATION on field write to terminal substate (with self-tx hint)       | s54-substates.test.js              | Gating |
| CONF-S32-025 | §54.7.1 | State-local transition assignment SHALL be observable to projection machines           | s54-substates.test.js              | Gating |
| CONF-S32-026 | §54.7.2 | State-local transitions SHALL be compatible with `lin` bindings without special marking | s54-substates.test.js              | Gating |
| CONF-S32-027 | §54.7.4 | `when @var changes {}` SHALL fire exactly once per state-local transition call          | s54-substates.test.js              | Gating |
| CONF-S32-028 | §54.7.5 | Audit clauses SHALL capture machine-bound transitions; non-bound transitions NOT audited | s54-substates.test.js             | Gating |
| CONF-S32-029 | §54.7.6 | Replay SHALL execute the state-local transition body (preserves body assignments)       | s54-substates.test.js              | Gating |
| CONF-S32-030 | §54.7.7 | Temporal transition SHALL NOT execute any state-local transition body                   | s54-substates.test.js              | Gating |
| CONF-S32-031 | §54.7.8 | E-STATE-COMPLETE fires at `</>` of a lifted literal in `fn` (before `lift` accumulates) | s54-substates.test.js              | Gating |

**Total statements registered:** 31
**Total tests written:** 31 (all skipped)
**Files:** 4

## Implementation notes for the future gating un-skipper

1. Replace the `diagnose()` stub in each file with a real harness that calls
   `compileScrml({ inputFiles: [tmpFile], mode: "library", write: false })`
   against a tmpdir-backed source, and returns `{errors, warnings}` from the
   result. The same pattern is used in `compiler/tests/self-host/bs.test.js`.
2. Some tests have runtime-behavior assertions (§54.7.1, §54.7.4, §54.7.5,
   §54.7.6, §54.7.7). For these, wire against a runtime harness that can
   instantiate the generated module and count observations (e.g., `when ... changes`
   firings, `@log` audit entries, replayed field values).
3. CONF-S32-003a (pure fn) and CONF-S32-003b (pure transition) are sub-cases
   of the same normative statement; only CONF-S32-003 is in the registry.
4. CONF-S32-006a and CONF-S32-006b are fn/function scope variants of the
   universal E-STATE-COMPLETE rule; only CONF-S32-006 is in the registry.
5. CONF-S32-015a and CONF-S32-015b are body-shape sub-cases (no return / non-
   state-literal return); only CONF-S32-015 is in the registry.
6. CONF-S32-017a/b/c are parameter/binding/field sub-cases of the `from`
   non-reservation rule; only CONF-S32-017 is in the registry.
7. CONF-S32-021a/b are required-field and defaulted-field sub-cases of
   E-STATE-COMPLETE; only CONF-S32-021 is in the registry.
8. CONF-S32-028a/b are bound/non-bound sub-cases of the audit-capture rule;
   only CONF-S32-028 is in the registry.
