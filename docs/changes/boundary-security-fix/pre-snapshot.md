# Pre-Snapshot: boundary-security-fix

Captured: 2026-04-24, before any code changes.

## Test Baseline

```
 7476 pass
 40 skip
 0 fail
 27035 expect() calls
Ran 7516 tests across 347 files. [11.33s]
```

## Known Pre-existing Issues

- 40 skipped tests (stable, not regressions)
- 0 failures at baseline (previously reported 2 self-host parity failures appear resolved)

## E2E Compilation State

Not yet captured — will be recorded if E2E samples are run during implementation.

## Bug J Status

Bug J reproducer exists at `handOffs/incoming/2026-04-22-0940-bugJ-markup-interp-helper-fn-hides-reactive.scrml`. Currently compiles but produces incorrect display-wiring: helper function calls like `${upperOf(getMsg())}` and `${record().text}` do not get reactive effect wiring because `extractReactiveDeps` does not recurse into function bodies.

## Tags
#boundary-security-fix #pre-snapshot #baseline

## Links
- [impact-analysis](./impact-analysis.md)
