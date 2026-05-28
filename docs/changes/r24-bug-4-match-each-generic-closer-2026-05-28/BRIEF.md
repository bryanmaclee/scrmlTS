# R24-BUG-4 — Generic `</>` closer support for STRUCTURAL_RAW_BODY_ELEMENTS (`<match>` + `<each>`)

**Change-id:** `r24-bug-4-match-each-generic-closer-2026-05-28`
**Filed:** S138 (2026-05-28; cross-ref `docs/known-gaps.md` R24-BUG-4 entry + `docs/changes/match-block-form-scoping/SCOPING.md` §5 Phase 5)
**Severity:** HIGH (adopter-impact — dev-3-svelte R24 best-case adopter killed by this alone)
**Scope:** SINGLE-FILE BS-level fix — `compiler/src/block-splitter.js` + regression tests
**Estimate:** 3-5h

---

# MAPS — REQUIRED FIRST READ

Before consuming any other context (kickstarter / anti-patterns / SPEC sections / source files),
read `.claude/maps/primary.map.md` in full. It is ~100 lines.

The §"Task-Shape Routing" section in that file tells you which additional maps to consult based
on your task shape. For this task (compiler-source bug fix, parser-layer), the relevant maps are
the structure map + the dependencies map.

Map currency: maps reflect HEAD `27e14c66` as of 2026-05-27 (S135 close). Since then ~80 commits
have landed including S137 R25 HIGH/MED cluster fixes that touched `block-splitter.js` directly
(Bug 40 fix at `50d38095`). Treat map content as a STARTING HYPOTHESIS to verify via grep/Read
against current source — not as ground truth. The file you'll be editing is current as of HEAD
`0a02e0d7`.

Feedback: in your final report, include either:
- "Maps consulted: [list]; load-bearing finding: <one sentence>"
- "Maps consulted but not load-bearing — [optional: which map you expected to help but didn't]"

---

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE

Your worktree path is provisioned by the harness. Verify at startup.

## Startup verification (do this BEFORE any other tool call)

1. Run `pwd` via Bash. Output MUST start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`.
   If the path is under any other repo (e.g., `scrml-support/.claude/worktrees/`), STOP and report
   — this is the S90 CWD-routing failure mode. Save the output as your WORKTREE_ROOT for the rest
   of the dispatch.
2. Run `git rev-parse --show-toplevel` via Bash. Output MUST equal WORKTREE_ROOT.
3. Run `git status --short` via Bash. Confirm tree is clean.
4. Run `bun install` via Bash. Worktrees do NOT inherit `node_modules` from main.
5. Run `bun run pretest` via Bash. Populates `samples/compilation-tests/dist/` for browser tests.

If ANY check fails: DO NOT proceed. Report the mismatch and exit.

## Path discipline (enforce on EVERY Read/Write/Edit/Bash call)

**S99 path-discipline counter is at 20. This would be incident #21 if leaked.** Per pa.md
S126 ratification (still in force pending the PreToolUse hook), **use Bash for all file edits**
(`perl`/`python`/`cp`/heredoc, on worktree-absolute paths that include the `.claude/worktrees/agent-<id>/`
segment) rather than Edit/Write tools. Bash writes go where `pwd`/`git` resolve, sidestepping the
Edit/Write filesystem-divergence class (S126 incidents #12 + #13).

**Also forbidden** (S126 strengthening per incidents #14 + #15):
- Never `cd` into the main repo from your worktree
- For `bun` commands: use `--cwd "$WORKTREE_ROOT"`
- For `git` operations: use `git -C "$WORKTREE_ROOT"`
- Compile/run commands: invoke with worktree-absolute paths exclusively

Echo `pwd` in your first commit message: `WIP(<task>): start at $(pwd)`.

## --no-verify PROHIBITION

**You SHALL NOT use `--no-verify` on `git commit`** without explicit user authorization. This rule
is in force per pa.md S87/S88 + S136 banked precedent (R24-BUG-2 process violation).

If the pre-commit hook fails on env race (pretest `dist/` mid-rebuild, `node_modules` partial install),
STOP and report. Do NOT bypass.

---

# REQUIRED PRIOR READS

1. **`scrml-support/docs/gauntlets/BRIEFING-ANTI-PATTERNS.md`** — ghost-pattern mitigation; reread
   before each substantive change.
2. **`docs/articles/llm-kickstarter-v2-2026-05-04.md`** — canonical scrml shape (relevant for
   designing reproducers in regression tests).
3. **`docs/changes/match-block-form-scoping/SCOPING.md`** §3 (SPEC verification) + §4 (root cause
   analysis) + §5 Phase 5 (the deferred work this dispatch closes).
4. **`compiler/SPEC.md` §4.4.2 (closer forms — `</>` SHALL close innermost open tag)**, §17.7
   (`<each>`), §18.0.1 (`<match>` block-form). Read these IN FULL via SPEC-INDEX line ranges —
   they're load-bearing for the fix correctness.

---

# THE BUG

**Empirical reproducer:**

```scrml
<program>
${
    type Phase:enum = { Idle, Loading, Done }
    <phase>: Phase = .Idle
}

<match for=Phase on=@phase>
    <Idle>: <p>Idle</p>
    <Loading>: <p>Loading...</p>
    <Done>: <p>Done</p>
</>
</>
```

**Current compiler output:**

```
error [E-CTX-001]: Unclosed <match> structural element. Expected explicit close tag '</match>'.
The '</>' unambiguous-closer form is not yet supported for <match> at Phase 2 baseline
(see docs/changes/match-block-form-scoping/SCOPING.md §5 Phase 5).
error [E-CTX-003]: Unclosed 'program' — opened but never closed before end of file.
```

**Expected:** compiles clean; `</>` closes `<match>` per SPEC §4.4.2 ("`</>` SHALL close innermost
open tag — no exceptions"). The `</>` (outermost in the body, at depth 0) IS the match closer.

**Class scope:** The SAME bug fires for `<each>` — both are in `STRUCTURAL_RAW_BODY_ELEMENTS` (line
126 of `block-splitter.js`). Fix BOTH in this dispatch.

Each reproducer:

```scrml
<program>
<items> = ["a", "b", "c"]
<each in=@items>
    <li : @.>
</>
</>
```

Currently fires E-CTX-003 (BS scans past first `</>` looking for literal `</each>`, never finds it).

---

# ROOT CAUSE LOCATION

`compiler/src/block-splitter.js` lines 1897-2007 — the
`STRUCTURAL_RAW_BODY_ELEMENTS.has(lowerTagName)` branch. Specifically the depth-tracker loop at
lines 1929-1958:

```js
const openNeedlePrefix = `<${lowerTagName}`;
let nestDepth = 0;
while (pos < len) {
  if (source[pos] === "<" && source.slice(pos, pos + closeLen).toLowerCase() === closeNeedle) {
    if (nestDepth === 0) break;
    nestDepth--;
    ...
  }
  // detect nested same-kind opener: `<tagname` followed by boundary
  if (source[pos] === "<" && source.slice(pos, pos + openNeedlePrefix.length).toLowerCase() === openNeedlePrefix) {
    const after = source[pos + openNeedlePrefix.length];
    if (after === ">" || after === "/" || after === " " || ...) {
      nestDepth++;
      ...
      continue;
    }
  }
  step();
}
```

This tracks **same-kind nesting only** (nested `<match>` inside `<match>` or `<each>` inside
`<each>`). For `</>` support, you need a **generic tag-stack tracker** that accounts for
arm-children opening/closing inside the body.

Inline comments at lines 110-113 and 1900-1908 explicitly document this as the deferred
"Phase 5" work; the comment at 110-113 even says "dual-closer support" is the convention but
the implementation diverged.

---

# FIX SHAPE

Per SPEC §4.4.2 — `</>` closes the innermost open tag. The depth-tracker needs to:

1. **Push opener on each non-self-closing, non-`:`-shorthand `<TagName...>` opener.** Track the
   tag name for matching `</TagName>` closers.
2. **Self-closing (`<TagName/>` or `<TagName attrs/>`) is depth-neutral** — don't push.
3. **`:`-shorthand (`<TagName>: ...` or `<TagName attrs>: ...`) is depth-neutral** — the body is
   single-expression and terminates at the next sibling or outer-closer; no balanced closer needed.
4. **`</TagName>` pops the matching tag from the stack.** If stack-top doesn't match, that's a
   structural error (file as future bug; for this dispatch, pop anyway to keep advancing — the
   downstream re-parse will surface the real diagnostic).
5. **`</>` pops the innermost** (whatever's on stack-top).
6. **When stack is empty AND `</>` OR `</outerKind>` is hit, that's the outer closer.** Set
   `closerForm` accordingly: `"explicit"` for `</tagname>`, `"generic"` for `</>`.

## Skip zones during scan

- **`${...}` interpolation blocks** — content is logic context; brace-track and skip past matched
  closing `}`. Inner `<` characters are interpolated markup that doesn't affect the outer
  raw-body depth.
- **Strings (`"..."` and `'...'`)** — attribute values may contain `<` characters (e.g.,
  `class="<svg-icon>"`). Skip until matching close-quote (handle `\"` escapes).
- **HTML comments (`<!-- -->`)** — skip until `-->`.
- **scrml comments (`//` to EOL; `/* */`)** — skip per scrml comment grammar (§27).

## Same-kind nesting preserved

The existing same-kind depth-tracker (incrementing on nested `<each>` inside `<each>` etc.) MUST be
preserved — it's the S130 HU-1 Q6 nested-iteration case. The new generic tag-stack tracker
subsumes it: a nested `<each>` opener is pushed onto the stack like any other tag, and the
matching `</each>` or `</>` pops it. Existing test `compiler/tests/unit/each-block.test.js`
(nested-iteration cases) must continue to pass.

---

# IMPLEMENTATION PLAN

**Phase 1 — Tag-stack scanner extraction**

Refactor the depth-tracker loop into a helper function (e.g., `findStructuralBodyEnd(source, pos, lowerTagName)`)
that returns `{ contentEnd, closerForm, closerLen }`. Closer form:
- `"explicit"` if `</tagname>` was found
- `"generic"` if `</>` was found
- `"inferred"` if EOF was hit (existing fallback)

**Phase 2 — Skip-zone handling**

Implement skip-past helpers for `${...}` interpolation, `"..."`/`'...'` strings, `<!-- -->`/`//`/`/* */`
comments. These ensure `<` characters inside skip zones don't affect the depth counter.

**Phase 3 — Generic tag-stack**

Stack of `{ tagName: string, openerPos: number }`. Push on opener (after self-close + `:`-shorthand
detection), pop on `</tagname>` / `</>`. When stack is empty AND we hit an outer-closer candidate,
break with the appropriate `closerForm`.

**Phase 4 — Wire into both call sites**

Both `<match>` and `<each>` use the same `STRUCTURAL_RAW_BODY_ELEMENTS` branch, so the helper is
already shared. Update the post-loop closer dispatch (lines 1978-1988) to record `closerForm`
correctly for downstream consumers.

**Phase 5 — Regression tests**

New file: `compiler/tests/unit/structural-body-closer-r24-bug-4.test.js`. Coverage matrix:

| Outer | Closer | Body shape | Expected |
|---|---|---|---|
| `<match>` | `</>` | `:`-shorthand arms | PASS |
| `<match>` | `</>` | bare-body arms with `</>` per arm | PASS |
| `<match>` | `</>` | mixed shorthand + bare-body | PASS |
| `<match>` | `</>` | self-closing arms | PASS |
| `<match>` | `</match>` | (existing form) | PASS (regression) |
| `<each>` | `</>` | `:`-shorthand item | PASS |
| `<each>` | `</>` | bare-body item with `</li>` | PASS |
| `<each>` | `</each>` | (existing form) | PASS (regression) |
| `<each>` nested in `<each>` | `</>` outer + `</>` inner | both close correctly | PASS |
| `<match>` nested in `<each>` arm body | both close correctly | PASS |
| Body contains `${ markup-interp `<x>` }` | not counted in depth | PASS |
| Attr value contains `<` char | not counted in depth | PASS |
| HTML comment `<!-- <x> -->` in body | not counted | PASS |
| Genuinely unclosed (no `</>` or `</tagname>` ever) | E-CTX-001 fires | PASS (regression) |

At minimum 15-20 tests covering the matrix. Use `splitBlocks` directly (mirror existing
`each-block.test.js` test pattern).

---

# COMMIT DISCIPLINE

Per pa.md S83 — commit after EVERY meaningful change. Don't batch.

Suggested commit cadence:
1. `WIP(r24-bug-4): scaffold helper at $(pwd)` — initial structure
2. `WIP(r24-bug-4): skip-zone helpers (strings + comments + ${})`
3. `WIP(r24-bug-4): generic tag-stack scanner`
4. `WIP(r24-bug-4): wire into STRUCTURAL_RAW_BODY_ELEMENTS branch`
5. `WIP(r24-bug-4): regression tests (N tests)`
6. Final cleanup if needed

Each commit goes through pre-commit hook (`bun test compiler/tests/{unit,integration,conformance}`).

**Before reporting DONE:**
- `git status --short` MUST be clean
- All commits MUST have echo'd `pwd` in the first commit
- The branch tip MUST contain the full final state

---

# PHASE 6 — R26 EMPIRICAL VERIFICATION (MANDATORY per pa.md S138 R26 doctrine)

Per pa.md S138 R26 doctrine — empirical verification on real adopter source is mandatory BEFORE
claiming class-dead.

R24-BUG-4 was surfaced by dev-3-svelte R24 source. Verify the fix on that source:

```bash
mkdir -p /tmp/r26-r24-bug-4-verify
bun --cwd "$WORKTREE_ROOT" compiler/bin/scrml.js compile \
  /home/bryan-maclee/scrmlMaster/scrml-support/docs/gauntlets/gauntlet-r24/dev-3-svelte.scrml \
  --output-dir /tmp/r26-r24-bug-4-verify > /tmp/r26-r24-bug-4-verify.log 2>&1
echo "exit: $?"
grep "E-CTX-001\|E-CTX-003" /tmp/r26-r24-bug-4-verify.log || echo "  no closer errors — PASS"
node --check /tmp/r26-r24-bug-4-verify/dev-3-svelte.client.js && echo "  node --check PASS"
```

**Bug-specific symptom check:**
- ZERO E-CTX-001 fires citing "match" or "each" closer support
- ZERO E-CTX-003 fires citing "Unclosed match" or "Unclosed each"
- `node --check` exit 0 on emitted JS (no JS syntax errors from misaligned closer scope)

**DO NOT mark DONE without empirical R26 verification passing.**

Also verify R24 dev-1, dev-2, dev-4 don't regress (they didn't hit BUG-4 originally; this is a
regression check):

```bash
for dev in dev-1-react dev-2-go dev-4-pascal; do
  bun --cwd "$WORKTREE_ROOT" compiler/bin/scrml.js compile \
    /home/bryan-maclee/scrmlMaster/scrml-support/docs/gauntlets/gauntlet-r24/$dev.scrml \
    --output-dir /tmp/r26-r24-bug-4-verify/$dev > /tmp/r26-r24-bug-4-verify/$dev.log 2>&1
  echo "$dev exit: $?"
  node --check /tmp/r26-r24-bug-4-verify/$dev/$dev.client.js && echo "  $dev node --check PASS"
done
```

All 4 R24 devs must show no new errors vs. their baseline state. Existing errors (Bug 28/29 etc.
already-RESOLVED-S136 state) should be UNCHANGED (no regressions; those bugs are closed).

---

# FINAL REPORT FORMAT

When complete, report (in this order):

```
WORKTREE_PATH: /home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-<id>/
BRANCH: <branch-name>
FINAL_SHA: <commit-sha>
FILES_TOUCHED:
  - compiler/src/block-splitter.js (+N/-M lines)
  - compiler/tests/unit/structural-body-closer-r24-bug-4.test.js (+N lines NEW)
  - (other files if any)

TESTS:
  - <NN> new tests in structural-body-closer-r24-bug-4.test.js
  - Pre-commit gate: <pass/fail> on each commit
  - Full test count delta: +N (was 21,960 → now N,NNN)

R26 EMPIRICAL VERIFICATION:
  - dev-3-svelte (the original report source): <pass/fail>
  - dev-1-react / dev-2-go / dev-4-pascal regression: <all pass/list issues>

MAPS CONSULTED: [list]; load-bearing finding: <one sentence> | OR: "not load-bearing"

PROCESS:
  - --no-verify use: zero (per brief)
  - Edit/Write tool use: zero (per S126; Bash-only)
  - Path-discipline incidents: zero
  - Commits: N (WIP cadence per brief)

DEFERRED ITEMS / SURFACED FOLLOW-UPS:
  - <list any sibling-class bugs surfaced, scope-expansion opportunities, etc.>

OUT-OF-SCOPE NOTES (banked observations not changed):
  - <list>
```

---

# CROSS-REFS

- `docs/changes/match-block-form-scoping/SCOPING.md` — the original SCOPING (S107); §5 Phase 5
  is the deferred-work item this dispatch closes; §3 SPEC verification is the normative authority
- `docs/known-gaps.md` R24-BUG-4 entry (HIGH; cross-ref escalation; surfaced by dev-3-svelte R24)
- `scrml-support/docs/gauntlets/gauntlet-r24-report.md` R24-BUG-4 section — adopter context
- SPEC §4.4.2 (closer forms — `</>` SHALL close innermost open tag)
- SPEC §17.7 (`<each>` iteration form)
- SPEC §18.0.1 (`<match>` block-form syntax)
- pa.md S138 R26 empirical-verification doctrine (mandatory Phase 6)
- pa.md S99 path-discipline counter (currently at 20)
- pa.md S126 Bash-edit interim mitigation + no-`cd`-into-main
- pa.md S136 BRIEF.md archival (this brief will be archived at
  `docs/changes/r24-bug-4-match-each-generic-closer-2026-05-28/BRIEF.md`)
