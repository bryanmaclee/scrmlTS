# Gate-flip + 3 residuals — BRIEF (archived per pa.md S136)

Dispatched S142 (2026-05-29) to `scrml-js-codegen-engineer`, isolation:worktree, opus, background.
change-id: `gate-flip-and-residuals-2026-05-29`. Baseline HEAD: `d34f3b93` (pushed; S142 gate-found-tail landed).
Predecessor: the S142 gate-found-tail fix-wave (`ada56bb6` + rebump `5be0a502`) drove forced-gate-ON to 3 residuals + wired the CLI + held the flip. This dispatch closes the 3 + flips the gate default-ON.

Write a progress file at `$WORKTREE_ROOT/docs/changes/gate-flip-and-residuals-2026-05-29/progress.md`, update after each step (append-only, timestamped). Commit after each meaningful change — don't batch. WIP commits expected. If you crash, your commits + progress.md are how the next agent picks up.

---

# MAPS — REQUIRED FIRST READ

Read `.claude/maps/primary.map.md` in full (~100 lines). §"Task-Shape Routing" → this is a **compiler-source bug-fix / codegen + parser** task: consult `structure.map.md`, `dependencies.map.md`, `error.map.md`.

Map currency: maps reflect HEAD `9ab7aa38`, committed `942d62e7`; your baseline `d34f3b93` adds the S142 gate-found-tail landing (ast-builder.js / rewrite.ts / expression-parser.ts / emit-logic.ts / emit-expr.ts / api.js / commands + the within-node allowlist). Treat post-`9ab7aa38` map content as a hypothesis to verify via grep/Read.

Feedback (final report): "Maps consulted: [list]; load-bearing finding: <one sentence>" OR "Maps consulted but not load-bearing — [which]".

---

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE

**S99 has had 20 path-discipline leaks historically; this would be incident #21 — do not be it.**

Worktree path: harness-assigned — capture via `pwd` in step 1, use as `WORKTREE_ROOT`.

## Startup (BEFORE any other tool call)
1. `pwd`. MUST start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`. If under any OTHER repo → STOP, report (S90 CWD-routing failure). Save as `WORKTREE_ROOT`.
2. `git rev-parse --show-toplevel` == `WORKTREE_ROOT`. 3. `git rev-parse HEAD` (record); `git status --short` clean.
4. `git merge main` (or confirm up to date). 5. `bun install`. 6. `bun run pretest` (use `bun run test` for full-suite baselines, NOT `bun test`).
If ANY fails: STOP + report.

## Path discipline (EVERY edit)
- **Apply ALL file edits via Bash** (`perl`/`python`/heredoc/`cp`) on worktree-absolute paths INCLUDING the `.claude/worktrees/agent-<id>/` segment — NOT Edit/Write tools. Echo path before each write; re-verify via `git diff`/`grep` after. (S126 — Edit/Write have twice leaked to PRIMARY MAIN.)
- **NEVER `cd` into the main repo (or anywhere).** Use `git -C "$WORKTREE_ROOT"`, `bun --cwd "$WORKTREE_ROOT"`, worktree-absolute paths only.
- First commit message embeds the verbatim `pwd`: `WIP(gate-flip): start at $(pwd)`.

---

# THE TASK

The emitted-JS parse gate (`validateEmit`, `compiler/src/codegen/validate-emit.ts`, default `false` at `api.js` ~line 641, invoked ~line 1925) ships flag-gated. The S142 gate-found-tail closed the adopter-corpus surface + wired `--validate-emit`/`--no-validate-emit` CLI + SPEC §2.2.1. **3 forced-gate-ON residuals remain, blocking the default-ON flip.** Close them → flip the default → the gate becomes a compile-time invariant by default.

**Acceptance proof:** full `bun run test` GREEN with `validateEmit` **default-ON** (zero new failures vs the 22,132-pass baseline). Drive to green by fixing the bugs, NOT by exempting fixtures or disabling the gate.

## Phase 1 — REPRODUCE the forced-gate-ON failure set on the FULL suite (mandatory, FIRST)

Per pa.md S138 R26 reverse-direction: don't trust "3" — reproduce at YOUR HEAD on the FULL suite.
- Temporarily force the gate on (set `api.js` ~641 default `true`, OR a test-env mechanism). Run the **FULL `bun run test`** (not just the unit+integration+conformance subset — browser/self-host/commands/within-node may surface gate-on failures the subset doesn't). Enumerate EVERY `E-CODEGEN-INVALID-JS` failure (file + byte offset + snippet) in `progress.md`. The 3 below are the hypothesis; if there are MORE, they're additional residuals to close (or STOP-and-report if intractable).
- Restore the default to `false` after enumerating (you flip it for real only in Phase 3).

## The 3 known residuals (precise root causes from the predecessor's progress.md)

**Residual 1 — `stdlib/compiler/meta-checker.scrml` byte ~10606 (MED): multi-line ternary in a `const` initializer.**
Shape: `const x = Array.isArray(...)\n  ? a\n  : b` — `collectExpr` (ast-builder.js / the BS-ASI-NEWLINE boundary heuristic) breaks mid-ternary at the newline before `?` → emits `... )\n?;\n a` (invalid JS). This is the NEXT cascade site after the predecessor's byte-3852 `let m` fix. FIX: extend the statement-boundary heuristic so a line ENDING an incomplete expression (trailing operator OR a following line STARTING with `?`/`:`/binary-op) does NOT trigger a boundary — the ternary continues. Mirror however the existing continuation handling works; add a regression test (multi-line ternary in const-init → valid JS).

**Residual 2 — `stdlib/compiler/module-resolver.scrml` byte ~4328 (LOW): escaped-backtick template + `not`-in-template-string.**
Shape: a backtick template literal containing escaped backticks AND the word `not` in prose, e.g. `` `${x} is not exported by ${y}` `` → the escaped-backtick handling mangles the template AND the `not`→`not`-absence rewrite fires INSIDE the template string content → invalid JS. FIX: (a) template-literal escaped-backtick handling must preserve the template structure; (b) the `not` rewrite MUST NOT fire inside string/template-literal content (it's a string, not an absence token — cf. §42.1.1 "`""` is a defined value" + the rule that `not`-rewrite is source-token-level, not string-content-level). Add a regression test.

**Residual 3 — nested `!{}` (R25-Bug-49 §5) (MED, STRUCTURAL — hardest): `EXPR !{ ARMS }` inside a `!{}` arm handler.**
Repro: `compiler/tests/unit/error-handler-const-bind-r25-bug-49.test.js` (§5). ROOT: a `!{}` arm HANDLER is captured by BS/ast-builder as a flat token-joined STRING (`ast-builder.js` ~L10906). A nested `EXPR !{ ARMS }` inside that handler is NOT re-parsed into a guarded-expr AST node → reaches `emitArmBody` → `rewriteBlockBody` (`emit-control-flow.ts`) which has ZERO `!{}` handling → the inner `!{ }` structural wrapper leaks verbatim → invalid JS. (The inner arm BODY is partially rewritten, which is why the pre-gate test passed on substring presence — false confidence the gate exposes.) FIX options: (a) parser-level retention of the nested error-effect block as a child guarded-expr node (`parseRecursiveBody` already builds these at the OUTER level — extend to nested); OR (b) re-parse the handler string through `parseLogicBody` at codegen time. BOTH are substantial error-handling-CORE changes with **high regression risk**. **This is the one most likely to need STOP-and-report** — see below.

## Phase 2 — fix per-residual, ONE AT A TIME (anti-stall + STOP latitude)

Strict sequencing: fix ONE residual → `git diff` verify → commit → re-run forced-gate-ON to confirm that residual's failure dropped + zero regressions → next. Add a regression test per fix.

**STOP-and-report latitude (Rule 3, no risky half-fixes):** residual 3 (nested `!{}`) is high-regression-risk CORE surgery. If after a genuine attempt it proves to need a structural change you can't land cleanly (regressions you can't resolve), **STOP and report it as infrastructure-blocked** — do NOT force a fragile fix. Closing residuals 1+2 (the tractable self-host ones) + leaving residual 3 is acceptable PARTIAL progress (the flip stays blocked on just residual 3; report it precisely for a follow-up). Do the same for any NEW Phase-1 residual that proves intractable.

## Phase 2.5 — within-node parity canary (MANDATORY — this session's hard-won lesson)

Residuals 1+2 change the LIVE parse of `stdlib/compiler/*.scrml` (collectExpr / template handling); this WILL likely shift the **within-node parity canary** (`compiler/tests/parser-conformance-within-node.test.js` — LIVE vs native-parser per-node divergence). **That test is EXCLUDED from pre-commit** — so a pre-commit-green does NOT mean within-node-green. The predecessor (`ada56bb6`) tripped it on 12 fixtures + it was missed until post-commit.

After your fixes, run `bun test compiler/tests/parser-conformance-within-node.test.js`. If it shows OVER-BUDGET (positive-residual) fixtures:
1. CONFIRM benign: the fix should move LIVE from malformed-parse → correct-parse, surfacing the true LIVE-vs-native gap (S142 precedent: the gate-found-tail's bare-let / tilde / optchain fixes did exactly this; the rebump landed at `5be0a502`). A SPAN-COORD or field-shape shift on the SAME nodes your fix touched is benign. A KIND-NAME / structural divergence on UNRELATED nodes is NOT — STOP-and-surface that.
2. If benign: surgically rebump ONLY the positive-residual classes to current raw in `parser-conformance-within-node-allowlist.json` (do NOT trim pre-existing stale-high entries — out of scope). Re-run → 1005/0 (or current pass count). Commit the rebump separately with a clear "within-node rebump for <fix>" message.

## Phase 3 — FLIP the gate (ONLY if Phase 1's full forced-gate-ON surface is fully closed)

Gate condition: full `bun run test` GREEN with the gate forced ON (zero E-CODEGEN-INVALID-JS, zero within-node residual, zero other new failures). ONLY THEN:
1. Flip `api.js` ~line 641 `validateEmit = false` → `true`.
2. Update the api.js gate comment block (currently says "DEFAULT STILL OFF — flip HELD ... 3 INTERNAL residuals"): change to reflect default-ON + that the residuals are closed. Keep the `--no-validate-emit` escape-hatch description.
3. SPEC §2.2.1: the invariant text is already always-on; the S142 §2.2.1 note added the `--no-validate-emit` escape. Now that the default IS ON, you MAY tighten the note to state the gate is active by default (PA-DECISION-FLAGGED — if unsure, leave the note as-is rather than overclaim; STOP-and-ask if the framing is non-obvious, pa.md Rule 4).
4. Run the FULL `bun run test` with the real default-ON → confirm GREEN.

**If Phase 1's surface is NOT fully closed (residual 3 or a new one STOP-blocked): DO NOT FLIP.** Leave default `false`, report the residual, land the closed fixes. The flip waits.

# ACCEPTANCE GATE
- If flipped: full `bun run test` GREEN with `validateEmit` default-ON (zero new fails vs 22,132).
- If NOT flipped (partial): full `bun run test` GREEN with default-OFF (zero regressions) + the closed residuals' fixes landed + the open residual(s) reported precisely.
- **S138 R26 (mandatory):** re-compile under `--validate-emit`: the 2 self-host stdlib files (`stdlib/compiler/{meta-checker,module-resolver}.scrml`) + adopter sources (`examples/23-trucking-dispatch/app.scrml`, R27 `dev-{1,2,4,5}` at `/home/bryan-maclee/scrmlMaster/scrml-support/docs/gauntlets/gauntlet-r27/`). Confirm exit-0 + `node --check` clean (dev-3 has pre-existing E-PA-002, not a gate fire). Report the table. DO NOT mark DONE without R26.

# COMMIT DISCIPLINE
- Commit per residual (incremental, crash-recovery). `git -C "$WORKTREE_ROOT" diff` before each add. `git status` clean before reporting DONE (S83).
- **NEVER `--no-verify`** (any commit; extends to pre-push). Pre-commit env race (pretest dist mid-rebuild) → STOP + report, don't bypass.

# FINAL REPORT
WORKTREE_PATH · FINAL_SHA · per-commit list · FILES_TOUCHED · Phase-1 full forced-gate-ON enumeration (vs the 3 hypothesis — any extras?) · per-residual disposition (fixed / STOP-blocked-infra) · within-node parity outcome (rebumped? benign-confirmed how?) · WHETHER YOU FLIPPED (+ full-suite-default-ON result) or why not · R26 table · the C2-style PA-decisions w/ SPEC quotes · maps feedback · deferred items.
