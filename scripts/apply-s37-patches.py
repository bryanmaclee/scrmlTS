#!/usr/bin/env python3
"""
apply-s37-patches.py
Applies S37 spec amendments to compiler/SPEC.md.
Generated: 2026-04-03
Run from project root: python3 scripts/apply-s37-patches.py

This script makes targeted, context-aware substitutions to SPEC.md.
"""

import re
import sys
import os

SPEC_PATH = "compiler/SPEC.md"

if not os.path.exists(SPEC_PATH):
    print(f"Error: {SPEC_PATH} not found. Run from project root.")
    sys.exit(1)

with open(SPEC_PATH, "r", encoding="utf-8") as f:
    content = f.read()

original_content = content

# ================================================================
# HELPER: line-by-line processing for context-aware changes
# ================================================================

lines = content.split("\n")
new_lines = []
in_match_block = False
in_error_arm_context = False  # !{} error arm context
brace_depth = 0

# We'll do two passes:
# Pass 1: Text substitutions that are safe globally
# Pass 2: Context-aware match arm -> => substitution

# ================================================================
# PASS 1: Global text substitutions (safe everywhere)
# ================================================================

# --- S37-AM-001: :: -> . for enum variant access ---

# §14.5 enum expression syntax
content = content.replace(
    "- Fully qualified: `Direction::North`",
    "- Fully qualified: `Direction.North`"
)
content = content.replace(
    "- Shorthand (when type is inferred from context): `::North`",
    "- Shorthand (when type is inferred from context): `.North`"
)
content = content.replace(
    "- The `::` sigil is reserved for enum variant access. It is distinct from `.` (property access) and `:` (type annotation).",
    """- Enum variant access uses `.` (dot notation). In fully qualified form `TypeName.VariantName`, the
  `.` separates the type name from the variant name. This is a distinct syntactic production from
  property access (§5) — the compiler disambiguates by whether the left-hand side resolves to an
  enum type. The shorthand form `.VariantName` is valid only where the enum type is inferable from
  context (e.g., inside a match arm for a known enum type, or in an assignment where the target has
  a declared enum type).
- The `::` sigil is NOT valid for enum variant access. Any `TypeName::VariantName` expression in
  scrml source SHALL be a compile error (E-TYPE-060: use `.` for enum variant access, not `::`).

**Normative statements:**

- A fully qualified enum variant SHALL be written `TypeName.VariantName`. The compiler SHALL
  resolve the `.` as variant access when the left-hand operand is an enum type name.
- A shorthand variant reference SHALL be written `.VariantName` and SHALL be valid only in
  positions where the enum type is determinable from context. A shorthand variant reference in a
  position where the type cannot be inferred SHALL be a compile error (E-TYPE-061: cannot infer
  enum type for shorthand variant `.VariantName`).
- `TypeName::VariantName` SHALL be a compile error (E-TYPE-060). The error message SHALL say:
  "Enum variant access uses `.` not `::`. Did you mean `TypeName.VariantName`?\""""
)

# §14.6 update default arm reference
content = content.replace(
    "- A `_` arm is a valid default arm.",
    "- An `else` arm is a valid default arm."
)

# §20 navigation enum variants
content = content.replace("navigate(path, ::Hard)", "navigate(path, .Hard)")
content = content.replace("navigate(path, ::Soft)", "navigate(path, .Soft)")
content = content.replace("`::Hard` and `::Soft`", "`.Hard` and `.Soft`")
content = content.replace("Calling `navigate(path, ::Hard)`", "Calling `navigate(path, .Hard)`")

# §18.8.1 exhaustiveness text
content = content.replace(
    "OR when a `_` wildcard arm is present.",
    "OR when an `else` arm is present."
)
content = content.replace(
    "`V ⊆ A` or `_` is\npresent.",
    "`V ⊆ A` or `else` is\npresent."
)
content = content.replace(
    "match `A = {::V1, ::V3, ...}`, the match is exhaustive if and only if `V ⊆ A` or `_` is",
    "match `A = {.V1, .V3, ...}`, the match is exhaustive if and only if `V ⊆ A` or `else` is"
)
content = content.replace(
    "- A `_` arm covers all remaining variants for the purpose of exhaustiveness.",
    "- An `else` arm covers all remaining variants for the purpose of exhaustiveness."
)
content = content.replace(
    "covered by explicit arms or by a `_` arm.",
    "covered by explicit arms or by an `else` arm."
)

# §18.8.2 nullable match
content = content.replace(
    "use `::Some(value)` /\n`::None` when the union contains `null` (nullable match).",
    "use `.Some(value)` /\n`.None` when the union contains `null` (nullable match)."
)
content = content.replace(
    "- `::Some(value)` matches the non-null case and binds the unwrapped value as `value` with",
    "- `.Some(value)` matches the non-null case and binds the unwrapped value as `value` with"
)
content = content.replace(
    "- `::None` matches the `null` case.",
    "- `.None` matches the `null` case."
)
content = content.replace(
    "For a nullable type `T | null`, `::Some(value)` and `::None` are the valid arm patterns.",
    "For a nullable type `T | null`, `.Some(value)` and `.None` are the valid arm patterns."
)
content = content.replace(
    "The bound variable in `::Some(value)` has type `T`.",
    "The bound variable in `.Some(value)` has type `T`."
)
content = content.replace(
    "`::VariantName` syntax when the member is an enum variant, and use `::Some(value)` /\n`::None`",
    "`.VariantName` syntax when the member is an enum variant, and use `.Some(value)` /\n`.None`"
)

# §18.13 qualification text
content = content.replace(
    "- Shorthand: `::VariantName` — valid when the matched type can be inferred from context.",
    "- Shorthand: `.VariantName` — valid when the matched type can be inferred from context."
)
content = content.replace(
    "- Fully qualified: `TypeName::VariantName` — always valid; anchors type inference.",
    "- Fully qualified: `TypeName.VariantName` — always valid; anchors type inference."
)
content = content.replace(
    "- `::VariantName` (shorthand) SHALL be valid when the matched value's type can be inferred",
    "- `.VariantName` (shorthand) SHALL be valid when the matched value's type can be inferred"
)
content = content.replace(
    "- `TypeName::VariantName` (fully qualified) SHALL always be valid regardless of type",
    "- `TypeName.VariantName` (fully qualified) SHALL always be valid regardless of type"
)
content = content.replace(
    "use fully qualified `TypeName::VariantName`\n  form",
    "use fully qualified `TypeName.VariantName`\n  form"
)
content = content.replace(
    "cannot infer enum type for shorthand pattern; use fully qualified `TypeName::VariantName`",
    "cannot infer enum type for shorthand pattern; use fully qualified `TypeName.VariantName`"
)

# §18.11 normative text
content = content.replace(
    "- A binding position that contains `::VariantName` instead of a plain identifier SHALL be\n  a compile error (E-SYNTAX-012: nested pattern not supported in v1).",
    "- A binding position that contains `.VariantName` instead of a plain identifier SHALL be\n  a compile error (E-SYNTAX-012: nested pattern not supported in v1)."
)

# §18.12 lin + match text
content = content.replace(
    "**Wildcard arm and `lin` set consistency:** The `_` arm is treated as an arm for the\npurposes of §34.4's lin-set consistency rule. All arms, including `_`, MUST consume the\nsame set of `lin` variables. If the `_` arm consumes a `lin` variable that named-variant\narms do not, or vice versa, this is E-LIN-003.",
    "**Default arm and `lin` set consistency:** The `else` arm is treated as an arm for the\npurposes of §34.4's lin-set consistency rule. All arms, including `else`, MUST consume the\nsame set of `lin` variables. If the `else` arm consumes a `lin` variable that named-variant\narms do not, or vice versa, this is E-LIN-003."
)
content = content.replace(
    "- All arms, including the `_` arm, MUST consume the same set of outer `lin` variables\n  (§34.4). An arm that consumes a `lin` variable that another arm does not is E-LIN-003.",
    "- All arms, including the `else` arm, MUST consume the same set of outer `lin` variables\n  (§34.4). An arm that consumes a `lin` variable that another arm does not is E-LIN-003."
)
content = content.replace(
    "pattern (`::Variant(x)`) inherit `lin` status",
    "pattern (`.Variant(x)`) inherit `lin` status"
)

# §18.16 no sigil text
content = content.replace(
    "Arms for\nthese types use literal values directly — no `::` sigil, no `is` keyword.",
    "Arms for\nthese types use literal values directly — no variant prefix sigil, no `is` keyword."
)
content = content.replace(
    "literal arm not valid over enum type; use\n  `::VariantName` arm syntax",
    "literal arm not valid over enum type; use\n  `.VariantName` arm syntax"
)
content = content.replace(
    "`::Active ->` instead.",
    "`.Active =>` instead."
)

# §18.10 guard clause reference
content = content.replace(
    "Guard clauses (e.g., `::Circle(r) if r > 0 -> ...`) are **NOT part of scrml v1 pattern",
    "Guard clauses (e.g., `.Circle(r) if r > 0 => ...`) are **NOT part of scrml v1 pattern"
)
content = content.replace(
    "An arm `::Circle(r) if r > 0 -> ...` alone does",
    "An arm `.Circle(r) if r > 0 => ...` alone does"
)

# §18.11 nested pattern reference
content = content.replace(
    "Nested patterns (e.g., `::Add(::Lit(v), right) -> ...`) are **NOT part of scrml v1",
    "Nested patterns (e.g., `.Add(.Lit(v), right) => ...`) are **NOT part of scrml v1"
)

# §18.14 duplicate arms text
content = content.replace(
    "The second `::Circle` arm is unreachable.",
    "The second `.Circle` arm is unreachable."
)

# §18.15 error table updates
content = content.replace(
    "| E-SYNTAX-010 | `_` wildcard arm is not the last arm | Error |",
    "| E-SYNTAX-010 | `else` default arm is not the last arm | Error |"
)

# §33 error codes table updates
content = content.replace(
    "| E-SYNTAX-010 | §18.6 | `_` wildcard arm is not the last arm | Error |",
    "| E-SYNTAX-010 | §18.6 | `else` default arm is not the last arm | Error |"
)
content = content.replace(
    "| W-MATCH-001 | §18.6 | Wildcard `_` arm is unreachable (all variants already covered) | Warning |",
    "| W-MATCH-001 | §18.6 | Unreachable default `else` arm (all variants already covered) | Warning |"
)
content = content.replace(
    "| W-NAV-001 | §20.3 | `navigate(path, ::Hard)` from client function cannot be escalated | Warning |",
    "| W-NAV-001 | §20.3 | `navigate(path, .Hard)` from client function cannot be escalated | Warning |"
)
content = content.replace(
    "| E-TYPE-028 | §18.16 | Literal arm used over an enum type | Error |",
    "| E-TYPE-028 | §18.16 | Literal arm used over an enum type | Error |\n| E-TYPE-060 | §14.5 | `::` used for enum variant access (`TypeName::VariantName` or `::VariantName`) | Error |\n| E-TYPE-061 | §14.5 | Shorthand `.VariantName` in a position where the enum type cannot be inferred | Error |\n| E-TYPE-062 | §18.17 | `is` operator applied to a non-enum-typed operand | Error |\n| E-TYPE-063 | §18.17 | Unknown variant name in `is` expression | Error |\n| E-SYNTAX-020 | §18.2 | `->` in match arm separator position | Error |\n| E-SYNTAX-021 | §18.6 | `_` in match arm default position (where `else` is required) | Error |\n| E-FOREIGN-001 | §23.2 | Level mismatch between `_{}` opener and closer | Error |\n| E-FOREIGN-002 | §23.2 | `_{}` block reaches end-of-file without a matching closer | Error |\n| E-FOREIGN-003 | §23.2 | `_{}` block has no `lang=` declaration in any ancestor `<program>` | Error |\n| E-FOREIGN-004 | §23.2 | `_{}` block appears in an invalid context (not a direct child of `<program>`) | Error |\n| E-PROGRAM-001 | §4.12 | Circular `<program>` nesting detected | Error |\n| E-SQL-004 | §8.1.1 | `?{}` block has no `db=` declaration in any ancestor `<program>` | Error |\n| E-SQL-005 | §8.1.1 | Unrecognized database connection string prefix in `db=` attribute | Error |\n| E-WASM-001 | §23.3 | Call char not in default registry and no `callchar=` declaration | Error |\n| E-WASM-002 | §23.3 | Call-char function called with no corresponding `extern` declaration | Error |\n| E-WASM-003 | §23.3 | `extern` declaration references a call char with no matching `<program>` | Error |\n| E-FOREIGN-010 | §23.4 | `use foreign:name` references a name that matches no nested `<program>` | Error |\n| E-FOREIGN-011 | §23.4 | Function listed in `use foreign:` is not exported by the named sidecar | Error |\n| E-FOREIGN-012 | §23.4 | Sidecar function called from a client-side code path | Error |\n| W-FOREIGN-001 | §23.2 | Level-0 `_{` used; `_={}=` recommended | Warning |\n| W-PROGRAM-001 | §4.12 | Unnamed nested `<program>` with no distinguishing attributes | Warning |"
)

# --- S37-AM-003: §18.6 section rewrite ---
old_18_6 = """### 18.6 Wildcard Arm (`_`)

`_` is the wildcard pattern. It matches any value of the matched type.

**Position requirement:** The `_` arm SHALL be the last arm in the match expression. No
arm MAY appear after `_`. A `_` arm that is not the last arm is a compile error
(E-SYNTAX-010).

**Binding:** `_` does NOT bind the matched value. There is no way to access the matched
value inside a `_` arm body. `_` is a pure discard. If the developer needs access to the
matched value in the default arm, they must name a binding explicitly (future: this use
case is the motivation for a named wildcard pattern, which is not part of v1).

**Payload access:** Because `_` does not bind the value, payload fields of unmatched
variants are inaccessible inside a `_` arm body. The developer who needs payload access
for a specific variant that would otherwise fall to `_` MUST add an explicit arm for that
variant.

**Redundant `_`:** When all variants of the matched type are already covered by explicit
arms, a `_` arm is unreachable. The compiler SHALL emit a warning (W-MATCH-001: unreachable
wildcard arm) and SHALL NOT emit E-TYPE-020. A redundant `_` arm is a warning, not an
error. This keeps the exhaustiveness checker detectable as a working feature: adding a
full set of variant arms and an extra `_` produces a warning, not silence.

**Normative statements:**

- `_` SHALL match any value of the matched type and SHALL be valid as the last arm of a
  match expression.
- The `_` arm SHALL be the last arm. A `_` arm that is not the last arm SHALL be a compile
  error (E-SYNTAX-010).
- `_` SHALL NOT bind the matched value. Accessing the matched value inside a `_` arm body
  is not possible.
- When all variants are already covered by explicit arms AND a `_` arm is also present,
  the compiler SHALL emit W-MATCH-001 (unreachable wildcard arm) and SHALL NOT emit
  E-TYPE-020.
- W-MATCH-001 is a warning, not an error. Compilation proceeds."""

new_18_6 = """### 18.6 Default Arm (`else`)

`else` is the default arm. It matches any value of the matched type that is not matched by
a preceding arm.

**Position requirement:** The `else` arm SHALL be the last arm in the match expression. No
arm MAY appear after `else`. An `else` arm that is not the last arm is a compile error
(E-SYNTAX-010).

**Binding:** `else` does NOT bind the matched value. There is no way to access the matched
value inside an `else` arm body. `else` is a pure discard. If the developer needs access to
the matched value in the default arm, they must name a binding explicitly (future: this use
case is the motivation for a named default pattern, which is not part of v1).

**Payload access:** Because `else` does not bind the value, payload fields of unmatched
variants are inaccessible inside an `else` arm body. The developer who needs payload access
for a specific variant that would otherwise fall to `else` MUST add an explicit arm for
that variant.

**Redundant `else`:** When all variants of the matched type are already covered by explicit
arms, an `else` arm is unreachable. The compiler SHALL emit a warning (W-MATCH-001:
unreachable default arm) and SHALL NOT emit E-TYPE-020. A redundant `else` arm is a
warning, not an error.

**Normative statements:**

- `else` SHALL match any value of the matched type and SHALL be valid as the last arm of a
  match expression.
- The `else` arm SHALL be the last arm. An `else` arm that is not the last arm SHALL be a
  compile error (E-SYNTAX-010).
- `else` SHALL NOT bind the matched value. Accessing the matched value inside an `else` arm
  body is not possible.
- When all variants are already covered by explicit arms AND an `else` arm is also present,
  the compiler SHALL emit W-MATCH-001 (unreachable default arm) and SHALL NOT emit
  E-TYPE-020.
- W-MATCH-001 is a warning, not an error. Compilation proceeds.
- `_` in match arm position (where `else` is required) SHALL be a compile error
  (E-SYNTAX-021: use `else` not `_` for the default match arm).
- The error message for E-SYNTAX-021 SHALL say: "The default match arm is `else`, not `_`.
  Did you mean `else =>`?\""""

content = content.replace(old_18_6, new_18_6)

# §18.16.2 literal match wildcard text
content = content.replace(
    "Exhaustiveness for `string` and `number` match SHALL NOT be enforced. The\n  compiler SHALL NOT emit E-TYPE-020 for a non-exhaustive `string` or `number`\n  match. A `_` wildcard arm is allowed but not required.",
    "Exhaustiveness for `string` and `number` match SHALL NOT be enforced. The\n  compiler SHALL NOT emit E-TYPE-020 for a non-exhaustive `string` or `number`\n  match. An `else` arm is allowed but not required."
)
content = content.replace(
    "a `boolean` match missing one of the two values without\n  a `_` arm SHALL produce W-MATCH-002.",
    "a `boolean` match missing one of the two values without\n  an `else` arm SHALL produce W-MATCH-002."
)
content = content.replace(
    "A `string` or `number` match without a `_` arm is valid.",
    "A `string` or `number` match without an `else` arm is valid."
)
content = content.replace(
    "the compiler SHALL emit warning W-MATCH-002 (non-exhaustive literal match;\n  consider adding a `_` arm to handle unmatched values).",
    "the compiler SHALL emit warning W-MATCH-002 (non-exhaustive literal match;\n  consider adding an `else` arm to handle unmatched values)."
)
content = content.replace(
    "A `boolean` match with both `true` and `false` arms and no `_` arm IS\n  exhaustive.",
    "A `boolean` match with both `true` and `false` arms and no `else` arm IS\n  exhaustive."
)
content = content.replace(
    "The `_` wildcard arm in a literal match follows the same position rule as in\n  enum match (§18.6): it SHALL be the last arm. A `_` arm that is not last SHALL\n  be E-SYNTAX-010.",
    "The `else` arm in a literal match follows the same position rule as in\n  enum match (§18.6): it SHALL be the last arm. An `else` arm that is not last SHALL\n  be E-SYNTAX-010."
)

# §18.16 W-MATCH-002 reference
content = content.replace(
    "Emits W-MATCH-002: non-exhaustive string match; a role value other than\n`\"admin\"` or `\"editor\"` will produce `undefined`. Consider adding a `_` arm.",
    "Emits W-MATCH-002: non-exhaustive string match; a role value other than\n`\"admin\"` or `\"editor\"` will produce `undefined`. Consider adding an `else` arm."
)

# --- §4.11.3 is keyword expansion ---
old_411_3 = """#### 4.11.3 `is` Keyword

`is` is a context-sensitive keyword valid only as an arm pattern keyword in match contexts (§18). In all other contexts, `is` is a valid identifier.

**Normative statements:**

- `is` SHALL be recognized as a keyword only in match arm pattern position.
- In all other syntactic positions, `is` SHALL be treated as a valid identifier.
- The parser SHALL disambiguate `is` by context: inside a `match` expression's arm patterns, `is` is a keyword; elsewhere, it is an identifier."""

new_411_3 = """#### 4.11.3 `is` Keyword

`is` is a context-sensitive keyword valid in two positions:
1. As the variant-check operator in a boolean expression: `expression is .VariantName`
2. In a `when` guard: `when expression is .VariantName { ... }`

In all other contexts, `is` is a valid identifier.

**Normative statements:**

- `is` SHALL be recognized as a keyword in variant-check position: between an expression
  and a `.VariantName` shorthand.
- `is` SHALL be recognized as a keyword in `when` guard position.
- In all other syntactic positions, `is` SHALL be treated as a valid identifier.
- The parser SHALL disambiguate `is` by context: after an expression that has an enum type,
  `is` begins a variant check. Elsewhere, it is an identifier."""

content = content.replace(old_411_3, new_411_3)

# --- §8.1: Add driver resolution rule ---
# Insert §8.1.1 after the §8.1 grammar normative statements block

old_8_1_end = """- The compiler SHALL recognize `?{` \\`...\\` `}` as a SQL context. The backtick delimiters are SQL context syntax, not JavaScript template literal syntax.
- `${}` inside a SQL template SHALL be compiled to a positional bound parameter in the generated `bun:sqlite` call. It SHALL NOT be compiled to string interpolation.
- The compiler SHALL NOT compile `${}` inside `?{}` to string interpolation under any circumstance. All dynamic values inside a SQL template SHALL be bound parameters. This is a non-negotiable security requirement; violation is E-SQL-001 if detected in generated output (compiler defect, not user error).

### 8.2 Bound Parameter Semantics"""

new_8_1_end = """- The compiler SHALL recognize `?{` \\`...\\` `}` as a SQL context. The backtick delimiters are SQL context syntax, not JavaScript template literal syntax.
- `${}` inside a SQL template SHALL be compiled to a positional bound parameter in the generated database driver call. It SHALL NOT be compiled to string interpolation.
- The compiler SHALL NOT compile `${}` inside `?{}` to string interpolation under any circumstance. All dynamic values inside a SQL template SHALL be bound parameters. This is a non-negotiable security requirement; violation is E-SQL-001 if detected in generated output (compiler defect, not user error).

### 8.1.1 Database Driver Resolution

A `?{}` context does NOT generate bun:sqlite calls unconditionally. The compiler resolves
the database driver by walking up the `<program>` ancestor tree from the `?{}` block's
position to find the closest `<program>` with a `db=` attribute. The connection string value
of that `db=` attribute determines the driver.

**Driver selection table:**

| `db=` value prefix | Driver generated | Notes |
|--------------------|-----------------|-------|
| `sqlite:./path` | `bun:sqlite` | Local SQLite file |
| `./path` or `./path.db` | `bun:sqlite` | Default; implicit `sqlite:` prefix |
| `:memory:` | `bun:sqlite` | In-memory SQLite |
| `postgres://...` or `postgresql://...` | Postgres driver | Connection string forwarded |
| `mysql://...` | MySQL driver | Connection string forwarded |
| `mongo://...` or `mongodb://...` | MongoDB driver | Connection string forwarded |

The compiler generates driver-appropriate calls. All scrml `?{}` query semantics (bound
parameters, `.all()`, `.first()`, `.run()`, `.prepare()`) are preserved across drivers. The
generated code uses the driver's equivalent API.

**Normative statements:**

- The compiler SHALL resolve the database driver for each `?{}` block by finding the closest
  ancestor `<program>` element with a `db=` attribute. "Closest" means fewest nesting levels
  up the `<program>` tree.
- If no ancestor `<program>` has a `db=` attribute, the `?{}` block SHALL be a compile error
  (E-SQL-004: `?{}` block has no `db=` declaration in any ancestor `<program>`).
- The compiler SHALL parse the `db=` connection string prefix to determine the driver. An
  unrecognized prefix SHALL be a compile error (E-SQL-005: unrecognized database connection
  string prefix; valid prefixes are `sqlite:`, `postgres:`, `postgresql:`, `mysql:`,
  `mongo:`, `mongodb:`).
- A plain path without prefix (e.g., `db="./app.db"`) SHALL be treated as `sqlite:./app.db`.
- The bound parameter security rule of §8.1 (E-SQL-001) applies regardless of driver.
  All `${}` interpolations inside `?{}` blocks SHALL be bound parameters, never string
  interpolation, across all drivers.
- When a nested `<program>` with its own `db=` attribute is an ancestor, it SHALL take
  precedence over any outer `<program>` `db=` attribute for `?{}` blocks inside the nested
  `<program>`.

**Worked Example — Valid (PostgreSQL driver):**

```scrml
<program db="postgres://user:pass@localhost:5432/myapp">
    ${ server function getUsers(role) {
        return ?{`SELECT id, name FROM users WHERE role = ${role}`}.all()
    } }
/
```

Compiles to a postgres driver call (not bun:sqlite). The `${role}` becomes a parameterized
query (`$1` in postgres parameterized query syntax). The `.all()` maps to the postgres
driver's rows-returning method.

**Worked Example — Invalid (no `db=` in any ancestor):**

```scrml
<program>
    ${ server function getUsers() {
        return ?{`SELECT * FROM users`}.all()   // Error E-SQL-004
    } }
/
```

```
Error E-SQL-004 at line 3: `?{}` block has no `db=` declaration in any ancestor `<program>`.
  Add a `db=` attribute to the enclosing `<program>` element.
  Example: `<program db="./app.db">` for SQLite or `<program db="postgres://...">` for Postgres.
```

### 8.2 Bound Parameter Semantics"""

content = content.replace(old_8_1_end, new_8_1_end)

# §8.6: Add new error codes
old_8_6 = """### 8.6 Error Conditions

| Code | Trigger | Severity |
|---|---|---|
| E-SQL-001 | Compiler emits string interpolation into a SQL string (compiler defect, not user error) | Error |
| E-SQL-002 | SQL template string (after `?N` substitution) is syntactically invalid SQL | Error |
| E-SQL-003 | SQL template content is a runtime expression, not a literal string template | Error |

### 8.7 Interaction Notes"""

new_8_6 = """### 8.6 Error Conditions

| Code | Trigger | Severity |
|---|---|---|
| E-SQL-001 | Compiler emits string interpolation into a SQL string (compiler defect, not user error) | Error |
| E-SQL-002 | SQL template string (after `?N` substitution) is syntactically invalid SQL | Error |
| E-SQL-003 | SQL template content is a runtime expression, not a literal string template | Error |
| E-SQL-004 | `?{}` block has no `db=` declaration in any ancestor `<program>` | Error |
| E-SQL-005 | Unrecognized database connection string prefix in `db=` attribute | Error |

### 8.7 Interaction Notes"""

content = content.replace(old_8_6, new_8_6)

# §8.7: Add nested program db scoping note
old_8_7_end = """- **§26 (Comments):** `--` SQL comments inside a SQL template are passed through to `bun:sqlite` as part of the SQL string. The block splitter does not interpret `--` at the `?{}` level; comment handling inside SQL templates is the responsibility of `bun:sqlite`.

---

## 9. CSS Contexts"""

new_8_7_end = """- **§26 (Comments):** `--` SQL comments inside a SQL template are passed through to the database driver as part of the SQL string. The block splitter does not interpret `--` at the `?{}` level; comment handling inside SQL templates is the responsibility of the underlying driver.
- **§4.12 (Nested `<program>`):** A nested `<program>` with its own `db=` attribute creates
  a new database driver scope. All `?{}` blocks inside the nested `<program>` resolve to
  the nested program's driver. `?{}` blocks in the parent `<program>` are unaffected by the
  child's `db=`.

---

## 9. CSS Contexts"""

content = content.replace(old_8_7_end, new_8_7_end)

# ================================================================
# PASS 2: Insert new §4.12 after §4.11.3
# ================================================================

old_4_11_end = """- The parser SHALL disambiguate `is` by context: after an expression that has an enum type,
  `is` begins a variant check. Elsewhere, it is an identifier.

---

## 5. Attribute Quoting Semantics"""

new_4_12_section = """- The parser SHALL disambiguate `is` by context: after an expression that has an enum type,
  `is` begins a variant check. Elsewhere, it is an identifier.

### 4.12 Nested `<program>` Elements

A `<program>` element MAY appear as a direct child of another `<program>` element. Each
nested `<program>` creates a new, independent execution context boundary. Nesting `<program>`
is the primary mechanism for declaring inline workers, foreign language sidecars, WASM
modules, and scoped database contexts.

This design principle is **colocation**: workers, sidecars, and database scopes declared
adjacent to the code that uses them, in the same file, rather than in separate files.

#### 4.12.1 Shared-Nothing Scope Isolation

A nested `<program>` is a completely isolated compilation unit. It does NOT inherit any
lexical bindings from its parent `<program>`. Specifically:

- `const`, `let`, and `@reactive` variables declared in the parent are NOT accessible in the
  nested `<program>`.
- Types declared in the parent (`type Foo:struct`, `type Bar:enum`) are NOT automatically in
  scope in the nested `<program>`.
- `use` declarations from the parent do NOT propagate to the nested `<program>`.
- `?{}` SQL contexts in the nested `<program>` are governed by the nested `<program>`'s own
  `db=` attribute, not the parent's.

A nested `<program>` MUST declare its own `use` and `import` statements. If it needs types
from a shared module, it MUST import them explicitly.

**Normative statements:**

- A nested `<program>` SHALL be a separate compilation unit. The compiler SHALL compile
  nested `<program>` elements independently.
- No lexical binding, reactive variable, or type declaration from the parent `<program>`
  SHALL be accessible inside a nested `<program>`.
- A nested `<program>` SHALL declare its own `use` declarations independently. `use`
  declarations from the parent SHALL NOT propagate to any nested `<program>`.
- A `<program>` nested inside another `<program>` SHALL be subject to the same grammar rules
  as a top-level `<program>` (§4.1, §4.2, §4.3, §4.11).

#### 4.12.2 Nested `<program>` Attributes

The following `<program>` attributes are valid in nested positions:

| Attribute | Valid in nested? | Semantics |
|-----------|-----------------|-----------|
| `name=`   | YES | Assigns an identifier to the nested program for parent-side reference |
| `lang=`   | YES | Declares the foreign language toolchain for `_{}` blocks in this scope |
| `db=`     | YES | Scopes `?{}` to the declared database; overrides parent `db=` for this subtree |
| `mode=`   | YES | `"wasm"` for client-side WASM modules; omitted for sidecar processes |
| `build=`  | YES | Build command string for the external toolchain |
| `port=`   | YES | Port number for sidecar HTTP/socket communication |
| `health=` | YES | Health-check endpoint path for sidecar processes |
| `route=`  | YES | Declares the nested program as a server endpoint at the given route |
| `protect=` | YES | Declares protected field names for data isolation |
| `callchar=` | YES | Maps a single character to this nested program for call-char sigils (§23.3) |

The top-level `<program>` MUST NOT have a `name=` attribute (it is the implicit root).
Nested `<program>` elements SHOULD have a `name=` attribute for reference and diagnostics;
an unnamed nested `<program>` generates a compiler-assigned identifier (W-PROGRAM-001).

#### 4.12.3 Execution Context Types

Nested `<program>` covers four distinct execution context types determined by attribute
combination:

| Type | Attributes | Runtime model |
|------|-----------|---------------|
| Inline web worker | `name=`, no `lang=` | `new Worker()`, postMessage IPC |
| Foreign language sidecar | `name=`, `lang=` (non-WASM language) | Subprocess with HTTP/socket |
| WASM compute module | `name=`, `lang=`, `mode="wasm"` | `WebAssembly.instantiate()` |
| Scoped DB context | `name=` (optional), `db=` | New `?{}` driver scope |

#### 4.12.4 Inline Worker (Colocation Pattern)

A nested `<program>` with no `lang=` attribute is an inline web worker declaration. The
compiler generates a `Worker` instantiation and postMessage-based IPC. The nested program is
compiled as a separate worker bundle.

```scrml
<program db="./app.db">

@result = null
@loading = false

<program name="heavyCompute">
    // Separate compilation unit — no parent scope access
    ${ type ComputeResult:struct = { value: number, iterations: number } }

    ${ function compute(data) {
        let sum = 0
        for (let i = 0; i < data.length; i++) { sum += data[i] * data[i] }
        return { value: sum, iterations: data.length }
    } }

    when message(data) {
        let result = compute(data)
        send(result)
    }
/

${ function runCompute() {
    @loading = true
    // <#name>.send() returns a Promise resolving to the worker's response
    @result = <#heavyCompute>.send([1, 2, 3, 4, 5])
    @loading = false
} }

<button onclick=runCompute()>Compute/
<p>${@loading ? "Computing..." : @result?.value}/

/
```

**`when message(data) { ... }`** is a lifecycle hook valid inside worker `<program>` elements.
It fires when the worker receives a postMessage. `send(value)` posts a reply to the parent.

**`<#name>.send(value)`** in the parent calls the worker and returns a Promise.

#### 4.12.5 Foreign Language Sidecar (Colocation Pattern)

A nested `<program>` with `lang=` and no `mode="wasm"` is a sidecar process declaration.
The compiler generates process lifecycle management code and an HTTP/socket client in the
parent's compiled output.

```scrml
<program db="./app.db">

<program name="ml" lang="go"
    build="go build -o ./bin/ml ./cmd/ml"
    port=9001
    health="/health">

    // Interface declared in scrml types — compiler generates marshaling
    ${ type PredictionRequest:struct = { features: number[], modelId: string } }
    ${ type PredictionResult:struct = { prediction: number, confidence: number } }

    ${ export function predict(req: PredictionRequest) -> PredictionResult }
/

use foreign:ml { predict }

${ server function getPrediction(features, modelId) {
    return predict({ features, modelId })
} }

/
```

#### 4.12.6 Database-Scoped Context

A nested `<program>` with `db=` creates a new database driver scope. `?{}` blocks inside
the nested `<program>` resolve to that database, not the parent's. This enables multi-database
applications with clear scope boundaries.

```scrml
<program db="sqlite:./primary.db">

<program db="postgres://analytics:5432/metrics">
    ${ server function getMetrics(period) {
        return ?{`SELECT * FROM daily_metrics WHERE period = ${period}`}.all()
    } }
/

${ server function getUser(id) {
    return ?{`SELECT * FROM users WHERE id = ${id}`}.first()
} }

/
```

`getUser` uses bun:sqlite (the outer `db=`). `getMetrics` uses the postgres driver (the
inner `db=`).

#### 4.12.7 Nesting Depth

Nesting depth is NOT bounded. `<program>` elements MAY be nested arbitrarily. The compiler
SHALL process each nested level as an independent compilation unit. Circular nesting (a
`<program>` that is a descendant of itself) SHALL be a compile error (E-PROGRAM-001: circular
`<program>` nesting detected).

#### 4.12.8 Communication Between Nested Programs

Parent and nested programs communicate exclusively through message-passing interfaces. There
is no shared memory, no shared reactive state, and no shared scope. The specific communication
mechanism depends on the execution context type:

| Context type | Parent-to-child | Child-to-parent |
|---|---|---|
| Web worker | `<#name>.send(value)` | `send(value)` in `when message` handler |
| Sidecar | `use foreign:name { fn }` call | Return value of the function call |
| WASM module | `callchar{ fn(args) }` (§23.3) | Return value of the WASM call |
| DB scope | Calls cross-boundary via `use foreign:` or server functions | N/A (DB scope is stateless) |

**Normative statements:**

- A nested `<program>` SHALL NOT access any variable, reactive state, or type from its parent
  `<program>`'s scope directly.
- All data flow between nested programs SHALL pass through declared message-passing interfaces.
- The compiler SHALL extract each nested `<program>` as an independent compilation unit before
  running any analysis pass on its contents.
- A nested `<program>` with neither `name=` nor `lang=` nor `db=` SHALL emit a warning
  (W-PROGRAM-001: unnamed nested `<program>` with no distinguishing attributes; assign a
  `name=` for clarity).

#### 4.12.9 Error Conditions

| Code | Trigger | Severity |
|------|---------|---------|
| E-PROGRAM-001 | Circular `<program>` nesting (a `<program>` is a descendant of itself) | Error |
| W-PROGRAM-001 | Nested `<program>` has no `name=` attribute | Warning |

---

## 5. Attribute Quoting Semantics"""

content = content.replace(old_4_11_end, new_4_12_section)

# ================================================================
# PASS 3: Replace §18.2 grammar block
# ================================================================

old_18_2_grammar = """**Formal grammar:**

```
match-expr    ::= 'match' expression '{' match-arm+ '}'
match-arm     ::= arm-pattern '->' arm-body
arm-pattern   ::= variant-pattern | wildcard-pattern
variant-pattern ::= '::' VariantName ('(' binding-list ')')?
                  | TypeName '::' VariantName ('(' binding-list ')')?
binding-list  ::= binding (',' binding)*
binding       ::= Identifier                          // positional form
                | FieldName ':' Identifier            // named form
wildcard-pattern ::= '_'
arm-body      ::= expression | block-body
block-body    ::= '{' statement* expression? '}'
```

**Worked example — unit variants:**
```scrml
match direction {
    ::North -> "up"
    ::South -> "down"
    ::East  -> "right"
    ::West  -> "left"
}
```

**Worked example — payload variants, positional binding:**
```scrml
match shape {
    ::Circle(r)    -> r * r * 3.14159
    ::Rectangle(w, h) -> w * h
    ::Point        -> 0
}
```

**Worked example — block arm body:**
```scrml
match shape {
    ::Circle(r) -> {
        let area = r * r * 3.14159
        let perimeter = 2 * r * 3.14159
        area + perimeter
    }
    ::Rectangle(w, h) -> w * h
    ::Point -> 0
}
```"""

new_18_2_grammar = """**Formal grammar:**

```
match-expr      ::= 'match' expression '{' match-arm+ '}'
match-arm       ::= arm-pattern '=>' arm-body
arm-pattern     ::= variant-pattern | wildcard-arm | is-pattern
variant-pattern ::= '.' VariantName ('(' binding-list ')')?
                  | TypeName '.' VariantName ('(' binding-list ')')?
binding-list    ::= binding (',' binding)*
binding         ::= Identifier
                  | FieldName ':' Identifier
wildcard-arm    ::= 'else'
arm-body        ::= expression | block-body
block-body      ::= '{' statement* expression? '}'
```

Note: `variant-pattern` uses `.` notation (S37-AM-001). `wildcard-arm` uses `else`
(S37-AM-003). `is-pattern` defined in §18.17.

**Normative statements:**

- A match arm separator SHALL be `=>`. The `->` token in match arm position SHALL be a
  compile error (E-SYNTAX-020: match arm separator is `=>`, not `->`).
- The error message for E-SYNTAX-020 SHALL say: "Match arm separator is `=>` not `->`. Did you mean `=>`?"

**Worked example — unit variants:**
```scrml
match direction {
    .North => "up"
    .South => "down"
    .East  => "right"
    .West  => "left"
}
```

**Worked example — payload variants, positional binding:**
```scrml
match shape {
    .Circle(r)       => r * r * 3.14159
    .Rectangle(w, h) => w * h
    .Point           => 0
}
```

**Worked example — block arm body:**
```scrml
match shape {
    .Circle(r) => {
        let area = r * r * 3.14159
        let perimeter = 2 * r * 3.14159
        area + perimeter
    }
    .Rectangle(w, h) => w * h
    .Point            => 0
}
```"""

content = content.replace(old_18_2_grammar, new_18_2_grammar)

# ================================================================
# PASS 4: Replace §18.4 examples
# ================================================================

old_18_4_ex1 = """**Worked example — valid (all arms same type):**
```scrml
let label:string = match status {
    ::Active  -> "active"
    ::Pending -> "pending"
    ::Closed  -> "closed"
}
```
All arms produce `string`. Result type is `string`.

**Worked example — invalid (type mismatch across arms):**
```scrml
let x = match flag {
    ::On  -> "yes"
    ::Off -> 42        // Error: string vs number
}
```
Error E-TYPE-001: match arm at `::Off` produces `number`; earlier arms produce `string`."""

new_18_4_ex1 = """**Worked example — valid (all arms same type):**
```scrml
let label:string = match status {
    .Active  => "active"
    .Pending => "pending"
    .Closed  => "closed"
}
```
All arms produce `string`. Result type is `string`.

**Worked example — invalid (type mismatch across arms):**
```scrml
let x = match flag {
    .On  => "yes"
    .Off => 42        // Error: string vs number
}
```
Error E-TYPE-001: match arm at `.Off` produces `number`; earlier arms produce `string`."""

content = content.replace(old_18_4_ex1, new_18_4_ex1)

# ================================================================
# PASS 5: Replace §18.5 examples
# ================================================================

old_18_5_ex = """**Single-expression arm:**
```scrml
::Circle(r) -> r * r * 3.14159
```
The expression is the arm's result value.

**Block arm:**
```scrml
::Circle(r) -> {
    let scaled = r * scaleFactor
    scaled * scaled * 3.14159
}
```"""

new_18_5_ex = """**Single-expression arm:**
```scrml
.Circle(r) => r * r * 3.14159
```
The expression is the arm's result value.

**Block arm:**
```scrml
.Circle(r) => {
    let scaled = r * scaleFactor
    scaled * scaled * 3.14159
}
```"""

content = content.replace(old_18_5_ex, new_18_5_ex)

# ================================================================
# PASS 6: Replace §18.7 examples
# ================================================================

old_18_7_pos = """```scrml
// Declaration: Rectangle(width:number, height:number)
::Rectangle(w, h) -> w * h   // w binds width, h binds height
```

**Named form:** Bindings are assigned by field name. The order in the arm pattern does not
need to match the declaration order.

```scrml
::Rectangle(height: h, width: w) -> w * h
```"""

new_18_7_pos = """```scrml
// Declaration: Rectangle(width:number, height:number)
.Rectangle(w, h) => w * h   // w binds width, h binds height
```

**Named form:** Bindings are assigned by field name. The order in the arm pattern does not
need to match the declaration order.

```scrml
.Rectangle(height: h, width: w) => w * h
```"""

content = content.replace(old_18_7_pos, new_18_7_pos)

old_18_7_named_ex = """**Worked example — valid, named form:**
```scrml
type Person:enum = {
    Employee(name:string, department:string, salary:number)
    Contractor(name:string, rate:number)
}

match person {
    ::Employee(name: n, department: d) -> "${n} works in ${d}"
    ::Contractor(name: n)              -> "${n} is a contractor"
}
```
`salary` is not bound in the `::Employee` arm; it is inaccessible but causes no error.

**Worked example — invalid, positional arity mismatch:**
```scrml
type Shape:enum = {
    Rectangle(width:number, height:number)
}

match shape {
    ::Rectangle(w) -> w   // Error E-TYPE-021: arity mismatch, 1 binding for 2 fields
    _              -> 0
}
```
Error E-TYPE-021: `::Rectangle` has 2 payload fields; 1 binding provided. Use positional
form with all 2 bindings or use named form with a subset of field names."""

new_18_7_named_ex = """**Worked example — valid, named form:**
```scrml
type Person:enum = {
    Employee(name:string, department:string, salary:number)
    Contractor(name:string, rate:number)
}

match person {
    .Employee(name: n, department: d) => "${n} works in ${d}"
    .Contractor(name: n)              => "${n} is a contractor"
}
```
`salary` is not bound in the `.Employee` arm; it is inaccessible but causes no error.

**Worked example — invalid, positional arity mismatch:**
```scrml
type Shape:enum = {
    Rectangle(width:number, height:number)
}

match shape {
    .Rectangle(w) => w   // Error E-TYPE-021: arity mismatch, 1 binding for 2 fields
    else          => 0
}
```
Error E-TYPE-021: `.Rectangle` has 2 payload fields; 1 binding provided. Use positional
form with all 2 bindings or use named form with a subset of field names."""

content = content.replace(old_18_7_named_ex, new_18_7_named_ex)

# ================================================================
# PASS 7: Replace §18.8.2 nullable match example
# ================================================================

old_18_8_2_ex = """```scrml
// val : string | null
match val {
    ::Some(s) -> "got: ${s}"
    ::None    -> "nothing"
}
```"""

new_18_8_2_ex = """```scrml
// val : string | null
match val {
    .Some(s) => "got: ${s}"
    .None    => "nothing"
}
```"""

content = content.replace(old_18_8_2_ex, new_18_8_2_ex)

# ================================================================
# PASS 8: Replace §18.11 sequential match examples
# ================================================================

old_18_11_ex = """```scrml
// Correct pattern for nested dispatch (sequential match)
match expr {
    ::Add(left, right) -> {
        let leftVal = match left {
            ::Lit(v) -> v
            ::Add(l, r) -> l + r   // recursive; here simplified
        }
        leftVal + evalExpr(right)
    }
    ::Lit(v) -> v
}
```"""

new_18_11_ex = """```scrml
// Correct pattern for nested dispatch (sequential match)
match expr {
    .Add(left, right) => {
        let leftVal = match left {
            .Lit(v)    => v
            .Add(l, r) => l + r   // recursive; here simplified
        }
        leftVal + evalExpr(right)
    }
    .Lit(v) => v
}
```"""

content = content.replace(old_18_11_ex, new_18_11_ex)

# ================================================================
# PASS 9: Replace §18.14 duplicate arms example
# ================================================================

old_18_14_ex = """```scrml
match shape {
    ::Circle(r) -> r * 2
    ::Circle(r) -> r * 3   // Error E-TYPE-023
    ::Point -> 0
}
```

The second `::Circle` arm is unreachable. This SHALL be a compile error (E-TYPE-023:
duplicate match arm). The first arm for a variant is used; the second is an error."""

new_18_14_ex = """```scrml
match shape {
    .Circle(r) => r * 2
    .Circle(r) => r * 3   // Error E-TYPE-023
    .Point     => 0
}
```

The second `.Circle` arm is unreachable. This SHALL be a compile error (E-TYPE-023:
duplicate match arm). The first arm for a variant is used; the second is an error."""

content = content.replace(old_18_14_ex, new_18_14_ex)

# ================================================================
# PASS 10: Replace §18.16 literal match examples
# ================================================================

old_18_16_str = """**Worked example — string match:**

```scrml
match status {
    "active"  -> handleActive()
    "banned"  -> handleBanned()
    _         -> handleOther()
}
```

**Worked example — number match:**

```scrml
match priority {
    1 -> "high"
    2 -> "medium"
    3 -> "low"
    _ -> "unknown"
}
```

**Worked example — boolean match:**

```scrml
match isAdmin {
    true  -> showAdminPanel()
    false -> showUserPanel()
}
```"""

new_18_16_str = """**Worked example — string match:**

```scrml
match status {
    "active"  => handleActive()
    "banned"  => handleBanned()
    else      => handleOther()
}
```

**Worked example — number match:**

```scrml
match priority {
    1    => "high"
    2    => "medium"
    3    => "low"
    else => "unknown"
}
```

**Worked example — boolean match:**

```scrml
match isAdmin {
    true  => showAdminPanel()
    false => showUserPanel()
}
```"""

content = content.replace(old_18_16_str, new_18_16_str)

old_18_16_str_valid = """**Worked example — valid (string match, no `_`, warning):**

```scrml
match role {
    "admin"  -> showAdmin()
    "editor" -> showEditor()
}
```

Compiles. Emits W-MATCH-002: non-exhaustive string match; a role value other than
`"admin"` or `"editor"` will produce `undefined`. Consider adding a `_` arm.

**Worked example — valid (string match with `_`):**

```scrml
match role {
    "admin"  -> showAdmin()
    "editor" -> showEditor()
    _        -> showUser()"""

new_18_16_str_valid = """**Worked example — valid (string match, no `else`, warning):**

```scrml
match role {
    "admin"  => showAdmin()
    "editor" => showEditor()
}
```

Compiles. Emits W-MATCH-002: non-exhaustive string match; a role value other than
`"admin"` or `"editor"` will produce `undefined`. Consider adding an `else` arm.

**Worked example — valid (string match with `else`):**

```scrml
match role {
    "admin"  => showAdmin()
    "editor" => showEditor()
    else     => showUser()"""

content = content.replace(old_18_16_str_valid, new_18_16_str_valid)

# Fix the "invalid" example at end of §18.16
old_18_16_invalid = """    "active" -> handleActive()   // Error E-TYPE-028
    _        -> handleOther()
```"""

new_18_16_invalid = """    "active" => handleActive()   // Error E-TYPE-028
    else     => handleOther()
```"""

content = content.replace(old_18_16_invalid, new_18_16_invalid)

# §18.16 grammar: update arm-pattern to use `else`
old_18_16_grammar = """```
literal-arm-pattern ::= string-literal
                       | number-literal
                       | boolean-literal
arm-pattern         ::= variant-pattern
                       | literal-arm-pattern     // added by §18.16
                       | wildcard-pattern
                       | is-pattern
```"""

new_18_16_grammar = """```
literal-arm-pattern ::= string-literal
                       | number-literal
                       | boolean-literal
arm-pattern         ::= variant-pattern
                       | literal-arm-pattern     // added by §18.16
                       | wildcard-arm            // 'else' keyword
                       | is-pattern
```"""

content = content.replace(old_18_16_grammar, new_18_16_grammar)

# ================================================================
# PASS 11: Replace §34.4 lin+match examples
# ================================================================

old_34_4_ex = """```scrml
// Valid — consumed in all arms
lin token = fetchToken()
match role {
    ::Admin -> useAdminToken(token)
    ::User  -> useToken(token)
    ::Guest -> discardToken(token)
}

// Invalid — E-LIN-003: ::Guest arm does not consume token
lin token = fetchToken()
match role {
    ::Admin -> useAdminToken(token)
    ::User  -> useToken(token)
    ::Guest -> doSomethingElse()   // token not consumed — E-LIN-003
}
```"""

new_34_4_ex = """```scrml
// Valid — consumed in all arms
lin token = fetchToken()
match role {
    .Admin => useAdminToken(token)
    .User  => useToken(token)
    .Guest => discardToken(token)
}

// Invalid — E-LIN-003: .Guest arm does not consume token
lin token = fetchToken()
match role {
    .Admin => useAdminToken(token)
    .User  => useToken(token)
    .Guest => doSomethingElse()   // token not consumed — E-LIN-003
}
```"""

content = content.replace(old_34_4_ex, new_34_4_ex)

old_34_lins_ex = """**Valid — consumed in all match arms:**
```scrml
${
    lin token = fetchToken()
    match role {
        ::Admin -> adminAuth(token)
        ::User  -> userAuth(token)
        ::Guest -> guestAuth(token)
    }
}
```"""

new_34_lins_ex = """**Valid — consumed in all match arms:**
```scrml
${
    lin token = fetchToken()
    match role {
        .Admin => adminAuth(token)
        .User  => userAuth(token)
        .Guest => guestAuth(token)
    }
}
```"""

content = content.replace(old_34_lins_ex, new_34_lins_ex)

# ================================================================
# PASS 12: Insert §18.17 after §18.16 (after the last line of §18.16)
# ================================================================

old_18_16_end = """- Literal arms MAY be mixed with enum variant arms in a single match only when the
  matched type is a union that includes both an enum and a primitive (e.g.,
  `Status | string`). Mixing literal arms with variant arms over a pure enum type
  SHALL be a compile error (E-TYPE-028: literal arm not valid over enum type; use
  `.VariantName` arm syntax)."""

new_18_17_after = """- Literal arms MAY be mixed with enum variant arms in a single match only when the
  matched type is a union that includes both an enum and a primitive (e.g.,
  `Status | string`). Mixing literal arms with variant arms over a pure enum type
  SHALL be a compile error (E-TYPE-028: literal arm not valid over enum type; use
  `.VariantName` arm syntax).

---

### 18.17 The `is` Operator — Single-Variant Check

The `is` operator tests whether an enum-typed value is a specific variant. It produces a
`boolean` value. It is NOT a match expression and does NOT produce exhaustiveness checking.

**Syntax:**

```
is-expression ::= expression 'is' '.' VariantName
```

The `.VariantName` form is always shorthand (no type prefix required); the type is inferred
from the left-hand operand.

**Semantics:**

`expr is .V` evaluates to `true` if and only if `expr`'s runtime value is the variant `V`
of its enum type. It evaluates to `false` for all other variants. No payload is bound or
accessible by the `is` expression itself.

**Worked example — conditional:**
```scrml
@filter:FilterMode = .All

${ if (@filter is .Active) {
    loadActiveItems()
} }
```

**Worked example — in markup attribute:**
```scrml
<button class=selected(@filter is .All) onclick={@filter = .All}>All/
<button class=selected(@filter is .Active) onclick={@filter = .Active}>Active/
```

**Worked example — with reactive variable:**
```scrml
type Tab:enum = { Overview, Activity, Settings }
@tab:Tab = .Overview

<nav>
    <a class=active(@tab is .Overview) onclick={@tab = .Overview}>Overview/
    <a class=active(@tab is .Activity) onclick={@tab = .Activity}>Activity/
    <a class=active(@tab is .Settings) onclick={@tab = .Settings}>Settings/
/
```

**Worked example — invalid (not an enum type):**
```scrml
let name = "Alice"
if (name is .Admin) { ... }   // Error E-TYPE-062
```

```
Error E-TYPE-062 at line 2: `is` operator requires an enum-typed left-hand operand.
  `name` has type `string`, not an enum type.
```

**Normative statements:**

- The `is` operator SHALL be valid only when the left-hand operand is of an enum type. If
  the operand is not an enum type, this SHALL be a compile error (E-TYPE-062: `is` operator
  requires an enum-typed operand).
- The `.VariantName` on the right-hand side of `is` SHALL be resolved against the enum type
  of the left-hand operand. An unknown variant name SHALL be a compile error (E-TYPE-063:
  unknown variant name in `is` expression).
- `expression is .VariantName` SHALL have result type `boolean`.
- The `is` operator SHALL NOT bind or expose payload fields. For payload access, use `match`.
- The `is` operator provides NO exhaustiveness guarantee. It is a boolean predicate, not a
  dispatch form.
- `is` MAY be used in: `if` conditions, `class=` dynamic binding expressions, ternary
  expressions, `when` guards, and any position where a boolean expression is valid."""

content = content.replace(old_18_16_end, new_18_17_after)

# ================================================================
# PASS 13: Insert new §23 (Foreign Code Contexts) before existing §23
# ================================================================

# The existing §23 becomes §24, §24 becomes §25, etc.
# We insert new §23 before the "## 23. HTML Spec Awareness" line

old_23_header = """---

## 23. HTML Spec Awareness"""

new_23_section = """---

## 23. Foreign Code Contexts (`_{}`)

### 23.1 Overview

scrml supports inline foreign code through the `_{}` sigil. Foreign code is opaque to the
scrml compiler — its content is not parsed, tokenized, or type-checked by any scrml pipeline
stage. The compiler extracts the verbatim source slice and delegates it to the external
toolchain declared by the closest parent `<program lang=...>` attribute.

`_{}` is the inline foreign code mechanism. It is distinct from:
- `^{}` meta context (§22) — scrml code that accesses compiler internals
- `r{}` / `c{}` / `z{}` call-char sigils (§23.3) — WASM function invocation
- `use foreign:` declarations (§23.4) — sidecar process interface declarations

### 23.2 Syntax

**Formal grammar:**

```
foreign-block   ::= '_' level-mark '{' foreign-content '}' level-mark
level-mark      ::= '='*
foreign-content ::= (any character sequence not containing '}' followed by the same level-mark)
```

The `level-mark` is zero or more `=` characters. The opening level-mark immediately follows
`_` and immediately precedes `{`. The closing level-mark immediately follows `}`. The opener
and closer MUST have the same number of `=` characters; mismatched levels SHALL be a compile
error (E-FOREIGN-001).

**Level-0 (basic, no markers):**

```scrml
_{
    // foreign code here
}
```

Level-0 uses the same brace-depth counting as all other scrml sigils (`${}`, `?{}`, etc.).
The compiler increments depth on `{` and decrements on `}`. Level-0 is adequate for foreign
code that has balanced braces but FAILS if the foreign code contains `}` inside a string
literal, comment, or language construct. Level-0 is NOT recommended for non-trivial foreign
code.

**Level-1 (recommended default):**

```scrml
_={
    // foreign code here — a lone } will not close this block
    // only }= closes this block
}=
```

**Level-2 (for foreign code that contains `}=`):**

```scrml
_=={
    // foreign code containing }= safely
}==
```

**Recommendation:** Use level-1 (`_={}=`) or higher for any foreign code block. The compiler
SHALL emit a warning (W-FOREIGN-001) when a level-0 `_{}` block is used, recommending
`_={}=` instead.

**Normative statements:**

- The block splitter SHALL recognize `_` followed by zero or more `=` followed by `{` as a
  foreign code block opener. The block splitter SHALL store the opener level (the count of
  `=` characters).
- The block splitter SHALL scan for the matching closer: `}` followed by the same number of
  `=` characters as the opener. No other character sequence closes the foreign code block.
- The interior of a `_{}` block is opaque. The compiler SHALL NOT parse, tokenize, or
  type-check the content. The compiler SHALL extract the verbatim source slice between the
  opener and closer as a raw string.
- A mismatched level (opener `_={` with closer `}==`) SHALL be a compile error (E-FOREIGN-001).
- A `_{}` block that reaches end-of-file without a matching closer SHALL be a compile error
  (E-FOREIGN-002: unclosed foreign code block at line N).
- The compiler SHALL emit W-FOREIGN-001 on any level-0 `_{` block, recommending `_={}=`.

### 23.2.1 Language Determination

The language for a `_{}` block is determined by the `lang=` attribute of the closest
ancestor `<program>` element in the scrml source. The compiler walks up the `<program>`
nesting tree; the first `<program>` with a `lang=` attribute wins.

```scrml
<program>
    <program name="compute" lang="go" build="go build -o ./bin/compute ./cmd/compute">
        _={
            package main

            import "fmt"

            func Add(a, b int) int {
                return a + b
            }
        }=
    /
/
```

Here `_={}=` is governed by `lang="go"`. The compiler passes the verbatim content to the Go
toolchain.

**Normative statements:**

- The compiler SHALL determine the language of a `_{}` block by resolving the `lang=`
  attribute of the closest ancestor `<program>` with that attribute set.
- A `_{}` block with no ancestor `<program lang=...>` in scope SHALL be a compile error
  (E-FOREIGN-003: foreign code block has no `lang=` declaration in any ancestor `<program>`).
- The compiler SHALL NOT interpret or modify the foreign code content. It SHALL pass the
  verbatim source slice to the declared external toolchain.

### 23.2.2 AST Representation

The TAB stage (Stage 3) SHALL produce an AST node of type `ForeignBlock` for each `_{}` block:

```
ForeignBlock {
    level: number          // count of '=' characters in the level mark
    lang: string           // resolved from closest ancestor <program lang=...>
    raw: string            // verbatim content between opener and closer
    span: SourceSpan       // position of the opener in the source file
    programRef: ProgramId  // ID of the governing <program> node
}
```

All downstream pipeline stages (PA, RI, TS, DG) SHALL skip `ForeignBlock` nodes. CG SHALL
hand off the `raw` content and `lang` to the external toolchain invocation.

### 23.2.3 Pipeline Stage Contracts

| Stage | Behavior for `ForeignBlock` |
|-------|----------------------------|
| PP (Preprocessor) | No action — `_{}` blocks are not macro-expanded |
| BS (Block Splitter) | Detects opener, counts level markers, scans for matching closer, emits Block with `type: 'foreign'` |
| TAB | Produces `ForeignBlock` AST node; does NOT tokenize interior |
| PA | Skips `ForeignBlock` nodes |
| RI | Skips `ForeignBlock` nodes — foreign code does not affect route analysis |
| TS | Skips `ForeignBlock` nodes — no type checking of foreign code |
| DG | Skips `ForeignBlock` nodes |
| CG | Extracts `raw` content, invokes declared external toolchain, emits toolchain output |

### 23.2.4 Valid Contexts

A `_{}` foreign code block is valid ONLY as a direct child of a `<program>` element. It is
NOT valid inside:
- Logic contexts (`${}`)
- SQL contexts (`?{}`)
- CSS contexts (`#{}`)
- Meta contexts (`^{}`)
- Markup element bodies (as a child of `<div>`, `<span>`, etc.)

A `_{}` block in any invalid context SHALL be a compile error (E-FOREIGN-004: foreign code
block is not valid in this context; it must be a direct child of a `<program>` element).

### 23.2.5 Worked Examples

**Valid — Go sidecar, level-1 (recommended):**

```scrml
<program>
    <program name="api" lang="go"
        build="go build -o ./bin/api ./cmd/api"
        port=9000
        health="/health">
        _={
            package main

            import (
                "net/http"
                "encoding/json"
            )

            func HandleRequest(w http.ResponseWriter, r *http.Request) {
                json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
            }
        }=
    /
/
```

**Valid — level-2 for foreign code containing `}=`:**

```scrml
<program name="proc" lang="zig">
    _=={
        const std = @import("std");
        // This contains }= literally in a comment:
        // closing marker would be }= but we're safe at level 2
        pub fn main() void {
            std.debug.print("Hello\\n", .{});
        }
    }==
/
```

**Invalid — no `lang=` in ancestor `<program>`:**

```scrml
<program>
    _={
        package main   // Error E-FOREIGN-003
    }=
/
```

```
Error E-FOREIGN-003 at line 2: Foreign code block has no `lang=` declaration in any
ancestor `<program>`. Add `lang="go"` (or the appropriate language) to the enclosing
`<program>` element.
```

### 23.2.6 Error Conditions

| Code | Trigger | Severity |
|------|---------|---------|
| E-FOREIGN-001 | Level mismatch between `_{}` opener and closer | Error |
| E-FOREIGN-002 | `_{}` block reaches end-of-file without a matching closer | Error |
| E-FOREIGN-003 | `_{}` block has no `lang=` declaration in any ancestor `<program>` | Error |
| E-FOREIGN-004 | `_{}` block appears in an invalid context (not a direct child of `<program>`) | Error |
| W-FOREIGN-001 | Level-0 `_{` used; `_={}=` recommended | Warning |

### 23.3 Call-Char Sigils for WASM

Call-char sigils are single-character prefixes on a `{}` block that invoke a compiled WASM
function. They are syntactically identical to other scrml sigils (`${}`, `?{}`, etc.) but
their content is a function call expression targeting a foreign WASM module, not scrml code.

Call-char sigils are WASM-only. They are for client-side WASM compute kernels compiled from
languages like Rust, C, C++, and Zig. Server-side sidecar processes (Go, Python) use
`use foreign:` declarations (§23.4), not call-char sigils.

#### 23.3.1 Default Call-Char Registry

The compiler ships with a default registry mapping single characters to WASM-capable languages:

| Char | Language | Rationale |
|------|----------|-----------|
| `r`  | Rust | First letter; primary WASM language via wasm-bindgen / wasm-pack |
| `c`  | C | First letter; WASM via Emscripten |
| `C`  | C++ | Uppercase C; WASM via Emscripten |
| `z`  | Zig | First letter; native WASM output |
| `o`  | Odin | First letter; WASM target supported |
| `a`  | AssemblyScript | First letter; TypeScript-subset for WASM |

The registry is case-sensitive. `c` is C; `C` is C++. These are the only pairs where case
carries distinct meaning.

Go is NOT in the default call-char registry. Go WASM (via TinyGo) may be added via explicit
`callchar=` declaration (§23.3.2). Go is primarily a sidecar language and uses `use foreign:`
for server-side integration.

#### 23.3.2 Declaring a Call Char (Extending the Registry)

A nested `<program>` declares its call char via the `callchar=` attribute. This maps a single
character to the nested program for invocation.

```scrml
<program>
    <program name="math-kernel" lang="go" mode="wasm" callchar="g"
        build="tinygo build -o ./wasm/math.wasm -target wasm ./cmd/math"
        source="./cmd/math"/>

    ${ extern g computeFFT(data: number[]) -> number[] }

    ${ const @spectrum = g{ computeFFT(@audioData) } }
/
```

When `callchar="g"` is declared on a nested `<program>`, `g{}` in the parent scope resolves
to that program's WASM module.

**Override:** A `callchar=` declaration on a nested `<program>` overrides the default registry
for that character within the parent's scope. If a project declares `callchar="r"` on a Ruby
WASM program, `r{}` in that parent resolves to Ruby, not Rust.

#### 23.3.3 The `extern` Declaration

Before a call-char sigil can be used, the foreign function interface MUST be declared with
`extern`:

```
extern-decl ::= 'extern' call-char identifier '(' param-list? ')' '->' type
              | 'extern' call-char identifier '(' param-list? ')'
call-char   ::= single-character-identifier
param-list  ::= param (',' param)*
param       ::= identifier ':' type
```

The `extern` keyword declares: which call char the function belongs to, the function name, its
parameter types (in scrml types), and its return type. The compiler uses this declaration to
generate WASM binding glue (type marshaling, WASM memory management, result deserialization).

**Placement:** `extern` declarations MUST appear inside a `${}` logic context at file top level
(not inside a function body).

```scrml
<program>
    <program name="image-filter" lang="rust" mode="wasm"
        build="cargo build --target wasm32-unknown-unknown -p image-filter"
        source="./crates/image-filter"/>

    ${ type FilterParams:struct = { brightness: number, contrast: number, saturation: number } }
    ${ type FilterResult:struct = { pixels: number[], width: number, height: number } }

    ${ extern r applyFilter(params: FilterParams, imageData: number[]) -> FilterResult }
    ${ extern r grayscale(imageData: number[]) -> number[] }

    @brightness = 1.0
    @imageData = []

    ${ const @filtered = r{ applyFilter({ brightness: @brightness, contrast: 1.0, saturation: 1.0 }, @imageData) } }
/
```

#### 23.3.4 Normative Statements

- A call-char sigil SHALL be a single character followed immediately by `{`. The compiler
  SHALL resolve the character against the default registry (§23.3.1) and any `callchar=`
  declarations in ancestor `<program>` elements.
- An unresolved call char (not in the default registry and not declared via `callchar=`) SHALL
  be a compile error (E-WASM-001: unknown call char; check the default registry or add a
  `callchar=` attribute to the appropriate nested `<program>`).
- Every foreign function called via a call-char sigil MUST have a corresponding `extern`
  declaration. Calling a function with no `extern` declaration SHALL be a compile error
  (E-WASM-002: no `extern` declaration for function `name` using call char `x`).
- An `extern` declaration for a call char that does not resolve to any declared `<program>`
  SHALL be a compile error (E-WASM-003: `extern` declaration references call char `x` but no
  `<program>` with that call char is declared).
- Call-char sigils are client-side WASM invocations. The compiler SHALL generate
  `WebAssembly.instantiate()` loading code and type-marshaling calls for each declared
  `extern`. Call-char sigil calls SHALL appear only in client-side code paths.
- The content inside a call-char `{}` block IS scrml logic context — it may reference
  scrml variables and expressions, not foreign language syntax. The call-char sigil is a
  function call expression that happens to invoke WASM.

#### 23.3.5 Error Conditions

| Code | Trigger | Severity |
|------|---------|---------|
| E-WASM-001 | Call char not in default registry and no `callchar=` declaration | Error |
| E-WASM-002 | Call-char function called with no corresponding `extern` declaration | Error |
| E-WASM-003 | `extern` declaration references a call char with no matching `<program>` | Error |

#### 23.3.6 Worked Example — Valid (Rust image filter)

```scrml
<program>
    <program name="image-filter" lang="rust" mode="wasm"
        build="cargo build --target wasm32-unknown-unknown -p image-filter"
        source="./crates/image-filter"/>

    ${ extern r applyFilter(brightness: number, pixels: number[]) -> number[] }

    @brightness = 1.0
    @rawPixels = []

    ${ const @filtered = r{ applyFilter(@brightness, @rawPixels) } }

    <input type="range" bind:value=@brightness min=0 max=2 step=0.1/>
    <canvas width=800 height=600/>
/
```

#### 23.3.7 Sidecar Processes — `use foreign:` (not call-char sigils)

Server-side sidecar processes (Go, Python, etc.) do NOT use call-char sigils. They use
`use foreign:name { fn }` declarations. See §23.4.

The distinction:

| Mechanism | For | Runs on |
|-----------|-----|---------|
| `r{}`, `c{}`, `z{}` call chars | WASM compute kernels | Client (browser) |
| `use foreign:name { fn }` | Sidecar HTTP/socket services | Server |

### 23.4 Sidecar Process Declarations (`use foreign:`)

Server-side sidecar processes (Go, Python, and other languages whose `<program>` does not
have `mode="wasm"`) are accessed via `use foreign:name { fn }` declarations, not call-char
sigils. The `use foreign:` form is a capability import that makes sidecar functions available
in the parent scrml file's server scope.

**Syntax:**

```
use foreign:name { fn-list }
fn-list ::= identifier (',' identifier)*
```

Where `name` is the `name=` attribute of the nested `<program>` that declares the sidecar,
and `identifier` is a function name exported from that sidecar (via an `export function`
declaration inside the nested `<program>`).

**Example:**

```scrml
<program>
    <program name="ml" lang="go"
        build="go build -o ./bin/ml ./cmd/ml"
        port=9001
        health="/health">

        ${ type PredRequest:struct = { features: number[], modelId: string } }
        ${ type PredResult:struct = { prediction: number, confidence: number } }
        ${ export function predict(req: PredRequest) -> PredResult }
    /

    use foreign:ml { predict }

    ${ server function getPrediction(features, modelId) {
        return predict({ features, modelId })
    } }
/
```

**Normative statements:**

- `use foreign:name { ... }` SHALL be valid at file top level, outside any `${}` block.
- The `name` in `use foreign:name` MUST match the `name=` attribute of a nested `<program>`
  declared within the same top-level `<program>`. An unresolved name SHALL be a compile error
  (E-FOREIGN-010: `use foreign:name` does not match any nested `<program name="...">` in scope).
- Functions listed in the `{ }` block MUST have corresponding `export function` declarations
  in the named nested `<program>`. An unlisted or unexported function SHALL be a compile error
  (E-FOREIGN-011: `fn` is not exported by `<program name="name">`).
- Functions brought into scope via `use foreign:` are available only in server-escalated
  functions (§12). Calling a foreign sidecar function from client-side code SHALL be a compile
  error (E-FOREIGN-012: sidecar functions are server-side only).
- The compiler SHALL generate HTTP/socket client code for each `use foreign:` import. The
  generated client makes the declared call to the sidecar's endpoint and deserializes the
  response using the scrml type declared in the sidecar's `export function`.

#### 23.4.1 Error Conditions

| Code | Trigger | Severity |
|------|---------|---------|
| E-FOREIGN-010 | `use foreign:name` references a name that matches no nested `<program>` | Error |
| E-FOREIGN-011 | Function listed in `use foreign:` is not exported by the named sidecar | Error |
| E-FOREIGN-012 | Sidecar function called from a client-side code path | Error |

---

## 24. HTML Spec Awareness"""

content = content.replace(old_23_header, new_23_section)

# Update all subsequent section numbers (§23 -> §24, §24 -> §25, ..., §40 -> §41)
# Update the header numbers
for old_num, new_num in [
    ("## 23. HTML Spec Awareness", "## 24. HTML Spec Awareness"),
    ("## 24. CSS Variable Syntax", "## 25. CSS Variable Syntax"),
    ("## 25. Tailwind Utility Classes", "## 26. Tailwind Utility Classes"),
    ("## 26. Comment Syntax", "## 27. Comment Syntax"),
    ("## 27. Compiler Settings", "## 28. Compiler Settings"),
    ("## 28. Vanilla File Interop", "## 29. Vanilla File Interop"),
    ("## 29. Compile-Time Eval", "## 30. Compile-Time Eval"),
    ("## 30. Dependency Graph", "## 31. Dependency Graph"),
    ("## 31. The `~` Keyword", "## 32. The `~` Keyword"),
    ("## 32. The `pure` Keyword", "## 33. The `pure` Keyword"),
    ("## 33. Error Codes", "## 34. Error Codes"),
    ("## 34. Linear Types", "## 35. Linear Types"),
    ("## 35. Input State Types", "## 36. Input State Types"),
    ("## 36. Server-Sent Events", "## 37. Server-Sent Events"),
    ("## 37. WebSocket Channels", "## 38. WebSocket Channels"),
    ("## 38. Schema and Migrations", "## 39. Schema and Migrations"),
    ("## 39. Middleware and Request Pipeline", "## 40. Middleware and Request Pipeline"),
    ("## 40. Import System", "## 41. Import System"),
]:
    content = content.replace(old_num, new_num)

# Update cross-references in Table of Contents
for old_ref, new_ref in [
    ("23. [HTML Spec Awareness]", "24. [HTML Spec Awareness]"),
    ("24. [CSS Variable Syntax]", "25. [CSS Variable Syntax]"),
    ("25. [Tailwind Utility Classes]", "26. [Tailwind Utility Classes]"),
    ("26. [Comment Syntax]", "27. [Comment Syntax]"),
    ("27. [Compiler Settings]", "28. [Compiler Settings]"),
    ("28. [Vanilla File Interop]", "29. [Vanilla File Interop]"),
    ("29. [Compile-Time Evaluation", "30. [Compile-Time Evaluation"),
    ("30. [Dependency Graph]", "31. [Dependency Graph]"),
    ("31. [The `~` Keyword", "32. [The `~` Keyword"),
    ("32. [The `pure` Keyword]", "33. [The `pure` Keyword]"),
    ("33. [Error Codes]", "34. [Error Codes]"),
    ("34. [Linear Types", "35. [Linear Types"),
]:
    content = content.replace(old_ref, new_ref)

# Update §§ cross-references in normative text (careful - only update §N references
# where N >= 23 that refer to OLD §23-40, now becoming §24-41)
# This is complex; update only the most obvious ones
for old_sec, new_sec in [
    ("(§23)", "(§24)"),
    ("(§24)", "(§25)"),
    ("(§25)", "(§26)"),
    ("(§26)", "(§27)"),
    ("(§27)", "(§28)"),
    ("(§28)", "(§29)"),
    ("(§29)", "(§30)"),
    ("(§30)", "(§31)"),
    ("(§31)", "(§32)"),
    ("(§32)", "(§33)"),
    ("(§33)", "(§34)"),
    ("(§34)", "(§35)"),
    ("(§35)", "(§36)"),
    ("(§36)", "(§37)"),
    ("(§37)", "(§38)"),
    ("(§38)", "(§39)"),
    ("(§39)", "(§40)"),
    ("(§40)", "(§41)"),
]:
    content = content.replace(old_sec, new_sec)

# Update §N.X references where N >= 23 (more careful approach)
# §23.1, §23.2 etc. -> §24.1, §24.2 etc.
# But ONLY for original §23 (HTML Spec Awareness) references
# New §23 refs are freshly inserted and correct
# This is risky to automate - skip for now; document as manual step

# ================================================================
# PASS 14: Update spec header version/date
# ================================================================

content = content.replace(
    "**Version:** 0.5.0-draft\n**Date:** 2026-03-28",
    "**Version:** 0.5.1-draft\n**Date:** 2026-04-03"
)

# Update the amendments note at the top
content = content.replace(
    "> **Amendments applied:** 2026-04-02 — see `docs/spec-issues/SPEC-AMENDMENTS-2026-04-02.md` for full rationale.",
    "> **Amendments applied:** 2026-04-02 — see `docs/spec-issues/SPEC-AMENDMENTS-2026-04-02.md` for full rationale.\n> **Amendments applied:** 2026-04-03 — see `docs/changes/spec-s37-amendments/spec-amendments.md` for full rationale. S37-AM-001 through S37-AM-008."
)

# ================================================================
# Write output
# ================================================================

if content != original_content:
    with open(SPEC_PATH, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"Successfully applied S37 patches to {SPEC_PATH}")
    print("Changes made:")
    print("  - S37-AM-001: :: -> . for enum variant access throughout")
    print("  - S37-AM-002: -> => for match arm separator throughout")
    print("  - S37-AM-003: _ -> else for default match arm throughout")
    print("  - S37-AM-004: §4.11.3 is operator expanded; §18.17 added")
    print("  - S37-AM-005: New §23 Foreign Code Contexts (_{})")
    print("  - S37-AM-006: New §4.12 Nested <program> semantics")
    print("  - S37-AM-007: §8.1.1 DB driver resolution added")
    print("  - S37-AM-008: §23.3 call-char sigils + §23.4 use foreign:")
    print("  - New error codes added to §34 (was §33)")
    print("")
    print("NOTE: Section renumbering §23->§24 through §40->§41 applied to headers.")
    print("Cross-references within normative text may need manual review.")
    print("Run: bash scripts/update-spec-index.sh to regenerate SPEC-INDEX.md")
else:
    print("WARNING: No changes were made. Check that the patterns match the current SPEC.md content.")
