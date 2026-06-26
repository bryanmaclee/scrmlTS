# Dispatch BRIEF — ss21 items 1+2: emit-lift request-bare-if threading + tableFor column-slot interp (LOW + MED)

**Agent:** scrml-js-codegen-engineer · **isolation:** worktree · **model:** opus · **change-id:** ss21-lift-request-tablefor-interp-2026-06-25
**Land target (sPA-side):** `spa/ss21`. **Stated base:** main `cf9f1109` (contains ss20 `8a0e9e3d`).

TWO items, both in `compiler/src/codegen/emit-lift.js` (shared file → one agent). Commit SEPARATELY (one logical fix = one commit; 2 commits expected). Reproduce RED first for each.

---

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE

## Startup verification (BEFORE any other tool call)
1. `pwd` MUST start with `/home/bryan-maclee/scrmlMaster/scrml/.claude/worktrees/agent-`. Else STOP (CWD-routing). Save WORKTREE_ROOT.
2. `git rev-parse --show-toplevel` == WORKTREE_ROOT.
3. **BASE-CURRENCY (S112 — load-bearing):** `git -C "$WORKTREE_ROOT" fetch origin --quiet && git -C "$WORKTREE_ROOT" merge origin/main` (fast-forward). Then `git -C "$WORKTREE_ROOT" merge-base --is-ancestor 8a0e9e3d HEAD` MUST succeed (ss20 landing present). If your worktree branched from a stale pre-ss20 ref, this brings it current. If the merge is NOT a clean FF, STOP and report.
4. `git status --short` clean.
5. `bun install`. 6. `bun run pretest`. Full-suite baseline = `bun run test`, NOT bare `bun test`.

If ANY check fails: STOP, report, exit.

## Path discipline (EVERY edit)
- **S126:** edits via **Bash** (`perl`/`python3`/heredoc) on **worktree-absolute paths** with the `.claude/worktrees/agent-<id>/` segment — NOT Edit/Write. Echo path before each write; re-verify via `git diff`/`grep`.
- **NEVER `cd` into main.** `git -C "$WORKTREE_ROOT"`, worktree-absolute paths only. Read only under WORKTREE_ROOT.
- **Commit-message file:** write it to a UNIQUE name (e.g. `msg-<agentid>-item1.txt`), NOT a bare `commitmsg.txt` (sibling dispatches share the session scratchpad — a bare name gets clobbered; S220 ss20 incident).

## Commit discipline
- TWO commits (item 1, item 2). Coupled code+test = one commit. Clean tree before DONE. NEVER `--no-verify` (full ~17.7k-test hook, ~108–124s; allow 300s).

---

## ITEM 1 — g-request-lift-bare-if-condition (LOW)

**Locus:** `emit-lift.js` — the bare-`if` lift-condition lowering path. **Reference (the landed D1 fix to mirror):** `g-request-lift-nested-interp-mangle` — the `requestIds` file-global threading documented at emit-lift.js ~L49-97 (`currentLiftRequestIds()` at L85). A `<#id>` ref naming a `<request>` must lower to `_scrml_request_<id>` (deep-reactive, effect-wrapped), NOT the §36 `_scrml_input_state_registry`.

**The gap (reproduce RED first):** `${ if (<#id>.loading) { <lift markup> } }` — the bare-`if` CONDITION `<#id>.loading` reads the §36 `_scrml_input_state_registry` instead of the live `_scrml_request_<id>` object → the condition never re-evaluates when the fetch resolves (loading→data) → the gated lift never appears/disappears reactively.

**Fix direction:** thread `requestIds` into the bare-`if` condition lowering the SAME way D1 threaded it into nested interpolations — so a `<#id>` in the if-CONDITION lowers to `_scrml_request_<id>.loading` and the condition sits inside the reactive effect that re-runs on fetch resolution. Reuse `currentLiftRequestIds()` / the existing push-pop machinery; do NOT add a new threading mechanism. Confirm the condition re-evaluates on loading→data.

**Test (value-asserting happy-dom, RED first):** a `<request id=foo>`; `${ if (<#foo>.loading) { <span>Loading…</span> } }`; assert the span is present while loading and gone after the fetch resolves (mutate `_scrml_request_foo` loading→false in the test). RED = condition frozen (never updates). Regression: D1's nested-interp case still works.

---

## ITEM 2 — g-tablefor-column-slot-literal-interp (MED)

**Locus:** `emit-lift.js` — the `<tableFor>` single-column-slot lift path (tableFor referenced ~L1358, L1826). This is an EACH-path caller (reconcile ctx active). **Reference:** ss20 item-4+5 lowered markup-TEXT-child `${...}` for NON-each callers gated `!currentLiftReconcileCtx()` — that fix DELIBERATELY skipped the each path. The ss17 each-body interp work (`splitEachMarkupTextChildren` in emit-each.ts) is the iter-scope-aware prior art for the EACH side.

**The gap (reproduce RED first):** a `<tableFor>` single-column slot `<code>${@row.name}</code>` renders the LITERAL string `${@row.name}` to the DOM (clean compile, non-render). It is currently MASKED by a WEAK assertion `js.toContain("row.name")` at `compiler/tests/unit/r28-bug-2-tablefor-column-row-access.test.js:207` — `"row.name"` is a substring of the literal `"${@row.name}"`, so the test passes on the BUG.

**Fix direction:** extend emit-lift's markup-text interp-lowering to the tableFor each-column-slot path, lowering `${...}` to a reactive interpolation with the column-slot's ITER scope bound (so `@row.field` resolves to the live row, re-rendering on reconcile) — matching how the ss17 each-body / per-item interp lowering threads iter-scope. Do NOT regress the ss20 `!currentLiftReconcileCtx()` non-each gate. **AND STRENGTHEN the masking test:** change `r28-bug-2-tablefor-column-row-access.test.js:207` from `js.toContain("row.name")` to a VALUE-assertion (compile + render + assert the DOM shows the actual row value, not the literal). Both in ONE commit.

**Test (value-asserting happy-dom, RED first):** `<tableFor>` with a single-column slot `${@row.name}`; assert the rendered cell shows the row's name value (not the literal `${@row.name}`); mutate a row → assert the cell updates. Adversarial (S215): multi-field `${@row.a} ${@row.b}`, nested `${@row.obj.k}`, reconcile (row reorder/replace). The strengthened r28-bug-2 test must FAIL pre-fix (on the literal) and PASS post-fix.

---

## Verification (both items)
- `bun run test` (full incl. browser) GREEN, 0 regressions vs your startup baseline. Report baseline + post counts.
- R26: recompile each reproducer; item 1 condition reactive; item 2 cell renders the value + the strengthened test value-asserts.

## Scope boundaries
- ONLY these two emit-lift paths. Do NOT refactor `emitCreateElementFromMarkup` broadly, the non-each ss20 path, or unrelated lift callers.
- If item 2 needs an emit-each.ts change beyond emit-lift (the tableFor column factory may live partly in emit-each), keep it minimal + note it; if blast radius exceeds the tableFor slot, STOP that item + report.

## Report back
Your FINAL MESSAGE is the structured return value to the sPA. Per item: commit SHA, RED→GREEN test output, emitted-JS before/after, the strengthened-test diff (item 2), `git status --short` clean confirmation, agent branch + tip SHA, and whether you merged origin/main at startup (base SHA).
