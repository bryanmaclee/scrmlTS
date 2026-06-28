You are a dev-agent in an ISOLATED git worktree on the scrml compiler (branch off origin/main). This is a VERIFY-FIRST / confirm-dead-then-prune task. Do NOT remove a live guard — only prune if you PROVE it dead.

WORKTREE DISCIPLINE: Write ONLY via worktree-relative or worktree-absolute paths. NEVER write to a main-checkout absolute path. Verify `git rev-parse --show-toplevel` is your worktree before any write.

FIRST ACTION: archive this brief verbatim to `docs/changes/g-detect-sql-case-a-prune-2026-06-27/BRIEF.md` (in your worktree) and commit it.

## Background

`compiler/src/codegen/detect-sql-in-arrow.ts` fires `E-SQL-009` for a `?{}` SQL block inside a CONCISE arrow body. It has TWO detection cases inside `detectSqlInConciseArrowBody`:
- **Case B** (`conciseArrowBodyHasSql` + the `textOf(n)` check, ~lines 149-154): fires when a node's retained text contains a `=>` and a `?{`...` SQL opener inside a concise arrow body.
- **Case A** (the sibling-pair detector inside the `for (const k in n)` array loop, ~lines 160-167): fires when an array element's retained text ENDS WITH `=>` AND the very next sibling `v[i+1]` is an `sql` node. This caught the PRE-ss50 shape where the parser ORPHANED the `?{}` as a sibling `sql` node + left a dangling `=>` ParseError escape-hatch (S5 concise-direct `const ins = (x) => ?{...}.run()`, S11 concise-return `return (x) => ?{...}.run()`).

The ss50 item-1 parser fix (commit `2fca8075`, `ast-builder.js`) changed parsing: a concise-body arrow `(x) => ?{…}` now captures the full `?{}` into the SAME escape-hatch (`nativeKind=ArrowFunctionExpression`, `?{}` in `.raw`) as the block-body form — so the SQL no longer orphans as a sibling. Case A's trigger (dangling `=>` + sibling `sql` node) may therefore be UNREACHABLE now, with Case B covering those shapes via the retained `.raw` text. The comment block at the top of the file (~lines 14-26) describes Case A vs Case B — read it.

## Task

1. **PROVE whether Case A is dead.** Determine whether the Case A branch (`textOf(cur).trimEnd().endsWith("=>") && isSqlNode(v[i + 1])`) fires on ANY input. Use real evidence, e.g.: add temporary instrumentation (a counter/log on the Case A `fire(...)` path), run the full suite + compile the corpus, and observe zero Case-A fires; AND construct the exact pre-ss50 motivating fixtures:
   - S5 concise-direct: `const ins = (x) => ?{` + "`...`" + `}.run()`
   - S11 concise-return: `return (x) => ?{` + "`...`" + `}.run()`
   Confirm each STILL fires a single clean `E-SQL-009` today — but now via Case B (or the parser fix), NOT Case A. (Instrument which case fired.)

2. **If Case A is PROVEN dead** (zero live fires; Case B covers all pre-ss50 shapes): PRUNE the Case A branch (the `cur ... endsWith("=>") && isSqlNode(v[i+1])` block + the now-unused `isSqlNode` helper if it becomes dead). Update the file header comment to reflect Case A's removal. Update tests in `compiler/tests/integration/sql-in-arrow-body-diagnostic.test.js` so coverage of the pre-ss50 shapes asserts they STILL error (via Case B) — do NOT delete that coverage, re-point it.

3. **If a LIVE shape still trips Case A** (Case B does NOT cover it): do NOT prune. Report it as "intentional safety net — KEEP" with the EXACT reproducing shape and which case fired. Make a no-op (or only a clarifying doc-comment). This becomes a PARKED item — say so explicitly in your report.

## ADVERSARIAL
The exact pre-ss50 arrow-body `?{}` shapes that motivated Case A (S5, S11) MUST still error after any prune — construct them and confirm `E-SQL-009` fires (NOT silent compile, NOT an `E-CODEGEN-INVALID-JS` leak). Also exercise the native parser path (`--parser=scrml-native`): per the file's SCOPE note (lines 40-46), Case A/B are LIVE-pipeline; native may false-NEGATIVE — that's acceptable, but confirm NO CRASH (the walk is null-safe).

## R26 + suite
Compile + behavior verification on the constructed fixtures. Full `bun run test` → 0 regressions. The pre-commit hook runs the full suite (~17.6k+ tests, ~108-124s); NEVER `--no-verify`. Foreground commits may need a long timeout.

## Commit discipline
Incremental commits; code + coupled test = ONE commit (S113). `git commit -F <file>` if the message has `${}`/backticks.

## Files (edit ONLY these)
- `compiler/src/codegen/detect-sql-in-arrow.ts`
- `compiler/tests/integration/sql-in-arrow-body-diagnostic.test.js`
- `docs/changes/g-detect-sql-case-a-prune-2026-06-27/BRIEF.md`

## Report back
branch · tip SHA · the DEAD-or-LIVE verdict with EVIDENCE (how you proved it — instrumentation output, which case fired on S5/S11) · what you pruned (or why you kept = PARKED) · R26 results · full `bun run test` pass/fail counts.
