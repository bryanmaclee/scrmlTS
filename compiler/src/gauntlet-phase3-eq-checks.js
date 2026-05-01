/**
 * Gauntlet Phase 3 — equality / null-token diagnostics.
 *
 * This module implements post-TAB checks for equality (==, !=) misuses that
 * the existing pipeline otherwise accepts silently. Each check is directly
 * traceable to a repro fixture in
 *   samples/compilation-tests/gauntlet-s19-phase3-operators/
 *
 * Checks emitted here (see docs/changes/gauntlet-s19/phase3-bugs.md):
 *
 *   E-EQ-004     — `===` / `!==` used as equality. scrml equality is always
 *                  strict, so the operator is just `==` / `!=`. (§45.7)
 *                  Note: ast-builder's `collectExpr` already emits this for
 *                  let/const initializers, but `collectIfCondition` does not;
 *                  this walker catches if-condition occurrences from the
 *                  parsed exprNode tree.
 *
 *   E-EQ-002     — `== not` / `!= not`. Use `is not` / `is not not`. (§45)
 *                  Covers if-condition paths that bypass collectExpr.
 *
 *   E-SYNTAX-042 — `== null` / `!= null` / `== undefined` / `!= undefined`.
 *                  `null` and `undefined` are not scrml tokens — use
 *                  `is not` / `is some`. (§45)
 *
 *   E-EQ-001     — `==` / `!=` between two primitive types that are not the
 *                  same (e.g. `number == bool`). scrml never coerces across
 *                  types. (§45)
 *
 *   W-EQ-001     — `==` / `!=` where either operand is declared `asIs`.
 *                  asIs defers semantics to the runtime; equality is
 *                  reference equality and rarely what the author wants. (§45)
 *
 *   E-EQ-003     — `==` / `!=` on a struct type whose shape contains a
 *                  function-typed field. Functions cannot be compared
 *                  structurally. (§45)
 *
 * All errors use the same shape as TAB/TS diagnostics — `{ code, message,
 * span, severity }` — and are collected into the compiler's global error
 * stream by the api.js driver.
 */

// ---------------------------------------------------------------------------
// Error class — matches TABError shape for uniform collection in api.js
// ---------------------------------------------------------------------------

class GauntletPhase3Error {
  constructor(code, message, span, severity = "error") {
    this.code = code;
    this.message = message;
    this.span = span;
    this.severity = severity;
    // Lift span fields into top-level error properties so the CLI formatter
    // (compiler/src/commands/compile.js formatError) can render line/col
    // and source context. Other stages (TAB, TS, RI) attach errors with
    // line/column at the top level — we mirror that shape here. Closes
    // F-NULL-002 diagnostic-quality sub-bug ("no line number") — W3.
    if (span && typeof span === "object") {
      this.filePath = span.file;
      this.file = span.file;
      this.line = span.line;
      this.column = span.col;
    }
  }
}

// ---------------------------------------------------------------------------
// Type-decl scan — find struct types whose shape contains any `fn` / arrow
// field, which forbids equality under E-EQ-003.
// ---------------------------------------------------------------------------

/**
 * Crude detector: looks for function-shaped fields in a struct body.
 * Matches patterns like `fieldName: () => ...`, `fieldName: (x) => ...`,
 * `fieldName: fn(...)`. Does not parse the type expression — a precise
 * implementation would use the type registry, but this catches the cases
 * in the Phase 3 fixtures without risking false positives on common shapes
 * (number, string, bool, arrays, unions of primitives).
 *
 * @param {string} raw — raw type body, e.g. "{ name: string, onFire: () => void }"
 * @returns {boolean}
 */
function structBodyHasFunctionField(raw) {
  if (typeof raw !== "string" || !raw) return false;
  // `(...) =>` arrow type annotation
  if (/:\s*\([^)]*\)\s*=>/.test(raw)) return true;
  // `: fn(` explicit fn type
  if (/:\s*fn\s*\(/.test(raw)) return true;
  return false;
}

/**
 * Collect struct type names that contain a function-typed field.
 * @param {object} ast — FileAST
 * @returns {Set<string>}
 */
function collectStructTypesWithFnField(ast) {
  const out = new Set();
  if (!ast) return out;
  const topNodes = ast.nodes ?? [];
  const typeDecls = ast.typeDecls ?? [];

  function visitTypeDecl(td) {
    if (!td) return;
    if (td.typeKind !== "struct") return;
    if (structBodyHasFunctionField(td.raw ?? "")) {
      out.add(td.name);
    }
  }

  for (const td of typeDecls) visitTypeDecl(td);

  // type-decls can also live as inline children of ${ } logic blocks.
  function walk(nodes) {
    if (!Array.isArray(nodes)) return;
    for (const n of nodes) {
      if (!n || typeof n !== "object") continue;
      if (n.kind === "type-decl") visitTypeDecl(n);
      if (Array.isArray(n.body))     walk(n.body);
      if (Array.isArray(n.children)) walk(n.children);
      if (Array.isArray(n.then))     walk(n.then);
      if (Array.isArray(n.else))     walk(n.else);
      if (Array.isArray(n.consequent)) walk(n.consequent);
      if (Array.isArray(n.alternate)) walk(n.alternate);
    }
  }
  walk(topNodes);
  return out;
}

// ---------------------------------------------------------------------------
// Binding collection — name → { primType, typeAnnotation } for simple inits.
// ---------------------------------------------------------------------------

/**
 * Classify a parsed expression node's primitive type for cross-type equality
 * detection. Only confident categories are returned; unknown returns null.
 *
 * @param {object|null|undefined} node — ExprNode
 * @returns {"number"|"string"|"bool"|"not"|"null"|"undefined"|null}
 */
function litKindOf(node) {
  if (!node || typeof node !== "object") return null;
  if (node.kind === "lit") {
    if (node.litType === "number") return "number";
    if (node.litType === "string") return "string";
    if (node.litType === "template") return "string";
    if (node.litType === "bool") return "bool";
    if (node.litType === "not") return "not";
    if (node.litType === "null") return "null";
    if (node.litType === "undefined") return "undefined";
    return null;
  }
  // Negative numeric literal: unary `-` on numeric lit
  if (node.kind === "unary" && node.op === "-" && node.argument?.kind === "lit" && node.argument.litType === "number") {
    return "number";
  }
  return null;
}

/**
 * Parse a scrml type annotation string and classify the declared type.
 * Returns null for anything we don't recognize.
 *
 * @param {string|null|undefined} annot
 * @param {Set<string>} structFnSet — struct names known to contain fn fields
 * @returns {{primType: "number"|"string"|"bool"|"asIs"|null, typeName: string|null, containsFnStruct: boolean}|null}
 */
function classifyTypeAnnotation(annot, structFnSet) {
  if (!annot || typeof annot !== "string") return null;
  // Strip leading `:` and whitespace if still attached.
  let s = annot.trim();
  if (s.startsWith(":")) s = s.slice(1).trim();
  // Drop predicate suffix `Type(pred)` — we only care about the head.
  const parenIdx = s.indexOf("(");
  const head = (parenIdx === -1 ? s : s.slice(0, parenIdx)).trim();
  // Union head like `string | not` → pick the first member.
  const firstMember = head.split("|")[0].trim();
  const name = firstMember;
  if (name === "number") return { primType: "number", typeName: "number", containsFnStruct: false };
  if (name === "string") return { primType: "string", typeName: "string", containsFnStruct: false };
  if (name === "bool")   return { primType: "bool",   typeName: "bool",   containsFnStruct: false };
  if (name === "asIs")   return { primType: "asIs",   typeName: "asIs",   containsFnStruct: false };
  if (structFnSet.has(name)) {
    return { primType: null, typeName: name, containsFnStruct: true };
  }
  if (name && /^[A-Z]/.test(name)) {
    return { primType: null, typeName: name, containsFnStruct: false };
  }
  return null;
}

/**
 * Walk the AST top-to-bottom collecting a name → binding-info map. Bindings
 * from inner scopes are NOT correctly scoped out — this walker is an
 * intentional best-effort: the Phase 3 fixtures all declare equality operands
 * at the same scope (same ${ } block) as the `if (...)` they appear in, so a
 * flat map is sufficient. A nested shadowing case will resolve to the
 * innermost seen binding (last-write-wins).
 *
 * Recognized binding shapes:
 *   let / const / reactive-decl with literal init   → inferred from init
 *   let / const / reactive-decl with typeAnnotation → classified from annot
 *
 * @param {object} ast
 * @param {Set<string>} structFnSet
 * @returns {Map<string, { primType: string|null, typeName: string|null, containsFnStruct: boolean, annot: string|null }>}
 */
function collectBindings(ast, structFnSet) {
  const out = new Map();
  if (!ast) return out;
  const topNodes = ast.nodes ?? [];

  function recordBinding(node) {
    if (!node || !node.name) return;
    const name = node.name;
    const annot = typeof node.typeAnnotation === "string" ? node.typeAnnotation : null;
    let primType = null;
    let typeName = null;
    let containsFnStruct = false;

    // Prefer declared type annotation.
    const classified = classifyTypeAnnotation(annot, structFnSet);
    if (classified) {
      primType = classified.primType;
      typeName = classified.typeName;
      containsFnStruct = classified.containsFnStruct;
    }

    // Fall back to inference from literal initializer.
    if (!primType && !typeName) {
      const litKind = litKindOf(node.initExpr);
      if (litKind === "number" || litKind === "string" || litKind === "bool") {
        primType = litKind;
        typeName = litKind;
      }
    }

    out.set(name, { primType, typeName, containsFnStruct, annot });
  }

  function walk(nodes) {
    if (!Array.isArray(nodes)) return;
    for (const n of nodes) {
      if (!n || typeof n !== "object") continue;
      if (n.kind === "let-decl" || n.kind === "const-decl" || n.kind === "reactive-decl") {
        recordBinding(n);
      }
      if (Array.isArray(n.body))       walk(n.body);
      if (Array.isArray(n.children))   walk(n.children);
      if (Array.isArray(n.then))       walk(n.then);
      if (Array.isArray(n.else))       walk(n.else);
      if (Array.isArray(n.consequent)) walk(n.consequent);
      if (Array.isArray(n.alternate)) walk(n.alternate);
      if (Array.isArray(n.arms)) {
        for (const arm of n.arms) if (arm && Array.isArray(arm.body)) walk(arm.body);
      }
    }
  }
  walk(topNodes);
  return out;
}

// ---------------------------------------------------------------------------
// Expression-node walk — finds binary ==/!=/===/!== anywhere in the tree.
// ---------------------------------------------------------------------------

/**
 * Metadata fields we never recurse into. These are leaves or non-ExprNode
 * metadata: walking them produces no equality binaries.
 *
 * NOTE: "value" is NOT in this set unconditionally. On `kind: "lit"` the
 * `value` field is a primitive scalar (skipped via inline check below).
 * On other kinds (e.g. `kind: "prop"` for object-literal entries, or
 * `kind: "assign"` for assignment RHS) `value` IS an ExprNode child and
 * MUST be recursed into.
 */
const SKIP_KEYS = new Set([
  "span",          // source location metadata
  "kind",          // discriminant
  "op",            // operator string
  "name",          // identifier name string
  "raw",           // literal raw text
  "litType",       // literal subtype string
  "estreeType",    // escape-hatch original ESTree node-type string
  "fnStyle",       // lambda style discriminator
  "isAsync",       // lambda async flag
  "computed",      // member/index flag
  "optional",      // member/index optional flag
]);

/**
 * Generic ExprNode descent: visits every object/array-valued field except
 * metadata, calling `onEq` on every binary `==`/`!=`/`===`/`!==` node.
 *
 * Replaces the prior hard-coded JS-AST key list (`test`, `arguments`,
 * `properties`), which missed scrml-AST keys (`condition`, `args`, `props`,
 * `subject`, `rawArms`, `body`, `index`). The hard-coded list silently
 * skipped these subtrees, allowing `== null` / `!= null` to slip past the
 * detector when nested inside ternary conditions, call arguments, object
 * properties, etc.
 *
 * Closes the walker-incompleteness half of F-NULL-001 + F-NULL-002 paired
 * fix (W3 — 2026-04-30; diagnosis at
 * docs/changes/f-null-001-002/diagnosis.md).
 *
 * @param {object|null|undefined} node
 * @param {(eqNode: object) => void} onEq — called for every binary eq node
 */
function forEachEqualityBinary(node, onEq) {
  if (!node || typeof node !== "object") return;
  if (node.kind === "binary" &&
      (node.op === "==" || node.op === "!=" || node.op === "===" || node.op === "!==")) {
    onEq(node);
  }
  for (const [key, child] of Object.entries(node)) {
    if (SKIP_KEYS.has(key)) continue;
    // On `kind: "lit"`, the `value` field is a primitive scalar — never
    // an ExprNode. Skip to prevent walking primitive numbers/strings/etc.
    if (key === "value" && node.kind === "lit") continue;
    if (Array.isArray(child)) {
      for (const item of child) {
        if (item && typeof item === "object") forEachEqualityBinary(item, onEq);
      }
    } else if (child && typeof child === "object") {
      forEachEqualityBinary(child, onEq);
    }
  }
}


// ---------------------------------------------------------------------------
// Operand classification — resolve an operand to its type info.
// ---------------------------------------------------------------------------

function classifyOperand(operand, bindings) {
  if (!operand || typeof operand !== "object") return { kind: "unknown" };
  const lit = litKindOf(operand);
  if (lit) return { kind: "lit", primType: lit };
  if (operand.kind === "ident" && typeof operand.name === "string") {
    // Bare `undefined` / `null` keywords may surface as plain idents from the
    // underlying JS parser — `undefined` is an ordinary identifier in JS, and
    // some expression-parser paths emit `null` as an ident as well. Treat
    // these as the forbidden `== null` / `== undefined` operand regardless
    // of whether the name is also bound locally (the bare-keyword case is
    // overwhelmingly more common and matches §45 semantics).
    if (operand.name === "undefined") return { kind: "lit", primType: "undefined" };
    if (operand.name === "null")      return { kind: "lit", primType: "null" };
    const info = bindings.get(operand.name);
    if (info) return { kind: "binding", name: operand.name, info };
  }
  return { kind: "unknown" };
}

// ---------------------------------------------------------------------------
// Span helpers — pick the best span available on an exprNode.
// ---------------------------------------------------------------------------

function spanFromExprNode(exprNode, fallback, filePath) {
  // ExprNode spans (from expression-parser.ts) carry source-relative
  // start/end (via baseOffset threading) but NOT source-relative
  // line/col — see spanFromEstree(), which hard-codes line:1, col:1
  // because the parser does not recompute line/col from the offset.
  // The AST-node fallback (e.g. if-stmt.span) DOES carry correct
  // source line/col. Therefore we prefer ExprNode for start/end (most
  // precise byte range) and fallback for line/col (correct line).
  // Closes F-NULL-002 diagnostic-quality sub-bug — W3.
  const sp = exprNode?.span;
  if (sp && typeof sp === "object") {
    return {
      file: filePath,
      start: sp.start ?? 0,
      end: sp.end ?? 0,
      line: fallback?.line ?? sp.line ?? 1,
      col: fallback?.col ?? sp.col ?? 1,
    };
  }
  if (fallback) {
    return {
      file: filePath,
      start: fallback.start ?? 0,
      end: fallback.end ?? 0,
      line: fallback.line ?? 1,
      col: fallback.col ?? 1,
    };
  }
  return { file: filePath, start: 0, end: 0, line: 1, col: 1 };
}

// ---------------------------------------------------------------------------
// The eq-node check — dispatches E-EQ-001 / E-EQ-003 / E-EQ-004 /
// E-SYNTAX-042 / E-EQ-002 / W-EQ-001.
// ---------------------------------------------------------------------------

function checkEqNode(eqNode, bindings, structFnSet, fallbackSpan, filePath, errors) {
  const span = spanFromExprNode(eqNode, fallbackSpan, filePath);

  // E-EQ-004 — strict-equality operator used.
  if (eqNode.op === "===" || eqNode.op === "!==") {
    const replacement = eqNode.op === "===" ? "==" : "!=";
    errors.push(new GauntletPhase3Error(
      "E-EQ-004",
      `E-EQ-004: \`${eqNode.op}\` is not a valid scrml operator. Use \`${replacement}\` instead — scrml equality is always strict, so \`${replacement}\` is the only form (§45.7).`,
      span,
    ));
    return;
  }

  // From here op is `==` or `!=`. Classify each operand.
  const left = classifyOperand(eqNode.left, bindings);
  const right = classifyOperand(eqNode.right, bindings);

  // E-SYNTAX-042 — `== null` / `== undefined`.
  const isNullLit = (o) => o.kind === "lit" && (o.primType === "null" || o.primType === "undefined");
  if (isNullLit(left) || isNullLit(right)) {
    const tok = (left.kind === "lit" && (left.primType === "null" || left.primType === "undefined"))
      ? left.primType
      : right.primType;
    const suggestion = eqNode.op === "=="
      ? `\`x is not\` (checks for absence) or \`x is some\` for presence`
      : `\`x is some\` (checks for presence) or \`x is not\` for absence`;
    errors.push(new GauntletPhase3Error(
      "E-SYNTAX-042",
      `E-SYNTAX-042: \`${tok}\` is not a scrml token — scrml uses \`not\` for absence (§42). ` +
      `Replace \`${eqNode.op} ${tok}\` with ${suggestion}.`,
      span,
    ));
    return;
  }

  // E-EQ-002 — `== not` / `!= not`.
  const isNotLit = (o) => o.kind === "lit" && o.primType === "not";
  if (isNotLit(left) || isNotLit(right)) {
    const replacement = eqNode.op === "==" ? "is not" : "is not not";
    errors.push(new GauntletPhase3Error(
      "E-EQ-002",
      `E-EQ-002: \`${eqNode.op} not\` is not valid — use \`${replacement}\` to check for absence (§45).`,
      span,
    ));
    return;
  }

  // Gather operand type names.
  const typeOfSide = (o) => {
    if (o.kind === "lit") return { primType: o.primType, typeName: o.primType, containsFnStruct: false, annot: null };
    if (o.kind === "binding") return o.info;
    return null;
  };
  const lt = typeOfSide(left);
  const rt = typeOfSide(right);

  // E-EQ-003 — either operand is a struct type with a function-typed field.
  if ((lt && lt.containsFnStruct) || (rt && rt.containsFnStruct)) {
    const which = lt && lt.containsFnStruct ? lt.typeName : rt.typeName;
    errors.push(new GauntletPhase3Error(
      "E-EQ-003",
      `E-EQ-003: cannot compare values of struct type \`${which}\` with \`${eqNode.op}\` — the struct contains a function-typed field, and functions have no structural equality (§45). ` +
      `Compare the specific data fields instead (e.g. \`a.name ${eqNode.op} b.name\`).`,
      span,
    ));
    return;
  }

  // W-EQ-001 — either operand is declared `asIs`.
  if ((lt && lt.primType === "asIs") || (rt && rt.primType === "asIs")) {
    const whichSide = lt && lt.primType === "asIs" ? (left.name ?? "left") : (right.name ?? "right");
    errors.push(new GauntletPhase3Error(
      "W-EQ-001",
      `W-EQ-001: \`${eqNode.op}\` on \`asIs\` value \`${whichSide}\` falls back to reference equality, which is rarely what authors want (§45). ` +
      `Narrow \`${whichSide}\` to a concrete type before comparing, or compare specific fields.`,
      span,
      "warning",
    ));
    return;
  }

  // E-EQ-001 — cross-type primitive equality.
  if (lt && rt && lt.primType && rt.primType &&
      lt.primType !== rt.primType &&
      lt.primType !== "asIs" && rt.primType !== "asIs") {
    errors.push(new GauntletPhase3Error(
      "E-EQ-001",
      `E-EQ-001: cannot compare \`${lt.primType}\` with \`${rt.primType}\` using \`${eqNode.op}\` — scrml never coerces across types (§45). ` +
      `Convert one side explicitly (e.g. \`toString\`, \`toNumber\`) before comparing.`,
      span,
    ));
    return;
  }
}

// ---------------------------------------------------------------------------
// AST walker — dispatch checkEqNode over every expression site in the AST.
// ---------------------------------------------------------------------------

function walkAst(ast, bindings, structFnSet, filePath, errors) {
  if (!ast) return;
  const topNodes = ast.nodes ?? [];

  function inspectExprNode(exprNode, fallbackSpan) {
    if (!exprNode) return;
    forEachEqualityBinary(exprNode, (eqNode) => {
      checkEqNode(eqNode, bindings, structFnSet, fallbackSpan, filePath, errors);
    });
  }

  /**
   * Inspect every exprNode embedded in a markup-node attribute. Closes the
   * F-NULL-002 silent-pass gap: previously markup `attrs[*].value.exprNode`
   * was never visited, so `<div if=(@x != null)>` and similar attribute
   * expressions bypassed GCP3.
   *
   * Per ast-builder.js, an attribute `value` may carry expressions in:
   *   - `kind: "expr"`         — `if=(...)` or `={...}` brace expressions
   *                              → `value.exprNode`
   *   - `kind: "variable-ref"` — `if=@var` or `data=foo`
   *                              → `value.exprNode`
   *   - `kind: "call-ref"`     — `onclick=fn(arg, arg)`
   *                              → `value.argExprNodes` (array)
   *   - `kind: "props-block"`  — `props={...}` typed props (no exprNode)
   *   - `kind: "string-literal"` — plain `class="..."` (no exprNode; any
   *                                template `${...}` survives as raw text
   *                                and is NOT covered by GCP3 — see W3.2
   *                                follow-up dispatch)
   *   - `kind: "absent"`       — boolean attr presence (no exprNode)
   *
   * The attribute's own `value.span` is preferred as the fallback for the
   * emit, so the diagnostic points at the attribute position.
   */
  function inspectAttrs(attrs) {
    if (!Array.isArray(attrs)) return;
    for (const attr of attrs) {
      if (!attr || typeof attr !== "object") continue;
      const v = attr.value;
      if (!v || typeof v !== "object") continue;
      const fb = v.span ?? attr.span;
      if (v.exprNode) inspectExprNode(v.exprNode, fb);
      if (Array.isArray(v.argExprNodes)) {
        for (const arg of v.argExprNodes) inspectExprNode(arg, fb);
      }
    }
  }

  function walk(nodes) {
    if (!Array.isArray(nodes)) return;
    for (const n of nodes) {
      if (!n || typeof n !== "object") continue;

      // Every AST node shape that carries a parsed expression tree.
      if (n.condExpr)  inspectExprNode(n.condExpr,  n.span);
      if (n.initExpr)  inspectExprNode(n.initExpr,  n.span);
      if (n.exprNode)  inspectExprNode(n.exprNode,  n.span);
      if (n.argsExpr)  inspectExprNode(n.argsExpr,  n.span);

      // F-NULL-002 fix: markup-node attributes carry their own exprNodes.
      if (Array.isArray(n.attrs)) inspectAttrs(n.attrs);

      // Recurse into every child container we might see.
      if (Array.isArray(n.body))       walk(n.body);
      if (Array.isArray(n.children))   walk(n.children);
      if (Array.isArray(n.defChildren)) walk(n.defChildren);
      if (Array.isArray(n.then))       walk(n.then);
      if (Array.isArray(n.else))       walk(n.else);
      if (Array.isArray(n.consequent)) walk(n.consequent);
      if (Array.isArray(n.alternate))  walk(n.alternate);
      if (Array.isArray(n.arms)) {
        for (const arm of n.arms) if (arm && Array.isArray(arm.body)) walk(arm.body);
      }
    }
  }
  walk(topNodes);
}


// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

/**
 * Run all Phase 3 equality-diagnostic checks for a single file.
 * Returns a new array of errors to be merged into the compiler's global
 * stream.
 *
 * @param {{ filePath: string, ast: object }} tabResult
 * @returns {GauntletPhase3Error[]}
 */
export function runGauntletPhase3EqChecks(tabResult) {
  const errors = [];
  const filePath = tabResult?.filePath ?? "<unknown>";
  const ast = tabResult?.ast;
  if (!ast) return errors;

  const structFnSet = collectStructTypesWithFnField(ast);
  const bindings = collectBindings(ast, structFnSet);
  walkAst(ast, bindings, structFnSet, filePath, errors);

  return errors;
}

export { GauntletPhase3Error };
