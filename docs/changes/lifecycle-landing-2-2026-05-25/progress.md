---
status: in-progress
started: 2026-05-25
worktree: /home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a437fb1211e6cf78e
branch: worktree-agent-a437fb1211e6cf78e
landing: 2 of 3 (S130 HU-1 phase 2 amendment scope)
---

# Lifecycle Landing 2 — Approach C SPEC extension + glyph migration

Companion to Landing 1 (E-TYPE-001 fire site at compiler/src/type-system.ts:1444). Landing 1
shipped per-access transition-state tracking; Landing 2 extends the SPEC text to non-engine
cell positions + carves out engine cells + migrates the `->` glyph to `to`.

## Step 1 — Startup verification — 2026-05-25 (in progress)
- pwd verified: /home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a437fb1211e6cf78e
- worktree branch: worktree-agent-a437fb1211e6cf78e
- bun install clean
- bun run pretest clean
- mandatory pre-reads consumed: primary.map.md, HU doc, SPEC-INDEX, §14 (lines 7070-7673),
  §34 catalog (lines 15138+), §39 schema (lines 17623+), §51.0.A-B (lines 22789+),
  Landing 1 progress.md

## Step 2 — Brief-vs-HU contradiction surfaced

Per pa.md Rule 4 (SPEC normative) and Rule 5 (shoot straight): the brief instructs me to
DEFER fn-return position (saying Q3's transition-marker mechanism is an OPEN sub-question
with 4 candidates a/b/c/d). The HU doc Q3 ratification text is clearer: Q3=a EXTENDS
lifecycle to fn-return; the sub-question is the transition-marker MECHANISM (α/β/γ/δ).

Brief deferral is the safe call (extending SPEC text for fn-return without ratified
transition-marker semantics would be incomplete). I'll honor the brief: add a §14.12 Note
that fn-return is pending the transition-marker sub-question. Will surface this in the
final report.

## Plan (Phase 2 amendment scope, per brief)
1. SPEC §14.12 NEW subsection — Lifecycle Annotation canonical home (Approach C extension)
2. SPEC §14.3 — migrate glyph `->` → `to`, preserve worked example
3. SPEC §34 — new row E-TYPE-LIFECYCLE-ON-ENGINE-CELL
4. SPEC §39 — cross-ref §14.12, add SQL-shape addendum
5. Compiler — add `to`-glyph parsing to findTopLevelArrow (parallel detection)
6. Compiler — engine-cell carve-out E-TYPE-LIFECYCLE-ON-ENGINE-CELL fire
7. Tests — 8+ minimum per brief: positive + negative per extension position;
   engine-cell rejection; glyph regression
8. Coordination — Iteration Landing 1 sibling dispatch may touch §34; list rows added

## Step 3 — SPEC amendments — DONE 2026-05-25
- §14.12 "Lifecycle Annotation" NEW subsection (10 sub-subsections covering
  overview, canonical `to` glyph, extension scope table, engine-cell carve-out,
  glyph deprecation lint, fn-return NOTE, schema cross-ref, channel-cell,
  cross-refs, normative statements)
- §14.3 — glyph migrated `(not -> string)` → `(not to string)`; field-annotation
  bullet updated to reference §14.12 + name `to` as contextual keyword
- §34 — +2 catalog rows:
  - E-TYPE-LIFECYCLE-ON-ENGINE-CELL (Error, §14.12.4)
  - W-LIFECYCLE-LEGACY-ARROW (Info, §14.12.5)
- §39.11 — cross-ref to §14.12 + NEW §39.11.1 SQL-shape addendum (DDL emission,
  migration behavior, NULL-vs-NOT-NULL transitions, worked example)
- Committed as 7307ba14

## Step 4 — Compiler-source — DONE 2026-05-25
- findTopLevelArrow: detects BOTH `to` (canonical S130 keyword) AND `->` (legacy)
  - `to` is whitespace-bounded contextual keyword (parallel to `from` in import)
  - Returns {idx, len, glyph} where glyph discriminates "to" vs "arrow"
  - resolveTypeExpr now uses the shared helper instead of hardcoded `->` indexOf
- W-LIFECYCLE-LEGACY-ARROW info-level lint per §14.12.5
  - Fires at registry-build site (has access to span + errors accumulator)
  - extractLifecycleFields + buildLifecycleRegistry threaded with optional
    errors + fileSpan; preserves Landing 1 callers
  - TSError class extended to accept "info" severity
- checkLifecycleOnEngineCells engine-cell carve-out per §14.12.4
  - Detects state-decl with lifecycle typeAnnotation whose name matches
    an engine cell (machineRegistry.values().name = auto-decl variable name)
  - Fires E-TYPE-LIFECYCLE-ON-ENGINE-CELL with §14.12.4 diagnostic
  - Runs before runLifecycleAccessCheck so carve-out fires before per-access
- Committed as e6aa7b0e

## Step 5 — Unit tests — DONE 2026-05-25
- compiler/tests/unit/type-system-lifecycle-landing-2.test.js
- 25 tests across 5 describe blocks:
  - §LL1 Glyph parity (5 tests)
  - §LL2 W-LIFECYCLE-LEGACY-ARROW emission (4 tests)
  - §LL3 Engine-cell carve-out (7 tests)
  - §LL4 Lifecycle extension scope (5 tests)
  - §LL5 `to` glyph boundary semantics (3 tests)
- All 25 pass + Landing 1's 27+6 still pass (58 total lifecycle tests)
- Committed as 54d072bf

## Step 6 — Integration bug discovery + fix — DONE 2026-05-25
- Integration test development surfaced a parser bug:
  collectTypeAnnotation in ast-builder.js was joining token parts with
  empty separator, fusing `not to string` into `nottostring`.
- Pre-S130 callers tolerated this because they only checked punctuation-shaped
  glyphs (`->`, `&&`, `!`). The `to` keyword requires whitespace boundaries.
- Fix: insert single space between consecutive parts whose adjacent chars
  are both `[A-Za-z0-9_$]`. Canonical, single-space.
- Integration tests at compiler/tests/integration/lifecycle-landing-2-pipeline.test.js
  - 4 'to' glyph tests
  - 4 engine-cell carve-out tests
  - 2 extension-position tests
  - 1 W-LIFECYCLE-LEGACY-ARROW non-fatal-stream test
  - 11 total; all pass
- Coupled commit per [[feedback_coupled_code_test_commit]] — 0922fa0f

## Step 7 — Final test verification — DONE 2026-05-25
- Pre-commit gate: 14479 pass / 0 fail (was 14443 baseline; +36 new tests)
- Full broad suite: 21498 pass / 0 fail / 170 skip / 1 todo / 789 files
- Brief baseline: 21462/0/170/1/787 → delta +36 pass, +2 files; skip/todo unchanged

## SPEC-vs-HU contradictions surfaced
NONE — but one brief-vs-HU divergence noted:
- Brief: "DO NOT cover function-return position — the fn-return transition-marker
  mechanism is an OPEN sub-question (4 candidates a/b/c/d per HU-1 Q3 ratification
  text) deferred."
- HU doc Q3 RATIFICATION: "Q3 RATIFICATION — (a) extend lifecycle to fn return types"
  AND "**Open Phase 2 sub-question (folds into Landing 2 design work):** what counts
  as the transition-marker for a returned value?"
- The brief deferral is consistent with the HU's open sub-question: extending the
  SPEC text for fn-return without ratified transition-marker semantics would be
  incomplete prose. Honored brief — added §14.12.6 NOTE pointing to follow-on.

## Sibling-dispatch coordination
- Iteration Landing 1 (sibling worktree agent-a3d63c84a0ce87e87) did NOT touch SPEC.md
- §34 catalog rows added by Landing 2:
  - E-TYPE-LIFECYCLE-ON-ENGINE-CELL (Error, line ~15164 in current SPEC)
  - W-LIFECYCLE-LEGACY-ARROW (Info, line ~15165 in current SPEC)
- No table-merge conflict expected at PA landing time

## Maps consulted
- .claude/maps/primary.map.md — confirmed Spec amendment routing (domain + error + schema)
- Task-shape routing pointed at error.map.md for E-TYPE-LIFECYCLE-ON-ENGINE-CELL
  classification; not load-bearing (used HU+SPEC §14+§51 directly)
- Map watermark 3a909c1d is stale (~115 files since); verified findings against
  actual source via grep+Read per brief's stale-map disclaimer

