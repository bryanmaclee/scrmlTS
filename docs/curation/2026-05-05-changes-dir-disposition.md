# `docs/changes/` curation matrix — 2026-05-05 (S61)

**Purpose:** disposition every directory under `docs/changes/` per pa.md's "current truth only" scope principle. Dirs that describe completed-and-merged work belong in `scrml-support/archive/dispatches/` per pa.md scope-flow. PA proposes per-dir dispositions in batches; user ratifies; PA executes the deref.

**Source of truth signal:** flagged by S61 maps-refresh agent's non-compliance scan as a wholesale curation candidate (103 dirs total). PA confirms.

**Total dirs:** 103
**Proposed dispositions:**
- **KEEP-LIVE:** 19 dirs (current A1a/A1b/A1c work + audit deliverables)
- **KEEP-RECENT-LANDED:** 6 dirs (S48-S59 landings; recent enough to be cited from current changelog)
- **DEREF-CANDIDATE:** 78 dirs (S29-S52 completed dispatches; deref to `scrml-support/archive/dispatches/<name>/`)

---

## §1 KEEP LIVE — 19 dirs (current truth, do not touch)

These describe in-flight work or are referenced by master-list §0 dashboard / hand-off / current spec.

| Dir | Why live |
|---|---|
| `v0next-audit/` | S59 PARSER-AUDIT-2026-05-05.md — referenced by master-list §0.3 |
| `v0next-inventory/` | S59 SCOPE-MAP-2026-05-05.md + ARTICLE-TRUTHFULNESS-AUDIT — master-list §0.3 |
| `v0next-spec-impact/` | IMPLEMENTATION-ROADMAP.md — master-list §0.3 (now superseded by SCOPE-MAP §0 dashboard, but still cited; verify) |
| `phase-a1a-lex-parse/` | A1a parent dir; AST-CONTRACTS-AND-DECOMPOSITION.md is the live A1a tracker |
| `phase-a1a-step-2-foundational-decl-recognition/` | A1a Step 2 (live) |
| `phase-a1a-step-3-rename-state-decl/` | A1a Step 3 (live) |
| `phase-a1a-step-6-default-pinned/` | A1a Step 6 (live) |
| `phase-a1a-step-7-pinned-imports/` | A1a Step 7 (live) |
| `phase-a1a-step-8-reserved-ident/` | A1a Step 8 (live) |
| `phase-a1a-step-9-reset-keyword/` | A1a Step 9 (live) |
| `phase-a1a-step-10-mutation-shapes/` | A1a Step 10 (live) |
| `phase-a1a-step-11-compound-render-smoke/` | A1a Step 11 (live) |
| `phase-a1a-step-11-0a-compound-recognizer/` | A1a Step 11.0a (live) |
| `phase-a1a-step-11-0b-newline-separator/` | A1a Step 11.0b (live) |
| `phase-a1a-step-11-0c-typed-decl/` | A1a Step 11.0c (live) |
| `phase-a1a-step-11-5-fold-derived/` | A1a Step 11.5 (LANDED S61, but BRIEF + ADR ratification + progress.md still cited from changelog/hand-off — consider RECENT-LANDED in 2-4 weeks) |
| `phase-a1a-step-12-existing-test-deltas/` | A1a Step 12 (in-flight S61) |
| `phase-a1a-step-13-final-changelog/` | A1a Step 13 (queued) |
| `phase-a1b-resolve-type/` | A1b RATIFIED scope doc — referenced by master-list §0.1 |
| `phase-a1c-codegen/` | A1c RATIFIED scope doc — referenced by master-list §0.1 + Shape 3 codegen gap §6.4 |
| `reactive-derived-decl-divergence/` | ADR ratified S60, landed S61 — still cited from master-list §0.6 (resolved); deref candidate in 2-4 weeks |

**(That's actually 21; PA undercount above. Counts will firm up once user batch-ratifies.)**

---

## §2 KEEP RECENT-LANDED — 6 dirs (deref candidate in 2-4 weeks)

Recent enough (S48-S59) that current changelog entries still cite them by SHA. Defer deref until those changelog entries roll off the "recent" window.

| Dir | Era | What landed | Deref ETA |
|---|---|---|---|
| `s6-const-sweep/` | S58 | `const @x` → `const <x>` SPEC sweep (62+13 edits) | After S65 |
| `s48-close-compiler-dot-phantom/` | S48 | Compiler-dot phantom retirement | After S65 |
| `stdlib-oauth/` | S57 | scrml:oauth stdlib module (6 .scrml files) | After S65 |
| `program-documentary-attrs/` | S59 | `<program>` documentary attrs (`title=`, `description=`, `version=`, `author=`, `license=`); SPEC §40.7 | After S65 |
| `ast-shape-rename/` | S53 | `machine-decl` → `engine-decl`; `machineName` → `engineName` rename | After S65 (could deref now if user confirms) |
| `doc-e-rename/` | S53 | User-facing docs E-MACHINE-* → E-ENGINE-* (6 occurrences across 3 files) | After S65 (could deref now if user confirms) |

PA recommendation: **HOLD all 6 until S65** unless user wants aggressive deref now.

---

## §3 DEREF-CANDIDATE — ~78 dirs (deref to `scrml-support/archive/dispatches/<name>/`)

Grouped into sub-batches for easier user review/ratification. Each sub-batch is a clean cluster of related work.

### §3.1 Batch A: P-numbered series (12 dirs) — S40-era foundational dispatches — ✅ RATIFIED + EXECUTED S61 (2026-05-05)

**Disposition correction:** matched existing `archive/changes/<name>/` flat layout (38 dirs precedent), NOT `archive/dispatches/p-series-s40/`. No batch sub-grouping in archive — flat alongside other archived `archive/changes/` entries.

| Dir | Era / What | Final location |
|---|---|---|
| `p1/` | S40 | `scrml-support/archive/changes/p1/` |
| `p1.e/` | S40 P1 follow-up | `scrml-support/archive/changes/p1.e/` |
| `p2/` | S40 | `scrml-support/archive/changes/p2/` |
| `p2-wrapper/` | S40 | `scrml-support/archive/changes/p2-wrapper/` |
| `p3.a/` | S40 | `scrml-support/archive/changes/p3.a/` |
| `p3.a-follow/` | S40 P3.A follow-up | `scrml-support/archive/changes/p3.a-follow/` |
| `p3.b/` | S40 | `scrml-support/archive/changes/p3.b/` |
| `p3-error-rename/` | S40 | `scrml-support/archive/changes/p3-error-rename/` |
| `p3-follow/` | S40 | `scrml-support/archive/changes/p3-follow/` |
| `p3-rename/` | S40 | `scrml-support/archive/changes/p3-rename/` |
| `p3-spec-paperwork/` | S40 | `scrml-support/archive/changes/p3-spec-paperwork/` |
| `p4-scrml-migrate/` | S40 — `scrml migrate` CLI subcommand | `scrml-support/archive/changes/p4-scrml-migrate/` |

**Cross-ref fixed:** `examples/23-trucking-dispatch/FRICTION.md` referenced `docs/changes/p3.a-follow/`; updated to point to scrml-support archive.

### §3.2 Batch B: Phase 4d expr-AST series (4 dirs) — ✅ RATIFIED + EXECUTED S61 (2026-05-05)

| Dir | Final location |
|---|---|
| `expr-ast-phase-4d/` | `scrml-support/archive/changes/expr-ast-phase-4d/` |
| `expr-ast-phase-4d-step-8/` | `scrml-support/archive/changes/expr-ast-phase-4d-step-8/` |
| `expr-ast-phase-4d-step-8-strict/` | `scrml-support/archive/changes/expr-ast-phase-4d-step-8-strict/` |
| `expr-ast-self-host-bs-bug-l-parity/` | `scrml-support/archive/changes/expr-ast-self-host-bs-bug-l-parity/` |

**Cross-refs:** internal-only (within the dirs that moved); no external scrmlTS-side cross-refs needed fixing.

### §3.3 Batch C: dispatch-app M-series (7 dirs) — ✅ RATIFIED + EXECUTED S61 (2026-05-05)

| Dir | Final location |
|---|---|
| `dispatch-app/` | `scrml-support/archive/changes/dispatch-app/` |
| `dispatch-app-m1/` | `scrml-support/archive/changes/dispatch-app-m1/` |
| `dispatch-app-m2/` | `scrml-support/archive/changes/dispatch-app-m2/` |
| `dispatch-app-m3/` | `scrml-support/archive/changes/dispatch-app-m3/` |
| `dispatch-app-m4/` | `scrml-support/archive/changes/dispatch-app-m4/` |
| `dispatch-app-m5/` | `scrml-support/archive/changes/dispatch-app-m5/` |
| `dispatch-app-m6/` | `scrml-support/archive/changes/dispatch-app-m6/` |

**Cross-refs fixed:** 2 in `examples/23-trucking-dispatch/README.md` (header status box + Links section).

### §3.4 Batch D: F-* feature/fix series (11 dirs) — ✅ RATIFIED + EXECUTED S61 (2026-05-05)

All 11 dirs → `scrml-support/archive/changes/<name>/`.

**Cross-ref fixed:** 1 in `docs/changelog.md` line 395 (F-COMPONENT-001 diagnosis writeup pointer updated to scrml-support archive location).

### §3.5 Batch E: GITI bug fixes (2 dirs) — S29-era adopter bug fixes

| Dir | What |
|---|---|
| `giti-009-import-fix/` | GITI-009 |
| `giti-011-css-at-rules-fix/` | GITI-011 |

**Disposition:** both → `scrml-support/archive/dispatches/giti-bugs/<name>/`.

### §3.6 Batch F: BUG-letter series (2 dirs) — ✅ RATIFIED + EXECUTED S61 (2026-05-05)

| Dir | Final location |
|---|---|
| `bug-h-rettype-fix/` | `scrml-support/archive/changes/bug-h-rettype-fix/` |
| `boundary-security-fix/` | `scrml-support/archive/changes/boundary-security-fix/` |

**Cross-refs:** none.

### §3.7 Batch G: bun-sql phases (2 dirs) — S40-era SQL work

| Dir | What |
|---|---|
| `bun-sql-phase-1/` | Bun SQL phase 1 |
| `bun-sql-phase-2/` | Bun SQL phase 2 |

**Disposition:** both → `scrml-support/archive/dispatches/bun-sql/<name>/`.

### §3.8 Batch H: LSP series (5 dirs) — S51-era LSP rework

| Dir | What |
|---|---|
| `lsp-cleanup-retired-bpp-import/` | LSP retired BPP cleanup |
| `lsp-l1-see-the-file/` | LSP L1 |
| `lsp-l2-see-the-workspace/` | LSP L2 |
| `lsp-l3-scrml-unique-completions/` | LSP L3 |
| `lsp-l4-standards-polish/` | LSP L4 |

**Disposition:** all 5 → `scrml-support/archive/dispatches/lsp-l1-l4/<name>/`.

### §3.9 Batch I: fix-* series (~20 dirs) — S38-S52 hotfixes

| Dir |
|---|
| `fix-acorn-implicit-dep/` |
| `fix-arrow-object-literal-paren-loss/` |
| `fix-bare-decl-markup-text-lift/` |
| `fix-bs-html-comment-opacity/` |
| `fix-bs-string-aware-brace-counter/` |
| `fix-cg-cps-return-sql-ref-placeholder/` |
| `fix-cg-mounthydrate-sql-ref-placeholder/` |
| `fix-cg-sql-ref-placeholder/` |
| `fix-component-def-block-ref-interpolation-in-body/` |
| `fix-component-def-select-option-children/` |
| `fix-component-def-text-plus-handler-child/` |
| `fix-fn-expr-member-assign/` |
| `fix-lift-sql-chained-call/` |
| `fix-lift-sql-chained-call-parallel-sites/` |
| `fix-lin-template-literal-interpolation-walk/` |
| `fix-meta-effect-loop-var-leak/` |
| `fix-server-eq-helper-import/` |
| `fix-w-lint-007-comment-range-exclusion/` |
| `fix-w-lint-013-context-scope/` |
| `fix-w-lint-013-tilde-range-exclusion/` |

**Disposition:** all 20 → `scrml-support/archive/dispatches/hotfixes/<name>/`.

### §3.10 Batch J: Other (12 dirs) — miscellaneous

| Dir | What |
|---|---|
| `phase-2g/` | Phase 2g (S40-era) |
| `uvb-w1/` | UVB validator pre-emit invariant W1 |
| `if-show-phase2c/` | if/show Phase 2c |
| `lin-batch-a/` | Lin batch A (S37-era) |
| `oq-2-dev-server-bootstrap/` | Dev-server bootstrap (S40-era) |
| `pa-shadow-db-from-any-context/` | PA shadow DB feature |
| `structured-inline-match-arms/` | Structured inline match arms |
| `tailwind-arbitrary-values-and-variants/` | Tailwind arbitrary values + variants |
| `add-w-tailwind-001/` | Tailwind W warning |
| `dq7-css-scope/` | DQ7 CSS scope (S37-era) |
| `ast-lift-exported-components-into-components/` | Component-export lift |

**Disposition:** all 12 → `scrml-support/archive/dispatches/misc/<name>/`.

---

## §4 Mechanics of the deref (when user ratifies)

For each batch ratified:

1. PA creates `scrml-support/archive/dispatches/<batch-name>/` if needed.
2. PA `git mv` each dir from `scrmlTS/docs/changes/<dir>/` to `scrml-support/archive/dispatches/<batch-name>/<dir>/`. **CROSS-REPO move** — actually requires:
   - `git rm -r scrmlTS/docs/changes/<dir>/` in scrmlTS (preserves git history of the deletion);
   - `cp -r` to scrml-support, `git add` in scrml-support;
   - cross-repo single commit reference via cross-repo dropbox.
3. PA verifies no in-repo doc cross-references to the deleted paths. If found, fix to point to scrml-support archive instead.
4. Single commit per batch in each repo.
5. After batch, PA verifies test suite still passes (defensive — these are .md files, shouldn't affect tests, but verify).
6. Batch closure documented in `docs/changelog.md` S6N entry.

---

## §5 Per-batch ratification interface

User ratification options per batch:

- **R** — Ratify (PA executes deref).
- **H** — Hold (revisit later).
- **S** — Spot-check first (PA reads progress.md / final commits before deref).
- **K** — Keep in scrmlTS (override; gives reason).

Suggested ratification cadence: 1-2 batches per session to avoid overload. PA has all batches drafted; user picks order.

---

## §6 PA recommended sequence

1. ✅ **Batch A (P-series, 12 dirs)** — RATIFIED + EXECUTED S61 (2026-05-05). 12 dirs → `scrml-support/archive/changes/`; cross-ref in FRICTION.md fixed.
2. ✅ **Batch C (dispatch-app, 7 dirs)** — RATIFIED + EXECUTED S61 (2026-05-05). 7 dirs → `scrml-support/archive/changes/`; 2 cross-refs in 23-trucking-dispatch/README.md fixed.
3. ✅ **Batch B (expr-ast-phase-4d, 4 dirs)** — RATIFIED + EXECUTED S61 (2026-05-05). 4 dirs → `scrml-support/archive/changes/`; no cross-refs (internal-only).
4. ✅ **Batch F (BUG-letters, 2 dirs)** — RATIFIED + EXECUTED S61 (2026-05-05). 2 dirs → `scrml-support/archive/changes/`; no cross-refs.
5. ✅ **Batch D (F-series, 11 dirs)** — RATIFIED + EXECUTED S61 (2026-05-05). 11 dirs → `scrml-support/archive/changes/`; 1 changelog cross-ref fixed.
6. **Batch I (fix-*, 20 dirs)** — large but uniform; deref-friendly.
7. **Batch H (LSP L1-L4, 5 dirs)** — recent (S51) but completed.
8. **Batch J (misc, 12 dirs)** — heterogeneous; review-per-dir.
9. **Batches E (GITI, 2), G (bun-sql, 2)** — remaining small clusters.

---

## §7 Tags

#curation #docs-changes #non-compliance-item-2 #pa-survey #scope-principle #current-truth-only #deref-to-scrml-support
