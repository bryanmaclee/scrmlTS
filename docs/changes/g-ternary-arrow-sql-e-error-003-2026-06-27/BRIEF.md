<!-- S136 BRIEF archival. Dispatched S227 2026-06-27 via scrml-js-codegen-engineer, isolation:worktree, opus, run_in_background. agentId a705b797a7a06d149. Worktree FF-merged cf1471dd→67ed2103 (merge step baked into the brief). Tier-2 Round-1 lane B; write-disjoint (tokenizer.ts). -->

# TASK — fix `g-ternary-arrow-sql-e-error-003` (MED — diagnostic-quality: wrong error code)

change-id: `g-ternary-arrow-sql-e-error-003-2026-06-27`

## The bug
A ternary-bodied concise arrow `(x) => cond ? ?{…} : other` trips the tokenizer's ambiguity between **ternary `?`**, **propagation `?`**, and **SQL `?{`** → it fires **E-ERROR-003** (a generic/confusing tokenizer error) instead of the correct **E-SQL-009** (SQL-in-arrow is FORBIDDEN — the ratified Option-B; E-SQL-009 is the canonical fatal for SQL inside an arrow body).
**Locus:** `compiler/src/tokenizer.ts`. Wants disambiguation of `?{` in **ternary-consequent position** so it's recognized as the SQL escape-hatch (→ E-SQL-009) rather than mis-tokenized (→ E-ERROR-003).

## Context (do NOT re-open ratified design)
- This is the ternary-body SIBLING of `g-arrow-expr-body-sql-parser-truncate` (ss50 item-1, commit `2fca8075`). The ss50 `=>`-guard correctly does NOT apply here — the `lastTok` at the `?{` is `?` (the ternary `?`), not `=>`. So this needs its OWN tokenizer disambiguation.
- **Option-B is ratified: SQL-in-arrow is FORBIDDEN; E-SQL-009 is the correct fatal.** The fix is NOT to make SQL-in-ternary-arrow WORK — it's to make the diagnostic CORRECT (fire E-SQL-009, the SQL-in-arrow-forbidden error, consistent with ss50 item-1's resolution and the issue-#12 Option-B ban). Do not lower/emit the SQL.
- Read `git show 2fca8075 -- compiler/src/ast-builder.js` (ss50 item-1) + grep `E-SQL-009` and `detect-sql-in-arrow.ts` to see how the forbidden-SQL-in-arrow path surfaces for the non-ternary shapes, and mirror that diagnostic for the ternary-consequent `?{`.

## The fix
In `tokenizer.ts`, disambiguate `?{` appearing in ternary-consequent position (after a ternary `?` inside an arrow body): recognize it as the SQL escape-hatch token so the downstream SQL-in-arrow detector fires **E-SQL-009**, not E-ERROR-003. Be precise — do NOT break: legitimate ternaries `cond ? a : b`, propagation `?` (`x?.y`, `expr?`), or the already-handled `=>`-direct/return SQL-in-arrow shape (ss50 item-1 must stay intact). Surgical.

## Verification
1. Regression test in `compiler/tests/` asserting: `(x) => cond ? ?{…} : other` now fires **E-SQL-009** (not E-ERROR-003); AND the no-regression cases — plain ternary `(x) => cond ? a : b` parses clean, propagation `?` unaffected, ss50 item-1 `=>`-direct/return SQL-in-arrow still fires its E-SQL-009 cleanly (16/16 sql-in-arrow diagnostic suite stays green).
2. **Empirical:** compile a `.scrml` repro with the ternary-bodied SQL arrow via `bun "$WORKTREE_ROOT"/compiler/bin/scrml.js compile <file>`; confirm a single clean **E-SQL-009** (not E-ERROR-003, no raw `?{` leak).
3. Full `bun run test` green before DONE.

## MAPS — REQUIRED FIRST READ
After the startup/merge steps below, read `.claude/maps/primary.map.md` in full; Task-Shape Routing for a tokenizer/parse-diagnostic fix → structure.map.md (tokenizer/native-parser tables), error.map.md (§34/§34.1 codes). Maps current as of HEAD `67ed2103` (you'll FF to it). Report: "Maps consulted: [list]; load-bearing finding: <one sentence>" OR "not load-bearing."

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE
## Startup (BEFORE any other tool call)
1. `pwd` via Bash. MUST start with `/home/bryan-maclee/scrmlMaster/scrml/.claude/worktrees/agent-`. If it's the bare main checkout (`/home/bryan-maclee/scrmlMaster/scrml`) or another repo, STOP and report. Save as WORKTREE_ROOT.
2. `git rev-parse --show-toplevel` MUST equal WORKTREE_ROOT.
3. **`git merge main`** — your worktree branched from session-start `cf1471dd`; main has advanced to `67ed2103` (docs/maps/bookkeeping-only, ZERO compiler source). Clean FAST-FORWARD (nothing committed yet) → gives you current maps. `compiler/src/tokenizer.ts` is byte-identical across that range. Confirm HEAD now `67ed2103`.
4. `git status --short` clean (NOTE: `import-resolution/*.scrml` may show deleted after the suite runs — known pre-existing test side-effect, ignore).
5. `bun install`.
6. `bun run pretest`.
If any check fails: STOP and report.
## Path discipline (EVERY edit)
- Per S126: edit via Bash (`perl`/`python3`/heredoc/`cp`) on WORKTREE_ROOT-absolute paths including the `.claude/worktrees/agent-<id>/` segment — NOT Edit/Write tools. Echo target path before each write; re-verify with `git diff`/`grep` after.
- NEVER a bare-main-root path. NEVER `cd` into main. Use `git -C "$WORKTREE_ROOT"`, `bun --cwd "$WORKTREE_ROOT"`, worktree-absolute paths only.

# Commit discipline (S83)
Commit per sub-bucket immediately. First commit message includes verbatim `pwd` (`WIP(g-ternary-arrow): start at <pwd>`). `git status` clean before DONE.

# Final report
WORKTREE_PATH · FINAL_SHA · FILES_TOUCHED · before/after error code on the repro (E-ERROR-003 → E-SQL-009) · sql-in-arrow diagnostic suite count · full-suite counts · maps feedback. Files in scope: `compiler/src/tokenizer.ts` + new test file. This is write-DISJOINT from parallel lanes editing `emit-expr.ts`, `emit-client.ts`, and `native-parser/*` — do NOT touch those.
