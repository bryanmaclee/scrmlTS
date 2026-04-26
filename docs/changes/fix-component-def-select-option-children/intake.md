# fix-component-def-select-option-children — Intake (Scope C finding A8)

**Surfaced:** 2026-04-25 (S42), by A3's bonus-signal verification (commit `bcd4557`'s post-fix trace).
**Status:** SCOPED, awaiting authorization to dispatch.
**Tracker entry:** `docs/audits/scope-c-findings-tracker.md` §A8.
**Tier:** **T2** (parser-level — same family as A3; likely shares infrastructure with A7).
**Priority:** medium — blocks form-shaped components. `<form>` with `<select>` is a common pattern; can't be wrapped in a component until this lands.
**Likely related:** A7 (`${@reactive}` BLOCK_REF interpolation in component def). May resolve as part of A7's investigation if root cause is shared.

---

## Symptom

A component definition whose body contains `<select><option>` children (or possibly other void/special HTML element pairings combined with `bind:value=@x` attributes) still fails to register in the component registry post-A3 fix (`bcd4557`). Reference produces E-COMPONENT-020.

A3 fixed the `<wrapper>{text}+<elem with onclick=>` shape (collectExpr angle-tracker switched to element-nesting). But components with `<select bind:value=@theme>` containing `<option>` children hit a different parser failure.

### Verified case (extracted from `examples/05-multi-step-form.scrml` PreferencesStep)

`PreferencesStep` body:

```scrml
const PreferencesStep = <div class="step">
  <h2>Preferences</>
  <label>
    Theme:
    <select bind:value=@theme>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
      <option value="system">System</option>
    </select>
  </label>
  <label class="checkbox-label">
    <input type="checkbox" bind:value=@newsletter>
    Subscribe to newsletter
  </label>
  <div class="step-nav">
    <button onclick=back()>Back</button>
    <button onclick=next()>Next</button>
  </div>
</div>
```

Reference via `<PreferencesStep/>` (or via match-with-lift) → E-COMPONENT-020.

A3-trace agent confirmed this fails post-A3 fix. Different parser shape than InfoStep (text + handler-child) and ConfirmStep (block-ref interpolation).

### Hypothesis (pending bisect)

**Multiple candidate triggers in PreferencesStep body:**

1. `<select bind:value=@theme>` — `bind:value=@x` attribute syntax may interact with the angle-tracker differently than `onclick=fn()`
2. `<option>` children — `<option>` is technically a void/permissive element in HTML, may interact with the def's child-counting
3. `<input type="checkbox" bind:value=@newsletter>` (no closer) — self-closing void element may confuse element-nesting depth

The dispatch agent must bisect to identify which is the actual trigger. May be more than one.

### Repro candidates (proposed minimal — needs validation)

```scrml
<program>
${ @theme = "light" }

${
  const Foo = <div>
    <select bind:value=@theme>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  </div>
}

<div><Foo/></div>
</program>
```

Or simpler (testing just `bind:value=@x`):

```scrml
${ const Foo = <div><input bind:value=@x/></div> }
```

Or testing just `<option>`:

```scrml
${ const Foo = <div><select><option>x</option></select></div> }
```

The dispatch agent should run all three and isolate the trigger.

---

## Source location candidates (need trace)

Same family as A3 + A7. The relevant code paths:

- `compiler/src/ast-builder.js` `collectExpr` — A3 added element-nesting logic. May need extension for `bind:value=@x` attributes or void-element handling.
- `compiler/src/html-elements.js` — defines element classification (void/permissive). May need a check.
- `compiler/src/tokenizer.ts` — if `bind:value=@x` tokenizes differently in def-collection paths.

### Investigation steps (mandatory before fix)

1. Run the three repro candidates above. Document which fail.
2. For each failing case, trace the def's `raw` and the registry-build path (same pattern as A3's trace).
3. Compare with the A7 (BLOCK_REF interpolation) findings — if A7 is dispatched first, its investigation may reveal shared root cause.

Document trace findings in `progress.md`.

---

## Fix approach (deferred — pending trace)

Same pattern as A7: trace first, fix second.

**Coordination note:** if A7 + A8 are dispatched separately, the A7 agent's trace may reveal that A8 shares the same root cause. In that case, A7's fix may resolve A8 incidentally. The A8 dispatch should:

1. Verify A7's fix is in place (if A7 has landed)
2. Re-run the bisect — if A8's verified case now passes post-A7, A8 is incidentally fixed and only needs regression tests + a tracker update.
3. If A8's case still fails post-A7, trace + fix as a separate change.

---

## Test plan

### Existing tests that must continue to pass

- All A3 + A7 regression tests
- All 22 example files compile (modulo known WARN states)
- Full test suite

### New regression tests

Add to `compiler/tests/unit/component-def-select-option-children.test.js`:

1. **Verified bisected trigger (full PreferencesStep shape):**
   ```scrml
   ${ const Foo = <div>
     <select bind:value=@theme>
       <option value="light">Light</option>
       <option value="dark">Dark</option>
     </select>
   </div> }
   <Foo/>
   ```

2. **Just `<select><option>` (no bind:):**
   ```scrml
   ${ const Foo = <div><select><option>x</option></select></div> }
   ```

3. **Just `bind:value=@x` (no select):**
   ```scrml
   ${ @x = "" }
   ${ const Foo = <div><input bind:value=@x/></div> }
   ```

4. **Self-closing void element + bind:**
   ```scrml
   ${ const Foo = <div><input type="checkbox" bind:value=@flag/></div> }
   ```

5. **Sanity — non-component context still works:**
   ```scrml
   <select bind:value=@theme>
     <option value="light">Light</option>
   </select>
   ```
   (This must continue to compile clean both pre- and post-fix; the bug is component-def-specific.)

### Existing-corpus verification

After fix:
- `examples/05-multi-step-form.scrml` `PreferencesStep` should be re-pluggable into match-with-lift form (currently in if-chain workaround). Verify.
- All 22 example files compile clean.
- Sample-corpus failure count: stable or lower.

---

## Pre-snapshot baseline

- **Compiler SHA:** `72e8a7a` (post-A4 + tracker update). Same as A7's pre-snapshot.
- **Test status:** 7906 pass / 40 skip / 0 fail / 378 files.

---

## Risk profile

- **Blast radius:** likely single-file (`ast-builder.js`) if it's a `collectExpr` extension. Possibly multi-file if `html-elements.js` void-element handling needs adjustment.
- **Failure modes:**
  - Same as A3/A7 family — over-fitting on the verified shape, missing adjacent.
  - `bind:value=@x` is a syntax feature used everywhere; any change to its tokenization risks broad regressions. Mitigate via full corpus sweep.
- **Spec alignment:** SPEC §5 (Attribute Quoting) defines `bind:value=@x` semantics. SPEC §15 (Components) allows arbitrary HTML children including form controls. Fix aligns parsing with both.
- **Reversibility:** depends on fix scope.

---

## Out of scope

- A7 (BLOCK_REF interpolation) — separate intake unless trace reveals shared root cause.
- Other parser shapes in component-def bodies — track separately if discovered.

---

## References

- Findings tracker: `docs/audits/scope-c-findings-tracker.md` §A8.
- Surfaced by: A3 fix verification (`docs/changes/fix-component-def-text-plus-handler-child/progress.md`).
- Related (same family): `docs/changes/fix-component-def-block-ref-interpolation-in-body/intake.md` (A7).
- A3 fix that this builds on: `compiler/src/ast-builder.js` `collectExpr` element-nesting (commit `bcd4557`).
- Spec: SPEC.md §15 (Components), §5 (Attributes — `bind:value=@x`).

---

## Tags
#bug #parser #ast-builder #component-def #select-option #bind-value #scope-c #s42 #t2 #post-a3 #needs-trace
