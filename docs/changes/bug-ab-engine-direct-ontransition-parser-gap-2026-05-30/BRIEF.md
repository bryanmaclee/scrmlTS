# BRIEF — bug-ab-engine-direct-ontransition-parser-gap-2026-05-30

> Archived verbatim per pa.md S136. Dispatched S145 (2026-05-30) via `scrml-dev-pipeline`, `isolation: "worktree"`, `model: opus`, background. Agent ID `abca2bafa7cf321ee`. From main HEAD `3b825808`. Reopens Bug-AB (6nz s144-5closed-AB-partial); verified GENUINE by workflow `wf_272f8c8d-68e`.

---

scrml COMPILER fix (TypeScript: parser + engine codegen). Change-id: `bug-ab-engine-direct-ontransition-parser-gap-2026-05-30`. Reopens Bug-AB (6nz); verified GENUINE on HEAD by a PA workflow. Localized.

# MAPS — REQUIRED FIRST READ
Read `.claude/maps/primary.map.md` in full; Task-Shape Routing for parser + codegen. Maps reflect `9ab7aa38` (~32 behind); verify file-claims against source. PA gave exact loci (below).
Feedback line in report: maps load-bearing or not.

# STARTUP + PATH DISCIPLINE (BEFORE any other tool call)
S99=20; don't make #21.
1. `pwd` starts with `/home/bryan/scrmlMaster/scrmlTS/.claude/worktrees/agent-` (else STOP, S90). Save WORKTREE_ROOT.
2. `git rev-parse --show-toplevel`==WORKTREE_ROOT. 3. `git status --short` clean. 4. `bun install`. 5. `bun run pretest`. Baselines via `bun run test`. ANY fail → STOP.
PATH (S126): ALL edits via Bash (`perl -i`/`python`/heredoc) on worktree-absolute paths incl `.claude/worktrees/agent-<id>/`; NOT Edit/Write; echo path before write; re-verify after. NEVER `cd` outside WORKTREE_ROOT; use `git -C "$WORKTREE_ROOT"`, bun from WORKTREE_ROOT.

# THE BUG — canonical engine-direct `<onTransition>` is parser-dropped → effects never fire (HIGH)

S144 commit `5113f3ea` claimed to fix Bug-AB but only landed the write-ROUTING (`@mode = .Edit` routes through `_scrml_engine_direct_set` ✓). The `<onTransition>` EFFECT-FIRING is still broken for the CANONICAL/DOCUMENTED placement: `<onTransition from=.X to=.Y>` as a DIRECT child of `<engine>` (the PRIMER §7 / SPEC §51.0.H shape).

ROOT (PA-verified): `compiler/src/engine-statechild-parser.ts:1707-1710` — the engine-body state-child scanner only accepts openers whose next char is uppercase A-Z (`if (!next || next < "A" || next > "Z") { i = lt+1; continue; }`; tag regex `^([A-Z][A-Za-z0-9_]*)`). `<onTransition>` is lowercase-led → SKIPPED entirely, never enters the state-child set. The ONLY path that captures onTransition is `scanForOnTransitionEntries` (~867, invoked ~1911) which scans each STATE-CHILD's bodyRaw — i.e. onTransition NESTED INSIDE a state-child only. So the engine-DIRECT form is dropped → `collectEngineHooks` (emit-engine.ts:2906-2970) reads only `child.onTransitionElements`, returns [] for the engine-direct form → `engineHasHooks=false` (emit-engine.ts:3253) → `collectEnginesWithHooks` omits the engine (emit-engine.ts:3265) → no fire function emitted → write-site inserts no hook-fire call. Canonical onTransition is silently no-op'd, no diagnostic.

IMPORTANT — the fire machinery EXISTS and WORKS for the NESTED placement (onTransition inside a state-child body). So this is a PARSER COVERAGE GAP on the documented placement, NOT absent codegen/runtime. Confirm both: (1) nested form fires (works), (2) engine-direct form doesn't (broken).

FIX (PA-suggested, verify + adapt): hoist `scanForOnTransitionEntries` to ALSO run over the FULL engine rulesRaw (not just per-state-child bodyRaw); attach the resulting engine-direct entries to a new engine-level field (e.g. `engineMeta.engineOnTransitions`); have `collectEngineHooks` (emit-engine.ts:2906) consume that field IN ADDITION to per-child `onTransitionElements`, mapping from=/to= edges directly (both endpoints explicit — no enclosing-state-child inference needed). ~1 parser scan-site + 1 metadata field + 1 collectEngineHooks branch. NO runtime change (the fire machinery is proven). Consider an E-diagnostic if a malformed engine-direct onTransition can't be placed.

# ACCEPTANCE (R26 empirical)
Minimal canonical repro (write to /tmp): a `<program>` with `type Mode:enum = { Nav, Edit }`, `<transitions> = 0`, an `<engine for=Mode initial=.Nav>` whose state-children are `<Nav rule=.Edit>: "nav"` / `<Edit rule=.Nav>: "edit"` AND a DIRECT-child `<onTransition from=.Nav to=.Edit>${ @transitions = @transitions + 1 }</>` (+ the reverse), a program-scope `function toggle(){ if (@mode == .Nav) { @mode = .Edit } else { @mode = .Nav } }`, a button `onclick=toggle()`, and `<p>${@transitions}</p>`.
- Post-fix: the emitted JS contains the onTransition effect body (`@transitions + 1` → `_scrml_reactive_set("transitions", ...)`), the hooks table is POPULATED (not empty), and the write path fires the hook. If feasible, happy-dom: clicking toggle increments `@transitions`. At minimum assert the emit: effect body present + fire-call wired on the direct-set path.
- Verify the NESTED placement still works (no regression).
- No regressions: full `bun run test` green (+N). NB the 3 known flakes — re-run isolated; no `--no-verify`.
- Write a regression test for the CANONICAL engine-direct shape (the existing working test path uses the nested shape — test-silent gap; close it).

# COMMIT DISCIPLINE (S83+S99): commit per edit via `git -C "$WORKTREE_ROOT"`; FIRST msg has verbatim `pwd`; NO `--no-verify`; clean `git status` before DONE.

# FINAL REPORT: WORKTREE_PATH·BRANCH·FINAL_SHA·FILES_TOUCHED·fix summary (parser scan + meta field + collectEngineHooks branch)·nested-still-works confirmation·R26 result (emit + happy-dom if done)·test delta·maps line·deferred. Also explicitly note: this CORRECTS the S144 record — the "fire_hooks generated, only routing missing" claim was wrong for the engine-direct form.
