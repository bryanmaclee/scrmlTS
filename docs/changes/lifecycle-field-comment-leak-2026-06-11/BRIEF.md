# TASK — fix the lifecycle-field comment-leak parse bug (scoped: JUST the parse bug)

Change-id: `lifecycle-field-comment-leak-2026-06-11`. SCOPE doc at `docs/changes/lifecycle-field-comment-leak-2026-06-11/SCOPE.md` (read it — but use YOUR worktree path).

Commit after each meaningful change — don't batch. Update `docs/changes/lifecycle-field-comment-leak-2026-06-11/progress.md` after each step. WIP commits are expected. If you crash, your commits + progress file are how the next agent picks up.

# MAPS — REQUIRED FIRST READ

Before consuming any other context, read `.claude/maps/primary.map.md` in full (~100 lines). The §"Task-Shape Routing" section tells you which additional maps to consult — this is a **compiler-source bug fix** (route: primary + error.map + structure.map).

Map currency: maps reflect HEAD `1734b81b` as of 2026-06-11. HEAD is `3e539003` (2 commits ahead, both doc/maps-only — no source drift). `compiler/src/type-system.ts` is unchanged since the watermark; treat map content as accurate for this task.

Feedback: in your final report include either "Maps consulted: [list]; load-bearing finding: <one sentence>" OR "Maps consulted but not load-bearing".

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE

S99/S126 leak-class history: agents have leaked Edit/Write into MAIN's checkout instead of the worktree. This brief uses Bash-edits to sidestep that class.

## Startup verification (BEFORE any other tool call)
1. `pwd` via Bash. Output MUST start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`. If it's under any other repo (e.g. `scrml-support/.claude/worktrees/`), STOP and report — that's the S90 CWD-routing failure. Save the output as WORKTREE_ROOT.
2. `git -C "$WORKTREE_ROOT" rev-parse --show-toplevel` MUST equal WORKTREE_ROOT.
3. `git -C "$WORKTREE_ROOT" status --short` — confirm clean.
4. `cd "$WORKTREE_ROOT" && bun install` — worktrees do NOT inherit node_modules; the pre-commit hook's `bun test` fails with "cannot find package 'acorn'" otherwise.
5. `bun run pretest` (populates `samples/compilation-tests/dist/` so the browser suite doesn't ECONNREFUSED). Use `bun run test` (chains pretest) for any full-suite baseline.
If ANY check fails: STOP, report, exit.

## Path discipline (EVERY edit)
- **Apply ALL file edits via Bash** (`perl -i` / `python3` / heredoc / `cp`) on **worktree-absolute paths that include the `.claude/worktrees/agent-<id>/` segment** — NOT the Edit/Write tools (S126 interim mitigation; Edit/Write have leaked to MAIN).
- Echo the target path before each write; re-verify via `git -C "$WORKTREE_ROOT" diff` / `grep` after.
- NEVER `cd` into the main repo or anywhere outside WORKTREE_ROOT. Use `git -C "$WORKTREE_ROOT"`, `bun --cwd "$WORKTREE_ROOT"`, and worktree-absolute paths exclusively.
- Your first commit message MUST include the verbatim `pwd` from step 1: e.g. `WIP(comment-leak): start at <pwd>`.

# THE BUG

A trailing `//` (or `/* */`) comment on a struct-field line carrying a `to`-keyword lifecycle annotation `(A to B)` leaks into the field's TYPE-annotation string and the type is misclassified as a FUNCTION TYPE → `E-STRUCT-FUNCTION-FIELD` fires wrongly, blocking compilation of valid scrml.

```
passwordHash: (not to string)   // starts absent; transitions to string after hashing
```
→ `E-STRUCT-FUNCTION-FIELD` (WRONG).

## Root cause (PA survey — verify, then fix)
- `compiler/src/type-system.ts` `parseStructBody` (~line 1417): line ~1440 `const typeExpr = trimmed.slice(colonIdx + 1).trim();` extracts the type INCLUDING the trailing comment. `typeExpr` then flows to `resolveTypeExpr(typeExpr, ...)` AND `isFunctionShapedAnnotation(typeExpr)` (~line 1459) with the comment attached.
- `isFunctionTypeAnnotation` (~line 2087) detects lifecycle wrap via `s.startsWith("(") && s.endsWith(")")` (~line 2099). The trailing comment makes `endsWith(")")` FALSE → not-lifecycle-wrapped; `findTopLevelArrow(s)` then matches the word "to" INSIDE the comment ("transitions **to** string") → returns true (thin-arrow function type) → misclassification.

## Empirical reproducers (re-create in YOUR worktree /tmp or a scratch dir)
- T1 (the bug): a `:struct` with `passwordHash: (not to string)   // ...transitions to string...` + a `<u>: User = {...}` cell + `${ const h = @u.passwordHash }` → currently fires `E-STRUCT-FUNCTION-FIELD`.
- T2 (no comment): same without the comment → parses fine, fires `E-TYPE-001` on the pre-transition read (correct).
- T3 (comment on its own line above the field) → parses fine, fires `E-TYPE-001`.
Compile via `bun "$WORKTREE_ROOT"/compiler/bin/scrml.js compile <file> --output-dir <dir>`.

## FIX
Strip a trailing line/block comment from the field type-expr string BEFORE classification + resolution. No reusable comment-strip helper exists in `compiler/src/*.ts` — add a small local helper. Make it comment-aware enough not to strip a `//` inside a string literal in the type-expr (near-impossible in a type annotation, but be defensive).

**SURVEY the parallel loci FIRST** (don't assume struct-field is the only one — use a comment CONTAINING "to" or "->" to test each): inline-struct field parse (the `parseStructBody`-equivalent for inline `{ ... }` cell types, ~line 2562), fn-return lifecycle, fn-param lifecycle, Shape-1 cell-type lifecycle, schema/channel field. Apply the strip wherever the same comment-leak reproduces. If a single central strip (at the entry of `isFunctionTypeAnnotation` AND wherever the raw type-expr is extracted/resolved) cleanly covers all loci, prefer that over N scattered strips — your call after the survey. Report which loci you found leaking and which you fixed.

# SCOPE GUARD — "just the parse bug" (user ruling)
- DO: fix the comment-leak at every leaking locus + regression tests.
- DO NOT change E-TYPE-001 tracking semantics.
- DO NOT touch these two known incidentals (explicitly OUT of scope): (1) E-TYPE-001 double-fires on a single read; (2) W-LINT-007 ghost-pattern lint false-positive on struct object literals `{ id: 1, ... }`.
- ZERO behavior change except: a type-expr with a trailing comment now strips the comment before classification. Verify nothing else moves.

# TESTS (required)
- Add regression tests (unit, in `compiler/tests/unit/`) asserting: a `:struct` lifecycle field WITH a trailing `//` comment (and a `/* */` comment) does NOT fire `E-STRUCT-FUNCTION-FIELD` and DOES fire `E-TYPE-001` on a pre-transition read; a genuine function-typed struct field (`onTick: () -> void` / `cb: (x) => y`) STILL fires `E-STRUCT-FUNCTION-FIELD` (don't over-strip). Cover every locus you fixed.
- Run the FULL suite (`bun run test`) — 0 regressions is the contract. Record before/after pass/skip/fail counts.

# R26 EMPIRICAL VERIFICATION (S138 — mandatory before claiming DONE)
Re-compile the reproducers on your post-fix baseline and confirm:
- T1 (lifecycle field + trailing comment): `E-STRUCT-FUNCTION-FIELD` count drops to 0; `E-TYPE-001` fires on the pre-transition read.
- A real function-typed struct field: `E-STRUCT-FUNCTION-FIELD` STILL fires (no over-strip).
- `node --check` (or compile exit 0 where expected) on emitted output for a valid post-fix program.
DO NOT mark DONE without this passing.

# COMMIT DISCIPLINE (S83)
- After EVERY edit: `git -C "$WORKTREE_ROOT" diff <file>` to verify; `git -C "$WORKTREE_ROOT" add <file>`; commit immediately. Don't batch.
- Before reporting DONE: `git -C "$WORKTREE_ROOT" status --short` MUST be clean. "work in worktree, no commits" is NOT an acceptable terminal report.
- The pre-commit hook runs the test subset; do NOT use `--no-verify`.

# FINAL REPORT (return as your last message)
- WORKTREE_PATH, FINAL_SHA, FILES_TOUCHED (list), BRANCH.
- Loci surveyed + which leaked + which you fixed + your insertion-point decision + why.
- Test counts before/after (full suite). New test file/count.
- R26 results (T1 no E-STRUCT-FUNCTION-FIELD + fires E-TYPE-001; real function field still rejected).
- Maps feedback line.
- Any deferred/surprising findings.
