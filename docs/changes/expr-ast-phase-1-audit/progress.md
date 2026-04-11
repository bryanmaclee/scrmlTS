# Progress: expr-ast-phase-1-audit

- [start] Branch created: changes/expr-ast-phase-1-audit stacked on changes/expr-ast-phase-1
- [start] Artifact directory created: docs/changes/expr-ast-phase-1-audit/
- [complete] Integration test written: compiler/tests/integration/expr-node-corpus-invariant.test.js
- [complete] Test run: 5 pass, 10 fail (round-trip failures on 10/14 files -- stop-and-report triggered)
- [complete] Catalog artifacts written: escape-hatch-catalog.json, escape-hatch-catalog.md
- [complete] Anomaly report written: anomaly-report.md
- [BLOCKED] Round-trip invariant fails on 10 of 14 files. Root cause: normalizeWhitespace
  cannot reconcile token-joiner spaces (e.g. "foo . bar") with AST-emitted compact form
  ("foo.bar"). Not a Phase 1 implementation bug -- the ExprNode trees are correct. The
  invariant test framework needs structural comparison rather than string comparison.
