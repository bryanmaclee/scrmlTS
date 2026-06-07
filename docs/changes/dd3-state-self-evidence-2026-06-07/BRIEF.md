# DD3 Unit 1 BRIEF (archived per pa.md S136) — agent a72e7414375f40448

Dispatched S172, 2026-06-07. `isolation: worktree`, `general-purpose`, opus, background.
Change-id: `dd3-state-self-evidence-2026-06-07`. Verbatim prompt below.

---

# DD3 Unit 1 — Fork 2 (normalize known-gaps markers) + Fork 3A (scripts/state.ts PRINT mode)

You are implementing the FIRST unit of a ratified design (DD3 "project-state self-evidence"). This is
TOOLING + DOCS work (a TypeScript script + markdown editing) — NOT compiler-source. Do NOT touch
`compiler/src/**`. Change-id: `dd3-state-self-evidence-2026-06-07`.

## MAPS — REQUIRED FIRST READ
Before other context, read `.claude/maps/primary.map.md` in full (~100 lines). Follow its
§"Task-Shape Routing" for your task shape (tooling/docs). Map currency: maps reflect HEAD `cc69c62d`
as of 2026-06-07; HEAD is now `170424f3` but the only commits since the watermark are docs-only
(maps content is current-truth-accurate). In your final report add either "Maps consulted: [list];
load-bearing finding: <one sentence>" or "Maps consulted but not load-bearing".

## CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE
Your worktree path is assigned by the harness. BEFORE any other tool call:
1. `pwd` via Bash. Output MUST start with `/home/bryan/scrmlMaster/scrmlTS/.claude/worktrees/agent-`.
   If it's under any OTHER repo, STOP and report (S90 cwd-routing failure). Save it as WORKTREE_ROOT.
2. `git rev-parse --show-toplevel` MUST equal WORKTREE_ROOT.
3. `git status --short` — confirm clean.
4. `bun install` (worktrees don't inherit node_modules).
5. Your FIRST commit message MUST include the verbatim `pwd` output, e.g. `WIP(dd3-u1): start at <pwd>`.

PATH DISCIPLINE (S99/S126): apply ALL file edits via Bash on WORKTREE_ROOT-absolute paths that INCLUDE
the `.claude/worktrees/agent-<id>/` segment (perl -i/python3/heredoc/cp), NOT Edit/Write tools. Echo
the target path before each write; re-verify with git diff/grep after. NEVER cd into the main repo —
use git -C "$WORKTREE_ROOT", bun --cwd "$WORKTREE_ROOT", worktree-absolute paths only.

## COMMIT DISCIPLINE (S83)
Commit incrementally. After each edit: git diff, git add, commit immediately. Before DONE git status
MUST be clean.

## THE RATIFIED DESIGN (authority)
Read `scrml-support/docs/deep-dives/project-state-self-evidence-2026-06-07.md` IN FULL. Implement Fork 2
(→2A) and Fork 3 (→3C, the 3A PRINT half ONLY). Fork 1 / 3B-rewriter / Fork 4 are a SEPARATE later unit.
Also read `scripts/regen-spec-index.ts` (house style for the derive-don't-declare pattern).

## SURVEY DONE (ground truth)
docs/known-gaps.md (1527 lines): §1 HIGH (~90-761) / §2 MED (~762-1071) / §3 LOW (~1072-1399) / §4
Nominal (~1400+) / §5 / §6 / §7 / §8 / §9 are `### ` HEADER gaps (severity positional, inline status
suffix in header text). §R28 (~24-51) + §R27 (~52-89) are gauntlet-cluster TABLES (| ID | Sev | Status
| ...). §0 (13-20) is the count table. TARGET COUNT to reproduce: HIGH 0 · MED 9 · LOW 18 · Nominal 9.
DD-named ambiguous entries to classify non-open: Bug 54 (deferred), Bug 69 (non-gap), Bug 10 (nominal),
Bug 19 (forensic). Inventory: version 0.7.0; tests 938; samples 877; examples 64; SPEC 31770 lines.

## FORK 2 (→2A) token (PIN EXACTLY — Unit 2 reads it):
    <!-- @gap id=<STABLE-ID> sev=<HIGH|MED|LOW|NOMINAL> status=<open|resolved|deferred|nominal|non-gap|forensic> -->
One per gap entry, own line under each `### ` header. Generator counts sev=HIGH/MED/LOW status=open +
status=nominal. Cluster tables: determine empirically if their OPEN rows are in the canonical count;
if header-only reproduces the target, leave cluster tables as historical (document the basis). Reuse
S115 enum. Transcribe existing inline status; classify the 4 ambiguous per DD.

## FORK 3A — scripts/state.ts (bun-run, regen-spec-index.ts house style), PRINTS (writes nothing):
gap counts by sev from @gap tokens; `bun test` unit+integration+conformance pass/skip/fail; version;
last ~8 `wrap(s` session anchors from git log; inventory (test/sample/example/SPEC counts); maps
staleness (watermark commit vs HEAD). Bun built-ins only.

## VALIDATION GATE (HARD): `bun scripts/state.ts` gap section MUST reproduce HIGH 0 · MED 9 · LOW 18 ·
Nominal 9 EXACTLY. If not, reconcile tokens/basis until it does; document what you reconciled. Keep
unit+integration+conformance GREEN.

## REPORT: WORKTREE_PATH, FINAL_SHA, FILES_TOUCHED, the state.ts OUTPUT pasted, count-basis decision,
ambiguous entries reconciled, test pass/skip/fail, maps-consulted line. Commit all; git status clean.
