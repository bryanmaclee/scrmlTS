# DISPATCH BRIEF — bug-1 Tailwind preflight Phase 2: gradient (C-style), S191

Build the **gradient** composing family (`bg-gradient-to-*`, `from-*`, `via-*`, `to-*`) so gradients
compose via `--tw-gradient-stops` — **Approach C (inline `var()` fallbacks)**, same model Phase 1
(ring/shadow, landed `ed3fa5ee`) used. **This Phase CLOSES bug-1's filed scope** (ring-offset + gradient).

**Authority / full design:** READ FIRST →
`/home/bryan-maclee/scrmlMaster/scrml-support/docs/deep-dives/tailwind-preflight-css-2026-06-13.md`
— esp. the §"Tailwind v3 preflight model" gradient reference CSS (the `background-image` /
`--tw-gradient-from`/`-to`/`-stops` block) + the family table. Phase 1's pattern is your TEMPLATE:
`registerRing()` / `BOX_SHADOW_COMPOSE` / `ringShadowSetter` in `compiler/src/tailwind-classes.js`
(SPEC §26.7) show the C-style "each utility sets its `--tw-*` var + emits the composing shorthand
with inline fallbacks" shape — mirror it for gradient.

# MAPS — REQUIRED FIRST READ
Read `.claude/maps/primary.map.md` in full; follow §"Task-Shape Routing" (compiler-source codegen/
registry feature). Map watermark HEAD 1e17213e; `tailwind-classes.js` was last changed by Phase 1
(`ed3fa5ee`) — read the CURRENT registerRing/registerEffects (your template) directly, not the map.
Report a maps-feedback line.

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE
`pwd` MUST start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`.
1. `pwd` (save WORKTREE_ROOT; under any other repo → STOP). 2. `git rev-parse --show-toplevel` ==
WORKTREE_ROOT. 3. `git status --short` clean. 4. `bun install`. 5. `git rev-parse main` ≥ the BRIEF
commit; if base predates it, `git merge main` (Phase 1 + this brief must be present). 6. `git log
--oneline -1`. Any check fails → STOP + report.
Edits via **Bash** (perl/python/heredoc) on **worktree-absolute paths** with the `.claude/worktrees/
agent-<id>/` segment — NOT Edit/Write tools, NOT main-rooted paths. NEVER `cd` into main; use
`git -C "$WORKTREE_ROOT"`, `bun --cwd "$WORKTREE_ROOT"`, worktree-absolute paths only. First commit:
`WIP(bug-1-p2): start at $(pwd)`.

# THE TASK — gradient family, Approach C (inline fallbacks, NO global block)

## What to build (named + arbitrary)
- **`bg-gradient-to-{t,tr,r,br,b,bl,l,tl}`** (8 directions) → `background-image: linear-gradient(<dir>,
  var(--tw-gradient-stops, ...))`. Map: to-t→`to top`, to-tr→`to top right`, to-r→`to right`,
  to-br→`to bottom right`, to-b→`to bottom`, to-bl→`to bottom left`, to-l→`to left`, to-tl→`to top left`.
- **`from-{color}-{shade}`** (iterate `COLOR_PALETTE` × `COLOR_SHADES`, like registerRing's ring-color
  loop) + `from-white/black/transparent` + arbitrary `from-[#hex]`/`from-[color]`.
- **`via-{color}-{shade}`** (+ specials + arbitrary).
- **`to-{color}-{shade}`** (+ specials + arbitrary).

## The C-style gradient model (Tailwind v3, adapted to inline fallbacks)
Per the deep-dive's reference CSS:
```
.bg-gradient-to-r { background-image: linear-gradient(to right, var(--tw-gradient-stops, )) }
.from-blue-500    { --tw-gradient-from: #3b82f6 var(--tw-gradient-from-position,); --tw-gradient-to: <from-derived transparent>; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to, <transparent>) }
.via-blue-500     { --tw-gradient-to: <derived transparent>; --tw-gradient-stops: var(--tw-gradient-from, ), #3b82f6 var(--tw-gradient-via-position,), var(--tw-gradient-to, <transparent>) }
.to-purple-600    { --tw-gradient-to: #9333ea var(--tw-gradient-to-position,) }
```
Each utility sets its `--tw-gradient-*` var(s); the inline fallbacks make partial application valid
(e.g. `bg-gradient-to-r` alone → `var(--tw-gradient-stops, ...)` resolves to a default; `from-X` alone
→ a 2-stop fade). NO `*,::before,::after` defaults block (§26.1 minimalism — same as Phase 1).

## TWO fidelity micro-decisions (YOU decide via a Phase-0 survey; report your choice + rationale)
1. **Lone `bg-gradient-to-r` empty-stops fallback.** With no from/via/to, `var(--tw-gradient-stops, ?)`
   needs a valid default so the gradient is well-formed. Suggested: `var(--tw-gradient-stops, transparent, transparent)`
   (a valid, invisible gradient). Confirm this emits valid CSS.
2. **The from-color-derived `--tw-gradient-to` default.** Tailwind v3's `from-{color}` sets
   `--tw-gradient-to` to the from-color's TRANSPARENT version (e.g. from-blue-500 → `rgb(59 130 246 / 0)`)
   so a from-only gradient fades color→transparent-of-itself. Options: (a) **v3-faithful** — compute
   the transparent-version (needs hex→`rgb(r g b / 0)`; COLOR_PALETTE is hex, so a small hex→rgb helper);
   (b) **simple** — `--tw-gradient-to` default = `transparent` (valid, slight fidelity loss on the fade
   color). Lock=v3 leans (a) IF the hex→rgb helper is clean; else (b) is acceptable. Pick + document in §26.7.

## Loci
- NEW `registerGradient()` in `tailwind-classes.js` (mirror `registerRing()` ~584 — registry.set per
  class, COLOR_PALETTE × COLOR_SHADES loops; call it from the same place registerRing is called).
- Arbitrary `from-[…]`/`via-[…]`/`to-[…]` → add handlers (ARBITRARY_DECL_TRANSFORM ~1190, or the
  registerGradient arbitrary path — follow how arbitrary ring color is handled at the `"ring":` transform).
- `bg-gradient-to-*` is named-only (no arbitrary direction needed for Phase 2).
- NO change to `getAllUsedCSSWithDiagnostics` (C needs no global prepend).

## SPEC §26.7 extension (Rule 4 — coupled)
Extend the §26.7 "Composing Utilities" section (added Phase 1) to add the gradient family: the
`background-image: linear-gradient(<dir>, var(--tw-gradient-stops, …))` shorthand + the from/via/to
`--tw-gradient-*` setters with inline fallbacks; document your fidelity choices (#1, #2 above). Regen
SPEC-INDEX line ranges (`bun run scripts/regen-spec-index.ts`) if it exists.

## Tests + §6 guard invert
- Golden-CSS: `bg-gradient-to-r` → `linear-gradient(to right, var(--tw-gradient-stops, …))`.
  `from-blue-500` → `--tw-gradient-from: #3b82f6 …` + `--tw-gradient-stops`. `to-purple-600` →
  `--tw-gradient-to: #9333ea …`. `via-green-500` → 3-stop `--tw-gradient-stops`.
- COMPOSE test: `bg-gradient-to-r from-blue-500 to-purple-600` on one element → bg-image + both
  color vars + the 2-stop stops resolve (assert the gradient composes, no missing var).
- Arbitrary: `from-[#ff0000]` → `--tw-gradient-from: #ff0000 …`.
- INVERT the §6 gradient guards (`compiler/tests/unit/bug-1-tailwind-ring-family.test.js` §6, lines
  ~173-203): `bg-gradient-to-r` / `from-[#ff0000]` / `to-[#0000ff]` / `via-[#00ff00]` now RECOGNIZED →
  assert NO `W-TAILWIND-UNRECOGNIZED-CLASS` fire (was: asserts FIRE). Update the §6 describe title +
  the file-header comment (§6 line ~164, header ~12/21) to reflect gradient now recognized.

## PHASE 3 — R26 EMPIRICAL VERIFY (MANDATORY)
```
<program><page><div class="bg-gradient-to-r from-blue-500 via-green-500 to-purple-600">grad</div></page></program>
```
`bun "$WORKTREE_ROOT"/compiler/bin/scrml.js compile /tmp/bug1-p2-r26/t.scrml --output-dir /tmp/bug1-p2-r26/dist`
Assert in emitted CSS: `linear-gradient(to right, var(--tw-gradient-stops` present; `--tw-gradient-from: #3b82f6`,
`--tw-gradient-to: #9333ea`, the 3-stop via `--tw-gradient-stops` all present; emitted CSS well-formed
(balanced parens/braces); a browser would render a real gradient (no empty/undefined var in the stops).
Report the emitted gradient CSS verbatim. DO NOT mark DONE without R26 passing.

# Pre-DONE gate
`bun --cwd "$WORKTREE_ROOT" run test` (or pre-commit subset) — 0 regressions. Report pass/skip/fail.

# COMMIT DISCIPLINE (S83): commit per sub-unit (registerGradient + tests = one unit; SPEC its own OK).
`git status` clean before DONE. Coupled code+test = one commit.

# FINAL REPORT: WORKTREE_PATH, BASE_SHA, FINAL_SHA, FILES_TOUCHED; the gradient emit (a from-* setter +
the bg-gradient shorthand); your two fidelity-decision choices + rationale; test delta + pass/skip/fail;
R26 gradient CSS verbatim; §26.7 extension summary; maps feedback; deferred notes (Phase 3 transform /
Phase 4 filter remain).

Commit after each change; update
`docs/changes/bug-1-tailwind-preflight-phase2-gradient-2026-06-13/progress.md`. WIP commits expected.
If you crash, commits + progress file are the recovery anchor.
