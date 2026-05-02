# Progress: doc-e-rename

T1-small. Refresh user-facing docs to use `E-ENGINE-*` per P3-ERROR-RENAME mechanical paperwork.

## Plan

Rename `E-MACHINE-NNN` → `E-ENGINE-NNN` in 4 user-facing files. Use negative-lookbehind regex
`(?<![A-Za-z0-9])E-MACHINE-` → `E-ENGINE-` (preserves `E-STATE-MACHINE-`).

Discovery counts:
- `docs/tutorial.md`: 3 occurrences (E-MACHINE-004, E-MACHINE-017 ×2) — numeric, rename
- `docs/articles/mutability-contracts-devto-2026-04-29.md`: 2 (E-MACHINE-001, E-MACHINE-001-RT) — numeric, rename
- `docs/tutorial-snippets/02l-derived-machine.scrml`: 1 (E-MACHINE-017) — numeric, rename
- `compiler/SPEC-INDEX.md`: 1 (`E-MACHINE-DIVERGENCE` — descriptive shorthand for
  `E-STATE-MACHINE-DIVERGENCE`, NOT a numeric code; per dispatch, leave unchanged)

Expected total: 6 numeric-code renames across 3 files (SPEC-INDEX.md unchanged).

Tests baseline (pre-commit hook subset): 7826 pass / 30 skip / 0 fail / 397 files (verified per commit).
(Doc-only change — tests unaffected.)

## SPEC-INDEX.md investigation

Line 53 references `E-MACHINE-DIVERGENCE` in a list of S32 error codes. Verified canonical
name in SPEC.md is `E-STATE-MACHINE-DIVERGENCE` (defined in §51.15.4, with multiple
occurrences in §51 around state machine consistency checks). The SPEC-INDEX.md reference is
a typo/abbreviation, not the canonical numeric form. Per dispatch:
> "rename only if it's the numeric form, NOT if it's the descriptive STATE-MACHINE form"

Decision: leave `E-MACHINE-DIVERGENCE` as-is in SPEC-INDEX.md. It is a descriptive
shorthand reference to a canonical `E-STATE-MACHINE-DIVERGENCE` error code. Both the
mechanical regex `(?<![A-Za-z0-9])E-MACHINE-` AND the dispatch's stricter "numeric form
only" guidance instruct against renaming non-numeric forms. (A separate cleanup could
correct the typo to `E-STATE-MACHINE-DIVERGENCE` for canonical consistency, but that is
out of scope for this T1 mechanical refresh.)

## Steps

- [start] Branch `changes/doc-e-rename` created from main 5c8eab0.
- [step 1] Plan + baseline progress.md committed (ee9f74b).
- [step 2] docs/tutorial.md — 3 renames committed (6ad27a4).
- [step 3] docs/articles/mutability-contracts-devto-2026-04-29.md — 2 renames committed (0bc2ad0).
- [step 4] docs/tutorial-snippets/02l-derived-machine.scrml — 1 rename committed (92728a2).
- [step 5] SPEC-INDEX.md — investigated; preserved (descriptive shorthand, not numeric).
- [step 6] Final summary commit pending.

## Final acceptance

- Pre-commit hook passes at every commit (7826/30/0 stable across 4 commits).
- 6 occurrences renamed across 3 files.
- 1 occurrence preserved in SPEC-INDEX.md (with rationale documented).
- Worktree clean.
- Branch FF-mergeable to main (5c8eab0).
