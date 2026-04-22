# S37 — 6nz Bug Batch Independent Verification

**Date:** 2026-04-22
**Source:** `handOffs/incoming/read/2026-04-21-1010-6nz-to-scrmlTS-cm6-probe-findings-and-bug-batch.md` §4
**Verification baseline:** tip `ccae1f6`
**Protocol:** verify-before-fix standing rule — PA compiles repros independently, compares to spec + expected JS shape.

---

## Summary

| # | 6nz claim | Verdict | Severity |
|---|---|---|---|
| 1 | `"foo\nbar"` → literal `\\n`, not LF | ✅ **CONFIRMED** | **HIGH** (pervasive — leaks into other bug reports too) |
| 2 | `const @derived = A?B:C` drops arms | ❌ **NOT REPRODUCED** (arms emit correctly; likely misdiagnosed #4) | — |
| 3 | `return X+y` after `const y=A?B:C` dropped | ❌ **NOT REPRODUCED** (plain `function` + `fn` both clean) | — |
| 4 | `${@derivedReactive}` in markup gets no DOM wiring | ✅ **CONFIRMED** | **HIGH** |
| 5 | `for-lift` in markup renders once, doesn't re-render | ⚠️ **STATIC EMIT OK** — `_scrml_effect` wraps the loop; runtime behavior uncertain without browser test | medium (pending behavioral confirm) |
| 6 | `^{}` meta block over-captures function-local names | ✅ **CONFIRMED** | **HIGH** (ReferenceError on mount) |

**Net:** 3 confirmed, 2 not reproduced, 1 partial. Bug 1 is pervasive — appears in bug-2 and bug-6 outputs too.

---

## Bug 1 — string literal `\n` preservation — CONFIRMED

**Repro:** `const s = "a\nb"`
**Emitted JS:** `const s = "a\\nb";` — backslash doubled
**Expected:** `const s = "a\nb";` — JS-native `\n` escape preserved
**Runtime consequence:** `s.length === 4` (a, \, n, b) instead of 3 (a, LF, b). Any string containing `\n`, `\t`, `\r`, etc. is broken.
**Workaround:** `String.fromCharCode(10)` — loses readability.
**Root cause suspect:** tokenizer or string-literal emit path is re-escaping backslash sequences during output.

Spread evidence: the same bug emits `"\\n"` inside bug-2 and bug-6 outputs too (`_scrml_reactive_set("ch", "\\n")`, `const nl = "\\n"`).

**Legit.** High priority because string literals are foundational.

---

## Bug 2 — ternary on derived-reactive — NOT REPRODUCED

**Repro:** `const @g = @ch.charCodeAt(0) == 10 ? " " : @ch`
**Emitted JS:**
```js
_scrml_derived_declare("g", () => _scrml_structural_eq(_scrml_reactive_get("ch").charCodeAt(0), 10) ? " " : _scrml_reactive_get("ch"));
```
Both arms present. Condition, consequent, alternative — all emitted.

**However** — the `${@g}` in markup gets NO DOM wiring in the emitted `DOMContentLoaded` block (just a comment `// --- Reactive display wiring ---` with nothing under it). This is bug 4, not bug 2. 6nz's observation "@g always ended up empty" is likely a consequence of bug 4: the markup span was never subscribed to @g, so it stayed at initial empty value.

**Not a separate bug.** Fold into bug 4.

---

## Bug 3 — return after ternary const dropped — NOT REPRODUCED

**Repro (plain function — 6nz's exact form):**
```scrml
function f(pos: int) {
    const col = pos > 0 ? pos - 1 : 0
    return 100 + col
}
```

**Emitted JS:**
```js
function _scrml_f_3(pos) {
  const col = pos > 0 ? pos - 1 : 0;
  return 100 + col;
}
```

Both statements present. `const` + `return` both emitted correctly. No dropping.

**Also tested with `fn` shorthand:** same result — both statements present.

**Possible reasons 6nz saw this:**
- Their exact source referenced `prevStart` (outer-scope variable) — might be a scope-capture or mangling bug rather than a statement-drop bug.
- An older compiler version before my S37 work landed.
- Specific to the surrounding context in `playground-two/app.scrml:85-94` (`moveUp` — noted as uses `Math.min` workaround).

**Recommendation:** ask 6nz for exact repro WITH the `prevStart` reference; if it then reproduces, it's a different bug (scope capture), not statement-drop.

---

## Bug 4 — `${@derivedReactive}` in markup — CONFIRMED

**Repro:**
```scrml
${
    @mode: Mode = Mode.Insert
    const @isInsert = @mode == Mode.Insert
}
<p>direct: ${@mode == Mode.Insert}</p>
<p>named derived: ${@isInsert}</p>
```

**Emitted DOM wiring (DOMContentLoaded block):**
```js
// --- Reactive display wiring ---
{
  const el = document.querySelector('[data-scrml-logic="_scrml_logic_2"]');
  if (el) {
    el.textContent = _scrml_structural_eq(_scrml_reactive_get("mode"), Mode.Insert);
    _scrml_effect(function() { el.textContent = _scrml_structural_eq(_scrml_reactive_get("mode"), Mode.Insert); });
  }
}
```

Only ONE wiring block — for the DIRECT expression `${@mode == Mode.Insert}`. The NAMED derived reference `${@isInsert}` has no wiring emitted at all. The second `<p>` will render once (at initial text emission) and never update.

**Legit.** High priority — breaks a core reactive idiom.

**Suspected root cause:** markup display-wiring emitter identifies `@` direct references + inline expressions, but misses derived-reactive name references. The derived was `_scrml_derived_declare`'d but never subscribed by any markup target.

---

## Bug 5 — for-lift in markup doesn't re-render — STATIC EMIT LOOKS CORRECT

**Repro:**
```scrml
<ol>
    ${
        for (let line of @log) {
            lift <li>${line}</li>
        }
    }
</ol>
```

**Emitted JS:**
```js
_scrml_effect(function() {
  _scrml_lift_target = _scrml_lift_tgt_8;
  const _scrml_list_wrapper_3 = document.createElement("div");
  _scrml_lift(_scrml_list_wrapper_3);
  function _scrml_create_item_5(line, _scrml_idx) { /* creates <li> */ }
  function _scrml_render_list_4() {
    _scrml_reconcile_list(_scrml_list_wrapper_3, _scrml_reactive_get("log"), ...);
  }
  ...
});
```

The for-lift IS wrapped in `_scrml_effect`, and `_scrml_reactive_get("log")` appears inside. If `_scrml_effect` correctly tracks dependencies, it should re-run on `@log` mutation and re-reconcile.

**Possible runtime-level bugs:**
- `_scrml_reactive_get` inside `_scrml_reconcile_list`'s callback might not be registered as a dep (escaped through closure boundary)
- `_scrml_reactive_get` on an array MAY return the same reference (`_scrml_deep_reactive(...)`) so the effect's equality check thinks nothing changed
- Push/shift on the deep-reactive array might not notify the effect

**Recommendation:** needs a runtime behavioral test (Puppeteer) to confirm whether the effect re-fires on `@log` mutation. 6nz says it doesn't — I trust their browser evidence, but the static emit doesn't immediately reveal the wiring gap. Root cause likely in the reactive runtime, not the emitter.

---

## Bug 6 — `^{}` meta over-captures — CONFIRMED

**Repro:**
```scrml
${
    function loadExternal() {
        const host = document.body
        const nl = "\n"
        const doc = "hello"
        host.appendChild(document.createTextNode(doc + nl))
    }
    ^{ loadExternal() }
}
```

**Emitted JS:**
```js
_scrml_meta_effect("_scrml_meta_8", function(meta) {
  _scrml_loadExternal_2();
}, Object.freeze({
  loadExternal: _scrml_loadExternal_2,
  host: host,       // undefined at module scope
  nl: nl,           // undefined at module scope
  doc: doc          // undefined at module scope
}), null);
```

The `Object.freeze({ ... })` captured-env references `host`, `nl`, `doc` at module scope. Those names exist ONLY inside `loadExternal`'s local scope — they will throw `ReferenceError: host is not defined` when the freeze evaluates.

**Legit.** High priority — bricks the `^{}` feature whenever any body contains a function with `const`/`let` bindings sharing names that might be "captured."

**Suspected root cause:** env-capture analyzer for `^{}` walks the meta body's expression references and pulls every identifier it sees that's NOT a global, but it's crossing function boundaries instead of respecting scope.

---

## Recommended actions

**Priority 1 — fix in order:**
1. **Bug 1** (string escape) — foundational, leaks into every other repro. Single fix likely benefits multiple other bug reports.
2. **Bug 6** (^{} over-capture) — hard error at runtime, bricks the feature. No good workaround (6nz notes the fallback hits E-DG-002 warning).
3. **Bug 4** (derived-reactive in markup wiring) — no wiring emitted = silent render bug. Breaks reactive idiom.

**Priority 2 — investigate:**
4. **Bug 5** — browser smoke test needed. Static emit is correct; issue is runtime. May share root cause with bug 4.
5. **Bug 3** — ask 6nz for exact repro including `prevStart` outer-scope ref. If it reproduces there, it's a scope-capture bug, distinct from the "statement dropped" framing.

**Priority 3 — dismiss:**
6. **Bug 2** — misdiagnosis. Ternary arms emit correctly; the "empty branches" observation was caused by bug 4 (no wiring on `${@g}` reference).

**Anti-pattern check:** none of 6nz's source uses React/Vue/JSX syntax. All bugs are on legitimate scrml grammar per spec. No BRIEFING-ANTI-PATTERNS.md violations.

---

## Files used in verification

- `/tmp/bug-verify/b1.scrml` through `b6.scrml` — minimal repros
- `/tmp/bug-verify/dist/*.client.js` — emitted output for inspection
- `/home/bryan/scrmlMaster/scrmlTS/handOffs/incoming/read/2026-04-21-1010-6nz-to-scrmlTS-cm6-probe-findings-and-bug-batch.md` — source of claims
