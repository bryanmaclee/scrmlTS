# R25-Bug-40 — `:`-shorthand inside `<each>` item body silently emits empty fragment

You are dispatched to fix known-gaps Bug 40 (gauntlet R25 finding; HIGH severity; Svelte dev-3 + overseer-3 confirmed; likely affects dev-1's "all 7 `<each>` item factory bodies empty" finding).

Change-id: `r25-bug-40-each-colon-shorthand-2026-05-27`

The PA archives this brief to `docs/changes/r25-bug-40-each-colon-shorthand-2026-05-27/BRIEF.md` per pa.md S136 addendum.

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE

Your worktree path: provided by the harness (run `pwd` to learn it).

## Startup verification (do this BEFORE any other tool call)

1. Run `pwd`. Output MUST start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`. If under any other repo, STOP and report (S90 CWD-routing failure).
2. Run `git rev-parse --show-toplevel`. Must equal WORKTREE_ROOT.
3. Run `git status --short`. Confirm tree is clean.
4. Run `bun install`. Worktrees do NOT inherit node_modules.
5. Run `bun run pretest`. Without it the full-suite has ~130 ECONNREFUSED failures.

If ANY check fails: DO NOT proceed.

## Startup-merge of main (S112 banked rule)

Worktree base is the session-start commit, not live HEAD. Mid-session dispatches branch stale. Before any fix work:

```
git -C "$WORKTREE_ROOT" merge main
```

Current main HEAD: `ebeba766` (R25-Bug-41 landing, S137). Includes the Bug 41 fix to `emit-html.ts` (server-only state-block exclusion) — your work touches `emit-each.ts` and/or `:`-shorthand expansion path; should NOT touch emit-html.ts or emit-logic.ts (touched by Bug 38).

## Echo-pwd-in-first-commit (S99 — leak counter is 20; this would be incident #21)

Your FIRST commit message MUST include verbatim `pwd` output: `WIP(r25-bug-40): start at $(pwd)`.

## Path discipline

**S126 mitigation: apply file edits via BASH (`perl`/`python`/`sed -i`/`cp`/heredoc), NOT Edit/Write tools, on worktree-absolute paths.** Echo target path before each write; re-verify via `git diff`/`grep` after. **NEVER `cd` into the main repo from this worktree.** Use `git -C "$WORKTREE_ROOT"` exclusively.

# MAPS — REQUIRED FIRST READ

Read `.claude/maps/primary.map.md` in full. §"Task-Shape Routing" names additional maps. This task is a **compiler-source bug fix** (codegen subsystem; `<each>` iteration + `:`-shorthand body composition).

Map currency: maps watermark `27e14c66` (S135). Current main `ebeba766` — 26+ commits ahead. **Critical post-map landings affecting this dispatch:**
- `<each>` codegen `emit-each.ts` shipped at S131 commit `23db318c` (Landing 1 iteration arc) — this IS post-map. Read the file at current HEAD as ground truth.
- `:`-shorthand body §4.14 (SPEC) is older; `engine-statechild-parser.ts` + `engine-statechild-walker.ts` + `symbol-table.ts` carry the `:`-shorthand grammar recognition. PA's pre-recon found those file names; verify.

Feedback in final report: "Maps consulted: [list]; load-bearing finding: <one sentence>" OR "Maps consulted but not load-bearing".

# REQUIRED FIRST READS (canon)

1. `.claude/maps/primary.map.md`
2. `scrml-support/docs/gauntlets/BRIEFING-ANTI-PATTERNS.md` — ghost-pattern mitigation; reread before each major edit
3. `docs/articles/llm-kickstarter-v2-2026-05-04.md` — canonical scrml shape (for test fixtures)
4. **SPEC.md §4.14 (`:`-shorthand body grammar) + §17.7 (iteration / `<each>`)** — read in full for what `<each>` item bodies with `:`-shorthand SHOULD emit
5. **PRIMER §6.3 (Iteration Tier 1) + §4.14 cross-refs** — the four canonical `<each>` shapes are documented; one of them is `:`-shorthand body
6. **`compiler/src/codegen/emit-each.ts` file header comment** — the file's intro EXPLICITLY claims: *"the template walk inside `templateChildren` honors both bare-body and `:`-shorthand per-item element shapes"*. Bug 40 is a discrepancy between intent and implementation — the claim is wrong as of current main.

# THE BUG

## Symptom (R25 dev-3-svelte + overseer-3 confirmed; likely dev-1 too)

`<each in=@list><span : @.field><empty>...</></each>` emits an item factory that returns an empty `documentFragment.firstChild` (always `null`). No `span` element, no text content. Renders nothing per item.

Confirmed reproducers:
1. **Minimal:** `<each in=@items><span : @.name></each>` — item factory body is empty.
2. **With `<empty>`:** `<each in=@list><span : @.field><empty>...</></each>` — same (verified S136 R25).
3. **dev-1 finding:** all 7 `<each>` item factory bodies empty (dev-1 used `<li class="card" : @.title>` `:`-shorthand throughout).
4. **`<empty : "string literal">` body itself:** also fails to render (overseer-3 verified).

## The intent (per primer + spec + emit-each.ts file-header comment)

PRIMER §6.3 lists 4 canonical `<each>` shapes, including:
```scrml
<each in=@contacts>
    <li : @.name>
</each>
```

emit-each.ts file-header comment line 9-12 says: *"Per Q3 RE-RATIFICATION, per-item element openers admit SPEC §4.14 `:`-shorthand body for single-expression bodies. The template walk inside `templateChildren` honors both bare-body and `:`-shorthand per-item element shapes."*

The bug is that `templateChildren` traversal in emit-each.ts does NOT actually honor `:`-shorthand per-item-element bodies — the body is parsed (the `:`-shorthand AST is constructed) but its content is not wired into the per-item factory's return value.

## Locus hypothesis (verify, don't trust)

PA brief HYPOTHESIS: the bug is in `compiler/src/codegen/emit-each.ts` template-walk path — `:`-shorthand AST children are present but not rendered into the per-item-factory's createElement-style emission. The free-text `<empty>...</>` body shape works correctly, so the bug is isolated to the `:`-shorthand expansion compose-with-each-item-factory.

**Suggested investigation order (grep-driven, S136 lesson):**
1. **Construct minimal reproducer**: `.scrml` file with `<each in=@items><span : @.name></each>` — compile + inspect emitted JS. Find the per-each render function. Confirm the item factory body is empty (`return _scrml_dom_create_element("span"); return spanEl;` — no text-content wiring).
2. **Grep `templateChildren` in emit-each.ts** — see how it's built. Is `:`-shorthand body content folded into `templateChildren`? Is there a sibling structure for the shorthand body?
3. **Compare to bare-body emission**: `<each in=@items><span>${@.name}</span></each>` (workaround form) — does this generate the correct item factory? If yes, the bug is in how `:`-shorthand-expanded content reaches the item-factory template walk.
4. **Trace `:`-shorthand recognition**: PA recon found `isColonShorthand` referenced in `engine-statechild-parser.ts`, `engine-statechild-walker.ts`, `symbol-table.ts`, `emit-engine.ts`. The engine-statechild path apparently HAS `:`-shorthand support; check whether `<each>` parsing went through the same `:`-shorthand grammar but did NOT carry the body content through to codegen.

**Important — scope this fix narrowly:**
1. **Bug 40 is specifically about `<each>` item bodies using `:`-shorthand.** Close THAT.
2. **Sibling `:`-shorthand contexts** (engine state-children, match block-form arms) may already work correctly — don't touch those paths unless your fix is structurally tied to them.
3. **DO NOT touch emit-html.ts (Bug 41 territory) or emit-logic.ts (Bug 38 territory)** — both shipped this session and are stable.
4. **`<empty>` sub-element with `:`-shorthand body** (`<empty : "string">`) — overseer-3 verified this also fails. If your fix is `<each>`-item-factory-template-walk only and doesn't naturally include `<empty>`, surface it; file as deferred Bug 40b OR include if same code path.

# WHAT YOU MUST DO

## Phase 0 — diagnose

1. **Construct minimal reproducer**. Build a tiny `.scrml`:
   ```scrml
   <program title="repro">

       <state>
           <items>: { name: string }[] = [
               { name: "alice" },
               { name: "bob" }
           ]
       </state>

       <page>
           <ul>
               <each in=@items>
                   <li : @.name>
               </each>
           </ul>
       </page>

   </program>
   ```
   (Verify against current PRIMER + SPEC for the right `<state>` syntax. Adjust if the form has drifted.)

2. **Compile** and inspect emitted JS. Find the per-each render function (`_scrml_each_<N>_render` or similar). Confirm item factory body is empty.

3. **Compare** to bare-body shape:
   ```scrml
   <li>${@.name}</li>
   ```
   inside the `<each>`. This MUST work — it's the canonical workaround per known-gaps. Find what the item factory looks like for THIS shape vs the broken `:`-shorthand shape.

4. **Trace the AST** — print the `each-block` node's children for both shapes. Compare. Identify where `:`-shorthand content gets lost.

5. **Report root-cause hypothesis** in `docs/changes/r25-bug-40-each-colon-shorthand-2026-05-27/progress.md` BEFORE writing fix code. Surface any disagreement with brief.

## Phase 1 — fix

Apply the minimal fix:
- If template walk drops `:`-shorthand body: extend walk to honor it.
- If `:`-shorthand body is in a sibling AST property: route it to the per-item factory.
- If the parser-side stripped the `:`-shorthand body: fix the parser AND verify codegen wires it.

**Compose correctly with:**
- Bare-body `<li>${@.name}</li>` form (regression-guard — must STILL work).
- Self-closing per-item elements with attribute-only bodies (`<input value=@.x/>`).
- `<empty>` sub-element bare-body form (must STILL work).
- `<empty>` sub-element `:`-shorthand form (`<empty : "no items">`) — fix if same path; defer with note if separate.

## Phase 2 — regression tests

Write a regression test file at `compiler/tests/unit/each-colon-shorthand-r25-bug-40.test.js` (NEW). Required test sites:

1. **Minimal repro** — `<each in=@items><li : @.name></each>`; assert emitted per-item factory wires `@.name` into the `<li>` element's textContent or equivalent
2. **`:`-shorthand with attribute** — `<each in=@items><li class="card" : @.title></each>`; both attribute AND `:`-shorthand body wired (dev-1's shape)
3. **`<each of=N>` count form** — `<each of=10><li : "Slot " + @.></each>`; count-form item factory with `:`-shorthand body
4. **Multi-element body** — `<each in=@items><div><h3 : @.title></div></each>`; nested `:`-shorthand inside non-`:`-shorthand parent
5. **Mixed `:`-shorthand and bare body** — `<each in=@items><li : @.name><span>${@.email}</span></each>`; both forms in one each-block (if structurally legal)
6. **Positive control (bare-body)** — `<each in=@items><li>${@.name}</li></each>`; regression-guard the canonical workaround still works
7. **`<empty>` bare-body** — regression-guard `<empty>No items</empty>` still works
8. **`<empty : "literal">`** — if same code path; file as deferred Bug 40b if separate
9. **`as name` alias** — `<each in=@items as item><li : item.name></each>`; `:`-shorthand with `as`-aliased name
10. **`@.id` key inference** — confirm key= still resolves correctly with `:`-shorthand bodies

Aim for 10-15 tests minimum. Compose with the existing `compiler/tests/unit/each-block.test.js` — don't conflict.

## Phase 3 — verify

1. `node --check` on emitted JS for reproducer: parse clean.
2. Browser-test the per-item factory actually creates the `<li>` with correct text. The agent can use happy-dom or a snapshot test for emitted-JS structure.
3. Full suite: `bun run test` must pass. Baseline at PA HEAD `ebeba766`: **21,870 pass / 0 fail / 170 skip / 1 todo / ~806 files**.

# COMMIT DISCIPLINE (S83 two-sided + S113 coupled-code-test)

Coupled code + test = ONE commit. WIP commits for crash-recovery are fine.

After every edit: `git diff <file>` to verify; commit IMMEDIATELY.

Before "DONE": `git status` clean; `git log --oneline | head -5` shows your commits.

# `--no-verify` PROHIBITION (S136 absolute rule)

**ABSOLUTE: you SHALL NOT use `--no-verify`.** If pre-commit fails:
- Pretest race: STOP, wait 30s, re-run. STILL fails → STOP-and-report.
- Test regression: STOP, investigate.
- Environmental: re-run `bun install` + `bun run pretest`.

R25-Bug-36 + R25-Bug-38 + R25-Bug-41 agents all honored the prohibition cleanly this session. You follow.

# REPORTING

1. **WORKTREE_PATH** (literal `pwd`)
2. **BRANCH**
3. **FINAL_SHA**
4. **FILES_TOUCHED**
5. **TEST_DELTA**
6. **ROOT-CAUSE FINDING** (1-2 paragraphs)
7. **REPRODUCER VERIFICATION** (per-item factory BEFORE/AFTER; node --check)
8. **MAPS CONSULTED + load-bearing finding**
9. **`<empty>` `:`-shorthand sub-case disposition** (FIXED / DEFERRED with reasoning)
10. **DEFERRED ITEMS**
11. **PROCESS VIOLATIONS** (honest declaration)

# OUT OF SCOPE

- Bug 37 (`<each in=...>` arrow truncation) — separate next dispatch
- Bug 38 (`!{}` arm body — RESOLVED at `933d1ad3`)
- Bug 41 (`<schema>` HTML leak — RESOLVED at `ebeba766`)
- Bug 31 / R24-BUG-5 — separate bug, deferred
- SPEC changes — codegen-only fix
- Any refactor beyond what fix requires

# IF YOU GET STUCK

If after 60-90 minutes you can't pin the root cause, STOP and produce partial report. WIP commit each meaningful step. Append progress.md.

GO.
