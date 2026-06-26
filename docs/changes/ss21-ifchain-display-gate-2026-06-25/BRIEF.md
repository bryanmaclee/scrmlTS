# Dispatch BRIEF — ss21 item 3: g-if-chain-branch-display-null-interp (MED)

**Agent:** scrml-js-codegen-engineer · **isolation:** worktree · **model:** opus · **change-id:** ss21-ifchain-display-gate-2026-06-25
**Land target (sPA-side):** `spa/ss21`. **Stated base:** main `cf9f1109` (contains ss20 item-1 g-if-guard `8a0e9e3d`).

ONE gap: an `if=`/`else-if=`/`else` CHAIN branch (a SEPARATE node kind from the single-`if=` ss20 fixed) carrying reactive `${@x.field}` over a null cell has the SAME first-mount null-access the ss20 item-1 single-`if=` gate fixed. Extend that gate to the if-chain branch kinds. Locus `compiler/src/codegen/emit-html.ts` + `emit-event-wiring.ts`.

---

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE

## Startup verification (BEFORE any other tool call)
1. `pwd` MUST start with `/home/bryan-maclee/scrmlMaster/scrml/.claude/worktrees/agent-`. Else STOP (CWD-routing). Save WORKTREE_ROOT.
2. `git rev-parse --show-toplevel` == WORKTREE_ROOT.
3. **BASE-CURRENCY (S112):** `git -C "$WORKTREE_ROOT" fetch origin --quiet && git -C "$WORKTREE_ROOT" merge origin/main` (FF). Then `git -C "$WORKTREE_ROOT" merge-base --is-ancestor 8a0e9e3d HEAD` MUST succeed (the ss20 g-if-guard fix you extend is present). Non-clean FF → STOP + report.
4. `git status --short` clean.
5. `bun install`. 6. `bun run pretest`. Full-suite baseline = `bun run test`.

If ANY check fails: STOP, report, exit.

## Path discipline (EVERY edit)
- **S126:** edits via **Bash** (`perl`/`python3`/heredoc) on **worktree-absolute paths** with `.claude/worktrees/agent-<id>/` — NOT Edit/Write. Echo path; re-verify `git diff`/`grep`.
- **NEVER `cd` into main.** `git -C "$WORKTREE_ROOT"`, worktree-absolute paths only.
- **Commit-message file:** UNIQUE name (`msg-<agentid>-ifchain.txt`), NOT bare `commitmsg.txt` (sibling-scratchpad clobber; S220).

## Commit discipline
- ONE commit (fix + coupled happy-dom test). Clean tree before DONE. NEVER `--no-verify`.

---

## Read FIRST — the landed ss20 item-1 fix you are extending

`g-if-guard-inner-effect-not-gated` (ss20, in main `8a0e9e3d`; change-id `docs/changes/ss20-if-guard-effect-gate-2026-06-25`). It gated the SINGLE-`if=` display-toggle's inner interpolation effects:
- `emit-event-wiring.ts`: extracted `computeDisplayToggleCondition` (the lowered guard predicate, used by BOTH the toggle emission AND the inner-effect gate — byte-identical, lockstep); gates the reactive interpolation's initial render `if (guard) {…}` + effect body `if (!(guard)) return;`.
- `emit-html.ts`: `ifGuardStack` (mirrors boundaryStack); pushes the enclosing `if=` guard around the display-toggle children walk; stamps an `ifGuard` field onto descendant interpolation LogicBindings.
- `binding-registry.ts`: the `ifGuard` LogicBinding field.

Read that fix in full before writing.

## The gap (reproduce RED first)
An if-CHAIN — `<div if=(@x is some)>…</div> <div else-if=(@y is some)>…${@y.f}…</div> <div else>…</div>` — uses a SEPARATE node kind (`kind: "if-chain-branch" | "if-chain-else"` — see emit-event-wiring.ts ~L103; the chain `if=`/`else-if=`/`else` attrs are stripped before the generic walk, so the single-`if=` ss20 gate does NOT fire on chain branches). A chain branch carrying reactive `${@cell.field}` over a null cell crashes on first mount exactly like the single-`if=` case did pre-ss20 (null.field TypeError aborts the mount).

**Reproduce RED:** an if-chain whose a branch interpolates `${@cell.field}` with `@cell` initially null; assert the mount crashes / the field never renders even after the cell populates (mirror the ss20 item-1 RED shape, but with a CHAIN not a single if=).

## Fix direction
Extend the ss20 item-1 gate to the if-chain-branch / if-chain-else node kinds: push each chain branch's guard condition onto the `ifGuardStack` around its children walk (using the SAME `computeDisplayToggleCondition` predicate the chain branch's own display-toggle uses — so the gate is byte-identical to the branch's visibility condition, lockstep), and gate descendant interpolation effects the same way (initial render `if (guard) {…}` + effect `if (!(guard)) return;`).
- For `else-if=`: the effective guard is the branch's own condition (and, per chain semantics, the negation of prior branches if that is how the chain's display-toggle already computes visibility — MATCH whatever predicate the chain branch's existing display-toggle emits; do not invent new chain-visibility logic).
- For `else`: the guard is "no prior branch matched" — again, REUSE the chain's existing else-visibility predicate; gate descendant effects on it.
- Do NOT change the single-`if=` path (ss20, already correct), `show=`, or the clean-subtree DOM-existence path.

## Test (value-asserting happy-dom, RED first)
- An if-chain where each branch interpolates a field of a cell that starts null; assert: no crash on mount; the matching branch renders its fields once the cell populates; switching which branch matches re-renders correctly; null-back hides without crash.
- Adversarial (S215): 3-branch chain (if/else-if/else) each over a different null cell; flip which branch is active; nested field `${@c.a.b}`. Regression: the ss20 single-`if=` test + `show=` still pass.
- Paste RED (crash/frozen) and GREEN output.

## Verification
- `bun run test` GREEN, 0 regressions vs baseline (report counts).
- R26: recompile the repro; chain-branch inner effects now carry the guard; no mount crash.

## Scope boundaries
- ONLY extend the display gate to if-chain-branch/if-chain-else. Do NOT refactor the if-chain emitter, the single-`if=` path, or `show=`.
- If the chain's visibility predicate is NOT readily reusable (no `computeDisplayToggleCondition`-equivalent for chains), STOP + report (do not hand-roll a divergent chain-guard predicate).

## Report back
Your FINAL MESSAGE is the structured return value to the sPA. Report: commit SHA, RED→GREEN output, emitted inner-effect JS before/after for a chain branch, confirmation the predicate is lockstep with the chain branch's visibility toggle, clean-tree confirmation, agent branch + tip SHA, base SHA after origin/main merge.
