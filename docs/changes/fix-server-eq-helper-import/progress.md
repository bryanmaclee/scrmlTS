# Progress: fix-server-eq-helper-import

- [start] Branch created (changes/fix-server-eq-helper-import). Pre-snapshot captured. Baseline: 7825/40/0.
- Plan:
  1. Approach (a) — primitive shortcut in emit-expr.ts (closes the reported bug)
  2. Approach (b) fail-safe — inline `_scrml_structural_eq` helper into server emit when `==`/`!=` referenced from a server fn body
  3. Regression tests (unit) for both
  4. E2E — compile sidecar, verify .server.js is clean
