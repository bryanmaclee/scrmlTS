# Progress: p3.b

- [09:30] Started — startup verification passed (worktree clean, HEAD eb0ec11), branch changes/p3.b created
- [09:32] Read P3 deep-dive in full (1029 lines), confirmed P3.B scope and code anchors
- [09:35] Read code anchors: ast-builder.js export path (4326-4394), type-decl path (4396-4468), api.js cross-file seeding (740-803), type-system.ts processFile (7625-7654), TypeDeclNode in types/ast.ts (838+)
- [09:37] Confirmed E-MACHINE-004 misleading message at type-system.ts:2005 + SPEC.md:18310
- [09:40] Installed bun packages; ran pretest; baseline test count confirmed: 8491 pass / 40 skip / 0 fail / 412 files
- [09:42] Wrote pre-snapshot artifact
- [09:45] Next: write diagnosis artifact + verify the bug shape with a TAB-level test

---
## CHECKPOINT — 2026-05-02 (continuation dispatch enters)

### Completed by primary dispatch
- TAB type-decl synthesis fix landed in compiler/src/ast-builder.js (+90 LOC) — commit 280dab1
- Diagnosis artifact written — commit f20e2c9
- Tests landed across 4 commits (280dab1, 91a991c, 1c1d7ac, 9b3a8d1, 20e15e7):
  - type-decl synthesis tests across 4 type kinds
  - local-type regression pinning
  - cross-file engine `for=ImportedType` integration
  - `<machine for=ImportedType>` deprecated-keyword + W-DEPRECATED-001
- Final primary commit: 20e15e7 (tests for `<machine for=ImportedType>`)
- Final test count after primary: 8512 pass / 40 skip / 0 fail / 416 files (+21, 0 regressions)
- F-ENGINE-001 mechanically closed at the compiler layer

### Why a continuation was needed
- Primary dispatch hit ECONNRESET after 110 tool uses; the compiler fix landed but the SPEC + PIPELINE paperwork and the dispatch-app workaround removal did not.
- progress log was not updated after 09:45 by the primary; commit log is the authoritative trail of work landed.

### Remaining (this continuation's scope)
1. SPEC §51.3.2 message correction + §51.16 (NEW) cross-file engine subsection + §21.2 normative + PIPELINE Stage 3 amendment.
2. Adopter integration — pages/driver/hos.scrml workaround removal + FRICTION update.
3. Final progress log + summary commit.

---
## CONTINUATION — 2026-05-02

- [continuation:t0] Startup verification passed (worktree clean, HEAD 20e15e7, branch changes/p3.b).
- [continuation:t0+1m] Re-ran bun test from worktree: confirmed 8512 pass / 40 skip / 0 fail / 416 files baseline at HEAD 20e15e7.
- [continuation:t0+5m] Read P3 deep dive §3.1, §5, §6.5, §11.2 to confirm SPEC amendment scope.
- [continuation:t0+10m] Located E-MACHINE-004 emission at type-system.ts:1999-2009; located §51.3.2 normative bullet at SPEC.md:18305-18311; located §52 boundary for §51.16 insertion at SPEC.md:19694; located Stage 3 invariants in PIPELINE.md:435-445.
- [continuation:t0+15m] Wrote /tmp/fix_emachine_msg.py — patched type-system.ts E-MACHINE-004 message to reference `${ import { Type } from './path.scrml' }` rather than the misleading `use` form. Initial Python edit produced double-backslash escape in the template literal; second-pass byte-level fix applied 0x5c5c60 -> 0x5c60 (unescape one backslash per occurrence, 4 instances).
- [continuation:t0+18m] Ran type-system unit tests: 234 pass / 0 fail. Template literal well-formed.
- [continuation:t0+20m] Wrote /tmp/spec_51_3_2.py — replaced misleading `use` reference in §51.3.2 normative bullet; cross-references §51.16.
- [continuation:t0+25m] Wrote /tmp/spec_21_2.py — added new normative bullet to §21.2 specifying that `export type X:kind = {...}` SHALL produce both `type-decl` and `export-decl` AST nodes; mirrors `export function`.
- [continuation:t0+30m] Wrote /tmp/spec_51_16.py — inserted new §51.16 (Cross-File Type Resolution for `<engine for=ImportedType>`) before the §52 horizontal rule. New section covers: motivation, mechanism, worked example, deprecated-keyword interaction, NameRes shadow-mode interaction, normative statements.
- [continuation:t0+35m] Wrote /tmp/pipeline_stage3.py — added Amendment 7 (P3.B) to Stage 3 invariants list + bumped PIPELINE.md to version 0.6.1 with corresponding change-log entry.
- [continuation:t0+40m] Ran full bun test: 8512 pass / 40 skip / 0 fail / 416 files. 0 regressions from SPEC/PIPELINE changes.
- [continuation:t0+42m] Next: commit SPEC + PIPELINE amendments (single commit), then move to adopter integration.
- [continuation:t0+45m] SPEC commit landed — 57c7093.
- [continuation:t0+50m] Located dispatch-app workaround in examples/23-trucking-dispatch/pages/driver/hos.scrml lines 44-53 (local DriverStatus enum block) and FRICTION comment block lines 23-28.
- [continuation:t0+52m] Verified canonical DriverStatus is exported from schema.scrml:44 (`export type DriverStatus:enum = { OffDuty OnDuty Driving SleeperBerth }`); shape identical to local re-declaration.
- [continuation:t0+55m] Wrote /tmp/hos_workaround_remove.py — replaced local type block with `${ import { DriverStatus } from "../../schema.scrml" }`; updated FRICTION comment block at top of file to reflect resolution.
- [continuation:t0+58m] Verified workaround removal: compiled hos.scrml directly via CLI. Same 4 errors as pre-change baseline (all F-NULL-001 / pre-existing `null` literals throughout the file). NO E-MACHINE-004 — engine cross-file resolution works. Pre-existing F-NULL-001 errors are documented in FRICTION but NOT what P3.B promised to close; their persistence is not a regression.
- [continuation:t0+60m] Ran integration test tests/integration/p3b-engine-for-importedtype-cross-file.test.js: 4/4 pass.
- [continuation:t0+62m] Ran full bun test: 8512 pass / 40 skip / 0 fail / 416 files. 0 regressions.
- [continuation:t0+65m] Wrote /tmp/friction_update.py — marked F-ENGINE-001 RESOLVED in dispatch-app FRICTION.md (header status block + master-list entry near line 2167). Removed redundant horizontal rule that was orphaned by the new resolution heading.
- [continuation:t0+68m] Ready to commit adopter integration (FRICTION + hos.scrml).
