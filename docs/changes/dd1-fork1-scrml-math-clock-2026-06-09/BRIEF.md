# DISPATCH BRIEF — DD1 Fork 1: scrml:math (1A) + capability-scoped clock (1C)

change-id: `dd1-fork1-scrml-math-clock-2026-06-09`
repo: /home/bryan-maclee/scrmlMaster/scrmlTS (the working scrml compiler, TS/JS)
baseline HEAD at dispatch: 46cffc83 (S176, post g-unknown-type-leak)
agent: scrml-js-codegen-engineer · isolation: worktree

You are building the scrml-native scalar vocabulary — the user-ratified DD1 Fork 1: a pure `scrml:math` stdlib module (1A) + a capability-scoped wall-clock primitive `scrml:time.now()` (1C). Authority: `scrml-support/docs/deep-dives/js-host-boundary-foundation-2026-06-07.md` Fork 1 + the S176 AskUserQuestion ratification (1A + 1C; 1B ambient DEFERRED, 1D defer REJECTED). This closes the corpus scalar gap (~95 adopter sites reaching raw Math/Date/parseInt) AND the stdlib-ouroboros (scrml's own stdlib leaks Math because there is no value-native target — `data.js:382`).

---

# MAPS — REQUIRED FIRST READ
Read `.claude/maps/primary.map.md` in full first. Task-shape: **compiler-source feature (stdlib module + type-system purity-gate + SPEC)**. Follow its routing. Map currency: watermark `049954e0` (HEAD `46cffc83` is ahead by the S176 landing + maps refresh; treat map content as a starting hypothesis, verify via grep). Report maps load-bearing-or-not in your final report.

---

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE
S99/S126 leak history — do not become the next incident.
## Startup (BEFORE any other tool call)
1. `pwd` — MUST start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`. If under any other repo, STOP + report (S90). Save as WORKTREE_ROOT.
2. `git rev-parse --show-toplevel` == WORKTREE_ROOT.
3. `git status --short` clean.
4. `bun install` (worktrees don't inherit node_modules).
5. `bun run pretest` (populate samples/compilation-tests/dist/).
6. Baseline `bun run test` — record counts; contract is **0 fail**.
If ANY fails: STOP + report.
## Path discipline (EVERY edit)
- Apply ALL edits via Bash (perl/python3/heredoc/cp) on worktree-absolute paths incl. the `.claude/worktrees/agent-<id>/` segment — NOT Edit/Write (S126). Echo path before, `git diff`/grep after.
- NEVER `cd` into the main repo (or anywhere). Use `git -C "$WORKTREE_ROOT"`, run bun from WORKTREE_ROOT, worktree-absolute paths only.
- First commit message embeds startup `pwd`: `WIP(dd1-fork1): start at <pwd>`.

---

# DESIGN (ratified — survey-confirm, do not re-litigate)

## The stdlib pattern to mirror (verified)
Each stdlib module = `stdlib/<name>/index.scrml` (scrml-facing `export function …` decls inside `<program>${ … }`; see `stdlib/format/index.scrml`) + a hand-written ES-module runtime shim `compiler/runtime/stdlib/<name>.js` (the ONE sanctioned host-touch point; see `compiler/runtime/stdlib/format.js`). `scrml:NAME` resolves to `stdlib/NAME/index.scrml` (module-resolver.js:735). A `scrml:NAME` with no shim fires `W-STDLIB-SHIM-MISSING` — so BOTH files are mandatory. There may be a `dist/` per module — regenerate per the existing build step if the suite needs it.

## 1A — `scrml:math` (PURE, class-B)
- NEW `stdlib/math/index.scrml` + NEW `compiler/runtime/stdlib/math.js`.
- Surface: `round`, `floor`, `ceil`, `abs`, `min`, `max`, `parseInt`, `parseFloat`, `toNumber`, `isNaN`. All deterministic/pure. The shim is the sanctioned `Math.*` / `Number.*` touch (centralizes the host-math reach that's currently scattered/leaked).
- **CORRECTNESS REQUIREMENT (Phase-0 survey — load-bearing):** scrml:math functions MUST be callable inside **pure `fn` bodies** (round/floor/abs are deterministic — a pure calc is the primary use). Survey how the fn-purity walker (`type-system.ts`, E-FN-003 "calls a `function` callee" rule ~17383) treats imported stdlib `function` calls: does a pure `fn` body already accept `format`/`regex` stdlib calls, or are imported `function`s blanket-rejected in fn? If stdlib pure-imports are NOT already fn-callable, make scrml:math callable in `fn` — EITHER declare its members `fn`/`pure function` in index.scrml, OR add scrml:math to a pure-stdlib allowlist in the purity walker. Pick the mechanism that matches how the rest of the pure stdlib (format/regex/crypto-hash) is handled; report which. A scrml:math that can't be called in a pure `fn` is a FAIL.
- `parseInt`/`parseFloat`/`toNumber`/`isNaN` are pure coercion — same fn-callable requirement.

## 1C — `scrml:time.now()` (capability-scoped, class-C IO / non-det)
- Add `now()` to `stdlib/time/index.scrml` + `compiler/runtime/stdlib/time.js`. The shim returns `Date.now()` — this becomes the centralized, sanctioned wall-clock touch (time.js currently leaks `Date.now()` at :49/:208/:237 + Math 15× — see ouroboros fix below).
- **Capability gate (the §-level rule):** `now()` is non-deterministic → it MUST be FORBIDDEN in pure `fn`/`pure` bodies and ALLOWED in `function` / `server function` bodies. The existing gate is E-FN-004 (`type-system.ts` ~16908/16947 `NON_DET_CALLS = [Date.now, new Date, Math.random, crypto.randomUUID, crypto.getRandomValues, performance.now]`). E-FN-004 is identifier-keyed on HOST member-expressions; an adopter writes `import { now } from 'scrml:time'` then bare `now()`.
- **Phase-0 survey (the design-sensitive wiring):** how do you make E-FN-004 fire on the IMPORTED `now` binding without false-positiving on a user's own `function now()`? Do NOT just append the bare string `"now"` to NON_DET_CALLS (collides with user identifiers). Resolve the import binding: a `now` bound from `scrml:time` is non-det. Reuse the B4 import registry (`lookupImportBinding` / `Scope.importBindings`, symbol-table.ts) to confirm the callee resolves to `scrml:time`'s `now` before firing. Report the exact mechanism. (If binding-resolution isn't reachable from the fn-purity walker, surface that as a Phase-0 blocker rather than shipping a false-firing bare-name check.)
- E-FN-004's message already names the non-det callee; ensure `now()` produces a clear "non-deterministic; call it from a `function`/`server function`, not a pure `fn`" message.

## Stdlib-ouroboros self-fix (the payoff)
Once `scrml:math` exists, scrml's own runtime shims stop leaking raw `Math`:
- `compiler/runtime/stdlib/data.js:382` `clamp` = `Math.min(Math.max(...))` → call `math.js`'s `min`/`max` (or `clamp` if you add one). Behavior byte-identical.
- `compiler/runtime/stdlib/time.js` Math leaks (15×) → route through `math.js` where it's a clean substitution. (Date.now stays — that IS the sanctioned clock touch, now centralized as `now()`.)
- Keep all behavior identical; this is an internal de-leak, not a behavior change. Verify the leak count drops (`grep -c 'Math\.' data.js time.js` before/after).

## SPEC + docs
- **SPEC §41** (Import System, ~line 20334): add the `scrml:math` catalog entry (the function surface) + the `scrml:time.now()` entry. Add a normative capability note: `now()` is non-deterministic and is rejected in pure `fn`/`pure` bodies (E-FN-004), permitted in `function`/`server function`. Cross-ref §33 (`pure`) / §48 (`fn`) / §48.3.4 (the non-det rule). No NEW §34 code (reuse E-FN-004) unless your survey shows a distinct code is genuinely needed — if so, justify + add the §34 row.
- **PRIMER §10** (`docs/PA-SCRML-PRIMER.md` stdlib catalog): add `scrml:math` to the module list + note `scrml:time.now()` (capability-scoped). PA-facing reference.
- **Honesty positioning** (PRIMER §10): the "kills ~88-90% of npm" line can note the scalar gap is now closed; do NOT touch adopter-marketing docs (kickstarter / scrml.dev) — pa.md Rule 1.

## OUT OF v1 SCOPE (state in report, do NOT implement)
- **`random()`** — `Math.random` (5 corpus sites) is the same class-C non-det as the clock, but it is NOT a clock (doesn't fit `scrml:time`) and NOT pure (doesn't fit `scrml:math`). Its home is a separate small design decision (scrml:random vs an impure-carve-out in scrml:math). FILE it as a follow-on; do not build it here.
- **1B ambient builtins** — DEFERRED by ratification (don't re-open the ambient-vocabulary debate). scrml:math is import-only.

---

# PHASES (commit per phase; code + coupled test = ONE commit)

**PHASE 0 — survey-confirm (REQUIRED, report before building).** Confirm: the stdlib index.scrml + shim pairing + dist/build step (mirror format/time); module-resolver `scrml:NAME` resolution + W-STDLIB-SHIM-MISSING; **the fn-purity treatment of imported stdlib `function` calls** (the 1A pure-callable requirement) + **how E-FN-004 can gate the imported `now` binding** (the 1C capability wiring) — these two are the load-bearing unknowns; report the exact mechanism for each or STOP if either contradicts this brief. SPEC §41 catalog format. Report line drift.

**PHASE 1 — `scrml:math` module + tests.** index.scrml + math.js shim (the 10 pure functions) + dist if needed. Tests: adopter `import { round, abs } from 'scrml:math'` compiles + emits a call to the shim; **a pure `fn` body calling `round()` compiles clean (no E-FN-003/004)**; `parseInt`/`toNumber` coercion works.

**PHASE 2 — `scrml:time.now()` + E-FN-004 capability gate + tests.** now() in time index.scrml + shim; binding-aware non-det detection. Tests: `now()` in a `server function` → OK; in a `function` (event-handler/effect) → OK; in a pure `fn` → **E-FN-004**; a user's own `function now(){}` called in a `function` → NOT falsely gated.

**PHASE 3 — stdlib-ouroboros self-fix + verify.** data.js:382 clamp + time.js Math leaks route through math.js; behavior identical; leak count drops (report before/after `grep -c 'Math\.'`).

**PHASE 4 — SPEC §41 + PRIMER §10.** Catalog entries + the non-det capability note + cross-refs. No new §34 code unless justified.

**PHASE 5 — R26 EMPIRICAL (MANDATORY before DONE).** Compile a real adopter-shaped file: `import { round, clamp } from 'scrml:math'` used in a pure `fn` + a `function`; `import { now } from 'scrml:time'` used in a `server function` (OK) and attempted in a `fn` (must fire E-FN-004). Verify emitted JS calls the shims (`node --check` clean). Run full `bun run test` (0 fail). Report the R26 table. DO NOT mark DONE without it.

---

# COMMIT DISCIPLINE
- Commit per phase; code + coupled test = ONE commit; WIP commits expected. `git status` clean before reporting DONE. NEVER `--no-verify`. Update `docs/changes/dd1-fork1-scrml-math-clock-2026-06-09/progress.md` per phase (append-only).

# COMPLETION REPORT
WORKTREE_PATH (startup pwd) · FINAL_SHA · FILES_TOUCHED · Phase-0 survey (the two mechanisms: fn-pure-callability of scrml:math + E-FN-004 imported-`now` gate) · per-phase summary · stdlib leak-count before/after · Phase-5 R26 table · baseline-vs-final `bun run test` · the `random()` follow-on note · maps feedback.
