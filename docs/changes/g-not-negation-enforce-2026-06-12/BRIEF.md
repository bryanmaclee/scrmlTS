DISPATCH BRIEF — g-not-negation-enforce-2026-06-12 (scrml-js-codegen-engineer, isolation:worktree, opus)

# TASK
Close `g-not-negation-unenforced` (MED): enforce SPEC §42.10 — prefix-`not` used as boolean negation SHALL fire **E-TYPE-045 (Error)** on ALL expression positions and BOTH forms (bare `not @x` and parenthesized `not (expr)`). Today it fires only on if/while raw conditions and only the paren form; everywhere else prefix-`not` is silently rewritten to JS `!`. User ruled (S188): **"Error + full migration"** — the fix + the full corpus migration land in ONE coupled commit.

Your authority + full detail: **read `docs/changes/g-not-negation-enforce-2026-06-12/SCOPE-AND-DECOMPOSITION.md` IN FULL first** (under your WORKTREE_ROOT). It carries the verified root cause, the fix locus (Locus 2 — emit at the expression-parser lowering choke-point), the precise FORBIDDEN site manifest, the valid-`not` forms to PRESERVE, the test-lock list, and the 6-phase decomposition. Follow it.

# MAPS — REQUIRED FIRST READ
Before consuming other context, read `.claude/maps/primary.map.md` in full (~100 lines). Its "Task-Shape Routing" tells you which additional maps to consult — this is a compiler-source bug fix + corpus migration (parser lowering + type-system + tests + SPEC + .scrml corpus). Map currency: maps reflect HEAD a25cd3ea as of 2026-06-12 (the watermark line says d47177fc — that prior commit is the live content; a25cd3ea is the docs-only wrap on top). If your work touches files modified after that, verify via grep/Read against current source.
Feedback in your final report: "Maps consulted: [list]; load-bearing finding: <one sentence>" OR "Maps consulted but not load-bearing."

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE (S99 has had path-discipline leaks; do not add one)
Your worktree path = whatever `pwd` reports at startup.
## Startup (BEFORE any other tool call):
1. `pwd` via Bash. It MUST start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`. If it is under any OTHER repo (e.g. scrml-support), STOP and report (S90 CWD-routing failure). Save it as WORKTREE_ROOT.
2. `git rev-parse --show-toplevel` MUST equal WORKTREE_ROOT.
3. `git status --short` — confirm clean.
4. `git merge main` (or confirm base == a25cd3ea) — your worktree base may be the session-start commit; ensure you are on current main (S112 staleness).
5. `bun install` — worktrees do NOT inherit node_modules (pre-commit `bun test` fails with "cannot find package 'acorn'" otherwise).
6. `bun run pretest` — populates `samples/compilation-tests/dist/` (gitignored; full `bun test` produces ~130 ECONNREFUSED failures without it). Use `bun run test` (chains pretest) for baseline, NOT bare `bun test`.
## Path discipline (EVERY edit):
- **Apply ALL file edits via Bash** (`perl -i` / `python3` / heredoc / `cp`) on **worktree-absolute paths that include the `.claude/worktrees/agent-<id>/` segment** — NOT the Edit/Write tools (S126 interim mitigation — Edit/Write have leaked to MAIN). Echo the target path before each write; re-verify via `git diff` / `grep` after.
- **NEVER `cd` into the main repo (or anywhere) from your worktree.** Use `git -C "$WORKTREE_ROOT"`, `bun --cwd "$WORKTREE_ROOT"`, worktree-absolute paths exclusively. A `cd` into main leaks installs/edits/compiles (S90/S126 class).
- First commit message MUST include the verbatim `pwd` output: `WIP(g-not-neg): start at $(pwd)`.

# SCOPE OF THE FIX (see SCOPE doc §3-§5 for full detail)
1. **Phase 0 — survey-confirm** the diagnostic-plumbing mechanism: (i) thread an optional `diags?` out-param through `preprocessForAcorn` (expression-parser.ts:1009) → `parseExprToNode` (:2276), OR (ii) attach `_diagnostics` onto the returned ExprNode and harvest in the type-system AST walk (`walkNode`/`EXPR_FIELDS` ~:15304). Pick the cleaner one for the actual code structure. Re-derive the FORBIDDEN site manifest by grep+classify on the worktree (the SCOPE's line numbers are a hypothesis). Report the locus choice + any drift before implementing. The two lowering substitutions (`:1170` paren, `:1207-1210` bare) ARE the precise §42.10 detector — emit there.
   - **Back-compat invariant:** the substitution STILL lowers `not`→`!` (error-recovery output stays coherent); it ADDITIONALLY emits E-TYPE-045 where the sink/harvest exists. Default the param undefined / make harvest additive so direct-lowering callers (`rewriteExpr`/`rewriteNotKeyword` unit tests, no sink) compile + behave UNCHANGED.
   - **Dedup:** retire OR gate the existing `checkNotPrefixNegation` (type-system.ts:9563, if/while paren-only) so E-TYPE-045 fires exactly ONCE on if/while paren forms — no double-fire. Golden fixture `is-not-type-checks.test.js:59` (if-cond paren → E-TYPE-045) MUST stay green.
2. **Phase 1 — implement** the choke-point fire (all positions, both forms). PRESERVE every valid-`not` form (SCOPE §2): `x is not`, `is not not`, `= not`/`@x = not`/`default=not`/`<x> = not` init, `return not`, `f(not)`, `[a,not]`, `T | not`, `not null` SQL, regex-literal `not` interiors (GITI-017/6nz-s guards — DO NOT regress these).
3. **Phase 2 — corpus migration** `not <x>` → `!<x>` for every FORBIDDEN site ONLY (SCOPE §2 manifest; flagship 33 + examples 6 + samples 27 + auth template). Migrate the auth-scaffold generator + `stdlib/auth/templates/login.scrml`; update `generate-auth.test.js:110` + `auth-redirect-tightening-integration.test.js:175` to expect `if (!ok)`. NEVER migrate a valid absence-value `not`. Do NOT touch the golden fixture `phase3-not-prefix-negation-027.scrml` (it already expects E-TYPE-045 — your regression anchor).
4. **Phase 3 — tests.** Migrate/invert the whole-compile lock tests (trucking-dispatch smoke recovers to 0 errors; not-return-statement-glue §4 fixture; tokenizer-event-handler-attr-whitespace §1.2-1.4 — verify empirically which red). ADD positive tests: E-TYPE-045 fires on bare + paren in ternary / `${}` interpolation / derived-RHS / `&&` / return / attr; STILL fires in if/while; does NOT fire on the valid-`not` forms. Keep the direct-lowering unit tests + the golden fixture green.
5. **Phase 4 — SPEC + doc.** Broaden the three §34/§42.10 Trigger cells (SPEC.md:17098, :21606, :21689) to "prefix position — bare `not @x` OR parenthesized `not (expr)`". Repoint the stale `:5556` fire-site cite (SPEC.md:17098 + known-gaps.md:1837 ×2) to the real/new locus. Mark `g-not-negation-unenforced` RESOLVED in known-gaps.md (flip the `<!-- @gap ... status=open -->` token to `status=resolved`).
6. **Phase 5 — R26 EMPIRICAL (mandatory).** On the post-fix baseline, compile (via `bun "$WORKTREE_ROOT"/compiler/bin/scrml.js compile`): (a) 3 repros — `not @x` in a ternary, `not (@x==1)` in a ternary, bare `not @x` in `&&` — each MUST now FIRE E-TYPE-045; (b) the migrated flagship `examples/23-trucking-dispatch` compiles 0-error; (c) valid forms (`x is not`, `@x = not`, `return not`, a regex-literal containing `not`) still compile clean; (d) `node --check` exit 0 on a migrated flagship page's emitted JS. **DO NOT mark DONE without Phase 5 passing.**

# NATIVE PARSER — OUT OF SCOPE
Do NOT touch `compiler/native-parser/`. Native E-TYPE-045 is a separate, deferred-to-cutover (~v0.8) concern (zero emission today, `.scrml` mirrors feature-stale). Note it in your report as a follow-on; do not wire it here.

# COMMIT DISCIPLINE (S83 two-sided)
- Commit INCREMENTALLY per phase for crash-recovery (WIP commits fine). Update `docs/changes/g-not-negation-enforce-2026-06-12/progress.md` after each phase (append-only, timestamped: done / next / blockers).
- This is ONE coupled logical change — the corpus migration + test inversions MUST land together with the reject (else E-TYPE-045 reds the suite). Do NOT `--no-verify`.
- Before reporting DONE: `git status` MUST be clean (everything committed). "work in worktree, no commits" is NOT acceptable.
- Run the FULL suite (`bun run test`) before DONE; record pass/fail/skip. Zero new fails is the contract (the only deltas are the migrated lock tests you inverted + the new E-TYPE-045 positive tests).

# FINAL REPORT (return as your last message — it is data for the PA)
WORKTREE_PATH · FINAL_SHA · FILES_TOUCHED (full list) · the locus choice (Phase 0) · FORBIDDEN-site count actually migrated (paren/bare split) · test deltas (inverted + added) · full-suite pass/fail/skip · Phase-5 R26 results (the 4 checks) · maps feedback · any deferrals. If anything in the SCOPE manifest proved wrong on the worktree, say so explicitly.
