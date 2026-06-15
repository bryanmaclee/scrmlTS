You are REWRITING a scrml example to teach idiomatic scrml (change-id `corpus-16-remote-data-2026-06-15`). Wave-1a of the corpus-rewrite arc. The audit verdict: `16-remote-data` uses an inline `${ match @state { .V :> lift <Comp> } }` (the "render-a-component-per-state" anti-pattern) + nested `${for/lift}` rows + an untyped payload + a dead `.Failed` branch. Your rewrite makes it the canonical ASYNC-LOADING-AS-A-PHASE example via the Tier-1 STRUCTURAL match (RULED: `<match for=Phase>`, NOT an engine).

# MAPS — REQUIRED FIRST READ
Read `.claude/maps/primary.map.md` in full first; follow §"Task-Shape Routing" for scrml/example authoring.
Map currency: HEAD `a78272e5` (2026-06-14); now `cd822f7a` (+1 docs-only). Verify against source if needed.
Feedback: report "Maps consulted: [...]; load-bearing finding: <sentence>" OR "not load-bearing."

# REQUIRED READS before writing ANY scrml
1. `docs/articles/llm-kickstarter-v2-2026-05-04.md` IN FULL — esp. §11.5 (the canonical async-lifecycle recipe: a PER-SCREEN enum, NOT a generic stdlib RemoteData<T>) + §7 anti-pattern table.
2. `docs/PA-SCRML-PRIMER.md` §6.2 (match block-form, L224-303) + §6.3 (`<each>`/`<empty>`, L306-367) + the errors-as-states note (L163).
3. SPEC via `compiler/SPEC-INDEX.md`: §18.0.1 (Tier-1 `<match for=Type on=expr>` block-form, bare-variant arm tags, positional payload binding, exhaustiveness), §17.7 (`<each>`/`<empty>`/`@.`/`key=`), §19 (errors-as-states, failable `!` + `!{}`).
4. The current `examples/16-remote-data.scrml` in full.

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE (S99 leaks — do not be the next)
Worktree under `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-<id>/`.
## Startup — BEFORE anything else:
1. `pwd` MUST start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`. Else STOP+report (S90). Save WORKTREE_ROOT.
2. `git rev-parse --show-toplevel`==WORKTREE_ROOT. 3. `git status --short` clean. 4. `git log --oneline -1`==`cd822f7a`. 5. `bun install`. 6. `bun run pretest`.
## Path discipline:
- ABSOLUTE paths under WORKTREE_ROOT only; NEVER the bare main repo root. S126: prefer Bash edits; echo path before write; re-verify via git diff/grep; NEVER `cd` into main — use `git -C "$WORKTREE_ROOT"`/`--cwd`/absolute paths. First commit msg includes verbatim `pwd`: `WIP(16-rewrite): start at <pwd>`.

# THE REWRITE (target idiom — `<match for=Phase>` form compile-verified clean this session)
Rewrite `examples/16-remote-data.scrml`:
- **Type the phase + payload:** `type Contact:struct = { id: int, name: string, email: string }` and `type ContactsPhase:enum = { Idle, Loading, Loaded(rows: Contact[]), Failed(message: string) }`. Use variant name **`Idle`** (matches the kickstarter §11.5 recipe), NOT `NotAsked`. Keep an explicit `<phase>: ContactsPhase = .Idle`.
- **Render via Tier-1 structural `<match for=ContactsPhase on=@phase>`** with bare-variant arm tags `<Idle> <Loading> <Loaded rows> <Failed message>` (positional payload binding per §18.7). DELETE the inline `${ match @state {...} }` lift block — that anti-pattern is the named reason for the rewrite.
- **Inside `<Loaded rows>` use Tier-1 `<each in=rows key=@.id>...<empty>No contacts yet.</empty></each>`** — NOT the nested `${for/lift}`. Fold the empty/zero-rows case into `<each><empty>` (one fewer variant; teaches `<empty>`) rather than a separate `Empty` variant.
- **Wire a LIVE `.Failed` arm:** make the fetch failable — `function fetchContacts() ! ContactsError { ... }` (or the existing fetch made failable) — and at the call site `fetchContacts() !{ | err :> { @phase = .Failed(err); return } }` so the failure routes INTO state (errors-as-states, advances pedagogical gap G2). The current "demo path assumes success" dead branch must become reachable.
- `load()` writes bare `.Variant`s (`@phase = .Loading` etc.). DROP the redundant `${...}` wrapper around top-level type/cell/function decls (v0.3 default-logic mode auto-lifts them; clears W-PROGRAM-REDUNDANT-LOGIC).
- Preserve the `?{}` SQL → §12 server-inference path; it emits a server stub.

# CONSTRAINTS
- `null`/`undefined` do NOT exist — `not` for absence; `!` for boolean negation; `==`/`!=`.
- Preserve co-located `#{}` scoped styles (S86 — never file-top `#{}`); keep existing Tailwind classes (W-TAILWIND-UNRECOGNIZED-CLASS warnings backed by `#{}` rules are expected/fine).
- Rewrite the file HEADER COMMENT to frame the lesson as "async loading is a typed Phase enum, rendered with the Tier-1 `<match for=Phase>` structural block; promote to `<engine>` when you need transition enforcement." Mention the Tier ladder.
- **Do NOT edit `examples/README.md`** — PA re-aims the README row at land. You own ONLY `examples/16-remote-data.scrml`.

# ACCEPTANCE GATE (compile-verify — required before DONE)
`bun "$WORKTREE_ROOT"/compiler/bin/scrml.js compile "$WORKTREE_ROOT"/examples/16-remote-data.scrml --output-dir <tmp>`: exit 0, ZERO `E-` errors (W-/I-/W-CG-001-server-only/W-PROGRAM-SPA-INFERRED are fine). NOTE: the repro needs the DB present — copy `examples/contacts.db` (or the file's actual db) next to your compile if the compile hits `E-PA-002` missing-db (that is a test-env artifact, not an idiom error). `node --check` the emitted client AND server JS. grep: zero `${ match` inline-match-lift blocks, zero `${ for` row-renders. Run `bun run test`; note any delta.

# COMMIT DISCIPLINE
Commit after each meaningful change (`git -C "$WORKTREE_ROOT"`); WIP commits expected; append `docs/changes/corpus-16-remote-data-2026-06-15/progress.md` each step; `git status` clean before DONE; no `--no-verify`.

# FINAL REPORT (return exactly)
- WORKTREE_PATH · BRANCH · FINAL_SHA · FILES_TOUCHED
- The `pwd` from your first commit
- COMPILE-VERIFY: exit code + E- count + node --check (client+server) + the grep-confirmations
- Confirmation the `.Failed` arm is LIVE (the failable+`!{}` wiring)
- DEFERRED items / wrinkles
- Maps feedback line
