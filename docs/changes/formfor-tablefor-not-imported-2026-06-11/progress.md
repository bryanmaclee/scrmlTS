# Progress — formfor-tablefor-not-imported-2026-06-11

Append-only, timestamped. Dev: scrml-js-codegen-engineer.

## 2026-06-11 — startup
- Worktree verified: /home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-adb85cfb37d29495c
- Merged main (065fa06c -> 62aa8870 fast-forward); engine-effect-diagnostics + maps present.
- bun install + bun run pretest OK.
- Read primary.map + SCOPE doc + engine-effect test (template) + SPEC §41.14/§41.16/§34 rows + the two walkers' recursion shape.
- Root seam confirmed: type-system.ts ~7257 (after formFor walker) + ~7389 (after tableFor walker). Walkers descend children/body/bodyChildren/armBodyChildren and match tag/tagName === "formFor"|"formfor" (resp "tableFor"|"tablefor"). Detection scan will mirror that exact descent so the gate-detection is the mirror image of the expansion-gate.

## 2026-06-11 — type-system scan + coupled fixture fix
- Added scanForUnimportedTypeDataElement (type-system.ts ~15829) + the two else-arm
  call-sites (~7270 formFor, ~7420 tableFor). Mirrors the expansion-walker descent.
- R26 smoke: ff-bad + tf-bad both exit 1 with the right code; ff-good + tableFor-basic
  + examples/27 + ex27 all exit 0 with no *-NOT-IMPORTED and expansion intact.
- COUPLED FIXTURE FIX: compiler/tests/unit/builtin-types-date-timestamp.test.js §3
  ("tableFor over Event ... compiles") used `<tableFor>` WITHOUT the import and asserted
  errors === []. Pre-S183 that relied on the silent-pass bug. Added
  `import { tableFor } from 'scrml:data'` to the fixture (mirrors the adjacent §4
  schemaFor test which DOES import). This is the SOLE test relying on the bug; the
  SCOPE doc's "corpus impact ZERO" covered samples/+examples/ but not test fixtures.
- Full unit+integration+conformance suite: 16697 pass / 0 fail after the fix.

## 2026-06-11 — SPEC edits
- §34: +2 rows (E-FORMFOR-NOT-IMPORTED @16963 in E-FORMFOR-* block; E-TABLEFOR-NOT-IMPORTED
  @16985 in E-TABLEFOR-* block). Both Error.
- §41.14.1: +normative bullet (formFor SHALL be imported; unimported → E-FORMFOR-NOT-IMPORTED).
- §41.16.1: +symmetric normative bullet (tableFor).
- §41.14.11 + §41.16 cross-ref §34 enumerations: appended the two new codes.

## 2026-06-11 — new test file
- compiler/tests/unit/formfor-tablefor-not-imported.test.js (6 tests, all pass):
  formFor-no-import fires; tableFor-no-import fires; two-formFor fan-out (2 errors);
  canonical formFor+import → no error + data-scrml-formfor; canonical tableFor+import
  → no error + data-scrml-tablefor; import-one-use-other → the missing one fires.
- Cross-stream allDiags helper used (Errors land in result.errors; helper is robust).

## 2026-06-11 — DONE
- Final gate (unit+integration+conformance): 16612 pass / 90 skip / 0 fail (902 files). +6 from new tests.
- R26 verified: ff-bad + tf-bad exit 1 with right codes; ff-good + tf-good exit 0, no code, expansion emitted
  (data-scrml-formfor / data-scrml-tablefor); corpus tableFor-basic.scrml + examples/27-type-derived-table.scrml
  both exit 0 clean.
- Tree clean. 3 commits ahead of main, branch tip == HEAD.
