# Progress: p3-error-rename

T1-small mechanical paperwork. P3 dive §13.6: rename `E-MACHINE-NNN` (20 codes) → `E-ENGINE-NNN`.

- [13:40] Started — branch `changes/p3-error-rename` created from main (HEAD=9123b4d)
- [13:40] Baseline established: 8551 pass / 0 fail / 40 skip / 425 files (after `bun install` + sample compile)
- [13:40] Inventory complete:
  - 363 numeric `E-MACHINE-NNN` occurrences (across 38 files)
  - 2 `E-MACHINE-*` glob references (SPEC.md only)
  - 21 `E-STATE-MACHINE-DIVERGENCE` occurrences — DIFFERENT code, NOT in scope
  - Total replacements planned: 365 occurrences in 38 files
  - 20 unique codes confirmed: 001, 003-021 (002 missing as documented)
  - No external API surface (LSP / IDE) exposes E-MACHINE-* — diagnostic only
