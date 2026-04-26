# fix-w-lint-013-tilde-range-exclusion — Intake (Scope C finding A6)

**Surfaced:** 2026-04-25 (S42), by the A1+A2 combined pipeline run (`worktree-agent-a7ecf2afa4b522a64`, commit `c530157`, cherry-picked to main as `9a07d07`).
**Status:** SCOPED, awaiting authorization to dispatch.
**Tracker entry:** `docs/audits/scope-c-findings-tracker.md` §A6.
**Tier:** **T1** (single helper added — `buildTildeRanges` analogous to A2's `buildCommentRanges`).
**Priority:** low (cosmetic — example 10 currently has 8 leftover lints; doesn't block anything).
**Anticipated by:** A1 intake §"Step 3 (optional, deferred): `~{}` test sigil exclusion." Pipeline confirmed it's needed.

---

## Symptom

W-LINT-013 ("Found `@click=\"handler\"` (Vue event shorthand)") still fires on `@var = N` single-`=` assignment statements inside `~{}` test sigil bodies, even after A1's `(?!=)` negative-lookahead landed.

A1 fixed the equality cases (`assert @count == 0`) — those got the `(?!=)` lookahead and don't match anymore. But the lint still fires on:

```scrml
~{ "test name"
  test "case" {
    @count = 0       // single `=` assignment — W-LINT-013 still misfires
    @step = 1        // same
    increment()
    assert @count == 1   // post-A1: correctly NOT misfiring (== caught by lookahead)
  }
}
```

The `@count = 0` shape:
- Has a leading whitespace + `@count <space> =` — matches W-LINT-013's regex
- Single `=` (not `==`) — `(?!=)` lookahead lets it match
- The skipIf only checks `${}` logic ranges + (post-A2) comment ranges. Test-sigil bodies are neither.

### Examples affected

`examples/10-inline-tests.scrml` — currently emits **8 W-LINT-013 misfires** (down from 14 pre-A1+A2). The remaining 8 are exactly the `@var = N` lines inside the `~{}` test-sigil block.

### Sample-corpus reach

Unknown without re-classifying after A1+A2 landed. The Stage 1 sample-classification report counted W-LINT-013 firing on 4 top-level samples; some of those may have been the `==` cases (now fixed) and some may be `~{}` cases (still misfiring). Worth a quick re-scan during fix verification.

---

## Source location

`compiler/src/lint-ghost-patterns.js`. Same file as A1+A2. The infrastructure to extend:
- `buildLogicRanges` (line 93) — existing; covers `${}` blocks
- `buildCssRanges` (line 140) — existing; covers `#{}` blocks
- `buildCommentRanges` (added by A2 around line 159+) — covers `//` and `/* */`
- **NEW: `buildTildeRanges`** — needs to cover `~{}` test sigil blocks

The `~{}` test sigil is a brace-balanced block per §32 (the `~` keyword, sub-section on inline tests).

---

## Fix approach

Three steps, all in `compiler/src/lint-ghost-patterns.js`.

### Step 1 — add `buildTildeRanges(source)`

Parallel to the existing `buildLogicRanges` / `buildCssRanges` / `buildCommentRanges`:

```js
/**
 * Build ranges for `~{...}` test sigil blocks (brace-balanced).
 * Used to exclude lint patterns from firing on legitimate scrml content
 * inside inline test bodies (assertions, reactive assignments, etc.).
 *
 * Per §32, `~{}` is the inline-test sigil. Its body contains scrml code
 * (test declarations, assertions, reactive reads/writes) that should not
 * trigger ghost-pattern detection.
 *
 * @param {string} source
 * @returns {Array<[number, number]>}
 */
function buildTildeRanges(source) {
  const ranges = [];
  let i = 0;
  while (i < source.length) {
    if (source[i] === "~" && source[i + 1] === "{") {
      const start = i;
      i += 2;
      let depth = 1;
      while (i < source.length && depth > 0) {
        if (source[i] === "{") depth++;
        else if (source[i] === "}") depth--;
        i++;
      }
      ranges.push([start, i]);
    } else {
      i++;
    }
  }
  return ranges;
}
```

### Step 2 — extend the `skipIf` callback signature

Update `lintGhostPatterns` (around line 361):

```js
export function lintGhostPatterns(source, filePath) {
  if (!source || source.length === 0) return [];

  const logicRanges = buildLogicRanges(source);
  const cssRanges = buildCssRanges(source);
  const commentRanges = buildCommentRanges(source);
  const tildeRanges = buildTildeRanges(source);   // ← new
  const diagnostics = [];

  for (const pattern of PATTERNS) {
    const re = new RegExp(pattern.regex.source, pattern.regex.flags);
    let match;
    while ((match = re.exec(source)) !== null) {
      const offset = match.index;

      if (pattern.skipIf && pattern.skipIf(offset, logicRanges, cssRanges, commentRanges, tildeRanges)) {
        continue;
      }
      // ... rest unchanged
    }
  }
  // ... rest unchanged
}
```

5-arg skipIf signature. Backwards compatible — patterns with shorter signatures continue to work; only patterns that opt into tilde-range exclusion need to update.

### Step 3 — update W-LINT-013's skipIf

Add `tildeRanges` exclusion to the existing pattern:

```js
{
  regex: /\s@[a-z][a-zA-Z0-9]*(?:\.[a-z]+)*\s*=(?!=)/g,
  ghost: "@click=\"handler\" (Vue event shorthand)",
  correction: "onclick=handler() (scrml uses standard on<event> attribute names)",
  see: "§5",
  code: "W-LINT-013",
  skipIf: (offset, logicRanges, _cssRanges, commentRanges, tildeRanges) =>
    inRange(offset, logicRanges) ||
    inRange(offset, commentRanges) ||
    inRange(offset, tildeRanges),
},
```

### Optional (defer to follow-up): audit other lints for `~{}` exclusion

W-LINT-013 is the only verified case of misfiring inside `~{}` bodies. Other lints scan markup-text patterns. During the fix, audit whether any other lint patterns should also exclude tilde ranges. **Recommendation:** ship just W-LINT-013 in this intake; audit others later if evidence shows misfires.

---

## Test plan

### Existing tests that must continue to pass

- All A1+A2 regression tests (W-LINT-007 comment exclusion, W-LINT-013 equality lookahead) — must continue to pass.
- All existing W-LINT-013 positive-detection tests — Vue `@click="..."` ghost shorthand outside `~{}` must still fire.

### New regression tests

Add to `compiler/tests/unit/lint-w-lint-013-tilde-no-misfire.test.js`:

1. **Reactive assignment inside `~{}`:**
   ```scrml
   ~{ "x"
     test "y" { @count = 0 }
   }
   ```
   Expected: zero W-LINT-013 diagnostics.

2. **Multiple assignments inside `~{}`:**
   ```scrml
   ~{ "x"
     test "y" {
       @a = 0
       @b = 1
       @c = 2
     }
   }
   ```
   Expected: zero W-LINT-013 diagnostics.

3. **Sanity — outside `~{}`, real Vue ghost still fires:**
   ```scrml
   <button @click="handler">x</button>
   ```
   Expected: ONE W-LINT-013 diagnostic.

4. **Mixed — assignment inside `~{}` + ghost in markup:**
   ```scrml
   ~{ "x" test "y" { @count = 0 } }
   <button @click="handler">x</button>
   ```
   Expected: exactly ONE W-LINT-013 diagnostic — on the `<button>`, NOT on the `@count = 0`.

5. **Nested braces inside `~{}` body** (sanity for the brace-balance counter):
   ```scrml
   ~{ "x"
     test "y" {
       const o = { a: 1, b: 2 }
       @count = o.a
     }
   }
   ```
   Expected: zero W-LINT-013 diagnostics. The `buildTildeRanges` brace counter must correctly handle nested `{`/`}` within the test body.

### Existing-corpus verification

After fix, recompile `examples/10-inline-tests.scrml` — should drop from 8 W-LINT-013 lints to 0.

Re-run sample-corpus W-LINT-013 firing count. Whatever number remains is real Vue-ghost detections; confirm they look legitimate.

Run full test suite — no new failures.

---

## Pre-snapshot baseline

- **Compiler SHA:** `9a07d07` (post-A1+A2, post-A5).
- **Test status:** 7889 pass / 40 skip / 0 fail / 375 files.
- **Examples:** ex 10 = 8 W-LINT-013 lints (target: 0); ex 14 = 0 lints (post-A1+A2; should remain 0).

---

## Risk profile

- **Blast radius:** single file (`lint-ghost-patterns.js`). Adds one helper (~15 lines) + 5-arg skipIf signature extension at call site + 1 skipIf update for W-LINT-013.
- **Failure modes:**
  - Over-exclusion: `~` could appear outside a tilde-sigil context and accidentally start a fake range. Mitigated by requiring `~{` (the sigil pair) — bare `~` alone won't match.
  - Under-exclusion: nested `~{}` inside `~{}` (uncommon) — the brace-balance counter handles this since each open brace bumps depth.
- **Spec alignment:** §32 defines `~` as the pipeline accumulator + tilde-sigil context. Test bodies inside `~{}` are scrml code, not markup-attribute position. The fix aligns lint behavior with the §32 / §5 attribute-position distinction.
- **Reversibility:** trivial.

---

## References

- Findings tracker: `docs/audits/scope-c-findings-tracker.md` §A6.
- A1 intake: `docs/changes/fix-w-lint-013-context-scope/intake.md` (predicted this finding in §"Step 3 (optional, deferred)").
- A2 intake: `docs/changes/fix-w-lint-007-comment-range-exclusion/intake.md` (the comment-range pattern this fix mirrors).
- Pipeline progress for A1+A2: `docs/changes/fix-w-lint-013-context-scope/progress.md` (records the 8 leftover lints in ex 10 as the surfacing event).
- Spec: SPEC.md §32 (the `~` keyword + inline test sigils).

---

## Tags
#bug #lint #ghost-pattern #w-lint-013 #tilde-range #test-sigil #scope-c #stage-1 #s42 #t1 #follow-up
