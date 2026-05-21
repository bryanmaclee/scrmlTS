# DISPATCH BRIEF — M5-swap Unit R4: SPEC §34 reconciliation

**Status:** dispatch-ready, S117. **Estimate:** 6-12h.
**Authority:** `compiler/native-parser/M5-SWAP-residual-decomposition.md` Unit R4 ·
`BRIEF-M5-SWAP.md` Phase 1 (R4 IS that Phase 1, dispatched standalone) · DD #27.
**Agent:** `scrml-js-codegen-engineer` · `isolation: "worktree"` · `model: opus`.
**Parallel siblings:** R1 (stmt bridge) + R2 (hoist gap) dispatch alongside you.
R4 is file-disjoint from them through its STOP gate — your **plan phase writes
only a plan doc**; the native-parser code renames happen post-ratification.

---

## What R4 is

The native parser fires **~66 diagnostic codes not in SPEC §34** — the `E-EXPR-*`
family (~32) and `E-STMT-*` family (~34). (`E-ASYNC-NOT-IN-SCRML`,
`E-AWAIT-NOT-IN-SCRML`, `E-UNQUOTED-DISPLAY-TEXT` ARE already in §34.) Today this
is harmless — the codes never reach adopters because the native parser is not
routed. **The moment R5 swaps the pipeline, every one of these becomes
adopter-visible.** SPEC §34 is normative (pa.md Rule 4); a routed code with no
§34 row is a spec-vs-impl divergence the swap itself would create. R4 closes it.

---

# MAPS — REQUIRED FIRST READ

Read `.claude/maps/primary.map.md` in full, then follow §"Task-Shape Routing" for
**spec amendment** + **compiler-source bug fix** (error map + structure).

Map currency: maps reflect HEAD `67a17dc5`. Commits since (`8c9d855b`,
`2154c474`, `95c81557`, `ca0e40ce`) are docs / README / maps only — compiler
maps current. **§34 is amended on nearly every spec landing — verify §34 currency
directly in `compiler/SPEC.md` before encoding anything** (Rule 4).

Feedback: report states "Maps consulted: [list]; load-bearing finding: <one
sentence>" or "Maps consulted but not load-bearing".

---

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE

Your worktree is harness-allocated under
`/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-<id>/`. The `pwd`
from step 1 IS your `WORKTREE_ROOT`.

**S99 leak-history: agent Write/Edit calls have leaked into the main checkout.
Do not be the next incident.**

## Startup verification (BEFORE any other tool call)

1. `pwd` — output MUST start with
   `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`. If under any
   other repo, STOP and report (S90 CWD-routing failure). Save as `WORKTREE_ROOT`.
2. `git rev-parse --show-toplevel` — MUST equal `WORKTREE_ROOT`.
3. `git merge main --no-edit` — worktrees branch from the session-start commit,
   not live `main` HEAD (S112). `main` HEAD is `ca0e40ce`. Resolve any conflict
   or STOP and report.
4. `git status --short` — confirm clean after the merge.
5. `bun install` — worktrees do not inherit `node_modules`.
6. `bun run pretest` then `bun run test` for the baseline. Expectation:
   **18,102 pass / 0 fail / 169 skip / 1 todo / 738 files** (S115 CLOSE). If your
   baseline diverges, STOP and report. (A transient dist/timing 2-fail flake on
   the first post-install run has been observed; re-run once — it must not recur.)

If ANY check fails: DO NOT proceed. Report and exit.

## Path discipline (EVERY Read/Write/Edit call)

- Write/Edit: ALWAYS absolute paths under `WORKTREE_ROOT`. NEVER bare-main-root
  paths. NEVER relative paths.
- Your first commit message MUST include the verbatim `pwd`, e.g.
  `WIP(R4): start at $(pwd)`.

# COMMIT DISCIPLINE (two-sided rule — S83)

- After EVERY edit: `git diff <file>`; `git add <file>`; commit IMMEDIATELY.
- Code change + its coupled test update = ONE commit (S113). Never `--no-verify`.
- Before reporting DONE: `git status` MUST be clean.
- Update `docs/changes/m5-v0.5-compressed-ladder/progress-R4.md` after each step.

---

# CONTEXT — read before starting

1. `compiler/native-parser/M5-SWAP-residual-decomposition.md` — Unit R4.
2. `BRIEF-M5-SWAP.md` §"PHASE 1" — the original Phase-1 spec; R4 is that phase.
3. `compiler/SPEC.md` §34 — the live error-code catalog (verify currency directly).
4. `compiler/SPEC-INDEX.md` §34 row — the line-count + summary you update.
5. `compiler/native-parser/*.scrml` + `*.js` — the source firing the codes.

---

# SCOPE — PLAN PHASE first (STOP GATE), then execute

## Step 1 — enumerate
`grep -rohE '"E-[A-Z-]+"' compiler/native-parser/*.scrml` (and `.js` shadows) →
the authoritative live code set. Cross-check against SPEC §34.

## Step 2 — classify each code into one of:
- **(a) NEW §34 row** — a genuine, distinct, adopter-meaningful parse error.
- **(b) MAP to an existing §34 code** — a finer-grained variant of an existing
  entry (e.g. the `E-SYNTAX-*` family). If mapped, the native-parser source emits
  the canonical code instead.
- **(c) internal/transient** — should not reach adopters at all (rename or fold).

## Step 3 — recommend a family-level approach
Do the ~66 codes get ~66 individual §34 rows, OR a new §34 sub-section grouping
the native-parser parse-error family, OR a fold into `E-SYNTAX-*`? Structural
SPEC decision.

## STOP GATE — mandatory
Write the enumeration + per-code classification table + the family-level
recommendation to
`docs/changes/m5-v0.5-compressed-ladder/M5-SWAP-S34-RECONCILIATION-PLAN.md`,
commit it, and **report to PA. Do NOT write §34 catalog rows and do NOT rename
any native-parser codes before PA ratifies the approach.** Through this gate R4
has touched only the plan doc — file-disjoint from R1/R2. PA re-dispatches you
via SendMessage with the ratified approach.

## After ratification — execute
`compiler/SPEC.md` §34 amendment + `compiler/SPEC-INDEX.md` §34 row update
(line-count + summary) + any (b)-class code renames in
`compiler/native-parser/*.scrml` (and `.js` shadows) + the conformance-test
code-name updates.

## `.scrml` CANONICAL-MIRROR GUARD (post-ratification renames)
If you rename codes in any `*.scrml`, grep every touched `.scrml` for malformed
predicates — `is not not` is NOT scrml (presence is `is some`, SPEC §42.2.2a).
The native-parser `.scrml` tier is not test-run; this grep is the gate. (Memory:
`feedback_native_parser_scrml_predicate_drift.md`.)

---

# OUT OF SCOPE — do NOT do these

- The statement-catalog bridge (R1). The hoist gap (R2). The FileAST assembler
  (R3). The api.js pipeline swap (R5). M6 deletions.
- Writing §34 rows or doing renames BEFORE the STOP-gate ratification.

---

# REPORT SHAPE

`WORKTREE_PATH` · `FINAL_SHA` · `FILES_TOUCHED` · the enumerated code count ·
where the plan doc landed · the family-level recommendation (one paragraph) · the
STOP-gate escalation verbatim · maps-consulted line. (Post-ratification re-dispatch
adds: rows added / codes mapped / renames done + `.scrml`-guard result + test
counts.)

# Tags
#m5-swap #unit-r4 #s34-reconciliation #native-parser #spec-amendment #s117
