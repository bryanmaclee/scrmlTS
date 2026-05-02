# Progress: doc-e-rename

T1-small. Refresh user-facing docs to use `E-ENGINE-*` per P3-ERROR-RENAME mechanical paperwork.

## Plan

Rename `E-MACHINE-NNN` → `E-ENGINE-NNN` in 4 user-facing files. Use negative-lookbehind regex
`(?<![A-Za-z0-9])E-MACHINE-` → `E-ENGINE-` (preserves `E-STATE-MACHINE-`).

Discovery counts:
- `docs/tutorial.md`: 3 occurrences (E-MACHINE-004, E-MACHINE-017 ×2)
- `docs/articles/mutability-contracts-devto-2026-04-29.md`: 2 (E-MACHINE-001, E-MACHINE-001-RT)
- `docs/tutorial-snippets/02l-derived-machine.scrml`: 1 (E-MACHINE-017)
- `compiler/SPEC-INDEX.md`: 1 (`E-MACHINE-DIVERGENCE` — descriptive shorthand for
  `E-STATE-MACHINE-DIVERGENCE`, NOT a numeric code; per dispatch, leave unchanged)

Expected total: 6 numeric-code renames across 3 files (SPEC-INDEX.md unchanged).

Tests baseline (pre-change): 1457 pass / 8 skip / 458 fail / 321 errors / 425 files.
(Doc-only change — tests should be unaffected.)

## Steps

- [HH:MM] Branch `changes/doc-e-rename` created from main 5c8eab0.
