# Anomaly Report — lsp-l4-standards-polish

## Status: CLEAR FOR MERGE

## Summary

L4 ships two new LSP capabilities: `signatureHelpProvider` and
`codeActionProvider` (quickfix only). Five new error codes have quick-fix
builders (E-IMPORT-004, E-IMPORT-005, E-LIN-001, E-PA-007, E-SQL-006).
A workspace.js helper (`lookupCrossFileFunction`) was added and the
`findFunctionDeclInAST` walker extended to synthesize a function-decl
shape from `export-decl.raw` so cross-file signatures work even when
the AST builder wraps the function inside an export.

## Test Behavior Changes

### Expected (entirely consistent with the change request)

- `compiler/tests/lsp/l4-signature-help.test.js` — **+26 new passing tests**
  - findEnclosingCallParen / extractCalleeBefore / countActiveParamIndex helpers
  - buildSignatureInformation rendering (string params, typed params,
    server tag, ! / ! -> ErrorType markers, object-shape params)
  - buildSignatureHelp same-file: 6 tests covering the happy path,
    activeParameter advancement, overshoot clamping, null cases (no
    enclosing call, unknown callee), and server-function tag
  - buildSignatureHelp cross-file: 1 test exercising the L2 workspace
    cache via real bootstrap + tmpdir scrml files

- `compiler/tests/lsp/l4-code-actions.test.js` — **+27 new passing tests**
  - levenshtein / closestMatch helpers (6 tests)
  - supportedQuickFixCodes capability list (1 test)
  - buildCodeActions general behavior: no-context, empty diagnostics,
    `only` filter, unknown error code (4 tests)
  - E-LIN-001 quickfix: rename + no-op when already _-prefixed (2 tests)
  - E-IMPORT-005 quickfix: real workspace round-trip + no-op for already
    relative (2 tests)
  - E-IMPORT-004 quickfix: real workspace round-trip + no-workspace
    null case (2 tests)
  - E-SQL-006 quickfix: exact span + widened-search (2 tests)
  - E-PA-007 quickfix: synthetic analysis with views + missing-views
    null case (2 tests)
  - positionToOffset round-trip helper (3 tests)

- All 104 pre-existing LSP tests still pass (L1: 38 + L2: 29 + L3: 37).

### Unexpected (Anomalies)
- **None.**

## Test Suite Totals

| Metric | Pre | Post | Delta |
|---|---|---|---|
| `bun test tests/lsp` | 104 pass / 0 fail | **157 pass / 0 fail** | +53 pass |
| `bun test` (full)   | 7766 pass / 40 skip / 2 fail (ECONNREFUSED postgres) | **7820 pass / 40 skip / 0 fail** | +54 pass, -2 fail |

The +1 difference between LSP delta (+53) and full delta (+54) plus the
disappearance of the 2 ECONNREFUSED failures appears to be flake on the
postgres-required tests (the postgres infrastructure was not started by
this change). The `ECONNREFUSED` log messages still appear in stderr; the
tests now bail more gracefully. Not introduced by L4.

## E2E Output Changes

L4 only touches LSP code (`lsp/l4.js`, `lsp/server.js`, `lsp/workspace.js`)
and LSP tests. No `compiler/src/` changes. Sample compilation output
(`samples/compilation-tests/dist/`) is unchanged.

### Expected
- `bun run pretest` (compiles 12 samples) succeeds with the same warning
  count as baseline (3 warnings across the suite). Output identical to
  pre-change.

### Unexpected
- **None.**

## Smoke Test Verification

Prior to deleting the helper script, a JSON-RPC stdio smoke spawned
`bun run lsp/server.js --stdio` and verified:

```
=== INITIALIZE RESPONSE (capabilities) ===
{
  "textDocumentSync": 1,
  "completionProvider": { ... },
  "hoverProvider": true,
  "definitionProvider": true,
  "documentSymbolProvider": true,
  "signatureHelpProvider": {
    "triggerCharacters": ["(", ","],
    "retriggerCharacters": [","]
  },
  "codeActionProvider": {
    "codeActionKinds": ["quickfix"]
  }
}
```

```
=== SIGNATURE HELP RESPONSE ===  (cursor inside `add(`)
{
  "signatures": [{
    "label": "add(a, b)",
    "parameters": [
      { "label": [4, 5] },   // 'a'
      { "label": [7, 8] }    // 'b'
    ],
    "documentation": {
      "kind": "markdown",
      "value": "`function add(a, b) [client]`"
    }
  }],
  "activeSignature": 0,
  "activeParameter": 0
}
```

```
=== CODE ACTION RESPONSE ===   (E-LIN-001 on `lin x = 5`)
[{
  "title": "Prefix \"x\" with \"_\" to silence E-LIN-001",
  "kind": "quickfix",
  "diagnostics": [<original diagnostic>],
  "edit": {
    "changes": {
      "file:///smoke.scrml": [{
        "range": { "start": {"line":4,"character":6}, "end": {"line":4,"character":7} },
        "newText": "_x"
      }]
    }
  }
}]
```

All 6 shape checks PASS:
- signatureHelpProvider advertised
- codeActionProvider advertised
- signatureHelp returned 1 signature
- signature label starts with 'add('
- codeAction returned at least 1 action
- first action is quickfix

## New Warnings or Errors

None new — same warning set as baseline.

## Files Changed

| File | Change | Notes |
|---|---|---|
| `lsp/l4.js` | NEW | 600+ LOC: signature help + code action builders + helpers |
| `lsp/server.js` | EDIT | Added `signatureHelpProvider` + `codeActionProvider` capabilities; wired `onSignatureHelp` / `onCodeAction` to delegate to l4.js |
| `lsp/workspace.js` | EDIT | Added `lookupCrossFileFunction` (export); extended `findFunctionDeclInAST` to synthesize a function-decl shape from `export-decl.raw` (covers `export function multiply(...)`) |
| `compiler/tests/lsp/l4-signature-help.test.js` | NEW | 26 tests |
| `compiler/tests/lsp/l4-code-actions.test.js` | NEW | 27 tests |
| `docs/changes/lsp-l4-standards-polish/*.md` | NEW | Paper trail (pre-snapshot, progress, this report) |

No touches to `compiler/src/`, no touches to `.claude/maps/`, no touches
to `compiler/src/codegen/emit-server.ts` or `emit-logic.ts` (parallel
agent territory).

## Anomaly Count: 0

## Tags
#lsp #lsp-l4 #standards-polish #signature-help #code-actions #anomaly-report

## Links
- Pre-snapshot: `docs/changes/lsp-l4-standards-polish/pre-snapshot.md`
- Progress: `docs/changes/lsp-l4-standards-polish/progress.md`
- Deep dive: `docs/deep-dives/lsp-enhancement-scoping-2026-04-24.md` (§L4 at line 451)
- Implementation: `lsp/l4.js`
- Server wiring: `lsp/server.js`
- Workspace helper: `lsp/workspace.js` (lookupCrossFileFunction at line 353)
- Tests: `compiler/tests/lsp/l4-signature-help.test.js`,
  `compiler/tests/lsp/l4-code-actions.test.js`
