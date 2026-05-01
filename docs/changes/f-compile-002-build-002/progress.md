# Progress: f-compile-002-build-002

Worktree branch: worktree-agent-aa8c40c8744a6c38d
Main HEAD at start: e69ecac (rebased onto)
Authorization scope: F-COMPILE-002 + F-BUILD-002 paired (T2-medium)

## Timeline

- [19:34] Started — pwd verified, rebased onto e69ecac. node_modules + dist symlinks/regen completed.
- [19:34] Pre-baseline confirmed: 8329 pass / 40 skip / 0 fail / 8369 tests across 395 files. Matches reported.
- [19:34] Sibling F-SQL-001 running in parser stages (BS/TAB/PA). Avoiding parser territory.
- [19:34] Beginning diagnosis phase — locate codegen import-rewrite + generateServerEntry.
- [19:35] Located both bug surfaces:
    - F-COMPILE-002: emit-server.ts:111-122 emits stmt.source verbatim (no .scrml rewrite); api.js:283 rewriteRelativeImportPaths only matches `.js` regex but mis-handles .server.js / .client.js (would relocate to source tree).
    - F-BUILD-002: build.js:200-209 generateServerEntry imports each module's exports under name → N copies of `_scrml_session_destroy`.
- [19:35] Confirmed F-COMPILE-002 reproducible: dispatch app `app.server.js` line 7-8 has `from "./models/auth.scrml"` and `from "./seeds.scrml"` verbatim.
- [19:36] Wrote pre-snapshot.md.
- [19:37] Pre-snapshot commit: `b0838ae WIP(f-compile-002+f-build-002): pre-snapshot — baseline 8329p/0f, repros captured`.
- [19:39] Wrote diagnosis.md with two-layer F-COMPILE-002 + F-BUILD-002 fix shapes.
- [19:40] Implemented F-COMPILE-002 fix:
    1. emit-server.ts:111-127 — added `.scrml` → `.server.js` rewrite, mirrors emit-client.ts.
    2. api.js:288-308 — extended docstring + added skip for `.server.js` / `.client.js` extensions in rewriter.
- [19:41] giti-009-import-rewrite.test.js: 16/16 pass (no regression on existing rewriter contract).
- [19:42] Diagnosis + F-COMPILE-002 commit: `32d0c02 WIP(f-compile-002+f-build-002): diagnosis — root cause for both bugs`.
- [19:43] Implemented F-BUILD-002 fix:
    1. build.js:198-222 — generateServerEntry tracks seenNames Set; first-importer-wins; empty modules emit no import line.
    2. build.js:224-247 — routes registry also de-duplicates by name.
- [19:44] build-adapters.test.js: 50/50 pass (no regression on existing entry generation contract).
- [19:44] F-BUILD-002 commit: `0b5695e WIP(f-build-002): generateServerEntry deduplication`.
- [19:46] Wrote integration tests:
    - tests/integration/f-compile-002-scrml-import-rewrite.test.js (8 tests).
    - tests/integration/f-build-002-server-entry-dedup.test.js (7 tests).
- [19:47] Integration tests: 8/8 + 7/7 pass.
- [19:48] Full bun test: 8344 pass / 40 skip / 0 fail (was 8329, +15 = 8 + 7 new tests; no regressions).
- [19:49] Tests commit: `2585a36 WIP(f-compile-002+f-build-002): integration tests`.
- [19:51] Updated SPEC.md (§47.10 Relative Import Path Rewrites; §47.11 Stdlib Bundling; §47.12 Server Entry Generation — Name De-duplication).
- [19:52] Updated examples/23-trucking-dispatch/FRICTION.md — both entries marked RESOLVED with paired-dispatch summary.
- [19:53] SPEC + FRICTION commit: `176de58 WIP(f-compile-002+f-build-002): SPEC + FRICTION updates`.
- [19:53] Smoke tests:
    - examples/22-multifile/app.scrml: client.js correctly imports `./types.client.js` and `./components.client.js` (regression: NO change, still works).
    - examples/23-trucking-dispatch dispatch app: app.server.js now has `from "./models/auth.server.js"` and `from "./seeds.server.js"` (was `.scrml` pre-fix).
    - Manual probe of generateServerEntry with 3 dispatch-shape modules (each exporting `_scrml_session_destroy`): single import, single route entry, node --check passes.

## Final state

- 7 commits on the worktree branch (4 WIP + final summary upcoming).
- `bun test`: 8344 pass / 40 skip / 0 fail (pre: 8329 / 0 / 0 → +15 new tests).
- F-COMPILE-002 dispatch-app smoke verified (app.server.js extension rewrites).
- F-BUILD-002 manual smoke verified (no SyntaxError; node --check passes).
- SPEC.md §47.10/47.11/47.12 added.
- FRICTION.md both entries RESOLVED.

## Decisions to surface

1. Chose F-BUILD-002 option (d) "skip duplicate-emit" per dispatch default. Option (a) namespace imports would require call-site rewrites at every `_scrml_session_destroy` reference; option (b) would require a new runtime canonical export; option (d) is local to generateServerEntry. Diagnosis.md documents the rationale.
2. Cross-file pure-helper emission (e.g. `auth.scrml` → empty `auth.client.js`) is OUT-OF-SCOPE of F-COMPILE-002. F-COMPILE-002 fixes the EXTENSION rewrite; that the imported file may still be missing exports is a separate bug visible in `examples/22-multifile/` (`types.client.js` and `components.client.js` are also empty). Flagged in FRICTION.md note.
3. emit-library.ts NOT modified. Library mode imports come from raw `await import()` source text (user-authored paths). Library is out-of-scope per diagnosis.

## No deep-dive requested

The diagnosis was self-contained; no walls hit.
