# Anomaly Report: lin-batch-b

## Test Behavior Changes

### Expected
- type-system.test.js: +15 new tests passing (Lin-B1 through Lin-B5). These are the new lin-param
  tests added in this batch. All pass.
- predicate-parsing.test.js: All 13 tests still pass. The `number(>0)` type annotation string is
  preserved exactly (no spaces added around operators within parens) because the space-insertion
  logic in parseParamList only fires for IDENT/KEYWORD tokens, not punct tokens.
- All other test files: no change from baseline.

### Unexpected (Anomalies)
None.

## E2E Output Changes

### Expected
- `lin-001-basic-linear.scrml`: Compiles clean, same as before. (No change — the lin-decl/lin-ref
  AST nodes are still not emitted by the real pipeline; E2E lin enforcement remains dormant.)
- `lin-002-double-use.scrml`: Still compiles with no errors. This is expected — the real-pipeline
  lin enforcement gap (linNodes never populated) is pre-existing and out-of-scope for Batch B.

### Unexpected (Anomalies)
None.

## New Warnings or Errors
None.

## Scope note

The lin E2E enforcement gap (the real pipeline never populating `fileAST.linNodes`) is a pre-existing
limitation that predates Batch A. Batch B adds the **parser** support (param parsing) and the
**type-system** infrastructure (function-decl scope in checkLinear). The unit tests verify the analysis
logic correctly. Wiring the real pipeline to populate `linNodes` from the AST walker (and to pass
function-decl nodes to checkLinear) is a separate piece of work, likely Batch C or a dedicated
"lin-pipeline-wiring" task.

## Anomaly Count: 0
## Status: CLEAR FOR MERGE

## Tags
#lin-batch-b #anomaly-report

## Links
- Pre-snapshot: docs/changes/lin-batch-b/pre-snapshot.md
- Progress: docs/changes/lin-batch-b/progress.md
- Prior batch: e6bf1cd (lin-batch-a)
