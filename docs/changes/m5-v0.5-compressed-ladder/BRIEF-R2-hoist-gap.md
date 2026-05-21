# DISPATCH BRIEF — M5-swap Unit R2: declaration hoist gap

**Status:** dispatch-ready, S117. **Estimate:** 10-16h.
**Authority:** `compiler/native-parser/M5-SWAP-residual-decomposition.md` Unit R2 ·
`BRIEF-M5-SWAP.md` Phase 0 escalation · DD #27.
**Agent:** `scrml-js-codegen-engineer` · `isolation: "worktree"` · `model: opus`.
**Parallel siblings:** R1 (stmt bridge) + R4 (§34 reconciliation) dispatch
alongside you — file-disjoint. R3 + R5 come after.

---

## What R2 is

`compiler/native-parser/collect-hoisted.*` returns `typeDecls` / `components` /
`machineDecls` **hard-coded empty** (its own v0.5 header states it: "NO native
kind for engine/type/component/state declarations"). F7 added native
state/sql/css **body** parsers — NOT top-level **declaration** kinds. The live
pipeline's name-resolver / symbol-table / component-expander / auth-graph all
consume those hoisted collections.

**R2 closes the gap: make `collectHoisted` actually populate `typeDecls` /
`components` / `machineDecls`** from the native parser's block stream. A pipeline
swap with this gap open is a silent correctness regression — that is why R2 is a
hard precondition of R3 (the FileAST assembler) and R5 (the swap).

---

# MAPS — REQUIRED FIRST READ

Read `.claude/maps/primary.map.md` in full, then follow §"Task-Shape Routing" for
**compiler-source bug fix / new feature** (structure + dependencies + domain).

Map currency: maps reflect HEAD `67a17dc5`. The commits since (`8c9d855b`,
`2154c474`, `95c81557`, `ca0e40ce`) are docs / README / maps only — no
compiler-source or native-parser file changed; the compiler-source maps are
current. Verify any file you find modified past `67a17dc5` via grep/Read.

Feedback: final report states "Maps consulted: [list]; load-bearing finding: <one
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
  `WIP(R2): start at $(pwd)`.

# COMMIT DISCIPLINE (two-sided rule — S83)

- After EVERY edit: `git diff <file>`; `git add <file>`; commit IMMEDIATELY. Do
  NOT batch. WIP commits expected.
- Code change + its coupled test update = ONE commit (S113). Never `--no-verify`.
- Before reporting DONE: `git status` MUST be clean.
- Update `docs/changes/m5-v0.5-compressed-ladder/progress-R2.md` after each
  meaningful step — timestamped, append-only.

---

# CONTEXT — read before starting

1. `compiler/native-parser/M5-SWAP-residual-decomposition.md` — Unit R2 is your
   scope.
2. `compiler/native-parser/collect-hoisted.scrml` (+ `.js` shadow) — the file
   whose three empty collections you fill; read its v0.5 header.
3. `compiler/src/types/ast.ts` — the live `FileAST` hoisted-collection shapes
   (`typeDecls` / `components` / `machineDecls`) you must produce.
4. The native parser's block stream — `compiler/native-parser/parse-markup.*` +
   `parse-state-body.*` — to see how `<type>` / component-def / `<engine>`
   currently surface (as Markup + state-shape constructs, per the decomposition).
5. Consumers to verify against: `compiler/src/name-resolver.ts`,
   `compiler/src/symbol-table.ts`, `compiler/src/component-expander.ts`,
   `compiler/src/auth-graph.ts` (or the auth-graph reachability files).

---

# SCOPE

1. The native parser parses `<type>` / component definitions / `<engine>` as
   markup + state-shape constructs but emits no hoistable top-level declaration
   kind. **Choose the approach** — (a) add native declaration-kind productions,
   or (b) extend `collectHoisted` to recognize them from the Markup / LogicEscape
   block stream. The decomposition recommends **(b)** — lighter, M6-neutral.
   Implement (b) unless you find a load-bearing reason for (a); surface the call.
2. Extend `collectHoisted` to populate `typeDecls` / `components` / `machineDecls`
   with the same record shapes the live `FileAST` carries.
3. Verify the `name-resolver` / `symbol-table` / `component-expander` /
   `auth-graph` consumers see the populated collections (shape-compatible).
4. Tests: hoist-walk unit tests against `<type>` / component / `<engine>`
   exemplars + a corpus diff (native `collectHoisted` output vs. the live
   pipeline's hoisted collections for the sample corpus).

## `.scrml` CANONICAL-MIRROR GUARD

`collect-hoisted` has both a `.scrml` canonical mirror and a `.js` shadow. If you
edit the `.scrml`, grep it for malformed predicates before reporting — `is not
not` is NOT scrml (presence is `is some`, SPEC §42.2.2a). The native-parser
`.scrml` tier is not test-run; this grep is the gate. (Memory:
`feedback_native_parser_scrml_predicate_drift.md` — F1/F7/F8 each shipped a
malformed `.scrml` predicate.)

## SOFT ESCALATION

If R2 exceeds ~16h or approach (b) proves infeasible and (a) is required at a
materially higher cost, STOP and report before committing to the larger path.

---

# OUT OF SCOPE — do NOT do these

- The statement-catalog bridge (R1).
- The `nativeParseFile` FileAST assembler (R3) — R2 makes `collectHoisted`
  correct; R3 calls it.
- SPEC §34 reconciliation (R4). The api.js swap (R5). M6 deletions.

---

# REPORT SHAPE

`WORKTREE_PATH` · `FINAL_SHA` · `FILES_TOUCHED` · the approach (a)/(b) decision +
rationale · which collections now populate + their record shapes · consumer
shape-compatibility verdict · `.scrml`-guard grep result · test counts
before+after · maps-consulted line · any escalation verbatim.

# Tags
#m5-swap #unit-r2 #hoist-gap #collect-hoisted #native-parser #s117
