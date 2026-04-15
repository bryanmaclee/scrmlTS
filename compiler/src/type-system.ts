/**
 * Type System — Stage 6 of the scrml compiler pipeline (TS).
 *
 * Sub-stages implemented here:
 *   TS-A  Scope chain construction + identifier resolution
 *   TS-B  Type registry + struct/enum resolution + DB-schema-derived types + state type registry
 *   TS-C  Pattern matching exhaustiveness (checkEnumExhaustiveness, checkUnionExhaustiveness)
 *   TS-F  Pure function purity constraint verification
 *   TS-G  Linear type enforcement (lin + ~)
 *
 * Sub-stages NOT implemented here (deferred):
 *   TS-D  Component shape checking
 *   TS-H  Meta block type checking
 *
 * Input:
 *   { files: FileAST[], protectAnalysis: ProtectAnalysis, routeMap: RouteMap }
 *
 * Output:
 *   { files: TypedFileAST[], errors: TSError[] }
 *
 * TypedFileAST = FileAST & {
 *   nodeTypes:       Map<NodeId, ResolvedType>,
 *   componentShapes: Map<string, ComponentShape>,
 *   scopeChain:      ScopeChain,
 * }
 *
 * The type registry is a Map<string, TypeDef> — a simple lookup table.
 * No type inference. No unification. Types come from declarations and db schema only.
 *
 * Error codes produced:
 *   E-SCOPE-001  Unquoted identifier attribute value cannot be resolved in current scope
 *   E-TYPE-004   Struct field does not exist on type
 *   E-TYPE-006   Non-exhaustive match over union type (missing member)
 *   E-TYPE-020   Non-exhaustive match over enum type (missing variant)
 *   E-TYPE-023   Duplicate arm for the same variant
 *   E-TYPE-050   Two tables (or a table + user type) produce the same generated type name
 *   E-TYPE-051   ColumnDef.sqlType not mappable; typed asIs (warning)
 *   E-TYPE-052   InitCap algorithm produces an invalid scrml identifier from a table name
 *   W-MATCH-001  Redundant wildcard arm when all variants already covered (warning)
 *   E-LIN-001    lin variable not consumed before scope exit
 *   E-LIN-002    lin variable consumed more than once (or inside a loop)
 *   E-LIN-003    lin variable consumed in some branches but not others
 *   E-MARKUP-002 Known attribute with wrong type on markup element
 *   E-MARKUP-003 Unknown attribute on HTML element (warning for data- and aria- prefixed)
 *   E-STATE-004  Unknown attribute on user-defined state type
 *   E-STATE-005  State type name collides with HTML element name
 *   E-STATE-006  Duplicate state type definition
 *   E-MU-001     tilde-decl variable declared but never used before scope exit
 *   E-TILDE-001  ~ read without initialization
 *   E-TILDE-002  ~ reinitialized without consumption (or unconsumed at scope exit)
 *   E-TYPE-081   `partial match` in rendering or lift context
 *   E-ERROR-001  fail used in non-! function
 *   E-ERROR-002  ! function result not handled (no match, ?, !{}, or boundary)
 *   E-ERROR-003  ? propagation used in non-! function
 *   E-ERROR-004  ? applied to non-! function call (callee is known non-failable)
 *   E-ERROR-008  User-defined error type declares reserved field 'message' or 'type'
 *   E-CONTRACT-001  §53 Inline predicate constraint violated at compile time
 *   E-CONTRACT-002  §53 Named shape not found in registry
 *   E-CONTRACT-003  §53 Predicate references external reactive variable
 *   E-MACHINE-010  §51.2 'given' guard in type-level transitions block (not permitted)
 *   E-MACHINE-004  §51.2 Transition rule references unknown variant name
 *
 * What TS does NOT do (this file):
 *   - No code generation.
 *   - No async scheduling or dependency graph construction.
 *   - No SQL query execution or validation.
 *   - No route assignment (consumed from RouteMap).
 *   - No BareExpr body resolution (completed by BPP).
 *   - No meta block type checking (TS-H).
 *
 * Performance budget: <= 20 ms per file.
 */

import { getElementShape, getAllElementNames } from "./html-elements.js";
import { forEachIdentInExprNode, classifyLiteralFromExprNode, exprNodeContainsCall, emitStringFromTree } from "./expression-parser.ts";

// ---------------------------------------------------------------------------
// Internal span type (mirrors ast.ts Span)
// ---------------------------------------------------------------------------

interface Span {
  file: string;
  start: number;
  end: number;
  line: number;
  col: number;
}

// ---------------------------------------------------------------------------
// ResolvedType discriminated union
// ---------------------------------------------------------------------------

interface PrimitiveType {
  kind: "primitive";
  name: string;
}

interface StructType {
  kind: "struct";
  name: string;
  fields: Map<string, ResolvedType>;
}

interface EnumType {
  kind: "enum";
  name: string;
  variants: VariantDef[];
  // §51.2 — null means no transitions block (unrestricted enum)
  transitionRules: TransitionRule[] | null;
}

interface ArrayType {
  kind: "array";
  element: ResolvedType;
}

interface UnionType {
  kind: "union";
  members: ResolvedType[];
}

interface AsIsType {
  kind: "asIs";
  constraint: ResolvedType | null;
}

interface UnknownType {
  kind: "unknown";
}

// §42 — absence value type (replaces null/undefined in scrml source)
interface NotType {
  kind: "not";
}

// §14.9 — deferred parameterisable markup fragment
interface SnippetType {
  kind: "snippet";
  paramType: ResolvedType | null;  // null for zero-parameter snippet
  optional: boolean;
}

interface StateType {
  kind: "state";
  name: string;
  attributes: Map<string, AttributeShapeDef>;
  isHtml: boolean;
  rendersToDom: boolean;
  constructorBody: ASTNodeLike[] | null;
  // §52 State Authority
  authority?: "server" | "local";
  tableName?: string | null;
}

interface ErrorType {
  kind: "error";
  name: string;
  fields: Map<string, ResolvedType>;
}

interface HtmlElementType {
  kind: "html-element";
  tag: string;
  attrs: Record<string, unknown>;
}

interface CssClassType {
  kind: "cssClass";
}

interface FunctionType {
  kind: "function";
  name: string;
  params: unknown[];
  returnType: ResolvedType;
}

interface MetaSpliceType {
  kind: "meta-splice";
  resultType: ResolvedType;
  parentContext: string;
}

interface RefBindingType {
  kind: "ref-binding";
  resolvedType: ResolvedType;
  domInterface: string;
}

// ---------------------------------------------------------------------------
// §53 — Inline Type Predicates
// ---------------------------------------------------------------------------

// Predicate expression — recursive representation of the boolean expression
// inside the outer parens of a predicated type annotation.
interface PredicateExpr {
  kind: "comparison" | "property" | "named-shape" | "and" | "or" | "not" | "error";
  op?: string;               // comparison / property
  value?: number | string;   // comparison / property
  prop?: string;             // property
  name?: string;             // named-shape
  left?: PredicateExpr;      // and / or
  right?: PredicateExpr;     // and / or
  operand?: PredicateExpr;   // not
  message?: string;          // error
  hasExternalRef?: boolean;  // set when predicate references @identifier
}

interface PredicatedType {
  kind: "predicated";
  baseType: "number" | "string" | "boolean" | "integer";
  predicate: PredicateExpr;
  label: string | null;
}

type ResolvedType =
  | PrimitiveType
  | StructType
  | EnumType
  | ArrayType
  | UnionType
  | AsIsType
  | UnknownType
  | StateType
  | ErrorType
  | HtmlElementType
  | CssClassType
  | FunctionType
  | MetaSpliceType
  | RefBindingType
  | NotType
  | SnippetType
  | PredicatedType;

// ---------------------------------------------------------------------------
// Variant definition
// ---------------------------------------------------------------------------

interface VariantDef {
  name: string;
  payload: Map<string, ResolvedType> | null;
  renders: { markup: string } | null;
}

// §51.3 — Machine type (named override graph for an enum/struct type)
interface MachineType {
  kind: "machine";
  name: string;                  // machine name (PascalCase)
  governedTypeName: string;      // the enum or struct type this governs
  governedType: ResolvedType | null; // resolved after registry lookup
  rules: TransitionRule[];       // machine-level rules (guards permitted)
}

// §51.2 — Transition rule (from a type-level transitions {} block inside an enum)
interface TransitionRule {
  from: string;         // variant name (without leading dot/::), or "*" for wildcard
  to: string;           // variant name (without leading dot/::), or "*" for wildcard
  guard: string | null; // type-level: always null (guards → E-MACHINE-010)
  label: string | null; // optional [label] suffix
  effectBody: string | null; // raw effect block body (Phase 3B+)
}

// ---------------------------------------------------------------------------
// Attribute shape definition (for state types)
// ---------------------------------------------------------------------------

interface AttributeShapeDef {
  type: string;
  required: boolean;
  default: unknown;
}

// ---------------------------------------------------------------------------
// Scope entry
// ---------------------------------------------------------------------------

interface ScopeEntry {
  kind: string;
  resolvedType: ResolvedType;
  isPure?: boolean;
  fullType?: ResolvedType;
  clientType?: ResolvedType;
  domInterface?: string;
}

// ---------------------------------------------------------------------------
// Generic AST node (opaque — we only use duck-typed fields)
// ---------------------------------------------------------------------------

type ASTNodeLike = Record<string, unknown> & { kind?: string; span?: Span; id?: number };

// ---------------------------------------------------------------------------
// Input/output types
// ---------------------------------------------------------------------------

interface FileAST extends Record<string, unknown> {
  filePath: string;
  nodes?: ASTNodeLike[];
  typeDecls?: ASTNodeLike[];
}

interface ProtectAnalysis {
  views: Map<string, DBTypeViews>;
}

interface DBTypeViews {
  stateBlockId?: string;
  dbPath?: string;
  tables: Map<string, TableTypeView>;
}

interface TableTypeView {
  tableName?: string;
  fullSchema?: ColumnDef[];
  clientSchema?: ColumnDef[];
  protectedFields?: Set<string>;
}

interface ColumnDef {
  name: string;
  sqlType: string;
  nullable: boolean;
  isPrimaryKey?: boolean;
}

interface RouteMap {
  functions: Map<string, { boundary: "server" | "client" }>;
}

interface TypedFileAST extends FileAST {
  nodeTypes: Map<string, ResolvedType>;
  componentShapes: Map<string, unknown>;
  scopeChain: ScopeChain;
  stateTypeRegistry: Map<string, ResolvedType>;
  overloadRegistry: Map<string, Map<string, ASTNodeLike>>;
}

// ---------------------------------------------------------------------------
// Error type
// ---------------------------------------------------------------------------

export class TSError {
  code: string;
  message: string;
  span: Span;
  severity: "error" | "warning";

  constructor(
    code: string,
    message: string,
    span: Span,
    severity: "error" | "warning" = "error",
  ) {
    this.code = code;
    this.message = message;
    this.span = span;
    this.severity = severity;
  }
}

// ---------------------------------------------------------------------------
// ResolvedType constructors
//
// These are plain objects — no class hierarchy. Discriminated by `.kind`.
// ---------------------------------------------------------------------------

function tPrimitive(name: string): PrimitiveType {
  return { kind: "primitive", name };
}

function tStruct(name: string, fields: Map<string, ResolvedType>): StructType {
  return { kind: "struct", name, fields };
}

function tEnum(name: string, variants: VariantDef[], transitionRules: TransitionRule[] | null = null): EnumType {
  return { kind: "enum", name, variants, transitionRules };
}

function tArray(element: ResolvedType): ArrayType {
  return { kind: "array", element };
}

function tUnion(members: ResolvedType[]): UnionType {
  return { kind: "union", members };
}

function tAsIs(constraint: ResolvedType | null = null): AsIsType {
  return { kind: "asIs", constraint };
}

function tUnknown(): UnknownType {
  return { kind: "unknown" };
}

// §42 — absence value constructor
function tNot(): NotType {
  return { kind: "not" };
}

// §53 — predicated type constructor
function tPredicated(
  baseType: "number" | "string" | "boolean" | "integer",
  predicate: PredicateExpr,
  label: string | null = null,
): PredicatedType {
  return { kind: "predicated", baseType, predicate, label };
}

// §14.9 — snippet constructor
function tSnippet(paramType: ResolvedType | null = null, optional: boolean = false): SnippetType {
  return { kind: "snippet", paramType, optional };
}

/**
 * State type — a named, typed record that defines the shape of a markup scope.
 * Per §35.1: HTML elements are pre-defined state types; user-defined state types
 * use the same mechanism.
 */
function tState(
  name: string,
  attributes: Map<string, AttributeShapeDef>,
  isHtml = false,
  rendersToDom = false,
  constructorBody: ASTNodeLike[] | null = null,
  authority?: "server" | "local",
  tableName?: string | null,
): StateType {
  return { kind: "state", name, attributes, isHtml, rendersToDom, constructorBody, authority, tableName };
}

function tError(name: string, fields: Map<string, ResolvedType>): ErrorType {
  return { kind: "error", name, fields };
}

// ---------------------------------------------------------------------------
// Built-in types
//
// These are always present in the global scope. The type registry is seeded
// with these before any file is processed.
// ---------------------------------------------------------------------------

const BUILTIN_TYPES: Map<string, ResolvedType> = new Map([
  ["number",  tPrimitive("number")],
  ["string",  tPrimitive("string")],
  ["boolean", tPrimitive("boolean")],
  ["bool",    tPrimitive("boolean")],  // alias
  ["integer", tPrimitive("integer")],   // §53 base-type (maps to number at runtime)
  ["null",    tPrimitive("null")],
  ["asIs",    tAsIs()],
  ["not",     tNot()],             // §42 absence value
  // §19 Built-in error types — always available without import
  ["NetworkError",    tError("NetworkError",    new Map())],
  ["ValidationError", tError("ValidationError", new Map())],
  ["SQLError",        tError("SQLError",        new Map())],
  ["AuthError",       tError("AuthError",       new Map())],
  ["TimeoutError",    tError("TimeoutError",    new Map())],
  ["ParseError",      tError("ParseError",      new Map())],
  ["NotFoundError",   tError("NotFoundError",   new Map())],
  ["ConflictError",   tError("ConflictError",   new Map())],
]);

// ---------------------------------------------------------------------------
// §53.6 Named Shape Registry
// ---------------------------------------------------------------------------

interface NamedShape {
  baseType: "string";
  htmlType?: string;  // HTML input type= attribute
  pattern?: string;   // HTML pattern= regex (informative)
}

const NAMED_SHAPES: Map<string, NamedShape> = new Map([
  ["email", { baseType: "string", htmlType: "email" }],
  ["url",   { baseType: "string", htmlType: "url" }],
  ["uuid",  { baseType: "string", pattern: "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}" }],
  ["phone", { baseType: "string", htmlType: "tel" }],
  ["date",  { baseType: "string", htmlType: "date" }],
  ["time",  { baseType: "string", htmlType: "time" }],
  ["color", { baseType: "string", htmlType: "color" }],
]);

// ---------------------------------------------------------------------------
// §14.8.3 SQLite type mapping
//
// Maps a ColumnDef.sqlType string to a scrml ResolvedType.
// Returns { type, warning } where warning is true when affinity fallback was
// applied and the type is truly unknown (produces E-TYPE-051).
// ---------------------------------------------------------------------------

function mapSqliteType(sqlType: string, nullable: boolean): { type: ResolvedType; warning: boolean } {
  const upper = (sqlType ?? "").toUpperCase().trim();

  let base: ResolvedType;
  let warning = false;

  // Primary mapping table (case-insensitive exact matches).
  if (upper === "INTEGER" || upper === "INT") {
    base = tPrimitive("number");
  } else if (
    upper === "TEXT" || upper === "CHAR" || upper === "CLOB" || upper === "VARCHAR"
  ) {
    base = tPrimitive("string");
  } else if (upper === "REAL" || upper === "FLOA" || upper === "DOUB") {
    base = tPrimitive("number");
  } else if (upper === "BLOB") {
    base = tPrimitive("string");
  } else if (upper === "NULL" || upper === "") {
    base = tAsIs();
  } else {
    // Affinity algorithm per §14.8.3 for unrecognized types.
    if (upper.includes("INT")) {
      base = tPrimitive("number");
    } else if (upper.includes("CHAR") || upper.includes("CLOB") || upper.includes("TEXT")) {
      base = tPrimitive("string");
    } else if (upper.includes("BLOB") || upper === "") {
      base = tAsIs();
      warning = true;  // E-TYPE-051 — truly unmappable
    } else if (upper.includes("REAL") || upper.includes("FLOA") || upper.includes("DOUB")) {
      base = tPrimitive("number");
    } else {
      // SQLite NUMERIC affinity default.
      base = tPrimitive("number");
    }
  }

  // Nullability: T | not (§42 — scrml uses `not` instead of `null` for absence)
  const type: ResolvedType = nullable ? tUnion([base, tNot()]) : base;

  return { type, warning };
}

// ---------------------------------------------------------------------------
// §14.8.2 InitCap algorithm
//
// Converts a table name to a scrml type name identifier.
// ---------------------------------------------------------------------------

/** ASCII-only lowercase: only A-Z → a-z. */
function asciiLower(s: string): string {
  let out = "";
  for (const ch of s) {
    const code = ch.charCodeAt(0);
    out += (code >= 65 && code <= 90) ? String.fromCharCode(code + 32) : ch;
  }
  return out;
}

/** ASCII-only uppercase first char: only a-z → A-Z. */
function asciiCapFirst(s: string): string {
  if (s.length === 0) return s;
  const first = s.charCodeAt(0);
  const cap = (first >= 97 && first <= 122)
    ? String.fromCharCode(first - 32)
    : s[0];
  return cap + s.slice(1);
}

/**
 * Apply the InitCap algorithm (§14.8.2) to a table name.
 *
 * Returns { name } on success, or { error: 'E-TYPE-052', name: null } on failure.
 */
function initCap(tableName: string): { name: string; error: null } | { name: null; error: string } {
  // Step 1: split on `_`.
  const segments = tableName.split("_");

  // Steps 2-3: lowercase + capitalize each segment, discard empty segments.
  const parts: string[] = [];
  for (const seg of segments) {
    if (seg.length === 0) continue;  // Step 3: discard empty
    parts.push(asciiCapFirst(asciiLower(seg)));
  }

  // If all segments were empty (e.g. table name is "_"), result is empty string.
  const result = parts.join("");

  // Step 5: validity check — must be a valid scrml identifier.
  // Begins with ASCII letter or underscore; contains only [A-Za-z0-9_].
  if (result.length === 0 || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(result)) {
    return { name: null, error: "E-TYPE-052" };
  }

  return { name: result, error: null };
}

// ---------------------------------------------------------------------------
// Top-level splitter
//
// Splits a string on a set of delimiter characters, but only at depth 0
// (not inside parentheses, brackets, or braces).
//
// Defined early because it is used by parseStructBody, parseEnumBody,
// and resolveTypeExpr.
// ---------------------------------------------------------------------------

function splitTopLevel(s: string, delimiters: string[]): string[] {
  const delimSet = new Set(delimiters);
  const parts: string[] = [];
  let depth = 0;
  let cur = "";

  for (const ch of s) {
    if (ch === "(" || ch === "[" || ch === "{") {
      depth++;
      cur += ch;
    } else if (ch === ")" || ch === "]" || ch === "}") {
      depth--;
      cur += ch;
    } else if (depth === 0 && delimSet.has(ch)) {
      parts.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }

  if (cur.length > 0) parts.push(cur);
  return parts;
}
// ---------------------------------------------------------------------------
// §53 — Predicate expression parser
// ---------------------------------------------------------------------------

/**
 * Parse a predicate expression string into a PredicateExpr tree.
 *
 * Grammar (§53.2.1):
 *   predicate-expr = simple-predicate | "!" predicate-expr
 *                  | predicate-expr "&&" predicate-expr
 *                  | predicate-expr "||" predicate-expr
 *                  | "(" predicate-expr ")" | named-shape
 *   simple-predicate = comparison-predicate | property-predicate
 *   comparison-predicate = comparison-op numeric-literal
 *   property-predicate = "." identifier comparison-op value-literal
 *   named-shape = identifier
 *
 * External @identifier references set hasExternalRef: true (E-CONTRACT-003).
 * Parse failures produce { kind: "error", message: "..." }.
 */
function parsePredicateExpr(raw: string): PredicateExpr & { hasExternalRef: boolean } {
  const trimmed = raw.trim();
  let hasExternalRef = false;

  type PToken =
    | { t: "op"; v: string }
    | { t: "num"; v: number }
    | { t: "str"; v: string }
    | { t: "ident"; v: string }
    | { t: "prop"; v: string }
    | { t: "extref"; v: string }
    | { t: "and" }
    | { t: "or" }
    | { t: "not" }
    | { t: "lp" }
    | { t: "rp" };

  const tokens: PToken[] = [];
  let i = 0;

  while (i < trimmed.length) {
    // Skip whitespace
    if (/\s/.test(trimmed[i])) { i++; continue; }

    // Two-char operators first
    if (i + 1 < trimmed.length) {
      const two = trimmed.slice(i, i + 2);
      if (two === "&&") { tokens.push({ t: "and" }); i += 2; continue; }
      if (two === "||") { tokens.push({ t: "or" }); i += 2; continue; }
      if (two === ">=" || two === "<=" || two === "==" || two === "!=") {
        tokens.push({ t: "op", v: two }); i += 2; continue;
      }
    }

    const ch = trimmed[i];
    if (ch === ">" || ch === "<") { tokens.push({ t: "op", v: ch }); i++; continue; }
    if (ch === "!") { tokens.push({ t: "not" }); i++; continue; }
    if (ch === "(") { tokens.push({ t: "lp" }); i++; continue; }
    if (ch === ")") { tokens.push({ t: "rp" }); i++; continue; }

    // External reference @identifier
    if (ch === "@") {
      hasExternalRef = true;
      let name = "@"; i++;
      while (i < trimmed.length && /[A-Za-z0-9_]/.test(trimmed[i])) { name += trimmed[i]; i++; }
      tokens.push({ t: "extref", v: name });
      continue;
    }

    // Property access .identifier
    if (ch === ".") {
      let prop = "."; i++;
      while (i < trimmed.length && /[A-Za-z0-9_]/.test(trimmed[i])) { prop += trimmed[i]; i++; }
      tokens.push({ t: "prop", v: prop });
      continue;
    }

    // Negative number: "-" followed by a digit
    if (ch === "-" && i + 1 < trimmed.length && /[0-9]/.test(trimmed[i + 1])) {
      let num = "-"; i++;
      while (i < trimmed.length && /[0-9.]/.test(trimmed[i])) { num += trimmed[i]; i++; }
      tokens.push({ t: "num", v: parseFloat(num) });
      continue;
    }

    // Positive number
    if (/[0-9]/.test(ch)) {
      let num = "";
      while (i < trimmed.length && /[0-9.]/.test(trimmed[i])) { num += trimmed[i]; i++; }
      tokens.push({ t: "num", v: parseFloat(num) });
      continue;
    }

    // String literal
    if (ch === "'" || ch === '"') {
      const q = ch; let str = ""; i++;
      while (i < trimmed.length && trimmed[i] !== q) { str += trimmed[i]; i++; }
      if (i < trimmed.length) i++;
      tokens.push({ t: "str", v: str });
      continue;
    }

    // Identifier (named-shape or keyword)
    if (/[A-Za-z_]/.test(ch)) {
      let id = "";
      while (i < trimmed.length && /[A-Za-z0-9_]/.test(trimmed[i])) { id += trimmed[i]; i++; }
      tokens.push({ t: "ident", v: id });
      continue;
    }

    i++; // skip unknown char
  }

  let pos = 0;
  const peek = (): PToken | null => pos < tokens.length ? tokens[pos] : null;
  const consume = (): PToken => tokens[pos++];

  function parseOr(): PredicateExpr {
    let left = parseAnd();
    while (peek()?.t === "or") {
      consume();
      const right = parseAnd();
      left = { kind: "or", left, right };
    }
    return left;
  }

  function parseAnd(): PredicateExpr {
    let left = parseNot();
    while (peek()?.t === "and") {
      consume();
      const right = parseNot();
      left = { kind: "and", left, right };
    }
    return left;
  }

  function parseNot(): PredicateExpr {
    if (peek()?.t === "not") {
      consume();
      const operand = parsePrimary();
      return { kind: "not", operand };
    }
    return parsePrimary();
  }

  function parsePrimary(): PredicateExpr {
    const t = peek();
    if (!t) return { kind: "error", message: "unexpected end of predicate" };

    if (t.t === "lp") {
      consume();
      const expr = parseOr();
      if (peek()?.t === "rp") consume();
      return expr;
    }

    if (t.t === "extref") {
      consume();
      return { kind: "named-shape", name: (t as { t: "extref"; v: string }).v };
    }

    if (t.t === "op") {
      const op = (consume() as { t: "op"; v: string }).v;
      const nt = peek();
      if (nt?.t === "num") {
        consume();
        return { kind: "comparison", op, value: (nt as { t: "num"; v: number }).v };
      }
      return { kind: "error", message: "expected number after operator" };
    }

    if (t.t === "prop") {
      const pt = consume() as { t: "prop"; v: string };
      const prop = pt.v.slice(1);
      const ot = peek();
      if (ot?.t === "op") {
        const op = (consume() as { t: "op"; v: string }).v;
        const vt = peek();
        if (vt?.t === "num") { consume(); return { kind: "property", prop, op, value: (vt as { t: "num"; v: number }).v }; }
        if (vt?.t === "str") { consume(); return { kind: "property", prop, op, value: (vt as { t: "str"; v: string }).v }; }
        return { kind: "error", message: "expected literal after property operator" };
      }
      return { kind: "error", message: "expected operator after property" };
    }

    if (t.t === "ident") {
      const it = consume() as { t: "ident"; v: string };
      return { kind: "named-shape", name: it.v };
    }

    if (t.t === "num") {
      consume();
      return { kind: "error", message: "bare number not a valid predicate primary" };
    }

    return { kind: "error", message: "unexpected token type: " + t.t };
  }

  if (tokens.length === 0) {
    return Object.assign({ kind: "error" as const, message: "empty predicate" }, { hasExternalRef: false });
  }

  const result = parseOr();
  return Object.assign(result, { hasExternalRef });
}

/**
 * Statically evaluate a predicate against a literal value (T-PRED-1).
 * Returns true/false if provable, null if undeterminable (needs runtime check).
 */
function evaluatePredicateOnLiteral(pred: PredicateExpr, value: number | string): boolean | null {
  if (pred.kind === "comparison") {
    if (typeof value !== "number") return null;
    const rhs = pred.value as number;
    switch (pred.op) {
      case ">":  return value > rhs;
      case ">=": return value >= rhs;
      case "<":  return value < rhs;
      case "<=": return value <= rhs;
      case "==": return value === rhs;
      case "!=": return value !== rhs;
      default:   return null;
    }
  }
  if (pred.kind === "property" && pred.prop === "length" && typeof value === "string") {
    const len = value.length;
    const rhs = pred.value as number;
    switch (pred.op) {
      case ">":  return len > rhs;
      case ">=": return len >= rhs;
      case "<":  return len < rhs;
      case "<=": return len <= rhs;
      case "==": return len === rhs;
      case "!=": return len !== rhs;
      default:   return null;
    }
  }
  if (pred.kind === "named-shape") return null; // not statically evaluated
  if (pred.kind === "and") {
    const l = evaluatePredicateOnLiteral(pred.left!, value);
    const r = evaluatePredicateOnLiteral(pred.right!, value);
    if (l === false || r === false) return false;
    if (l === true && r === true) return true;
    return null;
  }
  if (pred.kind === "or") {
    const l = evaluatePredicateOnLiteral(pred.left!, value);
    const r = evaluatePredicateOnLiteral(pred.right!, value);
    if (l === true || r === true) return true;
    if (l === false && r === false) return false;
    return null;
  }
  if (pred.kind === "not") {
    const inner = evaluatePredicateOnLiteral(pred.operand!, value);
    return inner === null ? null : !inner;
  }
  return null;
}


// ---------------------------------------------------------------------------
// Struct body parser
// ---------------------------------------------------------------------------

/**
 * Parse a struct body string into a field map.
 *
 * This is a best-effort parser: it does not handle the full type expression
 * language. It extracts field names and their basic type annotations.
 */
function parseStructBody(raw: string, typeRegistry: Map<string, ResolvedType>): Map<string, ResolvedType> {
  const fields = new Map<string, ResolvedType>();

  // Strip outer braces if present.
  let body = raw.trim();
  if (body.startsWith("{")) body = body.slice(1);
  if (body.endsWith("}")) body = body.slice(0, -1);
  body = body.trim();

  if (!body) return fields;

  // Split on commas and newlines at the top level (not inside parentheses).
  const lines = splitTopLevel(body, [",", "\n"]);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Match `fieldName: typeExpr`
    const colonIdx = trimmed.indexOf(":");
    if (colonIdx === -1) continue;

    const fieldName = trimmed.slice(0, colonIdx).trim();
    const typeExpr = trimmed.slice(colonIdx + 1).trim();

    if (!fieldName || !/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(fieldName)) continue;

    fields.set(fieldName, resolveTypeExpr(typeExpr, typeRegistry));
  }

  return fields;
}

// ---------------------------------------------------------------------------
// Enum body parser
// ---------------------------------------------------------------------------

/**
 * Parse an enum body string into variants + optional transition rules.
 *
 * §51.2: An enum body may contain a `transitions {}` block after the variant list.
 * If present, transition rules are parsed and returned alongside variants.
 * If absent, transitionRules is null (unrestricted enum — existing behavior).
 *
 * @param raw        — full enum body string including outer braces
 * @param typeRegistry — type registry for payload type resolution
 * @param errors     — error accumulator; receives E-MACHINE-010 if guard found in type-level rule
 * @param fileSpan   — span for error reporting
 * @param typeName   — enum type name for error messages
 */
function parseEnumBody(
  raw: string,
  typeRegistry: Map<string, ResolvedType>,
  errors?: TSError[],
  fileSpan?: Span,
  typeName?: string,
): { variants: VariantDef[]; transitionRules: TransitionRule[] | null } {
  const variants: VariantDef[] = [];

  let body = raw.trim();
  if (body.startsWith("{")) body = body.slice(1);
  if (body.endsWith("}")) body = body.slice(0, -1);
  body = body.trim();

  if (!body) return { variants, transitionRules: null };

  // -----------------------------------------------------------------------
  // Split body into variants section and (optional) transitions section.
  // The transitions block starts with the keyword `transitions` followed by
  // a `{` at top-level depth.
  // -----------------------------------------------------------------------
  let variantsSection = body;
  let transitionsSection: string | null = null;

  // Find `transitions` keyword at top-level (depth 0).
  // We scan for the literal text "transitions" at depth 0 followed by whitespace + "{".
  {
    let depth = 0;
    let i = 0;
    while (i < body.length) {
      const ch = body[i];
      if (ch === "(" || ch === "[" || ch === "{") { depth++; i++; continue; }
      if (ch === ")" || ch === "]" || ch === "}") { depth--; i++; continue; }
      if (depth === 0 && body.slice(i).startsWith("transitions")) {
        const after = body.slice(i + "transitions".length).trimStart();
        if (after.startsWith("{")) {
          // Found the transitions block.
          variantsSection = body.slice(0, i).trim();
          // Extract the content inside the transitions braces.
          const openBrace = body.indexOf("{", i + "transitions".length);
          if (openBrace !== -1) {
            // Find matching close brace at depth 0.
            let bd = 0;
            let j = openBrace;
            while (j < body.length) {
              if (body[j] === "{") bd++;
              else if (body[j] === "}") {
                bd--;
                if (bd === 0) { break; }
              }
              j++;
            }
            transitionsSection = body.slice(openBrace + 1, j).trim();
          }
          break;
        }
      }
      i++;
    }
  }

  // -----------------------------------------------------------------------
  // Parse variants from variantsSection (same logic as before).
  // -----------------------------------------------------------------------
  const lines = splitTopLevel(variantsSection, ["\n"]);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Match `VariantName` or `VariantName(field:type, ...)`
    const parenIdx = trimmed.indexOf("(");

    if (parenIdx === -1) {
      // Unit variant — may still be comma-separated on one line (fallback).
      const unitParts = splitTopLevel(trimmed, [","]);
      for (const part of unitParts) {
        let text = part.trim();
        if (!text) continue;

        // Check for `renders` clause on this unit variant.
        let renders: { markup: string } | null = null;
        const rendersIdx = text.indexOf(" renders ");
        if (rendersIdx !== -1) {
          const markup = text.slice(rendersIdx + " renders ".length).trim();
          if (markup) renders = { markup };
          text = text.slice(0, rendersIdx).trim();
        }

        const name = text;
        if (!name) continue;
        if (!/^[A-Z][A-Za-z0-9_]*$/.test(name)) continue;  // must start with uppercase
        variants.push({ name, payload: null, renders });
      }
    } else {
      // Payload variant: `Name(field:type, ...)`
      const name = trimmed.slice(0, parenIdx).trim();
      if (!/^[A-Z][A-Za-z0-9_]*$/.test(name)) continue;

      // Find the closing paren for the payload, then check for `renders` after it.
      const closeParenIdx = trimmed.lastIndexOf(")");
      const payloadStr = trimmed.slice(parenIdx + 1, closeParenIdx).trim();
      const payload = new Map<string, ResolvedType>();

      if (payloadStr) {
        // Split payload fields on commas at depth-0.
        const fieldParts = splitTopLevel(payloadStr, [","]);
        for (const fp of fieldParts) {
          const colonIdx = fp.indexOf(":");
          if (colonIdx === -1) continue;
          const fieldName = fp.slice(0, colonIdx).trim();
          const typeExpr = fp.slice(colonIdx + 1).trim();
          if (fieldName) {
            payload.set(fieldName, resolveTypeExpr(typeExpr, typeRegistry));
          }
        }
      }

      // Check for `renders` clause after the closing paren.
      let renders: { markup: string } | null = null;
      const afterParen = closeParenIdx !== -1 ? trimmed.slice(closeParenIdx + 1).trim() : "";
      if (afterParen.startsWith("renders ")) {
        const markup = afterParen.slice("renders ".length).trim();
        if (markup) renders = { markup };
      }

      variants.push({ name, payload, renders });
    }
  }

  // -----------------------------------------------------------------------
  // Parse transition rules from transitionsSection (§51.2.1).
  // -----------------------------------------------------------------------
  if (transitionsSection === null) {
    return { variants, transitionRules: null };
  }

  const knownVariantNames = new Set(variants.map(v => v.name));
  const transitionRules: TransitionRule[] = [];
  const ruleLines = transitionsSection.split("\n");

  for (const ruleLine of ruleLines) {
    const trimmedRule = ruleLine.trim();
    if (!trimmedRule || trimmedRule.startsWith("//")) continue;

    // Strip inline comments
    const commentIdx = trimmedRule.indexOf("//");
    const cleanRule = (commentIdx !== -1 ? trimmedRule.slice(0, commentIdx) : trimmedRule).trim();
    if (!cleanRule) continue;

    // E-MACHINE-010: guard in type-level transition block
    // Check for ` given ` keyword (space-bounded to avoid false matches in variant names).
    const givenIdx = cleanRule.search(/\bgiven\b/);
    if (givenIdx !== -1) {
      if (errors && fileSpan) {
        errors.push(new TSError(
          "E-MACHINE-010",
          "E-MACHINE-010: 'given' guard is not permitted in a type-level 'transitions {}' block. " +
          "Type-level transitions are structural rules only (VariantRef => VariantRef). " +
          "Use a '< machine>' declaration to add contextual guards. " +
          (typeName ? "Enum: " + typeName + ". " : "") +
          "Rule: " + cleanRule,
          fileSpan,
        ));
      }
      // Still parse the rule but set guard = null (discard the guard expression).
    }

    // Find the '=>' arrow
    const arrowIdx = cleanRule.indexOf("=>");
    if (arrowIdx === -1) continue;

    let fromStr = cleanRule.slice(0, arrowIdx).trim();
    let rest = cleanRule.slice(arrowIdx + 2).trim();

    // Strip any trailing effect block { ... } from rest
    let effectBody: string | null = null;
    const effectBraceIdx = rest.indexOf("{");
    if (effectBraceIdx !== -1) {
      effectBody = rest.slice(effectBraceIdx + 1, rest.lastIndexOf("}")).trim() || null;
      rest = rest.slice(0, effectBraceIdx).trim();
    }

    // Strip any trailing 'given (...)' from rest (already flagged as error above)
    const givenInRest = rest.search(/\bgiven\b/);
    if (givenInRest !== -1) {
      rest = rest.slice(0, givenInRest).trim();
    }

    let toStr = rest.trim();

    // Normalize variant refs: strip leading '.' or '::'
    const normalizeRef = (ref: string): string => {
      if (ref.startsWith("::")) return ref.slice(2);
      if (ref.startsWith(".")) return ref.slice(1);
      return ref;
    };

    const fromName = normalizeRef(fromStr);
    const toName = normalizeRef(toStr);

    if (!fromName || !toName) continue;

    // Validate from/to variant names (wildcards "*" are always valid)
    if (fromName !== "*" && !knownVariantNames.has(fromName) && errors && fileSpan) {
      errors.push(new TSError(
        "E-MACHINE-004",
        "E-MACHINE-004: Transition rule references unknown variant '." + fromName + "'. " +
        (typeName ? "Enum '" + typeName + "' " : "The enum ") +
        "has no variant named '" + fromName + "'. " +
        "Available variants: " + Array.from(knownVariantNames).map(n => "." + n).join(", ") + ".",
        fileSpan,
      ));
    }

    if (toName !== "*" && !knownVariantNames.has(toName) && errors && fileSpan) {
      errors.push(new TSError(
        "E-MACHINE-004",
        "E-MACHINE-004: Transition rule references unknown variant '." + toName + "'. " +
        (typeName ? "Enum '" + typeName + "' " : "The enum ") +
        "has no variant named '" + toName + "'. " +
        "Available variants: " + Array.from(knownVariantNames).map(n => "." + n).join(", ") + ".",
        fileSpan,
      ));
    }

    transitionRules.push({
      from: fromName,
      to: toName,
      guard: null,   // type-level guards are not permitted (E-MACHINE-010)
      label: null,
      effectBody,
    });
  }

  return { variants, transitionRules };
}

// ---------------------------------------------------------------------------
// Type expression resolver
// ---------------------------------------------------------------------------

/**
 * Resolve a type expression string to a ResolvedType.
 *
 * This is a lookup-table approach: primitives and named types are resolved
 * directly. Compound types are given a best-effort structural representation.
 * When resolution fails, tAsIs() is returned (conservative; no error emitted
 * here — callers decide whether unknown is an error).
 */
function resolveTypeExpr(expr: string, typeRegistry: Map<string, ResolvedType>): ResolvedType {
  if (!expr) return tAsIs();

  const trimmed = expr.trim();

  // Lifecycle annotation: (A -> B) — resolve to B (post-transition type).
  if (trimmed.startsWith("(") && trimmed.endsWith(")")) {
    const inner = trimmed.slice(1, -1);
    const arrowIdx = inner.indexOf("->");
    if (arrowIdx !== -1) {
      const rhs = inner.slice(arrowIdx + 2).trim();
      return resolveTypeExpr(rhs, typeRegistry);
    }
    // No arrow: just remove parens and re-resolve.
    return resolveTypeExpr(inner, typeRegistry);
  }

  // Union: A | B (split on | at top level).
  if (trimmed.includes("|")) {
    const parts = splitTopLevel(trimmed, ["|"]);
    if (parts.length > 1) {
      const members = parts.map(p => resolveTypeExpr(p.trim(), typeRegistry));
      return tUnion(members);
    }
  }

  // Negation: !type — conservative: treat as asIs.
  if (trimmed.startsWith("!")) {
    return tAsIs();
  }

  // §53 — Inline predicate type: base-type(predicate-expr) or base-type(predicate-expr)[label]
  // Must come BEFORE the "&&" shortcut since predicate-expr may contain &&.
  {
    const PRED_BASES = new Set(["number", "string", "boolean", "integer"]);
    const parenIdx = trimmed.indexOf("(");
    if (parenIdx > 0) {
      const base = trimmed.slice(0, parenIdx).trim();
      if (PRED_BASES.has(base)) {
        // Find matching close paren (depth-aware)
        let depth = 0;
        let closeIdx = -1;
        for (let pi = parenIdx; pi < trimmed.length; pi++) {
          if (trimmed[pi] === "(") depth++;
          else if (trimmed[pi] === ")") {
            depth--;
            if (depth === 0) { closeIdx = pi; break; }
          }
        }
        if (closeIdx > parenIdx) {
          const predicateStr = trimmed.slice(parenIdx + 1, closeIdx);
          // Optional label: [identifier] after closing paren
          let label: string | null = null;
          const rest = trimmed.slice(closeIdx + 1).trim();
          if (rest.startsWith("[") && rest.endsWith("]")) {
            label = rest.slice(1, -1).trim();
          }
          const parsed = parsePredicateExpr(predicateStr);
          if (parsed.kind !== "error") {
            return tPredicated(
              base as "number" | "string" | "boolean" | "integer",
              parsed,
              label,
            );
          }
          // parse error — fall through to asIs
        }
      }
    }
  }

  // Conjunction: (...&& ...) — conservative: treat as asIs.
  if (trimmed.includes("&&")) {
    return tAsIs();
  }

  // Array: type[] — conservative: element type lookup then wrap.
  if (trimmed.endsWith("[]")) {
    const elementExpr = trimmed.slice(0, -2).trim();
    return tArray(resolveTypeExpr(elementExpr, typeRegistry));
  }

  // §14.9 — snippet type kind
  if (trimmed === "snippet") return tSnippet(null, false);
  if (trimmed === "snippet?") return tSnippet(null, true);
  if (trimmed.startsWith("snippet(") && trimmed.endsWith(")")) {
    // snippet(param: Type) — extract type from inside parens
    const inner = trimmed.slice(8, -1); // "param: Type"
    const colonIdx = inner.indexOf(":");
    const paramTypeStr = colonIdx !== -1 ? inner.slice(colonIdx + 1).trim() : inner.trim();
    return tSnippet(resolveTypeExpr(paramTypeStr, typeRegistry), false);
  }

  // Primitive lookup.
  if (BUILTIN_TYPES.has(trimmed)) {
    return BUILTIN_TYPES.get(trimmed)!;
  }

  // asIs keyword.
  if (trimmed === "asIs") {
    return tAsIs();
  }

  // Named type lookup in the registry.
  if (typeRegistry.has(trimmed)) {
    return typeRegistry.get(trimmed)!;
  }

  // Unresolvable — return asIs (conservative; no error here).
  return tAsIs();
}

// ---------------------------------------------------------------------------
// §53 — Predicate validation at assignment sites
// ---------------------------------------------------------------------------

/**
 * Format a PredicateExpr to a human-readable string (for error messages).
 */
function formatPredicateExpr(pred: PredicateExpr): string {
  switch (pred.kind) {
    case "comparison": return (pred.op ?? "") + String(pred.value ?? "");
    case "property":   return "." + (pred.prop ?? "") + (pred.op ?? "") + String(pred.value ?? "");
    case "named-shape": return pred.name ?? "?";
    case "and":        return formatPredicateExpr(pred.left!) + " && " + formatPredicateExpr(pred.right!);
    case "or":         return "(" + formatPredicateExpr(pred.left!) + " || " + formatPredicateExpr(pred.right!) + ")";
    case "not":        return "!" + formatPredicateExpr(pred.operand!);
    case "error":      return "?invalid?";
    default:           return "?";
  }
}

/**
 * Validate a literal value against a predicated type at compile time.
 *
 * Emits:
 *   E-CONTRACT-001 — literal fails the predicate statically (T-PRED-1)
 *   E-CONTRACT-002 — named shape not in registry
 *   E-CONTRACT-003 — predicate references external reactive variable
 *
 * Returns:
 *   true  — literal is statically proven valid (no runtime check needed)
 *   false — literal is statically proven invalid (E-CONTRACT-001 emitted)
 *   null  — cannot be determined at compile time (emit runtime check)
 */
function checkPredicateLiteral(
  predType: PredicatedType,
  value: number | string | boolean,
  span: Span,
  errors: TSError[],
): boolean | null {
  // E-CONTRACT-003: predicate references external reactive variable
  if ((predType.predicate as PredicateExpr & { hasExternalRef?: boolean }).hasExternalRef) {
    errors.push(new TSError(
      "E-CONTRACT-003",
      "E-CONTRACT-003: Inline predicate references an external reactive variable. " +
        "Inline predicates must be stateless — they may only reference the incoming value. " +
        "For constraints that depend on external state, use < machine>.",
      span,
    ));
    return null;
  }

  // E-CONTRACT-002: check for unknown named shapes
  function checkNamedShapes(pred: PredicateExpr): void {
    if (pred.kind === "named-shape" && pred.name && !pred.name.startsWith("@") && !NAMED_SHAPES.has(pred.name)) {
      errors.push(new TSError(
        "E-CONTRACT-002",
        "E-CONTRACT-002: Named shape '" + pred.name + "' not found in the shape registry. " +
          "Built-in shapes: " + Array.from(NAMED_SHAPES.keys()).join(", ") + ". " +
          "To register a custom shape, use a ^{} meta block.",
        span,
      ));
    }
    if ((pred.kind === "and" || pred.kind === "or") && pred.left && pred.right) {
      checkNamedShapes(pred.left);
      checkNamedShapes(pred.right);
    }
    if (pred.kind === "not" && pred.operand) checkNamedShapes(pred.operand);
  }
  checkNamedShapes(predType.predicate);

  // E-CONTRACT-001: static literal evaluation
  if (typeof value === "boolean") return null;

  const result = evaluatePredicateOnLiteral(predType.predicate, value as number | string);
  if (result === false) {
    const predicateStr = formatPredicateExpr(predType.predicate);
    errors.push(new TSError(
      "E-CONTRACT-001",
      "E-CONTRACT-001: Value constraint violated. " +
        "Type: " + predType.baseType + "(" + predicateStr + ")" +
        (predType.label ? " [" + predType.label + "]" : "") + ". " +
        "Value " + String(value) + " does not satisfy the predicate.",
      span,
    ));
    return false;
  }
  return result;
}

// ---------------------------------------------------------------------------
// §53.4 — Three-Zone SPARK Enforcement
// ---------------------------------------------------------------------------

/**
 * SourceInfo — describes what the type system knows about a value at an assignment site.
 *
 * "literal"       — value is a known compile-time number or string literal.
 * "predicated"    — value already carries a predicate constraint.
 * "arithmetic"    — value is the result of arithmetic on a predicated type (T-PRED-5).
 * "unconstrained" — value source cannot be determined at compile time.
 */
type SourceInfo =
  | { kind: "literal"; value: number | string }
  | { kind: "predicated"; predType: PredicatedType }
  | { kind: "unconstrained" }
  | { kind: "arithmetic" };

/**
 * Try to extract a SourceInfo from a raw init expression string.
 * Conservative: only matches unambiguous numeric or string literals.
 * Returns "arithmetic" if binary arithmetic operators are detected.
 * Returns "unconstrained" for everything else.
 */
function extractInitLiteral(init: unknown): SourceInfo {
  if (typeof init !== "string") return { kind: "unconstrained" };
  const raw = init.trim();
  if (!raw) return { kind: "unconstrained" };

  // Numeric literal: optional minus, digits, optional decimal
  if (/^-?\d+(\.\d+)?$/.test(raw)) {
    return { kind: "literal", value: parseFloat(raw) };
  }

  // String literal: single or double quoted (at least 2 chars: open+close quote)
  if (raw.length >= 2 &&
      ((raw.startsWith('"') && raw.endsWith('"')) ||
       (raw.startsWith("'") && raw.endsWith("'")))) {
    return { kind: "literal", value: raw.slice(1, -1) };
  }

  // Arithmetic: *, /, + operators, or digit followed by binary minus
  if (/[+*\/]/.test(raw) || /\d\s*-/.test(raw)) {
    return { kind: "arithmetic" };
  }

  return { kind: "unconstrained" };
}

/**
 * Returns true if `source` numeric comparison predicate is at least as restrictive as `target`.
 * "At least as restrictive" means every value satisfying source also satisfies target.
 */
function isCompTighterOrEqual(source: PredicateExpr, target: PredicateExpr): boolean {
  if (source.kind !== "comparison" || target.kind !== "comparison") return false;
  if (typeof source.value !== "number" || typeof target.value !== "number") return false;

  const sv = source.value;
  const tv = target.value;
  const sop = source.op!;
  const top = target.op!;

  // Lower-bound ops: > and >=
  if ((sop === ">" || sop === ">=") && (top === ">" || top === ">=")) {
    if (sop === top) return sv >= tv;
    if (sop === ">" && top === ">=") return sv >= tv;
    if (sop === ">=" && top === ">") return sv > tv;
    return false;
  }
  // Upper-bound ops: < and <=
  if ((sop === "<" || sop === "<=") && (top === "<" || top === "<=")) {
    if (sop === top) return sv <= tv;
    if (sop === "<" && top === "<=") return sv <= tv;
    if (sop === "<=" && top === "<") return sv < tv;
    return false;
  }
  // == implies various bounds
  if (sop === "==") {
    if (top === "==") return sv === tv;
    if (top === ">" || top === ">=") return top === ">" ? sv > tv : sv >= tv;
    if (top === "<" || top === "<=") return top === "<" ? sv < tv : sv <= tv;
  }

  return false;
}

/**
 * T-PRED-4 — Constraint implication check.
 *
 * Returns true if every value satisfying `source` predicate also satisfies `target`.
 *
 * Rules:
 *   - Numeric: source tighter or equal → implies target
 *   - Named shape: exact name match only
 *   - AND: A && B implies A (conjunction implies each conjunct)
 *   - AND target: source implies (A && B) iff source implies both A and B
 *   - OR target: source implies (A || B) iff source implies A or B
 */
function predicateImplies(source: PredicateExpr, target: PredicateExpr): boolean {
  switch (target.kind) {
    case "comparison":
      if (source.kind === "comparison") return isCompTighterOrEqual(source, target);
      if (source.kind === "and") {
        if (source.left && predicateImplies(source.left, target)) return true;
        if (source.right && predicateImplies(source.right, target)) return true;
      }
      return false;

    case "named-shape":
      if (source.kind === "named-shape") return source.name === target.name;
      if (source.kind === "and") {
        if (source.left && predicateImplies(source.left, target)) return true;
        if (source.right && predicateImplies(source.right, target)) return true;
      }
      return false;

    case "and":
      // source implies (A && B) iff source implies A AND source implies B
      return !!(target.left && target.right &&
        predicateImplies(source, target.left) &&
        predicateImplies(source, target.right));

    case "or":
      // source implies (A || B) iff source implies A OR source implies B
      return !!(target.left && target.right &&
        (predicateImplies(source, target.left) || predicateImplies(source, target.right)));

    default:
      return false;
  }
}

/**
 * §53.4 — Classify the predicate enforcement zone at an assignment site.
 *
 * Returns:
 *   "static"   — literal value; predicate evaluated at compile time.
 *                E-CONTRACT-001 pushed by checkPredicateLiteral if the literal fails.
 *                Either way, no runtime check needed.
 *   "trusted"  — source constraint implies target (T-PRED-4); no check needed.
 *   "boundary" — source is unconstrained or arithmetic; CG should emit runtime check (T-PRED-2).
 */
function classifyPredicateZone(
  targetType: PredicatedType,
  sourceInfo: SourceInfo,
  span: Span,
  errors: TSError[],
): "static" | "trusted" | "boundary" {
  switch (sourceInfo.kind) {
    case "literal":
      // T-PRED-1: evaluate predicate against literal at compile time
      checkPredicateLiteral(targetType, sourceInfo.value, span, errors);
      return "static";

    case "predicated":
      // T-PRED-4: does the source constraint statically imply the target?
      return predicateImplies(sourceInfo.predType.predicate, targetType.predicate)
        ? "trusted"
        : "boundary";

    case "arithmetic":
      // T-PRED-5: arithmetic strips constraints → boundary check required
      return "boundary";

    case "unconstrained":
    default:
      // T-PRED-2: no compile-time proof → emit runtime boundary check
      return "boundary";
  }
}

// ---------------------------------------------------------------------------
// Scope chain
// ---------------------------------------------------------------------------

class Scope {
  parent: Scope | null;
  label: string;
  bindings: Map<string, ScopeEntry>;

  constructor(parent: Scope | null, label = "scope") {
    this.parent = parent;
    this.label = label;
    this.bindings = new Map();
  }

  bind(name: string, entry: ScopeEntry): void {
    this.bindings.set(name, entry);
  }

  lookup(name: string): ScopeEntry | null {
    let scope: Scope | null = this;
    while (scope !== null) {
      if (scope.bindings.has(name)) return scope.bindings.get(name)!;
      scope = scope.parent;
    }
    return null;
  }

  hasOwn(name: string): boolean {
    return this.bindings.has(name);
  }
}

class ScopeChain {
  _global: Scope;
  _current: Scope;

  constructor() {
    // Global scope — seeded with built-in types.
    this._global = new Scope(null, "global");
    this._current = this._global;

    // Seed built-in types into global scope.
    for (const [name, type] of BUILTIN_TYPES) {
      this._global.bind(name, { kind: "type", resolvedType: type });
    }
  }

  get current(): Scope {
    return this._current;
  }

  get global(): Scope {
    return this._global;
  }

  push(label = "scope"): Scope {
    const child = new Scope(this._current, label);
    this._current = child;
    return child;
  }

  pop(): void {
    if (this._current.parent === null) {
      throw new Error("ScopeChain: cannot pop global scope");
    }
    this._current = this._current.parent;
  }

  lookup(name: string): ScopeEntry | null {
    return this._current.lookup(name);
  }

  bind(name: string, entry: ScopeEntry): void {
    this._current.bind(name, entry);
  }
}

// ---------------------------------------------------------------------------
// Type registry builder
// ---------------------------------------------------------------------------

/**
 * Build the file-level type registry from a FileAST's typeDecls array.
 */
function buildTypeRegistry(
  typeDecls: ASTNodeLike[],
  errors: TSError[],
  fileSpan: Span,
): Map<string, ResolvedType> {
  const registry = new Map<string, ResolvedType>(BUILTIN_TYPES);

  // Pass 1: register all names as placeholders.
  for (const decl of typeDecls) {
    if (!decl.name) continue;
    registry.set(decl.name as string, tUnknown());
  }

  // Pass 2: parse bodies and replace placeholders.
  for (const decl of typeDecls) {
    if (!decl.name) continue;

    if (decl.typeKind === "struct") {
      const fields = parseStructBody((decl.raw as string) ?? "", registry);
      registry.set(decl.name as string, tStruct(decl.name as string, fields));
    } else if (decl.typeKind === "enum") {
      const { variants, transitionRules } = parseEnumBody(
        (decl.raw as string) ?? "", registry, errors, fileSpan, decl.name as string
      );
      registry.set(decl.name as string, tEnum(decl.name as string, variants, transitionRules));
    } else if (decl.typeKind === "error") {
      // §19.3: user-defined error types — parse fields like a struct
      const fields = parseStructBody((decl.raw as string) ?? "", registry);
      // E-ERROR-008: reserved field names (§19.3) — message/type are implicit
      for (const fieldName of fields.keys()) {
        if (fieldName === "message" || fieldName === "type") {
          errors.push(new TSError(
            "E-ERROR-008",
            "E-ERROR-008: User-defined error type '" + (decl.name as string) + "' declares a field named '" + fieldName + "'. " +
            "The fields 'message' and 'type' are implicit on all error types (\u00a719.3) and may not be declared.",
            fileSpan,
          ));
        }
      }
      registry.set(decl.name as string, tError(decl.name as string, fields));
    } else {
      // Unknown kind — leave as asIs so references don't explode.
      registry.set(decl.name as string, tAsIs());
    }
  }

  // Pass 3: re-resolve any struct/enum fields that referenced a forward-declared type.
  for (const decl of typeDecls) {
    if (!decl.name) continue;
    const existing = registry.get(decl.name as string);
    if (!existing) continue;

    if (decl.typeKind === "struct" && existing.kind === "struct") {
      const fields = parseStructBody((decl.raw as string) ?? "", registry);
      registry.set(decl.name as string, tStruct(decl.name as string, fields));
    } else if (decl.typeKind === "enum" && existing.kind === "enum") {
      const { variants, transitionRules } = parseEnumBody(
        (decl.raw as string) ?? "", registry, errors, fileSpan, decl.name as string
      );
      registry.set(decl.name as string, tEnum(decl.name as string, variants, transitionRules));
    } else if (decl.typeKind === "error" && existing.kind === "error") {
      const fields = parseStructBody((decl.raw as string) ?? "", registry);
      registry.set(decl.name as string, tError(decl.name as string, fields));
    }
  }

  return registry;
}

// ---------------------------------------------------------------------------
// State type registry (§35)
// ---------------------------------------------------------------------------

/**
 * Build a state type registry pre-populated with HTML element shapes.
 */
function buildStateTypeRegistry(): Map<string, ResolvedType> {
  const registry = new Map<string, ResolvedType>();

  for (const tagName of getAllElementNames()) {
    const shape = getElementShape(tagName);
    if (!shape) continue;
    registry.set(tagName, tState(
      tagName,
      shape.attributes,
      /* isHtml */ shape.rendersToDom,  // program is not HTML
      /* rendersToDom */ shape.rendersToDom,
      /* constructorBody */ null,
    ));
  }

  return registry;
}

/**
 * Register a user-defined state type in the registry.
 */
function registerStateType(
  registry: Map<string, ResolvedType>,
  name: string,
  attributes: Map<string, AttributeShapeDef>,
  rendersToDom: boolean,
  constructorBody: ASTNodeLike[] | null,
  errors: TSError[],
  span: Span,
  authority?: "server" | "local",
  tableName?: string | null,
): boolean {
  // E-STATE-005: collision with HTML element name
  if (getElementShape(name) !== null) {
    errors.push(new TSError(
      "E-STATE-005",
      `E-STATE-005: State type name \`${name}\` collides with a built-in HTML element name. ` +
      `Choose a different name for your state type.`,
      span,
    ));
    return false;
  }

  // E-AUTH-004: same type name with conflicting authority values (§52.3.4)
  const existing = registry.get(name) as StateType | undefined;
  if (existing && !existing.isHtml && existing.authority !== undefined && authority !== undefined) {
    if (existing.authority !== authority) {
      errors.push(new TSError(
        "E-AUTH-004",
        `E-AUTH-004: Conflicting authority declarations for type '${name}': cannot be both ` +
        `server-authoritative and local. Two declarations of the same state type must use ` +
        `the same authority= value, or be declared as two distinct types.`,
        span,
      ));
      return false;
    }
  }

  // E-STATE-006: duplicate state type name (already registered as user-defined)
  if (existing && !existing.isHtml) {
    errors.push(new TSError(
      "E-STATE-006",
      `E-STATE-006: Duplicate state type definition for \`${name}\`. ` +
      `A state type with this name is already defined.`,
      span,
    ));
    return false;
  }

  // E-AUTH-003: authority="server" requires table= (§52.3.3)
  if (authority === "server" && !tableName) {
    errors.push(new TSError(
      "E-AUTH-003",
      `E-AUTH-003: State type '${name}' declares authority="server" but has no table= attribute. ` +
      `The compiler cannot generate sync infrastructure without a database table mapping. ` +
      `Add table="<tablename>" to the < ${name}> declaration.`,
      span,
    ));
    return false;
  }

  registry.set(name, tState(name, attributes, false, rendersToDom, constructorBody, authority, tableName));
  return true;
}

/**
 * Look up a state type by name.
 */
function getStateType(registry: Map<string, ResolvedType>, name: string): ResolvedType | null {
  return registry.get(name) ?? null;
}

// ---------------------------------------------------------------------------
// §51.3 Machine Registry
// ---------------------------------------------------------------------------

/**
 * Build a machine registry from machine-decl AST nodes.
 * Validates each machine against the type registry and emits errors.
 *
 * @param machineDecls — machine-decl AST nodes from the file
 * @param typeRegistry — the file's type registry (enums, structs)
 * @param errors — error accumulator
 * @param fileSpan — span for error reporting
 */
function buildMachineRegistry(
  machineDecls: ASTNodeLike[],
  typeRegistry: Map<string, ResolvedType>,
  errors: TSError[],
  fileSpan: Span,
): Map<string, MachineType> {
  const registry = new Map<string, MachineType>();

  for (const decl of machineDecls) {
    const name = decl.machineName as string;
    const govName = decl.governedType as string;
    const rulesRaw = (decl.rulesRaw as string) || "";
    const span = (decl.span as Span) || fileSpan;

    // E-MACHINE-003: duplicate machine name
    if (registry.has(name)) {
      errors.push(new TSError(
        "E-MACHINE-003",
        `E-MACHINE-003: Duplicate machine name '${name}'. ` +
        `A machine with this name is already declared in this file.`,
        span,
      ));
      continue;
    }

    // E-MACHINE-004: governed type must exist and be enum or struct
    const govType = typeRegistry.get(govName) ?? null;
    if (!govType) {
      errors.push(new TSError(
        "E-MACHINE-004",
        `E-MACHINE-004: Machine '${name}' references unknown type '${govName}'. ` +
        `The 'for' clause must name an enum or struct type declared in this file or imported via 'use'.`,
        span,
      ));
      continue;
    }
    if (govType.kind !== "enum" && govType.kind !== "struct") {
      errors.push(new TSError(
        "E-MACHINE-004",
        `E-MACHINE-004: Machine '${name}' references type '${govName}' which is a ${govType.kind}, not an enum or struct. ` +
        `Machines can only govern enum or struct types. For primitive value constraints, use inline predicates (§53).`,
        span,
      ));
      continue;
    }

    // Parse the rules from rulesRaw
    const rules = parseMachineRules(rulesRaw, govType, name, errors, span);

    // E-MACHINE-005: empty machine body
    if (rules.length === 0) {
      errors.push(new TSError(
        "E-MACHINE-005",
        `E-MACHINE-005: Machine '${name}' has no transition rules. ` +
        `A machine with an empty body serves no purpose. Add at least one rule.`,
        span,
      ));
      continue;
    }

    registry.set(name, {
      kind: "machine",
      name,
      governedTypeName: govName,
      governedType: govType,
      rules,
    });
  }

  return registry;
}

/**
 * Parse machine rules from raw text.
 * Format: `.From => .To`, `.From => .To given (guard)`, `* => *` wildcards.
 * Guards ARE permitted in machine rules (unlike type-level transitions).
 */
function parseMachineRules(
  raw: string,
  govType: ResolvedType,
  machineName: string,
  errors: TSError[],
  span: Span,
): TransitionRule[] {
  const rules: TransitionRule[] = [];
  if (!raw.trim()) return rules;

  // Split on newlines and semicolons
  const lines = raw.split(/[\n;]/).map(l => l.trim()).filter(Boolean);

  for (const line of lines) {
    // Skip comment lines
    if (line.startsWith("//")) continue;

    // Match: .From => .To [given (guard)] [{effect}]
    const ruleMatch = line.match(
      /^(?:\.|\:\:|\*)\s*(\w+|\*)?\s*=>\s*(?:\.|\:\:|\*)\s*(\w+|\*)?\s*(?:given\s*\(([^)]*)\))?\s*(?:\[(\w+)\])?\s*(\{[\s\S]*\})?\s*$/
    );
    if (!ruleMatch) {
      // Try simpler: just .X => .Y or * => .Y
      const simpleMatch = line.match(
        /^(?:\.|\:\:)(\w+)\s*=>\s*(?:\.|\:\:)(\w+)/
      );
      const wildcardMatch = line.match(
        /^\*\s*=>\s*(?:\.|\:\:)(\w+)/
      );
      if (simpleMatch) {
        rules.push({
          from: simpleMatch[1],
          to: simpleMatch[2],
          guard: null,
          label: null,
          effectBody: null,
        });
        continue;
      }
      if (wildcardMatch) {
        rules.push({
          from: "*",
          to: wildcardMatch[1],
          guard: null,
          label: null,
          effectBody: null,
        });
        continue;
      }
      // * => * given (guard) for struct-governing machines
      const structWildcard = line.match(
        /^\*\s*=>\s*\*\s*given\s*\(([^)]*)\)\s*(?:\[(\w+)\])?\s*$/
      );
      if (structWildcard) {
        rules.push({
          from: "*",
          to: "*",
          guard: structWildcard[1].trim(),
          label: structWildcard[2] || null,
          effectBody: null,
        });
        continue;
      }
      continue; // skip unparseable lines
    }

    const from = ruleMatch[1] || "*";
    const to = ruleMatch[2] || "*";
    const guard = ruleMatch[3] ? ruleMatch[3].trim() : null;
    const label = ruleMatch[4] || null;
    const effectBody = ruleMatch[5] ? ruleMatch[5].slice(1, -1).trim() : null;

    // Validate variant names against governed type (for enums)
    if (govType.kind === "enum") {
      const enumType = govType as EnumType;
      const variantNames = new Set(enumType.variants.map(v => v.name));
      if (from !== "*" && !variantNames.has(from)) {
        errors.push(new TSError(
          "E-MACHINE-004",
          `E-MACHINE-004: Machine '${machineName}' rule references unknown variant '${from}' ` +
          `in type '${enumType.name}'. Valid variants: ${[...variantNames].join(", ")}.`,
          span,
        ));
      }
      if (to !== "*" && !variantNames.has(to)) {
        errors.push(new TSError(
          "E-MACHINE-004",
          `E-MACHINE-004: Machine '${machineName}' rule references unknown variant '${to}' ` +
          `in type '${enumType.name}'. Valid variants: ${[...variantNames].join(", ")}.`,
          span,
        ));
      }
    }

    // Validate self.* references for struct-governing machines
    if (govType.kind === "struct" && guard) {
      const structType = govType as StructType;
      const selfRefs = guard.match(/self\.(\w+)/g) || [];
      for (const ref of selfRefs) {
        const fieldName = ref.slice(5); // strip "self."
        if (!structType.fields.has(fieldName)) {
          errors.push(new TSError(
            "E-MACHINE-013",
            `E-MACHINE-013: Machine '${machineName}' guard references undefined field 'self.${fieldName}' ` +
            `in struct type '${(govType as StructType).name}'. Valid fields: ${[...structType.fields.keys()].join(", ")}.`,
            span,
          ));
        }
      }
    }

    rules.push({ from, to, guard, label, effectBody });
  }

  return rules;
}

/**
 * Check if a reactive variable declaration has a machine binding annotation.
 * Returns the machine name if `@var: MachineName = value` and MachineName
 * resolves to a machine, or null otherwise.
 */
function resolveMachineBinding(
  typeAnnotation: string | null,
  machineRegistry: Map<string, MachineType>,
): MachineType | null {
  if (!typeAnnotation) return null;
  const name = typeAnnotation.trim();
  return machineRegistry.get(name) ?? null;
}

// ---------------------------------------------------------------------------
// DB-schema type generator (§14.8)
// ---------------------------------------------------------------------------

interface GeneratedDbTypes {
  generatedNames: Map<string, { fullType: ResolvedType; clientType: ResolvedType }>;
  errors: TSError[];
}

/**
 * Generate db-schema-derived struct types for a single `< db>` block.
 */
function generateDbTypes(
  dbTypeViews: DBTypeViews,
  stateBlockId: string,
  blockSpan: Span,
  userTypeRegistry: Map<string, ResolvedType>,
): GeneratedDbTypes {
  const errors: TSError[] = [];
  const generatedNames = new Map<string, { fullType: ResolvedType; clientType: ResolvedType }>();

  if (!dbTypeViews || !dbTypeViews.tables) {
    return { generatedNames, errors };
  }

  // Track names generated within this db block to detect inter-table collisions.
  const seenNamesThisBlock = new Map<string, string>();

  for (const [tableName, tableTypeView] of dbTypeViews.tables) {
    const { name: generatedName, error: initCapError } = initCap(tableName);

    if (initCapError) {
      errors.push(new TSError(
        "E-TYPE-052",
        `E-TYPE-052: Table name \`${tableName}\` produces an invalid scrml identifier after the InitCap algorithm. ` +
        `Table names must produce valid identifiers (beginning with an ASCII letter or underscore, ` +
        `containing only alphanumeric characters and underscores). Got: "${tableName}".`,
        blockSpan,
      ));
      continue;
    }

    // E-TYPE-050: collision with another table in the same block.
    if (seenNamesThisBlock.has(generatedName!)) {
      const otherTable = seenNamesThisBlock.get(generatedName!);
      errors.push(new TSError(
        "E-TYPE-050",
        `E-TYPE-050: Tables \`${otherTable}\` and \`${tableName}\` in the same \`< db>\` block ` +
        `both produce the generated type name \`${generatedName}\`. Rename one of the tables to resolve the collision.`,
        blockSpan,
      ));
      continue;
    }

    // E-TYPE-050: collision with a user-declared type.
    if (userTypeRegistry && userTypeRegistry.has(generatedName!) &&
        !BUILTIN_TYPES.has(generatedName!)) {
      errors.push(new TSError(
        "E-TYPE-050",
        `E-TYPE-050: The generated type name \`${generatedName}\` (from table \`${tableName}\`) ` +
        `collides with a user-declared type. Rename the table or the user-declared type.`,
        blockSpan,
      ));
      // Per §14.8.4: continue with the generated type, accumulate the error.
    }

    seenNamesThisBlock.set(generatedName!, tableName);

    // Build full-schema struct type.
    const fullFields = new Map<string, ResolvedType>();
    for (const col of (tableTypeView.fullSchema ?? [])) {
      const { type, warning } = mapSqliteType(col.sqlType, col.nullable);
      if (warning) {
        errors.push(new TSError(
          "E-TYPE-051",
          `E-TYPE-051: Column \`${col.name}\` in table \`${tableName}\` has type ` +
          `\`${col.sqlType}\` which is not mappable after the SQLite affinity algorithm. ` +
          `The column has been typed as \`asIs\`. Declare an explicit type or use a recognized SQLite type.`,
          blockSpan,
          "warning",
        ));
      }
      fullFields.set(col.name, type);
    }
    const fullType = tStruct(generatedName!, fullFields);

    // Build client-schema struct type.
    const clientFields = new Map<string, ResolvedType>();
    for (const col of (tableTypeView.clientSchema ?? [])) {
      const { type } = mapSqliteType(col.sqlType, col.nullable);
      clientFields.set(col.name, type);
    }
    const clientType = tStruct(generatedName!, clientFields);

    generatedNames.set(generatedName!, { fullType, clientType });
  }

  return { generatedNames, errors };
}

// ---------------------------------------------------------------------------
// Node type annotator
// ---------------------------------------------------------------------------

/**
 * Produce a stable string key for a node's span, used as the nodeTypes map key.
 */
function nodeKey(node: ASTNodeLike): string {
  if (node.id !== undefined) return String(node.id);
  if (node.span) {
    const s = node.span as Span;
    return `${s.start}-${s.end}`;
  }
  return `node-${Math.random()}`;
}

// ---------------------------------------------------------------------------
// §35 Attribute validation for markup nodes
// ---------------------------------------------------------------------------

/**
 * Infer the type of an attribute value from its AST representation.
 */
function inferAttrValueType(value: unknown): string | null {
  if (!value) return null;

  // String literal (quoted value)
  if ((value as ASTNodeLike).kind === "string-literal" || typeof value === "string") return "string";

  // Number literal
  if ((value as ASTNodeLike).kind === "number-literal") return "number";

  // Boolean literal
  if ((value as ASTNodeLike).kind === "boolean-literal") return "boolean";

  // Variable reference or expression — type is not known at this point
  return null;
}

/**
 * Validate attributes on a markup node against its state type shape.
 */
function validateMarkupAttributes(
  node: ASTNodeLike,
  stateType: StateType,
  errors: TSError[],
  filePath: string,
): void {
  const attrs = node.attrs as ASTNodeLike[] | undefined;
  if (!Array.isArray(attrs) || attrs.length === 0) return;

  const shape = stateType.attributes;
  if (!shape || !(shape instanceof Map)) return;

  for (const attr of attrs) {
    if (!attr || !attr.name) continue;
    const attrName = attr.name as string;
    const attrSpan = (attr.span ?? node.span ?? { file: filePath, start: 0, end: 0, line: 1, col: 1 }) as Span;

    // ref= is a compiler directive, not an HTML attribute — skip validation
    if (attrName === "ref") continue;

    // bind: directives are compiler directives — skip validation
    if (attrName.startsWith("bind:")) continue;

    // class: directives are compiler directives — skip validation
    if (attrName.startsWith("class:")) continue;

    const shapeDef = shape.get(attrName);

    if (shapeDef) {
      // Known attribute — check type if we can infer the value type.
      const valueType = inferAttrValueType(attr.value);
      if (valueType && shapeDef.type !== valueType) {
        errors.push(new TSError(
          "E-MARKUP-002",
          `E-MARKUP-002: Attribute \`${attrName}\` on <${node.name}> expects type \`${shapeDef.type}\` ` +
          `but received \`${valueType}\`.`,
          attrSpan,
        ));
      }
    } else {
      // Unknown attribute.
      if (stateType.isHtml) {
        // HTML element — E-MARKUP-003
        const isDataAttr = attrName.startsWith("data-");
        const isAriaAttr = attrName.startsWith("aria-");
        if (isDataAttr || isAriaAttr) {
          // data-* and aria-* are valid on all HTML elements per spec, emit warning only
          errors.push(new TSError(
            "E-MARKUP-003",
            `E-MARKUP-003: Custom attribute \`${attrName}\` on <${node.name}>.`,
            attrSpan,
            "warning",
          ));
        } else {
          errors.push(new TSError(
            "E-MARKUP-003",
            `E-MARKUP-003: Unknown attribute \`${attrName}\` on HTML element <${node.name}>. ` +
            `This attribute is not in the HTML specification for this element.`,
            attrSpan,
          ));
        }
      } else {
        // User-defined state type — E-STATE-004
        errors.push(new TSError(
          "E-STATE-004",
          `E-STATE-004: Unknown attribute \`${attrName}\` on state type <${node.name}>. ` +
          `The state type \`${node.name}\` does not define an attribute named \`${attrName}\`.`,
          attrSpan,
        ));
      }
    }
  }
}

/**
 * Walk the AST of a single file and annotate every node with a ResolvedType.
 */
// ---------------------------------------------------------------------------
// §52 — State Authority helpers
// ---------------------------------------------------------------------------

/**
 * Returns true if the fileAST has a <program> node with a db= attribute.
 * Used to check E-AUTH-005: server @var requires a server context.
 */
function hasProgramDbAttr(fileAST: FileAST): boolean {
  const nodes = (fileAST.nodes as ASTNodeLike[] | undefined)
    ?? ((fileAST.ast as FileAST | undefined)?.nodes as ASTNodeLike[] | undefined)
    ?? [];
  const programNode = nodes.find(
    (node: ASTNodeLike) => node.kind === "markup" && (node as ASTNodeLike).tag === "program"
  );
  if (!programNode) return false;
  const attrs = (programNode as ASTNodeLike).attrs as Array<{name: string; value: unknown}> | undefined;
  return !!(attrs && attrs.some((a: {name: string; value: unknown}) => a.name === "db"));
}

function annotateNodes(
  fileAST: FileAST,
  scopeChain: ScopeChain,
  typeRegistry: Map<string, ResolvedType>,
  routeMap: RouteMap,
  protectAnalysis: ProtectAnalysis,
  generatedTypesByScopeId: Map<string, Map<string, { fullType: ResolvedType; clientType: ResolvedType }>>,
  errors: TSError[],
  stateTypeRegistry: Map<string, ResolvedType>,
  machineRegistry: Map<string, MachineType>,
): Map<string, ResolvedType> {
  const nodeTypes = new Map<string, ResolvedType>();
  const filePath = fileAST.filePath;

  function functionBoundary(fnNode: ASTNodeLike): "server" | "client" {
    if (!routeMap || !routeMap.functions) return "client";
    const id = `${filePath}::${(fnNode.span as Span | undefined)?.start}`;
    const entry = routeMap.functions.get(id);
    return entry ? entry.boundary : "client";
  }

  // Build a map of function name -> errorType for exhaustive !{} checking (§19.7).
  // Also builds fnCanFail (all failable functions) and fnAllDeclared (all function names)
  // for E-ERROR-002 and E-ERROR-004 checks.
  const fnErrorTypes = new Map<string, string>();
  const fnCanFail = new Set<string>();     // all functions with canFail === true
  const fnAllDeclared = new Set<string>(); // all function-decl names in this file
  const nonPureFnNames = new Set<string>(); // names declared with `function` (not `fn`) — callable-but-not-pure (§48.6.2)
  function collectFnErrorTypes(nodes: ASTNodeLike[]): void {
    for (const n of nodes) {
      if (n.kind === "function-decl" && n.name) {
        fnAllDeclared.add(n.name as string);
        // Non-pure = declared with `function` AND not marked `pure` (§48.6.2 opt-in).
        if ((n as ASTNodeLike).fnKind !== "fn" && (n as ASTNodeLike).isPure !== true) {
          nonPureFnNames.add(n.name as string);
        }
        if (n.canFail === true) {
          fnCanFail.add(n.name as string);
          if (n.errorType) {
            fnErrorTypes.set(n.name as string, n.errorType as string);
          }
        }
      }
      // Recurse into body and children for nested functions.
      const body = n.body as ASTNodeLike[] | undefined;
      if (Array.isArray(body)) collectFnErrorTypes(body);
      const children = n.children as ASTNodeLike[] | undefined;
      if (Array.isArray(children)) collectFnErrorTypes(children);
    }
  }
  collectFnErrorTypes(
    (fileAST.nodes as ASTNodeLike[] | undefined)
    ?? ((fileAST.ast as FileAST | undefined)?.nodes as ASTNodeLike[] | undefined)
    ?? []
  );

  function visitNode(node: unknown): ResolvedType {
    if (!node || typeof node !== "object") return tUnknown();

    const n = node as ASTNodeLike;
    const key = nodeKey(n);
    let resolvedType: ResolvedType;

    switch (n.kind) {
      // ------------------------------------------------------------------
      // Markup element
      // ------------------------------------------------------------------
      case "markup": {
        // Visit attributes for identifier resolution.
        const attrs = n.attrs as ASTNodeLike[] | undefined;
        if (Array.isArray(attrs)) {
          for (const attr of attrs) {
            visitAttr(attr, n);
          }
        }

        // §35 Attribute validation
        if (stateTypeRegistry && n.name && !n.isComponent) {
          const stateType = stateTypeRegistry.get(n.name as string) as StateType | undefined;
          if (stateType) {
            validateMarkupAttributes(n, stateType, errors, filePath);
          }
        }

        // ref= type narrowing
        if (Array.isArray(attrs)) {
          for (const attr of attrs) {
            if (attr && attr.name === "ref" && attr.value && (attr.value as ASTNodeLike).kind === "variable-ref") {
              const refVarName = ((attr.value as ASTNodeLike).name as string).replace(/^@/, "");
              const elemShape = getElementShape((n.name as string) ?? "");
              if (elemShape && elemShape.domInterface) {
                scopeChain.bind(refVarName, {
                  kind: "ref-binding",
                  resolvedType: tUnion([tPrimitive(elemShape.domInterface), tPrimitive("null")]),
                  domInterface: elemShape.domInterface,
                });
              } else {
                scopeChain.bind(refVarName, {
                  kind: "ref-binding",
                  resolvedType: tUnion([tPrimitive("Element"), tPrimitive("null")]),
                  domInterface: "Element",
                });
              }
            }
          }
        }

        // Visit children.
        // §18.18 E-TYPE-081: Check for `partial match` in logic children (markup interpolation context).
        // A ${ partial match ... } block inside markup silently drops unmatched variants.
        const children = n.children as ASTNodeLike[] | undefined;
        if (Array.isArray(children)) {
          for (const child of children) {
            // If this child is a logic block, scan its body for partial match-stmt nodes.
            if ((child as ASTNodeLike).kind === "logic") {
              const logicBody = (child as ASTNodeLike).body as ASTNodeLike[] | undefined;
              if (Array.isArray(logicBody)) {
                for (const stmt of logicBody) {
                  if (
                    (stmt as ASTNodeLike).kind === "match-stmt" &&
                    (stmt as ASTNodeLike).partial === true
                  ) {
                    errors.push(new TSError(
                      "E-TYPE-081",
                      "E-TYPE-081: `partial match` is not valid in a rendering context. " +
                      "A `partial match` inside a markup interpolation (`${}`) would silently produce " +
                      "no output for unhandled variants, making it indistinguishable from a missing case. " +
                      "Use standard `match` with an `else` arm that renders nothing for variants you want to skip.",
                      (stmt as ASTNodeLike).span as Span,
                    ));
                  }
                }
              }
            }
            visitNode(child);
          }
        }
        resolvedType = { kind: "html-element", tag: (n.name as string) ?? "unknown", attrs: {} };
        break;
      }

      // ------------------------------------------------------------------
      // State block (`< db>`, etc.)
      // ------------------------------------------------------------------
      case "state": {
        scopeChain.push(`state:${(n.stateType as string) ?? "unknown"}`);

        if (n.stateType === "db") {
          const stateBlockId = `${filePath}::${(n.span as Span | undefined)?.start}`;
          const genMap = generatedTypesByScopeId.get(stateBlockId);
          if (genMap) {
            for (const [name, { fullType, clientType }] of genMap) {
              scopeChain.bind(name, {
                kind: "db-type",
                resolvedType: clientType,
                fullType,
                clientType,
              });
            }
          }
        }

        const stateChildren = n.children as ASTNodeLike[] | undefined;
        if (Array.isArray(stateChildren)) {
          for (const child of stateChildren) visitNode(child);
        }

        scopeChain.pop();
        resolvedType = tAsIs();
        break;
      }

      // ------------------------------------------------------------------
      // State constructor definition (`< name attrib(type)>`)
      // ------------------------------------------------------------------
      case "state-constructor-def": {
        const ctorName = (n.stateType as string) ?? "unknown";
        scopeChain.push(`state-ctor:${ctorName}`);

        if (stateTypeRegistry && Array.isArray(n.typedAttrs)) {
          const attrMap = new Map<string, AttributeShapeDef>();
          for (const ta of (n.typedAttrs as ASTNodeLike[])) {
            attrMap.set(ta.name as string, {
              type: ta.typeExpr as string,
              required: !ta.optional,
              default: ta.defaultValue,
            });
          }

          const ctorSpan = (n.span as Span | undefined) ?? { file: filePath, start: 0, end: 0, line: 1, col: 1 };

          // §52.3: Read authority and table attrs from state-constructor-def node.
          // These are non-typed attrs (e.g., authority="server" table="cards") stored in n.attrs.
          const ctorAttrs = (n.attrs as Array<{name: string; value: {kind: string; value?: string}}> | undefined) ?? [];
          const authorityAttr = ctorAttrs.find(a => a.name === "authority");
          const tableAttr = ctorAttrs.find(a => a.name === "table");
          const ctorAuthority = authorityAttr?.value?.kind === "string-literal"
            ? (authorityAttr.value.value as "server" | "local")
            : undefined;
          const ctorTableName = tableAttr?.value?.kind === "string-literal"
            ? tableAttr.value.value
            : null;

          registerStateType(
            stateTypeRegistry,
            ctorName,
            attrMap,
            /* rendersToDom */ false,
            /* constructorBody */ (n.children as ASTNodeLike[] | undefined) ?? null,
            errors,
            ctorSpan,
            ctorAuthority,
            ctorTableName,
          );

          for (const ta of (n.typedAttrs as ASTNodeLike[])) {
            scopeChain.bind(ta.name as string, {
              kind: "state-attr",
              resolvedType: resolveTypeExpr(ta.typeExpr as string, typeRegistry) ?? tAsIs(),
            });
          }
        }

        const ctorChildren = n.children as ASTNodeLike[] | undefined;
        if (Array.isArray(ctorChildren)) {
          for (const child of ctorChildren) visitNode(child);
        }

        scopeChain.pop();
        resolvedType = tState(ctorName, new Map(), false, false, (n.children as ASTNodeLike[] | undefined) ?? null);
        break;
      }

      // ------------------------------------------------------------------
      // Logic block (`${ }`)
      // ------------------------------------------------------------------
      case "logic": {
        const body = n.body as ASTNodeLike[] | undefined;
        if (Array.isArray(body)) {
          for (const stmt of body) visitNode(stmt);
        }
        resolvedType = tAsIs();
        break;
      }

      // ------------------------------------------------------------------
      // Function declaration
      // ------------------------------------------------------------------
      case "function-decl": {
        const boundary = functionBoundary(n);

        scopeChain.push(`fn:${(n.name as string) ?? "anon"}:${boundary}`);

        // Bind parameters into the function scope.
        if (Array.isArray(n.params)) {
          for (const param of (n.params as unknown[])) {
            const paramName = typeof param === "string" ? param : (param as ASTNodeLike).name as string;
            if (paramName) {
              scopeChain.bind(paramName, { kind: "variable", resolvedType: tAsIs() });
            }
          }
        }

        // Walk the body.
        const fnBody = n.body as ASTNodeLike[] | undefined;
        if (Array.isArray(fnBody)) {
          for (const stmt of fnBody) visitLogicNode(stmt, boundary);
        }

        scopeChain.pop();

        // Bind the function name in the enclosing scope.
        const fnType: FunctionType = { kind: "function", name: (n.name as string) ?? "", params: [], returnType: tAsIs() };
        if (n.name) {
          scopeChain.bind(n.name as string, {
            kind: "function",
            resolvedType: fnType,
            isPure: false,
          });
        }

        // §19 Error system validation.
        if (n.kind === "function-decl" && Array.isArray(fnBody)) {
          const canFail = n.canFail === true;
          const fnName = (n.name as string) ?? "<anonymous>";
          for (const stmt of fnBody) {
            if (!stmt) continue;
            // E-ERROR-001: fail used in non-! function (§19.3.3)
            if (stmt.kind === "fail-expr" && !canFail) {
              errors.push(new TSError(
                "E-ERROR-001",
                `E-ERROR-001: 'fail' used in function '${fnName}' which is not declared as failable. ` +
                `Add '!' to the function signature: 'function ${fnName}(...)! -> {ErrorType}'.`,
                (stmt.span ?? n.span) as Span,
              ));
            }
            // E-ERROR-003: ? propagation in non-! function (§19.5.4)
            if (stmt.kind === "propagate-expr" && !canFail) {
              errors.push(new TSError(
                "E-ERROR-003",
                `E-ERROR-003: '?' propagation operator used in function '${fnName}' which is not declared as failable. ` +
                `Add '!' to the function signature or handle the error with 'match' or '!{}'.`,
                (stmt.span ?? n.span) as Span,
              ));
            }
            // E-ERROR-004: ? applied to non-failable callee (§19.5.4)
            if (stmt.kind === "propagate-expr" && canFail) {
              const calleeName = extractCalleeNameFromNode(stmt) ?? extractCalleeNameFromString(stmt.expr as string | undefined);
              if (calleeName && fnAllDeclared.has(calleeName) && !fnCanFail.has(calleeName)) {
                errors.push(new TSError(
                  "E-ERROR-004",
                  `E-ERROR-004: '?' applied to call to '${calleeName}' which is not a failable function. ` +
                  `Only '!' functions can be propagated with '?'.`,
                  (stmt.span ?? n.span) as Span,
                ));
              }
            }
          }
          // E-ERROR-002: bare call to failable function with no error handling (§19.4.3)
          for (const stmt of fnBody) {
            if (!stmt || stmt.kind !== "bare-expr") continue;
            const bareCallee = extractCalleeNameFromNode(stmt) ?? extractCalleeNameFromString(stmt.expr as string | undefined);
            if (bareCallee && fnCanFail.has(bareCallee)) {
              errors.push(new TSError(
                "E-ERROR-002",
                `E-ERROR-002: Result of failable function '${bareCallee}' is not handled. ` +
                `Either match the result, propagate with '?', catch with '!{}', or wrap in '<errorBoundary>'.`,
                (stmt.span ?? n.span) as Span,
              ));
            }
          }
        }

        // §48 fn body prohibition checks (E-FN-001 through E-FN-008)
        if (n.fnKind === "fn" && Array.isArray(fnBody)) {
          checkFnBodyProhibitions(n, fnBody, errors, filePath, stateTypeRegistry, nonPureFnNames, scopeChain);
        }

        resolvedType = fnType;
        break;
      }

      // ------------------------------------------------------------------
      // Type declaration — already handled in registry; just record type here.
      // ------------------------------------------------------------------
      case "type-decl": {
        if (n.name && typeRegistry.has(n.name as string)) {
          resolvedType = typeRegistry.get(n.name as string)!;
          // Bind the type name in the current scope.
          scopeChain.bind(n.name as string, { kind: "type", resolvedType });
        } else {
          resolvedType = tAsIs();
        }
        break;
      }

      // ------------------------------------------------------------------
      // Let / const declarations
      // ------------------------------------------------------------------
      case "let-decl":
      case "const-decl": {
        resolvedType = tAsIs();
        // §53.4 — If a type annotation is present and predicated, classify the assignment zone.
        const letAnnot = (n as ASTNodeLike).typeAnnotation as string | undefined;
        if (letAnnot) {
          const letAnnoType = resolveTypeExpr(letAnnot, typeRegistry);
          if (letAnnoType.kind === "predicated") {
            resolvedType = letAnnoType;
            const letDeclSpan = (n.span as Span | undefined) ?? { file: filePath, start: 0, end: 0, line: 1, col: 1 };
            const letSourceInfo = (n as any).initExpr ? classifyLiteralFromExprNode((n as any).initExpr) : extractInitLiteral((n as ASTNodeLike).init);
            const letZone = classifyPredicateZone(letAnnoType, letSourceInfo, letDeclSpan, errors);
            if (letZone === "boundary") {
              (n as ASTNodeLike).predicateCheck = { predicate: letAnnoType.predicate, zone: "boundary" };
            }
          } else {
            // §14: E-TYPE-031 literal-mismatch for unpredicated primitive annotations
            // (number/string/boolean). More elaborate type inference can come later; this
            // catches the common case of `const n: number = "x"`.
            const annotBase = letAnnot.trim();
            const primitives = new Set(["number", "string", "boolean"]);
            if (primitives.has(annotBase)) {
              const srcInfo = (n as any).initExpr
                ? classifyLiteralFromExprNode((n as any).initExpr)
                : extractInitLiteral((n as ASTNodeLike).init);
              if (srcInfo.kind === "literal") {
                const actualKind = typeof srcInfo.value;
                if (actualKind !== annotBase) {
                  const letSpan = (n.span as Span | undefined) ?? { file: filePath, start: 0, end: 0, line: 1, col: 1 };
                  errors.push(new TSError(
                    "E-TYPE-031",
                    `E-TYPE-031: type annotation \`${annotBase}\` does not match initializer of type \`${actualKind}\` ` +
                    `(\`${(n as ASTNodeLike).name ?? "<anonymous>"}\` at line ${letSpan.line}). ` +
                    `Either change the annotation to \`${actualKind}\`, or change the initializer to a \`${annotBase}\` value.`,
                    letSpan,
                  ));
                }
              }
            }
          }
        }
        if (n.name) {
          scopeChain.bind(n.name as string, { kind: "variable", resolvedType });
        }
        break;
      }

      // ------------------------------------------------------------------
      // Reactive declaration (`@name = expr`)
      // ------------------------------------------------------------------
      case "reactive-decl": {
        resolvedType = tAsIs();
        // §53.4 — If a type annotation is present and predicated, classify the assignment zone.
        const reactAnnot = (n as ASTNodeLike).typeAnnotation as string | undefined;
        if (reactAnnot) {
          const reactAnnoType = resolveTypeExpr(reactAnnot, typeRegistry);
          if (reactAnnoType.kind === "predicated") {
            resolvedType = reactAnnoType;
            const reactDeclSpan = (n.span as Span | undefined) ?? { file: filePath, start: 0, end: 0, line: 1, col: 1 };
            const reactSourceInfo = (n as any).initExpr ? classifyLiteralFromExprNode((n as any).initExpr) : extractInitLiteral((n as ASTNodeLike).init);
            const reactZone = classifyPredicateZone(reactAnnoType, reactSourceInfo, reactDeclSpan, errors);
            if (reactZone === "boundary") {
              (n as ASTNodeLike).predicateCheck = { predicate: reactAnnoType.predicate, zone: "boundary" };
            }
          }
        }
        // §51.3.3: Check for machine binding annotation (@var: MachineName)
        if (reactAnnot && machineRegistry.size > 0) {
          const boundMachine = resolveMachineBinding(reactAnnot, machineRegistry);
          if (boundMachine) {
            (n as ASTNodeLike).machineBinding = boundMachine.name;
            // Resolve the governed type for downstream codegen
            if (boundMachine.governedType) {
              resolvedType = boundMachine.governedType;
            }
          }
        }

        if (n.name) {
          const isServer = !!(n as ASTNodeLike).isServer;
          scopeChain.bind(`@${n.name as string}`, { kind: "reactive", resolvedType, isServer });
          scopeChain.bind(n.name as string, { kind: "reactive", resolvedType, isServer });

          if (isServer) {
            const declSpan = (n.span as Span | undefined) ?? { file: filePath, start: 0, end: 0, line: 1, col: 1 };

            // E-AUTH-005: server @var requires a server context (db= on <program>) (§52.11)
            if (!hasProgramDbAttr(fileAST)) {
              errors.push(new TSError(
                "E-AUTH-005",
                `E-AUTH-005: 'server @${n.name as string}' declared in a client-only context. ` +
                `Server-authoritative variables require a server context. ` +
                `Add db= to the enclosing <program> or move the declaration.`,
                declSpan,
              ));
            }

            // W-AUTH-001: server @var with no detectable initial load (§52.11)
            // Phase 4d: ExprNode-first call detection, string fallback.
            const hasInitCall = (n as any).initExpr
              ? exprNodeContainsCall((n as any).initExpr)
              : (() => {
                  const initRaw = typeof (n as ASTNodeLike).init === "string"
                    ? ((n as ASTNodeLike).init as string)
                    : (((n as ASTNodeLike).init && typeof ((n as ASTNodeLike).init as ASTNodeLike).raw === "string")
                        ? ((n as ASTNodeLike).init as ASTNodeLike).raw as string
                        : "");
                  return initRaw ? initRaw.includes("(") : false;
                })();
            if (!hasInitCall) {
              errors.push(new TSError(
                "W-AUTH-001",
                `W-AUTH-001: 'server @${n.name as string}' has no detected initial load. ` +
                `The variable will display its placeholder until explicitly assigned. ` +
                `Add an 'on mount' block or assign from a server function.`,
                declSpan,
                "warning",
              ));
            }

            // E-AUTH-002: server @var init must not reference a client-local
            // reactive var (§39 / §52.11). Derivation from local state would
            // require implicit client->server data flow that the compiler will
            // not synthesize. The user must fetch the value server-side or
            // promote the dependency to a server path.
            const initExprNode = (n as any).initExpr;
            const serverVarName = n.name as string;
            const leakedLocals = new Set<string>();
            if (initExprNode) {
              forEachIdentInExprNode(initExprNode as any, (ident) => {
                if (typeof ident.name !== "string" || !ident.name.startsWith("@")) return;
                const refName = ident.name; // includes '@'
                const bareName = refName.slice(1);
                if (bareName === serverVarName) return; // self-ref; ignore here
                const refEntry = scopeChain.lookup(refName) as { kind?: string; isServer?: boolean } | undefined;
                if (refEntry && refEntry.kind === "reactive" && !refEntry.isServer) {
                  leakedLocals.add(refName);
                }
              });
            }
            for (const leaked of leakedLocals) {
              errors.push(new TSError(
                "E-AUTH-002",
                `E-AUTH-002: 'server @${serverVarName}' is derived from client-local reactive variable '${leaked}'. ` +
                `Server-authoritative variables cannot read client-local state without crossing the server boundary. ` +
                `Fetch \`@${serverVarName}\` from the server via \`server function\` or move the dependency into a server path.`,
                declSpan,
              ));
            }
          }
        }
        break;
      }

      // ------------------------------------------------------------------
      // Bare expression
      // ------------------------------------------------------------------
      case "bare-expr": {
        resolvedType = tAsIs();
        break;
      }

      // ------------------------------------------------------------------
      // SQL block
      // ------------------------------------------------------------------
      case "sql": {
        resolvedType = tAsIs();
        break;
      }

      // ------------------------------------------------------------------
      // CSS inline block.
      // ------------------------------------------------------------------
      case "css-inline": {
        resolvedType = { kind: "cssClass" };
        break;
      }

      // ------------------------------------------------------------------
      // Meta block.
      // ------------------------------------------------------------------
      case "meta": {
        scopeChain.push("meta");
        const metaBody = n.body as ASTNodeLike[] | undefined;
        if (Array.isArray(metaBody)) {
          for (const stmt of metaBody) visitNode(stmt);
        }
        scopeChain.pop();
        resolvedType = { kind: "meta-splice", resultType: tAsIs(), parentContext: "meta" };
        break;
      }

      // ------------------------------------------------------------------
      // Text and comment nodes.
      // ------------------------------------------------------------------
      case "text": {
        resolvedType = tPrimitive("string");
        break;
      }

      case "comment": {
        resolvedType = tAsIs();
        break;
      }

      // ------------------------------------------------------------------
      // Import / export declarations.
      // ------------------------------------------------------------------
      case "import-decl":
      case "export-decl": {
        resolvedType = tAsIs();
        break;
      }

      // ------------------------------------------------------------------
      // Component definition node.
      // ------------------------------------------------------------------
      case "component-def": {
        resolvedType = tAsIs();
        break;
      }

      // ------------------------------------------------------------------
      // Guarded expression — !{} error handler (§19).
      // Checks that all variants of the error enum are handled (E-TYPE-080).
      // ------------------------------------------------------------------
      case "guarded-expr": {
        const guardedNode = n.guardedNode as ASTNodeLike | undefined;
        const errorArms = (n.arms as Array<{pattern?: string; binding?: string; handler?: string}> | undefined) ?? [];

        // Visit the guarded node itself for its type checks.
        if (guardedNode) visitNode(guardedNode);

        // --- Exhaustiveness check (§19.7) ---

        // Step 1: extract the callee expression string from the guarded node.
        // Phase 4d: ExprNode-first callee extraction, string fallback
        let calleeName: string | null = null;
        if (guardedNode) {
          // ExprNode path: look for CallExpr with ident callee
          const _gExprNode = (guardedNode as Record<string, unknown>).exprNode ?? (guardedNode as Record<string, unknown>).initExpr;
          if (_gExprNode && typeof _gExprNode === "object" && (_gExprNode as any).kind === "call") {
            const _callee = (_gExprNode as any).callee;
            if (_callee && _callee.kind === "ident") calleeName = _callee.name;
          }
          // String fallback
          if (!calleeName) {
            let calleeExpr: string | null = null;
            if (guardedNode.kind === "bare-expr" && typeof guardedNode.expr === "string") {
              calleeExpr = (guardedNode.expr as string).trim();
            } else if (
              (guardedNode.kind === "let-decl" || guardedNode.kind === "const-decl") &&
              typeof guardedNode.init === "string"
            ) {
              calleeExpr = (guardedNode.init as string).trim();
            }
            if (calleeExpr) {
              const calleeMatch = /^([A-Za-z_$][A-Za-z0-9_$]*)/.exec(calleeExpr);
              if (calleeMatch) calleeName = calleeMatch[1];
            }
          }
        }

        // Step 3: look up the function's errorType from our pre-built map.
        const errorTypeName = calleeName ? (fnErrorTypes.get(calleeName) ?? null) : null;

        // Step 4: if we have a named errorType, look it up in the typeRegistry.
        if (errorTypeName) {
          const errorEnumType = typeRegistry.get(errorTypeName);
          if (errorEnumType && errorEnumType.kind === "enum") {
            const enumType = errorEnumType as EnumType;
            const allVariants = (enumType.variants ?? []).map((v: VariantDef) => v.name);

            // Step 5: analyze the arms — detect wildcard or collect handled variants.
            // arm.pattern is a plain string: "::Declined", "_", or "else" (§19, ast-builder).
            const hasWildcard = errorArms.some(
              (a) => a.pattern === "_" || a.pattern === "else"
            );

            if (!hasWildcard && allVariants.length > 0) {
              const handledVariants = new Set<string>();
              for (const arm of errorArms) {
                const p = arm.pattern ?? "";
                if (p !== "_" && p !== "else") {
                  // Strip "::" prefix (e.g. "::Declined" -> "Declined").
                  const variantName = p.replace(/^::/, "").replace(/^\./, "");
                  if (variantName) handledVariants.add(variantName);
                }
              }

              // Step 6: find missing variants and emit E-TYPE-080.
              const missing = allVariants.filter((v: string) => !handledVariants.has(v));
              if (missing.length > 0) {
                errors.push(new TSError(
                  "E-TYPE-080",
                  `E-TYPE-080: Non-exhaustive error handler for \`${errorTypeName}\`. ` +
                  `Missing variant(s): ${missing.join(", ")}. ` +
                  `Add the missing arms or use \`else =>\` to handle all remaining variants.`,
                  n.span as Span,
                ));
              }
            }
          }
        }

        resolvedType = tAsIs();
        break;
      }

      // ------------------------------------------------------------------
      // Error-effect block.
      // ------------------------------------------------------------------
      case "error-effect": {
        resolvedType = tAsIs();
        break;
      }

      // ------------------------------------------------------------------
      // Style block.
      // ------------------------------------------------------------------
      case "style": {
        resolvedType = { kind: "cssClass" };
        const styleChildren = n.children as ASTNodeLike[] | undefined;
        if (Array.isArray(styleChildren)) {
          for (const child of styleChildren) visitNode(child);
        }
        break;
      }

      // ------------------------------------------------------------------
      // lift-expr: `lift partial match ...` in rendering context (E-TYPE-081)
      // ------------------------------------------------------------------
      case "lift-expr": {
        const liftExpr = n.expr as { kind: string; expr?: string } | undefined;
        // Check if the lift target is a raw expression string that starts with "partial match"
        if (liftExpr && liftExpr.kind === "expr" && typeof liftExpr.expr === "string") {
          if (/^\s*partial\s+match/.test(liftExpr.expr)) {
            errors.push(new TSError(
              "E-TYPE-081",
              "E-TYPE-081: `partial match` is not valid in a rendering context. " +
              "A `partial match` in a `lift` expression would silently produce no output for " +
              "unhandled variants, making it indistinguishable from a missing case. " +
              "Use standard `match` with an `else` arm that renders nothing for variants you want to skip: `else => \"\"`.",
              n.span as Span,
            ));
          }
        }
        // For lift with embedded markup (lift-expr with kind === "markup"), the markup
        // node is visited via the default recursion below; partial match inside markup
        // is caught by the markup case above.
        resolvedType = tAsIs();
        break;
      }

      // ------------------------------------------------------------------
      // while-stmt / if-stmt — W-ASSIGN-001: assignment in condition without double parens (§50.2.3)
      // ------------------------------------------------------------------
      case "while-stmt":
      case "if-stmt": {
        // Phase 4d: ExprNode-first — check condExpr for AssignExpr at root
        const condExprNode = (n as Record<string, unknown>).condExpr as import("./types/ast.ts").ExprNode | undefined;
        const condStr = condExprNode
          ? emitStringFromTree(condExprNode)
          : ((n.condition as string | undefined) ?? "").trim();
        if (condStr.length > 0) {
          // ExprNode path: direct structural check for assignment at root
          const hasAssignAtRoot = condExprNode
            ? condExprNode.kind === "assign" && (condExprNode as any).op === "="
            : false;
          const inner = (condStr.startsWith("(") && condStr.endsWith(")"))
            ? condStr.slice(1, -1).trim()
            : condStr;
          const ASSIGN_ROOT_RE = /^[@A-Za-z_$][A-Za-z0-9_$@.]*\s*=[^=]/;
          if (hasAssignAtRoot || ASSIGN_ROOT_RE.test(inner)) {
            const stmtKind = n.kind === "while-stmt" ? "while" : "if";
            const condLine = (n.span as Span | undefined)?.line ?? 1;
            errors.push(new TSError(
              "W-ASSIGN-001",
              `W-ASSIGN-001: Assignment (\`=\`) used as the condition of \`${stmtKind}\` at line ${condLine}.\n` +
              `  Did you mean \`==\` for equality comparison?\n` +
              `  If assignment is intentional, use double parentheses to signal intent:\n\n` +
              `    ${stmtKind} ((${inner.trim()})) { ... }\n`,
              (n.span as Span | undefined) ?? { file: filePath, start: 0, end: 0, line: condLine, col: 1 },
              "warning",
            ));
          }
        }
        const stmtBody = n.body as ASTNodeLike[] | undefined;
        if (Array.isArray(stmtBody)) {
          for (const child of stmtBody) visitNode(child);
        }
        const stmtConsequent = n.consequent as ASTNodeLike[] | undefined;
        if (Array.isArray(stmtConsequent)) {
          for (const child of stmtConsequent) visitNode(child);
        }
        const stmtAlternate = n.alternate as ASTNodeLike[] | undefined;
        if (Array.isArray(stmtAlternate)) {
          for (const child of stmtAlternate) visitNode(child);
        }
        resolvedType = tAsIs();
        break;
      }

      // ------------------------------------------------------------------
      // Unknown node kinds — conservatively asIs, no error here.
      // ------------------------------------------------------------------
      default: {
        // Recurse into any array fields.
        for (const key of Object.keys(n)) {
          if (key === "span" || key === "id") continue;
          const val = n[key];
          if (Array.isArray(val)) {
            for (const child of val) {
              if (child && typeof child === "object" && (child as ASTNodeLike).kind) visitNode(child);
            }
          }
        }
        resolvedType = tAsIs();
        break;
      }
    }

    nodeTypes.set(key, resolvedType);
    return resolvedType;
  }

  function visitLogicNode(node: ASTNodeLike, boundary: "client" | "server"): void {
    if (!node || typeof node !== "object") return;

    const key = nodeKey(node);

    if (node.kind === "bare-expr") {
      nodeTypes.set(key, tAsIs());
      return;
    }

    if (node.kind === "function-decl") {
      visitNode(node);
      return;
    }

    visitNode(node);
  }

  function visitAttr(attr: ASTNodeLike, parent: ASTNodeLike): void {
    if (!attr || !attr.value) return;

    const value = attr.value as ASTNodeLike;

    if (value.kind === "variable-ref") {
      const name = value.name as string;
      // For dotted access like @todos.length, resolve the base name (@todos)
      const baseName = name.includes(".") ? name.slice(0, name.indexOf(".")) : name;
      const entry = scopeChain.lookup(baseName);
      if (!entry) {
        const attrSpan = (value.span ?? attr.span ?? parent?.span ?? {
          file: filePath, start: 0, end: 0, line: 1, col: 1,
        }) as Span;
        errors.push(new TSError(
          "E-SCOPE-001",
          `E-SCOPE-001: Unquoted identifier \`${baseName}\` in attribute \`${attr.name as string}\` ` +
          `cannot be resolved in the current scope. ` +
          `Did you mean to quote it as a string (\`"${baseName}"\`), or use \`@\` for a reactive variable (\`@${baseName}\`)?`,
          attrSpan,
        ));
      }
    }
  }

  // Walk all top-level nodes.
  // CE output shape nests data under fileAST.ast — use dual-shape fallback.
  const topNodes = (fileAST.nodes as ASTNodeLike[] | undefined)
    ?? ((fileAST.ast as FileAST | undefined)?.nodes as ASTNodeLike[] | undefined)
    ?? [];
  for (const node of topNodes) {
    visitNode(node);
  }

  // Also annotate typeDecl nodes that may exist only in fileAST.typeDecls.
  const typeDeclNodes = (fileAST.typeDecls as ASTNodeLike[] | undefined)
    ?? ((fileAST.ast as FileAST | undefined)?.typeDecls as ASTNodeLike[] | undefined)
    ?? [];
  for (const node of typeDeclNodes) {
    const key = nodeKey(node);
    if (!nodeTypes.has(key)) {
      visitNode(node);
    }
  }

  return nodeTypes;
}

// ---------------------------------------------------------------------------
// §42 Not-type utilities (E-TYPE-041, E-TYPE-043)
// ---------------------------------------------------------------------------

/**
 * Check whether a type accepts `not` as a value.
 * A type is "optional" (accepts not) if:
 *   - it is `not` itself
 *   - it is a union containing `not` as a member
 *   - it is `unknown` or `asIs` (permissive types)
 *
 * Returns true if assigning `not` to this type is valid.
 */
function isOptionalType(type: ResolvedType): boolean {
  if (!type) return false;
  if (type.kind === "not") return true;
  if (type.kind === "unknown" || type.kind === "asIs") return true;
  if (type.kind === "union") {
    return (type as UnionType).members.some((m: ResolvedType) => m.kind === "not");
  }
  return false;
}

/**
 * E-TYPE-041: Check whether assigning `not` to a variable of the given type is valid.
 * Returns an error message if invalid, or null if the assignment is allowed.
 */
function checkNotAssignment(targetType: ResolvedType, varName: string): string | null {
  if (isOptionalType(targetType)) return null;
  const typeName = targetType.kind === "primitive" ? (targetType as PrimitiveType).name : targetType.kind;
  return `E-TYPE-041: Cannot assign \`not\` to variable \`${varName}\` of type \`${typeName}\`. ` +
    `Declare the type as \`${typeName} | not\` to allow absence values (§42).`;
}

/**
 * E-TYPE-043: Check whether a function returning `not` has an optional return type.
 * Returns an error message if the return type does not allow `not`, or null if valid.
 */
function checkNotReturn(returnType: ResolvedType, fnName: string): string | null {
  if (isOptionalType(returnType)) return null;
  const typeName = returnType.kind === "primitive" ? (returnType as PrimitiveType).name : returnType.kind;
  return `E-TYPE-043: Function \`${fnName}\` has return type \`${typeName}\` but may return \`not\`. ` +
    `Declare the return type as \`${typeName} | not\` to allow absence return values (§42).`;
}

// ---------------------------------------------------------------------------
// Struct field access checker (E-TYPE-004)
// ---------------------------------------------------------------------------

/**
 * Check member access expressions in a bare-expr string against the type
 * registry for known struct types.
 */
function checkStructFieldAccess(
  expr: string,
  scopeChain: ScopeChain,
  typeRegistry: Map<string, ResolvedType>,
  span: Span,
  errors: TSError[],
): void {
  if (!expr || typeof expr !== "string") return;

  // Match `identifier.identifier` patterns.
  const MEMBER_RE = /\b([A-Za-z_$][A-Za-z0-9_$]*)\.([A-Za-z_$][A-Za-z0-9_$]*)\b/g;
  let m: RegExpExecArray | null;

  while ((m = MEMBER_RE.exec(expr)) !== null) {
    const objName = m[1];
    const fieldName = m[2];

    const entry = scopeChain.lookup(objName);
    if (!entry) continue; // Unresolved — E-SCOPE-001 handles this elsewhere.

    const type = entry.resolvedType;
    if (!type || type.kind !== "struct") continue; // Not a struct — skip.

    // Check whether the field exists.
    if (!type.fields || !type.fields.has(fieldName)) {
      errors.push(new TSError(
        "E-TYPE-004",
        `E-TYPE-004: Struct type \`${type.name}\` does not have a field named \`${fieldName}\`. ` +
        `Available fields: ${type.fields ? [...type.fields.keys()].join(", ") : "(none)"}.`,
        span,
      ));
    }
  }
}

// ---------------------------------------------------------------------------
// TS-C: Pattern matching exhaustiveness checker (§18.8)
// ---------------------------------------------------------------------------

interface ArmPattern {
  kind: "variant" | "wildcard" | "is-type" | string;
  variantName?: string;
  typeName?: string;
}

interface EnumExhaustivenessResult {
  missing: string[];
  unreachableWildcard: boolean;
  duplicateArms: string[];
}

interface UnionExhaustivenessResult {
  missing: string[];
  unreachableWildcard: boolean;
}

/**
 * Check exhaustiveness of a match over an enum type (§18.8.1).
 */
function checkEnumExhaustiveness(
  enumType: EnumType,
  armPatterns: ArmPattern[],
): EnumExhaustivenessResult {
  const allVariants = new Set((enumType.variants ?? []).map(v => v.name));
  const coveredVariants = new Set<string>();
  const duplicateArms: string[] = [];
  let hasWildcard = false;

  for (const pattern of armPatterns) {
    if (pattern.kind === "wildcard") {
      hasWildcard = true;
      break;
    }
    if (pattern.kind === "variant") {
      const name = pattern.variantName!;
      if (coveredVariants.has(name)) {
        duplicateArms.push(name);
      } else {
        coveredVariants.add(name);
      }
    }
  }

  const missing = hasWildcard
    ? []
    : [...allVariants].filter(v => !coveredVariants.has(v));

  const unreachableWildcard = hasWildcard && coveredVariants.size >= allVariants.size;

  return { missing, unreachableWildcard, duplicateArms };
}

/**
 * Check exhaustiveness of a match over a union type (§18.8.2).
 */
function checkUnionExhaustiveness(
  unionType: UnionType,
  armPatterns: ArmPattern[],
): UnionExhaustivenessResult {
  const memberNames = new Set<string>();
  for (const member of (unionType.members ?? [])) {
    if (member.kind === "primitive") {
      memberNames.add((member as PrimitiveType).name);
    } else if (member.kind === "enum") {
      memberNames.add((member as EnumType).name);
    } else if (member.kind === "asIs") {
      memberNames.add("asIs");
    } else {
      memberNames.add(member.kind);
    }
  }

  const coveredMembers = new Set<string>();
  let hasWildcard = false;

  for (const pattern of armPatterns) {
    if (pattern.kind === "wildcard") {
      hasWildcard = true;
      break;
    }
    if (pattern.kind === "is-type") {
      coveredMembers.add(pattern.typeName!);
    }
  }

  const missing = hasWildcard
    ? []
    : [...memberNames].filter(m => !coveredMembers.has(m));

  const unreachableWildcard = hasWildcard && coveredMembers.size >= memberNames.size;

  return { missing, unreachableWildcard };
}

/**
 * TS-C entry point: check exhaustiveness for a match node and emit TSErrors.
 */
function checkExhaustiveness(
  matchNode: ASTNodeLike,
  subjectType: ResolvedType,
  matchSpan: Span,
  errors: TSError[],
  isPartial: boolean = false,
): void {
  const arms = (matchNode.arms as ASTNodeLike[] | undefined) ?? [];
  const armPatterns: ArmPattern[] = arms.map(arm => (arm.pattern as ArmPattern | undefined) ?? { kind: "wildcard" });

  if (subjectType.kind === "enum") {
    const { missing, unreachableWildcard, duplicateArms } =
      checkEnumExhaustiveness(subjectType as EnumType, armPatterns);

    for (const variantName of duplicateArms) {
      errors.push(new TSError(
        "E-TYPE-023",
        `E-TYPE-023: Duplicate match arm for variant \`::${variantName}\`. ` +
        `The second arm for \`${variantName}\` can never be reached. Remove the duplicate arm.`,
        matchSpan,
      ));
    }

    if (missing.length > 0 && !isPartial) {
      errors.push(new TSError(
        "E-TYPE-020",
        `E-TYPE-020: Non-exhaustive match over enum type \`${(subjectType as EnumType).name}\`. ` +
        `Missing variants: ${missing.map(v => `::${v}`).join(", ")}. ` +
        `Add arms for the missing variants, or add an \`else\` arm to handle them all.`,
        matchSpan,
      ));
    }

    if (isPartial && missing.length === 0 && !unreachableWildcard) {
      errors.push(new TSError(
        "W-MATCH-003",
        `W-MATCH-003: \`partial\` is unnecessary — all variants of \`${(subjectType as EnumType).name}\` are explicitly covered. ` +
        `Remove \`partial\` to use standard exhaustive match, which will catch future variant additions.`,
        matchSpan,
        "warning",
      ));
    }

    if (unreachableWildcard) {
      errors.push(new TSError(
        "W-MATCH-001",
        `W-MATCH-001: Wildcard \`_\` arm is unreachable. All variants of \`${(subjectType as EnumType).name}\` ` +
        `are already covered by explicit arms. Remove the \`_\` arm.`,
        matchSpan,
        "warning",
      ));
    }
  } else if (subjectType.kind === "union") {
    const { missing, unreachableWildcard } =
      checkUnionExhaustiveness(subjectType as UnionType, armPatterns);

    if (isPartial && missing.length === 0 && !unreachableWildcard) {
      errors.push(new TSError(
        "W-MATCH-003",
        `W-MATCH-003: \`partial\` is unnecessary — all union members are explicitly covered. ` +
        `Remove \`partial\` to use standard exhaustive match, which will catch future member additions.`,
        matchSpan,
        "warning",
      ));
    }

    if (missing.length > 0 && !isPartial) {
      // E-MATCH-012: specific check for T | not unions missing the `not` arm (§42)
      const unionHasNot = (subjectType as UnionType).members?.some(
        (m: ResolvedType) => m.kind === "not"
      );
      const missingNot = missing.includes("not");
      if (unionHasNot && missingNot) {
        errors.push(new TSError(
          "E-MATCH-012",
          `E-MATCH-012: Match on \`T | not\` type lacks a \`not\` arm and lacks an \`else\`/wildcard arm. ` +
          `Add a \`not => ...\` arm or an \`_ => ...\` wildcard to handle the absence case (§42).`,
          matchSpan,
        ));
        // Also report other missing members (besides `not`) if any
        const otherMissing = missing.filter((m: string) => m !== "not");
        if (otherMissing.length > 0) {
          errors.push(new TSError(
            "E-TYPE-006",
            `E-TYPE-006: Non-exhaustive match over union type. ` +
            `Missing members: ${otherMissing.join(", ")}. ` +
            `Add arms for the missing types, or add an \`else\` arm to handle them all.`,
            matchSpan,
          ));
        }
      } else {
        errors.push(new TSError(
          "E-TYPE-006",
          `E-TYPE-006: Non-exhaustive match over union type. ` +
          `Missing members: ${missing.join(", ")}. ` +
          `Add arms for the missing types, or add an \`else\` arm to handle them all.`,
          matchSpan,
        ));
      }
    }

    if (unreachableWildcard) {
      errors.push(new TSError(
        "W-MATCH-001",
        `W-MATCH-001: Wildcard \`_\` arm is unreachable. All members of the union type ` +
        `are already covered by explicit arms. Remove the \`_\` arm.`,
        matchSpan,
        "warning",
      ));
    }
  }
}

// ---------------------------------------------------------------------------
// TS-G: Linear type enforcement (§34) and ~ tracking (§31)
// ---------------------------------------------------------------------------

type LinState = "unconsumed" | "consumed";
type TildeState = "uninitialized" | "initialized";
type MustUseState = "unused" | "used";

interface LinErrorDescriptor {
  code: "E-LIN-001" | "E-LIN-002" | "E-LIN-003";
  varName: string;
  span: Span;
  secondUseSpan?: Span;
  /** Span of the `lift` expression that first consumed this lin variable (Lin-A1). */
  liftSite?: Span;
}

interface TildeErrorDescriptor {
  code: "E-TILDE-001" | "E-TILDE-002";
  span: Span;
}

/**
 * LinTracker — tracks lin variable states within a single analysis context.
 */
class LinTracker {
  _vars: Map<string, LinState>;
  _firstUseSpan: Map<string, Span>;
  /** Lin-A1: tracks which variables were first consumed via `lift expr`. */
  _liftSites: Map<string, Span>;

  constructor() {
    this._vars = new Map();
    this._firstUseSpan = new Map();
    this._liftSites = new Map();
  }

  declare(name: string): void {
    this._vars.set(name, "unconsumed");
    this._firstUseSpan.delete(name);
    this._liftSites.delete(name);
  }

  consume(name: string, span: Span): LinErrorDescriptor | null {
    if (!this._vars.has(name)) return null;

    const state = this._vars.get(name)!;
    if (state === "consumed") {
      return {
        code: "E-LIN-002",
        varName: name,
        span: this._firstUseSpan.get(name) ?? span,
        secondUseSpan: span,
        liftSite: this._liftSites.get(name),
      };
    }

    this._vars.set(name, "consumed");
    this._firstUseSpan.set(name, span);
    return null;
  }

  /**
   * Lin-A1: Consume a lin variable via a `lift` expression.
   * Records the lift site so E-LIN-002 messages can surface it.
   */
  consumeViaLift(name: string, span: Span): LinErrorDescriptor | null {
    const err = this.consume(name, span);
    if (!err) {
      this._liftSites.set(name, span);
    }
    return err;
  }

  forceConsume(name: string, span?: Span): void {
    this._vars.set(name, "consumed");
    if (span) this._firstUseSpan.set(name, span);
  }

  has(name: string): boolean { return this._vars.has(name); }

  isUnconsumed(name: string): boolean { return this._vars.get(name) === "unconsumed"; }

  names(): string[] { return [...this._vars.keys()]; }

  unconsumedNames(): string[] {
    return [...this._vars.entries()]
      .filter(([, s]) => s === "unconsumed")
      .map(([n]) => n);
  }

  consumedNames(): string[] {
    return [...this._vars.entries()]
      .filter(([, s]) => s === "consumed")
      .map(([n]) => n);
  }

  snapshot(): Map<string, LinState> { return new Map(this._vars); }

  restore(snap: Map<string, LinState>): void { this._vars = new Map(snap); }
}

/**
 * MustUseTracker — tracks tilde-decl variables that must be used at least once.
 */
class MustUseTracker {
  _vars: Map<string, MustUseState>;
  _declSpans: Map<string, Span>;

  constructor() {
    this._vars = new Map();
    this._declSpans = new Map();
  }

  declare(name: string, span?: Span): void {
    this._vars.set(name, "unused");
    if (span) this._declSpans.set(name, span);
  }

  markUsed(name: string): void {
    if (this._vars.has(name)) {
      this._vars.set(name, "used");
    }
  }

  has(name: string): boolean { return this._vars.has(name); }

  names(): string[] { return [...this._vars.keys()]; }

  unusedEntries(): Array<{ name: string; span: Span | undefined }> {
    return [...this._vars.entries()]
      .filter(([, s]) => s === "unused")
      .map(([n]) => ({ name: n, span: this._declSpans.get(n) }));
  }

  scanExpression(exprStr: string): void {
    if (!exprStr || typeof exprStr !== "string") return;
    for (const name of this._vars.keys()) {
      if (this._vars.get(name) === "used") continue;
      const re = new RegExp(`\\b${escapeForRegex(name)}\\b`);
      if (re.test(exprStr)) {
        this._vars.set(name, "used");
      }
    }
  }
}

/**
 * Escape special regex characters in a string.
 */
function escapeForRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Extract the callee function name from a node's ExprNode field.
 * Returns the name if the ExprNode is a CallExpr with an IdentExpr callee,
 * or if the ExprNode itself is an IdentExpr (propagate-expr case).
 */
function extractCalleeNameFromNode(node: ASTNodeLike): string | null {
  const exprNode = (node as Record<string, unknown>).exprNode as { kind?: string; callee?: { kind?: string; name?: string }; name?: string } | undefined;
  if (!exprNode || typeof exprNode !== "object" || !exprNode.kind) return null;
  // Direct call: exprNode is CallExpr { callee: IdentExpr { name } }
  if (exprNode.kind === "call" && exprNode.callee?.kind === "ident" && exprNode.callee.name) {
    return exprNode.callee.name;
  }
  // propagate-expr where the inner expression is just an identifier (rare but possible)
  if (exprNode.kind === "ident" && exprNode.name) {
    return exprNode.name;
  }
  return null;
}

/**
 * Extract the leading callee function name from a raw expression string via regex.
 * Fallback for nodes without ExprNode fields.
 */
function extractCalleeNameFromString(expr: string | undefined): string | null {
  if (!expr) return null;
  const match = /^([A-Za-z_$][A-Za-z0-9_$]*)/.exec(expr);
  return match ? match[1] : null;
}

/**
 * TildeTracker — tracks ~ state within a single analysis context.
 */
class TildeTracker {
  _state: TildeState;
  _initSpan: Span | null;

  constructor() {
    this._state = "uninitialized";
    this._initSpan = null;
  }

  initialize(span: Span, elide = false): TildeErrorDescriptor | null {
    if (this._state === "initialized" && !elide) {
      const err: TildeErrorDescriptor = { code: "E-TILDE-002", span: this._initSpan ?? span };
      this._initSpan = span;
      return err;
    }
    this._state = "initialized";
    this._initSpan = span;
    return null;
  }

  consume(span: Span): TildeErrorDescriptor | null {
    if (this._state === "uninitialized") {
      return { code: "E-TILDE-001", span };
    }
    this._state = "uninitialized";
    this._initSpan = null;
    return null;
  }

  isInitialized(): boolean { return this._state === "initialized"; }

  snapshot(): { state: TildeState; initSpan: Span | null } {
    return { state: this._state, initSpan: this._initSpan };
  }

  restore(snap: { state: TildeState; initSpan: Span | null }): void {
    this._state = snap.state;
    this._initSpan = snap.initSpan;
  }
}

// ---------------------------------------------------------------------------
// Loop body scanner — for+lift elision (§31.3)
// ---------------------------------------------------------------------------

/**
 * Return true if a node array contains any tilde-ref node that is NOT inside
 * a lift-stmt. Used to decide whether the for+lift elision rule applies.
 */
function hasNonLiftTildeConsumer(nodes: ASTNodeLike[]): boolean {
  if (!Array.isArray(nodes)) return false;

  for (const node of nodes) {
    if (!node || typeof node !== "object") continue;

    if (node.kind === "tilde-ref") return true;

    if (node.kind === "lift-stmt") continue;

    for (const key of Object.keys(node)) {
      if (key === "span" || key === "id") continue;
      const val = node[key];
      if (Array.isArray(val) && hasNonLiftTildeConsumer(val as ASTNodeLike[])) return true;
    }
  }

  return false;
}

// ---------------------------------------------------------------------------
// TS-G: checkLinear — main linear/tilde enforcement function
// ---------------------------------------------------------------------------

interface CheckLinearOpts {
  linTracker?: LinTracker | null;
  tildeTracker?: TildeTracker | null;
  mustUseTracker?: MustUseTracker | null;
  inLoop?: boolean;
  file?: string;
  /** §35.2.1: Names of lin-annotated function parameters to pre-declare in this scope. */
  preDeclaredLinNames?: string[];
}

/**
 * Check linear type invariants (lin + ~) for a body of AST nodes.
 */
function checkLinear(body: ASTNodeLike[], errors: TSError[], opts: CheckLinearOpts = {}): void {
  const {
    linTracker: parentLinTracker = null,
    tildeTracker: parentTildeTracker = null,
    mustUseTracker: parentMustUseTracker = null,
    inLoop = false,
    file = "/unknown",
    preDeclaredLinNames = [],
  } = opts;

  const linTracker = new LinTracker();
  // §35.2.1: Pre-seed the tracker with lin-annotated function parameters.
  // These are treated as "declared at function entry" — the consume-exactly-once
  // rule applies to the entire function body scope.
  for (const paramName of preDeclaredLinNames) {
    linTracker.declare(paramName);
  }
  const tildeTracker = parentTildeTracker ?? new TildeTracker();
  const mustUseTracker = new MustUseTracker();

  // Lin-A3: Per-iteration loop-local lin tracker. When non-null,
  // scanNodeExprNodesForLin first tries consuming against this tracker so
  // references to loop-local lin vars inside arbitrary expressions (not just
  // bare lin-ref nodes) are consumed before outer lt is checked.
  let currentLoopLocalLin: LinTracker | null = null;

  function mkSpan(): Span {
    return { file, start: 0, end: 0, line: 1, col: 1 };
  }

  function trackedLinNamesForTracker(lt: LinTracker): string[] {
    const names = new Set<string>();
    for (const n of lt.names()) names.add(n);
    if (parentLinTracker) for (const n of parentLinTracker.names()) names.add(n);
    if (currentLoopLocalLin) for (const n of currentLoopLocalLin.names()) names.add(n);
    return [...names];
  }

  // Helper shared between walkNode's match-stmt case and scanNodeExprNodesForLin's
  // scanLambdasInExpr — text-scan an expression string for references to any
  // currently-tracked lin variable, calling back with matches.
  function consumeLinRefByTextScan(lt: LinTracker, raw: string, spanObj: unknown, loopFlag: boolean): void {
    const names = trackedLinNamesForTracker(lt);
    for (const name of names) {
      const re = new RegExp(`\\b${escapeForRegex(name)}\\b`);
      if (re.test(raw)) {
        consumeLinRefExternal(lt, name, spanObj, loopFlag);
      }
    }
  }

  // External version of consumeLinRef (mirrors the inner version in
  // scanNodeExprNodesForLin) — usable from other helpers.
  function consumeLinRefExternal(lt: LinTracker, name: string, spanObj: unknown, loop: boolean): void {
    if (name.startsWith("@") || name === "~") return;
    const resolvedSpan = (spanObj ?? { file, start: 0, end: 0, line: 1, col: 1 }) as Span;
    if (currentLoopLocalLin && currentLoopLocalLin.has(name)) {
      const err = currentLoopLocalLin.consume(name, resolvedSpan);
      if (err) emitLinError(err, resolvedSpan);
      return;
    }
    const tracker = lt.has(name) ? lt : (parentLinTracker && parentLinTracker.has(name) ? parentLinTracker : null);
    if (!tracker) return;
    if (loop) {
      errors.push(new TSError(
        "E-LIN-002",
        `E-LIN-002: Linear variable \`${name}\` consumed inside a loop. ` +
        `Loop iteration count is unprovable; consume \`${name}\` before or after the loop. ` +
        `A 'lin' variable can only be used once. Clone it first, or change to 'const'/'let' if reuse is intended.`,
        resolvedSpan,
      ));
      tracker.forceConsume(name, resolvedSpan);
    } else {
      const err = tracker.consume(name, resolvedSpan);
      if (err) emitLinError(err, resolvedSpan);
    }
  }

  function emitLinError(desc: LinErrorDescriptor, contextSpan?: Span): void {
    const s = desc.span ?? contextSpan ?? mkSpan();
    if (desc.code === "E-LIN-002") {
      // Lin-A1: when the first consumption was via `lift`, surface the lift site.
      const liftNote = desc.liftSite
        ? ` Note: \`lift\` consumed this lin variable at line ${desc.liftSite.line} — ` +
          `\`lift\` counts as a move, so the variable is consumed when lifted.`
        : "";
      errors.push(new TSError(
        "E-LIN-002",
        `E-LIN-002: Linear variable \`${desc.varName}\` consumed more than once. ` +
        `First use at line ${s.line ?? "?"}, col ${s.col ?? "?"}; ` +
        `second use at line ${desc.secondUseSpan?.line ?? "?"}, col ${desc.secondUseSpan?.col ?? "?"}.` +
        liftNote +
        ` A 'lin' variable can only be used once. Clone it first, or change to 'const'/'let' if reuse is intended.`,
        s,
      ));
    } else if (desc.code === "E-LIN-001") {
      errors.push(new TSError(
        "E-LIN-001",
        `E-LIN-001: Linear variable \`${desc.varName}\` declared but never consumed before scope exit. ` +
        `Pass it to a function, return it, or remove the 'lin' qualifier if single-use isn't needed.`,
        s,
      ));
    } else if (desc.code === "E-LIN-003") {
      errors.push(new TSError(
        "E-LIN-003",
        `E-LIN-003: Linear variable \`${desc.varName}\` is consumed in some branches but not others. ` +
        `All branches must consume the same set of lin variables. ` +
        `Every branch of the if/match must either consume or explicitly discard it.`,
        s,
      ));
    }
  }

  function emitTildeError(desc: TildeErrorDescriptor, contextSpan?: Span): void {
    const s = desc.span ?? contextSpan ?? mkSpan();
    if (desc.code === "E-TILDE-001") {
      errors.push(new TSError("E-TILDE-001", `E-TILDE-001: The pipeline accumulator \`~\` was read before being initialized. Add \`~ = <value>\` before this line to give it an initial value. See §32 in the spec.`, s));
    } else if (desc.code === "E-TILDE-002") {
      errors.push(new TSError("E-TILDE-002", `E-TILDE-002: The pipeline accumulator \`~\` was set to a value but never used before it was overwritten or the block ended. Use \`lift ~\` or read \`~\` before setting it again. See §32 in the spec.`, s));
    }
  }

  function walkNode(node: ASTNodeLike, lt: LinTracker, tt: TildeTracker, loop: boolean): void {
    if (!node || typeof node !== "object") return;

    switch (node.kind) {

      case "lin-decl": {
        lt.declare(node.name as string);
        break;
      }

      case "tilde-decl": {
        mustUseTracker.declare(node.name as string, node.span as Span | undefined);
        // Walk initExpr (structured) if available; fall back to string scan.
        const tildeInitExpr = (node as Record<string, unknown>).initExpr as import("./types/ast.ts").ExprNode | undefined;
        if (tildeInitExpr && typeof tildeInitExpr === "object" && tildeInitExpr.kind) {
          forEachIdentInExprNode(tildeInitExpr, (ident) => {
            mustUseTracker.markUsed(ident.name);
            if (parentMustUseTracker) parentMustUseTracker.markUsed(ident.name);
          });
        } else if (node.init) {
          mustUseTracker.scanExpression(node.init as string);
          if (parentMustUseTracker) parentMustUseTracker.scanExpression(node.init as string);
        }
        break;
      }

      case "lin-ref": {
        const name = node.name as string;
        const tracker = lt.has(name) ? lt : (parentLinTracker && parentLinTracker.has(name) ? parentLinTracker : null);
        if (tracker) {
          if (loop) {
            errors.push(new TSError(
              "E-LIN-002",
              `E-LIN-002: Linear variable \`${name}\` consumed inside a loop. ` +
              `Loop iteration count is unprovable; consume \`${name}\` before or after the loop. ` +
              `A 'lin' variable can only be used once. Clone it first, or change to 'const'/'let' if reuse is intended.`,
              (node.span ?? mkSpan()) as Span,
            ));
          } else {
            const err = tracker.consume(name, (node.span ?? mkSpan()) as Span);
            if (err) emitLinError(err, node.span as Span | undefined);
          }
        }
        break;
      }

      case "tilde-init": {
        const err = tt.initialize(node.span as Span);
        if (err) emitTildeError(err, node.span as Span | undefined);
        break;
      }

      case "tilde-ref": {
        const err = tt.consume(node.span as Span);
        if (err) emitTildeError(err, node.span as Span | undefined);
        break;
      }

      case "lift-stmt": {
        if (node.usesTilde) {
          const consumeErr = tt.consume(node.span as Span);
          if (consumeErr) emitTildeError(consumeErr, node.span as Span | undefined);
        }
        const initErr = tt.initialize(node.span as Span, false);
        if (initErr) emitTildeError(initErr, node.span as Span | undefined);
        break;
      }

      case "lift-expr": {
        // Lin-A1: `lift x` counts as consuming the lin variable `x`.
        // AST shape: lift-expr has expr: { kind: "expr", expr: "<identifier>" }.
        // We scan the expression string for a bare lin variable name as the lift target.
        const liftInner = node.expr as { kind?: string; expr?: string; node?: ASTNodeLike } | undefined;
        if (liftInner && liftInner.kind === "expr" && typeof liftInner.expr === "string") {
          const exprStr = liftInner.expr.trim();
          const checkLiftConsumption = (tracker: LinTracker): void => {
            for (const linName of tracker.names()) {
              if (tracker.isUnconsumed(linName) && exprStr === linName) {
                const err = tracker.consumeViaLift(linName, (node.span ?? mkSpan()) as Span);
                if (err) emitLinError(err, node.span as Span | undefined);
              }
            }
          };
          checkLiftConsumption(lt);
          if (parentLinTracker) checkLiftConsumption(parentLinTracker);
        }
        // Recurse into embedded markup lift (lift { markup-block }).
        if (liftInner && liftInner.kind === "markup" && liftInner.node) {
          walkNode(liftInner.node as ASTNodeLike, lt, tt, loop);
        }
        break;
      }

      case "if-stmt": {
        const linSnap = lt.snapshot();
        const tildeSnap = tt.snapshot();

        // Walk consequent.
        for (const n of ((node.consequent as ASTNodeLike[] | undefined) ?? [])) walkNode(n, lt, tt, loop);
        const afterConsequent = lt.snapshot();
        const afterConsequentTilde = tt.snapshot();

        // Walk alternate.
        lt.restore(linSnap);
        tt.restore(tildeSnap);
        const hasAlternate = Array.isArray(node.alternate) && (node.alternate as ASTNodeLike[]).length > 0;
        if (hasAlternate) {
          for (const n of (node.alternate as ASTNodeLike[])) walkNode(n, lt, tt, loop);
        }
        const afterAlternate = lt.snapshot();

        // Check and resolve branch symmetry.
        const allVars = new Set([...afterConsequent.keys(), ...afterAlternate.keys()]);
        let allSymmetric = true;

        for (const varName of allVars) {
          const inConsequent = afterConsequent.get(varName) === "consumed";
          const inAlternate = hasAlternate
            ? afterAlternate.get(varName) === "consumed"
            : linSnap.get(varName) === "consumed";

          if (inConsequent !== inAlternate) {
            allSymmetric = false;
            errors.push(new TSError(
              "E-LIN-003",
              `E-LIN-003: Linear variable \`${varName}\` is consumed in some branches but not others. ` +
              `All branches must consume the same set of lin variables. ` +
              `Every branch of the if/match must either consume or explicitly discard it.`,
              (node.span ?? mkSpan()) as Span,
            ));
          }
        }

        if (allSymmetric && allVars.size > 0) {
          for (const varName of allVars) {
            if (afterConsequent.get(varName) === "consumed") {
              lt.forceConsume(varName, node.span as Span | undefined);
            }
          }
        } else {
          // Lin-B3: asymmetric branches already emitted E-LIN-003 above.
          // Force-consume variables that were consumed in EITHER branch so they
          // don't cascade into a spurious E-LIN-001 at scope exit.
          lt.restore(linSnap);
          for (const varName of allVars) {
            const inCons = afterConsequent.get(varName) === "consumed";
            const inAlt = hasAlternate
              ? afterAlternate.get(varName) === "consumed"
              : linSnap.get(varName) === "consumed";
            if (inCons !== inAlt) {
              lt.forceConsume(varName, node.span as Span | undefined);
            }
          }
        }

        tt.restore(afterConsequentTilde);
        break;
      }

      case "match-stmt":
      case "match-expr": {
        // Match-arm branch-parallel linear analysis. The parser stores arms
        // under node.body (not node.arms). Arm forms:
        //   - match-arm-block  — `.Variant => { stmt... }` with structured body
        //   - bare-expr        — `.Variant => expr` (single-line arm, body raw)
        const armNodes = (node.body as ASTNodeLike[] | undefined) ?? [];
        const realArms = armNodes.filter(a =>
          !!a && typeof a === "object" &&
          (a.kind === "match-arm-block" ||
           (a.kind === "bare-expr" && typeof (a as { expr?: unknown }).expr === "string" &&
            /^\s*(?:\.[A-Z_]|else\b|not\b|"|')/.test((a as { expr: string }).expr)))
        );
        if (realArms.length === 0) {
          for (const n of armNodes) walkNode(n, lt, tt, loop);
          break;
        }

        const preMatchSnap = lt.snapshot();
        const preMatchTilde = tt.snapshot();
        const armSnapshots: Map<string, LinState>[] = [];

        for (const arm of realArms) {
          lt.restore(preMatchSnap);
          tt.restore(preMatchTilde);
          if (arm.kind === "match-arm-block") {
            for (const n of ((arm.body as ASTNodeLike[] | undefined) ?? [])) {
              walkNode(n, lt, tt, loop);
            }
          } else {
            // Single-expression arm: extract RHS of `=>` / `:>` / `->` and
            // text-scan for any declared lin variable name.
            const raw = typeof (arm as { expr?: unknown }).expr === "string"
              ? ((arm as { expr: string }).expr)
              : "";
            const m = raw.match(/(?:=>|:>|->)([\s\S]+)$/);
            const result = m ? m[1] : raw;
            consumeLinRefByTextScan(lt, result, arm.span, loop);
          }
          armSnapshots.push(lt.snapshot());
        }

        if (armSnapshots.length > 0) {
          const refSnap = armSnapshots[0];
          const allVars = new Set(preMatchSnap.keys());

          const asymmetricVars = new Set<string>();
          for (const varName of allVars) {
            const refConsumed = refSnap.get(varName) === "consumed";
            let symmetric = true;
            for (let i = 1; i < armSnapshots.length; i++) {
              if ((armSnapshots[i].get(varName) === "consumed") !== refConsumed) {
                symmetric = false;
                break;
              }
            }
            if (!symmetric) {
              asymmetricVars.add(varName);
              errors.push(new TSError(
                "E-LIN-003",
                `E-LIN-003: Linear variable \`${varName}\` is consumed in some match arms but not others. ` +
                `All arms must consume the same set of lin variables. ` +
                `Every branch of the if/match must either consume or explicitly discard it.`,
                (node.span ?? mkSpan()) as Span,
              ));
            }
          }

          lt.restore(refSnap);
          // Lin-B3: force-consume asymmetric vars to suppress E-LIN-001 cascade.
          for (const varName of asymmetricVars) {
            lt.forceConsume(varName, node.span as Span | undefined);
          }
        }

        tt.restore(preMatchTilde);
        break;
      }

      case "for-loop":
      case "while-loop":
      case "for-stmt":
      case "while-stmt":
      case "do-while-stmt": {
        // Consuming an outer-scope lin variable inside a loop body is E-LIN-002.
        // Lin-A3 permits lin-decl + consume in the same iteration (tracked via
        // walkLoopBody's loopLocalLin). Accept real parser kinds (for-stmt,
        // while-stmt, do-while-stmt) alongside legacy *-loop kinds.
        const loopBody = (node.body as ASTNodeLike[] | undefined) ?? [];
        const elide = !hasNonLiftTildeConsumer(loopBody);
        walkLoopBody(loopBody, lt, tt, elide);
        break;
      }

      case "function-decl": {
        // §35.2.1: Function declarations create a new linear scope.
        // Lin-annotated params (isLin: true on the param object) are pre-declared
        // as linear in the function body scope.
        const fnParams = (node.params as ASTNodeLike[] | undefined) ?? [];
        const linParamNames: string[] = [];
        for (const param of fnParams) {
          if (param && typeof param === "object" && (param as ASTNodeLike).isLin) {
            const pName = (param as ASTNodeLike).name as string | undefined;
            if (pName) linParamNames.push(pName);
          }
        }
        // Recursively check the function body as a new scope.
        // If there are lin params, pass them as preDeclaredLinNames.
        // Always recurse so nested lin-decls inside the function body are checked.
        checkLinear(
          (node.body as ASTNodeLike[] | undefined) ?? [],
          errors,
          {
            file,
            preDeclaredLinNames: linParamNames,
            // Do NOT pass parentLinTracker — function bodies are a closed lin scope.
            // Outer lin vars cannot be consumed inside a function body (they would
            // need to be passed as parameters).
          },
        );
        break;
      }

      case "closure": {
        const captures = (node.captures as string[] | undefined) ?? [];
        for (const captureName of captures) {
          mustUseTracker.markUsed(captureName);
          if (parentMustUseTracker) parentMustUseTracker.markUsed(captureName);

          const tracker = lt.has(captureName) ? lt : (parentLinTracker && parentLinTracker.has(captureName) ? parentLinTracker : null);
          if (tracker) {
            if (loop) {
              errors.push(new TSError(
                "E-LIN-002",
                `E-LIN-002: Linear variable \`${captureName}\` captured by closure inside a loop. ` +
                `Loop iteration count is unprovable. ` +
                `A 'lin' variable can only be used once. Clone it first, or change to 'const'/'let' if reuse is intended.`,
                (node.span ?? mkSpan()) as Span,
              ));
            } else {
              const err = tracker.consume(captureName, (node.span ?? mkSpan()) as Span);
              if (err) emitLinError(err, node.span as Span | undefined);
            }
          }
        }
        // Closure body has its own tilde scope (§31.5).
        checkLinear((node.body as ASTNodeLike[] | undefined) ?? [], errors, { linTracker: lt, mustUseTracker, inLoop: false, file });
        break;
      }

      default: {
        const body = node.body as ASTNodeLike[] | undefined;
        if (Array.isArray(body)) {
          for (const n of body) walkNode(n, lt, tt, loop);
        }
        const children = node.children as ASTNodeLike[] | undefined;
        if (Array.isArray(children)) {
          for (const n of children) walkNode(n, lt, tt, loop);
        }
        break;
      }
    }

    // Scan expression-bearing fields for must-use variable references.
    scanNodeExpressions(node);
    scanNodeExprNodesForLin(node, lt, loop);
  }

  function scanNodeExpressions(node: ASTNodeLike): void {
    const nodeAny = node as Record<string, unknown>;

    // Walk ExprNode-form fields for must-use variable references.
    const exprNodeFields: unknown[] = [
      nodeAny.exprNode,    // bare-expr, return-stmt, throw-stmt
      nodeAny.initExpr,    // let-decl, const-decl, lin-decl, tilde-decl, reactive-decl, etc.
      nodeAny.condExpr,    // if-stmt, if-expr, while-loop, for-loop (condition)
      nodeAny.valueExpr,   // reactive-nested-assign
      nodeAny.iterExpr,    // for-stmt (iterable expression)
      nodeAny.headerExpr,  // match-stmt, switch-stmt (header expression)
    ];

    for (const field of exprNodeFields) {
      if (!field || typeof field !== "object") continue;
      const exprField = field as { kind?: string };
      if (!exprField.kind) continue;

      forEachIdentInExprNode(field as import("./types/ast.ts").ExprNode, (ident) => {
        mustUseTracker.markUsed(ident.name);
        if (parentMustUseTracker) parentMustUseTracker.markUsed(ident.name);
      });
    }

    // String-field fallback: nodes without ExprNode fields still need scanning.
    // Phase 4d: skip string fields when corresponding ExprNode is present (avoid double-counting).
    // node.content: html-fragment nodes carry HTML that may reference tilde-decl names.
    const stringFields: (string | unknown)[] = [
      !nodeAny.exprNode ? node.expr : undefined,
      !nodeAny.initExpr ? node.init : undefined,
      node.value,
      !nodeAny.condExpr ? node.condition : undefined,
      node.test,
      node.content,
    ];
    for (const field of stringFields) {
      if (typeof field === "string") {
        mustUseTracker.scanExpression(field);
        if (parentMustUseTracker) parentMustUseTracker.scanExpression(field);
      }
    }
  }
  /**
   * Scan ExprNode-form expression fields on an AST node for lin variable references.
   *
   * This is the structured counterpart to scanNodeExpressions (which scans string fields
   * for the mustUseTracker). Both functions run for every node in walkNode.
   *
   * For each ExprNode field found on the node (initExpr, exprNode, condExpr, valueExpr,
   * iterExpr, headerExpr), walk the ExprNode tree with forEachIdentInExprNode to find
   * all IdentExpr leaves. For each IdentExpr whose name matches a declared lin variable
   * in `lt` or `parentLinTracker`, call lt.consume().
   *
   * Called from walkNode() after the main switch dispatch completes.
   */
  function scanNodeExprNodesForLin(node: ASTNodeLike, lt: LinTracker, loop: boolean): void {
    // Collect all ExprNode-bearing fields. These are the Phase 1 parallel fields.
    // The ExprNode fields are typed as `ExprNode | undefined` on typed nodes,
    // but we receive ASTNodeLike (duck-typed). Cast via `any` for field access.
    const nodeAny = node as Record<string, unknown>;

    // Helper: consume a lin variable reference if it matches a tracked lin var.
    function consumeLinRef(name: string, spanObj: unknown): void {
      // Reactive variable references start with '@' — not lin variables.
      // Tilde accumulator is '~' — not a lin variable.
      if (name.startsWith("@") || name === "~") return;

      const resolvedSpan = (spanObj ?? mkSpan()) as Span;

      // Lin-A3: Loop-local lin variables consume against the per-iteration
      // tracker, NOT outer lt. Prevents false-positive E-LIN-002 on e.g.
      // `submitOne(token)` where token was declared via `lin token = …` in
      // the same loop body.
      if (currentLoopLocalLin && currentLoopLocalLin.has(name)) {
        const err = currentLoopLocalLin.consume(name, resolvedSpan);
        if (err) emitLinError(err, resolvedSpan);
        return;
      }

      // Check if this identifier is a declared lin variable.
      const tracker = lt.has(name) ? lt : (parentLinTracker && parentLinTracker.has(name) ? parentLinTracker : null);
      if (!tracker) return;

      if (loop) {
        errors.push(new TSError(
          "E-LIN-002",
          `E-LIN-002: Linear variable \`${name}\` consumed inside a loop. ` +
          `Loop iteration count is unprovable; consume \`${name}\` before or after the loop. ` +
          `A 'lin' variable can only be used once. Clone it first, or change to 'const'/'let' if reuse is intended.`,
          resolvedSpan,
        ));
        // Force-consume so scope-exit doesn't cascade a spurious E-LIN-001.
        tracker.forceConsume(name, resolvedSpan);
      } else {
        const err = tracker.consume(name, resolvedSpan);
        if (err) emitLinError(err, resolvedSpan);
      }
    }

    // Lin-B1: A lambda that captures a lin variable counts as ONE consumption
    // (scope-agnostic: existence of the reference IS the consumption). Two
    // lambdas referencing the same lin var → E-LIN-002. forEachIdentInExprNode
    // deliberately stops at lambda bodies; we must scan them here.
    function trackedLinNamesWith(lt: LinTracker): string[] {
      const names = new Set<string>();
      for (const n of lt.names()) names.add(n);
      if (parentLinTracker) for (const n of parentLinTracker.names()) names.add(n);
      if (currentLoopLocalLin) for (const n of currentLoopLocalLin.names()) names.add(n);
      return [...names];
    }
    const trackedLinNames = () => trackedLinNamesWith(lt);

    function scanLambdasInExpr(field: unknown): void {
      if (!field || typeof field !== "object") return;
      const f = field as { kind?: string; [k: string]: unknown };
      if (!f.kind) return;

      if (f.kind === "lambda") {
        const body = f.body as { kind?: string; value?: unknown; raw?: string } | undefined;
        if (!body) return;

        const referenced = new Set<string>();
        const linNames = trackedLinNames();
        if (linNames.length === 0) return;

        if (body.kind === "expr" && body.value) {
          forEachIdentInExprNode(body.value as import("./types/ast.ts").ExprNode, (ident) => {
            if (linNames.includes(ident.name)) referenced.add(ident.name);
          });
          scanLambdasInExpr(body.value);
        } else {
          const rawSource = typeof body.raw === "string"
            ? body.raw
            : (typeof (f.raw as unknown) === "string" ? (f.raw as string) : "");
          if (rawSource) {
            for (const n of linNames) {
              const re = new RegExp(`\\b${escapeForRegex(n)}\\b`);
              if (re.test(rawSource)) referenced.add(n);
            }
          }
        }

        for (const name of referenced) {
          consumeLinRef(name, f.span);
        }
        return;
      }

      if (f.kind === "escape-hatch") {
        const raw = typeof f.raw === "string" ? (f.raw as string) : "";
        if (raw && raw.includes("=>")) {
          const linNames = trackedLinNames();
          for (const name of linNames) {
            const re = new RegExp(`\\b${escapeForRegex(name)}\\b`);
            if (re.test(raw)) consumeLinRef(name, f.span);
          }
        }
        return;
      }

      if (f.kind === "match-expr") {
        // Expression-form match (e.g. `return match role { ... }`): the ExprNode
        // stores arms as rawArms: string[]. Apply branch-parallel lin analysis.
        const rawArms = Array.isArray(f.rawArms) ? (f.rawArms as string[]) : [];
        // Walk the subject first (normal identifiers/captures).
        if (f.subject) scanLambdasInExpr(f.subject);

        if (rawArms.length === 0) return;
        const linNames = trackedLinNames();
        if (linNames.length === 0) return;

        const preSnap = lt.snapshot();
        const armSnaps: Map<string, LinState>[] = [];
        for (const armRaw of rawArms) {
          lt.restore(preSnap);
          const m = armRaw.match(/(?:=>|:>|->)([\s\S]+)$/);
          const result = m ? m[1] : armRaw;
          for (const name of linNames) {
            const re = new RegExp(`\\b${escapeForRegex(name)}\\b`);
            if (re.test(result)) {
              consumeLinRef(name, f.span);
            }
          }
          armSnaps.push(lt.snapshot());
        }

        const refSnap = armSnaps[0];
        const asymmetricVars = new Set<string>();
        for (const varName of new Set(preSnap.keys())) {
          const refConsumed = refSnap.get(varName) === "consumed";
          let symmetric = true;
          for (let i = 1; i < armSnaps.length; i++) {
            if ((armSnaps[i].get(varName) === "consumed") !== refConsumed) {
              symmetric = false;
              break;
            }
          }
          if (!symmetric) {
            asymmetricVars.add(varName);
            errors.push(new TSError(
              "E-LIN-003",
              `E-LIN-003: Linear variable \`${varName}\` is consumed in some match arms but not others. ` +
              `All arms must consume the same set of lin variables. ` +
              `Every branch of the if/match must either consume or explicitly discard it.`,
              (f.span as Span | undefined) ?? mkSpan(),
            ));
          }
        }
        lt.restore(refSnap);
        for (const varName of asymmetricVars) {
          lt.forceConsume(varName, f.span as Span | undefined);
        }
        return;
      }

      for (const k of Object.keys(f)) {
        const v = (f as Record<string, unknown>)[k];
        if (Array.isArray(v)) {
          for (const el of v) scanLambdasInExpr(el);
        } else if (v && typeof v === "object") {
          scanLambdasInExpr(v);
        }
      }
    }

    // Walk ExprNode-form fields (structured, with precise spans).
    // All ExprNode parallel fields defined in the Phase 1 convention (ast.ts §4.4).
    const exprNodeFields: unknown[] = [
      nodeAny.exprNode,    // bare-expr, return-stmt, throw-stmt
      nodeAny.initExpr,    // let-decl, const-decl, lin-decl, tilde-decl, reactive-decl, etc.
      nodeAny.condExpr,    // if-stmt, if-expr, while-loop, for-loop (condition)
      nodeAny.valueExpr,   // reactive-nested-assign
      nodeAny.iterExpr,    // for-stmt (iterable expression)
      nodeAny.headerExpr,  // match-stmt, switch-stmt (header expression)
    ];

    for (const field of exprNodeFields) {
      if (!field || typeof field !== "object") continue;
      const exprField = field as { kind?: string };
      if (!exprField.kind) continue;

      // Walk the ExprNode tree for IdentExpr nodes.
      // eslint-disable-next-line no-loop-func
      forEachIdentInExprNode(field as import("./types/ast.ts").ExprNode, (ident) => {
        consumeLinRef(ident.name, ident.span);
      });

      // Lin-B1: scan lambdas/closures inside this ExprNode for lin captures.
      scanLambdasInExpr(field);
    }
  }

  function walkLoopBody(loopBody: ASTNodeLike[], lt: LinTracker, tt: TildeTracker, elide: boolean): void {
    if (!Array.isArray(loopBody)) return;

    // Lin-A3: Lin variables declared AND consumed within the same loop iteration
    // are permitted. Track them in a per-iteration local tracker (loopLocalLin).
    // Variables from outer scope (in lt) are still rejected with E-LIN-002.
    const loopLocalLin = new LinTracker();

    // Expose to scanNodeExprNodesForLin so loop-local consumption inside
    // arbitrary expressions is routed to loopLocalLin instead of falsely
    // emitting E-LIN-002 against the outer lt.
    const prevLoopLocal = currentLoopLocalLin;
    currentLoopLocalLin = loopLocalLin;

    for (const node of loopBody) {
      if (!node || typeof node !== "object") continue;

      if (node.kind === "lift-stmt" && elide) {
        if (node.usesTilde) {
          const consumeErr = tt.consume(node.span as Span);
          if (consumeErr) emitTildeError(consumeErr, node.span as Span | undefined);
        }
        tt.initialize(node.span as Span, /* elide= */ true);
        continue;
      }

      // Lin-A3 carve-out: lin-decl at top level of the loop body is registered
      // in loopLocalLin, not the outer tracker.
      if (node.kind === "lin-decl") {
        // Scan the initExpr for consumption of outer-scope lin variables BEFORE declaring.
        // Example: `lin y = computeWith(x)` in a loop where x is outer lin → E-LIN-002 for x.
        scanNodeExprNodesForLin(node, lt, /* loop= */ true);
        loopLocalLin.declare(node.name as string);
        continue;
      }

      // Lin-A3: lin-ref for a loop-local variable resolves against loopLocalLin.
      if (node.kind === "lin-ref") {
        const name = node.name as string;
        if (loopLocalLin.has(name)) {
          const err = loopLocalLin.consume(name, (node.span ?? mkSpan()) as Span);
          if (err) emitLinError(err, node.span as Span | undefined);
          continue;
        }
        // Falls through to walkNode for outer-scope lin rejection (E-LIN-002).
      }

      walkNode(node, lt, tt, /* inLoop= */ true);
    }

    // Restore loop-local tracker pointer before checking for unconsumed locals.
    currentLoopLocalLin = prevLoopLocal;

    // Lin-A3: Unconsumed loop-local lin vars → E-LIN-001.
    for (const varName of loopLocalLin.unconsumedNames()) {
      errors.push(new TSError(
        "E-LIN-001",
        `E-LIN-001: Linear variable \`${varName}\` declared inside a loop body but not consumed within the same iteration. ` +
        `A 'lin' variable declared inside a loop must be consumed before the iteration ends. ` +
        `Pass it to a function, return it, or remove the 'lin' qualifier if single-use isn't needed.`,
        mkSpan(),
      ));
    }
  }

  // Main body walk.
  if (!Array.isArray(body)) return;

  for (const node of body) {
    walkNode(node, linTracker, tildeTracker, inLoop);
  }

  // Scope exit: check for unconsumed lin variables (E-LIN-001).
  for (const varName of linTracker.unconsumedNames()) {
    errors.push(new TSError(
      "E-LIN-001",
      `E-LIN-001: Linear variable \`${varName}\` declared but never consumed before scope exit. ` +
      `Pass it to a function, return it, or remove the 'lin' qualifier if single-use isn't needed.`,
      mkSpan(),
    ));
  }

  // Scope exit: check for unused must-use variables (E-MU-001).
  for (const { name, span: declSpan } of mustUseTracker.unusedEntries()) {
    errors.push(new TSError(
      "E-MU-001",
      `E-MU-001: Variable \`${name}\` was declared but never used before this scope closes. ` +
      `Either use the value somewhere (e.g., pass it to a function or reference it in a template), ` +
      `or prefix with \`_\` (e.g., \`_${name}\`) to suppress this warning, or remove the declaration.`,
      declSpan ?? mkSpan(),
    ));
  }

  // ~ initialized but not consumed at scope exit → E-TILDE-002.
  const lastNode = Array.isArray(body) ? body[body.length - 1] : null;
  const lastWasElisionLoop = lastNode &&
    (lastNode.kind === "for-loop" || lastNode.kind === "while-loop") &&
    !hasNonLiftTildeConsumer((lastNode.body as ASTNodeLike[] | undefined) ?? []);
  if (tildeTracker.isInitialized() && !parentTildeTracker && !lastWasElisionLoop) {
    errors.push(new TSError(
      "E-TILDE-002",
      `E-TILDE-002: The accumulator \`~\` was set to a value but never used before the block ended. Use \`lift ~\` or read \`~\` before the scope closes.`,
      tildeTracker._initSpan ?? mkSpan(),
    ));
  }
}

// ---------------------------------------------------------------------------
// State-type overload registry
// ---------------------------------------------------------------------------

/**
 * Build the overload registry from a FileAST.
 */
function buildOverloadRegistry(fileAST: FileAST): Map<string, Map<string, ASTNodeLike>> {
  const registry = new Map<string, Map<string, ASTNodeLike>>();

  function visit(node: unknown): void {
    if (!node || typeof node !== "object") return;
    const n = node as ASTNodeLike;

    if ((n.kind === "function-decl") && n.stateTypeScope) {
      const fnName = n.name as string;
      const stateType = n.stateTypeScope as string;
      if (fnName) {
        if (!registry.has(fnName)) registry.set(fnName, new Map());
        registry.get(fnName)!.set(stateType, n);
      }
    }

    if (Array.isArray(n.children)) {
      for (const child of (n.children as unknown[])) visit(child);
    }
    if (Array.isArray(n.body)) {
      for (const stmt of (n.body as unknown[])) visit(stmt);
    }
    if (Array.isArray(n.nodes)) {
      for (const node2 of (n.nodes as unknown[])) visit(node2);
    }
    if (n.ast && Array.isArray((n.ast as ASTNodeLike).nodes)) {
      for (const node2 of ((n.ast as ASTNodeLike).nodes as unknown[])) visit(node2);
    }
  }

  const nodes = fileAST.nodes ?? ((fileAST.ast as FileAST | undefined) ? (fileAST.ast as FileAST).nodes : []);
  for (const node of (nodes ?? [])) visit(node);

  // Only keep entries that have 2+ overloads
  for (const [fnName, overloads] of registry) {
    if (overloads.size < 2) registry.delete(fnName);
  }

  return registry;
}

// ---------------------------------------------------------------------------
// TS-H: Loop control flow validation (E-LOOP-001/002/005)
// ---------------------------------------------------------------------------

/**
 * Check loop control flow invariants for a file's AST nodes.
 *
 * E-LOOP-001: break outside any loop
 * E-LOOP-002: continue outside any loop
 * E-LOOP-005: break/continue inside fn/function/arrow targeting a loop outside
 */
function checkLoopControl(nodes: ASTNodeLike[], errors: TSError[], filePath: string): void {
  const LOOP_KINDS = new Set(["for-stmt", "while-stmt", "do-while-stmt", "for-loop", "while-loop"]);
  const FN_KINDS = new Set(["function-decl", "fn-decl", "fn", "function", "closure"]);

  function mkSpan(node: ASTNodeLike): Span {
    return (node.span as Span | undefined) ?? { file: filePath, start: 0, end: 0, line: 1, col: 1 };
  }

  /**
   * Walk a body of nodes.
   * loopDepth: number of enclosing loops (at current function scope boundary)
   * insideFn: true if we have crossed a function boundary since the last outer loop
   * outerLoopDepth: loop depth at the time we crossed the most recent function boundary
   */
  function walk(body: ASTNodeLike[], loopDepth: number, insideFn: boolean): void {
    for (const node of body) {
      if (!node || typeof node !== "object") continue;
      walkNode(node, loopDepth, insideFn);
    }
  }

  function walkNode(node: ASTNodeLike, loopDepth: number, insideFn: boolean): void {
    if (!node || typeof node !== "object") return;
    const kind = node.kind as string;

    // break-stmt: must be inside a loop at the current function boundary
    if (kind === "break-stmt") {
      if (loopDepth === 0) {
        const s = mkSpan(node);
        errors.push(new TSError(
          "E-LOOP-001",
          `E-LOOP-001: \`break\` at line ${s.line} is not inside any loop. ` +
          "`break` may only appear inside a `while`, `do...while`, or `for...of` loop body. " +
          "Remove `break` or move it inside a loop.",
          s,
        ));
      }
      return;
    }

    // continue-stmt: must be inside a loop at the current function boundary
    if (kind === "continue-stmt") {
      if (loopDepth === 0) {
        const s = mkSpan(node);
        errors.push(new TSError(
          "E-LOOP-002",
          `E-LOOP-002: \`continue\` at line ${s.line} is not inside any loop. ` +
          "`continue` may only appear inside a `while`, `do...while`, or `for...of` loop body. " +
          "Remove `continue` or move it inside a loop.",
          s,
        ));
      }
      return;
    }

    // Loop constructs: increment loop depth when walking body
    if (LOOP_KINDS.has(kind)) {
      const loopBody = (node.body as ASTNodeLike[] | undefined) ?? [];
      walk(loopBody, loopDepth + 1, insideFn);
      return;
    }

    // Function boundary: reset loop depth to 0 for the inner scope
    // Any break/continue inside this function cannot target outer loops
    if (FN_KINDS.has(kind)) {
      const fnBody = (node.body as ASTNodeLike[] | undefined) ?? [];
      // Walk the fn body with loopDepth=0 (function boundary resets loop context)
      walk(fnBody, 0, false);
      return;
    }

    // For all other nodes, recurse into body/consequent/alternate/children
    const nodeBody = node.body as ASTNodeLike[] | undefined;
    if (Array.isArray(nodeBody)) walk(nodeBody, loopDepth, insideFn);

    const consequent = node.consequent as ASTNodeLike[] | undefined;
    if (Array.isArray(consequent)) walk(consequent, loopDepth, insideFn);

    const alternate = node.alternate as ASTNodeLike[] | undefined;
    if (Array.isArray(alternate)) walk(alternate, loopDepth, insideFn);

    const arms = node.arms as ASTNodeLike[] | undefined;
    if (Array.isArray(arms)) {
      for (const arm of arms) {
        const armBody = (arm as ASTNodeLike).body as ASTNodeLike[] | undefined;
        if (Array.isArray(armBody)) walk(armBody, loopDepth, insideFn);
      }
    }

    const children = node.children as ASTNodeLike[] | undefined;
    if (Array.isArray(children)) walk(children, loopDepth, insideFn);
  }

  walk(nodes, 0, false);
}

// ---------------------------------------------------------------------------
// Per-file processor
// ---------------------------------------------------------------------------

function processFile(
  fileAST: FileAST,
  protectAnalysis: ProtectAnalysis,
  routeMap: RouteMap,
  importedTypes?: Map<string, ResolvedType>,
): { typedAst: TypedFileAST; errors: TSError[] } {
  const errors: TSError[] = [];

  const filePath = fileAST.filePath;
  const fileSpan: Span = { file: filePath, start: 0, end: 0, line: 1, col: 1 };

  // TS-B Step 1: Build the file-level type registry from type declarations.
  // CE output shape nests data under fileAST.ast — use dual-shape fallback.
  const typeDecls = (fileAST.typeDecls as ASTNodeLike[] | undefined)
    ?? ((fileAST.ast as FileAST | undefined)?.typeDecls as ASTNodeLike[] | undefined)
    ?? [];
  const typeRegistry = buildTypeRegistry(typeDecls, errors, fileSpan);

  // TS-B Step 1.2: Seed type registry with imported types from dependency files (§21.3).
  // When file B imports type TaskStatus from file A, TS must recognize TaskStatus
  // during match exhaustiveness checks, type annotations, and struct field access.
  // importedTypes is built in api.js after processing each dependency in topo order.
  if (importedTypes && importedTypes.size > 0) {
    for (const [name, type] of importedTypes) {
      // Local declarations always win — only seed if not already declared locally.
      if (!typeRegistry.has(name) || typeRegistry.get(name)?.kind === 'unknown') {
        typeRegistry.set(name, type);
      }
    }
  }

  // TS-B Step 1.5: Build the state type registry.
  const stateTypeRegistry = buildStateTypeRegistry();

  // §51.3: Build the machine registry from machine-decl AST nodes.
  // CE output shape nests data under fileAST.ast — use dual-shape fallback.
  const machineDecls = (fileAST.machineDecls as ASTNodeLike[] | undefined)
    ?? ((fileAST.ast as FileAST | undefined)?.machineDecls as ASTNodeLike[] | undefined)
    ?? [];
  const machineRegistry = buildMachineRegistry(machineDecls, typeRegistry, errors, fileSpan);

  // TS-B Step 2: Generate db-schema-derived types from ProtectAnalysis.
  const generatedTypesByScopeId = new Map<string, Map<string, { fullType: ResolvedType; clientType: ResolvedType }>>();

  if (protectAnalysis && protectAnalysis.views) {
    for (const [stateBlockId, dbTypeViews] of protectAnalysis.views) {
      if (!stateBlockId.startsWith(filePath + "::")) continue;

      const spanStart = parseInt(stateBlockId.split("::")[1] ?? "0", 10);
      const blockSpan: Span = { file: filePath, start: spanStart, end: spanStart, line: 1, col: 1 };

      const { generatedNames, errors: genErrors } = generateDbTypes(
        dbTypeViews,
        stateBlockId,
        blockSpan,
        typeRegistry,
      );

      errors.push(...genErrors);
      generatedTypesByScopeId.set(stateBlockId, generatedNames);
    }
  }

  // TS-A Step 1: Build the scope chain.
  const scopeChain = new ScopeChain();

  // Seed the global scope with all user-declared types from this file.
  for (const [name, type] of typeRegistry) {
    if (!BUILTIN_TYPES.has(name)) {
      scopeChain.global.bind(name, { kind: "type", resolvedType: type });
    }
  }

  // TS-A/TS-B Step 2: Walk the AST and annotate every node.
  const nodeTypes = annotateNodes(
    fileAST,
    scopeChain,
    typeRegistry,
    routeMap,
    protectAnalysis,
    generatedTypesByScopeId,
    errors,
    stateTypeRegistry,
    machineRegistry,
  );

  // TS-G: Linear type enforcement pass.
  // The real pipeline passes { filePath, ast: FileAST, errors } objects to
  // runTS (CE output shape). fileAST.nodes is therefore undefined at the outer
  // level; the actual nodes live under fileAST.ast.nodes. Use the same
  // dual-shape fallback that buildOverloadRegistry uses at line 4060.
  // checkLinear's default case descends into .body and .children so
  // markup.children and logic.body both get visited; function-decl recurses
  // with its own scope and breaks, so no double-walk occurs.
  const allLinNodes = (fileAST.nodes as ASTNodeLike[] | undefined)
    ?? ((fileAST.ast as FileAST | undefined)?.nodes as ASTNodeLike[] | undefined)
    ?? [];
  if (allLinNodes.length > 0) {
    checkLinear(allLinNodes, errors, { file: filePath });
  }

  // TS-H: Loop control flow validation (E-LOOP-001/002/005).
  const allNodes = (fileAST.nodes as ASTNodeLike[] | undefined)
    ?? ((fileAST.ast as FileAST | undefined)?.nodes as ASTNodeLike[] | undefined)
    ?? [];
  if (allNodes.length > 0) {
    checkLoopControl(allNodes, errors, filePath);
  }

  // TS-B Step 3: Build the state-type overload registry.
  const overloadRegistry = buildOverloadRegistry(fileAST);

  // Assemble TypedFileAST.
  const typedAst: TypedFileAST = Object.assign({}, fileAST, {
    nodeTypes,
    componentShapes: new Map(),
    scopeChain,
    stateTypeRegistry,
    overloadRegistry,
    machineRegistry,
  });

  return { typedAst, errors };
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Run the Type System (TS, Stage 6) — sub-stages TS-A, TS-B, TS-C, TS-F, and TS-G.
 */
export function runTS(input: {
  files: FileAST[];
  protectAnalysis: ProtectAnalysis;
  routeMap: RouteMap;
  /** Cross-file type maps: Map<filePath, Map<typeName, ResolvedType>>
   * Built in api.js from already-processed dependency files in topo order.
   * Keys are absolute file paths. Values are the exported type entries from that file. */
  importedTypesByFile?: Map<string, Map<string, ResolvedType>>;
}): { files: TypedFileAST[]; errors: TSError[] } {
  const {
    files = [],
    protectAnalysis = { views: new Map() },
    routeMap = { functions: new Map() },
    importedTypesByFile,
  } = input;

  const typedFiles: TypedFileAST[] = [];
  const allErrors: TSError[] = [];

  for (const fileAST of files) {
    // Look up imported types for this file from the caller-provided map.
    // api.js builds this map in topological order so dependency types are available
    // when an importing file is processed. If not provided, cross-file types are absent
    // (pre-import-system behavior — single-file compilation still works correctly).
    const importedTypes = importedTypesByFile?.get(fileAST.filePath as string);
    const { typedAst, errors } = processFile(fileAST, protectAnalysis, routeMap, importedTypes);
    typedFiles.push(typedAst);
    allErrors.push(...errors);
  }

  return {
    files: typedFiles,
    errors: allErrors,
  };
}

// ---------------------------------------------------------------------------
// §48 fn body prohibition checks (Layer 1 and Layer 2)
// ---------------------------------------------------------------------------

/**
 * Walk a `fn` body and emit errors for the prohibited operations.
 *
 * Layer 1 (§48.3):
 *   E-FN-001  ?{} SQL access
 *   E-FN-002  DOM mutation call
 *   E-FN-003  Outer-scope variable mutation
 *   E-FN-004  Non-deterministic call (Date.now, Math.random, crypto.randomUUID, etc.)
 *   E-FN-005  async declaration or await expression
 *
 * Layer 2 (§48.4–§48.5):
 *   E-FN-006  Returning <state> with unassigned fields
 *   E-FN-007  Branches return different <state> types without an explicit union return type
 *   E-FN-008  lift targeting an outer-scope ~ accumulator
 *
 * E-FN-009 (reactive subscription capture) is deferred — pure-value reads of @variables
 * inside fn bodies are permitted; the check would require call-graph analysis.
 *
 * Called after the standard body walk in the `function-decl` case when fnKind === "fn".
 */
function checkFnBodyProhibitions(
  fnNode: ASTNodeLike,
  body: ASTNodeLike[],
  errors: TSError[],
  filePath: string,
  stateTypeRegistry?: Map<string, ResolvedType>,
  nonPureFnNames?: Set<string>,
  scopeChain?: ScopeChain,
): void {
  const fnName = (fnNode.name as string) ?? "<anonymous>";
  const fnSpan = (fnNode.span ?? { file: filePath, start: 0, end: 0, line: 1, col: 1 }) as Span;

  // E-FN-005: async on the fn declaration itself
  if (fnNode.isAsync || fnNode.async) {
    errors.push(new TSError(
      "E-FN-005",
      `E-FN-005: \`fn ${fnName}\` is declared \`async\`. \`fn\` is always synchronous. ` +
      `Perform the \`await\` at the call site and pass the resolved value as a parameter to \`fn\`.`,
      fnSpan,
    ));
  }

  // Known non-deterministic call identifiers (§48.3.4)
  const NON_DET_CALLS = [
    "Date.now",
    "new Date",
    "Math.random",
    "crypto.randomUUID",
    "crypto.getRandomValues",
    "performance.now",
  ];

  // Known DOM mutation identifiers (§48.3.2)
  const DOM_MUTATION_APIS = [
    "document.createElement",
    "document.getElementById",
    "document.querySelector",
    "document.querySelectorAll",
    "document.body",
    "document.head",
    ".appendChild",
    ".removeChild",
    ".insertBefore",
    ".setAttribute",
    ".innerHTML",
    ".innerText",
    ".textContent",
    ".removeAttribute",
  ];

  /**
   * Extract the text representation of an AST node for heuristic string matching.
   * BPP may have parsed raw expression text into `value`, `expr`, `text`, or `raw` fields.
   */
  function nodeText(node: ASTNodeLike): string {
    // Phase 4d: ExprNode-first — reconstruct text from ExprNode if available
    const nodeAny = node as Record<string, unknown>;
    const exprNodeField = nodeAny.exprNode ?? nodeAny.initExpr;
    if (exprNodeField && typeof exprNodeField === "object" && (exprNodeField as any).kind) {
      try { return emitStringFromTree(exprNodeField as import("./types/ast.ts").ExprNode); } catch { /* fall through */ }
    }
    const parts: string[] = [];
    if (typeof node.value === "string") parts.push(node.value);
    if (typeof node.expr === "string") parts.push(node.expr);
    if (typeof node.text === "string") parts.push(node.text);
    if (typeof node.raw === "string") parts.push(node.raw);
    if (typeof node.callee === "string") parts.push(node.callee);
    if (typeof node.name === "string") parts.push(node.name);
    if (typeof node.left === "string") parts.push(node.left);
    if (typeof node.right === "string") parts.push(node.right);
    if (typeof node.target === "string") parts.push(node.target);
    return parts.join(" ");
  }

  // ---------------------------------------------------------------------------
  // E-FN-003 — Outer-Scope Variable Mutation (§48.3.3)
  // ---------------------------------------------------------------------------
  // Collect all variable names that are LOCAL to this fn body (params + declarations).
  // Anything NOT in this set that appears as an assignment LHS is an outer-scope mutation.
  const localNames = new Set<string>();

  // Fn parameters are local
  if (Array.isArray(fnNode.params)) {
    for (const param of (fnNode.params as unknown[])) {
      const paramName = typeof param === "string" ? param : (param as ASTNodeLike).name as string;
      if (paramName) localNames.add(paramName);
    }
  }

  // Collect local declarations from direct body nodes (not inside nested fn)
  function collectLocalDecls(nodes: ASTNodeLike[]): void {
    for (const stmt of nodes) {
      if (!stmt || typeof stmt !== "object") continue;
      if (stmt.kind === "function-decl") continue; // nested fn has own scope
      const declName = (stmt.name as string | undefined) ?? undefined;
      if (
        declName &&
        (stmt.kind === "let-decl" ||
         stmt.kind === "const-decl" ||
         stmt.kind === "lin-decl" ||
         stmt.kind === "variable-decl")
      ) {
        // §48.3.3: tilde-decl represents reassignment (e.g. `x = 5`), NOT a fresh declaration.
        // Excluded from localNames so outer-scope mutation via `x = x + 1` is caught.
        localNames.add(declName);
      }
      // Recurse into branches so names declared in branches are also tracked
      if (Array.isArray(stmt.body)) collectLocalDecls(stmt.body as ASTNodeLike[]);
      if (Array.isArray(stmt.then)) collectLocalDecls(stmt.then as ASTNodeLike[]);
      if (Array.isArray(stmt.else)) collectLocalDecls(stmt.else as ASTNodeLike[]);
      if (Array.isArray(stmt.consequent)) collectLocalDecls(stmt.consequent as ASTNodeLike[]);
      if (Array.isArray(stmt.alternate)) collectLocalDecls(stmt.alternate as ASTNodeLike[]);
    }
  }
  collectLocalDecls(body);

  // Regex to detect outer-scope assignments: `name = value` but not `==`, `!=`, `<=`, `>=`, `=>`
  // Matches `identifier =` not followed by `=` or `>`, not preceded by `!`, `<`, `>`, `=`
  const ASSIGN_RE = /([A-Za-z_$][A-Za-z0-9_$]*)(?:\.[A-Za-z_$][A-Za-z0-9_$]*)?\s*=[^=>]/;

  function checkOuterScopeMutation(stmt: ASTNodeLike, txt: string): void {
    const stmtSpan = (stmt.span ?? fnSpan) as Span;
    // Check for assignment node kind first
    if (stmt.kind === "assignment" || stmt.kind === "tilde-decl") {
      const targetName = (stmt.target as string | undefined) ?? (stmt.name as string | undefined);
      if (targetName && !localNames.has(targetName)) {
        errors.push(new TSError(
          "E-FN-003",
          `E-FN-003: \`fn ${fnName}\` body writes to \`${targetName}\` at line ${stmtSpan.line}, ` +
          `which is declared outside the \`fn\` boundary. ` +
          `\`fn\` may not mutate outer-scope variables. ` +
          `Declare \`${targetName}\` inside the \`fn\` body, or pass it as a parameter and return an updated value alongside the state.`,
          stmtSpan,
        ));
      }
      return;
    }
    // Heuristic text check for assignment patterns
    if (txt) {
      const match = ASSIGN_RE.exec(txt);
      if (match) {
        const targetName = match[1];
        if (targetName && !localNames.has(targetName)) {
          errors.push(new TSError(
            "E-FN-003",
            `E-FN-003: \`fn ${fnName}\` body writes to \`${targetName}\` at line ${stmtSpan.line}, ` +
            `which is declared outside the \`fn\` boundary. ` +
            `\`fn\` may not mutate outer-scope variables. ` +
            `Declare \`${targetName}\` inside the \`fn\` body, or pass it as a parameter and return an updated value alongside the state.`,
            stmtSpan,
          ));
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // E-FN-006 — Returning Incomplete State (§48.4.3)
  // E-FN-007 — Branch Produces Different State Shape (§48.4.4)
  // ---------------------------------------------------------------------------
  // Track state instances created inside the fn body: varName -> typeName
  const stateInstances = new Map<string, string>(); // varName -> typeName
  // Track which fields are loaded per state instance: varName -> Set<fieldName>
  const loadedFields = new Map<string, Set<string>>();
  // Track return types seen at top-level branches for E-FN-007
  const returnTypes: Array<{ typeName: string; line: number }> = [];
  // Track if a tilde-decl (~ accumulator) exists in the fn body for E-FN-008
  let hasFnLocalTilde = false;
  // Track if a lift statement exists in the fn body for E-FN-008
  let hasLiftInBody = false;
  let liftSpan: Span | null = null;

  // Scan the fn body top-level for tilde-decl (~ initializations).
  // Also treat `return ~` (or any ~-reference in a return) as an implicit
  // fn-local accumulator: §48.5 says lift inside fn is fine when the fn
  // closes the accumulator itself (`return ~`), even without an explicit
  // `~acc = []` declaration.
  function textMentionsTilde(stmt: ASTNodeLike): boolean {
    const t = nodeText(stmt);
    return typeof t === "string" && /(^|[\s(=,{\[])~($|[\s);,}\]])/.test(t);
  }
  for (const stmt of body) {
    if (!stmt || typeof stmt !== "object") continue;
    if (stmt.kind === "tilde-decl" || stmt.kind === "tilde-stmt") {
      hasFnLocalTilde = true;
    }
    if (stmt.kind === "return-stmt" && textMentionsTilde(stmt)) {
      hasFnLocalTilde = true;
    }
  }

  // Pre-pass: collect state instantiations at top level of fn body
  // Pattern: let varName = < TypeName> (state-instantiation node or expression text)
  function collectStateInstances(nodes: ASTNodeLike[]): void {
    for (const stmt of nodes) {
      if (!stmt || typeof stmt !== "object") continue;
      if (stmt.kind === "function-decl") continue;

      // Structured state instantiation node
      if (stmt.kind === "state-instantiation" || stmt.kind === "state-init") {
        const varName = stmt.name as string | undefined;
        const typeName = (stmt.stateType ?? stmt.typeName ?? stmt.type) as string | undefined;
        if (varName && typeName) {
          stateInstances.set(varName, typeName);
          loadedFields.set(varName, new Set());
        }
      }

      // let-decl / const-decl where value contains "< TypeName>" pattern
      if (
        stmt.kind === "let-decl" ||
        stmt.kind === "const-decl" ||
        stmt.kind === "variable-decl"
      ) {
        const varName = stmt.name as string | undefined;
        // Check if the value field contains a state instantiation
        // BPP represents "< TypeName>" as stateType field or in value text
        const stateTypeName = (stmt.stateType ?? stmt.instanceOf) as string | undefined;
        if (varName && stateTypeName) {
          stateInstances.set(varName, stateTypeName);
          loadedFields.set(varName, new Set());
        } else if (varName && typeof stmt.value === "string") {
          // Heuristic: value text matches "< TypeName>" pattern
          const stateMatch = /^\s*<\s*([A-Z][A-Za-z0-9_]*)\s*>\s*$/.exec(stmt.value as string);
          if (stateMatch) {
            stateInstances.set(varName, stateMatch[1]);
            loadedFields.set(varName, new Set());
          }
        }
      }
    }
  }
  collectStateInstances(body);

  // Field assignment tracking: when we see "varName.fieldName = value"
  // Regex: captures varName and fieldName from property assignment text
  const FIELD_ASSIGN_RE = /\b([A-Za-z_$][A-Za-z0-9_$]*)\s*\.\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*=[^=>]/;

  function trackFieldAssignment(txt: string): void {
    const match = FIELD_ASSIGN_RE.exec(txt);
    if (match) {
      const varName = match[1];
      const fieldName = match[2];
      const fields = loadedFields.get(varName);
      if (fields) {
        fields.add(fieldName);
      }
    }
  }

  // Collect return types at the given nesting level (for E-FN-007)
  function collectReturnTypes(nodes: ASTNodeLike[], isBranch: boolean): void {
    for (const stmt of nodes) {
      if (!stmt || typeof stmt !== "object") continue;
      if (stmt.kind === "function-decl") continue;

      if (stmt.kind === "return-stmt") {
        // Phase 4d: ExprNode-first — extract return value from exprNode, string fallback
        const _retExprNode = (stmt as Record<string, unknown>).exprNode;
        const returnValue: string | undefined = _retExprNode
          ? (() => { try { return emitStringFromTree(_retExprNode as import("./types/ast.ts").ExprNode); } catch { return undefined; } })()
          : (stmt.value ?? stmt.expr ?? stmt.expression) as string | undefined;
        if (returnValue && typeof returnValue === "string") {
          const instance = stateInstances.get(returnValue.trim());
          if (instance && isBranch) {
            const retSpan = (stmt.span ?? fnSpan) as Span;
            returnTypes.push({ typeName: instance, line: retSpan.line });
          }
        }
        // Structured return: stmt.returnType or stmt.stateType
        const retType = (stmt.returnType ?? stmt.stateType) as string | undefined;
        if (retType && isBranch) {
          const retSpan = (stmt.span ?? fnSpan) as Span;
          returnTypes.push({ typeName: retType, line: retSpan.line });
        }
      }

      // Recurse into branches for E-FN-007 tracking
      const branchNodes: ASTNodeLike[][] = [];
      if (Array.isArray(stmt.then)) branchNodes.push(stmt.then as ASTNodeLike[]);
      if (Array.isArray(stmt.else)) branchNodes.push(stmt.else as ASTNodeLike[]);
      if (Array.isArray(stmt.consequent)) branchNodes.push(stmt.consequent as ASTNodeLike[]);
      if (Array.isArray(stmt.alternate)) branchNodes.push(stmt.alternate as ASTNodeLike[]);
      if (Array.isArray(stmt.arms)) {
        for (const arm of stmt.arms as ASTNodeLike[]) {
          if (Array.isArray(arm.body)) branchNodes.push(arm.body as ASTNodeLike[]);
        }
      }
      for (const branch of branchNodes) {
        collectReturnTypes(branch, true);
      }
    }
  }
  collectReturnTypes(body, false);

  // ---------------------------------------------------------------------------
  // Primary walk: Layer 1 + E-FN-003 + field tracking + lift detection
  // ---------------------------------------------------------------------------
  function walkBody(nodes: ASTNodeLike[]): void {
    for (const stmt of nodes) {
      if (!stmt || typeof stmt !== "object") continue;

      const stmtSpan = (stmt.span ?? fnSpan) as Span;

      // E-FN-001: SQL access (?{} block)
      if (stmt.kind === "sql") {
        errors.push(new TSError(
          "E-FN-001",
          `E-FN-001: \`fn ${fnName}\` body contains a \`?{}\` SQL access. ` +
          `\`fn\` is a pure function and may not perform database operations. ` +
          `Move the \`?{}\` query outside \`fn\` and pass the result as a parameter.`,
          stmtSpan,
        ));
      }

      // E-FN-005: await expression in body
      if (stmt.kind === "await-expr" || stmt.await === true) {
        errors.push(new TSError(
          "E-FN-005",
          `E-FN-005: \`fn ${fnName}\` body contains \`await\`. ` +
          `\`fn\` is always synchronous. Perform the \`await\` at the call site and pass the resolved value as a parameter.`,
          stmtSpan,
        ));
      }

      // E-FN-008: lift statement targeting outer scope
      if (stmt.kind === "lift" || stmt.kind === "lift-stmt" || stmt.kind === "lift-expr") {
        hasLiftInBody = true;
        if (!liftSpan) liftSpan = stmtSpan;
      }

      // Heuristic text checks for E-FN-001, E-FN-002, E-FN-003, E-FN-004 and field tracking
      const txt = nodeText(stmt);
      if (txt) {
        // E-FN-001: ?{} SQL access (text-heuristic — catches ?{} embedded in let-decl init or return-stmt)
        if (stmt.kind !== "sql" && /\?\s*\{/.test(txt)) {
          errors.push(new TSError(
            "E-FN-001",
            `E-FN-001: \`fn ${fnName}\` body contains a \`?{}\` SQL access. ` +
            `\`fn\` is a pure function and may not perform database operations. ` +
            `Move the \`?{}\` query outside \`fn\` and pass the result as a parameter.`,
            stmtSpan,
          ));
        }

        // E-FN-003: fn body calls a non-pure function (§48.6.2)
        if (nonPureFnNames && nonPureFnNames.size > 0) {
          // Extract all identifier-followed-by-`(` occurrences
          const CALL_RE = /\b([A-Za-z_$][A-Za-z0-9_$]*)\s*\(/g;
          let m: RegExpExecArray | null;
          while ((m = CALL_RE.exec(txt)) !== null) {
            const callee = m[1];
            if (nonPureFnNames.has(callee)) {
              errors.push(new TSError(
                "E-FN-003",
                `E-FN-003: \`fn ${fnName}\` body calls \`${callee}()\`, which is declared with \`function\` (not \`fn\`) and may perform side effects. ` +
                `\`fn\` may only call other \`fn\` declarations. ` +
                `Either redeclare \`${callee}\` as \`fn\`, or pass its result into \`fn ${fnName}\` as a parameter.`,
                stmtSpan,
              ));
              break; // one E-FN-003 per statement
            }
          }
        }

        // E-FN-004: non-deterministic calls
        for (const nd of NON_DET_CALLS) {
          if (txt.includes(nd)) {
            errors.push(new TSError(
              "E-FN-004",
              `E-FN-004: \`fn ${fnName}\` body calls \`${nd}()\`, which is non-deterministic. ` +
              `\`fn\` must be a pure function of its inputs. Generate the value outside \`fn\` and pass it as a parameter.`,
              stmtSpan,
            ));
            break; // one error per statement for non-det
          }
        }

        // E-FN-002: DOM mutation calls
        for (const domApi of DOM_MUTATION_APIS) {
          if (txt.includes(domApi)) {
            errors.push(new TSError(
              "E-FN-002",
              `E-FN-002: \`fn ${fnName}\` body contains a DOM mutation call (\`${domApi}\`). ` +
              `\`fn\` is a pure function and may not mutate the DOM. ` +
              `Use \`<state>\` fields to hold configuration data; let the runtime render the DOM from state.`,
              stmtSpan,
            ));
            break; // one error per statement for DOM
          }
        }

        // E-FN-003: outer-scope variable mutation
        checkOuterScopeMutation(stmt, txt);

        // Track field assignments for E-FN-006
        trackFieldAssignment(txt);
      }

      // E-FN-006: return statement — check completeness of state instances
      // Phase 4d: ExprNode-first, string fallback
      if (stmt.kind === "return-stmt" && stateTypeRegistry) {
        const _retExprNode2 = (stmt as Record<string, unknown>).exprNode;
        const returnValue = _retExprNode2
          ? (() => { try { return emitStringFromTree(_retExprNode2 as import("./types/ast.ts").ExprNode); } catch { return undefined; } })()
          : (stmt.value ?? stmt.expr ?? stmt.expression) as unknown;
        const returnVarName = typeof returnValue === "string" ? returnValue.trim() : undefined;
        if (returnVarName) {
          const typeName = stateInstances.get(returnVarName);
          if (typeName) {
            const stateType = stateTypeRegistry.get(typeName) as StateType | undefined;
            if (stateType && stateType.attributes) {
              const loaded = loadedFields.get(returnVarName) ?? new Set();
              for (const [fieldName] of stateType.attributes) {
                if (!loaded.has(fieldName)) {
                  errors.push(new TSError(
                    "E-FN-006",
                    `E-FN-006: \`fn\` returns \`${returnVarName}\` (type \`${typeName}\`) ` +
                    `at line ${stmtSpan.line} with field \`${fieldName}\` unassigned. ` +
                    `All fields of a \`<state>\` type must be assigned before the object is returned from \`fn\`. ` +
                    `Assign \`${returnVarName}.${fieldName}\` before the \`return\` statement.`,
                    stmtSpan,
                  ));
                }
              }
            }
          }
        }
      }

      // Recurse into child node arrays.
      // Do NOT recurse into nested function-decl nodes — they have their own check.
      if (stmt.kind === "function-decl") continue;

      if (Array.isArray(stmt.body)) walkBody(stmt.body as ASTNodeLike[]);
      if (Array.isArray(stmt.children)) walkBody(stmt.children as ASTNodeLike[]);
      if (Array.isArray(stmt.consequent)) walkBody(stmt.consequent as ASTNodeLike[]);
      if (Array.isArray(stmt.alternate)) walkBody(stmt.alternate as ASTNodeLike[]);
      if (Array.isArray(stmt.then)) walkBody(stmt.then as ASTNodeLike[]);
      if (Array.isArray(stmt.else)) walkBody(stmt.else as ASTNodeLike[]);
      if (Array.isArray(stmt.arms)) {
        for (const arm of stmt.arms as ASTNodeLike[]) {
          if (Array.isArray(arm.body)) walkBody(arm.body as ASTNodeLike[]);
        }
      }
    }
  }

  walkBody(body);

  // ---------------------------------------------------------------------------
  // E-FN-007 — Branch Produces Different State Shape (§48.4.4)
  // ---------------------------------------------------------------------------
  if (returnTypes.length >= 2) {
    const uniqueTypes = [...new Set(returnTypes.map(r => r.typeName))];
    if (uniqueTypes.length > 1) {
      // Check if the fn has an explicit union return type declared
      const hasExplicitUnionReturn =
        typeof fnNode.returnType === "string" && fnNode.returnType.includes("|");
      if (!hasExplicitUnionReturn) {
        const firstRet = returnTypes[0];
        const secondRet = returnTypes.find(r => r.typeName !== firstRet.typeName);
        errors.push(new TSError(
          "E-FN-007",
          `E-FN-007: \`fn ${fnName}\` returns \`${firstRet.typeName}\` in one branch ` +
          `(line ${firstRet.line}) and \`${secondRet?.typeName ?? uniqueTypes[1]}\` in another ` +
          `(line ${secondRet?.line ?? "?"}). ` +
          `Declare an explicit union return type to allow this: ` +
          `\`fn ${fnName}(...) -> ${uniqueTypes.join(" | ")} { ... }\`. ` +
          `If the divergence is unintentional, make both branches return the same type.`,
          fnSpan,
        ));
      }
    }
  }

  // ---------------------------------------------------------------------------
  // E-FN-008 — lift Targeting Outer Scope (§48.5.2)
  // ---------------------------------------------------------------------------
  if (hasLiftInBody && !hasFnLocalTilde && liftSpan) {
    errors.push(new TSError(
      "E-FN-008",
      `E-FN-008: \`lift\` at line ${liftSpan.line} inside \`fn ${fnName}\` targets a ` +
      `\`~\` accumulator initialized outside the \`fn\` boundary. ` +
      `\`lift\` inside \`fn\` may only accumulate into \`~\` initialized within the same \`fn\` body.`,
      liftSpan,
    ));
  }
}

// ---------------------------------------------------------------------------
// Exports for testing and downstream use
// ---------------------------------------------------------------------------

export {
  ScopeChain,
  Scope,
  initCap,
  mapSqliteType,
  buildTypeRegistry,
  generateDbTypes,
  parseStructBody,
  parseEnumBody,
  resolveTypeExpr,
  checkStructFieldAccess,
  checkEnumExhaustiveness,
  checkUnionExhaustiveness,
  checkExhaustiveness,
  isOptionalType,
  checkNotAssignment,
  checkNotReturn,
  tPrimitive,
  tStruct,
  tEnum,
  tArray,
  tUnion,
  tAsIs,
  tUnknown,
  tNot,
  tSnippet,
  tPredicated,
  tState,
  BUILTIN_TYPES,
  NAMED_SHAPES,
  parsePredicateExpr,
  evaluatePredicateOnLiteral,
  checkPredicateLiteral,
  predicateImplies,
  classifyPredicateZone,
  extractInitLiteral,
  // State type registry exports (§35)
  buildStateTypeRegistry,
  registerStateType,
  getStateType,
  validateMarkupAttributes,
  inferAttrValueType,
  // TS-G exports
  LinTracker,
  TildeTracker,
  MustUseTracker,
  checkLinear,
  hasNonLiftTildeConsumer,
  // State-type overloading exports
  buildOverloadRegistry,
  // §51.3 Machine registry exports
  buildMachineRegistry,
  resolveMachineBinding,
  parseMachineRules,
};
