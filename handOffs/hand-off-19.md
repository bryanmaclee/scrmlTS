# scrmlTS — Session 19 Hand-Off (in-flight / interrupted)

**Date:** 2026-04-15 (S19 start was 2026-04-14 late; interrupted before wrap)
**Previous:** `handOffs/hand-off-18.md`
**Baseline at start:** 6,228 pass / 8 skip / 2 fail (S18 end)
**Status:** S19 was interrupted mid-gauntlet. No wrap written. This hand-off is a reconstruction from commits + working tree.

---

## S19 commits landed on main

| Commit | What landed |
|--------|-------------|
| `95887ed` | Phase 1 batch 1 — 12 compiler bugs fixed (fn prohibitions, type-annot mismatch, lin checker) |
| `5606543` | Phase 1 batch 2 — 8 diagnostics wired (import/export/scope/use/auth) |
| `5c828d6` | Phase 3 batches 1-3 — 13 compiler bugs fixed (equality, is/not type checks, tokenizer / false-positive) |
| `1fa5247` | Phase 3 batch 4 partial — double-paren W-ASSIGN-001 + given dotted path |
| `13dc8fe` | Phase 2 fixture corpus — 110 control-flow fixtures + triage |

Test artifacts in `compiler/tests/unit/gauntlet-s19/` (10 files):
equality-diagnostics, fn-prohibitions, import-export-scope-use, is-not-type-checks, lin-checker, match-exhaustiveness *(uncommitted)*, phase3-wrapup, server-boundary, tokenizer-slash, type-annot-mismatch.

---

## Uncommitted working tree (interruption point)

**Likely the in-flight Phase 2 match-exhaustiveness pass:**

- `compiler/src/type-system.ts` — **+322 / -1** — three additions:
  1. **E-TYPE-026** markup-match detection (bare `match ` / `partial match ` in markup text children)
  2. Match-expr visitor hook in binding branch so exhaustiveness fires on embedded match
  3. Enum/union/struct type surfacing from annotation when resolvedType is `asIs` (fixes match exhaustiveness against annotated subjects)
- `compiler/tests/unit/gauntlet-s19/match-exhaustiveness.test.js` — NEW, untracked
- `docs/tutorialV2.md` — NEW, 1,542 lines, untracked
- `docs/tutorialV2-snippets/` — NEW dir with many `.scrml` snippets (00a-hook-client through 02a-iteration+)
- `docs/changes/expr-ast-phase-1-audit/escape-hatch-catalog.{json,md}` — likely timestamp drift (seen before in S18)

**Do before anything else at S19-resume:**
1. Run the new match-exhaustiveness tests to see where we stopped
2. Decide whether tutorialV2 work is part of S19 or a parallel side-thread (it's new and large — could be a separate commit)
3. Confirm escape-hatch-catalog drift vs real change; revert if drift

---

## Gauntlet plan reference

Full plan still in `handOffs/incoming/read/` — copy: `2026-04-14-2330-scrmlTS-to-next-pa-language-gauntlet-plan.md`.
Phases remaining: Phase 2 finish (match exhaustiveness — IN-FLIGHT), Phase 3 batch 4 rest, Phases 4–12.

## State of the repo

- **Branch:** `main`, assume ahead of origin (S19 commits may not be pushed — confirm)
- **Staged agents:** debate-curator, debate-judge, scrml-language-design-reviewer, scrml-server-boundary-analyst (from S16)
- **Test suite baseline:** ~6,228 pass pre-S19; need fresh run to get S19-commit delta

## Next priority → S20 (or S19 resume)

1. **Run `bun test`** to establish current pass/fail (S19 commits may have added tests or shifted counts)
2. **Inspect match-exhaustiveness.test.js** and the type-system.ts diff — determine if the match-exhaustiveness work is ready to commit or still WIP
3. **Decide tutorialV2 disposition** — separate commit? Docs-only? Part of gauntlet?
4. Resume gauntlet from wherever Phase 2 match-exhaustiveness stopped

## Other open (carried from S18)

- P3 self-host completion + idiomification
- P5 TS migrations (ast-builder, block-splitter)
- P5 ExprNode Phase 4d (component-expander, body-pre-parser) + Phase 5 (self-host parity)
- Full Lift Approach C Phase 2
- `lin` redesign (queued — discontinuous scoping deep-dive + debate)
- Async loading stdlib helpers (RemoteData, Approach E)
- DQ-12 Phase B (bare compound `is not`/`is some` without parens)
- 2 remaining self-host test failures

## Tags
#session-19 #in-flight #interrupted #gauntlet #match-exhaustiveness
