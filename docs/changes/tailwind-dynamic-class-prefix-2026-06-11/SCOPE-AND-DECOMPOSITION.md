# SCOPE — Tailwind lint false-positive on dynamic-class static prefix `class="prefix-${expr}"`

**Change-id:** `tailwind-dynamic-class-prefix-2026-06-11` · **Session:** S183 · **Gap:** `g-tailwind-dynamic-class-prefix` (LOW, dog-food round 4).

## Bug
`class="driver-${@status}"` fires `W-TAILWIND-UNRECOGNIZED-CLASS` on the static prefix `'driver-'` (a runtime-concatenation fragment, never a complete utility). Isolated to plain markup (no `<each>`/struct): control `class="flex gap-2 badge-${@n}"` passes `flex`/`gap-2` but fires on `'badge-'`. High-frequency (state/BEM/theme class names). LOW, info-level.

## Root (single seam)
`compiler/src/tailwind-classes.js`:
- `maskInterpolations(value)` (line 2080) replaces every `${...}` with **spaces** (length-preserving).
- `findUnrecognizedClasses` (line 2268) masks, then `/\S+/g`-splits the masked value. `driver-${@status}` → `driver-` + spaces → token `driver-` extracted (the trailing-`-` fragment before the now-whitespace mask) → fails `getTailwindCSS()` → lints.
- The same `maskInterpolations` feeds `findUnsupportedTailwindShapes` (W-TAILWIND-001) at line ~2149 — same fragment-splitting issue (a Tailwind-shaped prefix like `grid-cols-${n}` → `grid-cols-` could mis-fire there too).

Fully-dynamic `class="${cond ? 'a':'b'}"` is correctly masked-to-all-spaces (no token) — only the MIXED static-glued-to-interpolation case mis-fires.

## Fix
In BOTH scan loops, skip any `/\S+/` class token that is **directly adjacent to (no whitespace boundary) OR overlapping** a `${}` interpolation region — it is a dynamic-class fragment, statically un-validatable.

Implementation sketch (agent decides cleanest form):
- Compute the `${...}` ranges of the ORIGINAL `attrValue` (brace-balanced, same scan `maskInterpolations` already does) — return them from a helper, or compute alongside the mask.
- For each token at `[tStart, tEnd)` (indices map 1:1 to the original since masking preserves length): skip the token if an interpolation range is immediately adjacent — `intpStart === tEnd` (token immediately followed by `${`) OR `intpEnd === tStart` (token immediately preceded by `}`) — or overlaps `[tStart, tEnd)`.
- Tokens separated from the interpolation by whitespace (`class="flex ${x} grid"`) are NOT adjacent → still validated (correct — they're standalone classes).

## Tests (extend the existing tailwind-classes test file)
- `class="driver-${@status}"` → NO `W-TAILWIND-UNRECOGNIZED-CLASS` (the fix).
- `class="flex gap-2 badge-${@n}"` → NO fire on `flex`/`gap-2` (recognized) NOR `badge-` (now skipped as fragment).
- `class="${expr}-suffix"` → NO fire on `-suffix` (suffix fragment).
- `class="counter-app my-card"` (static custom classes, NO interpolation) → STILL fires (unchanged — proves we didn't blanket-suppress custom-class detection).
- `class="${cond ? 'a':'b'}"` (fully dynamic) → unchanged (no fire).
- `class="flex ${x} grid"` (whitespace-separated) → `flex`/`grid` still validated (recognized → no fire, but they ARE considered — verify a typo like `class="flexx ${x} grid"` still fires on `flexx`).

## Constraints
- **DO NOT touch `compiler/SPEC.md`** — a parallel dispatch (`fn-pure-canonicity-reframe`) is editing it; file-delta is whole-file-per-branch and would clobber. If you believe a SPEC §26.5 normative note is warranted (the lint now skips dynamic-class fragments), DESCRIBE it in your report — PA adds it post-landing.
- No R26 (lint-precision fix, not codegen). No new/removed error codes. Behavior change = the lint stops false-firing on dynamic-class fragments; nothing else.
- Keep `maskInterpolations`'s existing consumers working (it's shared — if you refactor it to also return ranges, preserve the masked-string return for current callers).

## Out of scope
- The W-TAILWIND-UNRECOGNIZED-CLASS firing on genuinely-static custom classes (`counter-app`) — that's the documented FLOOR behavior (the message already names "custom class defined elsewhere"); leave it.
