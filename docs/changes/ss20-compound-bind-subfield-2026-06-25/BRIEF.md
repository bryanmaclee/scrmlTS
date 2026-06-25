# Dispatch BRIEF — ss20 item 2: g-compound-bind-value-not-two-way (HIGH)

**Agent:** scrml-js-codegen-engineer · **isolation:** worktree · **model:** opus · **change-id:** ss20-compound-bind-subfield-2026-06-25
**Land target (sPA-side):** `spa/ss20`. **Base:** main HEAD `bb1f2592`.

ONE gap: a compound `bind:value=@form.field` writes the **derived parent aggregate**, not the field's **source sub-field cell** → typing into the input never sticks (input stays empty, `@form.isValid` stuck false). Locus `compiler/src/codegen/emit-bindings.ts` (dotted-path decompose, ~L505–525, and the `bind:value` write path below it).

---

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE

## Startup verification (BEFORE any other tool call)
1. `pwd` MUST start with `/home/bryan-maclee/scrmlMaster/scrml/.claude/worktrees/agent-`. Else STOP (CWD-routing failure). Save WORKTREE_ROOT.
2. `git rev-parse --show-toplevel` == WORKTREE_ROOT.
3. `git status --short` clean.
4. `bun install` (worktrees lack node_modules; hook fails on missing 'acorn' otherwise).
5. `bun run pretest` (populates gitignored `samples/compilation-tests/dist/`). Full-suite baseline = `bun run test`, NOT bare `bun test`.

If ANY check fails: STOP, report, exit.

## Path discipline (EVERY edit)
- **S126:** edits via **Bash** (`perl`/`python3`/heredoc) on **worktree-absolute paths** with the `.claude/worktrees/agent-<id>/` segment — NOT Edit/Write. Echo path before each write; re-verify via `git diff`/`grep`.
- **NEVER `cd` into main.** `git -C "$WORKTREE_ROOT"`, worktree-absolute paths only. Read only under WORKTREE_ROOT.

## Commit discipline
- ONE commit (fix + coupled happy-dom test). Clean tree before DONE. NEVER `--no-verify` (full ~17.6k-test hook, ~108–124s; allow 300s).

---

## The gap (reproduce RED first)

Reproducer: `/tmp/ryan-verify/06-compound-form-bind.scrml` —
```
<loginForm>
  <email req pattern(/^[^@]+@[^@]+$/)> = <input type="email"/>
  <password req> = <input type="password"/>
</>
...
<input id="login-email" type="email" bind:value=@loginForm.email/>
<errors of=@loginForm.email/>
<button type="submit" disabled=!@loginForm.isValid>Sign in</button>
```
`@loginForm` is a form-group (formFor): a **derived** aggregate computed from its sub-field source cells + validators (`isValid`, per-field `email`/`password` values). The current dotted-path bind write (emit-bindings.ts) does:
```
_scrml_reactive_set("loginForm", _scrml_deep_set(_scrml_reactive_get("loginForm"), ["email"], <newVal>))
```
i.e. it `deep_set`s the **derived** `loginForm` object. Because `loginForm` is recomputed from the underlying source field cells, the deep-set is immediately overwritten on the next recompute → the input value never persists, `isValid` never flips.

**Investigate first (this is the subtle part):** find HOW form-group fields are stored at runtime — there should be a per-field SOURCE cell that `loginForm` derives from. Grep `formFor` / `_flatBindKey` / the form-group emitter (likely in emit-bindings.ts and/or a form/formFor emitter). The fix targets that source cell. Confirm the derived-vs-source split empirically before writing.

## Fix direction
Dotted-path `bind:value` whose root token is a **form-group** must read/write the field's **own source cell**, not `_scrml_deep_set` on the derived aggregate. Concretely:
- The READ (`readExpr`) should reflect the source field's current value (so the input shows what the user typed).
- The WRITE (`writeExpr`) should set the source field cell, letting `loginForm`/`isValid` re-derive naturally.
- Preserve the existing NON-form-group dotted-path behavior (plain nested object bind via `_scrml_deep_set` stays correct) and the `_flatBindKey` (Bug 58 / formFor synth) path. Only the form-group-field case changes; gate on whether the root is a form-group.

**If the source sub-field cell does not exist as a separate reactive cell** (i.e. the form-group stores only the derived aggregate with no per-field source), then this is NOT a pure codegen fix — it needs a form-group cell-model change or a SPEC ruling. In that case: **STOP, write up exactly what you found (the runtime storage shape), and report PARKED** — do not invent a cell model.

## Test (value-asserting happy-dom, RED first)
- Mount the form-group + `bind:value=@form.field`. Simulate typing into the input (set `.value` + dispatch `input` event). Assert: (1) the input's value persists, (2) reading `@form.field` reflects the typed value, (3) `@form.isValid` flips true once all req/pattern fields are valid, (4) the `<errors of=@form.field>` clears.
- Adversarial (S215): two fields (email + password), pattern-invalid then valid, and a programmatic reset. Regression: a plain (non-form-group) `bind:value=@obj.nested` still round-trips via deep_set.
- Paste RED (pre-fix: input empty / isValid stuck) and GREEN output.

## Verification
- `bun run test` GREEN, 0 regressions vs baseline (report counts).
- R26: recompile the repro; emitted bind read/write now targets the source field cell.

## Scope boundaries
- ONLY the compound form-group `bind:value` write target. Do NOT redesign formFor, validators, or the `<errors>` emitter.
- Blast radius beyond emit-bindings (e.g. needs a form-group cell-model change) → STOP + report PARKED with findings.

## Report back
Commit SHA, RED→GREEN output, emitted bind read/write before/after, the runtime form-group storage shape you found, whether you LANDED or PARKED, clean-tree confirmation, agent branch + tip SHA.
