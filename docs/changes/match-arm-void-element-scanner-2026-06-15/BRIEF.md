You are fixing a COMPILER-SOURCE bug in the scrml compiler (change-id `match-arm-void-element-scanner-2026-06-15`). This is the wave-1a GATING fix for the corpus-rewrite arc — it unblocks the 09-error-handling flagship rewrite.

# MAPS — REQUIRED FIRST READ
Before any other context, read `.claude/maps/primary.map.md` in full (~100 lines). The §"Task-Shape Routing" section tells you which additional maps to consult for a compiler-source bug fix — follow it (expect the parser/structure/error maps).
Map currency: maps reflect HEAD `a78272e5` as of 2026-06-14. HEAD is now `cd822f7a` (+1 docs-only wrap commit; no source delta). If your work touches files modified after that point, verify map content against current source via grep/Read.
Feedback: in your final report include either "Maps consulted: [list]; load-bearing finding: <one sentence>" OR "Maps consulted but not load-bearing."

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE (S99 has had MULTIPLE path-discipline leaks — do not be the next)
Your worktree is under `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-<id>/` (the harness assigns the exact path).
## Startup verification — BEFORE any other tool call:
1. `pwd` — MUST start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`. If it is under any OTHER repo (e.g. `scrml-support`), STOP and report (S90 CWD-routing failure). Save the output as WORKTREE_ROOT.
2. `git rev-parse --show-toplevel` — MUST equal WORKTREE_ROOT.
3. `git status --short` — confirm clean.
4. `git log --oneline -1` — base MUST be `cd822f7a`.
5. `bun install` (worktrees don't inherit node_modules — the pre-commit `bun test` fails without it).
6. `bun run pretest` (populates `samples/compilation-tests/dist/` for browser tests; full suite ~130 fails without it).
## Path discipline — EVERY edit:
- Use ABSOLUTE paths under WORKTREE_ROOT for all writes. NEVER a path under the bare main repo root `/home/bryan-maclee/scrmlMaster/scrmlTS/<...>` (that leaks into main).
- S126 interim mitigation: prefer applying edits via Bash (`perl`/`python3`/heredoc on worktree-absolute paths) over the Edit/Write tools; echo the target path before each write; re-verify via `git diff`/`grep` after. NEVER `cd` into the main repo (or anywhere) — use `git -C "$WORKTREE_ROOT"` and `--cwd "$WORKTREE_ROOT"` and absolute paths exclusively.
- Your FIRST commit message MUST include the verbatim `pwd` output, e.g. `WIP(void-scanner): start at <pwd>`.

# THE BUG (verified empirically this session, workflow wf_b91c9acb-ed1)
A **void HTML element** (`<input>`, `<br>`, `<img>`, and the rest of the §24 void-element registry) used as a **DIRECT CHILD of a `<match for=T on=@x>` arm body** breaks the arm-closer scanner. Two diagnostics depending on form:
- self-closed `<Editing><input type="text" bind:value=@name /></Editing>` → `E-MATCH-PARSE-001: <Editing> arm has no matching closer` + cascade `E-MATCH-NOT-EXHAUSTIVE`.
- bare un-self-closed `<Editing><input ...></Editing>` → `E-CTX-001: Unclosed <match> structural element` + `E-CTX-003`.
Root: the arm-body scanner consumes the arm/match closers AS IF they were the void element's children — it does not treat void elements as self-terminating. The SAME void element compiles fine in plain markup outside any match, and one level deep inside a non-void wrapper (`<label><input/></label>` works). This is the known-gap PA is filing as `g-match-arm-void-element-scanner` (HIGH-adjacent — it blocks any form-bearing match arm; bit the 09 flagship).

# PHASE 0 — SURVEY + STOP GATE (mandatory before any fix)
1. Locate the arm-body / arm-closer scanner for the `<match for=T on=@x>` block-form. Candidates: `compiler/src/ast-builder.js` match-block parser, the engine/match state-child parser family (`engine-statechild-parser.ts` or a match sibling), or wherever `E-MATCH-PARSE-001` is emitted. grep for `E-MATCH-PARSE-001` / `E-CTX-001` and the match-arm body scan.
2. Locate the §24 void-element registry (likely `compiler/src/html-elements.js` — an `isVoid` flag or void set). Confirm how plain-markup parsing consults it to self-terminate void tags.
3. Confirm the root cause is "the arm-body scanner does not consult the void registry." **If the real root is materially different from this localized hypothesis (e.g. it requires restructuring the match parser), STOP and report your findings before building.** If it IS the localized "make the arm-closer scanner treat §24 void elements as self-terminating," proceed.

# THE FIX
Make the `<match>` arm-body scanner treat §24 void elements as self-terminating — exactly as plain-markup parsing already does — for BOTH the self-closed (`<input/>`) and bare (`<input>`) forms. After the fix, a void element as a direct child of a match arm must parse as a leaf, not consume the closers.

# ACCEPTANCE GATE (compile-verify — do NOT report DONE without this passing)
Write a repro to a worktree-absolute /tmp-style path under WORKTREE_ROOT (or /tmp) and compile it with `bun "$WORKTREE_ROOT"/compiler/bin/scrml.js compile <file> --output-dir <outdir>`:
- A 2+-variant enum + `<match for=Phase on=@phase>` with an arm whose DIRECT child is a self-closed `<input type="text" bind:value=@name/>` → MUST compile exit 0, zero `E-` errors.
- Same with a bare `<input>` (un-self-closed) and with `<br/>`/`<img/>` → MUST compile clean.
- A void element with non-void siblings in the same arm, and multiple void children → clean.
- `node --check` the emitted client JS.
Add UNIT TESTS codifying these cases (void direct child of match arm: self-closed + bare; multiple voids; void + non-void siblings; the negative — a genuinely-unclosed non-void arm still fires E-MATCH-PARSE-001). Run the FULL suite (`bun run test`) — **0 regressions** is the contract.

# SPEC
§18.0.1 (match block-form) + §24 (void elements). The spec already implies void = self-terminating; this is a bug-close, likely no normative §-text change. If you judge a §18 clarification is warranted, note it in your report (do NOT edit SPEC.md without flagging) — PA decides.

# COMMIT DISCIPLINE (crash-recovery — your branch is the checkpoint)
- After each meaningful change: `git diff` to verify; `git add`; commit IMMEDIATELY (worktree-absolute, via `git -C "$WORKTREE_ROOT"`). Don't batch. WIP commits expected.
- Append-only `docs/changes/match-arm-void-element-scanner-2026-06-15/progress.md` after each step (timestamped).
- Before reporting DONE: `git status` MUST be clean (all work committed). "work in worktree, no commits" is NOT acceptable.
- Do NOT use `--no-verify`. If the pre-commit hook fails, diagnose — do not bypass.

# FINAL REPORT (return exactly)
- WORKTREE_PATH · BRANCH · FINAL_SHA · FILES_TOUCHED (list)
- The `pwd` from your first commit (for the leak check)
- PHASE-0 finding (root cause confirmed localized? or STOP?)
- COMPILE-VERIFY: the repro results (exit codes, E- counts, node --check) + the new unit test names + full-suite pass/fail delta
- Any SPEC-clarification recommendation
- Maps feedback line
