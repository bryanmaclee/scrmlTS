# Progress: p3-error-rename

T1-small mechanical paperwork. P3 dive §13.6: rename `E-MACHINE-NNN` (20 codes) → `E-ENGINE-NNN`.

- [13:40] Started — branch `changes/p3-error-rename` created from main (HEAD=9123b4d)
- [13:40] Baseline established: 8551 pass / 0 fail / 40 skip / 425 files (after `bun install` + sample compile)
- [13:40] Inventory complete:
  - 363 numeric `E-MACHINE-NNN` occurrences (across 38 files)
  - 2 `E-MACHINE-*` glob references (SPEC.md only)
  - 21 `E-STATE-MACHINE-DIVERGENCE` occurrences — DIFFERENT code, NOT in scope (preserved)
  - 20 unique codes confirmed: 001, 003-021 (002 missing as documented)
  - No external API surface (LSP / IDE) exposes E-MACHINE-* — diagnostic only
- [13:42] Renamed compiler/src/ — 5 files modified:
  - ast-builder.js: 4 codes
  - codegen/emit-machine-property-tests.ts: 10 codes (including E-ENGINE-001-RT runtime suffix)
  - codegen/emit-machines.ts: 12 codes
  - codegen/index.ts: 1 code
  - type-system.ts: 75 codes
- [13:45] CRITICAL FINDING: naive `s/E-MACHINE-/E-ENGINE-/g` matches inside
  `E-STATE-MACHINE-DIVERGENCE` (because `E-STATE-` ends in `E` and is followed by `-MACHINE-`).
  Reverted SPEC.md and adopted negative-lookbehind regex `(?<![A-Za-z0-9])E-MACHINE-`.
  Confirmed src files were not affected (no `E-STATE-MACHINE` in compiler/src/).
- [13:46] Renamed compiler/SPEC.md — 91 codes (preserved 6 `E-STATE-MACHINE-DIVERGENCE`).
  Also renamed 2 `E-MACHINE-*` glob references to `E-ENGINE-*`.
- [13:48] Renamed 26 test files — 169 occurrences total. Test fixtures asserting
  `e.code === "E-MACHINE-NNN"` now assert against `"E-ENGINE-NNN"`. Conformance test file
  `compiler/tests/conformance/s32-fn-state-machine/s51-machine-cross-check.test.js` correctly
  preserves all 14 `E-STATE-MACHINE-DIVERGENCE` while renaming 7 numeric refs.
- [13:48] Renamed 2 example files — 3 codes total.

## Deferred — out of prompt scope (T1-small `compiler/src/ + SPEC.md + compiler/tests/ + examples/`)

The following files contain `E-MACHINE-` references but are NOT in the prompt scope.
They should be addressed as a follow-up paperwork dispatch:

- `docs/tutorial.md` (3 occurrences) — user-facing tutorial references E-MACHINE-004, E-MACHINE-017
- `docs/changelog.md` — historical references
- `docs/articles/mutability-contracts-devto-2026-04-29.md` — published article
- `docs/tutorial-snippets/02l-derived-machine.scrml` — tutorial code sample
- `compiler/SPEC-INDEX.md` — index of SPEC sections (line 53 also has `E-MACHINE-DIVERGENCE`
  shorthand for E-STATE-MACHINE-DIVERGENCE — needs investigation; not a numeric code)
- `hand-off.md` (current handoff) — references codes
- `handOffs/hand-off-22.md`, `-23.md`, `-25.md`, `-26.md`, `-27.md`, `-28.md`, `-29.md`,
  `-32.md`, `-33.md`, `-54.md` — historical session logs (recommend KEEP — archives reflect
  what was emitted at that time)
- `docs/changes/p2/progress.md`, `p1/progress.md`, `p1.e/progress.md`, `p3.b/progress.md`,
  `p3.b/pre-snapshot.md`, `p3.b/diagnosis.md`, `dispatch-app-m3/progress.md` — historical
  change archives (recommend KEEP)

Recommendation: a follow-up T1 dispatch to update user-facing docs (tutorial.md, changelog.md,
articles, tutorial-snippets) + SPEC-INDEX.md. Historical handoffs and progress files should
remain as-is per "archives reflect what was emitted at that time" principle.
