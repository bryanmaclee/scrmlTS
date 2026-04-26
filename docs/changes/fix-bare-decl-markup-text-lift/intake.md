# fix-bare-decl-markup-text-lift — Intake (Scope C finding A5)

**Surfaced:** 2026-04-25 (S42), during Scope C Stage 3 (writing example 20 middleware) and bisected during the S42 compiler-bug deep-dive.
**Status:** SCOPED, awaiting authorization to file pre-snapshot + dispatch.
**Tracker entry:** `docs/audits/scope-c-findings-tracker.md` §A5 (root cause located, fix sketches recorded).
**Tier:** **T1** (single file, ~5 line change). Originally classified T2/T3 in the tracker; reclassified T1 once the bug was located.
**Priority:** **HIGH** — silent text corruption is the dangerous mode (compiles clean, output is wrong, ships unnoticed).

---

## Symptom — two failure modes from one root cause

### Mode 1: visible compile error (long-form)

Source:
```scrml
<program>
${ @x = 0 }
<p>function adds a request.</p>
</program>
```

Compile output:
```
error [E-SCOPE-001]: Undeclared identifier `a` in logic expression. No variable, function, type, or import with that name is in scope.
  stage: TS
FAILED — 1 error
```

The error is **phantom** — `a` is not in the source as an identifier; it is a word inside paragraph prose. The error message is misleading.

### Mode 2: silent text corruption (short-form)

Source:
```scrml
<program>
${ @x = 0 }
<p>function adds.</p>
</program>
```

Compile output: clean, 1 file emitted.

HTML output:
```html
<body>

<span data-scrml-logic="_scrml_logic_1"></span>
```

**The paragraph text is gone from the rendered output.** It was promoted to a logic block, parsed as a (zero-statement) function declaration, and emitted as a logic-marker `<span>` instead of a paragraph. The reader sees an empty paragraph; no diagnostic warns the developer.

This is the dangerous mode — compiles clean, ships unnoticed, content is missing from production.

---

## Keyword sweep

Tested 15 keywords in `<p>KW adds a request.</p>` form. Only two trigger the leak:

| Keyword | Result |
|---|---|
| `function` | **FAIL** (long form errors, short form silently corrupts) |
| `fn` | **FAIL** (same) |
| `let`, `const`, `if`, `for`, `while`, `return`, `import`, `export`, `class`, `server`, `type`, `async`, `await` | OK — pass through as text |

The match is keyword-specific to scrml's function-declaration starters.

---

## Root cause (located, line-precise)

Two adjacent constructs in `compiler/src/ast-builder.js`:

**Line 211 — `BARE_DECL_RE`:**
```js
const BARE_DECL_RE = /^\s*(server\s+(?:fn|function)\s|type\s+\w|fn\s+\w|function\s+\w)/;
```

**Lines 235-260 — `liftBareDeclarations`:**
```js
function liftBareDeclarations(blocks) {
  return blocks.map(block => {
    // Recursively process children of markup/state contexts
    if (block.type === "markup" || block.type === "state") {
      const newChildren = liftBareDeclarations(block.children || []);
      return { ...block, children: newChildren };
    }

    // Convert text blocks that start with a bare declaration keyword
    if (block.type === "text" && BARE_DECL_RE.test(block.raw)) {
      return {
        type: "logic",
        raw: "${" + block.raw + "}",
        span: block.span,
        depth: block.depth,
        children: [],
        name: null,
        closerForm: null,
        isComponent: false,
        _synthetic: true,
      };
    }

    return block;
  });
}
```

The function exists to support **file-level** bare declarations — letting developers write `function foo() {...}` at the top of a `.scrml` file without explicit `${...}` wrapping. The recursion into `state` block children is also legitimate (server functions inside `< db>` blocks are real declarations and need the same lift).

**The recursion into `markup` block children (line 238) is the bug.** Inside `<p>`, `<div>`, `<h1>`, etc., text is content — not a declaration site. But the recursion descends into markup children, and any text block whose first token matches `BARE_DECL_RE` gets promoted to a logic block, regardless of whether its parent is markup or state.

The lifted text is then handed to the logic parser, which interprets:
- `function adds a request.` → a function declaration with name `adds` and parameters from the rest. Parser flags `a`/`request` as undeclared identifiers (mode 1), OR
- `function adds.` → a function declaration with name `adds` and no body. Parses clean, emits a logic-marker span. Original text is gone (mode 2).

---

## Fix approach (two options scoped)

### Option 1 (preferred — simplest): drop the markup-children recursion entirely

```js
function liftBareDeclarations(blocks) {
  return blocks.map(block => {
    // Recurse into state children (server fns inside < db> still need the lift)
    if (block.type === "state") {
      const newChildren = liftBareDeclarations(block.children || []);
      return { ...block, children: newChildren };
    }

    // Markup children are passed through unchanged — text inside markup
    // is content, not a declaration site. Bare declarations inside markup
    // require explicit ${...} wrapping per existing convention.
    if (block.type === "markup") {
      return block;
    }

    if (block.type === "text" && BARE_DECL_RE.test(block.raw)) {
      return {
        type: "logic",
        raw: "${" + block.raw + "}",
        span: block.span,
        depth: block.depth,
        children: [],
        name: null,
        closerForm: null,
        isComponent: false,
        _synthetic: true,
      };
    }

    return block;
  });
}
```

**Net change:** ~5 lines. Splits the markup-and-state branch into two; markup branch returns the block unchanged.

**Consequence:** any existing scrml file that *intentionally* relied on bare declarations being auto-lifted inside markup blocks (i.e. wrote `function foo() {...}` directly inside `<div>...</div>` without `${...}`) would stop compiling. Per spec convention this is unusual; the canonical pattern is `${ function foo() {...} }`. But the test suite must verify nothing in the existing corpus breaks.

### Option 2 (safer — context flag): suppress lift inside markup, preserve everywhere else

```js
function liftBareDeclarations(blocks, isMarkupContext = false) {
  return blocks.map(block => {
    if (block.type === "markup") {
      const newChildren = liftBareDeclarations(block.children || [], true);
      return { ...block, children: newChildren };
    }
    if (block.type === "state") {
      const newChildren = liftBareDeclarations(block.children || [], false);
      return { ...block, children: newChildren };
    }

    // Only lift bare declarations OUTSIDE markup contexts.
    if (block.type === "text" && !isMarkupContext && BARE_DECL_RE.test(block.raw)) {
      return {
        type: "logic",
        raw: "${" + block.raw + "}",
        span: block.span,
        depth: block.depth,
        children: [],
        name: null,
        closerForm: null,
        isComponent: false,
        _synthetic: true,
      };
    }

    return block;
  });
}
```

**Net change:** ~7 lines. Threads an `isMarkupContext` flag through recursion. State branch always passes `false` (preserves current behavior); markup branch passes `true` (suppresses lift). Top-level call uses default `false`.

**Consequence:** structurally identical observable behavior to Option 1 in the failure cases (text inside markup is no longer lifted). Marginally more conservative because the recursion still happens — only the lift action is suppressed. Useful if anything else in `liftBareDeclarations` ever grows beyond the lift logic.

### Recommendation

**Option 1.** The recursion into markup adds nothing — every node returned is identical to the input except for shallow children-array shape (`block` vs `{ ...block, children: [...] }`). Skipping it produces cleaner code.

Option 2 is a fallback if Option 1 turns out to break a legitimate-but-unusual existing test that relies on inside-markup bare-decl lifts.

---

## Test plan

### Existing tests that must continue to pass

1. Bare `function foo() {...}` at file top level — auto-lifts to `${...}`, compiles. (Test for the `liftBareDeclarations` happy path.)
2. Bare `function foo() {...}` inside a `< db>` state block — auto-lifts, compiles. (State recursion preserved.)
3. Bare `type Foo:enum = {...}` at file top level — auto-lifts, compiles.
4. Bare `server function foo() {...}` inside a `< db>` — auto-lifts.
5. All 22 example files in `examples/` continue to compile clean (or with their currently-known WARN states for ex 10, 14, 18).

### New regression tests

Add to `compiler/tests/unit/`. Suggested file: `bare-decl-markup-text-no-lift.test.js`.

1. **Phantom-error mode:**
   ```scrml
   <program>
   ${ @x = 0 }
   <p>function adds a request.</p>
   </program>
   ```
   Expected: compiles clean (no E-SCOPE-001). HTML output preserves the paragraph text.

2. **Silent-corruption mode:**
   ```scrml
   <program>
   ${ @x = 0 }
   <p>function adds.</p>
   </program>
   ```
   Expected: compiles clean. **HTML output contains the text "function adds."** (Currently produces `<span data-scrml-logic="...">` instead.)

3. **Same for `fn`:**
   ```scrml
   <program>
   ${ @x = 0 }
   <p>fn adds a request.</p>
   </program>
   ```

4. **Same for `type`:**
   ```scrml
   <program>
   ${ @x = 0 }
   <p>type X is a thing.</p>
   </program>
   ```

5. **Same for `server function`:**
   ```scrml
   <program>
   ${ @x = 0 }
   <p>server function f returns nothing.</p>
   </program>
   ```

6. **Sanity — leading word still lifts correctly when in logic position:**
   ```scrml
   <program>
   function foo(x) { return x + 1 }
   <p>top</p>
   </program>
   ```
   Expected: top-level `function foo` is auto-lifted to `${...}`, `foo` is callable from elsewhere in the file.

### Existing-corpus verification

After the fix, run:
```
bun test
```
All 7872 pass / 40 skip / 0 fail must remain. Any new failure indicates a legit-but-unusual existing test that depended on inside-markup bare-decl lifts — investigate before committing.

After the fix, run a full samples + examples sweep:
```
for f in samples/compilation-tests/*.scrml; do bun run compiler/src/cli.js compile "$f" -o /tmp/scope-c-verify/ 2>&1 | grep -q "FAILED" && echo "REGRESSION: $f"; done
for f in examples/*.scrml; do bun run compiler/src/cli.js compile "$f" -o /tmp/scope-c-verify/ 2>&1 | grep -q "FAILED" && echo "REGRESSION: $f"; done
```
No new failures.

---

## Pre-snapshot baseline

- **Compiler SHA:** `b1ce432` (S41 close, S42 audit/refresh work didn't change compiler source — only docs + examples + audit reports).
- **Test status:** **7872 pass / 40 skip / 0 fail across 372 files** (verified 2026-04-25 S42). Note: the S41 hand-off recorded 7852 pass; the +20 delta is likely from previously-skipped tests becoming unskipped between S41 close and S42 measurement, OR a counting artifact at S41 close time. Either way, the post-fix target is "no regressions vs THIS baseline (7872)."
- **Examples corpus (S42 Stage 3 close):** 22/22 example files compile (3 with documented WARN states for unrelated reasons — ex 10 W-LINT-013 misfires per A1, ex 14 W-LINT-013/W-LINT-007 misfires per A1+A2, ex 18 W-AUTH-001 scaffold per C2). Post-fix: same 22/22 with same WARN profile.
- **Samples corpus (S42 Stage 1 close):** 22 clean / 229 warn-only / 24 fail (top-level). Post-fix: same numbers (the lift is keyword-specific to declaration starters; samples corpus is mostly fragment-shape and unlikely to coincidentally start a markup text with `function`/`fn`/`type`/`server`).

---

## Risk profile

- **Blast radius:** single file, single function. Affects every scrml file's pre-AST tree-walk but the change is purely subtractive (drops a recursion / suppresses a transform). No new code paths introduced.
- **Failure modes:**
  - **False alarm:** an existing scrml file in tests/samples/examples relied on inside-markup bare-decl auto-lift. Mitigated by full test/sample/example sweep before merge.
  - **Incomplete fix:** the lifter still triggers in some other not-yet-tested context (e.g. CSS contexts, foreign code blocks). Mitigated by the keyword-sweep methodology — re-run the sweep across other parent block types before merge.
- **Spec alignment:** SPEC §11 / §13 / §22 do not mandate inside-markup bare declarations to be auto-lifted. The recursive descent into markup appears to be an over-eager implementation detail rather than a spec requirement. The fix aligns observable behavior with the spec's intended canonical shape (developer writes `${ ... }` to enter logic context inside markup).
- **Reversibility:** trivial. Single-commit revert if any issue surfaces.

---

## Out of scope

- Other parser-context-leak bugs unrelated to `liftBareDeclarations`. If A5's fix uncovers similar leaks elsewhere (e.g. `liftBareTypeDecls` or other pre-AST passes), file separately.
- The lint family bugs (A1, A2) — separate intake, same Scope C tracker.
- The match-arm component-expander bug (A3) and lin-template-literal-interpolation bug (A4) — separate intakes.

---

## References

- Findings tracker: `docs/audits/scope-c-findings-tracker.md` §A5 (full root-cause analysis, keyword sweep, severity escalation log).
- Stage 3 audit context: `docs/audits/scope-c-stage-1-2026-04-25.md` §4 (the original incomplete A5 hypothesis — "HTML entities + nested `<code>`" — superseded by the S42 deep-dive).
- Example 20 middleware (the originally-failing file that surfaced this): `examples/20-middleware.scrml` — currently works around the bug by rephrasing prose. Once the fix lands, the example body could be reverted to use `<code>` + `&lt;` heavily.
- Hand-off: `hand-off.md` (S42 active; A5 deep-dive recorded in §8 session log).

---

## Tags
#bug #parser #ast-builder #bare-decl-lift #markup-context-leak #silent-corruption #scope-c #stage-3 #s42 #t1 #high-priority
