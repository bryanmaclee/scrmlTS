# Progress: dq12-phase-a

## Change
Extend `is not` / `is some` / `is not not` to support parenthesized compound expressions.
Phase A: `(expr) is not`, `(expr) is some`, `(expr) is not not` with temp-var single-eval guarantee.

## Decomposition Plan
- Step 1: compiler/src/codegen/rewrite.ts — add parenthesized-form path to _rewriteNotSegment
- Step 2: compiler/tests/unit/not-keyword.test.js — add §42.2.4 compound-form tests
- Step 3: samples/compilation-tests/is-not-compound.scrml — add sample
- Step 4: compiler/SPEC.md lines ~14024-14026 — add implementation note

## Log
- [pipeline-init] Artifact directory created, progress.md initialized. Pre-snapshot pending.
- [step-1-complete] rewrite.ts: inserted _rewriteParenthesizedIsOp helper (73 lines) before _rewriteNotSegment. Called from _rewriteNotSegment before identifier-only patterns. Not-keyword unit tests: 79/79 pass.
- [step-2-complete] not-keyword.test.js: added resetVarCounter import + 15 new §42.2.4 tests (§A1-§A15). All 94 tests pass (79 existing + 15 new).
- [step-3-complete] samples/compilation-tests/is-not-compound.scrml created with 7 common patterns.
- [step-4-complete] SPEC.md §42.2.4: added implementation note (2 sentences) after normative statements.
- [full-suite] bun test: 5,574 pass, 2 skip, 5 fail. The 5 failures are pre-existing CSS @scope failures from DQ-7 pipeline (emit-css.ts) — unrelated to this change. Not introduced by dq12-phase-a.
- [git-denied] git commands denied by permission system. Changes are staged in working tree. Commit commands documented in anomaly-report.md.

## Commit Commands (if git denied)
```
cd /home/bryan-maclee/scrmlMaster/scrmlTS
git checkout -b changes/dq12-phase-a
git add compiler/src/codegen/rewrite.ts
git add compiler/tests/unit/not-keyword.test.js
git add samples/compilation-tests/is-not-compound.scrml
git add compiler/SPEC.md
git add docs/changes/dq12-phase-a/
git commit -m "feat(dq12-phase-a): add parenthesized-form support for is not / is some

Add _rewriteParenthesizedIsOp() helper to rewrite.ts that handles (expr) is not,
(expr) is some, and (expr) is not not. Uses genVar() temp vars for single-evaluation
guarantee per §42.2.4. Existing identifier-only path unchanged.

IMPACT:
  Files: compiler/src/codegen/rewrite.ts, compiler/tests/unit/not-keyword.test.js,
         samples/compilation-tests/is-not-compound.scrml, compiler/SPEC.md
  Stages: CG (rewrite pass only)
  Downstream: none (no stage contract change, no AST change)
  Contracts at risk: none

Tests: 5574 passing, 0 regressions (5 pre-existing DQ-7 CSS failures excluded)
New tests added: 15 (§A1-§A15 in not-keyword.test.js)
E2E: is-not-compound.scrml added

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

## Tags
#dq12 #progress #phase-a

## Links
- compiler/src/codegen/rewrite.ts
- compiler/tests/unit/not-keyword.test.js
- compiler/SPEC.md (§42.2.4)
- docs/changes/dq12-phase-a/anomaly-report.md
