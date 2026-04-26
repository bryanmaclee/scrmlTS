# Progress: fix-component-def-text-plus-handler-child

Tier: T2 (single-file fix; intake explicitly defers fix-sketch pending trace).
Branch: `worktree-agent-a56d805936b03a596`
Worktree: `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a56d805936b03a596`

## Pre-snapshot

- Compiler SHA at start: `e619abb` (post-S42 intake batch).
- After `bun install` + `bun run pretest`: **7889 pass / 40 skip / 0 fail / 375 files** ✓ matches intake.
- Sample-corpus pretest: 12 test samples compiled.

## Trace findings (TRACE FIRST)

The intake hypothesised the bug lived in `component-expander.ts` raw-normalization
(`([^"=])\s*>` regex) at line 1376-1383. **The hypothesis was wrong.**

A direct trace harness showed the `raw` field on the component-def AST node
is **already truncated** before component-expander ever sees it:

```
FAIL case raw:    "< div > label < button"        ← truncated to 4 tokens
PASS no-text:     "< div > < button onclick = fn ( ) > x < / button > < / div >"  ← full
```

So the bug is in **`compiler/src/ast-builder.js`**, in `collectExpr`, in its
angle-bracket tracking + statement-boundary interaction.

### Token-level walkthrough (FAIL case)

Source body: `<div>label <button onclick=fn()>x</button></div>`
After logic-tokenization (tokens 3-23 of the const-decl RHS):

| idx | kind  | text     | angleDepth (pre-fix) | note |
|---|---|---|---|---|
| 3 | PUNCT | `<`      | 1 (opens, lastTok=`=`, prevEndsValue=false) |
| 4 | IDENT | `div`    | 1 |
| 5 | PUNCT | `>`      | **0 (decremented — the bug)** |
| 6 | IDENT | `label`  | 0 |
| 7 | PUNCT | `<`      | **0 (NOT incremented — lastTok=`label` IDENT, prevEndsValue=true)** |
| 8 | IDENT | `button` | 0 |
| 9 | IDENT | `onclick`| 0 — boundary check fires: lastPart=`button`, next=`=`, peek(2)=`fn` (≠`=`). `IDENT =` triggers statement-boundary BREAK. |

`collectExpr` returns prematurely, leaving the rest of the markup orphaned.
The component-def's `raw` is `"< div > label < button"` and the orphaned tokens
become a separate (broken) statement that gets dropped.

### Root cause

Two flaws compound:

1. **`>` decrement is wrong semantics.** The current code treats `>` as closing
   the `<…>` *delimiter*, but for tracking "are we inside markup", we need
   element nesting. After `<div>`, we are STILL inside element `div` — the
   delimiter closed but the element is open until `</div>`.

2. **prevEndsValue guard re-fires inside markup.** The Bug-3 guard
   (`base < limit ? base : limit`) prevents `<` from opening a tag when the
   previous token looks like a value. Inside markup, text content (IDENT-like
   token `label`) sits naturally between `>` and a child `<` — but
   prevEndsValue=true blocks the increment, leaving angleDepth=0.

`collectLiftExpr` (lines 1404-1417) already uses element-nesting semantics
(`<` IDENT/KEYWORD = open, `</` = close, no `>` decrement). The fix aligns
`collectExpr`'s tracker with the same scheme.

## Fix

Single file: `compiler/src/ast-builder.js`, `collectExpr` angle-tracking block
(lines 1266-1318 post-fix; was 1266-1297 pre-fix).

New scheme — **element nesting**, not delimiter nesting:

1. `<` followed by IDENT/KEYWORD increments `angleDepth`. If `angleDepth > 0`
   (already inside markup), unconditional. If `angleDepth === 0` (outside
   markup), the existing Bug-3 prevEndsValue guard still applies.
2. `<` followed by `/` (close-tag start) AND `angleDepth > 0` decrements.
3. `/` followed by `>` (self-close) AND `angleDepth > 0` decrements.
4. Plain `>` no longer decrements — was element-incorrect.

## Test results

### Regression suite (new)

`compiler/tests/unit/component-def-text-plus-handler-child.test.js` — 6 cases:

- verified bisected trigger (`<div>label <button onclick=fn()>…`) — **6/6 pre-fix: 1 pass / 5 fail**, **post-fix: 6/6 pass**.

### Bug-3 regression guard (existing)

`compiler/tests/unit/ast-builder-lt-vs-tag-open.test.js` — 11 cases covering
`base < limit ? base : limit`, `a < b`, `foo() < 10`, `arr[0] < 10`,
`@count < 5`, `10 < x`, etc. **post-fix: 11/11 pass** — no regression of the
prevEndsValue guard.

### Generalization sweep (8 cases)

Verified all cases via direct AST trace (raw contains matching closing tag):

```
OK  TR-1 onclick     <div>label <button onclick=fn()>x</button></div>
OK  TR-2 onsubmit    <div>label <form onsubmit=fn()>x</form></div>
OK  TR-3 onchange    <div>info <input onchange=fn()/></div>
OK  TR-4 oninput     <div>tip <textarea oninput=fn()></textarea></div>
OK  TR-5 wrap=section
OK  TR-6 wrap=article
OK  TR-7 wrap=header
OK  TR-8 nested      <div>a <span>b <button onclick=fn()>c</button></span></div>
```

### Full suite

- **Pre-fix:** 7889 pass / 40 skip / 0 fail / 375 files.
- **Post-fix:** 7895 pass / 40 skip / 0 fail / 376 files. (+6 from new test file, 0 regressions.)

## Bonus check: example 05 revert to match-with-lift

Partial. Reverted `<InfoStep if=…/>...else-if=…else/>` chain in
`examples/05-multi-step-form.scrml`. Result:

- `${ match @currentStep { .Info => { lift <InfoStep> } else => {} } }` —
  **WORKS** post-fix. (The bug-fix repro.)
- Full revert of all three steps to match-with-lift — `PreferencesStep` and
  `ConfirmStep` still hit E-COMPONENT-020. Their bodies contain
  `<select><option>…</option></select>` (PreferencesStep) and `<dl><dt>…</dt><dd>${@…}</dd></dl>`
  with BLOCK_REF interpolations (ConfirmStep). These are different parser
  shapes (likely BLOCK_REF or void-element parsing inside component-def);
  **separate from A3**. Intake §"Out of scope" already flags follow-up bugs
  as orthogonal.

Did not modify `examples/05-multi-step-form.scrml` — bonus signal partially
positive (InfoStep cleared), other failures are separate findings.

## Files modified

- `compiler/src/ast-builder.js` — `collectExpr` angle-tracking refactor (~50 lines).
- `compiler/tests/unit/component-def-text-plus-handler-child.test.js` — new (6 cases).
- `docs/changes/fix-component-def-text-plus-handler-child/progress.md` — this file.

## Tool routing

Verified Write tool routes to worktree (Pitfall 2 not triggered).

## Tags

#bug #parser #ast-builder #collectExpr #component-def #angle-tracking
#scope-c #stage-3 #s42 #fix-landed #t2 #regression-tests-added

## Links

- Intake: `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a56d805936b03a596/docs/changes/fix-component-def-text-plus-handler-child/intake.md`
- Source fix: `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a56d805936b03a596/compiler/src/ast-builder.js` (lines 1266-1318)
- Regression tests: `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a56d805936b03a596/compiler/tests/unit/component-def-text-plus-handler-child.test.js`
- Existing Bug-3 guard: `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a56d805936b03a596/compiler/tests/unit/ast-builder-lt-vs-tag-open.test.js`
- Tracker: `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a56d805936b03a596/docs/audits/scope-c-findings-tracker.md` §A3
