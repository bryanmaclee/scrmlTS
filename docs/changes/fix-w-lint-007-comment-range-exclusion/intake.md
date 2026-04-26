# fix-w-lint-007-comment-range-exclusion — Intake (Scope C finding A2)

**Surfaced:** 2026-04-25 (S42), Scope C Stage 1 audit §4 Issue B.
**Status:** SCOPED, awaiting authorization to dispatch.
**Tracker entry:** `docs/audits/scope-c-findings-tracker.md` §A2.
**Tier:** **T1** (single file, single function added + 1 callback signature change + skipIf updates).
**Priority:** medium-low (cosmetic — no compile errors, just noisy diagnostics; but lays the comment-range groundwork that other lints can reuse).

---

## Symptom

W-LINT-007 ("`<Comp prop={val}>` JSX-style attribute braces — scrml uses `<Comp prop=val>`") fires on text inside `//` line comments and (presumably) `/* */` block comments. Comment regions are not parsed as code per §27 (universal `//` comment syntax), so they should be excluded from ghost-pattern detection.

### Repro (minimal)

```scrml
<program>
${ @x = 0 }
// This comment mentions <Comp prop={val}> as an example of JSX
<p>hello</p>
</program>
```

Compile output: `W-LINT-007` warning fires on the comment line, even though `<Comp prop={val}>` is text inside `//`.

### Examples affected

- `examples/14-mario-state-machine.scrml` line 5 — header comment text mentions `<Comp prop={val}>` as a Vue-vs-scrml comparison and gets the lint warning.

### Sample audit reach

Per `docs/audits/scope-c-stage-1-sample-classification.md`, W-LINT-007 fires on 9 top-level samples. Some of those may be legitimate (samples that test the lint warning fires); some are likely comment-text false positives. Re-classify after fix.

---

## Source location

`compiler/src/lint-ghost-patterns.js`:
- Line 244 — W-LINT-007 entry (`/\b(?!value\b)(\w+)\s*=\s*(?<!\$)\{(?!\{)/g`)
- Lines 93-127 — `buildLogicRanges` and `inRange` helpers (the existing range-exclusion pattern)
- Lines 140-159 — `buildCssRanges` (parallel CSS-range builder, same pattern)
- Lines 361-392 — `lintGhostPatterns` entry point (calls range builders, iterates patterns)

The lint runs `regex.exec()` over the entire source string. Each pattern has an optional `skipIf(offset, logicRanges, cssRanges)` callback. `${...}` logic blocks and `#{...}` CSS blocks have range builders that exclude their interiors from pattern matching. **There is no equivalent `commentRanges` builder.**

---

## Root cause

`lint-ghost-patterns.js` exposes only two range types: logic (`${}`) and CSS (`#{}`). Comment regions (`//` line comments and `/* */` block comments per JS / scrml convention) are not built into ranges, so `inRange(offset, commentRanges)` cannot be called from any pattern's skipIf. The lint scans comment text as if it were source code.

---

## Fix approach

Three steps in `compiler/src/lint-ghost-patterns.js`:

### Step 1 — add `buildCommentRanges(source)`

After `buildCssRanges` (around line 159), add:

```js
/**
 * Build ranges for `//` line comments and `/* */` block comments.
 * Used to exclude comment text from ghost-pattern detection.
 *
 * @param {string} source
 * @returns {Array<[number, number]>}
 */
function buildCommentRanges(source) {
  const ranges = [];
  let i = 0;
  while (i < source.length) {
    // Line comment: //  through end of line
    if (source[i] === "/" && source[i + 1] === "/") {
      const start = i;
      i += 2;
      while (i < source.length && source[i] !== "\n") i++;
      ranges.push([start, i]);
      continue;
    }
    // Block comment: /* ... */
    if (source[i] === "/" && source[i + 1] === "*") {
      const start = i;
      i += 2;
      while (i < source.length - 1 && !(source[i] === "*" && source[i + 1] === "/")) i++;
      i += 2;  // consume the closing */
      ranges.push([start, i]);
      continue;
    }
    i++;
  }
  return ranges;
}
```

**Edge cases this handles correctly:**
- `//` inside a string literal — for a true correctness fix the builder would need string-tracking, but for a lint warning it's acceptable to over-exclude (false negative on a lint warning is fine).
- `/* */` block comments may span lines; loop continues until the closing `*/` is found.
- Comments at end-of-file with no trailing newline — outer loop exits when `i >= source.length`.

### Step 2 — extend the skipIf callback signature

Update the call site at `lintGhostPatterns` (line 361-392):

```js
export function lintGhostPatterns(source, filePath) {
  if (!source || source.length === 0) return [];

  const logicRanges = buildLogicRanges(source);
  const cssRanges = buildCssRanges(source);
  const commentRanges = buildCommentRanges(source);   // ← new
  const diagnostics = [];

  for (const pattern of PATTERNS) {
    const re = new RegExp(pattern.regex.source, pattern.regex.flags);
    let match;
    while ((match = re.exec(source)) !== null) {
      const offset = match.index;

      if (pattern.skipIf && pattern.skipIf(offset, logicRanges, cssRanges, commentRanges)) {
        continue;
      }
      // ... rest unchanged
    }
  }
  // ... rest unchanged
}
```

The `skipIf` is now called with 4 args instead of 3. JS function call: extra args are ignored if a callback only takes 3. So this is **backwards-compatible** — existing patterns with 2-arg or 3-arg skipIf signatures continue to work; only patterns that opt into comment-range exclusion need to update their signature.

### Step 3 — update W-LINT-007's skipIf to also skip comments

Line 248-249 currently:
```js
code: "W-LINT-007",
skipIf: (offset, logicRanges) => inRange(offset, logicRanges),
```

Change to:
```js
code: "W-LINT-007",
skipIf: (offset, logicRanges, _cssRanges, commentRanges) =>
  inRange(offset, logicRanges) || inRange(offset, commentRanges),
```

### Optional: extend other markup-text-scanning patterns

Several other patterns may also benefit from comment-range exclusion. Audit candidates (those whose ghost text could plausibly appear inside `// example:` documentation comments):
- W-LINT-003 (`className=`)
- W-LINT-004 (`on[A-Z]\w*=`)
- W-LINT-005 (`value={expr}`)
- W-LINT-008 (`{cond && <El>}`)
- W-LINT-011 (Vue `:attr=`)
- W-LINT-012 (Vue `v-if/v-for/...`)
- W-LINT-013 (Vue `@click=`) — A1's separate fix may want this too
- W-LINT-014 (Svelte `{#if}`/`{#each}`)
- W-LINT-015 (Svelte `{@html}`)

**Suggestion:** in this intake, fix only W-LINT-007 (the one verified misfiring). Adding `commentRanges` to other patterns can be follow-up cleanup, since each one needs a verified test case.

---

## Test plan

### Existing tests that must continue to pass

The lint test suite at `compiler/tests/unit/lint-ghost-patterns*.test.js` (search for relevant files). All existing test cases must still produce the same warnings — comment-range exclusion can ONLY reduce false positives, not change positive detections.

### New regression tests

Add to `compiler/tests/unit/lint-ghost-patterns-comment-exclusion.test.js`:

1. **Line comment with W-LINT-007 ghost:**
   ```scrml
   <program>
   ${ @x = 0 }
   // example: <Comp prop={val}> is JSX, not scrml
   <p>hi</p>
   </program>
   ```
   Expected: zero W-LINT-007 diagnostics.

2. **Block comment with W-LINT-007 ghost:**
   ```scrml
   <program>
   /* multi
      line: <Comp prop={val}>
      example */
   <p>hi</p>
   </program>
   ```
   Expected: zero W-LINT-007 diagnostics.

3. **Sanity — actual JSX-style attr OUTSIDE comment still detected:**
   ```scrml
   <program>
   <Comp prop={val}>
   </program>
   ```
   Expected: W-LINT-007 fires. (Verify the fix didn't kill all detections.)

4. **Mixed: comment AND real ghost on same file:**
   ```scrml
   <program>
   // <Comp prop={val}> is the ghost form (lint should NOT fire on this line)
   <Comp prop={val}>
   </program>
   ```
   Expected: exactly ONE W-LINT-007 diagnostic — on the markup line, NOT on the comment line.

5. **Comment with `//` inside string literal (edge case):**
   ```scrml
   <program>
   ${ @x = "https://example.com/path" }
   <p>${@x}</p>
   </program>
   ```
   Expected: no W-LINT-007. (Tests the over-exclusion is harmless — the `//` inside the string is treated as a comment by the range builder, but that's fine since the URL doesn't contain ghost patterns anyway.)

### Existing-corpus verification

After fix, recompile `examples/14-mario-state-machine.scrml`. The W-LINT-007 misfire on its line 5 comment should be GONE. The remaining lint warning on that file should be only the W-LINT-013 misfire on line 144 (which is A1's separate fix — still expected here).

Run full test suite — must continue to pass without new failures.

---

## Pre-snapshot baseline

- **Compiler SHA:** `b1ce432` (S41 close + S42 docs/examples work, no compiler-source changes by S42 audit).
- **Test status (S42 measurement):** 7872 pass / 40 skip / 0 fail / 372 files.
- **Examples corpus:** 22/22 compile; ex 14 has 2 lints (1× W-LINT-007 line 5 + 1× W-LINT-013 line 144). Post-fix expected: ex 14 has 1 lint (only W-LINT-013 line 144 remains, until A1 lands).

---

## Risk profile

- **Blast radius:** single file (`lint-ghost-patterns.js`). Adds one new function (~15 lines) + 4-arg signature extension at the call site + 1 skipIf update.
- **Failure modes:**
  - Over-exclusion: `commentRanges` could accidentally include non-comment regions if `//` appears inside a string literal. Acceptable — false negatives on lint warnings are not failures, just reduced signal.
  - Under-exclusion: `/*` inside a string literal is more concerning, but again the cost of a false negative on a lint is low.
- **Spec alignment:** §27 explicitly defines `//` and `/* */` as comment syntax. Comment text should never be parsed as code. The fix aligns observable lint behavior with §27.
- **Reversibility:** trivial (single-commit revert).

---

## Coordination

This fix lays the `buildCommentRanges` infrastructure that **A1 reuses** (`fix-w-lint-013-context-scope` intake). If both intakes are dispatched at the same time, A2 should land first OR they should be batched in a single dispatch since they both touch `lint-ghost-patterns.js`. Given they're tiny disjoint additions, batching is reasonable.

---

## References

- Findings tracker: `docs/audits/scope-c-findings-tracker.md` §A2 (full root-cause analysis).
- Stage 1 audit context: `docs/audits/scope-c-stage-1-2026-04-25.md` §4 Issue B.
- Sample-classification report: `docs/audits/scope-c-stage-1-sample-classification.md` (W-LINT-007 firing on 9 top-level samples).
- Adjacent fix: `docs/changes/fix-w-lint-013-context-scope/intake.md` (A1) — reuses the same infrastructure.
- Spec: SPEC.md §27 (Comment Syntax).

---

## Tags
#bug #lint #ghost-pattern #w-lint-007 #comment-range #scope-c #stage-1 #s42 #t1
