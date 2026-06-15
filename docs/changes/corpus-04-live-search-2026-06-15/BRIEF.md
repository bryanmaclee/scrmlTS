You are REWRITING a scrml example to teach idiomatic scrml (change-id `corpus-04-live-search-2026-06-15`). Wave-1a of the corpus-rewrite arc. The audit verdict: `04-live-search` filters via a Tier-0 `${ for … if(!matches) continue; lift }` loop, holds its data as a non-reactive `const people` array, and uses NO derived cell — React's `.filter().map()` mental model in imperative scrml. Your rewrite makes it the canonical DERIVED-CELL + `<each>`/`<empty>` example.

# MAPS — REQUIRED FIRST READ
Read `.claude/maps/primary.map.md` in full first; follow §"Task-Shape Routing" for scrml/example authoring.
Map currency: HEAD `a78272e5` (2026-06-14); now `cd822f7a` (+1 docs-only). Verify against source if needed.
Feedback: report "Maps consulted: [...]; load-bearing finding: <sentence>" OR "not load-bearing."

# REQUIRED READS before writing ANY scrml
1. `docs/articles/llm-kickstarter-v2-2026-05-04.md` IN FULL — esp. §7 anti-pattern table (`items.map()`/`${for/lift}` → `<each>`).
2. `docs/PA-SCRML-PRIMER.md` §6.3 (`<each>`/`<empty>`/`@.`/`key=`, L306-367) + §6.4 sub-shape (1) iteration (L396-410).
3. SPEC via `compiler/SPEC-INDEX.md`: §6.6.1/.2/.3 (the LOAD-BEARING contrast: `const total =` is a STATIC snapshot; `const <total> =` is a REACTIVE derived cell that re-evaluates on upstream `@`-change), §17.7 / §17.7.4 / §17.7.5 (`<each in= key=>` + `<empty>` + inferred-key Landing-1 caveat).
4. The current `examples/04-live-search.scrml` in full.

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE (S99 leaks — do not be the next)
Worktree under `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-<id>/`.
## Startup — BEFORE anything else:
1. `pwd` MUST start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`. Else STOP+report (S90). Save WORKTREE_ROOT.
2. `git rev-parse --show-toplevel`==WORKTREE_ROOT. 3. `git status --short` clean. 4. `git log --oneline -1`==`cd822f7a`. 5. `bun install`. 6. `bun run pretest`.
## Path discipline:
- ABSOLUTE paths under WORKTREE_ROOT only; NEVER the bare main repo root. S126: prefer Bash edits; echo path before write; re-verify via git diff/grep; NEVER `cd` into main — use `git -C "$WORKTREE_ROOT"`/`--cwd`/absolute paths. First commit msg includes verbatim `pwd`: `WIP(04-rewrite): start at <pwd>`.

# THE REWRITE (target idiom — compile-verified clean this session, both body forms, ZERO gaps)
Rewrite `examples/04-live-search.scrml`:
- **Type the data + make it reactive:** `type Person:struct = { id: number, name: string, role: string }`; promote the static `const people = [...]` to a reactive typed cell `<people>: Person[] = [...]` (keep the existing rows). (Keep the existing comment that production would source it from a `?{}` query.)
- **Replace the `${ for … if(!matches) continue; lift }` block with a DECLARED DERIVED CELL** at the top of the `<program>` body (logic-default context, no `${}` wrapper needed per §6.6.1):
  `const <filtered> = @people.filter((p) => { const q = @query.toLowerCase(); return p.name.toLowerCase().includes(q) || p.role.toLowerCase().includes(q) })`
  — per §6.6.2 this re-evaluates automatically whenever `@query` or `@people` changes. The filter logic moves OUT of the render INTO a named, reactive, declared cell.
- **Render it structurally:** `<ul><each in=@filtered key=@.id> <li>…multi-element body with ${@.name} / ${@.role}…</li> <empty><li class="...">No people match your search.</li></empty> </each></ul>`. Use **explicit `key=@.id`** (§17.7.5 Landing-1 caveat — the reliable W-EACH-KEY-001 silencer). Use a MULTI-ELEMENT `<li>` body (two styled spans, preserving the current two-column name+role layout) — NOT `:`-shorthand (which would lose the layout).
- Keep `<query> = ""` + `bind:value=@query` as-is. The `<empty>` provides the no-results zero-state the current file lacks.

# CONSTRAINTS
- `null`/`undefined` do NOT exist — `not` for absence; `!` for boolean negation; `==`/`!=`.
- Preserve co-located `#{}` scoped styles (S86 — never file-top `#{}`); preserve ALL existing Tailwind utility classes.
- Rewrite the file HEADER COMMENT to frame the lesson as "a derived reactive cell (`const <filtered>`) + `<each>`/`<empty>`" — NOT "for/lift/if(continue), no derived-state boilerplate."
- **Do NOT edit `examples/README.md`** — PA re-aims the (actively-miseducating) README row at land. You own ONLY `examples/04-live-search.scrml`.

# ACCEPTANCE GATE (compile-verify — required before DONE)
`bun "$WORKTREE_ROOT"/compiler/bin/scrml.js compile "$WORKTREE_ROOT"/examples/04-live-search.scrml --output-dir <tmp>`: exit 0, ZERO `E-` errors (W-PROGRAM-SPA-INFERRED info is fine). `node --check` the emitted client JS. grep: zero `${ for` loops; a `const <filtered>` derived cell present; `<each in=@filtered key=@.id>` + `<empty>` present; `<people>: Person[]` reactive cell (not `const people`). Confirm the emitted client JS contains `_scrml_derived_declare` + `_scrml_reconcile_list` (proves the idiom isn't silently dropped). Run `bun run test`; note any delta.

# COMMIT DISCIPLINE
Commit after each meaningful change (`git -C "$WORKTREE_ROOT"`); WIP commits expected; append `docs/changes/corpus-04-live-search-2026-06-15/progress.md` each step; `git status` clean before DONE; no `--no-verify`.

# FINAL REPORT (return exactly)
- WORKTREE_PATH · BRANCH · FINAL_SHA · FILES_TOUCHED
- The `pwd` from your first commit
- COMPILE-VERIFY: exit code + E- count + node --check + the grep-confirmations + the `_scrml_derived_declare`/`_scrml_reconcile_list` presence
- DEFERRED items / wrinkles
- Maps feedback line
