# Bug 2a — `<InfoStep />` not inlined inside if-chain branches

Dispatch: v0.3-batch-2 Trio B (background, worktree-isolated).
Worktree: `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a72094f533f20bb3b`.

## Step log

- **T0** Startup verification PASS (`pwd`, `git rev-parse`, clean tree, `bun install`, `bun run pretest`).
- **T1** Read primary.map / structure.map / error.map; read BRIEFING-ANTI-PATTERNS and PA-SCRML-PRIMER §7.
- **T2** Reproduced bug — `examples/dist/05-multi-step-form.html` line 25 contains literal `<InfoStep />`, `<PreferencesStep />`, `<ConfirmStep />` inside the `data-scrml-chain-branch` divs. Component bodies are not inlined.
- **T3** Root-cause located. `compiler/src/component-expander.ts` `walkAndExpand` has zero references to `if-chain` — the AST node kind for TAB-collapsed if=/else-if=/else markup chains. Chain branches `{condition, element}` are stored in `if-chain.branches[]` and `if-chain.elseBranch`. When the walker hits an `if-chain` node it falls through to the "all other node kinds: pass through unchanged" tail (line 2099-2100), leaving any user-component markup nodes inside the chain elements unexpanded. Same shape as Bug 6 silent-drop.
- **T4** Fix landed in `component-expander.ts` (`walkAndExpand` if-chain arm + `walkAndExpandSingleMarkup` helper) + `hasAnyComponentRefs` + `markupTreeHasComponentRef` (CE-skip-gate parity) + `validators/ast-walk.ts` (VP-2 backstop so E-COMPONENT-035 catches if-chain residuals).
- **T5** Re-compiled fixture — HTML output now inlines the `<div class="step">…</div>` body of each step component inside the chain-branch divs. Verified visually in `examples/dist/05-multi-step-form.html` lines 25-64.
- **T6** Committed primary fix (1f969e2). Pre-commit hook ran 10851/85/1/0; clean.
- **T7** Authored `compiler/tests/unit/ce-if-chain-recursion.test.js` — 8 tests, 6 sections (consequent / else-if / else / combined / hasAnyComponentRefs gate / ast-walk backstop). All 8 PASS.
- **T8** Test-suite delta verified: unit 9132/37/0/0 (was 9124 — +8 from new file), integration 1414/18/1/0, conformance 313/30/0/0. No regressions.
- **T9** Bug 2b verification — **NOT closed on this branch**. Brief said HEAD was `d8ea41c` (post-S87 Trio A) which contains Bug 1 fix-B's regex `::(?=...)` rewrite. Worktree HEAD `7a00b1b` is `wrap(s86): close` BEFORE the S87 Trio A landed. `git merge-base --is-ancestor d8ea41c 7a00b1b` returns false. `expression-parser.ts` does NOT have the `::(?=\s*[A-Z])` → `.` regex. Compiled `client.js` shows literal `Step::Info` / `Step::Preferences` in the if-chain dispatcher (would throw SyntaxError at script load) AND in the match-arm body `_scrml_reactive_set("currentStep", Step)` — only `Step` not the variant string.

## Verdict

**DONE for Bug 2a.** Component bodies now inline correctly inside if-chain branches at all three positions (consequent / else-if / else). Test surface +8 unit tests. No regressions in unit/integration/conformance.

**Bug 2b remains open on this branch.** Prevents the e2e from passing because the compiled `client.js` has literal `Step::Info` (invalid JS) — script never loads, so the chain dispatcher never runs and all branches stay `display:none`. AC1-AC6 will not pass until Bug 1 fix-B lands on this branch.
