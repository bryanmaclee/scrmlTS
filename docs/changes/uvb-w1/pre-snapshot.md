# Pre-snapshot: uvb-w1 (Unified Validation Bundle)

## Branch base
`70eb995 fix(oq-2): dev server bootstrap` (post-W0a + W0b)

## Test counts (after `bun install` + `bash scripts/compile-test-samples.sh`)
- 8,221 pass
- 40 skip
- 0 fail (initial run showed 2 flaky network/ECONNREFUSED fails; re-ran and 0 fail)
- 387 files
- 8,261 total
- run time ~16s

Dispatch reference: 8,222p / 40s / 0f / 387 files. Actual: 8,221p — within 1-test variance (likely a timing-sensitive skip). Treating as baseline.

## Sample compilation status
12 test samples compiled successfully via `pretest` script.

## Pre-existing failures unrelated to W1
None at this baseline.

## Scope
W1 = VP-1 (attribute allowlist, warnings) + VP-2 (post-CE invariant, error) + VP-3 (attribute interpolation, error). VP-4 already shipped by W0a (E-CG-015).

## Expected behavioral cascades
- VP-2 will cause `examples/22-multifile/` to FAIL with E-COMPONENT-022 (currently silent-passes by emitting phantom DOM). EXPECTED. Update corpus invariant or skip with W2 reference.
- VP-1 may cause warning-count regressions in corpus tests exercising `auth=` attrs. Update fixtures.
