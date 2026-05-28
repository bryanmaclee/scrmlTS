# R25-Bug-37 — `<each in=@x.filter(c => c.foo == 1)>` arrow function truncated at attribute-value emission

You are dispatched to fix known-gaps Bug 37 (gauntlet R25 finding; HIGH severity; minimally reproduced by overseer-4).

Change-id: `r25-bug-37-each-arrow-truncation-2026-05-27`

The PA archives this brief to `docs/changes/r25-bug-37-each-arrow-truncation-2026-05-27/BRIEF.md` per pa.md S136 addendum.

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE

Your worktree path: provided by the harness (run `pwd` to learn it).

## Startup verification

1. Run `pwd`. Output MUST start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`. If under any other repo, STOP (S90 CWD-routing).
2. Run `git rev-parse --show-toplevel`. Must equal WORKTREE_ROOT.
3. Run `git status --short`. Clean.
4. Run `bun install`. (Worktrees don't inherit node_modules.)
5. Run `bun run pretest`. (Populates browser-test dist fixtures.)

If ANY check fails: STOP.

## Startup-merge of main (S112)

```
git -C "$WORKTREE_ROOT" merge main
```

Current main HEAD: `50d38095` (R25-Bug-40 landing, S137). Includes the Bug 40 BS-level `:`-shorthand fix to `block-splitter.js` + `ast-builder.js` + `emit-each.ts`. **Your work likely touches the same BS-level attribute-value parsing path** — heads up that Bug 40 just modified `scanAttributes` (bracketDepth tracking, etc.). Read the Bug 40 diff before changing block-splitter behavior:

```
git -C "$WORKTREE_ROOT" log --stat 50d38095 -- compiler/src/block-splitter.js
git -C "$WORKTREE_ROOT" log --stat 50d38095 -- compiler/src/ast-builder.js
```

## Echo-pwd-in-first-commit (S99 — counter is 20)

First commit message: `WIP(r25-bug-37): start at $(pwd)`.

## Path discipline

**S126 mitigation: all compiler-source edits via BASH (`perl`/`python`/`sed -i`/`cp`/heredoc), NOT Edit/Write tools.** Echo target path before each write; re-verify via `git diff`/`grep`. **NEVER `cd` into the main repo.** Use `git -C "$WORKTREE_ROOT"` exclusively.

# MAPS — REQUIRED FIRST READ

Read `.claude/maps/primary.map.md` in full. §"Task-Shape Routing" names additional maps. This task is a **compiler-source bug fix** (attribute-value parsing / BS layer / possibly tokenization).

Maps watermark `27e14c66` (S135). Main `50d38095` — 27+ commits ahead. Post-map landings affecting this dispatch:
- Bug 40 (`50d38095`, S137 this session) modified `scanAttributes` in `block-splitter.js` for `:`-shorthand recognition. Different attribute parsing concern than yours but SAME function.
- `<each>` codegen `emit-each.ts` shipped S131 `23db318c`.

Feedback in final report: "Maps consulted: [list]; load-bearing finding: <one sentence>".

# REQUIRED FIRST READS (canon)

1. `.claude/maps/primary.map.md`
2. `scrml-support/docs/gauntlets/BRIEFING-ANTI-PATTERNS.md`
3. `docs/articles/llm-kickstarter-v2-2026-05-04.md`
4. **SPEC.md §17.7 (iteration / `<each>`) + §5 (attribute quoting semantics)** — read for what attribute values with arrow functions / expressions SHOULD parse as
5. **Bug 40's BS-level fix** (`git show 50d38095`) — same scanAttributes territory; understand what changed before changing it

# THE BUG

## Symptom (R25 overseer-4 minimally reproduced)

`<each in=@x.filter(c => c.foo == 1)>` in `.scrml` source emits this in JS:

```js
_scrml_reactive_get("x").filter(c =;
```

The `=>` is SEVERED — predicate body dropped, closing paren replaced with `;`. Compile exits 0 (no error fired). `node --check` FAILS with `SyntaxError: Unexpected token ';'`. Silent compiler bug → broken runtime.

Reproducer: `<each in=@x.filter(c => c.foo == 1)>` in any `.scrml` file. R25 overseer-4 has the working repro at `/tmp/r25-overseer-each-arrow-repro.scrml` (probably ephemeral).

## What the bug breaks structurally

The fix has two reasonable shapes — agent picks based on what investigation reveals:

**Shape A — accept the inline arrow** in `<each in=expr>` attribute-value position. This requires the BS-level attribute-value tokenizer to correctly handle the `=>` token (it's currently being misinterpreted; possibly as a `=>` mid-expression that ends an attribute value or that triggers some other state-machine logic).

**Shape B — emit a parse-time diagnostic** `E-EACH-INLINE-ARROW` rejecting inline arrows in `<each in=...>` and naming the canonical workaround (`const <filtered> = @x.filter(c => ...)` then `<each in=@filtered>`). This is per SPEC §17.7 / PRIMER §6.3 / kickstarter §3.1 §11.4 "the canonical scrml shape is hoist to derived cell."

PA does NOT pre-pick the shape — the agent decides based on (a) how hard Shape A is given the BS-layer, (b) whether arrow funcs are otherwise legal in attribute-value expression positions today, (c) whether Shape B fits the "fail fast over silent miscompile" principle.

**PA lean:** Shape A (accept) is the cleanest adopter-side answer if it's structurally tractable; the workaround `const <filtered> = @x.filter(...)` already exists for adopters who prefer it. If Shape A is non-trivial (multi-step fix touching multiple BS-layer pieces), Shape B (emit diagnostic) is the surgical "no silent miscompile" close + leave Shape A as a documented enrichment item. **The minimum bar to close Bug 37 is: NO MORE SILENT MISCOMPILE.** Either accept it, or reject it explicitly. Don't let it slip through.

## Locus hypothesis (verify, don't trust)

PA brief HYPOTHESIS: the bug is in `compiler/src/block-splitter.js` `scanAttributes` OR in TAB / `tokenizeAttributes` — the `=>` token in an attribute-value expression is being mis-tokenized. The `=` of `=>` is likely terminating something prematurely (an attribute-value boundary scan?), the `>` is then closing the opener (which is why the rest of the predicate body gets dropped and the `;` is the next post-tag-close character collapsed in).

**Grep-driven investigation:**
1. Grep `=>` handling in `block-splitter.js` and `tokenizeAttributes` (likely `attribute-tokenizer.js` or similar).
2. Look at how OTHER attribute-bearing elements treat inline arrow functions in attribute values: `<div onclick={(e) => handler(e)}>` (event handler braced form) is legal. Does that path work? If so, the `=>` is fine in BRACED attribute values; the bug is `=>` in BARE / equals-form attribute values (`in=expr` form, no braces).
3. Bug 40 just modified scanAttributes for `:`-shorthand recognition with bracketDepth tracking. The `=>` token might be confusing scanAttributes' state machine — verify whether the new bracketDepth logic correctly tracks the parens around the arrow function `(c => c.foo == 1)`.

**Important — scope this fix narrowly:**
1. **Bug 37 is specifically about `<each in=...>` with inline arrow.** Close THAT.
2. **Don't speculatively change attribute-value parsing for unrelated cases.** If other attributes (`<button onclick=...>`) have the same bug, file as deferred Bug 37b OR include if same fix.
3. **DO NOT touch the Bug 40 `:`-shorthand recognition** — those write-side stamps + the budget rebump are session-stable. Add your work alongside, don't break Bug 40's path.

# WHAT YOU MUST DO

## Phase 0 — diagnose

1. **Construct minimal reproducer**:
   ```scrml
   <program title="repro">

       <state>
           <items>: { foo: int }[] = [
               { foo: 1 },
               { foo: 2 },
               { foo: 1 }
           ]
       </state>

       <page>
           <ul>
               <each in=@items.filter(c => c.foo == 1)>
                   <li>${@.foo}</li>
               </each>
           </ul>
       </page>

   </program>
   ```
   (Verify against current PRIMER + SPEC. Adjust for the right state-decl syntax.)

2. **Compile** and inspect emitted JS. Confirm the truncation symptom (`filter(c =;`).

3. **Compare** to the workaround:
   ```scrml
   const <filtered> = @items.filter(c => c.foo == 1)
   ...
   <each in=@filtered>...</each>
   ```
   This MUST work — derived cell is the canonical workaround per kickstarter §3.1/§11.4. Confirm.

4. **Compare** to inline arrow in other attribute-value positions to localize the bug:
   - `<button onclick={(e) => handler(e)}>` (braced form — typically a code context)
   - `<div data-x=@items.filter(c => c.foo)/>` (bare data-attribute with method-chain arrow)
   - Bare expression attribute (`in=expr` form) vs braced expression (`{expr}` form) — does only one variant have the bug?

5. **Trace** the BS attribute-value tokenizer. Find where `=>` / `>` ends up being mishandled. Walk the token stream for the buggy input and identify the off-by-one.

6. **Decide shape A vs shape B** based on investigation. Report decision in `docs/changes/r25-bug-37-each-arrow-truncation-2026-05-27/progress.md` with rationale BEFORE writing fix code.

## Phase 1 — fix

**If Shape A (accept inline arrow):**
- Extend the BS-level attribute-value scanner to correctly handle `=>` inside parens / bracketed contexts. The Bug 40 fix added `bracketDepth` tracking; you may extend that OR add sibling tracking for `=>` token cohesion.
- Compose correctly with Bug 40's `:`-shorthand recognition (don't break that).
- Compose correctly with other attribute-value forms (braced `{expr}`, bareword, quoted string).

**If Shape B (emit diagnostic):**
- Detect inline `=>` in `<each in=...>` attribute-value at parse time.
- Emit `E-EACH-INLINE-ARROW` with helpful message naming the workaround.
- File this as `§34` registry entry (look at how other E-EACH-* codes are registered).
- SPEC entry not required for spec-only-when-needed — file in `compiler/src/error-codes.js` or wherever the codes live. The brief is codegen-only by default; if SPEC entry is structurally required by Rule 4, surface that as a separate spec-amendment item.

## Phase 2 — regression tests

Write a regression test file at `compiler/tests/unit/each-in-arrow-r25-bug-37.test.js` (NEW). Test sites depend on shape:

**Shape A tests:**
1. Minimal repro — `<each in=@items.filter(c => c.foo == 1)>`; assert emitted JS parses clean + filter expression intact
2. Multi-line arrow body — `<each in=@items.filter(c => { return c.foo > 0 })>`
3. Multiple chained filters — `<each in=@items.filter(c => c.foo == 1).map(c => c.bar)>`
4. Reduce — `<each of=@items.reduce((a, c) => a + 1, 0)>` (count form)
5. Inline arrow in ATTRIBUTE position outside `in=` — `<button onclick={(e) => @x = 1}>` (regression-guard)
6. Workaround form still works — `const <filtered>` + `<each in=@filtered>`
7. Composition with Bug 40 `:`-shorthand: `<each in=@items.filter(c => c.foo == 1)><li : @.foo></each>`

**Shape B tests:**
1. Minimal repro — emits `E-EACH-INLINE-ARROW` with friendly message
2. Workaround form does NOT trigger error
3. Error message contains the canonical hoist-to-derived-cell suggestion
4. Other attribute positions (`<button onclick={...}>`) do NOT trigger `E-EACH-INLINE-ARROW`

Aim for 8-12 tests minimum.

## Phase 3 — verify

1. `node --check` on emitted JS for reproducer: parse clean (if shape A) OR compile fails with E-EACH-INLINE-ARROW (if shape B).
2. The R25 overseer-4 `/tmp/r25-overseer-each-arrow-repro.scrml` shape compiles without the truncation symptom.
3. Full suite: `bun run test` must pass. Baseline at PA HEAD `50d38095`: **21,890 pass / 0 fail / 170 skip / 1 todo / ~807 files**.

# COMMIT DISCIPLINE (S83 + S113)

Coupled code + test = ONE commit. WIP commits OK for crash-recovery.

# `--no-verify` PROHIBITION (S136 absolute)

NEVER use `--no-verify`. Pretest race → STOP, wait, retry, STOP-and-report if still failing. NO bypass.

Session precedent: R25-Bug-36/38/41/40 all clean. You follow.

# REPORTING

1. **WORKTREE_PATH**
2. **BRANCH**
3. **FINAL_SHA**
4. **FILES_TOUCHED**
5. **TEST_DELTA**
6. **SHAPE DECISION** (A or B; with rationale)
7. **ROOT-CAUSE FINDING** (1-2 paragraphs)
8. **REPRODUCER VERIFICATION** (BEFORE/AFTER emitted JS or BEFORE/AFTER compile output)
9. **MAPS CONSULTED + load-bearing finding**
10. **SIBLING-ATTRIBUTE-POSITION FINDINGS** (does `<button onclick={...}>` work? `<div data-x=...arrow>` work? Localized verdict.)
11. **DEFERRED ITEMS**
12. **PROCESS VIOLATIONS** (honest)

# OUT OF SCOPE

- Bug 38 (`!{}` arm body — RESOLVED `933d1ad3`); Bug 41 (`<schema>` HTML leak — RESOLVED `ebeba766`); Bug 40 (`:`-shorthand in `<each>` — RESOLVED `50d38095`)
- Bug 31 / R24-BUG-5
- Refactor beyond what fix requires

# IF YOU GET STUCK

After 60-90 min, STOP and report partial. WIP commit each step.

GO.
