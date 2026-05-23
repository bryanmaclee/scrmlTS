# Progress: M6.4a — native-side P2-Form1 synthesis fix

- [start] Created branch changes/m6.4a, echo-pwd commit landed
- [reproduction] Two exemplars staged at docs/changes/m6.4a/exemplars/{single-file,cross-file}
- [reproduction] LIVE: single 0 errors, cross 0 errors
- [reproduction] NATIVE: single 1 E-COMPONENT-035 (Greeting), cross 2 E-COMPONENT-035 (X1Badge)
- [next] Implement liftPairedExport Component branch in compiler/native-parser/parse-markup.js
- [implementation] Added isFormOneComponentName + 5 helpers (scanOpenerForAttrsNative / extractOuterAttrSourceNative / parseAttrNamesNative / findSingleBodyRootNative / spliceAttrsIntoBodyRootNative) at parse-markup.js:2089-2330; added Component branch in liftPairedExport:2580. CAUTION: initial edits landed in main repo path; moved to worktree + reverted main.
- [secondary fix] Discovered native FileAST.exports + imports were native-Stmt-shaped (not live-Node-shaped). MOD/NR/api consumers silently dropped cross-file bindings. Added synthExportDecl + synthImportDecl in collect-hoisted.js (mirrors translate-stmt.js makeExportDecl/makeImportDecl shape) — populate exportedName/exportKind/raw on exports + names/specifiers on imports.
- [verification] Single-file exemplar: 0 errors (was 1× E-COMPONENT-035). Cross-file: 0 errors (was 2× E-COMPONENT-035).
- [tests] +4 regression tests in compiler/tests/integration/m6.4a-native-p2-form1.test.js (§A1 single-file, §A2 cross-file, §A3 non-Form-1 guard ×2). All pass.
- [tests] Updated 3 assertions in parser-conformance-collect-hoisted.test.js to reflect new LIVE shape on exports/imports (was native StmtKind shape).
- [verification] bun test compiler/tests/unit + integration + conformance: 13823 pass, 0 fail, 0 regressions.
- [verification] parser-conformance + canary: 5225 pass, 0 fail. dual-pipeline canary stable at 998/1000 strict-pass (the 2 remaining gaps — GAP-state-block + DIFF-hoist-count — are unrelated to Form 1).
- [done] All commits clean. Branch: changes/m6.4a.

