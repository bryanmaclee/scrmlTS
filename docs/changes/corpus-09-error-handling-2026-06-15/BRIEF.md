# WAVE 1b (REVISED — ruling (b)). Base = main HEAD `86cb8d67` (has the GAP-A void-scanner fix). Supersedes the first 09 brief: the PA ruled OPTION (b) — pure errors-as-states, NO errorBoundary/shim, NO variant `renders` clauses.

You are REWRITING the flagship errors-as-states example (`examples/09-error-handling.scrml`, change-id `corpus-09-error-handling-2026-06-15`) to **pure errors-as-states**. A prior dispatch built a version that bridged the held error to a top-level `<errorBoundary>` via a `showError(e){ fail e }` shim to fire the variant `renders` clauses — that was RULED a smell. Your job: the clean single-lesson shape — the failure routes into `.Failed(err)` and the `<match>` arm renders the error DIRECTLY. No `<errorBoundary>`. No shim. No variant `renders` clauses.

# MAPS — REQUIRED FIRST READ
Read `.claude/maps/primary.map.md` in full; follow §"Task-Shape Routing" for scrml/example authoring.
Map currency: maps reflect `a78272e5` (2026-06-14); HEAD now `86cb8d67`. Verify against source if needed.
Feedback: report "Maps consulted: [...]; load-bearing finding: <sentence>" OR "not load-bearing."

# REQUIRED READS before writing ANY scrml
1. `docs/articles/llm-kickstarter-v2-2026-05-04.md` IN FULL — §7 anti-pattern table + error-handling recipe.
2. `docs/PA-SCRML-PRIMER.md` §6 (error model — `fail`/`!{}`, errors-as-states, L163) + §6.2 (match block-form, incl. the JS-style value-return `match expr {}`).
3. SPEC via `compiler/SPEC-INDEX.md`: §19 (error handling), §18.0.1 (Tier-1 `<match for=Type on=expr>`) + §18 JS-style value-return match, §12 (server inference for the `?{}` submit path).
4. The CURRENT `examples/09-error-handling.scrml` in main (the OLD boolean-flag version — line-cite the smells you remove).

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE (S99 leaks — do not be the next)
Worktree under `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-<id>/`.
## Startup — BEFORE anything else:
1. `pwd` MUST start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`. Else STOP+report (S90). Save WORKTREE_ROOT.
2. `git rev-parse --show-toplevel`==WORKTREE_ROOT. 3. `git status --short` clean. 4. `git log --oneline -1`; **THEN `git -C "$WORKTREE_ROOT" merge --ff-only main`** to fast-forward to `86cb8d67` (guarantees the GAP-A fix `f563bc89`; confirm `git -C "$WORKTREE_ROOT" merge-base --is-ancestor f563bc89 HEAD` exits 0). If not a clean ff, STOP+report. 5. `bun install`. 6. `bun run pretest`.
## Path discipline:
- ABSOLUTE paths under WORKTREE_ROOT only; NEVER the bare main repo root. S126: prefer Bash edits; echo path before write; re-verify via git diff/grep; NEVER `cd` into main. First commit msg includes verbatim `pwd`: `WIP(09b-rewrite): start at <pwd>`.

# THE REWRITE — pure errors-as-states (option b)
Rewrite `examples/09-error-handling.scrml`:
- **`type ContactError:enum`** with payload-bearing variants (EmptyName / EmptyEmail / InvalidEmail(email: string) / SubmitFailed(reason: string)). **REMOVE the `renders` clauses** — they are an `<errorBoundary>` (§19.6) feature, NOT part of errors-as-states; this example does not use them.
- **`type Phase:enum = { Editing, Submitting, Succeeded, Failed(err: ContactError) }`** — the error IS a held state. `<phase>: Phase = .Editing` replaces the old `<submitted>`/`<sending>` boolean pair.
- **`validate() ! ContactError`** (pure) + **`submit(...) ! ContactError`** (the `?{}` INSERT → §12 server inference). **`handleSubmit()`** routes BOTH `!{}` arms into `@phase = .Failed(err)` (the `err` binding USED, never discarded); success → `@phase = .Succeeded`.
- **Render via `<match for=Phase on=@phase>`**: `<Editing>` (the form with inputs — render directly, GAP-A is fixed), `<Submitting>`, `<Succeeded>`, and **`<Failed err>` renders the error DIRECTLY**.
- **HOW to display the held error in the `<Failed err>` arm — KNOWN CONSTRAINT:** an inline `${ match … :> <markup> }` that returns MARKUP arms currently emits malformed JS (`E-CODEGEN-INVALID-JS`) — DO NOT use it. Instead derive the per-variant message as a STRING and interpolate it. Recommended shape: a pure helper
  `fn errorMessage(e: ContactError) -> string { return match e { .EmptyName :> "Name is required." | .EmptyEmail :> "Email is required." | .InvalidEmail(email) :> email + " is not a valid email address." | .SubmitFailed(reason) :> "Submission failed: " + reason } }`
  (a JS-style value-return `match` returning STRINGS — that path compiles; markup arms are the broken one). Then the arm: `<Failed err> <p class="text-red-600">${errorMessage(err)}</p> <button onclick=handleSubmit()>Try again</button> </>`. **VERIFY this compiles**; if the string-returning match hits any issue, find the cleanest compiling shape that shows the per-variant message + REPORT what you used + why (this held-error-display ergonomics is itself under active design review — your empirical finding is valuable).
- **NO `<errorBoundary>`. NO `showError`/re-fail shim. NO variant `renders` clauses.** One clean lesson: failure → `.Failed(err)` state → match renders it.
- Header comment: frame the lesson as pure errors-as-states (failure modes live in the Phase enum; `!{}` routes each into `.Failed(err)`; the `<match>` arm displays it). Add ONE line noting the variant-`renders`-clause + `<errorBoundary>` is a SEPARATE §19.6 idiom (render-context catch), not used here.

# CONSTRAINTS
- `null`/`undefined` do NOT exist — `not`/`!`/`==`/`!=`. NO bare `match` directly in markup (`E-TYPE-026`). Preserve co-located `#{}` styles (S86) + Tailwind classes. Apostrophes in `<match>`-arm FREE-TEXT break the BS parser (known bug) — avoid them in arm prose (use "We will" not "We'll"); apostrophes inside `="..."` attribute values are safe.
- **Do NOT edit `examples/README.md`** (PA re-aims at land). You own ONLY `examples/09-error-handling.scrml` + the within-node allowlist rebump (next) + your progress.md.

# WITHIN-NODE REBUMP (required — same per-wave tax as 04/05/16)
After the rewrite compiles, the native-vs-default within-node parity gate (`compiler/tests/parser-conformance-within-node.test.js`, allowlist `parser-conformance-within-node-allowlist.json`) will go over-budget for `examples/09-error-handling.scrml`. Re-baseline its allowlist entry to the EXACT new raw classCounts (residual 0) — run the classifier on the file (see how 04/05/16 entries are shaped) and set the entry. Confirm `bun test compiler/tests/parser-conformance-within-node.test.js` → 0 fail.

# ACCEPTANCE GATE
`bun "$WORKTREE_ROOT"/compiler/bin/scrml.js compile "$WORKTREE_ROOT"/examples/09-error-handling.scrml --output-dir <tmp>`: exit 0, ZERO `E-` errors. `node --check` client + server JS. grep: zero `= false`/`= true` flag cells; zero `<errorBoundary>`; zero `showError`/`fail e` shim; zero `renders` clauses; the `<Failed err>` arm displays the per-variant message; every `!{}` arm routes `err` into `.Failed`. Run `bun run test`; confirm 0 fail (incl. the within-node gate after your rebump).

# COMMIT DISCIPLINE
Commit after each meaningful change (`git -C "$WORKTREE_ROOT"`); WIP commits; append `docs/changes/corpus-09-error-handling-2026-06-15/progress.md`; `git status` clean before DONE; no `--no-verify`.

# FINAL REPORT
- WORKTREE_PATH · BRANCH · FINAL_SHA · FILES_TOUCHED · the `pwd` from your first commit
- COMPILE-VERIFY: exit + E- count + node --check + grep-confirmations (no flags / no errorBoundary / no shim / no renders clauses / Failed arm shows per-variant message)
- The exact shape you used to display the held error + any compile constraint you hit (the held-error-display ergonomics finding)
- within-node rebump: the new 09 classCounts + gate pass
- DEFERRED items / wrinkles + Maps feedback line
