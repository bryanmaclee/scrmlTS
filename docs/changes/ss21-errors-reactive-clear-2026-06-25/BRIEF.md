# Dispatch BRIEF — ss21 item 5: g-errors-anchor-not-reactively-clearing (MED)

**Agent:** scrml-js-codegen-engineer · **isolation:** worktree · **model:** opus · **change-id:** ss21-errors-reactive-clear-2026-06-25
**Land target (sPA-side):** `spa/ss21`. **Stated base:** main `cf9f1109` (== origin/main; contains ss20 `8a0e9e3d`).

ONE gap: a `_scrml_reactive_subscribe` on a DERIVED cell never fires → the `<errors of=@cell.field/>` anchor DOM does not reactively clear when the field becomes valid. Heaviest ingestion (runtime reactivity) — ordered last in the list.

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
- **Commit-message file:** UNIQUE name (`msg-<agentid>-errors.txt`), NOT bare `commitmsg.txt` (sibling-scratchpad clobber; S220).

## Commit discipline
- ONE commit (fix + coupled happy-dom test). Clean tree before DONE. NEVER `--no-verify`.
- **If you touch `compiler/src/runtime-template.js`** (load-bearing shared runtime): the FULL browser suite + a within-node allowlist re-baseline are mandatory; report any fixture-shape drift.

---

## The gap (reproduce RED first)
A `<errors of=@cell.field/>` anchor (per §41.14 / §55.5 form validity surface) subscribes its render to the DERIVED validity cell (`@cell.field.errors`) via `_scrml_reactive_subscribe`. But (confirmed in the ss20 item-2 investigation): `_scrml_reactive_set` fans out dirtied DERIVED cells only via `_scrml_trigger` / effect re-runs — it NEVER fires the legacy `_scrml_subscribers` callback list (those fire only on a DIRECT set of that key, which never happens for a derived cell). So when the underlying source field becomes valid and the derived `.errors` recomputes to empty, the errors anchor's subscribe callback never runs → the DOM keeps showing the stale error.

**Reproduce RED (value-asserting happy-dom):** a form-group field with `<errors of=@form.field/>`; make the field invalid (error shows), then set the field valid (so the derived `.errors` recomputes empty); assert the errors anchor DOM does NOT clear (the bug). Mirror the ss20 item-2 deferred-finding repro (`g-compound-bind-value-source-cell.browser.test.js` NOTE block documents it).

## Fix direction — choose the more correct + contained option; justify in the commit body
- **Option A (runtime, errors-emitter-agnostic):** in `runtime-template.js`, make a DERIVED cell's recompute/dirty-propagation ALSO fire its `_scrml_subscribers` callbacks (not only `_scrml_trigger`/effects), so a `_scrml_reactive_subscribe` on a derived cell fires when it recomputes. Broadest fix (any subscribe-on-derived benefits). LOAD-BEARING file → full browser suite + within-node re-baseline mandatory.
- **Option B (errors emitter):** change the `<errors>` anchor wiring (the `_scrml_render_errors` errors-element path — emit-event-wiring.ts ~L830, and/or emit-form-for.ts) to drive its render from `_scrml_effect` (auto-tracks the derived read) instead of `_scrml_reactive_subscribe`. Narrower; matches how other reactive DOM updates already work.

Prefer the option that (a) doesn't regress other subscribe callers and (b) keeps the errors anchor consistent with the rest of the reactive-DOM machinery. **NOTE for the sPA reconciliation:** a sibling ss21 item (if-chain display gate) also edits `emit-event-wiring.ts` (a DIFFERENT region — the `if-chain-branch`/`if-chain-else` gate); if you pick Option B, keep your edit localized to the `errors-element` / `_scrml_render_errors` region so the two reconcile cleanly.

## Test (value-asserting happy-dom, RED first)
- `<errors of=@form.field/>`: field invalid → error text present; field set valid → assert the errors anchor DOM CLEARS (empty). Adversarial (S215): re-invalidate → error re-appears; two fields independently; submit-gated error strategy if applicable. Regression: a NON-derived (direct) subscribe still fires; existing errors-render tests stay green.
- Paste RED (stale error) and GREEN output.

## Verification
- `bun run test` (full incl. browser) GREEN, 0 regressions vs baseline (report counts). If you touched runtime-template.js: within-node re-baseline + confirm no fixture drift.
- R26: recompile the repro; the errors anchor clears on derived recompute.

## Scope boundaries
- ONLY the errors-anchor reactive-clear (the derived-subscribe path). Do NOT redesign the validity surface, formFor, or the broader subscribe mechanism beyond what's needed.
- If Option A's blast radius (all derived subscribers firing) risks broad regressions, prefer Option B; if neither is contained, STOP + report.

## Report back
Your FINAL MESSAGE is the structured return value to the sPA. Report: commit SHA, RED→GREEN output, Option A-vs-B decision + why, the files/regions touched (flag if you edited emit-event-wiring.ts and WHICH region), whether runtime-template.js was touched (+ re-baseline result), clean-tree confirmation, agent branch + tip SHA, base SHA after origin/main merge.
