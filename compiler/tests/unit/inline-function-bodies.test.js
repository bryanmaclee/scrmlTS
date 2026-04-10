/**
 * Inline Function Bodies — Unit Tests
 *
 * Tests for rewriteInlineFunctionBodies() in src/codegen/rewrite.js
 *
 * Verifies that function callback bodies with multiple statements
 * get proper semicolons inserted, including nested blocks (if/for/while).
 *
 * R11 blocker: .filter(function(c) { if (c.id === cardId) { card = c return false } return true })
 * produced invalid JS because `card = c return false` had no semicolons.
 */

import { describe, test, expect } from "bun:test";
import { rewriteInlineFunctionBodies } from "../../src/codegen/rewrite.js";

describe("rewriteInlineFunctionBodies", () => {
  test("§1 single statement body unchanged", () => {
    const input = `function(x) { return x }`;
    const result = rewriteInlineFunctionBodies(input);
    expect(result).toContain("return x");
    // Should not break single-statement bodies
    expect(result).not.toContain(";;");
  });

  test("§2 multi-statement body gets semicolons", () => {
    const input = `function(x) { x = 1 return x }`;
    const result = rewriteInlineFunctionBodies(input);
    expect(result).toContain("x = 1;");
    expect(result).toContain("return x");
  });

  test("§3 nested if block with multi-statement body (R11 blocker)", () => {
    const input = `function(c) { if (c.id === cardId) { card = c return false } return true }`;
    const result = rewriteInlineFunctionBodies(input);
    // The inner block { card = c return false } must have semicolons
    expect(result).toContain("card = c;");
    expect(result).toContain("return false");
    // The outer body should separate the if block from the trailing return
    expect(result).toContain("return true");
    // The result should be valid JS (no "card = c return false" without semicolons)
    expect(result).not.toMatch(/card = c\s+return/);
  });

  test("§4 already-formatted body passes through", () => {
    const input = `function(x) { x = 1; return x; }`;
    const result = rewriteInlineFunctionBodies(input);
    expect(result).toContain("x = 1;");
    expect(result).toContain("return x;");
  });

  test("§5 nested function bodies are handled", () => {
    const input = `arr.map(function(x) { arr2.filter(function(y) { y = x return y }) return x })`;
    const result = rewriteInlineFunctionBodies(input);
    // Inner function body should have semicolons
    expect(result).toContain("y = x;");
    expect(result).toContain("return y");
    // Outer function body should have semicolons
    expect(result).toMatch(/\)\s*;?\s*return x/);
  });

  test("§6 filter callback with if + return (exact kanban pattern)", () => {
    const input = `.filter(function(c) { if (c.id === cardId) { card = c return false } return true })`;
    const result = rewriteInlineFunctionBodies(input);
    // Must produce valid JS
    expect(result).not.toMatch(/card = c\s+return/);
    expect(result).toContain("card = c;");
  });

  test("§7 empty body unchanged", () => {
    const input = `function() { }`;
    const result = rewriteInlineFunctionBodies(input);
    expect(result).toBe(`function() {  }`);
  });

  test("§8 body with string literals containing braces", () => {
    const input = `function(x) { let s = "{}" return s }`;
    const result = rewriteInlineFunctionBodies(input);
    // Should not be confused by braces inside string literals
    expect(result).toContain('"{}"');
  });
});
