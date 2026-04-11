# Anomaly Report: library-mode-types

## Summary

The library-mode type declaration bug (R18 #2) was already fixed in `emit-library.ts` before
this session began. The fix was in place but unconfirmed and not marked resolved in the R18
report. This session verified the fix, added an integration regression test, and added a
sample file.

## Test Behavior Changes

### Expected
- `emit-library §9`: All 5 whole-block path tests pass — the regex correctly strips
  `type Name:kind = { ... }` declarations. These tests were present before this session
  and were already passing.
- `library-mode-types §1-§4` (NEW): 10 new integration tests added. All pass. These
  include a `node --check` test that confirms the output is syntactically valid JS.

### Unexpected (Anomalies)

None detected.

## E2E Output Changes

### Expected
- `samples/compilation-tests/library-mode-types.scrml` (NEW): Added as the required
  regression sample. Compiles cleanly in library mode (confirmed via API-level integration
  test).

### Unexpected (Anomalies)

None detected.

## New Warnings or Errors

None.

## Files Changed (additive only — no source code modified)

1. `compiler/tests/commands/library-mode-types.test.js` — NEW: 10 integration tests
   (4 sections: §1 no raw type syntax, §2 node --check, §3 exports survive, §4 no runtime)
2. `samples/compilation-tests/library-mode-types.scrml` — NEW: regression sample file
3. `docs/changes/library-mode-types/pre-snapshot.md` — NEW: pre-snapshot artifact
4. `docs/changes/library-mode-types/progress.md` — NEW: progress log
5. `docs/changes/library-mode-types/anomaly-report.md` — THIS FILE

## Test Results

Before adding new test file:
- 5,591 pass, 2 skip, 0 fail (with --timeout 30000)

After adding new test file:
- 5,601 pass, 2 skip, 0 fail (10 new tests added, all pass)

No regressions introduced.

## Root Cause Analysis

The R18 #2 bug was caused by the whole-block extraction path in `generateLibraryJs()`
emitting the raw source text of the `${ ... }` logic block without stripping scrml type
declaration syntax. The regex fix on line 160 of `emit-library.ts`:

```js
blockText = blockText.replace(
  /\btype\s+[A-Za-z_$][A-Za-z0-9_$]*(?:\s*:\s*\w+)?\s*=\s*\{[^]*?\}/g,
  ""
);
```

correctly strips both forms:
- Enum: `type HttpMethod:enum = { GET | POST | PUT | DELETE | PATCH }`
- Struct: `type ApiEndpoint:struct = { path: string, ... }`

The fix was present in `emit-library.ts` before this session. The R18 report was not updated
to reflect this. This session provides the integration test and sample file that confirm the
fix works end-to-end.

## Anomaly Count: 0

## Status: CLEAR FOR MERGE

## Tags
#library-mode #anomaly-report #gauntlet-r18 #type-codegen

## Links
- [progress.md](./progress.md)
- [pre-snapshot.md](./pre-snapshot.md)
- [emit-library.ts](/home/bryan-maclee/scrmlMaster/scrmlTS/compiler/src/codegen/emit-library.ts)
- [gauntlet-r18-report.md](/home/bryan-maclee/scrmlMaster/scrmlTS/compiler-support/docs/gauntlets/gauntlet-r18-report.md)
