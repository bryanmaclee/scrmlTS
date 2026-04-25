# Pre-Snapshot — fix-bs-string-aware-brace-counter

**Recorded:** 2026-04-25
**Baseline SHA:** 205602d (from main); branch `changes/fix-bs-string-aware-brace-counter` forked at 205602d.
**Tier:** T2 (Standard)

## Test baseline (per intake, not re-run prior to changes)

- **bun test** (compiler): 7,825 pass / 40 skip / 0 fail / 370 files
- Established at 205602d; intake confirms.

## Sidecar reproducer behavior at baseline

`handOffs/incoming/read/2026-04-25-0155-bug-l-bs-unbalanced-brace-in-string.scrml` compiles with:
```
Errors: 2
  [BS] E-CTX-003: Unclosed 'logic' (line 31, col 1)
  [BS] E-CTX-003: Unclosed 'program' (line 29, col 1)
Warnings: 1 (W-PROGRAM-001)
```
Verified via `bun compiler/src/index.js <sidecar>` from main checkout — matches intake expectation exactly.

## Pre-existing limitations / known acceptable failures

`compiler/tests/unit/block-splitter.test.js:1200-1210` documents the long-string limitation as
acceptable ("escaped quote followed by brace in long string is a known limitation").
Approach B is expected to upgrade this test to a positive assertion (no errors) — that change
is the visible behavioral improvement we are shipping.

## In-scope

- `compiler/src/block-splitter.js` brace-in-string detection (lines 646-669 today).
- `compiler/tests/unit/block-splitter.test.js` regression tests under
  `BS-BRACE-IN-STRING` describe block.
- `compiler/self-host/bs.scrml` if the JS fix is mechanically mirrorable; otherwise
  follow-up intake.

## Out-of-scope (deferred)

- Regex literal handling (`/.../`) — too ambiguous to reliably distinguish from division.
- Template strings (backtick) inside non-meta brace contexts — meta already has its own
  tracker; logic/sql/css would require duplication and the JS tokenizer downstream handles
  template-string brace state correctly there.
- Pushing string-awareness to TAB (Approach C).
- `//` line comment suppression at line 516 incorrectly fires inside strings inside brace
  contexts — adjacent issue; would warrant its own intake if/when it bites.

## Tags
#pre-snapshot #fix-bs-string-aware-brace-counter #t2

## Links
- intake: `docs/changes/fix-bs-string-aware-brace-counter/intake.md`
- sidecar: `handOffs/incoming/read/2026-04-25-0155-bug-l-bs-unbalanced-brace-in-string.scrml`
- bug report: `handOffs/incoming/read/2026-04-25-0155-6nz-to-scrmlTS-bug-l-bs-unbalanced-brace-in-string.md`
