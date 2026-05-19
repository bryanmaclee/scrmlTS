/**
 * @module codegen/emit-schema-for
 *
 * §41.15 (S104) — schemaFor type-driven SQL DDL generation: AST-level expansion.
 *
 * `${ schemaFor(StructType[, options]) }` interpolated inside a `<schema>`
 * block is the THIRD general-position member of the §53.14 type-as-argument
 * family (after parseVariant §41.13 + formFor §41.14). The type-system stage
 * recognizes the call expression, validates it against the file's struct
 * typeRegistry (and the other 7 normative error codes per §41.15.1, §41.15.4,
 * §41.15.7, §41.15.8), then calls into this module's `expandSchemaFor()` to
 * produce the equivalent `<schema>` `table-declaration` fragment using the
 * shared-core vocabulary (§39.5.7). The existing `<schema>` parser
 * (schema-differ.js) then lowers the fragment to SQL DDL per §39.5.8.
 *
 * **Approach A — source-level expansion** per SPEC §41.15.9 step 6 + the
 * Pillar-5 readability invariant. The expander produces a `text` AST node
 * whose value is the synthesized table-declaration body (in canonical
 * scrml schema syntax). The downstream `scrml migrate` consumer ingests
 * the text identically to hand-authored content.
 *
 * Output shape (per SPEC §41.15.6 worked example):
 *
 *   <schema>${ schemaFor(Task) }</>
 *
 * where
 *
 *   type Task:struct = {
 *       name:   string req length(<=80)
 *       status: Status req
 *   }
 *   type Status:enum = { Pending, Active, Archived }
 *
 * expands to the text:
 *
 *   tasks {
 *       name:   text req length(<=80)
 *       status: text req oneOf(["Pending", "Active", "Archived"])
 *   }
 *
 * which §39.5.8 lowers to `TEXT NOT NULL CHECK (status IN (...))`.
 *
 * The flagship enum-lowering (per OQ-SCH-12) is in `lowerFieldToSharedCore`:
 * bare-variant enum-typed fields automatically lower to
 * `text req oneOf([<variant-name-string>, ...])` — closing the enum-
 * knowledge-loss-at-DB-boundary gap that hand-authored `<schema>` blocks
 * leave open.
 *
 * Cross-references:
 *   §41.15      — schemaFor (canonical surface + 8 normative error codes)
 *   §41.15.2    — pluralization rule (lowercase + trailing `s`)
 *   §41.15.5    — predicate → SQL CHECK lowering
 *   §41.15.6    — enum-typed field lowering (the flagship)
 *   §41.15.9    — compile-time recognition (the recognition pattern)
 *   §39.5.7     — shared-core vocabulary (the emit form)
 *   §39.5.8     — SQL DDL lowering rules
 *   §53.14.3    — type-as-argument family roster (member #3)
 *   §53.14.5    — compile-time recognition (general pattern)
 *   §41.13      — parseVariant (family member #1, CallExpression precedent)
 *   §41.14      — formFor (family member #2, validator-clause parsing reused)
 */

import { parseValidatorClauses, type FormForValidator } from "./emit-form-for.ts";

// ---------------------------------------------------------------------------
// Mirror types — accept structurally to avoid a cross-module type dependency.
// Keep these in sync with §41.15.2.
// ---------------------------------------------------------------------------

/** Resolved struct type — mirror of `StructType` from type-system.ts. */
export interface SchemaForStructLike {
  kind: "struct";
  name: string;
  /**
   * `Map<fieldName, fieldType>` — value's `kind` is "primitive" | "predicated"
   * | "struct" | "enum" | "array" | "asIs" | ...
   *
   * For v1.0 the field-type kinds we consume are:
   *   - `primitive` — `kind:"primitive", name:"string"|"number"|"integer"|"boolean"`
   *   - `predicated` — `kind:"predicated", baseType:"string"|"number"|...` (predicates
   *      are in the raw clause text; we re-parse via `parseValidatorClauses`)
   *   - `enum` — `kind:"enum", name:"...", variants:[{name, payload}]`
   *   - `struct` — nested struct (rejected with E-SCHEMAFOR-NESTED-STRUCT-NO-FK-V1)
   *   - `array`, `asIs`, `union`, `not`, function shapes — rejected with
   *      E-SCHEMAFOR-NO-SQL-MAPPING (no v1.0 SQL mapping exists)
   */
  fields: Map<string, unknown>;
}

/**
 * Per-field metadata produced by the type-system pass and consumed by the
 * expander. The walker validates each field's type-mappability + records
 * the necessary metadata; the expander walks `includedFields` to produce
 * per-field text lines.
 */
export interface SchemaForFieldInfo {
  /** Field name verbatim from the struct body — e.g. "email", "createdAt". */
  name: string;
  /** SQL column type per §41.15.5 mapping (after predicate-base resolution). */
  columnType: SchemaColumnType;
  /** Parsed validator clauses from the raw struct-body text. */
  validators: FormForValidator[];
  /**
   * When the field's resolved type is a bare-variant enum, the variants are
   * captured here so the emitter can produce the `oneOf([variant-names...])`
   * predicate per §41.15.6 (the flagship). Empty otherwise.
   */
  bareVariantNames: string[];
}

/**
 * SQL column types recognized by `schema-differ.js` per §41.15.5 + §39.5.8.
 * Each maps to a §39.5.8 lowering target (SQLite/Postgres/MySQL via driver).
 */
export type SchemaColumnType =
  | "text"
  | "integer"
  | "real"
  | "boolean"
  | "timestamp"
  | "blob";

/**
 * Pipeline-input contract for the expander. Built by the type-system stage
 * after all validation passes; if any required validation failed, no
 * expansion happens (the call-node is annotated `schemaForInvalid: true`
 * and left in place so the unreachable runtime stub fires if codegen
 * proceeds despite the TS error).
 */
export interface SchemaForExpansion {
  /** Pluralized table name per §41.15.2 — `User` → `users`. */
  tableName: string;
  /** Original struct type name (used for diagnostics). */
  structName: string;
  /** Ordered list of included fields (post-pick/omit). */
  includedFields: SchemaForFieldInfo[];
  /** Source span of the original schemaFor call, propagated to the synth text node. */
  span: unknown;
}

// ---------------------------------------------------------------------------
// Pluralization — §41.15.2 verbatim "lowercase + trailing `s`".
//
// SPEC §41.15.2 is authoritative; the deep-dive's snake_case framing is
// SUPERSEDED. `User → users`, `LoadAssignment → loadassignments`. Known
// irregulars (`Person → persons`, `Child → childs`) accepted as imperfect.
// `@table("name")` annotation is RESERVED for v1.next.
// ---------------------------------------------------------------------------

/**
 * Pluralize a struct name per SPEC §41.15.2:
 *   1. Lowercase the entire identifier.
 *   2. If it does not already end with `s`, append `s`.
 *
 * Examples:
 *   "User"           → "users"
 *   "LoadAssignment" → "loadassignments"
 *   "Person"         → "persons"        (intentionally imperfect — irregular)
 *   "Child"          → "childs"         (intentionally imperfect — irregular)
 *   "News"           → "news"           (already ends in `s` — unchanged after lowercase)
 *   "Status"         → "status"         (already ends in `s`)
 */
export function pluralizeStructName(structName: string): string {
  if (!structName) return structName;
  const lower = structName.toLowerCase();
  if (lower.endsWith("s")) return lower;
  return lower + "s";
}

// ---------------------------------------------------------------------------
// SQL-mapping classification — per §41.15.5 type table + §41.15.8 reject set.
//
// Returns:
//   { kind: "ok", columnType } — field maps to a SQL column type cleanly
//   { kind: "nested-struct" } — field's type is `:struct` (E-SCHEMAFOR-NESTED-STRUCT-NO-FK-V1)
//   { kind: "payload-enum", enumName } — field's type is a payload-bearing enum
//     (E-SCHEMAFOR-VARIANT-PAYLOAD-ENUM-V1)
//   { kind: "bare-enum", enumName, variants } — field's type is a bare-variant enum
//     (lowered to `text req oneOf([variants...])` per §41.15.6 — the flagship)
//   { kind: "no-mapping", typeKind } — field type has no v1.0 SQL mapping
//     (E-SCHEMAFOR-NO-SQL-MAPPING)
// ---------------------------------------------------------------------------

export type SqlMappingResult =
  | { kind: "ok"; columnType: SchemaColumnType }
  | { kind: "nested-struct" }
  | { kind: "payload-enum"; enumName: string }
  | { kind: "bare-enum"; enumName: string; variants: string[] }
  | { kind: "no-mapping"; typeKind: string };

/**
 * Classify a struct-field's resolved type against the v1.0 SQL-mapping table.
 *
 * Caller's responsibility: dispatch the result kind to the appropriate
 * error code (or to the OK path which threads `columnType` into the per-
 * field emission).
 */
export function classifyFieldForSql(fieldType: unknown): SqlMappingResult {
  if (!fieldType || typeof fieldType !== "object") {
    return { kind: "no-mapping", typeKind: typeof fieldType };
  }
  const t = fieldType as { kind?: string; name?: string; baseType?: string; variants?: Array<{ name?: string; payload?: unknown }>; element?: unknown };

  // Nested struct — v1.0 has no FK derivation (OQ-SCH-4 ratified out-of-scope).
  if (t.kind === "struct") {
    return { kind: "nested-struct" };
  }

  // Enum — bare-variant lowers to oneOf; payload-bearing rejects.
  if (t.kind === "enum") {
    const enumName = t.name ?? "<unnamed-enum>";
    const variants = Array.isArray(t.variants) ? t.variants : [];
    // Payload-bearing detection: a variant with a non-null `payload` Map of
    // non-zero size is payload-bearing. Per type-system.ts §41.13's parseVariant
    // shape: `variant.payload` is `Map<string, ResolvedType>` for payload-
    // bearing variants and `null` (or empty Map) for unit variants.
    let isPayloadBearing = false;
    for (const v of variants) {
      const pl = (v as { payload?: unknown }).payload;
      if (pl && typeof pl === "object") {
        if (pl instanceof Map) {
          if (pl.size > 0) { isPayloadBearing = true; break; }
        } else if (Array.isArray(pl) && pl.length > 0) {
          isPayloadBearing = true;
          break;
        } else if (typeof pl === "object" && Object.keys(pl as Record<string, unknown>).length > 0) {
          isPayloadBearing = true;
          break;
        }
      }
    }
    if (isPayloadBearing) {
      return { kind: "payload-enum", enumName };
    }
    const names: string[] = variants
      .map(v => (v?.name ?? "") as string)
      .filter(n => n.length > 0);
    return { kind: "bare-enum", enumName, variants: names };
  }

  // Primitive — direct mapping per §41.15.5.
  if (t.kind === "primitive") {
    const cm = mapPrimitiveToColumnType(t.name);
    if (cm) return { kind: "ok", columnType: cm };
    return { kind: "no-mapping", typeKind: `primitive:${t.name ?? "<unknown>"}` };
  }

  // Predicated — fall through to baseType.
  if (t.kind === "predicated") {
    const cm = mapPrimitiveToColumnType(t.baseType);
    if (cm) return { kind: "ok", columnType: cm };
    return { kind: "no-mapping", typeKind: `predicated:${t.baseType ?? "<unknown>"}` };
  }

  // Array, asIs, union, not, function, snippet, opaque — no v1.0 mapping.
  return { kind: "no-mapping", typeKind: t.kind ?? "<unknown>" };
}

/**
 * Map a scrml primitive type name to a SQL column type per §41.15.5 table.
 *
 *   string    → text
 *   int       → integer    (also `integer`)
 *   number    → real
 *   boolean   → boolean
 *   timestamp → timestamp
 *   blob      → blob
 *
 * Returns null when the primitive is not in the v1.0 mapping table.
 */
function mapPrimitiveToColumnType(name: string | undefined): SchemaColumnType | null {
  switch (name) {
    case "string":     return "text";
    case "int":
    case "integer":    return "integer";
    case "number":
    case "float":
    case "real":       return "real";
    case "boolean":    return "boolean";
    case "timestamp":  return "timestamp";
    case "blob":       return "blob";
    default:           return null;
  }
}

// ---------------------------------------------------------------------------
// Per-field text emission.
// ---------------------------------------------------------------------------

/**
 * Render a single validator back into its source-form predicate text.
 *
 *   { name: "req", argsRaw: null }              → "req"
 *   { name: "length", argsRaw: ">=2" }          → "length(>=2)"
 *   { name: "pattern", argsRaw: "/^@/" }        → "pattern(/^@/)"
 *   { name: "oneOf", argsRaw: '"a","b"' }       → 'oneOf(["a","b"])'  (rewrapped in brackets if not already)
 *
 * Whitespace inside argsRaw is preserved verbatim.
 */
export function renderValidator(v: FormForValidator): string {
  if (v.argsRaw == null) return v.name;
  // `oneOf` / `notIn` argsRaw is typically already a `[...]` shape from the
  // struct-body text. If the user wrote `oneOf(["a","b"])` then argsRaw is
  // `["a","b"]`. If they wrote `oneOf("a","b")` (unusual), argsRaw is
  // `"a","b"` — we re-bracket it for predictable downstream SQL lowering
  // through schema-differ's `oneOf` → `CHECK col IN (...)` rule.
  if (v.name === "oneOf" || v.name === "notIn") {
    const s = v.argsRaw.trim();
    if (!s.startsWith("[") || !s.endsWith("]")) {
      return `${v.name}([${v.argsRaw}])`;
    }
  }
  return `${v.name}(${v.argsRaw})`;
}

/**
 * Render a SchemaForFieldInfo as a single shared-core column line per
 * §41.15.5 + §41.15.6 worked examples.
 *
 *   { name: "email", columnType: "text", validators: [{req}, {length(<=120)}] }
 *     → "email: text req length(<=120)"
 *
 *   { name: "status", columnType: "text", validators: [{req}], bareVariantNames: ["Pending","Active"] }
 *     → 'status: text req oneOf(["Pending", "Active"])'
 *
 * The flagship enum-lowering happens here per §41.15.6: when
 * `bareVariantNames` is non-empty, an `oneOf([...])` predicate is injected
 * AFTER the user-authored predicates. If `oneOf` already appears in the
 * user-authored predicates, the auto-injected one is omitted (defensive —
 * user may have hand-narrowed the variant set on the field, in which case
 * we honor the user's narrower set over the full enum).
 */
export function lowerFieldToSharedCore(field: SchemaForFieldInfo): string {
  const parts: string[] = [field.columnType];
  // Render existing validators.
  const seenNames = new Set<string>();
  for (const v of field.validators) {
    parts.push(renderValidator(v));
    seenNames.add(v.name);
  }
  // Enum-lowering injection per §41.15.6 — only when user did not provide
  // their own oneOf/notIn narrowing.
  // Per SPEC §39.5.8 worked example (line 17090): the SQL-side lowering uses
  // single-quoted string literals — `CHECK (col IN ('Pending', 'Active', ...))`.
  // schema-differ's stripArrayLiteral passes the verbatim contents through
  // to the SQL IN clause; emitting single-quoted strings yields canonical SQL.
  if (field.bareVariantNames.length > 0
      && !seenNames.has("oneOf")
      && !seenNames.has("notIn")) {
    const variantList = field.bareVariantNames.map(n => `'${n}'`).join(", ");
    parts.push(`oneOf([${variantList}])`);
  }
  return `${field.name}: ${parts.join(" ")}`;
}

// ---------------------------------------------------------------------------
// Table-declaration assembly.
// ---------------------------------------------------------------------------

/**
 * Produce the shared-core table-declaration body text per §41.15.2.
 *
 * The result is a text fragment that the existing `<schema>` parser
 * (schema-differ.js) ingests identically to hand-authored content:
 *
 *   <tableName> {
 *       <field-1>: <columnType> <constraints>
 *       <field-2>: <columnType> <constraints>
 *       ...
 *   }
 *
 * The indentation uses 4 spaces (matching `examples/17-schema-migrations.scrml`
 * conventions). Trailing newline included so multiple `schemaFor(...)` calls
 * in the same `<schema>` block render cleanly when concatenated.
 */
export function expandSchemaFor(exp: SchemaForExpansion): string {
  const lines: string[] = [];
  lines.push(`${exp.tableName} {`);
  for (const field of exp.includedFields) {
    lines.push(`    ${lowerFieldToSharedCore(field)}`);
  }
  lines.push(`}`);
  // Trailing newline so multi-table composition reads cleanly when
  // schema-differ's parser scans `<tableName> { ... }` blocks.
  return lines.join("\n") + "\n";
}
