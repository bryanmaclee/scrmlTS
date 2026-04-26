# fix-component-def-text-plus-handler-child — Intake (Scope C finding A3, hypothesis revised)

**Surfaced:** 2026-04-25 (S42), Scope C Stage 3 (refactor of example 05-multi-step-form). Initially mis-hypothesized as "match-with-lift component refs not visited by walkLogicBody"; corrected during S42 deep-dive (post-A5, post-A1+A2 land).
**Status:** SCOPED, awaiting authorization to dispatch. **Needs further trace before implementation** — the exact failure path inside the parser is not yet located.
**Tracker entry:** `docs/audits/scope-c-findings-tracker.md` §A3.
**Tier:** **T2** (parser-level investigation; expected single-file fix in `component-expander.ts` or `ast-builder.js` once located).
**Priority:** medium-high — the canonical "render component per state" pattern hits this when the component contains a common UI shape.

---

## Symptom

Component definitions whose root is a `<wrapper>` element containing direct text + a child element with an event-handler attribute (`onclick=fn()`, etc.) **fail to register in the component registry**. Any subsequent reference produces E-COMPONENT-020 ("Component `Foo` is not defined in this file"), even though the definition IS in scope.

### Verified bisected triggers (S42 keyword sweep)

| Component def shape | Result |
|---|---|
| `<button onclick=fn()>x</button>` (single-element root) | OK |
| `<div><button onclick=fn()>x</button></div>` (no leading text) | OK |
| `<div>label <span>more</span></div>` (no event handler) | OK |
| `<div>label <button onclick=fn()>x</button></div>` (text + handler-bearing child) | **FAIL E-COMPONENT-020** |
| `<div>info text only</div>` (text only) | OK |

The trigger is the **specific combination** of:
1. Component-def root is a wrapper element (e.g. `<div>`)
2. The wrapper has direct text content
3. Followed by a child element with an event-handler attribute (`onclick=fn()`, etc.)

### Failure modes

E-COMPONENT-020 fires regardless of how the component is referenced:
- Direct usage: `<Foo/>` → fails
- Via `match` + `lift`: `${ match @x { .V => { lift <Foo> } } }` → fails the same way

The match-with-lift form was originally suspected as the cause (per the original A3 hypothesis), but bisection shows the component DEFINITION fails to register — the usage pattern is incidental.

### Repro (minimal — verified S42)

```scrml
<program>
${ function fn() { } }
${ const Foo = <div>label <button onclick=fn()>x</button></div> }
<div><Foo/></div>
</program>
```

Compiles with E-COMPONENT-020 even though `Foo` IS defined.

### Examples affected

`examples/05-multi-step-form.scrml` originally failed because `InfoStep` had `<div>...<button onclick=next()>Next</button></div>`. Currently works around the bug by using `if=`/`else-if=`/`else` chain instead of `match { .Variant => { lift <Comp> } }`, but the underlying definition issue remains — the workaround dodges the trigger by changing how the component is referenced.

---

## Source location candidates (need trace)

The component-def parsing pipeline crosses several files:

1. **Block Splitter (BS)** — `compiler/src/block-splitter.js`. Tokenizes the source into blocks. The component-def's body is collected as text/tokens.
2. **AST builder (TAB)** — `compiler/src/ast-builder.js`. Creates `component-def` nodes from logic-block declarations of the form `const Foo = <markup>...</>`.
3. **Component Expander (CE)** — `compiler/src/component-expander.ts`. Builds the registry from `ast.components` (line 1494 — `const componentDefs = (ast.components ?? [])`). Calls `parseComponentDef` (line 356+) to convert each def into a `RegistryEntry`. The raw text is normalized at `component-expander.ts:301-355` (per the comment block: "The `raw` field from component-def is a space-joined logic token stream...").

The most likely failure site is in **CE's raw normalization or re-parse step**. The comment at `component-expander.ts:222`:

> Normalize a tokenized `raw` string from component-def back to parseable scrml markup source.

Suggests a re-parse pipeline that may not handle the `text + <elem with attrs>` shape correctly.

### Investigation steps before implementing fix

1. Add `console.log` (or use a minimal debug harness) at:
   - `ast-builder.js` after a `component-def` node is created — verify Foo's def IS created with the right `name` and `raw`.
   - `component-expander.ts` `buildComponentRegistry` (line 464) — log each registry entry as it's added. Is Foo present?
   - `component-expander.ts` `parseComponentDef` (line 356+) — does it return null for the triggering def, dropping it from the registry?
2. Compare the raw token stream for OK shapes (`<div><button onclick=fn()>x</button></div>`) vs FAIL shapes (`<div>label <button onclick=fn()>x</button></div>`). The diff in raw tokenization is the lever for the fix.
3. The normalization at `component-expander.ts:1376-1383` does a series of regex replacements:
   ```ts
   .replace(/< \/ >/g, "</>")
   .replace(/< \/\s*([A-Za-z][A-Za-z0-9]*)\s*>/g, "</$1>")
   .replace(/<\s+([A-Za-z][A-Za-z0-9_]*)/g, "<$1")
   .replace(/\s*=\s*"/g, '="')
   .replace(/"\s*>/g, '">')
   .replace(/\s*\/\s*>/g, "/>")
   .replace(/([^"=])\s*>/g, "$1>");
   ```
   The last replacement `([^"=])\s*>` could be eating the space between `label` and `<button>` in the raw stream, producing `label<button onclick=fn()>` (no space) which then fails to parse as text + element.

### Hypothesis pending verification

The raw normalization regex `([^"=])\s*>` collapses whitespace before `>`. In a token stream like `label < button onclick = fn ( ) > x < / button > < / div >`, the regex may produce malformed output where text fragments and tags blur. Without the leading text (just `<div><button...`) the raw stream is `< div > < button onclick = fn ( ) > ...` and the normalizations work. With leading text, an extra `label` token disrupts the boundary detection.

**This hypothesis is not yet verified.** The fix may require:
- Tightening the raw normalization regex to preserve text-vs-tag boundaries
- OR fixing how the BS/TAB collects the def's raw token stream so the re-parse doesn't need fragile normalization at all
- OR rewriting `parseComponentDef` to use a structured re-parse path instead of regex normalization

---

## Fix approach (deferred — pending trace)

Rather than scope a fix sketch with insufficient evidence, this intake **explicitly defers** to the dispatched agent for the implementation strategy. The agent should:

1. **Trace first.** Before writing any fix, locate the exact failure point. Use the investigation steps above. Document the trace in `progress.md`.
2. **Choose the smallest fix that resolves the bisected triggers.** Likely:
   - Tighten the raw normalization regex(es)
   - OR change one upstream collection step to preserve boundaries
3. **Verify against the keyword sweep.** All four bisect cases above must end up OK after fix.
4. **Avoid over-fitting.** The fix should generalize to other "wrapper + text + element-with-attrs" shapes, not just `<button onclick>`. Test with other handler attributes (`onsubmit=`, `onchange=`, `oninput=`) and other wrapper tags (`<section>`, `<article>`, `<header>`, etc.).

---

## Test plan

### Existing tests that must continue to pass

- `compiler/tests/unit/component-expander*.test.js` (all existing component-expander tests)
- All 22 example files in `examples/` (post-A5, post-A1+A2 baseline)
- All 7889 currently-passing tests on main

### New regression tests

Add to `compiler/tests/unit/component-def-text-plus-handler-child.test.js`. Use end-to-end `compileScrml` invocations:

1. **Verified bisected trigger (canonical):**
   ```scrml
   <program>
   ${ function fn() { } }
   ${ const Foo = <div>label <button onclick=fn()>x</button></div> }
   <div><Foo/></div>
   </program>
   ```
   Expected: zero E-COMPONENT-020. HTML output renders `Foo` correctly.

2. **Variation — different wrapper tag:**
   ```scrml
   ${ const Foo = <section>title <a href="/x" onclick=fn()>link</a></section> }
   ```

3. **Variation — different handler attribute:**
   ```scrml
   ${ const Foo = <div>info <input onchange=fn()/></div> }
   ```

4. **Variation — multiple text-then-handler children:**
   ```scrml
   ${ const Foo = <div>a <button onclick=fn()>b</button> c <button onclick=fn()>d</button></div> }
   ```

5. **Sanity — usage via match-with-lift after def is fixed:**
   ```scrml
   <div>
     ${ match @x {
       .A => { lift <Foo> }
       else => { }
     } }
   </div>
   ```
   Expected: works (this was the original A3 mis-hypothesis; verifying it works post-fix closes the loop).

6. **Sanity — pre-fix passing case still passes:**
   ```scrml
   ${ const Bar = <button onclick=fn()>x</button> }
   ```
   Expected: works (single-element root with handler — was OK pre-fix, must remain OK).

### Existing-corpus verification

After fix:
- `examples/05-multi-step-form.scrml` should be refactorable BACK to the original `match { .Variant => { lift <Component> } }` pattern instead of the if-chain workaround. Verify by reverting that part of the file and confirming it compiles. (Optional cleanup; the if-chain version also works.)
- All 22 example files compile clean (or with their currently-known WARN states).
- Sample-corpus failure count: 23 (post-A5). Post-fix: same or lower. Some currently-failing samples may share this bug class — flag any that flip FAIL→PASS as a bonus.

---

## Pre-snapshot baseline

- **Compiler SHA:** `9a07d07` (post-A5, post-A1+A2).
- **Test status:** 7889 pass / 40 skip / 0 fail / 375 files.
- **Sample corpus:** 23 fails / 275 (top-level). Post-A5 baseline.
- **Examples:** 22/22 compile (modulo known WARN states for ex 10/14/18).

---

## Risk profile

- **Blast radius:** depends on the located fix path. If it's in raw-normalization regex (CE), single-file ~5-10 lines. If it's in BS/TAB collection logic, slightly broader.
- **Failure modes:**
  - Over-fitting: a regex tightened too narrowly fixes the verified trigger but lets other shapes through. Mitigated by the variation tests above.
  - Boundary regressions: tightening text/tag boundary detection could affect other component shapes that are currently working. Mitigated by full corpus sweep.
- **Spec alignment:** SPEC §15 (Component System) defines components as markup-bound declarations with arbitrary children. Text + element children are a natural shape. The fix aligns parsing with §15 by ensuring this shape registers correctly.
- **Reversibility:** depends on fix scope. If single regex change, trivial. If broader collection-logic change, single-commit revert.

---

## Out of scope

- Fixing all uses of the affected pattern across the corpus (orthogonal — once the parser fix lands, broken samples may auto-resolve). Track follow-ups separately if needed.
- Rewriting the component-def parser entirely. Specifically scope the smallest fix that resolves the bisected triggers.
- Refactoring `examples/05-multi-step-form.scrml` back to match-with-lift. Optional cleanup, not required for the fix to land.

---

## References

- Findings tracker: `docs/audits/scope-c-findings-tracker.md` §A3 (revised hypothesis).
- Original mis-hypothesis (in tracker pre-revision): "walkLogicBody not recursing into match arms" — proven wrong because match-stmt/match-expr nodes use `body: LogicStatement[]` for arms (per `types/ast.ts:589, 675`) and `walkLogicBody` already recurses into `body`.
- Stage 3 audit context: `docs/audits/scope-c-stage-1-2026-04-25.md` §4 Issue C.
- Example originally surfacing the bug: `examples/05-multi-step-form.scrml` (currently working around the bug via if-chain instead of match-with-lift).
- Spec: SPEC.md §15 (Component System), §5 (Attribute Quoting / event handlers).

---

## Tags
#bug #parser #component-expander #component-def #event-handler #scope-c #stage-3 #s42 #t2 #hypothesis-revised #needs-trace
