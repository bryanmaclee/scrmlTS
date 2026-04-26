# fix-component-def-block-ref-interpolation-in-body — Intake (Scope C finding A7)

**Surfaced:** 2026-04-25 (S42), by A3's bonus-signal verification (commit `bcd4557`'s post-fix trace).
**Status:** SCOPED, awaiting authorization to dispatch.
**Tracker entry:** `docs/audits/scope-c-findings-tracker.md` §A7.
**Tier:** **T2** (parser-level — same family as A3; likely shares infrastructure).
**Priority:** medium — blocks a common UI pattern (components that render a reactive value inline via `${@var}` interpolation in a definition list, table row, or other markup-bearing context).
**Likely related:** A8 (`<select><option>` children in component def). A3-family parser bug; both A7 + A8 surfaced from the same ex 05 verification.

---

## Symptom

A component definition whose body contains `${@reactive}` BLOCK_REF interpolations in markup positions still fails to register in the component registry post-A3 fix (`bcd4557`). Any reference produces E-COMPONENT-020 even though the definition IS in scope.

A3 fixed the `<wrapper>{text}+<elem with onclick=>` shape (collectExpr angle-tracker switched to element-nesting). But components with **`${@var}` interpolations in markup-text positions** (e.g. `<dd>${@firstName}</dd>`) hit a different parser failure — the angle-tracker fix doesn't reach this case.

### Verified case (extracted from `examples/05-multi-step-form.scrml` ConfirmStep)

`ConfirmStep` is the third step component. Its body contains:

```scrml
const ConfirmStep = <div class="step">
  <h2>Confirm</>
  <dl>
    <dt>Name</dt>   <dd>${@firstName} ${@lastName}</dd>
    <dt>Email</dt>  <dd>${@email}</dd>
    <dt>Theme</dt>  <dd>${@theme}</dd>
    <dt>Newsletter</dt> <dd>${@newsletter ? "Yes" : "No"}</dd>
  </dl>
  <div class="step-nav">
    <button onclick=back()>Back</button>
    <button onclick=submit()>Submit</button>
  </div>
</div>
```

Reference via `<ConfirmStep/>` (or via match-with-lift) → E-COMPONENT-020.

A3-trace agent confirmed: post-A3 fix, `InfoStep` (text + handler-child shape) reverts cleanly to canonical match-with-lift. `ConfirmStep` still fails. Different parser shape.

### Repro (proposed minimal — needs validation by dispatch agent)

```scrml
<program>
${
  @firstName = "Ada"
}

${
  const Foo = <div>
    <dl>
      <dt>Name</dt>
      <dd>${@firstName}</dd>
    </dl>
  </div>
}

<div><Foo/></div>
</program>
```

Expected post-fix: compiles clean, renders the dl/dt/dd with the reactive value interpolated.

The dispatch agent should:
1. Verify this minimal repro reproduces the bug (or refine if not — could be that `<dl><dt><dd>` semantics interact independently of `${@x}`)
2. Bisect what about `${@var}` in component-def-markup-text-position causes the registration failure

---

## Source location candidates (need trace)

A3's fix was in `compiler/src/ast-builder.js` `collectExpr` — switched angle-tracker from delimiter-nesting to element-nesting. The same `collectExpr` walks component-def bodies; `${@var}` BLOCK_REF interpolations are a separate token class that the angle-tracker likely doesn't handle (or handles incorrectly).

**Hypothesis (untested):** the `${...}` BLOCK_REF token in markup-text position triggers the same family of mid-stream truncation that A3 fixed for the IDENT-`=` boundary. The angle/block-ref tracker may need similar element-nesting logic.

**Candidate files:**
- `compiler/src/ast-builder.js` `collectExpr` and adjacent BLOCK_REF handling
- `compiler/src/tokenizer.ts` if BLOCK_REF tokens are mis-classified for the def-collection path

### Investigation steps (mandatory before fix)

Per the A3 pattern (trace first, fix second):

1. Add console.log at:
   - `ast-builder.js` after a `component-def` node is created — verify `Foo`'s def IS created with the right `name` and `raw` for the failing case
   - `component-expander.ts` `buildComponentRegistry` — log each registry entry as it's added
   - The token stream produced for the failing def
2. Compare the failing def's `raw` with a passing def (e.g. `InfoStep` post-A3). What's the truncation point?
3. Check if BLOCK_REF tokens (`${...}`) interact with the angle-tracker's element-counting logic A3 added.

Document the trace findings in `progress.md`. The actual fix only goes in after the failure point is identified.

---

## Fix approach (deferred — pending trace)

This intake **explicitly defers the fix-sketch to the dispatch agent**, following the same pattern as A3's intake. The dispatch agent should:

1. **Trace first.** Locate the exact failure point. Document in progress.md.
2. **Choose the smallest fix that resolves the bisected triggers.** Likely candidates:
   - Extend A3's element-nesting logic to handle BLOCK_REF tokens
   - OR modify how `collectExpr` consumes BLOCK_REF tokens in markup-text positions
3. **Avoid over-fitting.** The fix should generalize to other interpolation shapes — not just `${@var}`. Test with:
   - `${@reactive}` (the original case)
   - `${@reactive ? "a" : "b"}` (ternary)
   - `${someFn(@reactive)}` (call expression)
   - `${@reactive}!` (interpolation with adjacent text)
4. **Coordinate with A8.** If A8 (`<select><option>` children in component def) is dispatched in parallel or sequentially, share investigation findings. Both are likely the same parser family.

---

## Test plan

### Existing tests that must continue to pass

- All A3 regression tests (`compiler/tests/unit/component-def-text-plus-handler-child.test.js`)
- All 22 example files compile (modulo currently-known WARN states)
- Full 7906-test suite

### New regression tests

Add to `compiler/tests/unit/component-def-block-ref-interpolation.test.js`. End-to-end via `compileScrml`:

1. **Simple `${@var}` in `<dd>`:**
   ```scrml
   ${ @x = "hello" }
   ${ const Foo = <div><dl><dt>Greeting</dt><dd>${@x}</dd></dl></div> }
   <div><Foo/></div>
   ```

2. **Multiple `${@var}` interpolations:**
   ```scrml
   ${ const Foo = <div><dd>${@first} ${@last}</dd></div> }
   ```

3. **Ternary in interpolation:**
   ```scrml
   ${ const Foo = <div><dd>${@flag ? "yes" : "no"}</dd></div> }
   ```

4. **Function call in interpolation:**
   ```scrml
   ${ const Foo = <div><dd>${formatDate(@ts)}</dd></div> }
   ```

5. **Interpolation followed by text:**
   ```scrml
   ${ const Foo = <div><dd>Hello ${@name}!</dd></div> }
   ```

6. **Sanity — pre-fix passing case still passes:**
   ```scrml
   ${ const Bar = <div><dd>Static text</dd></div> }
   ```

7. **Match-with-lift via the now-A7-fixed shape:**
   ```scrml
   <div>
     ${ match @step {
       .Confirm => { lift <Foo> }
       else => { }
     } }
   </div>
   ```

### Existing-corpus verification

After fix:
- `examples/05-multi-step-form.scrml` `ConfirmStep` should be re-pluggable into match-with-lift form (currently in if-chain workaround). Verify by reverting that part of the file. (Optional cleanup; note: PreferencesStep is blocked on A8 separately.)
- All 22 example files compile clean (or with their currently-known WARN states).
- Sample-corpus failure count: 23 (post-A5). Post-fix: same or lower.

---

## Pre-snapshot baseline

- **Compiler SHA:** `72e8a7a` (post-A4 + tracker update; main HEAD is at `72e8a7a` after A4 + tracker commit).
- **Test status:** 7906 pass / 40 skip / 0 fail / 378 files.
- **Example state:** ex 05 has both InfoStep (post-A3-fixable) + PreferencesStep (A8-blocked) + ConfirmStep (this fix's blocker).

---

## Risk profile

- **Blast radius:** likely single-file in `ast-builder.js` if it's a `collectExpr` extension. Worst case: tokenizer + ast-builder if BLOCK_REF token handling needs adjustment.
- **Failure modes:**
  - Over-fitting: fix the verified case but miss adjacent shapes. Mitigated by the variation tests above.
  - Regression in non-component-def `${@var}` interpolations (e.g. top-level markup): the existing tests should catch this. If they don't, run the full corpus sweep.
- **Spec alignment:** SPEC §15 (Components) defines components as markup-bound declarations with arbitrary children including text-with-interpolations. The fix aligns parsing with §15 by ensuring this canonical shape registers correctly.
- **Reversibility:** depends on fix scope. Likely small.

---

## Out of scope

- A8 (`<select><option>` children) — separate intake, separate dispatch unless trace reveals shared root cause.
- Refactoring `examples/05-multi-step-form.scrml` to fully revert the if-chain workaround. Optional; not required for the fix to land.
- Other parser shapes that may also fail in component def bodies — track separately if discovered.

---

## References

- Findings tracker: `docs/audits/scope-c-findings-tracker.md` §A7.
- Surfaced by: A3 fix verification (`docs/changes/fix-component-def-text-plus-handler-child/progress.md`).
- Related (same family): `docs/changes/fix-component-def-select-option-children/intake.md` (A8).
- A3 fix that this builds on: `compiler/src/ast-builder.js` `collectExpr` element-nesting (commit `bcd4557`).
- Spec: SPEC.md §15 (Component System), §7 (Logic Contexts — `${expr}` interpolation).

---

## Tags
#bug #parser #ast-builder #component-def #block-ref-interpolation #scope-c #s42 #t2 #post-a3 #needs-trace
