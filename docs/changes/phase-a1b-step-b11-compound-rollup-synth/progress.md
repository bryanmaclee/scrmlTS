# Phase A1b Step B11 — Auto-synthesized validity surface (compound rollup) — progress

## Session log (append-only)

- **2026-05-07 T0** — Worktree verified: `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a645aae70da1b8387`. `git status --short` clean. `bun install` ran (114 packages installed; lockfile updated). `bun run pretest` ran (12 samples compiled). Baseline `bun run test`: **9241 / 54 / 1 / 0** matches S67 close.
  - Note: a re-run on first attempt showed 2 failures, then 0 failures on re-run; appears flake-prone. Stable 0-fail baseline confirmed on subsequent runs.

- **2026-05-07 T1** — Read full audit `docs/audits/a1b-b11-rule4-audit-2026-05-07.md`. Read SPEC §55.5 / §55.6 / §55.7 / §55.13 / §55.14 / §55.15 (canonical compound-rollup spec). Verified `E-SYNTHESIZED-WRITE` row exists in §34 catalog at `compiler/SPEC.md` line 14218 — no spec amendment required.

- **2026-05-07 T2** — Read primer §13.7 (B7/B8 specifics blocks) — confirmed integration points. Read existing infra (`compiler/src/symbol-table.ts`, `dependency-graph.ts`, `validator-arg-parser.ts`).

- **2026-05-07 T3** — Phase 0 survey written. See `SURVEY.md`. **Key finding:** B11 emits NO new DG edges (per finding (c)) — B10 Phase 3 already wired cross-field `validator-reads` edges; rollup edges are A1c codegen materializations from the synth-record annotations. Net B11 surface: PASS 8 (synth registration) + PASS 6 extension (E-SYNTHESIZED-WRITE join) + tests. Estimate revised: 5-6h actual.

- **2026-05-07 T4** — WIP commit `55df164` — Phase 0 survey + progress.md scaffolding.

- **2026-05-07 T5** — Implementation. Extended `StateCellRecord` with `isSynthesized`, `synthProperty`, `parentCompound`, `runtimeHookKind` fields. Added `SynthProperty` type, `SYNTH_PROPERTY_NAMES` set, `COMPOUND_SYNTH_PROPERTIES` array exports. Implemented `walkRegisterSynthSurface` (PASS 8), `registerCompoundSynthSurface`, `makeSynthRecord`. Wired PASS 8 into `runSYM` after PASS 5. Extended B8's PASS 6 walker (`checkExprNodeForMutations` + `checkReactiveNestedAssign`) with synth-write check (calls `checkSynthAssignFire` / `checkSynthNestedAssignFire` first; short-circuits derived-mutate fire when synth fires). Added public read APIs: `isSynthesizedCell`, `getSynthRecords`. Updated existing tests `§B1.13` (empty compound now has 4 synth cells) and `§B1.15` (re-entrancy uses non-synth name now that B11 owns the synth surface).

- **2026-05-07 T6** — WIP commit `71cd266` — synth-cell registration (PASS 8) + E-SYNTHESIZED-WRITE walker extension. Pre-commit hook + post-commit full suite: 8517 pre-commit / 9241 full / 0 fail.

- **2026-05-07 T7** — Authored `compiler/tests/unit/synth-validity-surface.test.js` (15 describe blocks, 27 tests covering all 8 dispatch test-expectation items + 4 boundary/negative cases). First run revealed 14 failures rooted in two issues:
  1. **Test fixture issue**: the parser doesn't accept `<name req>=""` as a compound child (Shape 2 with literal init + validator). Fixed by switching to canonical `<name req> = <input type="text"/>` Shape 2 syntax.
  2. **Implementation bug**: `walkRegisterSynthSurface` had `return` instead of `continue` after the state-decl branch — siblings AFTER a state-decl in a `for` loop were never visited. Fixed; verified via diagnostic test (a `<count>=0` BEFORE a compound previously caused the compound to be skipped).

- **2026-05-07 T8** — All 27 B11 tests pass; full suite **9268 / 54 / 1 / 0** (+27 from baseline). Commit `b478964` — feat(b11): add B11 unit tests + fix walkRegisterSynthSurface sibling-skip bug.

## Phase-0 survey findings

See `SURVEY.md`.

## Implementation summary

### Files touched (full paths from repo root)

1. `compiler/src/symbol-table.ts` — extended `StateCellRecord` interface; added `SynthProperty`, `SYNTH_PROPERTY_NAMES`, `COMPOUND_SYNTH_PROPERTIES` exports; added `walkRegisterSynthSurface` (PASS 8) + helpers; extended B8's PASS 6 walker with E-SYNTHESIZED-WRITE dispatch; added `isSynthesizedCell` + `getSynthRecords` public APIs.

2. `compiler/tests/unit/synth-validity-surface.test.js` — NEW. 15 describe blocks, 27 tests:
   - §B11.1: compound-with-validators surface registration
   - §B11.2: compound-no-validators surface (predictability rule)
   - §B11.3: single-value Tier-1 cells get NO surface (L11 Edge A)
   - §B11.4-7: E-SYNTHESIZED-WRITE on each of {isValid, errors, touched, submitted}
   - §B11.8: cross-field predicate-arg deps positive control
   - §B11.9: compound-rollup dep contract (record-level)
   - §B11.10: runtime-hook annotations per §55.7 update-timing table
   - §B11.11: `submitted` is COMPOUND-LEVEL ONLY boundary
   - §B11.12: nested compounds get surface at every level
   - §B11.13: public read APIs (`isSynthesizedCell`, `getSynthRecords`, exported constants)
   - §B11.14: dev-child shadowing synth name (silent skip; future tighten)
   - §B11.15: negative cases (no false fires)

3. `compiler/tests/integration/symbol-table.test.js` — updated §B1.13 (empty compound now has 4 synth cells; was 0) and §B1.15 (re-entrancy invariant test uses non-synth name `_someFutureBStepCell` since B11 owns the synth surface; the test still validates that the scope is mutable post-runSYM, which is the original re-entrancy invariant).

4. `docs/changes/phase-a1b-step-b11-compound-rollup-synth/progress.md` — this file.

5. `docs/changes/phase-a1b-step-b11-compound-rollup-synth/SURVEY.md` — Phase 0 survey notes.

### NOT modified (intentional, per audit + dispatch)

- `compiler/SPEC.md` — `E-SYNTHESIZED-WRITE` already in §34 catalog (line 14218); no spec amendment needed.
- `compiler/src/dependency-graph.ts` — B11 emits NO new DG edges (per Phase 0 finding (c)). Cross-field validator-reads edges already wired by B10 Phase 3 (S67); rollup-edge materialization is A1c codegen concern.
- Spec-prose drift `§6.11 stub vs §55 canonical type shapes` flagged in audit §1.2 — separate, non-blocking spec follow-up; not part of B11 dispatch.

## Final report

### 1. WORKTREE_PATH

`/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a645aae70da1b8387`

### 2. FINAL_SHA

`b478964fb1c284dc1bff2f518a7f8626352986ea` (branch: `worktree-agent-a645aae70da1b8387`).

Three commits since base `a4eed93`:
- `55df164` WIP(b11): Phase 0 survey + progress.md scaffolding
- `71cd266` WIP(b11): synth-cell registration (PASS 8) + E-SYNTHESIZED-WRITE walker extension
- `b478964` feat(b11): add B11 unit tests + fix walkRegisterSynthSurface sibling-skip bug

### 3. FILES_TOUCHED

```
compiler/src/symbol-table.ts                                                   (M)
compiler/tests/integration/symbol-table.test.js                                (M)
compiler/tests/unit/synth-validity-surface.test.js                             (A)
docs/changes/phase-a1b-step-b11-compound-rollup-synth/progress.md              (A)
docs/changes/phase-a1b-step-b11-compound-rollup-synth/SURVEY.md                (A)
```

(`bun.lock` was modified by `bun install` in the worktree — incidental, NOT part of the file delta. PA should not pull it.)

### 4. TEST_DELTA

| Suite | Pre-B11 (S67 close) | Post-B11 (this commit) | Delta |
|---|---|---|---|
| Full suite pass | 9241 | 9268 | +27 |
| Full suite skip | 54 | 54 | 0 |
| Full suite todo | 1 | 1 | 0 |
| Full suite fail | 0 | 0 | 0 |
| Pre-commit pass | 8470 | 8544 | +74 |
| Pre-commit fail | 0 | 0 | 0 |

The +27 full-suite delta = 27 new tests in `synth-validity-surface.test.js`. The +74 pre-commit delta is larger because the pre-commit subset reweights some test files; B11's new tests + small re-balance in re-purposed §B1.13/§B1.15 contribute the difference.

Browser validation (post-commit hook): TodoMVC compile + dist sanity passes; no regressions.

### 5. DEFERRED_ITEMS

| Item | Rationale |
|---|---|
| **Per-field synth surface** (`@form.name.isValid` etc.) | Explicit B12 scope per dispatch + audit §1.3 wave-ordering. |
| **Per-field E-SYNTHESIZED-WRITE** (e.g., `@form.email.isValid = false`) | Explicit B12 scope. The PASS 6 walker extension will gain a fifth dispatch keyed on per-field synth-property writes; B12 reuses the same `SYNTH_PROPERTY_NAMES` set + receiver-chain resolution. |
| **E-DERIVED-WITH-VALIDATORS** | Explicit B13 scope. |
| **Engine state-cell synth** | Explicit B14 scope; engine cells aren't compound parents (B5 doesn't classify them). |
| **A1c codegen for runtime hooks** (touch / submit triggers) | Explicit out-of-scope per dispatch. B11 RECORDS `runtimeHookKind: "touch" \| "submit" \| null` on each synth record; A1c reads the annotation and emits the actual `bind:value`/`bind:checked`/focus-out/form-submit hooks. |
| **DG rollup edges** for `@compound.isValid` reading each field's `isValid` | Per Phase 0 survey finding (c): the rollup is logically a consequence of synth-record annotations; A1c codegen materializes via the `validator-reads` edge machinery already wired by B10 Phase 3. No B11-step DG emission needed. |
| **§6.11 stub vs §55 type-shape correction** (audit §1.2) | Spec-prose drift. Non-blocking spec follow-up; not part of B11 implementation dispatch. Recommend S59/S66-style footnote at end of §6.11 referencing §55 as canonical. |
| **E-SYNTH-NAME-COLLIDES** (dev declares a child named `isValid` etc.) | Future tightening. B11 silently preserves dev intent (the dev-declared child wins; synth `isValid` is skipped). §B11.14 codifies the current behavior; a separate dispatch can convert to fire. |

### 6. OPEN_QUESTIONS

| Question | Disposition recommendation |
|---|---|
| **Should B11 fire a tightening on dev children named `isValid`/`errors`/`touched`/`submitted`?** | DEFER. Test §B11.14 documents current silent-skip behavior. A future dispatch can introduce `E-SYNTH-NAME-COLLIDES`; until then, dev-intent-wins is the conservative choice. |
| **Should `runtimeHookKind` be a discriminated-union type?** | KEEP as-is (`"touch" \| "submit" \| null`). The current shape is enough for A1c codegen. If the codegen develops complex per-hook metadata (e.g., debounce timing), promote to a structured object then. |
| **Should compound-parent `_record` carry a back-pointer to the synth records (`record.synthRecords?: StateCellRecord[]`)?** | DEFER. `getSynthRecords(compoundDecl)` provides the same capability via scope walk; embedding a back-pointer adds redundancy + an invariant to maintain. If A1c codegen finds the read-API path slow, add the field then. |
| **`<empty></>` (empty compound) intuitive enough that 4 synth cells should still register?** | YES per spec (§55.5 predictability rule). Test §B11.2 second case codifies. The size-4 invariant is captured by the updated §B1.13 test. |
| **Edge case — compound parent with `isValid` as a child Shape 2 cell**: dev's child wins; the other 3 synth cells still register. | Documented in §B11.14. Behavior is intentional (silent skip preserves dev intent). |

### 7. PRIMER §13.7 ROW DRAFT

**Add to the annotated-AST contracts table (after the B10 Phase 3 row):**

```markdown
| **B11** | `StateCellRecord.{isSynthesized, synthProperty, parentCompound, runtimeHookKind}` (extension fields on synth records ONLY) | compound parent's `_scope.stateCells` map gains 4 synth records keyed by `isValid`/`errors`/`touched`/`submitted` | `synthProperty: "isValid" \| "errors" \| "touched" \| "submitted"`; `runtimeHookKind: "touch" \| "submit" \| null` (per §55.7 timing table) | `isSynthesizedCell(record)`, `getSynthRecords(compoundDecl)` exported from `compiler/src/symbol-table.ts`; constants `SYNTH_PROPERTY_NAMES`, `COMPOUND_SYNTH_PROPERTIES`. Walker is SYM PASS 8 (`walkRegisterSynthSurface`). Also fires `E-SYNTHESIZED-WRITE` per SPEC §55.5 / §55.7 / §34 by extending B8's PASS 6 walker (audit §1.3 wave-ordering correction). |
```

**Add as B11 specifics block (after the B10 specifics block):**

```markdown
**B11 specifics (load-bearing for B12 + A1c codegen + IDE autocomplete):**

- **Trigger predicate is `_cellKind === "compound-parent"`** (B5 annotation). Single-value Tier-1 cells (L11 Edge A) get NO surface — the compound-parent check filters them naturally. Synthesis is UNCONDITIONAL for compound parents per §55.5 predictability rule (audit §1.1) — even no-validator compounds get the surface, with trivially-valid defaults.

- **Type shapes per §55, NOT §6.11 stub** (audit §1.2). Compound `errors` is `{fieldName: [...errorTags]}` (object map). Per-field `errors` (B12 future scope) is array of `ValidationError` enum tags (NOT singular `error: string`). §6.11 stub remains a non-blocking spec-prose drift to be resolved via a separate footnote-style spec amendment.

- **Synth records share `declNode` with the compound parent.** Since synth cells have no underlying source AST decl (they're metadata, not AST insertions), the `record.declNode` field references the COMPOUND PARENT's decl node — the source-anchor for span-based diagnostics. The discriminant is `record.isSynthesized === true`.

- **Runtime-hook annotations per §55.7 line 24449-24461 (audit §1.5):** `isValid` and `errors` are pure-reactive (`runtimeHookKind: null`); `touched` is event-driven on bind:value/bind:checked change OR first focus-out (`runtimeHookKind: "touch"`); `submitted` is event-driven on form submit handler (`runtimeHookKind: "submit"`). B11 RECORDS the hook requirement; A1c codegen reads the annotation and emits the actual hook plumbing.

- **`submitted` is COMPOUND-LEVEL ONLY** per §55.7 line 24468 (audit §1.6). B12 (per-field surface) MUST NOT register per-field `submitted`.

- **E-SYNTHESIZED-WRITE join with B8's PASS 6** (audit §1.3 wave-ordering correction). The synth-write check runs FIRST in `checkExprNodeForMutations` and `checkReactiveNestedAssign` — if it fires, the derived-value-mutate path is short-circuited (E-SYNTHESIZED-WRITE is a more specific rule with distinct fix-advice from E-DERIVED-VALUE-MUTATE). Per-field scope is B12's extension (audit §1.3 — B12 will gain a fifth dispatch).

- **NO new DG edges** (Phase 0 finding (c)). B10 Phase 3 already wired cross-field `validator-reads` edges in S67; the rollup reactivity (compound's `isValid` reads each field's surface) is logically a consequence of synth-record annotations and is materialized by A1c codegen via the existing edge machinery. B11 emits zero edges into Stage 7.

- **Dev-child shadowing.** When a dev declares a compound child with one of the synth-property names (e.g., `<form><isValid>=true</>`), the dev's record wins; synth registration silently skips that name. The other three synth cells still register. Test §B11.14 codifies. Future tightening can convert to `E-SYNTH-NAME-COLLIDES` via a separate dispatch.

- **Walker bug surfaced + fixed during dispatch.** Initial implementation of `walkRegisterSynthSurface` had `return` instead of `continue` after the state-decl branch, which caused siblings AFTER a state-decl in a `for` loop to be skipped (e.g., `<count> = 0` followed by `<form>{...}` would leave the form without synth cells). The audit's anti-folklore guard would have caught this in the test corpus; the §B11.13 test in the dedicated B11 suite caught it before merge.

- **Public read APIs (audit §1.7 + dispatch §5):** `isSynthesizedCell(record): boolean` and `getSynthRecords(compoundDecl): StateCellRecord[]` (returns the 4 synth records in `COMPOUND_SYNTH_PROPERTIES` order: `[isValid, errors, touched, submitted]`). Constants `SYNTH_PROPERTY_NAMES: ReadonlySet<SynthProperty>` and `COMPOUND_SYNTH_PROPERTIES: readonly SynthProperty[]` are stable exports.
```

### 8. SURVEY-NOTE

Written: `docs/changes/phase-a1b-step-b11-compound-rollup-synth/SURVEY.md`. Phase 0 confirmed all 5 dispatch survey items + identified one scope contraction (no new DG edges). Implementation came in at the lower bound of the 5-7h estimate (closer to 5h) due to that contraction + the clean integration with B5's `_cellKind` annotation + B8's pre-prepared walker structure.
