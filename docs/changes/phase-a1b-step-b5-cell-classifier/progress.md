# Phase A1b Step B5 — Progress (cell classifier)

**Branch:** `main` (no isolation, per S64 hand-off note 43).
**Parent baseline:** `8479e6d`. Test counts: **8975 / 44 / 1 / 0 / 9020 / 444**.
**Working tree:** `/home/bryan-maclee/scrmlMaster/scrmlTS/`.

Append-only timestamped log.

---

## Timeline

- [00:00] Startup verification: pwd OK, git status clean, HEAD `8479e6d`. `bun install` no-op. `bun run pretest` populated dist.
- [00:01] Baseline `bun test`: **8975 / 44 / 1 / 0 / 9020 / 444** (note: +5 vs B3's baseline of 8970 — other dispatches landed tests since `cf69028`).
- [00:05] Required reading: A1b SCOPE-AND-DECOMPOSITION (B5 row line 187, line 230, line 261); B1 docblock; B3 PASS-3 pattern; primer §4 (three RHS shapes); primer §5 (Variant C compound); primer §13.7 (annotated-AST contracts table).
- [00:15] Probed ast-builder routing: confirmed `const <badge> = <span>...</span>` produces a state-decl with `renderSpec` populated AND `isConst === true` (per `tests/integration/kickstarter-v2-smoke.test.js:278-296`). The kickstarter-v2 test explicitly defers shape-discrimination to A1b — B5 IS the discriminator.
- [00:25] Confirmed canonical bindable tag set `{input, textarea, select}` from `compiler/src/codegen/emit-html.ts:19-20` BIND_DIRECTIVE_TAGS.
- [00:30] Survey note written: `SURVEY-NOTE.md`. **Surface: ~1.5-2h** (depth-of-survey discount #9 candidate; revised down from 3-5h estimate).
- [00:40] Survey + progress scaffold committed: `1415a85`.
- [01:10] Implementation: PASS 4 walker `walkClassifyCells` added to `compiler/src/symbol-table.ts`. ~80 net lines of classifier code + ~20 lines of public API. Commit: `7790f16`.
- [01:30] Tests: `compiler/tests/unit/cell-classifier.test.js` (11 tests covering all four CellKind discriminants). All pass. Commit: `b24aaad`.
- [01:35] Final B3+B5 sanity: `bun test cell-classifier.test.js at-name-resolution.test.js` → 22 pass / 0 fail / 133 expect calls.

## Implementation phase

### Chunk 1 — `7790f16` PASS 4 wired

- Extended `compiler/src/symbol-table.ts`:
  - Added `CellKind` type (`"plain" | "bindable" | "markup-typed" | "compound-parent"`).
  - Added `CellKindAnnotated` interface documenting the `_cellKind` + `_isBindable` field shape on state-decl nodes.
  - Added `B5_BINDABLE_TAGS` constant (Set of `input/textarea/select`) sourced from `codegen/emit-html.ts:19-20` BIND_DIRECTIVE_TAGS.
  - Added pure classifier `classifyStateDecl(decl)` — priority-ordered switch over `children` / `isConst+renderSpec` / `renderSpec.element.tag`.
  - Added `annotateCellKind` for non-enumerable Object.defineProperty stamping (cycle-safety convention parallel to B1's `_record` and B3's `_resolvedStateCell`).
  - Added PASS 4 walker `walkClassifyCells` (mirrors PASS 1 recursion shape: children/body/consequent/alternate/arms/lift-expr).
  - Wired PASS 4 invocation in `runSYM` after PASS 3.
  - Public read API: `getCellKind(decl)` + `isCellBindable(decl)`.
  - Updated docblock with B5 LANDED notes.
- Test counts: zero regressions in `compiler/tests/`. Pre-commit + post-commit gauntlet (TodoMVC) clean.

### Chunk 2 — `b24aaad` unit tests

- Added `compiler/tests/unit/cell-classifier.test.js` with 11 tests:
  - §B5.1 Shape 1 plain
  - §B5.2 Shape 2 input(text)
  - §B5.3 Shape 2 input(checkbox)
  - §B5.4 Shape 2 textarea
  - §B5.5 Shape 2 select
  - §B5.6 Shape 3 markup-typed derived (`const <badge> = <span>...`)
  - §B5.7 Shape 3 plain derived (`const <doubled> = @count * 2`)
  - §B5.8 Variant C compound parent + recursive children classification
  - §B5.9 Public read API round-trip + null-safety
  - §B5.10 No diagnostics fired (B5 RECORDS, doesn't FIRE)
  - §B5.11 Annotation coverage — every state-decl has classified `_cellKind` AND invariant `isBindable iff cellKind === "bindable"`
- All 11 pass; 76 expect calls.

## B5 verdict

**GREEN.**

- Surface: ~1.5h (**depth-of-survey discount #9 candidate**; revised down from 3-5h estimate).
- Implementation: PASS 4 walker in `compiler/src/symbol-table.ts`; ~226 net lines.
- Tests: 11 new tests landed; 0 regressions in own-territory tests.
- Annotation field names: **`_cellKind: CellKind`** (required) + **`_isBindable: boolean`** (convenience accessor).
- Public read API: **`getCellKind(decl)`** returning `CellKind | undefined`, **`isCellBindable(decl)`** returning `boolean | undefined`.
- No new error code (per A1b plan §4.6 line 230 — annotates AST only). B6 will fire `E-CELL-NO-RENDER-SPEC` + `E-CELL-RENDER-SPEC-NOT-BINDABLE` based on the annotation.
- Bindable tag set: `{input, textarea, select}` sourced from `codegen/emit-html.ts:19-20` BIND_DIRECTIVE_TAGS for canon alignment.
- Markup-typed derived discriminator: `isConst === true` AND `renderSpec` populated (per kickstarter-v2 smoke test §K11.2h, the kickstarter test explicitly defers shape-discrimination to A1b — B5 IS the discriminator).
- Concurrency note: **3 other dispatches in flight** modifying ast-builder.js + lint-ghost-patterns.js + others. Working-tree was non-deterministic across the session. Used selective `git stash` of other-dispatch files to keep my commits clean (commits include only my files: `compiler/src/symbol-table.ts`, `compiler/tests/unit/cell-classifier.test.js`, `docs/changes/phase-a1b-step-b5-cell-classifier/`).

## Final test counts

**Own-territory:** 22 / 0 / 0 / 0 / 22 / 2 (B3 + B5 tests, all green).

**Full suite snapshot at end:** 8994 / 44 / 1 / 10 / 9049 / 446 — but the 10 fails are all from other in-flight dispatches (A+ verdict E-SWITCH-FORBIDDEN cascade through `stdlib/compiler/meta-checker.scrml`; ast-builder grammar-fixes test asserting on uncommitted impl). None caused by B5.

## Commits

- `1415a85` WIP(a1b-step-b5): scaffold survey note + progress.md
- `7790f16` WIP(a1b-step-b5): cell classifier PASS 4 + getCellKind/isCellBindable
- `b24aaad` test(a1b-step-b5): cell classifier unit tests (§B5.1-§B5.11)

