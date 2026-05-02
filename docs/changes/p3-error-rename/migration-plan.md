# Migration Plan: E-MACHINE-* → E-ENGINE-* (p3-error-rename)

**Source spec:** P3 dive §13.6 (`docs/deep-dives/p3-cross-file-inline-expansion-2026-05-02.md`,
line 926-930). T1-small. Mechanical paperwork.

## Scope

Rename all numeric error codes `E-MACHINE-NNN` to `E-ENGINE-NNN`, preserving NNN.

### Codes (20 total)

E-MACHINE-001, 003, 004, 005, 006, 007, 008, 009, 010, 011, 012, 013, 014, 015, 016, 017,
018, 019, 020, 021. (002 missing — documented gap.)

### Family glob

`E-MACHINE-*` → `E-ENGINE-*`. Two occurrences in SPEC.md (lines 557, 21096).

## NOT in scope

- `E-STATE-MACHINE-DIVERGENCE` — different code (state-local cross-check). 21 occurrences. KEEP.
- `machineName` internal identifiers (P3-RENAME's scope).
- `<machine>` keyword refs in worked examples (P3-SPEC-PAPERWORK's scope).
- `W-DEPRECATED-001` — different code. KEEP.

## Backwards compatibility

Per P3 dive §13.6 — error codes are diagnostic, not API. No external LSP/IDE surface
exposes `E-MACHINE-*` as a stable contract. Rename is acceptable as part of the engine
rename ratification (W-DEPRECATED-001 of `<machine>` keyword already lands the rename
posture).

## File inventory (38 files)

### compiler/src/ (5 files)
- compiler/src/ast-builder.js — 4 occurrences
- compiler/src/codegen/emit-machine-property-tests.ts — 11 occurrences
- compiler/src/codegen/emit-machines.ts — 13 occurrences
- compiler/src/codegen/index.ts — 1 occurrence
- compiler/src/type-system.ts — 96 occurrences (highest concentration)

### compiler/SPEC.md (1 file)
- compiler/SPEC.md — 110 occurrences (numeric + 2 glob)

### compiler/tests/ (29 files)
- compiler/tests/conformance/s32-fn-state-machine/REGISTRY.md — 1 occurrence
- compiler/tests/conformance/s32-fn-state-machine/s51-machine-cross-check.test.js — 21 occurrences (most are E-STATE-MACHINE — keep)
- compiler/tests/integration/p3b-engine-for-importedtype-cross-file.test.js — 6 occurrences
- compiler/tests/unit/enum-transitions.test.js — 4 occurrences
- compiler/tests/unit/gauntlet-s20/machine-or-alternation.test.js — 5 occurrences
- compiler/tests/unit/gauntlet-s22/derived-machines.test.js — 25 occurrences
- compiler/tests/unit/gauntlet-s22/machine-payload-binding.test.js — 12 occurrences
- compiler/tests/unit/gauntlet-s24/machine-audit-clause.test.js — 7 occurrences
- compiler/tests/unit/gauntlet-s24/machine-in-enum-transitions.test.js — 4 occurrences
- compiler/tests/unit/gauntlet-s25/machine-opener-attribute-form.test.js — 5 occurrences
- compiler/tests/unit/gauntlet-s25/machine-temporal-transitions.test.js — 5 occurrences
- compiler/tests/unit/gauntlet-s26/machine-property-tests.test.js — 2 occurrences
- compiler/tests/unit/gauntlet-s26/machine-property-tests-phase2.test.js — 1 occurrence
- compiler/tests/unit/gauntlet-s26/machine-property-tests-phase6.test.js — 1 occurrence
- compiler/tests/unit/gauntlet-s27/effect-body-reactive-refs.test.js — 1 occurrence
- compiler/tests/unit/gauntlet-s27/guarded-wildcard-rules.test.js — 6 occurrences
- compiler/tests/unit/gauntlet-s27/replay-primitive.test.js — 1 occurrence
- compiler/tests/unit/gauntlet-s27/unit-variant-transition-regression.test.js — 5 occurrences
- compiler/tests/unit/gauntlet-s28/elision-cat-2a-2b.test.js — 3 occurrences
- compiler/tests/unit/gauntlet-s28/elision-slice-2-3-4.test.js — 9 occurrences
- compiler/tests/unit/gauntlet-s28/payload-enum-comma-split.test.js — 1 occurrence
- compiler/tests/unit/machine-codegen.test.js — 1 occurrence
- compiler/tests/unit/machine-declarations.test.js — 26 occurrences
- compiler/tests/unit/machine-guards-integration.test.js — 9 occurrences
- compiler/tests/unit/machine-types.test.js — 19 occurrences
- compiler/tests/unit/p3b-engine-for-localtype-regression.test.js — 1 occurrence
- compiler/tests/unit/p3b-machine-for-importedtype-deprecated.test.js — 4 occurrences

### examples/ (2 files)
- examples/14-mario-state-machine.scrml — 1 occurrence (in spec/comment)
- examples/23-trucking-dispatch/FRICTION.md — 2 occurrences

## Replacement strategy

Single sed-style replacement per file: `E-MACHINE-` → `E-ENGINE-` (where followed by a digit).
The bare/glob `E-MACHINE-*` lines also flip to `E-ENGINE-*`. The `E-STATE-MACHINE-DIVERGENCE`
substring is unaffected because its leading prefix is `E-STATE-MACHINE-`, not `E-MACHINE-`.

Group commits by area:
1. compiler/src/ (one commit)
2. compiler/SPEC.md (one commit)
3. compiler/tests/ (one or two commits)
4. examples/ (one commit)
5. Final summary commit
