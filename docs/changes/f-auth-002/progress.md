# Progress: f-auth-002

- [W5 START] Worktree verified clean. Rebased onto main HEAD `5c35618`. node_modules + dist symlinks created.
- [BASELINE] `bun test` from worktree compiler/ → 8361 pass / 40 skip / 0 fail / 29077 expect calls / 398 files. Matches expected pre-W5 baseline.
- [SCOPE] F-AUTH-002 = pure-fn file (e.g., `models/auth.scrml`) exporting `server function` with `?{}` cannot resolve db context against importing file's `<program db=>`. The dispatch app duplicates ~450 LOC of session/user lookup across M2-M6 because of this gap.
- [STRATEGY] Deep-dive §5.1 recommends Shape C: spec amendment (B) + impl resolves at import-site (A). Pure-fn files declare intent (e.g., via §21.5 modifier or syntax marker), impl resolves `?{}` against importing context's db.
- [NEXT] Reproduce bug → locate exact error emission → diagnose → spec contract → impl → tests → unblock demo.

- [DIAGNOSIS] Repro at `/tmp/f-auth-002-repro/`. Three errors fire:
  - E-IMPORT-004 (getUser not exported) — root cause: ast-builder regex misses `server function`
  - E-PA-002 (db doesn't exist) — infrastructure noise
  - E-CG-006 (server pattern in client) — cascade from #1
- [LAYER 1] ast-builder.js:3901 export regex `/^\s*(type|function|fn|const|let)\s+(\w+)/` blind to `server`/`pure` modifiers.
- [LAYER 2] codegen/index.ts:275-327 only annotates `_dbVar` on descendants of `<program db=>`. Pure-fn files have none, so server fn ?{} fall back to default `_scrml_sql` (uninitialized in pure-fn output).
- [LAYER 3] SPEC §21.5 / §44.2 silent on cross-file ?{} resolution. Need contract for module-with-imported-db-context.
- [STRATEGY] Shape C: minimal SPEC amendment + impl resolves at call-site by embedding pure-fn server function bodies into the importing page's server.js with the page's `_dbVar` substituted.
- [NEXT] Commit diagnosis. Fix Layer 1 (regex). Then design and implement Layer 2 (callsite inlining or shared-state init).

- [LAYER 1 FIX] ast-builder.js EXPORT branch: peek-and-consume optional `pure`/`server`/`pure server` modifier tokens BEFORE collectExpr. Adds `isPure`/`isServer` flags to export-decl node. Updated types/ast.ts. Updated self-host parity test to skip new fields.
- [TEST] 8361 pass / 0 fail — baseline preserved.
- [TEST] /tmp/f-auth-002-repro/models/auth.scrml now records `exportedName: "getUser"`, `exportKind: "function"`, `isServer: true` correctly.

- [LAYER 1 EXTEND] Added test coverage: `compiler/tests/integration/f-auth-002-export-modifiers.test.js` (13 tests). All variants pass: `export {function|fn|const|let|type|re-export}`, `export server function|fn`, `export pure function|fn`, `export pure server function|fn`. Module-resolver registry test confirms downstream registration.
- [LAYER 1 FIX 2] Tokenizer note: `pure` is IDENT (not KEYWORD); export branch now accepts either kind. `server` remains KEYWORD-only.
- [TEST] 8374 pass / 0 fail / +13 new tests / zero regressions.
- [SPEC] Added §21.5.1 (Modifier-Carrying Exports) describing the export-prefix grammar + isPure/isServer flags.
- [SPEC] Added §44.7.1 (Module-with-db-context) and E-SQL-009 (placeholder for cross-file ?{} hard error). Documents the contract direction; full impl deferred to W5-FOLLOW.
- [SCOPE-DECISION] During diagnosis I discovered that the cross-file ?{} fix requires significantly more architectural change than W5-medium scope:
  1. Pure-fn files compile to EMPTY module.client.js in browser mode (no server.js, no body emission).
  2. SPEC §21.5 promises auto-detection of pure-fn files but the compiler currently has no per-file mode dispatch.
  3. Even simple `export function helper(x) { ... }` from a pure-fn file produces empty output in browser mode.
  4. The full F-AUTH-002 fix requires:
     a. Auto-detect pure-fn files → emit as library mode (Layer 2 — own dispatch W5a)
     b. Cross-file ?{} resolution + module-with-db-context impl (Layer 3 — own dispatch W5b, depends on W5a)
- [DELIVERABLE] W5 ships Layer 1 + SPEC contract direction. Layers 2/3 surface to supervisor.
