# Progress: fix-server-eq-helper-import

- [start] Branch created (changes/fix-server-eq-helper-import). Pre-snapshot captured. Baseline: 7825/40/0.
- Plan:
  1. Approach (a) — primitive shortcut in emit-expr.ts (closes the reported bug)
  2. Approach (b) fail-safe — inline `_scrml_structural_eq` helper into server emit when `==`/`!=` referenced from a server fn body
  3. Regression tests (unit) for both
  4. E2E — compile sidecar, verify .server.js is clean

- [step (a) DONE] Added `isStaticallyPrimitive(node)` and shortcut in `emit-expr.ts` `emitBinary`.
  - Sidecar reproducer now emits `(arr.length === 0)` instead of the helper call.
  - End-to-end: server.js loads, route handler runs, returns `{"ok":true}` without ReferenceError.
  - Tests still 7825/40/0.
  - Commit: 9087d2a

- [step (b) DONE] Inline `_scrml_structural_eq` helper into server emit when any `==`/`!=` survives the shortcut.
  - Final pass in `generateServerJs`: scans `lines.join("\n")` for the helper call,
    if found, prepends a verbatim copy of the helper at the file header / imports boundary.
  - Verified end-to-end with a struct-equality probe — server module loads, handler returns `{"ok":true}`.
  - Tests still 7825/40/0.
  - Commit: f9dd441

- [tests DONE] 11 unit tests in `compiler/tests/unit/server-eq-helper-import.test.js`.
  - §1   sidecar reproducer
  - §2-6 primitive shortcut coverage
  - §7   helper-inlining coverage
  - §8   inlined helper extracted via Function() and exercised with 23 deep-eq cases
  - §9   enum-tag (_tag) branch coverage
  - §10  no false-positive inlining
  - §11  idempotent inlining
  - Final tests: 7836/40/0 (+11 from baseline, no regressions).
  - Commit: 7e3bfc2

- [admin DONE] Stash residue from prior failed attempt committed separately as b2067ca
  (handoff/intake admin files unrelated to the codegen fix).

- [anomaly DONE] CLEAR FOR MERGE. See anomaly-report.md.

## Final state
- Branch: changes/fix-server-eq-helper-import
- Final SHA: b2067ca (or 7e3bfc2 if the unrelated admin commit is dropped)
- Tests: 7836/40/0
- Sidecar: fixed end-to-end (server.js loads + runs)
- No regressions
