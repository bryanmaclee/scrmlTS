/**
 * bun.eval() — Compile-Time Evaluation Tests (SPEC §29)
 *
 * Tests for rewriteBunEval() in src/codegen/rewrite.js.
 *
 * Coverage:
 *   §1  bun.eval() with number expression returns literal
 *   §2  bun.eval() with string expression returns JSON string
 *   §3  bun.eval() with Date().getFullYear() returns year number
 *   §4  bun.eval() error produces E-EVAL-001
 *   §5  Expression without bun.eval() passes through unchanged
 *   §6  bun.eval() mixed with other expression content
 *   §7  Multiple bun.eval() calls in one expression
 *   §8  bun.eval() result not present in rewriteExpr output
 *   §9  bun.eval() with boolean returns literal
 *   §10 bun.eval() with null returns null
 */

import { describe, test, expect } from "bun:test";
import { rewriteBunEval, rewriteExpr } from "../../src/codegen/rewrite.js";

describe("§29 bun.eval() compile-time evaluation", () => {

  // §1 — number expression
  test("§1 bun.eval() with number expression returns literal", () => {
    const result = rewriteBunEval('bun.eval("2 + 2")');
    expect(result).toBe("4");
  });

  // §2 — string expression
  test("§2 bun.eval() with string expression returns JSON string", () => {
    const result = rewriteBunEval('bun.eval("\'hello\'")');
    expect(result).toBe('"hello"');
  });

  // §3 — Date().getFullYear()
  test("§3 bun.eval() with Date().getFullYear() returns current year", () => {
    const result = rewriteBunEval('bun.eval("new Date().getFullYear()")');
    const year = new Date().getFullYear();
    expect(result).toBe(String(year));
  });

  // §4 — error produces E-EVAL-001
  test("§4 bun.eval() error produces E-EVAL-001", () => {
    const errors = [];
    const result = rewriteBunEval('bun.eval("undefinedVar.foo")', errors);
    expect(errors.length).toBe(1);
    expect(errors[0].code).toBe("E-EVAL-001");
    expect(errors[0].message).toContain("E-EVAL-001");
    expect(errors[0].message).toContain("undefinedVar");
  });

  // §5 — passthrough when no bun.eval
  test("§5 expression without bun.eval() passes through unchanged", () => {
    const expr = "@count + 1";
    expect(rewriteBunEval(expr)).toBe(expr);
  });

  // §6 — mixed with other content
  test("§6 bun.eval() mixed with other expression content", () => {
    const result = rewriteBunEval('"© " + bun.eval("new Date().getFullYear()")');
    const year = new Date().getFullYear();
    expect(result).toBe(`"© " + ${year}`);
  });

  // §7 — multiple calls
  test("§7 multiple bun.eval() calls in one expression", () => {
    const result = rewriteBunEval('bun.eval("1 + 1") + bun.eval("2 + 2")');
    expect(result).toBe("2 + 4");
  });

  // §8 — output of rewriteExpr does not contain bun.eval
  test("§8 rewriteExpr output does not contain bun.eval()", () => {
    const result = rewriteExpr('bun.eval("42")');
    expect(result).not.toContain("bun.eval");
    expect(result).toContain("42");
  });

  // §9 — boolean
  test("§9 bun.eval() with boolean returns literal", () => {
    expect(rewriteBunEval('bun.eval("true")')).toBe("true");
    expect(rewriteBunEval('bun.eval("1 > 0")')).toBe("true");
    expect(rewriteBunEval('bun.eval("1 < 0")')).toBe("false");
  });

  // §10 — null
  test("§10 bun.eval() with null returns null", () => {
    expect(rewriteBunEval('bun.eval("null")')).toBe("null");
  });

  // §11 — tokenizer-spaced form (bun . eval)
  test("§11 bun.eval() with tokenizer spacing still evaluates", () => {
    const result = rewriteBunEval('bun . eval ( "2 + 2" )');
    expect(result).toBe("4");
  });

  // §12 — tokenizer-spaced form through full rewriteExpr
  test("§12 tokenizer-spaced bun.eval() through rewriteExpr", () => {
    const result = rewriteExpr('bun . eval ( "new Date().getFullYear()" )');
    expect(result).not.toContain("bun");
    expect(result).toContain(String(new Date().getFullYear()));
  });
});
