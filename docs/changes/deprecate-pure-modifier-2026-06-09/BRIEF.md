# DISPATCH BRIEF — deprecate the `pure` modifier (whole modifier; canonical pure form = `fn`)

change-id: `deprecate-pure-modifier-2026-06-09`
repo: /home/bryan-maclee/scrmlMaster/scrmlTS · baseline HEAD: beb8a115 (S176)
agent: scrml-js-codegen-engineer · isolation: worktree

USER-RATIFIED S176 (verbatim: *"deprecate it, whole pure modifier."*). The `pure` modifier is deprecated language-wide. Canonical pure form = **`fn`** (and `server fn`). Bare `function` stays the impure form. This mirrors the `<machine>`→`<engine>` (W-DEPRECATED-001) and the `server`-modifier (Insight 26, W-DEPRECATED-SERVER-MODIFIER) deprecations EXACTLY — same W→E→removal shape.

**Why (context):** `pure` is currently INERT — it compiles but does nothing: E-PURE-001 (§33 purity-violation) is UNWIRED (grep `E-PURE-001` in compiler/src = 0 hits); a `pure function` is not purity-enforced (the §48 walker gates on `fnKind === "fn"` and misses it); and the promote-lint even treats `pure function double(){}` as a bare `function` and suggests "promote to `fn`" (doesn't recognize `pure`). So `pure` is a vestigial no-op synonym. Per `feedback_limit_primitives_not_godify` (sharper-by-limiting) it goes; `fn` is the one pure form. NOTE: this CLOSES `g-pure-function-purity-gap` by deprecation (don't build enforcement onto a dying form — migrate to `fn`, which IS enforced).

---

# MAPS — REQUIRED FIRST READ
Read `.claude/maps/primary.map.md` in full. Task-shape: **compiler-source feature (deprecation: diagnostic + migrate-rule + SPEC + corpus migration)**. Map currency: watermark `049954e0` (HEAD `beb8a115` ahead by S176 landings; grep to confirm line numbers). Report maps load-bearing-or-not.

---

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE
S99/S126 leak history — do not become the next incident.
1. `pwd` MUST start `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`. Else STOP (S90). Save WORKTREE_ROOT.
2. `git rev-parse --show-toplevel` == WORKTREE_ROOT. 3. `git status --short` clean. 4. `bun install`. 5. `bun run pretest`. 6. baseline `bun run test` (contract 0 fail).
- ALL edits via Bash (perl/python3/heredoc) on worktree-absolute paths incl. `.claude/worktrees/agent-<id>/` — NOT Edit/Write (S126). Echo path, `git diff`/grep after.
- NEVER `cd` into main. `git -C "$WORKTREE_ROOT"`, run bun from WORKTREE_ROOT, worktree-absolute paths.
- First commit msg embeds startup `pwd`: `WIP(deprecate-pure): start at <pwd>`.

---

# THE DEPRECATION (precedent to mirror = W-DEPRECATED-001 `<machine>`)

## Surface
- Canonical pure form: `fn name(...)` (and `server fn`). Impure: `function` (unchanged). The `pure` modifier in ALL forms is deprecated:
  - `pure function name(...)` → `fn name(...)`
  - `pure fn name(...)` → `fn name(...)` (drop the now-deprecated `pure`; this was already `W-PURE-REDUNDANT`)
  - `server pure function` / `pure server function` → `server fn` (drop `pure`; `server` is handled by its OWN deprecation track Insight 26 — do NOT touch `server` here)
  - `export pure function` → `export fn`
- `pure` is consumed at 4 ast-builder parse paths (all set `isPure: true`): ast-builder.js ~6806, ~8339, ~9386, ~9661. The deprecation fire should be at a SINGLE common point keyed on `isPure === true`, not per-path.

## The fire-site
The existing **W-PURE-REDUNDANT** check at `type-system.ts:7559` fires on `n.fnKind === "fn" && n.isPure === true` (i.e. `pure fn` only). **REPLACE it with `W-PURE-DEPRECATED`, gated on `n.isPure === true` alone** (catches `pure function` AND `pure fn` AND `pure server` — every pure-modifier decl). Severity: **warning** (`W-` → `result.warnings`, non-fatal — mirror W-DEPRECATED-001). Message: "the `pure` modifier is deprecated; use `fn` (the canonical pure form). `pure function`/`pure fn` → `fn`. Run `bun scrml migrate --fix`." Reserve `E-PURE-DEPRECATED` for end-of-window (do NOT emit it now).
- If a SECOND fire path is cleaner (e.g. wherever the parser consumes `pure`), survey + pick the single best common point in Phase 0; the requirement is: EVERY `pure`-modifier form warns exactly once.

## migrate --fix (add Migration 3)
`compiler/src/commands/migrate.js` has Migration 1 (W-WHITESPACE-001) + Migration 2 (W-DEPRECATED-001 `<machine>`→`<engine>`). ADD Migration 3 (W-PURE-DEPRECATED): rewrite `pure function`→`fn`, `pure fn`→`fn`, `[server ]pure[ server ]function`→`server fn`. Idempotent, AST/text-driven per the existing migration style. Update the migrate.js help text + the migration list.

## E-PURE-001 / §33 cleanup
E-PURE-001 is UNWIRED (no emitter). Confirm in Phase 0. Since `pure` is deprecated, E-PURE-001 stays retired/unwired (do not wire it). The §33 purity-violation role is covered by E-FN-001..008 on the migrated `fn` forms.

## Corpus migration (land WITH the deprecation)
~22 `pure function` + 2 `pure fn` decls across `stdlib/` + `samples/` + `examples/` + `compiler/self-host/`. Migrate ALL live-compiled corpus to `fn` (use `migrate --fix` then verify, or perl). After migration: `grep -rE 'pure (function|fn)' stdlib samples examples` = 0. For `compiler/self-host/*.scrml` + `compiler/native-parser/*.scrml`: migrate if they're in the compile/test gate; if a file is a FEATURE-STALE mirror not in any gate (S162), note it skipped rather than touch it. Report each file migrated + any skipped. The migration keeps the canon clean so W-PURE-DEPRECATED only guards NEW usage (a warning won't redden the suite, but a clean canon is the point).

## SPEC + PRIMER
- **SPEC §33 "The `pure` Keyword"** (line ~16513): add a DEPRECATED banner + note (mirror how `<machine>` is marked at §51.0.L / W-DEPRECATED-001). The `pure` modifier is deprecated; `fn` is the canonical pure form.
- **§48.11** (`fn` ≡ `pure function`) + §5625/§5630 (the fn/pure-function equivalence table rows): reframe — `pure function` is the DEPRECATED long-form; `fn` is THE pure form. `function` (no modifier) is impure.
- **§34**: +1 row `W-PURE-DEPRECATED` (warning; `pure` modifier deprecated → use `fn`; cross-ref §33/§48.11; reserved `E-PURE-DEPRECATED` end-of-window). Mark the existing `W-PURE-REDUNDANT` row **superseded by W-PURE-DEPRECATED** (the redundant-pure case is now just deprecated-pure).
- **PRIMER §6** (function-forms table, `docs/PA-SCRML-PRIMER.md` ~line 186-197): mark `pure function` deprecated; canonical pure = `fn`; drop/deprecate the "`pure function` — synonym for `fn`" line + the "`pure fn` is REDUNDANT (W-PURE-REDUNDANT)" line → "`pure` modifier deprecated (W-PURE-DEPRECATED) — use `fn`".
- Do NOT touch adopter-marketing docs (kickstarter/scrml.dev) — pa.md Rule 1.

---

# PHASES (commit per phase; code + coupled test = ONE commit)

**PHASE 0 — survey-confirm (REQUIRED, report before building).** The 4 `pure` consume paths (6806/8339/9386/9661) + the single best common fire-point keyed on `isPure`; the W-PURE-REDUNDANT site (7559) to replace + its tests; confirm E-PURE-001 unwired; migrate.js Migration-2 structure (to mirror for Migration 3); §33/§48.11/§5625/§5630 SPEC structure; corpus count + which files are gate-live vs feature-stale. Report; STOP if anything contradicts.

**PHASE 1 — W-PURE-DEPRECATED diagnostic + tests.** Replace W-PURE-REDUNDANT (7559) with W-PURE-DEPRECATED gated on `isPure === true`. Tests: `pure function` → W-PURE-DEPRECATED; `pure fn` → W-PURE-DEPRECATED (NOT the old redundant code); `server pure function` → W-PURE-DEPRECATED; plain `fn`/`function` → NO warning; the warning partitions into `result.warnings` (cross-stream helper — memory `feedback_diagnostic_stream_partition`).

**PHASE 2 — migrate --fix Migration 3 + tests.** The pure→fn rewrites; idempotent; tests for each form (`pure function`→`fn`, `pure fn`→`fn`, `server pure function`→`server fn`, `export pure function`→`export fn`).

**PHASE 3 — corpus migration (land WITH the fix).** Migrate the ~24 decls to `fn`; verify `grep -rE 'pure (function|fn)' stdlib samples examples` = 0; report each file + any feature-stale skip. (scrml:math/scrml:time shims are `export function`/`function`, not `pure` — unaffected; verify.)

**PHASE 4 — SPEC §33 deprecation banner + §48.11/§5625/§5630 reframe + §34 W-PURE-DEPRECATED row (W-PURE-REDUNDANT superseded) + PRIMER §6.**

**PHASE 5 — R26 EMPIRICAL (MANDATORY).** A fresh `pure function f(){...}` → W-PURE-DEPRECATED; `migrate --fix` on it → `fn f(){...}`; the migrated `fn` is purity-enforced (a `fn` doing Date.now() → E-FN-004 — closing g-pure-function-purity-gap by migration); corpus compiles with 0 `pure` + 0 W-PURE-DEPRECATED in canon; full `bun run test` 0 fail. Report the R26 table. DO NOT mark DONE without it.

---

# COMMIT DISCIPLINE
Commit per phase; code + coupled test = ONE commit; WIP commits expected. `git status` clean before DONE. NEVER `--no-verify`. Update `docs/changes/deprecate-pure-modifier-2026-06-09/progress.md` per phase.

# COMPLETION REPORT
WORKTREE_PATH (startup pwd) · FINAL_SHA · FILES_TOUCHED · Phase-0 survey (the fire-point chosen + W-PURE-REDUNDANT replacement + E-PURE-001 status) · per-phase summary · Phase-3 corpus migration (each file + skips) · Phase-5 R26 table · baseline-vs-final `bun run test` · confirmation g-pure-function-purity-gap is closed-by-deprecation · maps feedback.
