#!/usr/bin/env node
// apply-spec-patch-§14.js
//
// Applies three targeted changes to SPEC.md to resolve SPEC-PA-017:
//   1. Appends a note to the Status line (line 5)
//   2. Adds a §14.8 sub-entry to the TOC §14 entry (after line 31)
//   3. Inserts §14.8 section text after §14.7 (after the blank line following §14.7)
//
// Run from the project root:
//   node scripts/apply-spec-patch-§14.js
//
// Idempotent: re-running after the patch is already applied is a no-op (checks for markers).

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const SPEC_PATH = join(import.meta.dir, "..", "SPEC.md");

const STATUS_MARKER = "SPEC-PA-017";
const TOC_MARKER = "14.8 Database-Schema-Derived Types";
const SECTION_MARKER = "### 14.8 Database-Schema-Derived Types";

// ── §14.8 section text ────────────────────────────────────────────────────────

const SECTION_14_8 = `
### 14.8 Database-Schema-Derived Types

**Added:** 2026-03-26 — resolves SPEC-PA-017.

This section specifies how the TS stage (Stage 6) translates the \`ColumnDef[]\` arrays
produced by PA (Stage 4) into named struct types accessible within the lexical scope of a
\`< db>\` state block. §11.2 and PIPELINE.md Stage 4 both defer this concern here. PA
implementers produce column data; this section governs how TS consumes it.

#### 14.8.1 Type Generation

For each table named in \`tables=\` on a \`< db>\` state block, the TS stage SHALL generate
two named struct types from the PA output:

1. **Full-schema type** — a struct containing one field per column in \`fullSchema\`.
2. **Client-schema type** — a struct containing one field per column in \`clientSchema\`
   (protected fields excluded).

These types are generated at compile time. They do not exist in the source text. They are
compiler-synthesized names inserted into the scope chain of the enclosing \`< db>\` block.

The generated types are **nominal**: two independently generated types for the same table
with identical fields are distinct types and are not interchangeable. Nominality prevents
accidental cross-block mixing of database row values from different \`< db>\` blocks even when
the underlying schemas happen to be identical.

#### 14.8.2 Naming Convention

The generated type name for a table is derived from the table name by applying the following
PascalCase algorithm:

1. Split the table name on \`_\` (underscore).
2. Capitalize the first letter of each resulting segment. Leave the remaining letters
   unchanged.
3. Concatenate the segments.

**Examples:**

| Table name        | Generated type name |
|-------------------|---------------------|
| \`users\`           | \`Users\`             |
| \`user\`            | \`User\`              |
| \`UserProfiles\`    | \`UserProfiles\`      |
| \`user_profiles\`   | \`UserProfiles\`      |
| \`order_line_item\` | \`OrderLineItem\`     |
| \`ORDERS\`          | \`ORDERS\`            |

Step 2 capitalizes only the first character of each segment. If the table name contains no
underscores, the algorithm capitalizes only the first character of the whole name and leaves
the rest unchanged. A table name already in PascalCase is preserved as-is (the algorithm
produces the same result).

**Normative statements:**

- The TS stage SHALL apply the PascalCase algorithm above to every table name in \`tables=\`
  to derive the generated type name. No other naming algorithm SHALL be used.
- The algorithm is case-sensitive with respect to the input. \`users\` and \`Users\` are
  different table name strings; both produce the generated type name \`Users\`. If a database
  contains two tables that both resolve to the same generated type name within the same
  \`< db>\` block (e.g., both \`users\` and \`Users\` are listed in \`tables=\`), this SHALL be
  a compile error (E-TYPE-050).

#### 14.8.3 SQLite Type Mapping

PA's \`ColumnDef.sqlType\` is a raw string from SQLite schema introspection. TS SHALL map this
string to a scrml type according to the following rules.

**Primary mapping (exact match on SQLite storage class keyword, case-insensitive):**

| SQLite type string (case-insensitive match) | scrml type |
|---------------------------------------------|------------|
| \`INTEGER\`, \`INT\`                            | \`number\`   |
| \`TEXT\`, \`CHAR\`, \`CLOB\`, \`VARCHAR\`           | \`string\`   |
| \`REAL\`, \`FLOA\`, \`DOUB\`                      | \`number\`   |
| \`BLOB\`                                      | \`bytes\`    |
| \`NULL\`                                      | \`any\`      |
| (empty string / absent)                     | \`any\`      |

**Affinity matching:** SQLite uses type affinity rules — a declared type of \`VARCHAR(255)\`
has TEXT affinity. TS SHALL apply SQLite's own five-class affinity algorithm to map any
declared type string that does not appear in the primary mapping table:

1. If the declared type contains the substring \`INT\` (case-insensitive), the scrml type is
   \`number\`.
2. Otherwise, if the declared type contains \`CHAR\`, \`CLOB\`, or \`TEXT\`, the scrml type is
   \`string\`.
3. Otherwise, if the declared type contains \`BLOB\` or is empty, the scrml type is \`any\`.
4. Otherwise, if the declared type contains \`REAL\`, \`FLOA\`, or \`DOUB\`, the scrml type is
   \`number\`.
5. Otherwise, the scrml type is \`number\` (SQLite NUMERIC affinity default).

If after applying affinity matching the scrml type still cannot be determined — for example,
because the \`sqlType\` string contains characters that prevent any substring match — the TS
stage SHALL emit E-TYPE-051 and treat the column type as \`any\` to allow compilation to
continue.

**Nullability:** If \`ColumnDef.nullable\` is \`true\`, the scrml type for that field is
\`T | null\`, where \`T\` is the mapped type from the table above. If \`nullable\` is \`false\`,
the type is \`T\` alone.

**Normative statements:**

- The TS stage SHALL apply the affinity algorithm above to every \`ColumnDef\` in both
  \`fullSchema\` and \`clientSchema\` before generating the struct type.
- A \`ColumnDef\` with \`nullable: true\` SHALL produce a field type of \`T | null\`.
- A \`ColumnDef\` with \`nullable: false\` SHALL produce a field type of \`T\`.

#### 14.8.4 Scope Insertion

The two generated types for each table SHALL be inserted into the lexical scope of the
enclosing \`< db>\` state block. They are accessible to all code within that block and its
children according to normal lexical scoping rules.

The two views for the same table share the same generated type name. TS resolves which view
is in scope at each usage site using the \`RouteMap\` produced by RI (Stage 5):

- At a usage site inside a **server-escalated** function (per \`RouteMap\`), the name resolves
  to the full-schema type (all columns).
- At a usage site inside a **client-boundary** function (per \`RouteMap\`), the name resolves
  to the client-schema type (protected columns excluded).

There is one name in scope, not two. The TS stage performs view selection transparently
during type resolution. Developer code references the type by its single generated name
(e.g., \`Users\`); the compiler selects the appropriate struct silently.

**Normative statements:**

- The TS stage SHALL insert generated table types into the scope chain of the \`< db>\` state
  block node during the scope-building pass, before type resolution of any expression inside
  that block.
- The generated type name SHALL shadow any user-declared type with the same name in the same
  scope. If a user-declared type and a generated table type share the same name in the same
  lexical scope, this SHALL be a compile error (E-TYPE-050).
- Outside the lexical scope of the enclosing \`< db>\` block, the generated type name SHALL
  NOT be accessible. It does not leak into sibling or parent scopes.
- The TS stage SHALL use the \`RouteMap\` from RI to select the full-schema or client-schema
  view at each expression that resolves to the generated type name. This selection is
  transparent to developer code.

#### 14.8.5 Error Conditions

| Code       | Trigger                                                                                        | Severity |
|------------|-----------------------------------------------------------------------------------------------|----------|
| E-TYPE-050 | Two or more tables in \`tables=\` resolve to the same generated type name, or a generated type  | Error    |
|            | name collides with a user-declared type name in the same lexical scope.                        |          |
| E-TYPE-051 | A \`ColumnDef.sqlType\` string cannot be mapped to any scrml type after exhausting the affinity | Warning  |
|            | algorithm of §14.8.3. The column is typed \`any\` and compilation continues.                   |          |

**E-TYPE-050 detail:** This error fires in two distinct cases:

- Two tables in the same \`< db>\` block resolve to the same PascalCase name (e.g., both
  \`users\` and \`Users\` are listed in \`tables=\`). The compiler SHALL list both offending
  table names in the error message.
- A user-declared type in the enclosing scope has the same name as a generated table type.
  The compiler SHALL identify both the user declaration span and the \`< db>\` block span.

**E-TYPE-051 detail:** Unrecognized SQLite types are a warning, not an error, because SQLite
allows arbitrary type strings and the affinity algorithm handles most real-world cases. The
warning informs the developer that a column will be typed \`any\` and may lose static safety.
The compiler SHOULD include the offending \`sqlType\` string and the table/column name in the
warning message.

#### 14.8.6 Worked Examples

**Valid — full schema in server function, client schema in markup:**
\`\`\`scrml
< db src="auth.sql" protect="passwordHash" tables="users">
    ${ function displayName(userId) {
        // Client-boundary function. Users resolves to client schema.
        // In scope: Users = { id: number, email: string, createdAt: string }
        let user = ?{\`SELECT id, email FROM users WHERE id = \${userId}\`}.first();
        return user.email;
    } }
    ${ server function authenticate(email, password) {
        // Server-escalated (explicit annotation). Users resolves to full schema.
        // In scope: Users = { id: number, email: string, passwordHash: string, createdAt: string }
        let user = ?{\`SELECT passwordHash FROM users WHERE email = \${email}\`}.first();
        return verifyHash(password, user.passwordHash);
    } }
/
\`\`\`

\`displayName\` is client-boundary. TS resolves \`Users\` to the client schema. Any attempt to
access \`user.passwordHash\` inside \`displayName\` is E-PROTECT-001 (field does not exist on
client type). \`authenticate\` is server-escalated. TS resolves \`Users\` to the full schema.
The access is valid.

**Invalid — duplicate generated type name (E-TYPE-050):**
\`\`\`scrml
< db src="app.sql" tables="users, Users">
\`\`\`
Both \`users\` and \`Users\` resolve to the generated type name \`Users\` via the PascalCase
algorithm. The TS stage SHALL emit:

> E-TYPE-050: Tables \`users\` and \`Users\` both produce the generated type name \`Users\`
> within the same \`< db>\` block. Rename one of the listed table entries to eliminate the
> collision, or adjust the schema.

#### 14.8.7 Interaction Notes

- **§11.3.3 (server-escalated functions):** The view selection rule in §14.8.4 is the
  concrete TS mechanism implementing §11.3.3's requirement that server-escalated functions
  receive the full type. §14.8.4 is authoritative on the TS mechanics; §11.3.3 is
  authoritative on the security intent.
- **§12 (Route Inference):** TS consumes the \`RouteMap\` from RI to perform view selection.
  TS does not re-perform route inference.
- **§14.3 (Struct Types):** Generated table types are struct types in the sense of §14.3,
  but they are compiler-synthesized. Developer code SHALL NOT declare or extend a generated
  table type.
- **§8 (SQL Contexts):** SQL query result types are inferred using the generated table types.
  A \`?{ SELECT id, email FROM users }\` context produces a struct containing only the
  selected columns, derived from the appropriate \`Users\` view per §14.8.4.
- **Multiple \`< db>\` blocks (§11.7):** Each \`< db>\` block has its own independent generated
  types. Two blocks that both list \`users\` produce two independent \`Users\` types with
  nominal distinctness. They are not the same type even if the schemas are identical.
`;

// ── Patch logic ───────────────────────────────────────────────────────────────

let src = readFileSync(SPEC_PATH, "utf8");

// Guard: already patched?
if (src.includes(SECTION_MARKER)) {
  console.log("SPEC.md already contains §14.8. No changes made.");
  process.exit(0);
}

// Change 1: append to Status line
const STATUS_OLD = `(11 blocking issues resolved)`;
const STATUS_NEW = `(11 blocking issues resolved); §14.8 added 2026-03-26 resolving SPEC-PA-017 (ColumnDef[] to named type)`;
if (!src.includes(STATUS_OLD)) {
  console.error("ERROR: Could not find Status line anchor. Aborting.");
  process.exit(1);
}
src = src.replace(STATUS_OLD, STATUS_NEW);

// Change 2: add §14.8 TOC sub-entry after §14 TOC line
const TOC_OLD = `14. [Type System](#14-type-system)`;
const TOC_NEW = `14. [Type System](#14-type-system)
    - [14.8 Database-Schema-Derived Types](#148-database-schema-derived-types)`;
if (!src.includes(TOC_OLD)) {
  console.error("ERROR: Could not find TOC §14 entry. Aborting.");
  process.exit(1);
}
src = src.replace(TOC_OLD, TOC_NEW);

// Change 3: insert §14.8 after the blank line that ends §14.7, before the '---' that opens §15
// The anchor is the exact text ending §14.7:
const ANCHOR = `- Component bare props follow \`asIs\` rules: the compiler infers the concrete type constraint from how the prop is used inside the component body (Section 15.2).\n\n---`;
const REPLACEMENT = `- Component bare props follow \`asIs\` rules: the compiler infers the concrete type constraint from how the prop is used inside the component body (Section 15.2).\n${SECTION_14_8}\n---`;
if (!src.includes(ANCHOR)) {
  console.error("ERROR: Could not find §14.7 anchor text. Aborting.");
  process.exit(1);
}
src = src.replace(ANCHOR, REPLACEMENT);

writeFileSync(SPEC_PATH, src, "utf8");
console.log("SPEC.md patched successfully. §14.8 inserted, TOC updated, Status updated.");
