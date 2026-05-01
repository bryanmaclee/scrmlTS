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
