You are REWRITING a scrml example to teach idiomatic scrml (change-id `corpus-05-multi-step-form-2026-06-15`). This is wave-1a of the corpus-rewrite arc. The corpus audit verdict: `05-multi-step-form` ships a hand-built state machine + an `if=/else-if=/else` instance chain + a `<submitted>` guard + ZERO validators — it teaches the "reach for an engine" anti-pattern as the lesson. Your rewrite makes it the canonical WIZARD-AS-ENGINE + decl-coupled-validators example.

# MAPS — REQUIRED FIRST READ
Read `.claude/maps/primary.map.md` in full first. Follow §"Task-Shape Routing" for example/scrml authoring (expect the domain/style/state maps).
Map currency: maps reflect HEAD `a78272e5` (2026-06-14); HEAD is now `cd822f7a` (+1 docs-only commit). Verify against current source if needed.
Feedback: final report includes "Maps consulted: [...]; load-bearing finding: <sentence>" OR "Maps consulted but not load-bearing."

# REQUIRED READS before writing ANY scrml
1. `docs/articles/llm-kickstarter-v2-2026-05-04.md` IN FULL (the canonical scrml shape + anti-pattern table + recipes — §11 engine recipe, §7 anti-patterns).
2. `docs/PA-SCRML-PRIMER.md` §7 (engines, L677-737) + §8 (validators, L765-806).
3. SPEC via `compiler/SPEC-INDEX.md`: §51.0.B/.C/.D/.E/.F (engine decl + rule= contract + auto-declared var + initial=), §51.0.F.1 (idempotent self-write), §55.2/.5/.6/.8 (validators + auto-synth validity surface + `<errors of=>`).
4. The current file `examples/05-multi-step-form.scrml` (read in full — line-cite the smells you remove).

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE (S99 has had MULTIPLE leaks — do not be the next)
Your worktree is under `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-<id>/`.
## Startup — BEFORE any other tool call:
1. `pwd` MUST start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`. Under any other repo → STOP + report (S90). Save as WORKTREE_ROOT.
2. `git rev-parse --show-toplevel` == WORKTREE_ROOT. 3. `git status --short` clean. 4. `git log --oneline -1` base == `cd822f7a`. 5. `bun install`. 6. `bun run pretest`.
## Path discipline — EVERY edit:
- ABSOLUTE paths under WORKTREE_ROOT only; NEVER under the bare main repo root.
- S126: prefer Bash edits (`perl`/`python3`/heredoc on worktree-absolute paths) over Edit/Write; echo target path before each write; re-verify with `git diff`/`grep`. NEVER `cd` into the main repo — use `git -C "$WORKTREE_ROOT"` / `--cwd "$WORKTREE_ROOT"` / absolute paths.
- First commit message MUST include the verbatim `pwd`: `WIP(05-rewrite): start at <pwd>`.

# THE REWRITE (target idiom — compile-verified clean this session, ZERO compiler gaps)
Rewrite `examples/05-multi-step-form.scrml` around TWO coupled idioms:

**(a) Engine over the Step enum (§51).** Keep `type Step:enum = { Info, Preferences, Confirm }`. Declare `<engine for=Step initial=.Info>`; its auto-declared `@step` cell replaces `<currentStep>`. One state-child per step: `<Info rule=.Preferences>`, `<Preferences rule=(.Info | .Confirm)>`, `<Confirm rule=.Preferences>` (terminal Submit happens from Confirm). The three `const XStep = <div class="step">…` component bodies move VERBATIM into the matching state-child bodies — they ARE the per-variant render. DELETE `next()`/`back()` (the hand-built match-transition tables) and the `<InfoStep if=.../> <PreferencesStep else-if=.../> <ConfirmStep else/>` chain — the `rule=` contract IS the transition table; decl-position IS mount.
- **Transitions fire from INSIDE state-child bodies** via `onclick=${ @step = .Preferences }` (compile-time rule= checked; avoids `W-ENGINE-SELF-WRITE-DETECTED`, which fires when transitions live in standalone functions). Back buttons write `@step = .Info` etc. (legal via the multi-target rules).

**(b) Decl-coupled validators (§55).** Replace the five loose form cells with a `<signup>` compound carrying validators: `<firstName req length(>=2)>`, `<lastName req>`, `<email req>` (+ sensible `length`/`pattern` where natural). The auto-synth surface gives `@signup.isValid` + `@signup.firstName.errors` with NO authoring.
- **Per-step gating:** gate the Info-step Next on that step's fields' validity (e.g. `disabled=(!@signup.firstName.isValid || !@signup.lastName.isValid)`) — correct wizard UX. Gate the final Submit on the full `@signup.isValid`. (If per-step gating hits a real wrinkle, fall back to compound `@signup.isValid` for Next too and NOTE it in your report — don't stall.)
- Render at least one `<errors of=@signup.firstName/>` element (the §55.8 surface, used in NO corpus example today).
- DELETE the `<submitted>` boolean + the `if (@submitted) return` guard — validity gating + the terminal `.Confirm` state replace it.
- KEEP `persistSignup()` / the `?{}` INSERT, wired to the Submit action, reading the `@signup.*` fields.

**Fold in Tier-0:** if the file has any `${for/lift}` site, convert it to `<each>` as part of the rewrite (you may run `bun "$WORKTREE_ROOT"/compiler/bin/scrml.js promote --each --dry-run <file>` to preview the mechanical diff, but author the final shape by hand).

# CONSTRAINTS
- `null`/`undefined` do NOT exist in scrml — use `not` for absence; `!` for boolean negation (NOT `not`). `==`/`!=` (not `===`).
- Preserve co-located `#{}` scoped style blocks (S86 styling rule — file-top `#{}` is NEVER canonical in examples). Preserve the existing Tailwind utility classes.
- Rewrite the file's HEADER COMMENT to frame the LESSON as "wizard as an engine: Step enum + rule= state-children + decl-coupled validators gating Next/Submit" — NOT the removed match-dispatch/instance-chain features.
- **Do NOT edit `examples/README.md`** — PA handles the README row re-aim at land time (avoids a 4-way file-delta clobber). You own ONLY `examples/05-multi-step-form.scrml`.

# ACCEPTANCE GATE (compile-verify — do NOT report DONE without it)
`bun "$WORKTREE_ROOT"/compiler/bin/scrml.js compile "$WORKTREE_ROOT"/examples/05-multi-step-form.scrml --output-dir <tmp>`: exit 0, ZERO `E-` errors (W-/I- lints incl. W-PROGRAM-SPA-INFERRED are FINE). `node --check` the emitted client JS (and server JS if the ?{} path emits one). grep the file: zero `= false`/`= true` UI-gating flags, zero `if=`/`else-if=`/`else` instance chain, zero `next()`/`back()` transition functions. Run `bun run test` — note any delta (the example isn't a unit test, but confirm no suite regression from a shared-fixture surprise).

# COMMIT DISCIPLINE
- Commit after each meaningful change (via `git -C "$WORKTREE_ROOT"`); WIP commits expected; append `docs/changes/corpus-05-multi-step-form-2026-06-15/progress.md` each step.
- `git status` clean before DONE. No `--no-verify`.

# FINAL REPORT (return exactly)
- WORKTREE_PATH · BRANCH · FINAL_SHA · FILES_TOUCHED
- The `pwd` from your first commit
- COMPILE-VERIFY: exit code + E- count + node --check (client+server) + the grep-confirmations (no flags/chain/transition-fns)
- Which Next-gating form you used (per-step vs compound) + why
- DEFERRED items / any wrinkle
- Maps feedback line
