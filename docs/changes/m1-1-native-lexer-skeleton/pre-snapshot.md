# Pre-snapshot: m1-1-native-lexer-skeleton

Captured before any code changes. Baseline `bun test` state on branch
`changes/m1-1-native-lexer-skeleton` parented from `main` at `cfd4786`.

## Test suite baseline

```
15018 pass
121 skip
1 todo
3 fail
43379 expect() calls
Ran 15143 tests across 668 files. [43.92s]
```

## Known pre-existing failures (NOT regressions of this work)

1. `Bug 18 — scrml:NAME client imports do not emit as bare ES specifiers > §5 browser-runtime smoke`
   — list renders sorted with no console errors

(The summary reports 3 fail; only one was captured at the explicit `(fail)` line. The
other two are likely nested within suite output; they predate this dispatch and are
not caused by additions to `compiler/native-parser/`.)

## E2E compilation baseline

`bun run pretest` (samples/compilation-tests/dist) succeeds:
- 12 test samples compiled cleanly with a small number of `warning` lines on a few
  fixtures (no FAILs).

## Files this dispatch will TOUCH

- NEW: `compiler/native-parser/` directory (9 .scrml + 1 README files)
- NEW: `compiler/tests/parser-conformance-lexer.test.js`
- UNCHANGED (read-only): `compiler/src/`, `compiler/SPEC.md`, `compiler/self-host/`,
  `compiler/tests/parser-conformance/parsers.js` (per dispatch constraint — M4+ scope).

## Regression contract

The 3 pre-existing failures listed above MAY remain after this dispatch. Any NEW failure
is a regression and must be addressed before report-DONE.

## Tags

#scrmlts #m1-1 #native-parser #pre-snapshot #lexer

## Links

- [docs/changes/m1-1-native-lexer-skeleton/progress.md](./progress.md)
- [scrml-native-parser-design-2026-05-17.md](../../../../scrml-support/docs/deep-dives/scrml-native-parser-design-2026-05-17.md)
