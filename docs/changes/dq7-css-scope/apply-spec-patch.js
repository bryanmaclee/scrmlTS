#!/usr/bin/env bun
// Apply DQ-7 spec patches to compiler/SPEC.md
// Run from scrmlTS root: bun docs/changes/dq7-css-scope/apply-spec-patch.js

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const specPath = join(import.meta.dir, "../../../compiler/SPEC.md");
let spec = readFileSync(specPath, "utf8");

// Patch 1: Add DQ-7 normative statements to §9.1 after the DQ-6 block
const dq6EndMarker = "- Using `#{}` at top level SHALL NOT be a compile error or warning.";
const dq7Statements = `
**Normative statements (DQ-7 — CSS Scoping):**

- \`#{}\` inside a **state type constructor** compiles to a native CSS \`@scope ([data-scrml="ConstructorName"]) to ([data-scrml]) { ... }\` block in the output \`.css\` file. Class names are NOT mangled.
- The constructor's root element SHALL carry the attribute \`data-scrml="ConstructorName"\` in the emitted HTML.
- **Flat-declaration \`#{}\` blocks** (blocks containing only bare \`property: value;\` pairs with no selectors) inside a constructor scope compile to inline \`style="prop: value; ..."\` on the containing element. They do NOT appear in the CSS file.
- **Donut scope** is implicit. The \`@scope\` block uses \`to ([data-scrml])\` as its limit — constructor CSS does not bleed into nested constructors.
- **Program-level \`#{}\` blocks** are emitted as global CSS without any \`@scope\` wrapper. Unchanged from DQ-6.
- **Tailwind utility classes** (§26) live outside \`@scope\` and are NOT affected by this scoping system.
- CSS variable bridge (\`@var\` references in \`#{}\`) continues to work inside \`@scope\` blocks unchanged.`;

if (spec.includes(dq6EndMarker) && !spec.includes("DQ-7 — CSS Scoping")) {
  spec = spec.replace(dq6EndMarker, dq6EndMarker + "\n" + dq7Statements);
  console.log("Patch 1 applied: DQ-7 normative statements added to §9.1");
} else {
  console.log("Patch 1 SKIPPED: marker not found or already applied");
}

// Patch 2: Replace §25.6 Component-Scoped CSS with DQ-7 @scope text
const old256 = `### 25.6 Component-Scoped CSS

The compiler auto-scopes component styles by default. For each component, the compiler SHALL:

1. Assign a unique scope ID to the component.
2. Hash class names used in that component's style blocks.
3. Apply the scoped class selectors to matching elements inside the component automatically.

The developer writes normal class names inside component style blocks. The scoping is invisible.

**Global escape hatches:**
- \`<style global>\` block: styles in this block are not scoped.
- \`.css\` files: styles are not scoped by default.
- Tailwind utility classes are always global (compiler-managed).

**SPEC ISSUE:** Deep selectors (a parent component styling internals of a child component) are tracked in SPEC-ISSUE-006.`;

const new256 = `### 25.6 Constructor-Scoped CSS — Native \`@scope\` (DQ-7)

scrml compiles constructor-level \`#{}\` CSS to native CSS \`@scope\` blocks. Class names are never mangled. The compiled CSS is human-readable and 1:1 with the source CSS.

**Compilation rules:**

1. **Selector-based \`#{}\` inside a constructor** compiles to:
   \`\`\`css
   @scope ([data-scrml="ConstructorName"]) to ([data-scrml]) {
     /* original rules unchanged */
   }
   \`\`\`
   The constructor's root element carries \`data-scrml="ConstructorName"\` in the emitted HTML.

2. **Flat-declaration \`#{}\` blocks** (containing only \`property: value;\` pairs, no selectors) inside a constructor compile to \`style="prop: value;"\` on the containing element. They do not appear in the \`.css\` file.

3. **Program-level \`#{}\` blocks** (not inside any constructor) are emitted as global CSS without wrapping.

4. **Donut scope** is implicit. The \`to ([data-scrml])\` clause in every \`@scope\` block means constructor CSS does not leak into child constructors. No \`:deep()\` escape hatch is needed.

5. **Tailwind utility classes** (§26) are never wrapped in \`@scope\`. They remain globally scoped.

**Example:**

Source:
\`\`\`scrml
< card title(string)>
    #{
        .card { padding: 16px; border: 1px solid #e5e7eb; }
    }
    <div class="card" data-scrml="card">
        <h2>\${title}/
    </div>
/
\`\`\`

Compiled CSS:
\`\`\`css
@scope ([data-scrml="card"]) to ([data-scrml]) {
    .card { padding: 16px; border: 1px solid #e5e7eb; }
}
\`\`\`

**SPEC-ISSUE-006 resolved.** The \`to ([data-scrml])\` donut boundary naturally prevents style leakage into child constructors. No deep-selector syntax is needed.`;

if (spec.includes(old256)) {
  spec = spec.replace(old256, new256);
  console.log("Patch 2 applied: §25.6 replaced with DQ-7 @scope spec text");
} else {
  console.log("Patch 2 SKIPPED: old §25.6 text not found (may already be patched or text differs)");
}

writeFileSync(specPath, spec, "utf8");
console.log("SPEC.md written.");
