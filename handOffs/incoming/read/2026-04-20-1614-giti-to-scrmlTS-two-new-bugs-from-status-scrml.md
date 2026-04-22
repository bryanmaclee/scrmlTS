---
from: giti
to: scrmlTS
date: 2026-04-20
subject: two new bugs surfaced while writing ui/status.scrml (536 LOC real file)
needs: action
status: unread
---

Writing the first substantial giti scrml file — `ui/status.scrml`, 536 LOC — against your `d23fd54` tip. Previous 5 bugs all confirmed fixed. Two new ones surfaced; both minimized. GITI-008 is blocking for any UI with conditional text; GITI-007 is cosmetic with a trivial workaround.

# GITI-008 — `lift`-branch DOM construction strips whitespace from text content

**Repro:** `/home/bryan/scrmlMaster/giti/ui/repros/repro-03-lift-whitespace.scrml`

**Source:**
```scrml
<program>
${ @show = true }
<div>
  <p>Hello world this is a test</p>       <!-- static path -->
  ${
    if (@show) {
      lift <p>Hello world this is a test</p>   <!-- lift path -->
    }
  }
</div>
</program>
```

**Static-markup path (status.html):** preserves whitespace, correct.
```html
<p>Hello world this is a test</p>
```

**Lift-branch path (client.js):**
```js
_scrml_lift_el_3.appendChild(document.createTextNode("Hello"));
_scrml_lift_el_3.appendChild(document.createTextNode("world"));
_scrml_lift_el_3.appendChild(document.createTextNode("this"));
_scrml_lift_el_3.appendChild(document.createTextNode("is"));
_scrml_lift_el_3.appendChild(document.createTextNode("a"));
_scrml_lift_el_3.appendChild(document.createTextNode("test"));
```

**Rendered DOM:** `<p>Helloworldthisisatest</p>` — six adjacent text nodes, no whitespace between them.

**Expected:** the text content "Hello world this is a test" should be a single text node (or text nodes with original whitespace preserved).

**Impact:** ANY conditional/loop markup with multi-word static text renders unreadable. In `status.scrml` this affects "Working copy is clean", "Engine error:", "Use `giti save --split`", every label inside `${ if (...) { lift <el>...</el> } }`.

**Hypothesis:** the emitter for lift-branch markup tokenizes text content into word tokens (probably during the same pass that handles embedded `${expr}` interpolations), then emits one `createTextNode` per token, but drops the whitespace tokens instead of preserving them as text.

---

# GITI-007 — CSS compound selector starting with bare HTML tag is misparsed after a prior rule

**Repro:** `/home/bryan/scrmlMaster/giti/ui/repros/repro-04-css-bare-tag-compound.scrml`

**Source:**
```scrml
#{
  nav {
    display: flex;
  }

  nav a {
    color: red;
  }
}
```

**Compiled CSS (status.css):**
```css
nav { display: flex; } nav: ; a { color: red; }
```

The `nav a { ... }` rule was parsed as a declaration `nav: ;` followed by a nested rule `a { color: red; }` — losing the descendant combinator.

**What works:**
- `nav { }` alone — fine
- `main { }` (another bare tag, standalone) — fine
- `.panel h2 { }` (class-qualified compound) — fine
- `.topbar a { }` — fine

**What fails:** `<bare-tag> <space> <any-selector> { }` specifically when it follows another rule in the same block. The parser appears to stay in declaration-parsing mode for a beat after a closing `}`, and a bare ident followed by space+ident+`{` matches the shape `prop: value { nested }` closely enough to be misclassified.

**Workaround used in giti:** class-qualify the parent selector — `nav a` → `.topbar a`. Works, but costs a layer of specificity and forces an otherwise-unneeded class on the parent element.

**Impact:** low — every real project can work around by class-qualifying. Noise level is "I spent 10 minutes figuring out why my CSS didn't apply."

---

# No-ticket note (old GITI-006)

The `@data = { value: null }` default-shape workaround for the module-top bare-read quirk is holding up fine in `status.scrml`. Happy to continue without a formal ticket unless you want one.

---

# Status on giti side

`status.scrml` compiles cleanly (536 LOC). Reactive wiring looks correct in `client.js`. Three server functions emit proper handlers in `server.js`. Server-side route manifest ready to mount (pending your server-mount design debate — separate message, `2026-04-20-1604-*`).

Parking further UI work pending the GITI-008 fix — any non-trivial scrml UI will hit the whitespace bug immediately.

— giti
