# SPEC.md Patch — DQ-7 CSS @scope

## Patch 1: §9.1 Inline CSS Context (line 4734–4739)

Add the following after the existing DQ-6 normative statements block:

**After line 4739** (after `- Using \`#{}\` at top level SHALL NOT be a compile error or warning.`), insert:

```
**Normative statements (DQ-7 — CSS Scoping):**

- `#{}` inside a **state type constructor** (a named `< Type>` definition) compiles to a native CSS `@scope ([data-scrml="ConstructorName"]) { ... }` block in the output `.css` file. Class names are NOT mangled.
- The constructor's root element SHALL carry the attribute `data-scrml="ConstructorName"` in the emitted HTML. This attribute is the `@scope` root selector.
- **Flat-declaration `#{}` blocks** (blocks containing only bare `property: value;` pairs with no selectors) inside a constructor scope compile to inline `style="prop: value; ..."` on the containing element. They do NOT appear in the CSS file.
- **Donut scope** is implicit. The `@scope` block uses `to ([data-scrml])` as its limit, so constructor CSS does not bleed into nested constructors that carry their own `[data-scrml]` attribute.
- **Program-level `#{}` blocks** (not inside any constructor) are emitted as global CSS without any `@scope` wrapper. This is unchanged from DQ-6.
- **Tailwind utility classes** (§26) live outside `@scope` and are NOT affected by this scoping system.
- CSS variable bridge (`@var` references in `#{}` — §25) continues to work inside `@scope` blocks unchanged.
```

## Patch 2: §25.6 Component-Scoped CSS (lines 11369–11385)

**Replace the entire §25.6 section** (lines 11369–11385) with:

```markdown
### 25.6 Constructor-Scoped CSS — Native `@scope` (DQ-7)

scrml compiles constructor-level `#{}` CSS to native CSS `@scope` blocks. Class names are never mangled. The compiled CSS is human-readable and 1:1 with the source CSS.

**Compilation rules:**

1. **Selector-based `#{}` inside a constructor** compiles to:
   ```css
   @scope ([data-scrml="ConstructorName"]) to ([data-scrml]) {
     /* original rules unchanged */
   }
   ```
   The constructor's root element carries `data-scrml="ConstructorName"` in the emitted HTML.

2. **Flat-declaration `#{}` blocks** (containing only `property: value;` pairs, no selectors) inside a constructor compile to `style="prop: value;"` on the containing element. They do not appear in the `.css` file.

3. **Program-level `#{}` blocks** (not inside any constructor) are emitted as global CSS without wrapping.

4. **Donut scope** is implicit. The `to ([data-scrml])` clause in every `@scope` block means constructor CSS does not leak into child constructors. No `:deep()` escape hatch is needed.

5. **Tailwind utility classes** (§26) are never wrapped in `@scope`. They remain globally scoped.

**Developer experience:** The developer writes `.card`, compiled CSS says `.card`. Source maps are optional for CSS debugging. DevTools shows the actual CSS the developer wrote.

**Example:**

```scrml
< card title(string)>
    #{
        .card { padding: 16px; border: 1px solid #e5e7eb; }
    }
    #{ color: #111; }  // flat-declaration → becomes style="" on root element
    <div class="card">
        <h2>${title}/
    </div>
/
```

Compiled CSS:
```css
@scope ([data-scrml="card"]) to ([data-scrml]) {
    .card { padding: 16px; border: 1px solid #e5e7eb; }
}
```

Compiled HTML (root element):
```html
<div data-scrml="card" style="color: #111;" class="card">
```

**SPEC-ISSUE-006 (deep selectors):** Resolved. The `@scope ... to ([data-scrml])` donut boundary naturally prevents style leakage into child constructors. No explicit deep selector syntax is needed.
```

## How to apply

These are additive changes to SPEC.md. The code changes are already live (emit-css.ts, emit-html.ts).

To apply Patch 1: insert after line 4739 of compiler/SPEC.md.
To apply Patch 2: replace lines 11369-11385 of compiler/SPEC.md with the new text.
