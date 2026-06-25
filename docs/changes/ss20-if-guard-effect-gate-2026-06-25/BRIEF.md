# Dispatch BRIEF — ss20 item 1: g-if-guard-inner-effect-not-gated (HIGH)

**Agent:** scrml-js-codegen-engineer · **isolation:** worktree · **model:** opus · **change-id:** ss20-if-guard-effect-gate-2026-06-25
**Land target (sPA-side):** `spa/ss20` (you commit on your own agent worktree branch; the sPA file-deltas your changes onto `spa/ss20`).
**Base:** main HEAD `bb1f2592` (contains the ss17 each per-item emitter landing).

ONE gap: an `if=(@x is some)` guard renders the element via a **display-toggle** but its inner `${@x.field}` interpolation effect runs **unconditionally on mount** when `@x === null` → null crash. Locus `compiler/src/codegen/emit-html.ts`.

---

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE

## Startup verification (do this BEFORE any other tool call)
1. `pwd` via Bash. Output MUST start with `/home/bryan-maclee/scrmlMaster/scrml/.claude/worktrees/agent-`. If under any OTHER repo (`scrml-support/...`, `scrml-spa-ss20/...`), STOP and report — CWD-routing failure. Save as WORKTREE_ROOT.
2. `git rev-parse --show-toplevel` MUST equal WORKTREE_ROOT.
3. `git status --short` — tree clean.
4. `bun install` — worktrees do NOT inherit `node_modules`; the pre-commit hook's `bun test` fails with "cannot find package 'acorn'" otherwise.
5. `bun run pretest` — populates `samples/compilation-tests/dist/` (gitignored; ~130 ECONNREFUSED browser failures without it). Use `bun run test` (chains pretest) for full-suite baselines, NOT bare `bun test`.

If ANY check fails: DO NOT proceed. Report and exit.

## Path discipline (enforce on EVERY edit)
- **S126 (in force):** apply file edits via **Bash** (`perl`/`python3`/heredoc/`cp`) on **worktree-absolute paths** that include the `.claude/worktrees/agent-<id>/` segment — NOT the Edit/Write tools. Echo the target path before each write; re-verify via `git diff`/`grep` after. Edit/Write have leaked into MAIN's checkout repeatedly.
- **NEVER `cd` into the main repo** or anywhere outside WORKTREE_ROOT. Use `git -C "$WORKTREE_ROOT"`, `bun --cwd "$WORKTREE_ROOT"`, worktree-absolute paths exclusively.
- Reading from main via absolute path gives WRONG content. Read only under WORKTREE_ROOT.

## Commit discipline (S83 / S113)
- ONE commit (the fix + its happy-dom test land together — coupled = one commit). `git status --short` clean before you report DONE.
- NEVER `git commit --no-verify` (the pre-commit hook runs the full ~17.6k-test suite, ~108–124s; foreground commits are fine, allow up to 300s).

---

## The gap (reproduce RED at runtime first)

Reproducer (R26-confirmed by the sPA footprint): `/tmp/ryan-verify/07-if-guard-effect.scrml` —
```
<div if=(@batch is some)>
  <h1>Batch #${@batch.batch_number} — ${@batch.recipe_name}</h1>
</div>
```
`@batch` starts `not` (null); `on mount { refresh() }` sets it async. The `if=(@batch is some)` element renders through the **display-toggle path** (emit-html.ts — search `display-toggle`, the `style.display` fallback around L1634 / L2050; this shape is NOT the clean-subtree DOM-existence path). The toggle correctly hides the element while `@batch` is null, BUT the inner interpolation effect for `${@batch.batch_number}` / `${@batch.recipe_name}` is emitted **unconditionally** and fires on mount with `@batch === null` → `null.batch_number` TypeError crashes the whole mount.

**Confirm first:** compile the repro, find the emitted JS for the inner interpolation effect, and demonstrate it reads `@batch.field` without a guard check. Then build a value-asserting happy-dom test that reproduces the crash (or the silent non-render) BEFORE fixing.

## Fix direction (converge, don't band-aid)
Gate the if=-subtree's inner interpolation effects on the **same guard condition** the display-toggle uses, so an inner effect body is a no-op (early-return) while the guard is false. Two acceptable shapes — pick the one that fits the existing display-toggle emission and note your choice in the commit body:
- (a) wrap each inner effect body in `if (!(<guardCond>)) return;` using the guard expression already computed for the display-toggle, OR
- (b) drive the inner effects from the SAME reactive gate the toggle reads, so they recompute (and short-circuit) when the guard flips.

Requirements:
- The guard condition must be the **lowered** form already in scope for the toggle (do not re-lower / re-parse `@batch is some` independently — reuse the toggle's computed predicate so they stay in lockstep).
- When the guard flips `false → true` (async populate), the inner interpolation MUST then render the real values (the effect must re-run on the flip, not stay frozen).
- Do NOT touch the clean-subtree DOM-existence (mount/unmount) path — that path already never emits the inner effect while absent. ONLY the display-toggle fallback is in scope.
- Do NOT change `show=` semantics (Vue v-show; always-rendered display-toggle with no existence guard) — `show=` SHOULD keep running its inner effects. Scope strictly to `if=` display-toggle.

## Test (value-asserting happy-dom, RED first)
- Mount the repro shape: `if=(@cell is some)` element with inner `${@cell.field}`, `@cell` initially null. Assert: (1) NO crash on mount, (2) the inner content is absent/empty while null, (3) after setting `@cell` to a real object the inner interpolation renders the correct field values, (4) setting `@cell` back to null hides again without crash.
- Adversarial (S215): nested fields (`@cell.a.b`), multiple interpolations in the subtree, and a guard that flips null→obj→null→obj. Also a sibling `show=` element in the same program must keep rendering (regression — show isn't gated).
- Paste the RED output (pre-fix crash/non-render) and the GREEN output (post-fix) in your report.

## Verification
- `bun run test` (full suite incl. browser) GREEN, **0 regressions** vs your startup baseline. Report baseline count and post-fix count.
- R26: recompile the repro; the emitted inner-effect JS now carries the guard; no mount crash.

## Scope boundaries
- ONLY this gap (display-toggle inner-effect gating). Do NOT refactor the if/show split, the clean-subtree path, or the each emitter.
- If the fix's blast radius exceeds the display-toggle inner-effect emission, or it needs a SPEC ruling, STOP, report, and exit.

## Report back
The commit SHA, the RED→GREEN test output, the emitted-JS before/after snippet for the inner effect, your (a)-vs-(b) gating decision, `git status --short` clean confirmation, and the agent branch name + tip SHA.
