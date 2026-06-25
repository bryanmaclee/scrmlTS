# Dispatch BRIEF — ss20 items 4+5: emit-lift markup-text interpolation not lowered (MED + LOW)

**Agent:** scrml-js-codegen-engineer · **isolation:** worktree · **model:** opus · **change-id:** ss20-emit-lift-markup-text-interp-2026-06-25
**Land target (sPA-side):** `spa/ss20`. **Base:** main HEAD `bb1f2592`.

TWO items, ONE root: `emitCreateElementFromMarkup` (emit-lift.js) renders a markup **TEXT** child's `${...}` **literally** for non-each callers (the `<match>`/`<engine>` arm + S201 top-level markup-value paths). Closing item 4 closes item 5.

- **Item 4 (MED) — g-emit-lift-markup-text-interp-not-lowered:** `${...}` inside a markup TEXT child renders as literal text on the match-arm / S201 top-level markup-value paths. ss17 worked around this INSIDE the each machinery; the shared emit-lift gap remains.
- **Item 5 (LOW) — g-nested-interp-in-markup-value-literal:** `${@cell}` inside a markup-value **ternary branch** renders as literal text on the top-level S201 + arm paths. Same root — **verify it closes when item 4 lands; do NOT write a second fix.**

---

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE

## Startup verification (BEFORE any other tool call)
1. `pwd` MUST start with `/home/bryan-maclee/scrmlMaster/scrml/.claude/worktrees/agent-`. Else STOP (CWD-routing). Save WORKTREE_ROOT.
2. `git rev-parse --show-toplevel` == WORKTREE_ROOT.
3. `git status --short` clean.
4. `bun install`. 5. `bun run pretest`. Full-suite baseline = `bun run test`, NOT bare `bun test`.

If ANY check fails: STOP, report, exit.

## Path discipline (EVERY edit)
- **S126:** edits via **Bash** (`perl`/`python3`/heredoc) on **worktree-absolute paths** with `.claude/worktrees/agent-<id>/` — NOT Edit/Write. Echo path; re-verify `git diff`/`grep`.
- **NEVER `cd` into main.** `git -C "$WORKTREE_ROOT"`, worktree-absolute paths only.
- **emit-lift.js native-mirror caution (S115/S162):** if a `.scrml` native-parser mirror or a sibling `.ts` exists for this file, check whether the fix must be mirrored or whether the mirror is feature-stale (brief the conditional, don't blindly lockstep). Grep for a paired mirror before assuming.

## Commit discipline
- ONE commit (fix + coupled happy-dom test covering BOTH item 4 and the item-5 ternary case). Clean tree before DONE. NEVER `--no-verify`.

---

## The gap (reproduce RED first — construct BOTH shapes)

`emitCreateElementFromMarkup` (emit-lift.js, the export at ~L1049; the TEXT-child branch is ~L1340: `if (child.kind === "text") { … lines.push(\`${elVar}.appendChild(document.createTextNode(${JSON.stringify(text)}));\`) }`). For non-each callers it emits the text child via `JSON.stringify(text)` — so an embedded `${...}` is stringified **literally** rather than lowered to a reactive interpolation.

Note: emit-lift ALREADY has a live-keyed interpolation path for the **each/lift-loop** case (around L1015–1038, `maybeWrapLiftPerItemEffect` + `createTextNode("")` + driven `textContent`). The non-each (match-arm / S201 top-level markup-value) callers fall through to the literal `JSON.stringify` branch. Find where `emitCreateElementFromMarkup` is invoked for the match/engine arm + S201 top-level markup-value paths (grep `emitCreateElementFromMarkup` callers + `emitMarkupValueExpr`).

**Construct two RED reproducers (value-asserting happy-dom):**
- Item 4: a `<match>`/`<engine>` arm (or S201 top-level markup-value) whose markup body has a TEXT child containing `${@cell}` → assert it renders the LITERAL string `${@cell}` (the bug), not the cell value.
- Item 5: a markup-value **ternary** branch `${ cond ? <span>${@cell}</span> : "" }` on the top-level/arm path → same literal-render bug.

## Fix direction
Lower `${...}` inside markup TEXT children to a **reactive interpolation** for the non-each callers, matching the each path's shape (a `createTextNode("")` + an effect-driven `textContent`, OR the project's standard interpolation lowering for static-context text — choose to match how SIBLING non-each text interpolation is already lowered elsewhere in emit-html/emit-lift; do not invent a new shape). Requirements:
- The interpolation must be **reactive** (updates when the referenced cell changes), consistent with how top-level `${@cell}` text already lowers in the normal (non-markup-value) path.
- Scope-correct: on the match-arm / engine path, `${...}` refs resolve in the ARM's scope; on the S201 top-level path, in the top-level scope. If an arm-scope/iter-scope variable is in play, thread it the way the existing markup-value lowering does (check `emitMarkupValueExpr`). For the each path, ss17 already handles it — do NOT regress or double-lower the each path.
- Keep `JSON.stringify` for genuinely-static text (no `${}`) — only `${...}`-bearing text children get lowered.
- **DEP-AWARE:** keep parity with the S201 markup-value-in-expression semantics — do not diverge them.

## Test (value-asserting happy-dom, RED first — ONE test file covering both items)
- Item 4: match-arm markup TEXT child `${@cell}` → assert renders the cell VALUE; mutate the cell → assert the text updates (reactive).
- Item 5: ternary-branch markup-value `${cond ? <span>${@cell}</span> : ""}` → assert renders span+value when true, empty when false, and updates on cell change.
- Adversarial (S215): multiple `${}` in one text node, nested object field `${@obj.field}`, and a cell change after first render.
- Regression: the each-path markup-text interpolation (ss17 work) still renders + live-keys; genuinely-static text children unchanged.
- Paste RED (literal `${...}`) and GREEN output for both.

## Verification
- `bun run test` GREEN, 0 regressions vs baseline (report counts).
- R26: recompile both reproducers; emitted text-child JS now lowers `${...}` reactively on the non-each paths. **Explicitly confirm item 5 closes with the item-4 fix** (state it in the report).

## Scope boundaries
- ONLY markup TEXT-child `${...}` lowering for non-each callers. Do NOT refactor `emitCreateElementFromMarkup` structure, the each path, or attribute/class interpolation.
- If item 5 does NOT close with item 4's fix (different root than footprinted), report that — do NOT bolt on a second unrelated fix; STOP item 5 and report.
- Blast radius beyond emit-lift markup-text → STOP + report.

## Report back
Commit SHA, RED→GREEN output for items 4 AND 5, emitted text-child JS before/after, confirmation that item 5 closed with item 4 (or not), native-mirror decision, clean-tree confirmation, agent branch + tip SHA.
