#!/usr/bin/env python3
"""
apply-reflect-hybrid-patches.py
Applies reflect(variable) hybrid spec amendments to compiler/SPEC.md.
Generated: 2026-04-05 — session 51, branch changes/reflect-variable-hybrid
Run from project root: python3 scripts/apply-reflect-hybrid-patches.py

Source: docs/changes/reflect-variable-debate.md (debate result)
        docs/changes/reflect-variable-hybrid/progress.md (spec work log)

Changes applied:
  RH-001  §22.1 Overview — mention unified reflect() API
  RH-002  §22.4.2 (new) — Hybrid reflect() Resolution Algorithm
  RH-003  §22.5.4 worked example — add compiler-dispatch paragraph
  RH-004  §22.8 Phase Separation — replace "distinct APIs" bullet
  RH-005  §22.11 error table — add E-META-008
  RH-006  SPEC.md version header — add amendment reference line
"""

import sys
import os

SPEC_PATH = "compiler/SPEC.md"

if not os.path.exists(SPEC_PATH):
    print(f"Error: {SPEC_PATH} not found. Run from project root.")
    sys.exit(1)

with open(SPEC_PATH, "r", encoding="utf-8") as f:
    content = f.read()

original_content = content
change_count = 0


def apply(label, old, new):
    global content, change_count
    if old not in content:
        print(f"  MISS  {label}: old text not found in SPEC.md")
        print(f"        Expected snippet: {repr(old[:80])}")
        return
    count = content.count(old)
    if count > 1:
        print(f"  WARN  {label}: old text appears {count} times — applying first occurrence only")
    content = content.replace(old, new, 1)
    change_count += 1
    print(f"  OK    {label}")


# ================================================================
# RH-001: §22.1 Overview — add unified reflect() mention
# ================================================================

apply(
    "RH-001 §22.1 Overview",
    "scrml supports metaprogramming through the `^{}` meta context. The meta context provides a\n"
    "universal breakout mechanism that captures and exposes all bindings from the breakout point.\n"
    "Meta contexts enable compile-time code generation, runtime DOM inspection, and runtime\n"
    "reactive effects with type introspection.\n"
    "\n"
    "Meta blocks are classified as either compile-time or runtime by the compiler's meta-checker\n"
    "pass. The classification determines which capabilities are available and what code is emitted.",
    "scrml supports metaprogramming through the `^{}` meta context. The meta context provides a\n"
    "universal breakout mechanism that captures and exposes all bindings from the breakout point.\n"
    "Meta contexts enable compile-time code generation, runtime DOM inspection, and runtime\n"
    "reactive effects with type introspection.\n"
    "\n"
    "Type reflection is exposed through the single `reflect()` call, which accepts either a\n"
    "compile-time-constant type name or a runtime variable holding a type name. The compiler\n"
    "selects the appropriate resolution strategy automatically (§22.4.2). Programmers always write\n"
    "`reflect(expr)` regardless of whether the argument is statically known.\n"
    "\n"
    "Meta blocks are classified as either compile-time or runtime by the compiler's meta-checker\n"
    "pass. The classification determines which capabilities are available and what code is emitted."
)


# ================================================================
# RH-002: §22.4.2 (new) — Hybrid reflect() Resolution Algorithm
# Inserted after §22.4.1 interaction notes, before ### 22.5 Runtime Meta
# ================================================================

NEW_22_4_2 = """
#### 22.4.2 Hybrid `reflect()` Resolution Algorithm

`reflect()` is the single, unified API for type reflection in scrml. The programmer always
writes `reflect(expr)` regardless of whether the argument is known at compile time or only at
runtime. The compiler resolves which strategy to use based on the nature of the argument.

**The two resolution strategies:**

| Argument kind | Compiler strategy | Cost |
|---|---|---|
| Compile-time constant (`reflect(User)` or `reflect("User")` where `"User"` is a literal) | Direct registry lookup inlined at compile time | Zero runtime cost |
| Runtime variable (`reflect(typeName)` where `typeName` is a `let`, `const`, or `@var` binding) | `meta.types.reflect(typeName)` call emitted; type registry passed as fourth arg to `_scrml_meta_effect` | One hash-table lookup per call |

**Resolution algorithm (normative):**

Given a call `reflect(expr)` inside a `^{}` block:

1. If `expr` is a type-name literal (an unquoted identifier that resolves to a known type,
   e.g., `reflect(User)`) or a string literal that exactly matches a known type name
   (e.g., `reflect("User")`), the compiler SHALL resolve it at compile time and inline the
   type entry. This is the compile-time path.
2. If `expr` is a variable reference (a `let`, `const`, `lin`, or `@var` binding), the
   compiler SHALL emit `meta.types.reflect(expr)` in the compiled output and include all
   types that are in scope at the breakout point in the runtime type registry. This is the
   runtime path.
3. If `expr` is any other expression (property access, function call, ternary, template
   literal, etc.), the compiler SHALL treat it as a runtime path expression (strategy 2).
4. A `reflect(expr)` call that appears outside any `^{}` block SHALL be a compile error
   (E-META-008).

**Normative statements:**

- The compiler SHALL accept `reflect(expr)` as the single canonical reflect call form at all
  `^{}` call sites. The programmer SHALL NOT be required to choose between `reflect()` and
  `meta.types.reflect()` based on whether the argument is static or dynamic.
- When `reflect(expr)` resolves via the compile-time path (strategy 1), the compiler SHALL
  inline the type entry as a compile-time value. No `meta.types` lookup is emitted.
- When `reflect(expr)` resolves via the runtime path (strategy 2 or 3), the compiler SHALL
  emit `meta.types.reflect(<compiledExpr>)` in the compiled JavaScript output.
- The compiler SHALL NOT require the `^{}` block to be classified as compile-time merely
  because it contains a compile-time-path `reflect()` call. A block that also references
  runtime values is a runtime block; its `reflect()` calls that happen to have literal
  arguments are still emitted as `meta.types.reflect(...)` calls in the runtime block output.
  The inlining optimization (strategy 1) applies only when the ENTIRE block is compile-time.
- `reflect(unknownLiteral)` where the literal does not match any known type name SHALL be a
  compile error (E-META-003: reflect() called on unknown type).
- `reflect(variable)` where `variable` could hold an unknown type name at runtime SHALL
  return `not` (the scrml absence value, §42) at runtime. The runtime path SHALL NOT throw.
- `meta.types.reflect()` remains available as a lower-level escape hatch for programmers
  who need to explicitly force runtime dispatch. It is not the canonical form.

**Worked example — compile-time path (literal argument):**

```scrml
type User:struct = {
  name: string
  age:  number
}

^{
  const info = reflect(User)
  emit(`<p>Type has ${info.fields.length} fields</p>`)
}
```

The argument `User` is a type-name literal. The compiler resolves at compile time. No type
registry is emitted for this block. Emitted (simplified):

```javascript
// No _scrml_meta_effect — compile-time block, result inlined
document.body.insertAdjacentHTML("beforeend", "<p>Type has 2 fields</p>");
```

**Worked example — runtime path (variable argument):**

```scrml
type User:struct = {
  name: string
  age:  number
}

@selectedType = "User"

^{
  const info = reflect(@selectedType)
  if info is not {
    meta.emit("<p>Unknown type</p>")
  } else {
    meta.emit(`<p>${info.fields.length} fields</p>`)
  }
}
```

The argument `@selectedType` is a runtime variable. The compiler emits the runtime path.
Emitted (simplified):

```javascript
const _scrml_types_meta_1 = {
  User: { kind: "struct", fields: [{ name: "name", type: "string" }, { name: "age", type: "number" }] }
};

_scrml_meta_effect(
  "_scrml_meta_1",
  function(meta) {
    const info = meta.types.reflect(meta.get("_scrml_s_selectedType"));
    if (info === _scrml_not) {
      meta.emit("<p>Unknown type</p>");
    } else {
      meta.emit(`<p>${info.fields.length} fields</p>`);
    }
  },
  Object.freeze({ get selectedType() { return _scrml_reactive_get("_scrml_s_selectedType"); } }),
  _scrml_types_meta_1
);
```

**Worked example — invalid (outside `^{}`):**

```scrml
const info = reflect(User)   // Error: reflect() outside ^{} block
```

Compiler error E-META-008: `reflect()` is only valid inside a `^{}` meta block.

"""

apply(
    "RH-002 §22.4.2 new section",
    "  layer (`reparseEmitted()` in meta-eval.ts).\n"
    "\n"
    "### 22.5 Runtime Meta",
    "  layer (`reparseEmitted()` in meta-eval.ts).\n"
    + NEW_22_4_2
    + "### 22.5 Runtime Meta"
)


# ================================================================
# RH-003: §22.5.4 — add compiler-dispatch paragraph to worked example note
# Insert after the existing worked example's emitted JS block, before §22.5.5
# ================================================================

apply(
    "RH-003 §22.5.4 worked example dispatch note",
    "  _scrml_typeRegistry_meta1\n"
    ");\n"
    "```\n"
    "\n"
    "#### 22.5.5 Reactive Dependency Tracking and `meta.bindings`",
    "  _scrml_typeRegistry_meta1\n"
    ");\n"
    "```\n"
    "\n"
    "**Note on programmer-facing API:** The scrml source above uses `meta.types.reflect(...)` to\n"
    "show the emitted form explicitly. In normal scrml source, programmers write `reflect(expr)`\n"
    "(§22.4.2) and the compiler emits `meta.types.reflect(...)` automatically for variable\n"
    "arguments. Programmers never write `meta.types.reflect()` directly; that is the compiled\n"
    "output form, not the source form.\n"
    "\n"
    "#### 22.5.5 Reactive Dependency Tracking and `meta.bindings`"
)


# ================================================================
# RH-004: §22.8 Phase Separation — update "distinct APIs" bullet
# ================================================================

apply(
    "RH-004 §22.8 distinct-APIs bullet",
    "- `meta.types.reflect()` (runtime) and `reflect()` (compile-time) are distinct APIs.\n"
    "  `meta.types.reflect()` is valid only in runtime meta; `reflect()` is valid only in\n"
    "  compile-time meta.",
    "- `reflect(expr)` is the single programmer-facing API for type reflection. The compiler\n"
    "  resolves `reflect(expr)` to either a compile-time inline (when `expr` is a literal) or a\n"
    "  `meta.types.reflect(expr)` call (when `expr` is a runtime variable), per §22.4.2.\n"
    "  Programmers SHALL NOT be required to choose between `reflect()` and `meta.types.reflect()`\n"
    "  at the call site; the compiler makes that choice.\n"
    "- `meta.types.reflect()` remains accessible as a low-level escape hatch for explicit runtime\n"
    "  dispatch. Its direct use in scrml source is not prohibited but is not the canonical form."
)


# ================================================================
# RH-005: §22.11 error table — add E-META-008
# ================================================================

apply(
    "RH-005 §22.11 E-META-008",
    "| E-META-007 | `?{}` SQL context inside a runtime `^{}` block | Error |",
    "| E-META-007 | `?{}` SQL context inside a runtime `^{}` block | Error |\n"
    "| E-META-008 | `reflect()` called outside any `^{}` meta block | Error |"
)


# ================================================================
# RH-006: SPEC.md version header — add amendment reference
# ================================================================

apply(
    "RH-006 SPEC.md header amendment note",
    "> **Amendments applied:** 2026-04-03 — see `docs/changes/spec-s37-amendments/spec-amendments.md` for full rationale. S37-AM-001 through S37-AM-008.",
    "> **Amendments applied:** 2026-04-03 — see `docs/changes/spec-s37-amendments/spec-amendments.md` for full rationale. S37-AM-001 through S37-AM-008.\n"
    "> **Amendments applied:** 2026-04-05 — see `docs/spec-issues/SPEC-AMENDMENTS-2026-04-05.md` for full rationale. RH-001 through RH-006 (reflect(variable) hybrid API)."
)


# ================================================================
# Write output
# ================================================================

if content == original_content:
    print("\nNo changes made — all patches missed. Check SPEC.md for expected text.")
    sys.exit(1)

with open(SPEC_PATH, "w", encoding="utf-8") as f:
    f.write(content)

print(f"\n{change_count} patch(es) applied successfully to {SPEC_PATH}.")
if change_count < 6:
    print(f"WARNING: Expected 6 patches but only {change_count} applied. Review MISS lines above.")
