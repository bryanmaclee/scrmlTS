# DISPATCH BRIEF — Tailwind lint false-positive on dynamic-class static prefix

Change-id: `tailwind-dynamic-class-prefix-2026-06-11`. You are `scrml-js-codegen-engineer`, worktree-isolated. This is a **lint-precision fix — no codegen, no SPEC, no new error codes.**

# MAPS — REQUIRED FIRST READ
Read `.claude/maps/primary.map.md` in full first. Maps reflect HEAD `dc6d11c9` as of `2026-06-11`. Report "Maps consulted: [list]; load-bearing finding: <sentence>" or "not load-bearing."

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE
Your worktree path = `pwd` → WORKTREE_ROOT.
1. `pwd` MUST start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`. Else STOP + report (S90). Save as WORKTREE_ROOT.
2. `git rev-parse --show-toplevel` == WORKTREE_ROOT.
3. `git status --short` clean.
4. `git merge main` (or confirm base includes HEAD `dc6d11c9`).
5. `bun install` (worktrees don't inherit node_modules).
6. `bun run pretest`.

## Path discipline (S99/S126 — strict)
- **Apply ALL edits via Bash** (`perl -i`/`python3`/heredoc) on **worktree-absolute paths including `.claude/worktrees/agent-<id>/`** — NOT Edit/Write. Echo path before each write; `git diff`/`grep` after.
- **NEVER `cd` into the main repo** or outside WORKTREE_ROOT. `git -C "$WORKTREE_ROOT"`, worktree-absolute paths, `--cwd "$WORKTREE_ROOT"` for bun.
- **DO NOT use `--no-verify`** (not authorized).
- First commit message includes verbatim `pwd`: `WIP(tailwind-dynclass): start at $(pwd)`.

# THE TASK

`class="driver-${@status}"` fires `W-TAILWIND-UNRECOGNIZED-CLASS` on the static prefix `'driver-'` — a runtime-concatenation fragment, never a complete utility. High-frequency (state/BEM/theme class names). Read the full scope at `docs/changes/tailwind-dynamic-class-prefix-2026-06-11/SCOPE-AND-DECOMPOSITION.md` in your worktree.

## Root (single seam — `compiler/src/tailwind-classes.js`)
- `maskInterpolations(value)` (~line 2080) replaces every `${...}` with **spaces** (length-preserving).
- `findUnrecognizedClasses` (~line 2268) masks then `/\S+/g`-splits → `driver-${@status}` → token `driver-` (the prefix before the now-whitespace mask) → fails `getTailwindCSS()` → lints.
- Same `maskInterpolations` feeds `findUnsupportedTailwindShapes` (W-TAILWIND-001, ~line 2149) — same fragment-splitting issue; fix BOTH loops.

## Fix
In both scan loops, **skip any `/\S+/` class token directly adjacent to (no-whitespace boundary) OR overlapping a `${}` interpolation region** — it's a dynamic-class fragment, statically un-validatable.
- Compute the `${...}` ranges of the ORIGINAL `attrValue` (brace-balanced — `maskInterpolations` already does this scan; factor a helper that returns the ranges, OR compute alongside). Indices map 1:1 to the masked string (mask preserves length).
- For each token `[tStart, tEnd)`: skip if an interpolation range is immediately adjacent (`intpStart === tEnd` OR `intpEnd === tStart`) or overlaps. Whitespace-separated tokens (`class="flex ${x} grid"`) are NOT adjacent → still validated.
- If you refactor `maskInterpolations` to also return ranges, **preserve its existing masked-string return** for current callers.

## Tests (extend the existing `tailwind-classes` test file)
- `class="driver-${@status}"` → NO W-TAILWIND-UNRECOGNIZED-CLASS.
- `class="flex gap-2 badge-${@n}"` → no fire on `flex`/`gap-2` NOR `badge-`.
- `class="${expr}-suffix"` → no fire on `-suffix`.
- `class="counter-app my-card"` (static custom, NO interpolation) → STILL fires (proves no blanket suppression).
- `class="${cond ? 'a':'b'}"` (fully dynamic) → unchanged (no fire).
- `class="flexx ${x} grid"` → STILL fires on `flexx` (whitespace-separated typo still caught).
- Add a parallel W-TAILWIND-001 test if that loop also mis-fired on a Tailwind-shaped prefix (`grid-cols-${n}`).

# VERIFICATION (no R26 — lint fix)
- Full `bun run test` — 0 fail.
- Compile-smoke confirming the dog-food repro no longer fires:
  ```
  cat > /tmp/tw-smoke.scrml <<'EOF'
  ${ <status> = "active" }
  <program><div class="driver-${@status}">hi</div></program>
  EOF
  bun "$WORKTREE_ROOT"/compiler/bin/scrml.js compile /tmp/tw-smoke.scrml --output-dir /tmp/tw-out 2>&1 | grep -i "W-TAILWIND-UNRECOGNIZED" && echo "!! still fires" || echo "fixed — no false positive"
  ```

# CONSTRAINTS
- **DO NOT touch `compiler/SPEC.md`** — a parallel dispatch (`fn-pure-canonicity-reframe`) is editing it; file-delta is whole-file-per-branch and would clobber. If a SPEC §26.5 note seems warranted (the lint now skips dynamic-class fragments), DESCRIBE it in your report; PA adds it post-landing.
- No new/removed error codes. The only behavior change: the lint stops false-firing on dynamic-class fragments.

# COMMIT DISCIPLINE
- Commit per logical unit (the lint fix / the tests). WIP commits fine. Update `docs/changes/tailwind-dynamic-class-prefix-2026-06-11/progress.md` after each step.
- Before DONE: `git status` clean; full `bun run test` 0 fail.

# FINAL REPORT
- WORKTREE_PATH, FINAL_SHA, FILES_TOUCHED.
- The exact diff of the skip-logic (so PA reviews it).
- Test results + the compile-smoke result.
- Whether W-TAILWIND-001 (the second loop) also needed the fix + what you did.
- A proposed SPEC §26.5 note (if any) for PA to land post-landing.
- Full-suite pass/skip/fail. Maps feedback.
