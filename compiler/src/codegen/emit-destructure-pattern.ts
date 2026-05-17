/**
 * emit-destructure-pattern.ts — A5 (2026-05-17)
 *
 * Helpers for serializing structured DestructurePattern AST nodes back to
 * JavaScript source text. Used by emit-logic.ts (let/const decls) and
 * emit-control-flow.ts (for-stmt headers) when the LHS is a destructuring
 * pattern rather than a bare identifier.
 *
 * The structured form lives on `let-decl.name`, `const-decl.name`, and
 * `for-stmt.variable` since A5 retired A1's regex-based text extractor.
 * Codegen still needs flat JS LHS text — that's what these helpers produce.
 */

import type { DestructurePattern, DestructureArrayElement, DestructureObjectProperty } from "../types/ast.ts";

export function isDestructurePattern(v: unknown): v is DestructurePattern {
  if (!v || typeof v !== "object") return false;
  const k = (v as { kind?: unknown }).kind;
  return k === "destructure-array" || k === "destructure-object";
}

/**
 * Render a DestructurePattern back to JavaScript source text suitable for
 * use as a destructuring LHS. Pure serialization — no semantic transforms.
 *
 * Examples:
 *   { kind: "destructure-array", elements: [{kind:"name", name:"a"}, {kind:"name", name:"b"}] }
 *     → "[a, b]"
 *   { kind: "destructure-object", properties: [{kind:"name", fieldName:"a", bindName:"a"}, {kind:"name", fieldName:"b", bindName:"ren"}] }
 *     → "{ a, b: ren }"
 *   { kind: "destructure-array", elements: [{kind:"hole"}, {kind:"name", name:"b"}] }
 *     → "[, b]"
 */
export function emitDestructurePatternText(p: DestructurePattern): string {
  if (p.kind === "destructure-array") {
    const parts: string[] = [];
    for (const el of p.elements) {
      parts.push(emitArrayElement(el));
    }
    if (p.rest) parts.push(`...${p.rest}`);
    return `[${parts.join(", ")}]`;
  } else {
    const parts: string[] = [];
    for (const prop of p.properties) {
      parts.push(emitObjectProperty(prop));
    }
    if (p.rest) parts.push(`...${p.rest}`);
    return `{ ${parts.join(", ")} }`;
  }
}

function emitArrayElement(el: DestructureArrayElement): string {
  if (el.kind === "hole") return "";
  if (el.kind === "name") {
    const def = el.default ? ` = ${el.default}` : "";
    return `${el.name}${def}`;
  }
  // nested
  const def = el.default ? ` = ${el.default}` : "";
  return `${emitDestructurePatternText(el.pattern)}${def}`;
}

function emitObjectProperty(prop: DestructureObjectProperty): string {
  if (prop.kind === "nested") {
    const def = prop.default ? ` = ${prop.default}` : "";
    return `${prop.fieldName}: ${emitDestructurePatternText(prop.pattern)}${def}`;
  }
  // name
  const def = prop.default ? ` = ${prop.default}` : "";
  if (prop.fieldName === prop.bindName) {
    return `${prop.bindName}${def}`;
  }
  return `${prop.fieldName}: ${prop.bindName}${def}`;
}

/**
 * Convenience: if `name` is a string, return it; if it's a DestructurePattern,
 * serialize it. Used by the let-decl / const-decl code paths that take
 * `node.name` (which is now string | DestructurePattern since A5).
 */
export function nameOrPatternText(name: unknown): string {
  if (typeof name === "string") return name;
  if (isDestructurePattern(name)) return emitDestructurePatternText(name);
  return "";
}
