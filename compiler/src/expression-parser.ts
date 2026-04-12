/**
 * Expression Parser — Acorn-based structured expression parsing for scrml.
 *
 * Provides ESTree AST nodes for JS expressions embedded in scrml contexts.
 * Uses acorn with a minimal plugin to handle the `@` reactive variable sigil.
 *
 * This is Phase 1 of the compiler restructure: expressions are parsed to trees
 * instead of manipulated as raw strings. The tree representation eliminates
 * the need for regex-based string scanning (extractIdentifiers, extractReactiveDeps)
 * and will eventually replace the rewriteExpr chain (Phase 2).
 *
 * @module expression-parser
 */

// @ts-ignore — acorn ships its own types but the plugin API is untyped
import * as acorn from "acorn";
// @ts-ignore — astring ships its own types
import { generate as astringGenerate } from "astring";

import type {
  ExprNode, ExprSpan,
  IdentExpr, LitExpr, ArrayExpr, ObjectExpr, ObjectProp, SpreadExpr,
  UnaryExpr, BinaryExpr, AssignExpr, TernaryExpr,
  MemberExpr, IndexExpr, CallExpr, NewExpr,
  LambdaExpr, LambdaParam,
  CastExpr, MatchExpr, SqlRefExpr, InputStateRefExpr, EscapeHatchExpr,
} from "./types/ast.ts";

// ---------------------------------------------------------------------------
// ESTree types (minimal local definitions — acorn provides runtime shapes)
// ---------------------------------------------------------------------------

/** A minimal ESTree node. All nodes have a `type` string discriminant. */
export interface ESNode {
  type: string;
  [key: string]: unknown;
}

/** Return type for parseExpression / parseStatements. */
export interface ParseResult {
  ast: ESNode | null;
  error: string | null;
}

/** Return type for rewriteReactiveRefsAST / rewriteServerReactiveRefsAST. */
export interface RewriteResult {
  result: string;
  ok: boolean;
}

// ---------------------------------------------------------------------------
// Acorn plugin: handle @ sigil as part of identifiers
// ---------------------------------------------------------------------------

/**
 * Acorn plugin that makes `@` a valid identifier-start character.
 * `@count` parses as Identifier { name: "@count" }.
 */
// @ts-ignore — acorn plugin API uses dynamic class extension not captured in types
function scrmlAtPlugin(Parser: typeof acorn.Parser) {
  // @ts-ignore
  return class extends Parser {
    readToken(code: number) {
      // 64 = '@'
      if (code === 64) {
        // Peek ahead: only consume @ as identifier if followed by a valid
        // identifier start char (letter, _, $). Otherwise let acorn handle it
        // (it will likely error, which is correct for bare @ or @123).
        // @ts-ignore
        const next = this.input.charCodeAt(this.pos + 1);
        const isIdentStart = (next >= 65 && next <= 90)  // A-Z
          || (next >= 97 && next <= 122)                   // a-z
          || next === 95 || next === 36;                   // _ or $
        if (isIdentStart) {
          // @ts-ignore
          this.pos++;
          // @ts-ignore
          const word = this.readWord1();
          // @ts-ignore
          return this.finishToken(acorn.tokTypes.name, "@" + word);
        }
      }
      // @ts-ignore
      return super.readToken(code);
    }
  };
}

/**
 * Acorn plugin that handles `::` enum variant access.
 * Transforms `Type::Variant` by reading it as a single string token.
 * Without this, acorn would choke on `::` which is not valid JS.
 */
// @ts-ignore — acorn plugin API uses dynamic class extension not captured in types
function scrmlEnumPlugin(Parser: typeof acorn.Parser) {
  // @ts-ignore
  return class extends Parser {
    readToken(code: number) {
      // 58 = ':'
      // @ts-ignore
      if (code === 58 && this.input.charCodeAt(this.pos + 1) === 58) {
        // Read Type::Variant as a special identifier
        // @ts-ignore
        this.pos += 2; // skip ::
        // @ts-ignore
        const variant = this.readWord1();
        // Emit as a string literal containing the variant name
        // @ts-ignore
        return this.finishToken(acorn.tokTypes.string, variant);
      }
      // @ts-ignore
      return super.readToken(code);
    }
  };
}

// @ts-ignore
const ScrmlParser = acorn.Parser.extend(scrmlAtPlugin, scrmlEnumPlugin);

// ---------------------------------------------------------------------------
// Parse utilities
// ---------------------------------------------------------------------------

/**
 * Parse a single JS expression string into an ESTree node.
 */
export function parseExpression(raw: string, opts: { tolerant?: boolean } = {}): ParseResult {
  const { tolerant = true } = opts;
  if (!raw || typeof raw !== "string") return { ast: null, error: "empty expression" };

  // Pre-process: strip scrml-specific constructs that acorn can't handle
  let processed = raw.trim();

  // Handle ?{...} SQL blocks — replace with a placeholder identifier
  processed = processed.replace(/\?\{[^}]*\}/g, "__scrml_sql_placeholder__");

  // Handle <#id>.send() worker refs — replace with placeholder before input state refs
  processed = processed.replace(/<#([A-Za-z_$][A-Za-z0-9_$]*)>\s*\.\s*send\s*\(/g, "__scrml_worker_$1__.send(");
  // Handle <#id> input state refs — replace with placeholder
  processed = processed.replace(/<#([A-Za-z_$][A-Za-z0-9_$]*)>/g, "__scrml_input_$1__");

  try {
    // @ts-ignore
    const ast = ScrmlParser.parseExpressionAt(processed, 0, {
      ecmaVersion: 2025,
      sourceType: "module",
      allowAwaitOutsideFunction: true,
    }) as ESNode;
    return { ast, error: null };
  } catch (err) {
    if (tolerant) return { ast: null, error: (err as Error).message };
    throw err;
  }
}

/**
 * Parse a multi-statement JS body into an ESTree Program node.
 */
export function parseStatements(raw: string, opts: { tolerant?: boolean } = {}): ParseResult {
  const { tolerant = true } = opts;
  if (!raw || typeof raw !== "string") return { ast: null, error: "empty body" };

  let processed = raw.trim();
  processed = processed.replace(/\?\{[^}]*\}/g, "__scrml_sql_placeholder__");
  // Handle <#id>.send() worker refs — replace with placeholder before input state refs
  processed = processed.replace(/<#([A-Za-z_$][A-Za-z0-9_$]*)>\s*\.\s*send\s*\(/g, "__scrml_worker_$1__.send(");
  processed = processed.replace(/<#([A-Za-z_$][A-Za-z0-9_$]*)>/g, "__scrml_input_$1__");

  try {
    // @ts-ignore
    const ast = ScrmlParser.parse(processed, {
      ecmaVersion: 2025,
      sourceType: "module",
      allowAwaitOutsideFunction: true,
      allowReturnOutsideFunction: true,
    }) as ESNode;
    return { ast, error: null };
  } catch (err) {
    if (tolerant) return { ast: null, error: (err as Error).message };
    throw err;
  }
}

// ---------------------------------------------------------------------------
// AST walking utilities
// ---------------------------------------------------------------------------

/** Visitor function type for walk(). */
export type WalkVisitor = (node: ESNode, parent: ESNode | null) => void;

/**
 * Simple ESTree walker. Calls `visitor(node, parent)` for every node.
 */
export function walk(node: ESNode | null | undefined, visitor: WalkVisitor, parent: ESNode | null = null): void {
  if (!node || typeof node !== "object") return;
  visitor(node, parent);

  for (const key of Object.keys(node)) {
    const child = node[key];
    if (child && typeof child === "object") {
      if (Array.isArray(child)) {
        for (const item of child) {
          if (item && typeof (item as ESNode).type === "string") {
            walk(item as ESNode, visitor, node);
          }
        }
      } else if (typeof (child as ESNode).type === "string") {
        walk(child as ESNode, visitor, node);
      }
    }
  }
}

/**
 * Extract all identifier names from an expression, excluding:
 * - Property accesses (x.prop — prop is excluded)
 * - Function parameter declarations
 * - Object literal keys
 *
 * This is the structured replacement for the regex-based extractIdentifiers
 * in meta-checker.ts.
 */
export function extractIdentifiersFromAST(expr: string): string[] {
  const { ast } = parseExpression(expr);
  if (!ast) {
    // Fallback: try as statements
    const stmts = parseStatements(expr);
    if (!stmts.ast) return [];
    return extractIdentifiersFromNode(stmts.ast);
  }
  return extractIdentifiersFromNode(ast);
}

/**
 * Recursively collect all binding identifiers from a parameter pattern node.
 * Handles Identifier, ObjectPattern, ArrayPattern, RestElement, and AssignmentPattern.
 */
function collectBindingIdentifiers(node: ESNode, out: Set<string>): void {
  if (!node) return;
  switch (node.type) {
    case "Identifier":
      out.add(node.name as string);
      break;
    case "ObjectPattern":
      for (const prop of (node.properties as ESNode[] | undefined) ?? []) {
        if (prop.type === "RestElement") {
          collectBindingIdentifiers((prop as { argument?: ESNode }).argument as ESNode, out);
        } else if (prop.type === "Property") {
          collectBindingIdentifiers((prop as { value?: ESNode }).value as ESNode, out);
        }
      }
      break;
    case "ArrayPattern":
      for (const elem of (node.elements as (ESNode | null)[] | undefined) ?? []) {
        if (elem) collectBindingIdentifiers(elem, out);
      }
      break;
    case "RestElement":
      collectBindingIdentifiers((node as { argument?: ESNode }).argument as ESNode, out);
      break;
    case "AssignmentPattern":
      collectBindingIdentifiers((node as { left?: ESNode }).left as ESNode, out);
      break;
  }
}

/**
 * Extract identifiers from an ESTree node, excluding property accesses,
 * function params, and object keys.
 */
function extractIdentifiersFromNode(node: ESNode): string[] {
  const ids = new Set<string>();
  const declared = new Set<string>(); // function params, for-of iterators, etc.

  walk(node, (n, parent) => {
    // Collect function parameter declarations
    if (n.type === "FunctionDeclaration" || n.type === "FunctionExpression" || n.type === "ArrowFunctionExpression") {
      for (const param of (n.params as ESNode[] | undefined) ?? []) {
        collectBindingIdentifiers(param, declared);
      }
    }

    // Collect for-of/for-in iterator declarations (including destructuring)
    if (n.type === "ForInStatement" || n.type === "ForOfStatement") {
      const left = n.left as ESNode | undefined;
      if (left?.type === "VariableDeclaration") {
        for (const decl of (left.declarations as ESNode[] | undefined) ?? []) {
          const id = (decl as { id?: ESNode }).id;
          if (id) collectBindingIdentifiers(id, declared);
        }
      }
    }

    // Collect variable declarations (including destructuring)
    if (n.type === "VariableDeclaration") {
      for (const decl of (n.declarations as ESNode[] | undefined) ?? []) {
        const id = (decl as { id?: ESNode }).id;
        if (id) collectBindingIdentifiers(id, declared);
      }
    }

    // Collect identifiers that are NOT property accesses or object keys
    if (n.type === "Identifier") {
      // Skip if this is a property access (x.prop — skip prop)
      if (parent?.type === "MemberExpression" && (parent as { property?: ESNode; computed?: boolean }).property === n && !(parent as { computed?: boolean }).computed) return;
      // Skip if this is an object key
      if (parent?.type === "Property" && (parent as { key?: ESNode; computed?: boolean }).key === n && !(parent as { computed?: boolean }).computed) return;
      ids.add(n.name as string);
    }
  });

  // Remove declared locals
  for (const d of declared) ids.delete(d);

  return [...ids];
}

/**
 * Extract reactive variable dependencies from an expression.
 * Finds all Identifier nodes whose name starts with `@`.
 */
export function extractReactiveDepsFromAST(expr: string, knownReactiveVars: Set<string> | null = null): Set<string> {
  const found = new Set<string>();

  const { ast } = parseExpression(expr);
  const target = ast || parseStatements(expr)?.ast;
  if (!target) return found;

  walk(target, (n, parent) => {
    if (n.type === "Identifier" && typeof n.name === "string" && n.name.startsWith("@")) {
      const varName = n.name.slice(1); // remove @
      // Validate: must be a valid JS identifier (starts with letter, _, $)
      if (!varName || !/^[A-Za-z_$]/.test(varName)) return;
      // Skip property access positions
      if (parent?.type === "MemberExpression" && (parent as { property?: ESNode; computed?: boolean }).property === n && !(parent as { computed?: boolean }).computed) return;
      if (knownReactiveVars === null || knownReactiveVars.has(varName)) {
        found.add(varName);
      }
    }
  });

  return found;
}

// ---------------------------------------------------------------------------
// ESTree → JS serialization
// ---------------------------------------------------------------------------

/**
 * Serialize an ESTree node back to JavaScript source.
 */
export function astToJs(node: ESNode): string {
  // @ts-ignore — astring types don't perfectly align with acorn ESTree output
  return astringGenerate(node);
}

// ---------------------------------------------------------------------------
// Phase 2: AST-based expression rewrites
// ---------------------------------------------------------------------------

/**
 * Rewrite `@varName` reactive references to runtime getter calls using ESTree.
 *
 * Parses the expression with acorn, walks the tree to find @-prefixed Identifiers,
 * replaces them with CallExpression nodes for _scrml_reactive_get("varName") or
 * _scrml_derived_get("varName"), then serializes back to JS.
 *
 * This is the structured replacement for the regex-based rewriteReactiveRefs
 * in rewrite.js.
 */
export function rewriteReactiveRefsAST(expr: string, derivedNames: Set<string> | null = null): RewriteResult {
  if (!expr || typeof expr !== "string") return { result: expr, ok: false };

  // Quick check: if no @ in the expression, nothing to rewrite
  if (!expr.includes("@")) return { result: expr, ok: true };

  // If expression contains :: (enum syntax), ?{ (SQL sigil), or match keyword,
  // fall back to regex — acorn can't parse these scrml constructs correctly.
  // `match` is particularly dangerous: acorn parses it as an identifier and
  // silently skips the @var inside, returning ok:true with no rewrites.
  if (/::|\?\{|\bmatch\b|\bis\b/.test(expr)) return { result: expr, ok: false };

  // Try parsing as expression first, then as statements
  let { ast } = parseExpression(expr);
  if (!ast) {
    const stmts = parseStatements(expr);
    if (!stmts.ast) return { result: expr, ok: false };
    ast = stmts.ast;
  }

  const hasDerived = derivedNames && derivedNames.size > 0;
  let modified = false;

  // Walk and replace @var Identifiers in-place
  walk(ast, (node, parent) => {
    if (node.type !== "Identifier" || typeof node.name !== "string" || !node.name.startsWith("@")) return;

    const varName = node.name.slice(1);
    if (!varName || !/^[A-Za-z_$]/.test(varName)) return;

    // Skip property access positions (obj.@prop shouldn't happen, but guard)
    if (parent?.type === "MemberExpression" && (parent as { property?: ESNode; computed?: boolean }).property === node && !(parent as { computed?: boolean }).computed) return;

    // Determine which getter to use
    const getter = (hasDerived && derivedNames!.has(varName))
      ? "_scrml_derived_get"
      : "_scrml_reactive_get";

    // Replace the Identifier node in-place with a CallExpression
    // We mutate the node to become a CallExpression
    node.type = "CallExpression";
    node.callee = { type: "Identifier", name: getter };
    node.arguments = [{ type: "Literal", value: varName }];
    node.optional = false;
    delete node.name;
    modified = true;
  });

  if (!modified) return { result: expr, ok: true };

  try {
    const js = astToJs(ast);
    // astring adds trailing newline for Program nodes; strip it
    return { result: js.trim(), ok: true };
  } catch {
    return { result: expr, ok: false };
  }
}

/**
 * Rewrite `@varName` reactive references to server-side body lookups using ESTree.
 *
 * Server-side counterpart to rewriteReactiveRefsAST. Replaces @var with
 * `_scrml_body["varName"]` instead of `_scrml_reactive_get("varName")`.
 */
export function rewriteServerReactiveRefsAST(expr: string): RewriteResult {
  if (!expr || typeof expr !== "string") return { result: expr, ok: false };
  if (!expr.includes("@")) return { result: expr, ok: true };
  if (/::|\?\{/.test(expr)) return { result: expr, ok: false };

  let { ast } = parseExpression(expr);
  if (!ast) {
    const stmts = parseStatements(expr);
    if (!stmts.ast) return { result: expr, ok: false };
    ast = stmts.ast;
  }

  let modified = false;

  walk(ast, (node, parent) => {
    if (node.type !== "Identifier" || typeof node.name !== "string" || !node.name.startsWith("@")) return;
    const varName = node.name.slice(1);
    if (!varName || !/^[A-Za-z_$]/.test(varName)) return;
    if (parent?.type === "MemberExpression" && (parent as { property?: ESNode; computed?: boolean }).property === node && !(parent as { computed?: boolean }).computed) return;

    // Replace with _scrml_body["varName"] — a MemberExpression
    node.type = "MemberExpression";
    node.object = { type: "Identifier", name: "_scrml_body" };
    node.property = { type: "Literal", value: varName };
    node.computed = true;
    node.optional = false;
    delete node.name;
    modified = true;
  });

  if (!modified) return { result: expr, ok: true };

  try {
    return { result: astToJs(ast).trim(), ok: true };
  } catch {
    return { result: expr, ok: false };
  }
}

// ---------------------------------------------------------------------------
// Phase 1: ExprNode conversion
// ---------------------------------------------------------------------------
// These functions implement the structured expression AST migration.
// Design doc: /scrml-support/docs/deep-dives/expression-ast-phase-0-design-2026-04-11.md
// ---------------------------------------------------------------------------

/**
 * Null span — used when we cannot determine a precise source span.
 * Callers with real offsets should pass them via parseExprToNode.
 */
function nullSpan(filePath: string): ExprSpan {
  return { file: filePath, start: 0, end: 0, line: 1, col: 1 };
}

/**
 * Construct an ExprSpan from an ESTree node's `start`/`end` positions
 * plus a base offset for the enclosing source region.
 */
function spanFromEstree(node: ESNode, filePath: string, baseOffset: number): ExprSpan {
  const start = (typeof node.start === "number" ? node.start : 0) + baseOffset;
  const end = (typeof node.end === "number" ? node.end : 0) + baseOffset;
  return { file: filePath, start, end, line: 1, col: 1 };
}

// ---------------------------------------------------------------------------
// Pre-processing scrml-specific forms before Acorn
// ---------------------------------------------------------------------------
//
// Acorn cannot parse scrml-specific operators: `is`, `is not`, `is some`,
// `is not not`, `is given`, `match { ... }`.
//
// Strategy: replace these with placeholder function calls that Acorn CAN parse,
// then convert those calls back to the correct ExprNode types in esTreeToExprNode.
//
// Placeholder scheme:
//   x is not not  → __scrml_is_not_not__(x)
//   x is not      → __scrml_is_not__(x)
//   x is some     → __scrml_is_some__(x)
//   x is given    → __scrml_is_some__(x)   (alias per OQ-9)
//   x is .Var     → __scrml_is_variant__(x, ".Var")
//   x is T.Var    → __scrml_is_variant__(x, "T.Var")
//
// Limitation: these replacements are regex-based and operate on the pre-processed
// string. They handle the common cases found in the examples corpus. Complex nested
// forms (multiple is operators) may not round-trip perfectly — those fire EscapeHatch.
//
// `match` expressions: replace entire `match expr { ... }` with
//   __scrml_match__(expr, "arm1", "arm2", ...)
// where each arm is a quoted string. The arm content is preserved verbatim.
// ---------------------------------------------------------------------------

const SCRML_PLACEHOLDER_PREFIX = "__scrml_";

/** Pre-process scrml-specific operators for Acorn parsing. Returns transformed string. */
function preprocessForAcorn(raw: string, opts?: { tildeActive?: boolean }): string {
  let s = raw.trim();

  // Replace `match expr { arms }` with placeholder
  // This is processed first because match may contain `is` operators inside arms.
  s = preprocessMatchExprs(s);

  // Replace `is not not` (must come before `is not`)
  // Pattern: <expr> is not not — left side is everything before ` is not not`
  // We anchor on ` is not not` as a suffix (for the simple case)
  // For parenthesized forms: (expr) is not not → __scrml_is_not_not__((expr))
  s = s.replace(/\)\s+is\s+not\s+not(?!\s+not)/g, ") is_not_not_PLACEHOLDER");
  s = s.replace(/([A-Za-z_$@][A-Za-z0-9_$.]*)\s+is\s+not\s+not(?!\s+not)/g, "__scrml_is_not_not__($1)");
  s = s.replace(/\)\s*is_not_not_PLACEHOLDER/g, ") __scrml_is_not_not_result__");

  // Replace `is not not` via parenthesized form
  s = s.replace(/(__scrml_is_not_not_result__)/g, "__scrml_is_not_not_sentinel__");

  // Replace `(expr) is not not` cleanly
  s = s.replace(/\(([^)]+)\)\s+is\s+not\s+not/g, "__scrml_is_not_not__(($1))");

  // Replace `is not` (absence check)
  s = s.replace(/\)\s+is\s+not(?!\s+not)/g, ")__scrml_is_not_suffix__");
  s = s.replace(/([A-Za-z_$@][A-Za-z0-9_$.]*)\s+is\s+not(?!\s+not)/g, "__scrml_is_not__($1)");
  s = s.replace(/\(([^)]+)\)\s+is\s+not(?!\s+not)/g, "__scrml_is_not__(($1))");
  s = s.replace(/\)__scrml_is_not_suffix__/g, "__scrml_is_not__(PLACEHOLDER_PAREN)");

  // Replace `is some` / `is given` (presence check)
  s = s.replace(/\)\s+is\s+(?:some|given)/g, ").__scrml_is_some_suffix__");
  s = s.replace(/([A-Za-z_$@][A-Za-z0-9_$.]*)\s+is\s+(?:some|given)/g, "__scrml_is_some__($1)");
  s = s.replace(/\(([^)]+)\)\s+is\s+(?:some|given)/g, "__scrml_is_some__(($1))");
  s = s.replace(/\)__scrml_is_some_suffix__/g, "__scrml_is_some__(PLACEHOLDER_PAREN_SOME)");

  // Replace `is .Variant` (enum variant check, dot-prefixed)
  s = s.replace(/([A-Za-z_$@][A-Za-z0-9_$.]*)\s+is\s+(\.[A-Z][A-Za-z0-9_]*)/g,
    '__scrml_is_variant__($1, "$2")');
  s = s.replace(/\(([^)]+)\)\s+is\s+(\.[A-Z][A-Za-z0-9_]*)/g,
    '__scrml_is_variant__(($1), "$2")');

  // Replace `is TypeName.Variant` (qualified enum variant check)
  s = s.replace(/([A-Za-z_$@][A-Za-z0-9_$.]*)\s+is\s+([A-Z][A-Za-z0-9_]*\.[A-Z][A-Za-z0-9_]*)/g,
    '__scrml_is_variant__($1, "$2")');

  // §32 tilde accumulator: replace standalone `~` with placeholder identifier.
  // Only active inside tilde contexts (after value-lift). Outside tilde context,
  // `~` is JS bitwise NOT and must not be replaced.
  if (opts?.tildeActive) {
    s = s.replace(/(?<![A-Za-z0-9_$])~(?![A-Za-z0-9_$])/g, "__scrml_tilde__");
  }

  return s;
}

/** Pre-process `match subject { arms }` expressions. */
function preprocessMatchExprs(s: string): string {
  // Find `match` followed by an expression and a brace block
  // This is a simple balanced-brace scanner — handles one level of nesting
  const matchRe = /\bmatch\s+/g;
  let result = s;
  let searchFrom = 0;
  let m: RegExpExecArray | null;

  // Process match expressions right-to-left to handle nesting
  const matches: Array<{ index: number; end: number; raw: string }> = [];

  matchRe.lastIndex = 0;
  while ((m = matchRe.exec(s)) !== null) {
    const matchStart = m.index;
    // Find the opening brace
    const braceIdx = s.indexOf("{", m.index + m[0].length);
    if (braceIdx === -1) continue;

    // Extract subject (between `match ` and `{`)
    const subjectRaw = s.slice(m.index + m[0].length, braceIdx).trim();

    // Find closing brace (balanced)
    let depth = 1;
    let i = braceIdx + 1;
    while (i < s.length && depth > 0) {
      if (s[i] === "{") depth++;
      else if (s[i] === "}") depth--;
      i++;
    }
    const matchEnd = i;
    const armsRaw = s.slice(braceIdx + 1, i - 1).trim();

    matches.push({ index: matchStart, end: matchEnd, raw: s.slice(matchStart, matchEnd) });
  }

  // Replace right-to-left so indices stay valid
  for (let k = matches.length - 1; k >= 0; k--) {
    const { index, end, raw } = matches[k];
    // Extract subject and arms from the raw match text
    const innerBraceIdx = raw.indexOf("{");
    const subject = raw.slice("match ".length, innerBraceIdx).trim();
    const armsContent = raw.slice(innerBraceIdx + 1, -1).trim();

    // Split arms by `\n` or `.` prefixed arm starts — simple approach
    // Each arm is: `.Variant => expr` or `else => expr`
    // We keep arms as raw strings
    const armStrings = splitMatchArms(armsContent);
    const armsQuoted = armStrings.map(a => JSON.stringify(a.trim())).join(", ");

    const replacement = `__scrml_match__(${subject}, ${armsQuoted})`;
    result = result.slice(0, index) + replacement + result.slice(end);
  }

  return result;
}

/** Split match arms content into individual arm strings. */
function splitMatchArms(content: string): string[] {
  // Arms are separated by `.` at the start of a line or whitespace-dot pattern
  // Simple split on ` .` or `\n.` boundaries, keeping the dot
  const arms: string[] = [];
  // Split on newlines first, then re-join arm continuations
  const lines = content.split(/\n/);
  let current = "";
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    // A new arm starts when line starts with `.` or `else`
    if (current && (trimmed.startsWith(".") || trimmed.startsWith("else"))) {
      arms.push(current.trim());
      current = trimmed;
    } else {
      current += (current ? " " : "") + trimmed;
    }
  }
  if (current.trim()) arms.push(current.trim());
  // Fallback: if only one arm or no newlines, try splitting on whitespace-. pattern
  if (arms.length === 0 && content.trim()) {
    arms.push(content.trim());
  }
  return arms;
}

// ---------------------------------------------------------------------------
// esTreeToExprNode — convert Acorn ESTree to ExprNode
// ---------------------------------------------------------------------------

/**
 * Convert an Acorn ESTree node to an ExprNode.
 *
 * @param node - ESTree node from Acorn
 * @param filePath - Source file path (for spans)
 * @param baseOffset - Byte offset of the expression start in the source file
 * @param rawSource - The original raw source string (before preprocessing) for escape hatch
 */
export function esTreeToExprNode(
  node: ESNode,
  filePath: string,
  baseOffset: number,
  rawSource?: string,
): ExprNode {
  const span = spanFromEstree(node, filePath, baseOffset);

  switch (node.type) {
    // ---- Identifier ----
    case "Identifier": {
      const name = node.name as string;
      // Handle __scrml_input_<id>__ placeholders back to input-state-ref
      if (name.startsWith("__scrml_input_") && name.endsWith("__")) {
        const inputName = name.slice("__scrml_input_".length, -2);
        return { kind: "input-state-ref", span, name: inputName } satisfies InputStateRefExpr;
      }
      // Handle __scrml_sql_placeholder__
      if (name === "__scrml_sql_placeholder__") {
        return { kind: "sql-ref", span, nodeId: -1 } satisfies SqlRefExpr;
      }
      // Handle worker refs __scrml_worker_<id>__
      if (name.startsWith("__scrml_worker_") && name.endsWith("__")) {
        // Worker refs are handled at a higher level; emit as ident for now
        return { kind: "ident", span, name } satisfies IdentExpr;
      }
      // §32 tilde accumulator: convert placeholder back to ~ ident
      if (name === "__scrml_tilde__") {
        return { kind: "ident", span, name: "~" } satisfies IdentExpr;
      }
      return { kind: "ident", span, name } satisfies IdentExpr;
    }

    // ---- Literals ----
    case "Literal": {
      const raw = node.raw as string ?? String(node.value);
      const value = node.value;
      if (typeof value === "number") {
        return { kind: "lit", span, raw, value, litType: "number" } satisfies LitExpr;
      }
      if (typeof value === "boolean") {
        return { kind: "lit", span, raw, value, litType: "bool" } satisfies LitExpr;
      }
      if (value === null) {
        return { kind: "lit", span, raw, value: null, litType: "null" } satisfies LitExpr;
      }
      if (typeof value === "string") {
        // Template literals that survived preprocessing are string literals
        const litType = raw && raw.startsWith("`") ? "template" : "string";
        return { kind: "lit", span, raw, value, litType } satisfies LitExpr;
      }
      // BigInt or other exotic literals
      return makeEscapeHatch(node, span, rawSource ?? String(node.value));
    }

    // ---- Template Literal (back-tick string with no live interpolation) ----
    case "TemplateLiteral": {
      const quasis = (node.quasis as ESNode[]) ?? [];
      if (quasis.length === 1) {
        const quasi = quasis[0];
        const cooked = (quasi as { value?: { cooked?: string } }).value?.cooked ?? "";
        const raw = "`" + cooked + "`";
        return { kind: "lit", span, raw, value: cooked, litType: "template" } satisfies LitExpr;
      }
      // Template literal with expressions — not yet structured
      return makeEscapeHatch(node, span, rawSource ?? "");
    }

    // ---- Unary ----
    case "UnaryExpression": {
      const op = node.operator as string;
      const argument = esTreeToExprNode(node.argument as ESNode, filePath, baseOffset);
      const validOps = ["!", "-", "+", "~", "typeof", "void", "delete", "await"];
      if (!validOps.includes(op)) return makeEscapeHatch(node, span, rawSource ?? "");
      return {
        kind: "unary", span,
        op: op as UnaryExpr["op"],
        argument,
        prefix: true,
      } satisfies UnaryExpr;
    }

    // ---- Update (prefix/postfix ++ / --) ----
    case "UpdateExpression": {
      const op = node.operator as string; // "++" or "--"
      const argument = esTreeToExprNode(node.argument as ESNode, filePath, baseOffset);
      return {
        kind: "unary", span,
        op: op as "++" | "--",
        argument,
        prefix: node.prefix as boolean,
      } satisfies UnaryExpr;
    }

    // ---- Await ----
    case "AwaitExpression": {
      const argument = esTreeToExprNode(node.argument as ESNode, filePath, baseOffset);
      return {
        kind: "unary", span,
        op: "await",
        argument,
        prefix: true,
      } satisfies UnaryExpr;
    }

    // ---- Binary ----
    case "BinaryExpression": {
      const op = node.operator as string;
      const left = esTreeToExprNode(node.left as ESNode, filePath, baseOffset);
      const right = esTreeToExprNode(node.right as ESNode, filePath, baseOffset);
      // All JS binary ops are valid in the BinaryExpr union
      return { kind: "binary", span, op: op as BinaryExpr["op"], left, right } satisfies BinaryExpr;
    }

    // ---- Logical (&&, ||, ??) ----
    case "LogicalExpression": {
      const op = node.operator as string;
      const left = esTreeToExprNode(node.left as ESNode, filePath, baseOffset);
      const right = esTreeToExprNode(node.right as ESNode, filePath, baseOffset);
      return { kind: "binary", span, op: op as BinaryExpr["op"], left, right } satisfies BinaryExpr;
    }

    // ---- Assignment ----
    case "AssignmentExpression": {
      const op = node.operator as string;
      const target = esTreeToExprNode(node.left as ESNode, filePath, baseOffset);
      const value = esTreeToExprNode(node.right as ESNode, filePath, baseOffset);
      return { kind: "assign", span, op: op as AssignExpr["op"], target, value } satisfies AssignExpr;
    }

    // ---- Ternary ----
    case "ConditionalExpression": {
      const condition = esTreeToExprNode(node.test as ESNode, filePath, baseOffset);
      const consequent = esTreeToExprNode(node.consequent as ESNode, filePath, baseOffset);
      const alternate = esTreeToExprNode(node.alternate as ESNode, filePath, baseOffset);
      return { kind: "ternary", span, condition, consequent, alternate } satisfies TernaryExpr;
    }

    // ---- Member Access ----
    case "MemberExpression": {
      const object = esTreeToExprNode(node.object as ESNode, filePath, baseOffset);
      const computed = node.computed as boolean;
      const optional = node.optional as boolean ?? false;

      if (computed) {
        // Computed access: expr[index]
        const index = esTreeToExprNode(node.property as ESNode, filePath, baseOffset);
        return { kind: "index", span, object, index, optional } satisfies IndexExpr;
      } else {
        // Static access: expr.prop
        const propNode = node.property as ESNode;
        const property = propNode.name as string ?? (propNode.value as string);
        return { kind: "member", span, object, property, optional } satisfies MemberExpr;
      }
    }

    // ---- Optional Chain wrapper (Acorn wraps optional chains) ----
    case "ChainExpression": {
      // Acorn wraps optional chain expressions in ChainExpression
      // Recurse on the inner expression
      return esTreeToExprNode(node.expression as ESNode, filePath, baseOffset, rawSource);
    }

    // ---- Call ----
    case "CallExpression": {
      const callee = node.callee as ESNode;
      const optional = node.optional as boolean ?? false;
      const rawArgs = (node.arguments as ESNode[]) ?? [];

      // Check for scrml placeholder calls
      if (callee.type === "Identifier") {
        const calleeName = callee.name as string;

        if (calleeName === "__scrml_is_not_not__") {
          const left = esTreeToExprNode(rawArgs[0] as ESNode, filePath, baseOffset);
          const nullNode: LitExpr = { kind: "lit", span, raw: "null", value: null, litType: "null" };
          return { kind: "binary", span, op: "is-not-not", left, right: nullNode } satisfies BinaryExpr;
        }
        if (calleeName === "__scrml_is_not__") {
          const left = esTreeToExprNode(rawArgs[0] as ESNode, filePath, baseOffset);
          const nullNode: LitExpr = { kind: "lit", span, raw: "null", value: null, litType: "null" };
          return { kind: "binary", span, op: "is-not", left, right: nullNode } satisfies BinaryExpr;
        }
        if (calleeName === "__scrml_is_some__") {
          const left = esTreeToExprNode(rawArgs[0] as ESNode, filePath, baseOffset);
          const nullNode: LitExpr = { kind: "lit", span, raw: "null", value: null, litType: "null" };
          return { kind: "binary", span, op: "is-some", left, right: nullNode } satisfies BinaryExpr;
        }
        if (calleeName === "__scrml_is_variant__") {
          const left = esTreeToExprNode(rawArgs[0] as ESNode, filePath, baseOffset);
          const variantLit = rawArgs[1] as ESNode;
          const variantName = variantLit.value as string ?? "";
          const right: IdentExpr = { kind: "ident", span, name: variantName };
          return { kind: "binary", span, op: "is", left, right } satisfies BinaryExpr;
        }
        if (calleeName === "__scrml_match__") {
          // First arg is subject, rest are arm strings
          const subject = esTreeToExprNode(rawArgs[0] as ESNode, filePath, baseOffset);
          const rawArmNodes = rawArgs.slice(1) as ESNode[];
          const rawArmsArr = rawArmNodes.map(a => a.value as string ?? "");
          return { kind: "match-expr", span, subject, rawArms: rawArmsArr } satisfies MatchExpr;
        }
      }

      // Normal call
      const calleeExpr = esTreeToExprNode(callee, filePath, baseOffset);
      const args = rawArgs.map(a => {
        if (a.type === "SpreadElement") {
          const arg = esTreeToExprNode((a as { argument: ESNode }).argument, filePath, baseOffset);
          return { kind: "spread" as const, span: spanFromEstree(a, filePath, baseOffset), argument: arg } satisfies SpreadExpr;
        }
        return esTreeToExprNode(a, filePath, baseOffset);
      });
      return { kind: "call", span, callee: calleeExpr, args, optional } satisfies CallExpr;
    }

    // ---- New ----
    case "NewExpression": {
      const calleeExpr = esTreeToExprNode(node.callee as ESNode, filePath, baseOffset);
      const rawArgs = (node.arguments as ESNode[]) ?? [];
      const args = rawArgs.map(a => {
        if (a.type === "SpreadElement") {
          const arg = esTreeToExprNode((a as { argument: ESNode }).argument, filePath, baseOffset);
          return { kind: "spread" as const, span: spanFromEstree(a, filePath, baseOffset), argument: arg } satisfies SpreadExpr;
        }
        return esTreeToExprNode(a, filePath, baseOffset);
      });
      return { kind: "new", span, callee: calleeExpr, args } satisfies NewExpr;
    }

    // ---- Array ----
    case "ArrayExpression": {
      const elements = ((node.elements as (ESNode | null)[]) ?? []).map(el => {
        if (!el) return { kind: "lit" as const, span, raw: "undefined", value: undefined as unknown as null, litType: "undefined" as const } satisfies LitExpr;
        if (el.type === "SpreadElement") {
          const arg = esTreeToExprNode((el as { argument: ESNode }).argument, filePath, baseOffset);
          return { kind: "spread" as const, span: spanFromEstree(el, filePath, baseOffset), argument: arg } satisfies SpreadExpr;
        }
        return esTreeToExprNode(el, filePath, baseOffset);
      });
      return { kind: "array", span, elements } satisfies ArrayExpr;
    }

    // ---- Object ----
    case "ObjectExpression": {
      const props: ObjectProp[] = ((node.properties as ESNode[]) ?? []).map(p => {
        const propSpan = spanFromEstree(p, filePath, baseOffset);
        if (p.type === "SpreadElement") {
          const arg = esTreeToExprNode((p as { argument: ESNode }).argument, filePath, baseOffset);
          return { kind: "spread" as const, argument: arg, span: propSpan } satisfies Extract<ObjectProp, { kind: "spread" }>;
        }
        // Property
        const keyNode = (p as { key: ESNode }).key;
        const computed = (p as { computed?: boolean }).computed ?? false;
        const shorthand = (p as { shorthand?: boolean }).shorthand ?? false;
        const valueNode = (p as { value: ESNode }).value;

        if (shorthand && keyNode.type === "Identifier") {
          return { kind: "shorthand" as const, name: keyNode.name as string, span: propSpan } satisfies Extract<ObjectProp, { kind: "shorthand" }>;
        }

        const key: string | ExprNode = computed
          ? esTreeToExprNode(keyNode, filePath, baseOffset)
          : (keyNode.name as string ?? keyNode.value as string ?? "");
        const value = esTreeToExprNode(valueNode, filePath, baseOffset);
        return { kind: "prop" as const, key, value, computed, span: propSpan } satisfies Extract<ObjectProp, { kind: "prop" }>;
      });
      return { kind: "object", span, props } satisfies ObjectExpr;
    }

    // ---- Arrow Function / Function Expression ----
    case "ArrowFunctionExpression":
    case "FunctionExpression": {
      const isAsync = node.async as boolean ?? false;
      const fnStyle: LambdaExpr["fnStyle"] =
        node.type === "ArrowFunctionExpression" ? "arrow" : "function";
      const params = convertParams((node.params as ESNode[]) ?? [], filePath, baseOffset);
      const bodyNode = node.body as ESNode;

      if (bodyNode.type !== "BlockStatement") {
        // Expression body: `x => expr`
        const value = esTreeToExprNode(bodyNode, filePath, baseOffset);
        return {
          kind: "lambda", span, params, isAsync, fnStyle,
          body: { kind: "expr", value },
        } satisfies LambdaExpr;
      }

      // Block body: we cannot fully convert block statements in Phase 1.
      // Convert to EscapeHatchExpr with the raw body text.
      return makeEscapeHatch(node, span, rawSource ?? "");
    }

    // ---- Sequence Expression (a, b, c) — not common but valid ----
    case "SequenceExpression": {
      // Model as nested binary with comma op — use EscapeHatch for now
      return makeEscapeHatch(node, span, rawSource ?? "");
    }

    // ---- Spread (in spread position, handled by parent; standalone is escape hatch) ----
    case "SpreadElement": {
      const argument = esTreeToExprNode((node as { argument: ESNode }).argument, filePath, baseOffset);
      return { kind: "spread", span, argument } satisfies SpreadExpr;
    }

    // ---- Parenthesized expression (Acorn doesn't emit a node for these — transparent) ----

    default: {
      // Unknown ESTree node type — emit escape hatch
      return makeEscapeHatch(node, span, rawSource ?? "");
    }
  }
}

/** Create an EscapeHatchExpr for an unsupported ESTree node type. */
function makeEscapeHatch(node: ESNode, span: ExprSpan, rawSource: string): EscapeHatchExpr {
  return {
    kind: "escape-hatch",
    span,
    estreeType: node.type,
    raw: rawSource,
  } satisfies EscapeHatchExpr;
}

/** Convert ESTree parameter nodes to LambdaParam[]. */
function convertParams(params: ESNode[], filePath: string, baseOffset: number): LambdaParam[] {
  return params.map(p => {
    if (p.type === "Identifier") {
      return { name: p.name as string };
    }
    if (p.type === "RestElement") {
      const arg = (p as { argument: ESNode }).argument;
      return { name: arg.name as string ?? "", isRest: true };
    }
    if (p.type === "AssignmentPattern") {
      const left = (p as { left: ESNode }).left;
      const right = (p as { right: ESNode }).right;
      const defaultValue = esTreeToExprNode(right, filePath, baseOffset);
      return { name: left.name as string ?? "", defaultValue };
    }
    // Destructured patterns — not yet structured
    return { name: "__destructured__" };
  });
}

// ---------------------------------------------------------------------------
// parseExprToNode — top-level entry point
// ---------------------------------------------------------------------------

/**
 * Parse a scrml expression string into a structured ExprNode.
 *
 * @param raw - The raw expression string (as produced by collectExpr / joinWithNewlines)
 * @param filePath - Absolute path of the source file (for span reporting)
 * @param offset - Byte offset of the expression start in the preprocessed source file
 * @returns A structured ExprNode. Returns EscapeHatchExpr on parse failure.
 */
export function parseExprToNode(raw: string, filePath: string, offset: number, opts?: { tildeActive?: boolean }): ExprNode {
  if (!raw || typeof raw !== "string" || !raw.trim()) {
    // Empty expression — return a null-literal placeholder
    const span: ExprSpan = { file: filePath, start: offset, end: offset, line: 1, col: 1 };
    return { kind: "lit", span, raw: "", value: null, litType: "null" } satisfies LitExpr;
  }

  const trimmed = raw.trim();

  // Apply scrml-specific preprocessing to convert `is`/`match` etc.
  let processed = trimmed;

  // Preprocessing for scrml-specific operators
  processed = preprocessForAcorn(processed, { tildeActive: opts?.tildeActive });

  // Standard parseExpression preprocessing (SQL, input-state, worker refs)
  // parseExpression already does this, but we also do it here so we can
  // pass the pre-processed string directly if needed.

  // Try to parse the processed expression
  let estree: ESNode | null = null;
  let parseError: string | null = null;

  try {
    const result = parseExpression(processed);
    estree = result.ast;
    parseError = result.error;
  } catch (e) {
    parseError = (e as Error).message;
  }

  if (!estree) {
    // Parse failed — return escape hatch
    const span: ExprSpan = { file: filePath, start: offset, end: offset + trimmed.length, line: 1, col: 1 };
    return {
      kind: "escape-hatch",
      span,
      estreeType: "ParseError",
      raw: trimmed,
    } satisfies EscapeHatchExpr;
  }

  try {
    return esTreeToExprNode(estree, filePath, offset, trimmed);
  } catch (e) {
    const span: ExprSpan = { file: filePath, start: offset, end: offset + trimmed.length, line: 1, col: 1 };
    return {
      kind: "escape-hatch",
      span,
      estreeType: "ConversionError",
      raw: trimmed,
    } satisfies EscapeHatchExpr;
  }
}

// ---------------------------------------------------------------------------
// emitStringFromTree — ExprNode → string (round-trip invariant check)
// ---------------------------------------------------------------------------
//
// Converts an ExprNode back to a token-joined string that should be equivalent
// to the original string-form field (modulo whitespace normalization).
//
// Whitespace normalization rule: collapse multiple spaces to single space, trim.
// This matches collectExpr's joinWithNewlines which adds spaces between tokens.
//
// Design doc §5.2: "the invariant check may fail on whitespace differences.
// Mitigation: normalize whitespace in the invariant check."
// ---------------------------------------------------------------------------

/**
 * Emit a string from an ExprNode tree.
 *
 * The result is equivalent to the original expression string modulo whitespace
 * normalization. Used for the Phase 1 round-trip invariant tests.
 *
 * @param node - The ExprNode to emit
 * @returns String representation of the expression
 */
export function emitStringFromTree(node: ExprNode): string {
  switch (node.kind) {
    case "ident":
      return node.name;

    case "lit": {
      if (node.litType === "not") return "not";
      if (node.litType === "null") return node.raw || "null";
      if (node.litType === "undefined") return "undefined";
      return node.raw;
    }

    case "array": {
      const elems = node.elements.map(e => emitStringFromTree(e as ExprNode)).join(", ");
      return `[${elems}]`;
    }

    case "object": {
      const props = node.props.map(p => {
        if (p.kind === "spread") return `...${emitStringFromTree(p.argument)}`;
        if (p.kind === "shorthand") return p.name;
        const keyStr = typeof p.key === "string"
          ? (p.computed ? `[${p.key}]` : p.key)
          : (p.computed ? `[${emitStringFromTree(p.key)}]` : emitStringFromTree(p.key));
        return `${keyStr}: ${emitStringFromTree(p.value)}`;
      });
      return `{${props.length > 0 ? " " + props.join(", ") + " " : ""}}`;
    }

    case "spread":
      return `...${emitStringFromTree(node.argument)}`;

    case "unary": {
      const arg = emitStringFromTree(node.argument);
      if (!node.prefix) return `${arg}${node.op}`;
      // Special keyword operators need a space
      const needsSpace = ["typeof", "void", "delete", "await"].includes(node.op);
      return needsSpace ? `${node.op} ${arg}` : `${node.op}${arg}`;
    }

    case "binary": {
      const left = emitStringFromTree(node.left);
      const right = emitStringFromTree(node.right);
      switch (node.op) {
        case "is": return `${left} is ${right}`;
        case "is-not": return `${left} is not`;
        case "is-some": return `${left} is some`;
        case "is-not-not": return `${left} is not not`;
        default: return `${left} ${node.op} ${right}`;
      }
    }

    case "assign": {
      const target = emitStringFromTree(node.target);
      const value = emitStringFromTree(node.value);
      return `${target} ${node.op} ${value}`;
    }

    case "ternary": {
      const cond = emitStringFromTree(node.condition);
      const cons = emitStringFromTree(node.consequent);
      const alt = emitStringFromTree(node.alternate);
      return `${cond} ? ${cons} : ${alt}`;
    }

    case "member": {
      const obj = emitStringFromTree(node.object);
      const sep = node.optional ? "?." : ".";
      return `${obj}${sep}${node.property}`;
    }

    case "index": {
      const obj = emitStringFromTree(node.object);
      const idx = emitStringFromTree(node.index);
      const sep = node.optional ? "?." : "";
      return `${obj}${sep}[${idx}]`;
    }

    case "call": {
      const callee = emitStringFromTree(node.callee);
      const args = node.args.map(a => emitStringFromTree(a as ExprNode)).join(", ");
      const sep = node.optional ? "?." : "";
      return `${callee}${sep}(${args})`;
    }

    case "new": {
      const callee = emitStringFromTree(node.callee);
      const args = node.args.map(a => emitStringFromTree(a as ExprNode)).join(", ");
      return `new ${callee}(${args})`;
    }

    case "lambda": {
      const params = node.params.map(p => {
        let s = p.isLin ? `lin ${p.name}` : p.name;
        if (p.typeAnnotation) s += `: ${p.typeAnnotation}`;
        if (p.defaultValue) s += ` = ${emitStringFromTree(p.defaultValue)}`;
        if (p.isRest) s = `...${p.name}`;
        return s;
      });
      const paramStr = params.length === 1 && !node.params[0].isRest ? params[0] : `(${params.join(", ")})`;

      if (node.body.kind === "expr") {
        let bodyStr = emitStringFromTree(node.body.value);
        // Arrow functions returning object literals need parentheses to avoid
        // ambiguity with block statements: `x => ({ a: 1 })` not `x => { a: 1 }`
        if (node.body.value.kind === "object") {
          bodyStr = `(${bodyStr})`;
        }
        if (node.fnStyle === "arrow") {
          return node.isAsync ? `async ${paramStr} => ${bodyStr}` : `${paramStr} => ${bodyStr}`;
        }
        // fn style — emit as arrow for Phase 1 round-trip
        return node.isAsync ? `async ${paramStr} => ${bodyStr}` : `${paramStr} => ${bodyStr}`;
      }

      // Block body — not fully structured in Phase 1, raw text unavailable
      // This path only reached if LambdaExpr with block body was somehow constructed;
      // in practice Phase 1 block bodies become EscapeHatchExpr.
      return "/* block body */";
    }

    case "cast":
      return `${emitStringFromTree(node.expression)} as ${node.targetType}`;

    case "match-expr": {
      const subject = emitStringFromTree(node.subject);
      const arms = node.rawArms.join(" ");
      return `match ${subject} { ${arms} }`;
    }

    case "sql-ref":
      return `?{ /* sql */ }`;

    case "input-state-ref":
      return `<#${node.name}>`;

    case "escape-hatch":
      // Emit verbatim — the escape hatch preserves the raw source
      return node.raw;

    default: {
      // Exhaustive check
      const _never: never = node;
      return "";
    }
  }
}

/**
 * Normalize whitespace in a string for round-trip invariant comparison.
 * Collapses multiple spaces/newlines to single space, trims.
 * This is the normalization function used by invariant tests.
 */
export function normalizeWhitespace(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

// ---------------------------------------------------------------------------
// deepEqualExprNode — structural equality for ExprNode trees
// ---------------------------------------------------------------------------
//
// Compares two ExprNode trees structurally, ignoring `span` fields.
// Spans are excluded because reparsed nodes start at offset 0 while the
// original nodes may have real source offsets — spans differ by design.
//
// This is the correct equivalence relation for the idempotency invariant:
//   parse(emit(node)) deepEquals node
//
// Escape-hatch nodes: compared by normalized raw string content.
// All other kinds: strict structural equality on non-span fields.
// ---------------------------------------------------------------------------

/**
 * Structural deep equality for ExprNode trees.
 * Ignores `span` fields on all nodes.
 * Escape-hatch nodes compare by whitespace-normalized `raw`.
 *
 * @returns true if a and b are structurally equal (ignoring spans).
 */
export function deepEqualExprNode(a: ExprNode, b: ExprNode): boolean {
  if (a.kind !== b.kind) return false;

  switch (a.kind) {
    case "ident": {
      const bNode = b as typeof a;
      return a.name === bNode.name;
    }

    case "lit": {
      const bNode = b as typeof a;
      if (a.litType !== bNode.litType) return false;
      // Compare raw for template literals; compare value for all others
      if (a.litType === "template") return a.raw === bNode.raw;
      // NaN != NaN in JS, but structurally equal
      if (typeof a.value === "number" && typeof bNode.value === "number") {
        if (isNaN(a.value) && isNaN(bNode.value)) return true;
      }
      return a.value === bNode.value;
    }

    case "array": {
      const bNode = b as typeof a;
      if (a.elements.length !== bNode.elements.length) return false;
      return a.elements.every((el, i) =>
        deepEqualExprNode(el as ExprNode, bNode.elements[i] as ExprNode)
      );
    }

    case "object": {
      const bNode = b as typeof a;
      if (a.props.length !== bNode.props.length) return false;
      return a.props.every((p, i) => {
        const q = bNode.props[i];
        if (p.kind !== q.kind) return false;
        if (p.kind === "spread" && q.kind === "spread") {
          return deepEqualExprNode(p.argument, q.argument);
        }
        if (p.kind === "shorthand" && q.kind === "shorthand") {
          return p.name === q.name;
        }
        if (p.kind === "prop" && q.kind === "prop") {
          if (p.computed !== q.computed) return false;
          const keysEqual = typeof p.key === "string" && typeof q.key === "string"
            ? p.key === q.key
            : typeof p.key === "object" && typeof q.key === "object"
              ? deepEqualExprNode(p.key, q.key)
              : false;
          return keysEqual && deepEqualExprNode(p.value, q.value);
        }
        return false;
      });
    }

    case "spread": {
      const bNode = b as typeof a;
      return deepEqualExprNode(a.argument, bNode.argument);
    }

    case "unary": {
      const bNode = b as typeof a;
      return a.op === bNode.op
        && a.prefix === bNode.prefix
        && deepEqualExprNode(a.argument, bNode.argument);
    }

    case "binary": {
      const bNode = b as typeof a;
      return a.op === bNode.op
        && deepEqualExprNode(a.left, bNode.left)
        && deepEqualExprNode(a.right, bNode.right);
    }

    case "assign": {
      const bNode = b as typeof a;
      return a.op === bNode.op
        && deepEqualExprNode(a.target, bNode.target)
        && deepEqualExprNode(a.value, bNode.value);
    }

    case "ternary": {
      const bNode = b as typeof a;
      return deepEqualExprNode(a.condition, bNode.condition)
        && deepEqualExprNode(a.consequent, bNode.consequent)
        && deepEqualExprNode(a.alternate, bNode.alternate);
    }

    case "member": {
      const bNode = b as typeof a;
      return a.property === bNode.property
        && a.optional === bNode.optional
        && deepEqualExprNode(a.object, bNode.object);
    }

    case "index": {
      const bNode = b as typeof a;
      return a.optional === bNode.optional
        && deepEqualExprNode(a.object, bNode.object)
        && deepEqualExprNode(a.index, bNode.index);
    }

    case "call": {
      const bNode = b as typeof a;
      if (a.optional !== bNode.optional) return false;
      if (a.args.length !== bNode.args.length) return false;
      return deepEqualExprNode(a.callee, bNode.callee)
        && a.args.every((arg, i) =>
          deepEqualExprNode(arg as ExprNode, bNode.args[i] as ExprNode)
        );
    }

    case "new": {
      const bNode = b as typeof a;
      if (a.args.length !== bNode.args.length) return false;
      return deepEqualExprNode(a.callee, bNode.callee)
        && a.args.every((arg, i) =>
          deepEqualExprNode(arg as ExprNode, bNode.args[i] as ExprNode)
        );
    }

    case "lambda": {
      const bNode = b as typeof a;
      if (a.fnStyle !== bNode.fnStyle) return false;
      if (a.isAsync !== bNode.isAsync) return false;
      if (a.params.length !== bNode.params.length) return false;
      const paramsEqual = a.params.every((p, i) => {
        const q = bNode.params[i];
        if (p.name !== q.name) return false;
        if ((p.isRest ?? false) !== (q.isRest ?? false)) return false;
        if ((p.isLin ?? false) !== (q.isLin ?? false)) return false;
        if ((p.typeAnnotation ?? "") !== (q.typeAnnotation ?? "")) return false;
        if (p.defaultValue && q.defaultValue) {
          return deepEqualExprNode(p.defaultValue, q.defaultValue);
        }
        return !p.defaultValue && !q.defaultValue;
      });
      if (!paramsEqual) return false;
      if (a.body.kind !== bNode.body.kind) return false;
      if (a.body.kind === "expr" && bNode.body.kind === "expr") {
        return deepEqualExprNode(a.body.value, bNode.body.value);
      }
      // Block bodies: compare by statement count — Phase 1 doesn't structure them
      if (a.body.kind === "block" && bNode.body.kind === "block") {
        return a.body.stmts.length === bNode.body.stmts.length;
      }
      return false;
    }

    case "cast": {
      const bNode = b as typeof a;
      return a.targetType === bNode.targetType
        && deepEqualExprNode(a.expression, bNode.expression);
    }

    case "match-expr": {
      const bNode = b as typeof a;
      if (!deepEqualExprNode(a.subject, bNode.subject)) return false;
      // rawArms is a raw-string format whose element count depends on
      // how the source was line-wrapped (arm splitter is newline-based).
      // After emit+reparse, all arms may be joined into fewer elements.
      // Compare by normalizing: join all arms, collapse whitespace, compare.
      const aArmsNorm = normalizeWhitespace(a.rawArms.join(" "));
      const bArmsNorm = normalizeWhitespace(bNode.rawArms.join(" "));
      return aArmsNorm === bArmsNorm;
    }

    case "sql-ref": {
      // SQL refs: both sides are placeholders; nodeId may differ in reparse
      // (nodeId is -1 for parsed refs) — compare as equal if both are sql-ref
      return true;
    }

    case "input-state-ref": {
      const bNode = b as typeof a;
      return a.name === bNode.name;
    }

    case "escape-hatch": {
      const bNode = b as typeof a;
      // Escape-hatch: compare by whitespace-normalized raw content
      return normalizeWhitespace(a.raw) === normalizeWhitespace(bNode.raw);
    }

    default: {
      const _never: never = a;
      return false;
    }
  }
}

// ---------------------------------------------------------------------------
// forEachIdentInExprNode — walk ExprNode tree and invoke callback on every IdentExpr
// ---------------------------------------------------------------------------
//
// Used by the lin type system (checkLinear) to find identifier references
// inside structured expression trees, replacing the string-regex approach.
//
// Semantics:
// - Every IdentExpr node encountered triggers the callback with that node.
// - LambdaExpr: the body is NOT descended into — lambdas create a new lin scope.
//   Capture tracking (when a lambda closes over a lin var) is handled separately
//   by the `case "closure"` handler in type-system.ts walkNode.
//   Phase 2 decision: skip lambda bodies conservatively. Future slice can add
//   capture-based lin consumption here if needed.
// - EscapeHatchExpr: skipped — opaque content, no identifier extraction possible.
// - SqlRefExpr, InputStateRefExpr: no sub-expressions to walk.
// - MemberExpr: object is walked (the base of `obj.prop`), but `property: string`
//   is NOT an IdentExpr — it is a static property name, not a binding reference.
//   IndexExpr: both object and index are walked.
// ---------------------------------------------------------------------------

/**
 * Walk an ExprNode tree recursively and invoke `callback` for every IdentExpr found.
 *
 * The callback receives the IdentExpr node (including its span).
 * The walk does NOT descend into LambdaExpr bodies (new lin scope boundary).
 * The walk does NOT descend into EscapeHatchExpr (opaque).
 *
 * @param node - Root ExprNode to walk
 * @param callback - Called once per IdentExpr encountered
 */
export function forEachIdentInExprNode(
  node: ExprNode,
  callback: (ident: IdentExpr) => void,
): void {
  if (!node) return;

  switch (node.kind) {
    case "ident": {
      callback(node as IdentExpr);
      return;
    }

    case "lit":
    case "sql-ref":
    case "input-state-ref":
    case "escape-hatch": {
      // Leaf nodes with no sub-expressions. Nothing to walk.
      return;
    }

    case "array": {
      const n = node as ArrayExpr;
      for (const el of n.elements) {
        forEachIdentInExprNode(el as ExprNode, callback);
      }
      return;
    }

    case "object": {
      const n = node as ObjectExpr;
      for (const prop of n.props) {
        if (prop.kind === "prop") {
          // key may be computed (ExprNode) or static (string)
          if (typeof prop.key !== "string") {
            forEachIdentInExprNode(prop.key as ExprNode, callback);
          }
          forEachIdentInExprNode(prop.value, callback);
        } else if (prop.kind === "shorthand") {
          // shorthand: `{ x }` — x is both key and value reference.
          // The name is a binding reference, so emit a synthetic IdentExpr call.
          // We can't call callback with the full prop object, so we skip:
          // shorthand properties are value reads of the identifier.
          // Represent as an IdentExpr with the prop's span.
          callback({ kind: "ident", name: prop.name, span: prop.span } as IdentExpr);
        } else if (prop.kind === "spread") {
          forEachIdentInExprNode(prop.argument, callback);
        }
      }
      return;
    }

    case "spread": {
      const n = node as SpreadExpr;
      forEachIdentInExprNode(n.argument, callback);
      return;
    }

    case "unary": {
      const n = node as UnaryExpr;
      forEachIdentInExprNode(n.argument, callback);
      return;
    }

    case "binary": {
      const n = node as BinaryExpr;
      forEachIdentInExprNode(n.left, callback);
      forEachIdentInExprNode(n.right, callback);
      return;
    }

    case "assign": {
      const n = node as AssignExpr;
      forEachIdentInExprNode(n.target, callback);
      forEachIdentInExprNode(n.value, callback);
      return;
    }

    case "ternary": {
      const n = node as TernaryExpr;
      forEachIdentInExprNode(n.condition, callback);
      forEachIdentInExprNode(n.consequent, callback);
      forEachIdentInExprNode(n.alternate, callback);
      return;
    }

    case "member": {
      const n = node as MemberExpr;
      // Walk the object (the base) but NOT property (it is a static name string).
      forEachIdentInExprNode(n.object, callback);
      return;
    }

    case "index": {
      const n = node as IndexExpr;
      forEachIdentInExprNode(n.object, callback);
      forEachIdentInExprNode(n.index, callback);
      return;
    }

    case "call": {
      const n = node as CallExpr;
      forEachIdentInExprNode(n.callee, callback);
      for (const arg of n.args) {
        forEachIdentInExprNode(arg as ExprNode, callback);
      }
      return;
    }

    case "new": {
      const n = node as NewExpr;
      forEachIdentInExprNode(n.callee, callback);
      for (const arg of n.args) {
        forEachIdentInExprNode(arg as ExprNode, callback);
      }
      return;
    }

    case "lambda": {
      // Do NOT descend into the lambda body — new lin scope boundary.
      // Phase 2 decision: capture tracking is handled by the `case "closure"`
      // handler in checkLinear, which reads the `captures` string array on the
      // AST-level closure node. The ExprNode lambda body is a new scope.
      //
      // LambdaParam.defaultValue is an ExprNode and is in the OUTER scope
      // (evaluated before entering the lambda). Walk default values.
      const n = node as LambdaExpr;
      for (const param of n.params) {
        if (param.defaultValue) {
          forEachIdentInExprNode(param.defaultValue, callback);
        }
      }
      return;
    }

    case "cast": {
      const n = node as CastExpr;
      forEachIdentInExprNode(n.expression, callback);
      return;
    }

    case "match-expr": {
      const n = node as MatchExpr;
      // Walk the subject expression. Arms are raw strings (Phase 1) — cannot walk.
      forEachIdentInExprNode(n.subject, callback);
      return;
    }

    default: {
      // TypeScript exhaustiveness check. If this fires, a new ExprNode kind was
      // added without updating this function. Stop-and-report trigger per spec.
      const _never: never = node;
      return;
    }
  }
}

// ---------------------------------------------------------------------------
// Phase 4d Slice 2 — ExprNode walker utilities
// ---------------------------------------------------------------------------
//
// Structured replacements for string-regex analysis. Each helper walks the
// ExprNode tree and answers a specific question about its contents, replacing
// ad-hoc string patterns like extractCalleesFromExpr, LIFT_CALL_RE,
// /@[A-Za-z]/ regex, extractInitLiteral, etc.
//
// All helpers skip LambdaExpr bodies (scope boundary) and EscapeHatchExpr
// (opaque), matching forEachIdentInExprNode semantics.
// ---------------------------------------------------------------------------

/**
 * Walk an ExprNode tree and return true if it contains a CallExpr.
 * If `calleeName` is provided, only matches calls where the callee is an
 * IdentExpr with that exact name (e.g. "lift", "emit", "navigate").
 *
 * Replaces: `extractCalleesFromExpr`, `LIFT_CALL_RE`, `includes("(")` checks.
 */
export function exprNodeContainsCall(node: ExprNode, calleeName?: string): boolean {
  if (!node) return false;
  switch (node.kind) {
    case "call": {
      const n = node as CallExpr;
      if (!calleeName) return true;
      if (n.callee.kind === "ident" && (n.callee as IdentExpr).name === calleeName) return true;
      // Check args and callee recursively for nested calls
      if (exprNodeContainsCall(n.callee, calleeName)) return true;
      for (const arg of n.args) {
        if (exprNodeContainsCall(arg as ExprNode, calleeName)) return true;
      }
      return false;
    }
    case "new": {
      const n = node as NewExpr;
      if (exprNodeContainsCall(n.callee, calleeName)) return true;
      for (const arg of n.args) {
        if (exprNodeContainsCall(arg as ExprNode, calleeName)) return true;
      }
      return false;
    }
    case "ident": case "lit": case "sql-ref": case "input-state-ref": case "escape-hatch":
      return false;
    case "array": {
      const n = node as ArrayExpr;
      return n.elements.some(el => exprNodeContainsCall(el as ExprNode, calleeName));
    }
    case "object": {
      const n = node as ObjectExpr;
      return n.props.some(p =>
        (p.kind === "prop" && (typeof p.key !== "string" ? exprNodeContainsCall(p.key as ExprNode, calleeName) : false) || (p.kind === "prop" && exprNodeContainsCall(p.value, calleeName))) ||
        (p.kind === "spread" && exprNodeContainsCall(p.argument, calleeName))
      );
    }
    case "spread": return exprNodeContainsCall((node as SpreadExpr).argument, calleeName);
    case "unary": return exprNodeContainsCall((node as UnaryExpr).argument, calleeName);
    case "binary": return exprNodeContainsCall((node as BinaryExpr).left, calleeName) || exprNodeContainsCall((node as BinaryExpr).right, calleeName);
    case "assign": return exprNodeContainsCall((node as AssignExpr).target, calleeName) || exprNodeContainsCall((node as AssignExpr).value, calleeName);
    case "ternary": {
      const n = node as TernaryExpr;
      return exprNodeContainsCall(n.condition, calleeName) || exprNodeContainsCall(n.consequent, calleeName) || exprNodeContainsCall(n.alternate, calleeName);
    }
    case "member": return exprNodeContainsCall((node as MemberExpr).object, calleeName);
    case "index": return exprNodeContainsCall((node as IndexExpr).object, calleeName) || exprNodeContainsCall((node as IndexExpr).index, calleeName);
    case "lambda": return false; // scope boundary
    case "cast": return exprNodeContainsCall((node as CastExpr).expression, calleeName);
    case "match-expr": return exprNodeContainsCall((node as MatchExpr).subject, calleeName);
    default: { const _never: never = node; return false; }
  }
}

/**
 * Collect all callee names from CallExpr nodes in the tree.
 * Only captures direct IdentExpr callees (e.g. `foo(...)` → "foo").
 * Member-access calls like `obj.method()` are not captured.
 *
 * Replaces: `extractCalleesFromExpr` (regex-based callee extraction).
 */
export function exprNodeCollectCallees(node: ExprNode): string[] {
  const names: string[] = [];
  if (!node) return names;
  forEachCallInExprNode(node, (call) => {
    if (call.callee.kind === "ident") {
      names.push((call.callee as IdentExpr).name);
    }
  });
  return names;
}

/** Walk an ExprNode tree and invoke callback on every CallExpr. */
function forEachCallInExprNode(node: ExprNode, cb: (call: CallExpr) => void): void {
  if (!node) return;
  switch (node.kind) {
    case "call": {
      const n = node as CallExpr;
      cb(n);
      forEachCallInExprNode(n.callee, cb);
      for (const a of n.args) forEachCallInExprNode(a as ExprNode, cb);
      return;
    }
    case "new": {
      const n = node as NewExpr;
      forEachCallInExprNode(n.callee, cb);
      for (const a of n.args) forEachCallInExprNode(a as ExprNode, cb);
      return;
    }
    case "ident": case "lit": case "sql-ref": case "input-state-ref": case "escape-hatch": return;
    case "array": { for (const el of (node as ArrayExpr).elements) forEachCallInExprNode(el as ExprNode, cb); return; }
    case "object": {
      for (const p of (node as ObjectExpr).props) {
        if (p.kind === "prop") { if (typeof p.key !== "string") forEachCallInExprNode(p.key as ExprNode, cb); forEachCallInExprNode(p.value, cb); }
        else if (p.kind === "spread") forEachCallInExprNode(p.argument, cb);
      }
      return;
    }
    case "spread": forEachCallInExprNode((node as SpreadExpr).argument, cb); return;
    case "unary": forEachCallInExprNode((node as UnaryExpr).argument, cb); return;
    case "binary": { const n = node as BinaryExpr; forEachCallInExprNode(n.left, cb); forEachCallInExprNode(n.right, cb); return; }
    case "assign": { const n = node as AssignExpr; forEachCallInExprNode(n.target, cb); forEachCallInExprNode(n.value, cb); return; }
    case "ternary": { const n = node as TernaryExpr; forEachCallInExprNode(n.condition, cb); forEachCallInExprNode(n.consequent, cb); forEachCallInExprNode(n.alternate, cb); return; }
    case "member": forEachCallInExprNode((node as MemberExpr).object, cb); return;
    case "index": { const n = node as IndexExpr; forEachCallInExprNode(n.object, cb); forEachCallInExprNode(n.index, cb); return; }
    case "lambda": return;
    case "cast": forEachCallInExprNode((node as CastExpr).expression, cb); return;
    case "match-expr": forEachCallInExprNode((node as MatchExpr).subject, cb); return;
    default: { const _never: never = node; return; }
  }
}

/**
 * Return true if the ExprNode tree contains any IdentExpr whose name
 * starts with `@` (reactive variable reference).
 *
 * Replaces: `/@[A-Za-z_$]/` regex on expression strings.
 */
export function exprNodeContainsReactiveRef(node: ExprNode): boolean {
  if (!node) return false;
  let found = false;
  forEachIdentInExprNode(node, (ident) => {
    if (!found && ident.name.startsWith("@")) found = true;
  });
  return found;
}

/**
 * Return true if the ExprNode tree contains an AssignExpr.
 *
 * Replaces: assignment-in-condition detection via string regex.
 */
export function exprNodeContainsAssignment(node: ExprNode): boolean {
  if (!node) return false;
  switch (node.kind) {
    case "assign": return true;
    case "ident": case "lit": case "sql-ref": case "input-state-ref": case "escape-hatch": return false;
    case "array": return (node as ArrayExpr).elements.some(el => exprNodeContainsAssignment(el as ExprNode));
    case "object": return (node as ObjectExpr).props.some(p =>
      (p.kind === "prop" && ((typeof p.key !== "string" && exprNodeContainsAssignment(p.key as ExprNode)) || exprNodeContainsAssignment(p.value))) ||
      (p.kind === "spread" && exprNodeContainsAssignment(p.argument))
    );
    case "spread": return exprNodeContainsAssignment((node as SpreadExpr).argument);
    case "unary": return exprNodeContainsAssignment((node as UnaryExpr).argument);
    case "binary": return exprNodeContainsAssignment((node as BinaryExpr).left) || exprNodeContainsAssignment((node as BinaryExpr).right);
    case "ternary": {
      const n = node as TernaryExpr;
      return exprNodeContainsAssignment(n.condition) || exprNodeContainsAssignment(n.consequent) || exprNodeContainsAssignment(n.alternate);
    }
    case "member": return exprNodeContainsAssignment((node as MemberExpr).object);
    case "index": return exprNodeContainsAssignment((node as IndexExpr).object) || exprNodeContainsAssignment((node as IndexExpr).index);
    case "call": {
      const n = node as CallExpr;
      return exprNodeContainsAssignment(n.callee) || n.args.some(a => exprNodeContainsAssignment(a as ExprNode));
    }
    case "new": {
      const n = node as NewExpr;
      return exprNodeContainsAssignment(n.callee) || n.args.some(a => exprNodeContainsAssignment(a as ExprNode));
    }
    case "lambda": return false;
    case "cast": return exprNodeContainsAssignment((node as CastExpr).expression);
    case "match-expr": return exprNodeContainsAssignment((node as MatchExpr).subject);
    default: { const _never: never = node; return false; }
  }
}

/**
 * Return true if the ExprNode tree contains a MemberExpr accessing any of
 * the specified property names on an IdentExpr base.
 * E.g. `exprNodeContainsMemberAccess(node, ["innerHTML", "textContent"])`.
 *
 * Replaces: DOM manipulation detection via string regex.
 */
export function exprNodeContainsMemberAccess(node: ExprNode, props: string[]): boolean {
  if (!node || props.length === 0) return false;
  switch (node.kind) {
    case "member": {
      const n = node as MemberExpr;
      if (props.includes(n.property)) return true;
      return exprNodeContainsMemberAccess(n.object, props);
    }
    case "ident": case "lit": case "sql-ref": case "input-state-ref": case "escape-hatch": return false;
    case "array": return (node as ArrayExpr).elements.some(el => exprNodeContainsMemberAccess(el as ExprNode, props));
    case "object": return (node as ObjectExpr).props.some(p =>
      (p.kind === "prop" && ((typeof p.key !== "string" && exprNodeContainsMemberAccess(p.key as ExprNode, props)) || exprNodeContainsMemberAccess(p.value, props))) ||
      (p.kind === "spread" && exprNodeContainsMemberAccess(p.argument, props))
    );
    case "spread": return exprNodeContainsMemberAccess((node as SpreadExpr).argument, props);
    case "unary": return exprNodeContainsMemberAccess((node as UnaryExpr).argument, props);
    case "binary": return exprNodeContainsMemberAccess((node as BinaryExpr).left, props) || exprNodeContainsMemberAccess((node as BinaryExpr).right, props);
    case "assign": return exprNodeContainsMemberAccess((node as AssignExpr).target, props) || exprNodeContainsMemberAccess((node as AssignExpr).value, props);
    case "ternary": {
      const n = node as TernaryExpr;
      return exprNodeContainsMemberAccess(n.condition, props) || exprNodeContainsMemberAccess(n.consequent, props) || exprNodeContainsMemberAccess(n.alternate, props);
    }
    case "index": return exprNodeContainsMemberAccess((node as IndexExpr).object, props) || exprNodeContainsMemberAccess((node as IndexExpr).index, props);
    case "call": {
      const n = node as CallExpr;
      return exprNodeContainsMemberAccess(n.callee, props) || n.args.some(a => exprNodeContainsMemberAccess(a as ExprNode, props));
    }
    case "new": {
      const n = node as NewExpr;
      return exprNodeContainsMemberAccess(n.callee, props) || n.args.some(a => exprNodeContainsMemberAccess(a as ExprNode, props));
    }
    case "lambda": return false;
    case "cast": return exprNodeContainsMemberAccess((node as CastExpr).expression, props);
    case "match-expr": return exprNodeContainsMemberAccess((node as MatchExpr).subject, props);
    default: { const _never: never = node; return false; }
  }
}

/**
 * Return true if the ExprNode is a single IdentExpr matching `name`,
 * or contains a top-level reference to it.
 * When `exact` is true (default), only matches if the root node is that ident.
 *
 * Replaces: `=== "children"`, `=== "..."`, linear var reference checks on strings.
 */
export function exprNodeMatchesIdent(node: ExprNode, name: string, exact: boolean = true): boolean {
  if (!node) return false;
  if (exact) {
    return node.kind === "ident" && (node as IdentExpr).name === name;
  }
  // Non-exact: search the whole tree for any ident with this name
  let found = false;
  forEachIdentInExprNode(node, (ident) => {
    if (!found && ident.name === name) found = true;
  });
  return found;
}

/**
 * Classify a literal ExprNode into a SourceInfo-compatible shape.
 * Returns the kind of literal and its value for type inference.
 *
 * Replaces: `extractInitLiteral` (regex parsing of string values).
 */
export function classifyLiteralFromExprNode(node: ExprNode): { kind: "literal"; value: string | number } | { kind: "arithmetic" } | { kind: "unconstrained" } {
  if (!node) return { kind: "unconstrained" };

  switch (node.kind) {
    case "lit": {
      const n = node as LitExpr;
      if (n.litType === "number" && typeof n.value === "number") {
        return { kind: "literal", value: n.value };
      }
      if (n.litType === "string" && typeof n.value === "string") {
        return { kind: "literal", value: n.value };
      }
      return { kind: "unconstrained" };
    }

    case "unary": {
      // Negative numeric literal: `-42`
      const n = node as UnaryExpr;
      if (n.op === "-" && n.prefix && n.argument.kind === "lit") {
        const lit = n.argument as LitExpr;
        if (lit.litType === "number" && typeof lit.value === "number") {
          return { kind: "literal", value: -lit.value };
        }
      }
      return { kind: "unconstrained" };
    }

    case "binary": {
      const n = node as BinaryExpr;
      if (n.op === "+" || n.op === "-" || n.op === "*" || n.op === "/" || n.op === "%") {
        return { kind: "arithmetic" };
      }
      return { kind: "unconstrained" };
    }

    default:
      return { kind: "unconstrained" };
  }
}
