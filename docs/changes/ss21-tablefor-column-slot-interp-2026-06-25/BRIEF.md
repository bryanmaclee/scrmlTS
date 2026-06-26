# Dispatch BRIEF — ss21 item 2 (RE-DISPATCH): g-tablefor-column-slot-literal-interp (MED)

**Agent:** scrml-js-codegen-engineer · **isolation:** worktree · **model:** opus · **change-id:** ss21-tablefor-column-slot-interp-2026-06-25
**Land target (sPA-side):** `spa/ss21`. **Stated base:** main `cf9f1109` (== origin/main; contains ss20 `8a0e9e3d`).
**Why re-dispatch:** the original combined items-1+2 agent committed item 1 then disconnected mid-response before starting item 2. Item 1 (emit-reactive-wiring.ts) is landed separately and is INDEPENDENT of this item (different file). Do ONLY item 2.

ONE item in `compiler/src/codegen/emit-lift.js` (the tableFor single-column-slot lift path). Reproduce RED first.

---

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE

## Startup verification (BEFORE any other tool call)
1. `pwd` via Bash MUST start with `/home/bryan-maclee/scrmlMaster/scrml/.claude/worktrees/agent-`. Else STOP (CWD-routing). Save WORKTREE_ROOT.
2. `git rev-parse --show-toplevel` == WORKTREE_ROOT.
3. **BASE-CURRENCY (S112):** `git -C "$WORKTREE_ROOT" fetch origin --quiet && git -C "$WORKTREE_ROOT" merge origin/main` (FF). Then `git -C "$WORKTREE_ROOT" merge-base --is-ancestor 8a0e9e3d HEAD` MUST succeed. Non-clean FF → STOP + report.
4. `git status --short` clean.
5. `bun install`. 6. `bun run pretest`. Full-suite baseline = `bun run test`, NOT bare `bun test`.

If ANY check fails: STOP, report, exit.

## Path discipline (EVERY edit)
- **S126:** edits via **Bash** (`perl`/`python3`/heredoc) on **worktree-absolute paths** with `.claude/worktrees/agent-<id>/` — NOT Edit/Write. Echo path; re-verify `git diff`/`grep`.
- **NEVER `cd` into main.** `git -C "$WORKTREE_ROOT"`, worktree-absolute paths only.
- **Commit-message file:** UNIQUE name (`msg-<agentid>-tablefor.txt`), NOT bare `commitmsg.txt` (sibling-scratchpad clobber; S220).

## Commit discipline
- ONE commit (fix + coupled happy-dom test + the strengthened r28-bug-2 test). Clean tree before DONE. NEVER `--no-verify` (full hook ~108–124s; allow 300s).

---

## The gap (reproduce RED first)
**Locus:** `emit-lift.js` — the `<tableFor>` single-column-slot lift path (tableFor referenced ~L1358, L1826). This is an EACH-path caller (reconcile ctx active). **Reference:** ss20 item-4+5 lowered markup-TEXT-child `${...}` for NON-each callers gated `!currentLiftReconcileCtx()` — that fix DELIBERATELY skipped the each path. The ss17 each-body interp work (`splitEachMarkupTextChildren` in emit-each.ts) is the iter-scope-aware prior art for the EACH side.

A `<tableFor>` single-column slot `<code>${@row.name}</code>` renders the LITERAL string `${@row.name}` to the DOM (clean compile, non-render). Currently MASKED by a WEAK assertion `js.toContain("row.name")` at `compiler/tests/unit/r28-bug-2-tablefor-column-row-access.test.js:207` — `"row.name"` is a substring of the literal `"${@row.name}"`, so the test passes on the BUG.

## Fix direction
Extend emit-lift's markup-text interp-lowering to the tableFor each-column-slot path, lowering `${...}` to a reactive interpolation with the column-slot's ITER scope bound (so `@row.field` resolves to the live row, re-rendering on reconcile) — matching how the ss17 each-body / per-item interp lowering threads iter-scope. Do NOT regress the ss20 `!currentLiftReconcileCtx()` non-each gate. **AND STRENGTHEN the masking test:** change `r28-bug-2-tablefor-column-row-access.test.js:207` from `js.toContain("row.name")` to a VALUE-assertion (compile + render + assert the DOM shows the actual row value, not the literal). Both in ONE commit.

## Test (value-asserting happy-dom, RED first)
- `<tableFor>` with a single-column slot `${@row.name}`; assert the rendered cell shows the row's name value (not the literal `${@row.name}`); mutate a row → assert the cell updates. Adversarial (S215): multi-field `${@row.a} ${@row.b}`, nested `${@row.obj.k}`, reconcile (row reorder/replace). The strengthened r28-bug-2 test must FAIL pre-fix (on the literal) and PASS post-fix.

## Verification
- `bun run test` (full incl. browser) GREEN, 0 regressions vs your startup baseline. Report baseline + post counts.
- R26: recompile the reproducer; the cell renders the value + the strengthened test value-asserts.

## Scope boundaries
- ONLY the tableFor column-slot interp path + the r28-bug-2 test strengthen. Do NOT refactor `emitCreateElementFromMarkup` broadly or the non-each ss20 path.
- If the fix needs an emit-each.ts change beyond emit-lift (the tableFor column factory may live partly in emit-each), keep it minimal + note it; if blast radius exceeds the tableFor slot, STOP + report.

## Report back
Your FINAL MESSAGE is the structured return value to the sPA. Report: commit SHA, RED→GREEN test output, emitted-JS before/after, the strengthened-test diff, clean-tree confirmation, agent branch + tip SHA, base SHA after origin/main merge.
