# Progress: p3-spec-paperwork

- [start] Branch `changes/p3-spec-paperwork` created from `9123b4d` (S53 main tip).
- [start] Inventory complete: 86 occurrences in compiler/SPEC.md.
- [start] migration-plan.md written: 20 REPLACE / 66 KEEP.
- [start] Baseline `bun test` (pre-commit hook scope: unit + integration + conformance, no browser): 7826 pass / 30 skip / 0 fail / 7856 tests / 397 files.
- [classification] Conservative skip list documented: ~66 occurrences are normative concept text, deprecation policy, error-message templates, grammar rules, and section headings.
- [batch-1] §51.3.x worked examples — 10 replacements. `bun test`: 7826 / 30 / 0. Lines 18364, 18465, 18492, 18541, 18656, 18663, 18770, 18789, 18798, 18805. Commit 802fed8.
- [batch-2] §51.9 derived/projection examples — 3 replacements. `bun test`: 7826 / 30 / 0. Lines 19085, 19172, 19180. Commit f4b5fad.
- [batch-3] §51.11 audit / §51.12 temporal / §51.14 replay worked examples — 3 replacements. `bun test`: 7826 / 30 / 0. Lines 19264, 19456, 19734. Commit f6885a3.
- [batch-4] §51.15 state-local case examples — 2 replacements. `bun test`: 7826 / 30 / 0. Lines 19891, 19912. Commit 51fb9e2.
- [batch-5] §53.8 worked example — 1 replacement. `bun test`: 7826 / 30 / 0. Line 21082. **Note:** line 20623 (closed-attribute-set list) was originally planned REPLACE but reversed during execution to KEEP because the list explicitly cross-references `compiler/src/attribute-registry.js`, which still uses the `"machine"` internal key (per P1 bounded-blast-radius preservation, line 18422 in SPEC). See migration-plan.md per-occurrence table for full rationale.
- [final] **Total replacements: 19** (down from 20-planned). **Total kept: 67** (up from 66-planned). All 5 batches committed. Zero regressions throughout.
- [final] Final occurrence count in compiler/SPEC.md: 67 `<machine>` references (all KEEP-classified), 33 `<engine>` references (canonical).
