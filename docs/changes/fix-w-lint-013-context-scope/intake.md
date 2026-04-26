# fix-w-lint-013-context-scope — Intake (Scope C finding A1)

**Surfaced:** 2026-04-25 (S42), Scope C Stage 1 audit §4 Issue A.
**Status:** SCOPED, awaiting authorization to dispatch.
**Tracker entry:** `docs/audits/scope-c-findings-tracker.md` §A1.
**Tier:** **T1** (single file; the core fix is a one-character regex change; reuses comment-range infrastructure from A2 if landed).
**Priority:** medium (noisy, dominates lint output for files with `~{}` test sigils or `if=()` attribute expressions).
**Depends on:** **A2** (`fix-w-lint-007-comment-range-exclusion`) — for the optional comment-range integration. Not strictly required if A2's infrastructure isn't in place yet, but ideally batched with A2.

---

## Symptom

W-LINT-013 ("Found `@click="handler"` (Vue event shorthand) — scrml uses `onclick=handler()`") fires on legitimate `@reactive` reads:

1. **Inside `~{}` test sigil bodies.** Example 10 has:
   ```scrml
   ~{ "counter — state transitions"
       test "increment adds step" {
           @count = 0
           @step = 1
           increment()
           assert @count == 1   // ← W-LINT-013 misfires here
       }
   }
   ```
   Each `assert @count == N` line gets the misfire. Example 10 produces 14 such warnings.

2. **Inside `if=()` attribute expressions.** Example 14 has:
   ```scrml
   <div if=(@healthMachine == HealthRisk.AtRisk && @gameOver == false)>
   ```
   The `@healthMachine ==` portion misfires.

The warning is structurally wrong in both cases — `@count` and `@healthMachine` are scrml `@reactive` reads, not Vue `@click=` event shorthand. The lint shouldn't fire on these.

### Examples affected

- `examples/10-inline-tests.scrml` — 14 misfires (every `assert @<reactive>` line in the test sigil body).
- `examples/14-mario-state-machine.scrml` line 144 — 1 misfire on the `if=()` expression containing `@healthMachine`.

### Sample audit reach

W-LINT-013 fires on 4 top-level samples per `docs/audits/scope-c-stage-1-sample-classification.md`. Some are likely the same misfire pattern; others may be real positive detections. Re-classify after fix.

---

## Source location

`compiler/src/lint-ghost-patterns.js:316`:

```js
// Pattern 13: Vue `@event=` attribute shorthand (e.g., `@click="fn"`,
// `@click.stop="fn"`). Distinguished from scrml's `@var` reactive sigil by
// requiring an `=` after the `@word` — scrml uses `@var` as VALUES
// (`value=@count`), never as attribute NAMES.
{
  regex: /\s@[a-z][a-zA-Z0-9]*(?:\.[a-z]+)*\s*=/g,
  ghost: "@click=\"handler\" (Vue event shorthand)",
  correction: "onclick=handler() (scrml uses standard on<event> attribute names)",
  see: "§5",
  code: "W-LINT-013",
  skipIf: (offset, logicRanges) => inRange(offset, logicRanges),
},
```

---

## Root cause

The intent (per the comment): match `@<word>=` where `=` is the start of an attribute value, not `@<word> ==` where `==` is an equality operator. **The regex doesn't enforce that distinction.**

The trailing `\s*=` pattern matches `=` regardless of whether the next character is also `=`. So `@count == 0` matches because:
- `\s@count` — captures whitespace + `@count`
- `\s*=` — matches the FIRST `=` of `==` (with zero whitespace)
- The regex engine doesn't look at what follows the `=`, so `==` is captured as `=` + (rest left for next match)

The skipIf only excludes `${...}` logic ranges. But:
- `~{...}` test sigil bodies are not in any range (no `tildeRanges` builder exists).
- `if=()` attribute expressions are inline scrml expressions, NOT enclosed in `${...}`. They appear in markup-attribute position, which the lint scans freely.

---

## Fix approach

The simplest fix is a one-character regex change that single-handedly addresses both failure modes.

### Step 1 (core fix) — add negative lookahead `(?!=)`

Change the W-LINT-013 regex from:
```js
regex: /\s@[a-z][a-zA-Z0-9]*(?:\.[a-z]+)*\s*=/g,
```

To:
```js
regex: /\s@[a-z][a-zA-Z0-9]*(?:\.[a-z]+)*\s*=(?!=)/g,
```

The `(?!=)` negative lookahead asserts that the matched `=` is NOT immediately followed by another `=`. This correctly distinguishes:
- `@click="fn"` (Vue ghost — `="` follows) → still matches ✓
- `@count == 0` (scrml equality) → does not match ✓
- `@healthMachine == ...` (scrml equality in `if=()`) → does not match ✓
- `@var = expr` (a plain assignment with single `=`) → still matches, but this would only appear at attribute position which doesn't have a leading whitespace before `@`, so the leading `\s` keeps it safe in practice

### Why this fix is sufficient

**For ex 10's 14 misfires** (`assert @count == 0` etc.): pattern is `<space>@count<space>==`. With `(?!=)`: regex doesn't match (the first `=` is followed by another `=`). ✓

**For ex 14's misfire** (`if=(@healthMachine == HealthRisk.AtRisk && ...)`): same shape. With `(?!=)`: doesn't match. ✓

The skipIf-range logic doesn't need to change for these specific cases.

### Step 2 (optional, if A2 lands first) — also exclude comment ranges

Once A2's `buildCommentRanges` is in place, extend W-LINT-013's skipIf to skip comments too. This catches the case where someone documents the ghost pattern in a comment:

```js
{
  regex: /\s@[a-z][a-zA-Z0-9]*(?:\.[a-z]+)*\s*=(?!=)/g,
  // ...
  code: "W-LINT-013",
  skipIf: (offset, logicRanges, _cssRanges, commentRanges) =>
    inRange(offset, logicRanges) || inRange(offset, commentRanges),
},
```

(If A2 hasn't landed yet, leave the skipIf at its current 2-arg form. The negative-lookahead alone fixes the two examples + sample misfires. Comment-range exclusion is extra polish.)

### Step 3 (optional, deferred) — `~{}` test sigil exclusion

If after step 1+2 there are still misfires inside `~{}` blocks for other lint codes that scan more aggressively, add a `buildTildeRanges(source)` helper analogous to `buildLogicRanges` and `buildCssRanges`. **Not needed for W-LINT-013 specifically** — the negative lookahead in step 1 handles the verified cases. Defer until evidence shows it's needed.

---

## Test plan

### Existing tests that must continue to pass

`compiler/tests/unit/lint-ghost-patterns*.test.js` — all existing W-LINT-013 positive-detection cases must still produce the warning.

Specifically: any test with `@click="..."`, `@click.stop="..."`, `@input="..."` etc. must still fire W-LINT-013. The negative lookahead doesn't affect these because they have `="` (not `==`) after the keyword.

### New regression tests

Add to `compiler/tests/unit/lint-w-lint-013-equality-no-misfire.test.js`:

1. **`@reactive == value` does not misfire:**
   ```scrml
   <program>
   ${
     @count = 0
     ~{ test "x" { assert @count == 0 } }
   }
   </program>
   ```
   Expected: zero W-LINT-013 diagnostics.

2. **`if=()` with `@reactive ==` does not misfire:**
   ```scrml
   <program>
   ${ @x = 0 }
   <div if=(@x == 5)>visible</div>
   </program>
   ```
   Expected: zero W-LINT-013 diagnostics.

3. **Multiple `==` in a compound expression:**
   ```scrml
   <program>
   ${ @x = 0; @y = 0 }
   <div if=(@x == 1 && @y == 2)>both</div>
   </program>
   ```
   Expected: zero W-LINT-013 diagnostics.

4. **Sanity — real Vue `@click="..."` STILL fires:**
   ```scrml
   <button @click="handler">click</button>
   ```
   Expected: ONE W-LINT-013 diagnostic.

5. **Sanity — `@click.stop="..."` modifier form still fires:**
   ```scrml
   <button @click.stop="handler">click</button>
   ```
   Expected: ONE W-LINT-013 diagnostic.

6. **Mixed file — real ghost AND scrml equality:**
   ```scrml
   <program>
   ${ @x = 0 }
   <button @click="bad">ghost</button>
   <span if=(@x == 1)>good</span>
   </program>
   ```
   Expected: exactly ONE W-LINT-013 diagnostic — on the `<button>` line, NOT on the `<span>` line.

### Existing-corpus verification

After fix, recompile:
- `examples/10-inline-tests.scrml` — should drop from 14 lints to 0 lints.
- `examples/14-mario-state-machine.scrml` — should drop from 2 lints to 1 lint (W-LINT-007 line 5 remains until A2 lands; if A2 also lands, both go away).

Run sample-corpus sweep — W-LINT-013 firing-count should drop from 4 to whatever number of REAL Vue-ghost detections exist (might be 0, 1, or 2).

Run full test suite — no new failures.

---

## Pre-snapshot baseline

- **Compiler SHA:** `b1ce432` (S41 close, no compiler-source changes by S42 audit work).
- **Test status (S42 measurement):** 7872 pass / 40 skip / 0 fail / 372 files.
- **Examples corpus:** 22/22 compile; ex 10 has 14 W-LINT-013 lints; ex 14 has 2 lints (1× W-LINT-007 line 5 + 1× W-LINT-013 line 144). Post-fix expected: ex 10 → 0 lints; ex 14 → 1 lint (W-LINT-007 line 5 remaining; A2 fixes that).
- **Sample-corpus W-LINT-013 firing count:** 4 (per Stage 1 sample-classification report). Post-fix expected: 0 to 2 (depending on whether any of the 4 are real detections vs misfires).

---

## Risk profile

- **Blast radius:** single regex character (`(?!=)` lookahead) + optional one-line skipIf signature update if A2's commentRanges is reused. Smallest possible code change.
- **Failure modes:**
  - **Over-loose:** the `(?!=)` excludes `==` but doesn't exclude `=>` (arrow), `=<` (not a JS operator), or `=` followed by anything else. Audit the patterns:
    - `@var =>` (arrow with `@var` LHS) — matches under current regex too; lookahead doesn't help. **But this pattern is invalid scrml** (per spec, `@var` is read in expression position; `@var =>` would be a syntax error in JS too). False positive risk: zero in practice.
    - `@var = expr` (single-= assignment in markup attr) — already discussed; wouldn't have a leading `\s` in attribute position.
  - **Under-loose:** if some future regex change introduces `===` or other multi-`=` operators, the negative lookahead would only exclude two-`=` cases. For `===`, the regex still matches the first `=` and the lookahead `(?!=)` rejects it (since the second char is `=`). So `===` is also correctly excluded. ✓
- **Spec alignment:** SPEC §45 mandates **single `==`** equality (no `===` in scrml). The fix aligns the lint's distinction between `@var=` (Vue ghost) and `@var ==` (scrml equality) with the spec's equality-operator definition.
- **Reversibility:** trivial (one-character revert).

---

## Coordination

This fix is **independent of A2** in its core form (step 1 alone — the regex tweak). Step 2 (comment-range integration) requires A2's `buildCommentRanges` to exist.

Two dispatch options:
- **(a) Combined dispatch:** A2 + A1 in a single pipeline run, A2's infrastructure landed first then A1 reuses it. Single PR, cohesive narrative ("the lint family fixes").
- **(b) Independent:** dispatch A1 with step 1 only (regex tweak); A2 lands separately. Step 2 (comment-range) can be a small follow-up after both ship.

Recommend **(a) combined dispatch** since both touch the same file and are conceptually paired. Single pipeline run, cleaner commit history.

---

## References

- Findings tracker: `docs/audits/scope-c-findings-tracker.md` §A1 (full root-cause analysis).
- Stage 1 audit: `docs/audits/scope-c-stage-1-2026-04-25.md` §4 Issue A.
- Sample-classification report: `docs/audits/scope-c-stage-1-sample-classification.md` (W-LINT-013 firing on 4 samples).
- Adjacent intake: `docs/changes/fix-w-lint-007-comment-range-exclusion/intake.md` (A2).
- Spec: SPEC.md §45 (single-`==` equality semantics).

---

## Tags
#bug #lint #ghost-pattern #w-lint-013 #regex-fix #equality-operator #scope-c #stage-1 #s42 #t1
