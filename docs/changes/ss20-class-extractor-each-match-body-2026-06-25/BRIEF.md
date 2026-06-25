# Dispatch BRIEF — ss20 item 6: g-each-match-body-class-literal-not-extracted (MED)

**Agent:** scrml-js-codegen-engineer · **isolation:** worktree · **model:** opus · **change-id:** ss20-class-extractor-each-match-body-2026-06-25
**Land target (sPA-side):** `spa/ss20`. **Base:** main HEAD `bb1f2592`.

ONE gap: class literals used ONLY inside `<each>`/`<match>` bodies emit NO CSS rule → silent unstyled render ("squashed bubbles"). The single most common "green compile, wrong render" trap (flogence cockpit, finding #3).

**Footprint correction:** the list named `tailwind-classes.js`, but that is the CSS *generator*. The actual locus is the class-name **collector**: `compiler/src/codegen/collect-class-names.ts` → `collectClassNamesFromAst(nodes)`. It (plus `scanClassesFromHtml(htmlBody)` for static HTML) feeds the set passed to `getAllUsedCSS` in `compiler/src/codegen/index.ts` (~L988–997). each/match bodies are NOT in static HTML (built imperatively), so they must be caught by `collectClassNamesFromAst` — which evidently does not recurse into each/match body subtrees.

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

## Commit discipline
- ONE commit (fix + coupled test). Clean tree before DONE. NEVER `--no-verify` (full hook ~108–124s; allow 300s).

---

## The gap (reproduce RED first)

`collectClassNamesFromAst` (collect-class-names.ts, export ~L106) walks the AST collecting `class="a b c"` static string-literal class tokens. It does NOT descend into `<each>` / `<match>` (and likely `<engine>` arm) body subtrees, so a class literal that appears ONLY inside an each/match body is never collected → `getAllUsedCSS` never emits its rule → the element renders unstyled.

Distinguish two cases (read the collector's existing handling on the static path first):
- **Non-interpolated `class="bubble px-4"`** inside an each/match body → MUST be collected (this is the fix).
- **Interpolated `class="${...}"`** (dynamic) → keeps the existing safelist behavior (do NOT try to statically resolve interpolated classes; the safelist already covers them). Match whatever the static-HTML path already does for interpolated classes.

**Reproduce RED:** compile a program whose ONLY use of some class (e.g. a distinctive utility like `rounded-2xl` or a custom `bubble`) is inside an `<each>` item body (and a second inside a `<match>` arm body); assert the generated CSS does NOT contain that class's rule (the bug). Then assert a class used in static top-level HTML IS present (control).

## Fix direction
Have `collectClassNamesFromAst` ALSO recurse into `<each>` / `<match>` (and `<engine>` arm) body subtrees, collecting their non-interpolated `class="…"` literal tokens — using the SAME token-splitting/extraction logic the collector already applies to static markup (reuse, don't fork). Requirements:
- Recurse fully (nested each-in-match, match-in-each, arbitrarily deep) — the walk must reach class literals at any body depth.
- Interpolated `class="${…}"` inside each/match bodies → leave to the safelist (do not statically extract); parity with the static-HTML path's treatment of interpolated classes.
- Do NOT double-count or change behavior for classes already collected on the static path (idempotent set union — `usedClasses` is a Set, so duplicates are harmless, but don't regress the static walk).
- Be conservative: collecting an UNUSED extra class emits a harmless extra CSS rule; MISSING a used class is the bug. Err toward inclusion, but only for genuine `class="…"` literal attrs.

## Test (RED first)
- Unit/integration test on `collectClassNamesFromAst` (or the index.ts CSS-emit path): a program with a class literal used ONLY in an `<each>` body and another ONLY in a `<match>` arm body → assert BOTH classes' CSS rules appear in the generated output. Control: a static top-level class still present; an interpolated `class="${...}"` still routes to safelist (unchanged).
- Adversarial (S215): deeply nested each-in-match; a multi-token `class="a b c"` in an each body (all three collected); a class used BOTH inside and outside an each body (collected once, rule present).
- Paste RED (missing rule) and GREEN output.

## Verification
- `bun run test` GREEN, 0 regressions vs baseline (report counts). Watch specifically for: any snapshot/golden-CSS baseline that now legitimately GAINS rules (if a fixture's expected CSS changes because previously-dropped each/match classes are now emitted, that is a CORRECT update — update the fixture and note it; if a fixture LOSES rules, that's a regression — investigate).
- R26: recompile the reproducer; the each/match-body class rules now appear.

## Scope boundaries
- ONLY collecting non-interpolated class literals from each/match/engine-arm bodies in the collector. Do NOT change the CSS generator (tailwind-classes.js), the safelist mechanism, or interpolated-class handling.
- Blast radius beyond the collector + its fixtures → STOP + report.

## Report back
Commit SHA, RED→GREEN output, the collector before/after diff, any fixture baseline updated (with why), clean-tree confirmation, agent branch + tip SHA.
