/**
 * Expression Parser — Unit Tests (Restructure Phase 1)
 *
 * Tests for src/expression-parser.ts.
 *
 * Coverage:
 *   §1  parseExpression — simple arithmetic
 *   §2  parseExpression — @reactive variable
 *   §3  parseExpression — function call
 *   §4  parseExpression — member expression
 *   §5  parseExpression — error handling (tolerant mode)
 *   §6  parseStatements — multi-statement body
 *   §7  extractIdentifiersFromAST — basic identifiers
 *   §8  extractIdentifiersFromAST — excludes property accesses
 *   §9  extractIdentifiersFromAST — excludes object keys
 *   §10 extractIdentifiersFromAST — excludes function params
 *   §11 extractIdentifiersFromAST — excludes for-of iterators
 *   §12 extractReactiveDepsFromAST — finds @vars
 *   §13 extractReactiveDepsFromAST — skips @vars in property position
 *   §14 extractReactiveDepsFromAST — filters by knownReactiveVars
 *   §15 parseExpression — enum ::Variant becomes string
 *   §16 extractIdentifiersFromAST — arrow function params excluded
 *   §17 extractIdentifiersFromAST — handles forEach callback pattern
 */

import { describe, test, expect } from "bun:test";
import {
  parseExpression,
  parseStatements,
  walk,
  extractIdentifiersFromAST,
  extractReactiveDepsFromAST,
} from "../../src/expression-parser.ts";

describe("parseExpression", () => {
  test("§1 simple arithmetic", () => {
    const { ast, error } = parseExpression("2 + 2");
    expect(error).toBeNull();
    expect(ast.type).toBe("BinaryExpression");
    expect(ast.operator).toBe("+");
  });

  test("§2 @reactive variable", () => {
    const { ast, error } = parseExpression("@count + 1");
    expect(error).toBeNull();
    expect(ast.type).toBe("BinaryExpression");
    expect(ast.left.type).toBe("Identifier");
    expect(ast.left.name).toBe("@count");
  });

  test("§3 function call", () => {
    const { ast } = parseExpression("handleClick(item.id)");
    expect(ast.type).toBe("CallExpression");
    expect(ast.callee.name).toBe("handleClick");
    expect(ast.arguments[0].type).toBe("MemberExpression");
  });

  test("§4 member expression", () => {
    const { ast } = parseExpression("obj.prop.nested");
    expect(ast.type).toBe("MemberExpression");
  });

  test("§5 error handling (tolerant)", () => {
    const { ast, error } = parseExpression("{{invalid}}");
    expect(ast).toBeNull();
    expect(error).toBeTruthy();
  });

  test("§15 enum ::Variant becomes string literal", () => {
    const { ast } = parseExpression('"Active"');
    expect(ast.type).toBe("Literal");
    expect(ast.value).toBe("Active");
  });
});

describe("parseStatements", () => {
  test("§6 multi-statement body", () => {
    const { ast, error } = parseStatements("let x = 1; const y = x + 2;");
    expect(error).toBeNull();
    expect(ast.type).toBe("Program");
    expect(ast.body.length).toBe(2);
    expect(ast.body[0].type).toBe("VariableDeclaration");
    expect(ast.body[1].type).toBe("VariableDeclaration");
  });

  test("§6b <#name>.send() worker ref does not break parsing", () => {
    const { ast, error } = parseStatements("<#calc>.send(5);");
    expect(error).toBeNull();
    expect(ast).not.toBeNull();
  });

  test("§6c <#name>.send() with await does not break parsing", () => {
    const { ast, error } = parseStatements("const result = await <#calc>.send(data);");
    expect(error).toBeNull();
    expect(ast).not.toBeNull();
  });

  test("§6d <#name> input state ref still works", () => {
    const { ast, error } = parseStatements("let val = <#keyboard>;");
    expect(error).toBeNull();
    expect(ast).not.toBeNull();
  });
});

describe("extractIdentifiersFromAST", () => {
  test("§7 basic identifiers", () => {
    const ids = extractIdentifiersFromAST("a + b * c");
    expect(ids).toContain("a");
    expect(ids).toContain("b");
    expect(ids).toContain("c");
  });

  test("§8 excludes property accesses", () => {
    const ids = extractIdentifiersFromAST("obj.prop");
    expect(ids).toContain("obj");
    expect(ids).not.toContain("prop");
  });

  test("§9 excludes object keys", () => {
    const ids = extractIdentifiersFromAST("({ title: value })");
    expect(ids).not.toContain("title");
    expect(ids).toContain("value");
  });

  test("§10 excludes function params", () => {
    const ids = extractIdentifiersFromAST("function(card) { return card.name }");
    expect(ids).not.toContain("card");
    expect(ids).not.toContain("name"); // property access
  });

  test("§11 excludes for-of iterators", () => {
    const result = parseStatements("for (const route of routes) { route.path }");
    expect(result.error).toBeNull();
    // Use the statement parser path
    const ids = extractIdentifiersFromAST("for (const route of routes) { route.path }");
    expect(ids).not.toContain("route");
    expect(ids).toContain("routes");
    expect(ids).not.toContain("path"); // property access
  });

  test("§16 arrow function params excluded", () => {
    const ids = extractIdentifiersFromAST("items.map(x => x.name)");
    expect(ids).toContain("items");
    expect(ids).not.toContain("x");
    expect(ids).not.toContain("name");
    expect(ids).not.toContain("map"); // property access
  });

  test("§17 handles forEach callback pattern", () => {
    const ids = extractIdentifiersFromAST('cards.forEach(function(card) { emit("<div>" + card.title + "/") })');
    expect(ids).toContain("cards");
    expect(ids).toContain("emit");
    expect(ids).not.toContain("card");
    expect(ids).not.toContain("title");
    expect(ids).not.toContain("forEach");
  });
});

describe("extractReactiveDepsFromAST", () => {
  test("§12 finds @vars", () => {
    const deps = extractReactiveDepsFromAST("@count + @total");
    expect(deps.has("count")).toBe(true);
    expect(deps.has("total")).toBe(true);
  });

  test("§13 skips non-@ identifiers", () => {
    const deps = extractReactiveDepsFromAST("@count + regularVar");
    expect(deps.has("count")).toBe(true);
    expect(deps.size).toBe(1);
  });

  test("§14 filters by knownReactiveVars", () => {
    const known = new Set(["count"]);
    const deps = extractReactiveDepsFromAST("@count + @unknown", known);
    expect(deps.has("count")).toBe(true);
    expect(deps.has("unknown")).toBe(false);
  });
});
