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
