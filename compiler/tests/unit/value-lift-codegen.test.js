/**
 * value-lift-codegen — Unit Tests
 *
 * Tests for §10 two-mode lift and §17.6 if-as-expression codegen.
 *
 * Coverage:
 *   §1  if-as-expression: basic const assignment (with else)
 *   §2  if-as-expression: no-else arm → null when false
 *   §3  if-as-expression: else-if chain optimization (§17.6.8)
 *   §4  ~ after if-as-expression (tilde pipeline continuation)
 *   §5  E-LIFT-002: multiple lifts in same arm without else
 *   §6  Nested if-as-expression (inner if-as-expression in else arm)
 *   §7  let-decl if-as-expression keyword
 *   §8  Regression: plain const-decl (no ifExpr) unchanged
 */

import { describe, test, expect, beforeEach } from "bun:test";
import { emitLogicNode, emitLogicBody } from "../../src/codegen/emit-logic.ts";
import { resetVarCounter } from "../../src/codegen/var-counter.ts";

// Reset the var counter before each test so variable names are deterministic.
beforeEach(() => {
  resetVarCounter();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a lift-expr node for a scalar (non-markup) value.
 * Represents `lift <expr>` in scrml source.
 */
function liftExpr(expr) {
  return { kind: "lift-expr", expr: { kind: "expr", expr } };
}

/**
 * Build an if-as-expression node used as the `ifExpr` field of a const/let-decl.
 * `alternate` may be null (no else), a plain body array (else), or a single
 * if-stmt node (else if).
 */
function ifExprNode(condition, consequent, alternate = null) {
  return { condition, consequent, alternate };
}

// ---------------------------------------------------------------------------
// §1: if-as-expression — basic const assignment (with else)
// ---------------------------------------------------------------------------

describe("§1 if-as-expression: const a = if (cond) { lift 3 } else { lift 5 }", () => {
  test("emits pre-declared tilde var defaulting to null", () => {
    const node = {
      kind: "const-decl",
      name: "a",
      ifExpr: ifExprNode(
        "cond",
        [liftExpr("3")],
        [liftExpr("5")]
      ),
    };
    const result = emitLogicNode(node, {});
    expect(result).toMatch(/^let _scrml_tilde_\d+ = null;/m);
  });

  test("emits if branch with lift assignment into tilde var", () => {
    const node = {
      kind: "const-decl",
      name: "a",
      ifExpr: ifExprNode(
        "cond",
        [liftExpr("3")],
        [liftExpr("5")]
      ),
    };
    const result = emitLogicNode(node, {});
    expect(result).toMatch(/if \(cond\) \{/);
    // The tilde var is assigned, not re-declared, inside the if body
    expect(result).toMatch(/_scrml_tilde_\d+ = 3;/);
  });

  test("emits else branch with lift assignment into tilde var", () => {
    const node = {
      kind: "const-decl",
      name: "a",
      ifExpr: ifExprNode(
        "cond",
        [liftExpr("3")],
        [liftExpr("5")]
      ),
    };
    const result = emitLogicNode(node, {});
    expect(result).toMatch(/else \{/);
    expect(result).toMatch(/_scrml_tilde_\d+ = 5;/);
  });

  test("emits const a = tildeVar as the final assignment", () => {
    const node = {
      kind: "const-decl",
      name: "a",
      ifExpr: ifExprNode(
        "cond",
        [liftExpr("3")],
        [liftExpr("5")]
      ),
    };
    const result = emitLogicNode(node, {});
    // Last meaningful line must be the named const binding
    const lines = result.split("\n").filter(l => l.trim());
    expect(lines[lines.length - 1]).toMatch(/^const a = _scrml_tilde_\d+;$/);
  });

  test("both arms reference the SAME tilde variable", () => {
    const node = {
      kind: "const-decl",
      name: "a",
      ifExpr: ifExprNode(
        "cond",
        [liftExpr("3")],
        [liftExpr("5")]
      ),
    };
    const result = emitLogicNode(node, {});
    const matches = result.match(/_scrml_tilde_\d+/g) ?? [];
    // All occurrences should be the same variable name
    const unique = new Set(matches);
    expect(unique.size).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// §2: if-as-expression — no else arm → null when condition is false
// ---------------------------------------------------------------------------

describe("§2 if-as-expression: const a = if (cond) { lift 3 } (no else)", () => {
  test("pre-declared tilde var defaults to null (no else means false → null)", () => {
    const node = {
      kind: "const-decl",
      name: "a",
      ifExpr: ifExprNode("cond", [liftExpr("3")], null),
    };
    const result = emitLogicNode(node, {});
    expect(result).toMatch(/^let _scrml_tilde_\d+ = null;/m);
  });

  test("no else block is emitted", () => {
    const node = {
      kind: "const-decl",
      name: "a",
      ifExpr: ifExprNode("cond", [liftExpr("3")], null),
    };
    const result = emitLogicNode(node, {});
    expect(result).not.toMatch(/else/);
  });

  test("const a = tildeVar is still emitted (holds null when cond is false)", () => {
    const node = {
      kind: "const-decl",
      name: "a",
      ifExpr: ifExprNode("cond", [liftExpr("3")], null),
    };
    const result = emitLogicNode(node, {});
    const lines = result.split("\n").filter(l => l.trim());
    expect(lines[lines.length - 1]).toMatch(/^const a = _scrml_tilde_\d+;$/);
  });

  test("if body assigns (not re-declares) tilde var", () => {
    const node = {
      kind: "const-decl",
      name: "a",
      ifExpr: ifExprNode("x . ready", [liftExpr("x . value")], null),
    };
    const result = emitLogicNode(node, {});
    // Assignment inside body: `_scrml_tilde_N = x . value;` (no `let` keyword)
    expect(result).toMatch(/_scrml_tilde_\d+ = x \. value;/);
    // But the pre-declaration has `let`
    expect(result).toMatch(/let _scrml_tilde_\d+ = null;/);
  });
});

// ---------------------------------------------------------------------------
// §3: else-if chain optimization (§17.6.8)
// ---------------------------------------------------------------------------

describe("§3 else-if chain: const a = if (x) { lift 1 } else if (y) { lift 2 } else { lift 3 }", () => {
  /**
   * Build the AST for:
   *   const a = if (x) { lift 1 } else if (y) { lift 2 } else { lift 3 }
   *
   * The alternate of the outer ifExpr is a single if-stmt node (§17.6.8 shape).
   */
  function buildElseIfNode() {
    const innerIf = {
      kind: "if-stmt",
      condition: "y",
      consequent: [liftExpr("2")],
      alternate: [liftExpr("3")],
    };
    return {
      kind: "const-decl",
      name: "a",
      ifExpr: {
        condition: "x",
        consequent: [liftExpr("1")],
        alternate: [innerIf],
      },
    };
  }

  test("emits else if keyword (not else { if) for chained else-if", () => {
    const result = emitLogicNode(buildElseIfNode(), {});
    expect(result).toMatch(/else if \(y\)/);
    // Verify there is no double-brace pattern `else { if`
    expect(result).not.toMatch(/else \{\s*if/);
  });

  test("all three lift values appear in output", () => {
    const result = emitLogicNode(buildElseIfNode(), {});
    expect(result).toMatch(/_scrml_tilde_\d+ = 1;/);
    expect(result).toMatch(/_scrml_tilde_\d+ = 2;/);
    expect(result).toMatch(/_scrml_tilde_\d+ = 3;/);
  });

  test("all assignments reference the same tilde variable", () => {
    const result = emitLogicNode(buildElseIfNode(), {});
    const matches = result.match(/_scrml_tilde_\d+/g) ?? [];
    const unique = new Set(matches);
    expect(unique.size).toBe(1);
  });

  test("const a = tildeVar is the last line", () => {
    const result = emitLogicNode(buildElseIfNode(), {});
    const lines = result.split("\n").filter(l => l.trim());
    expect(lines[lines.length - 1]).toMatch(/^const a = _scrml_tilde_\d+;$/);
  });

  test("emits if / else if / else blocks in correct order", () => {
    const result = emitLogicNode(buildElseIfNode(), {});
    const ifPos = result.indexOf("if (x)");
    const elseIfPos = result.indexOf("else if (y)");
    const elsePos = result.lastIndexOf("else {");
    expect(ifPos).toBeGreaterThanOrEqual(0);
    expect(elseIfPos).toBeGreaterThan(ifPos);
    expect(elsePos).toBeGreaterThan(elseIfPos);
  });
});

// ---------------------------------------------------------------------------
// §4: ~ after if-as-expression (tilde pipeline continuation)
// ---------------------------------------------------------------------------

describe("§4 ~ after if-as-expression: result is available as ~", () => {
  /**
   * Represents:
   *   if (cond) lift a; else lift b;
   *   const dbl = ~ * 2;
   *
   * Emitted as a sequence via emitLogicBody.
   * The if-as-expression result propagates to the parent tilde context,
   * so `~ * 2` in the subsequent const-decl resolves to the if-expr's tilde var.
   */
  test("const dbl = ~ * 2 resolves to tilde var from if-as-expression", () => {
    const nodes = [
      {
        kind: "const-decl",
        name: "selected",
        ifExpr: ifExprNode("cond", [liftExpr("a")], [liftExpr("b")]),
      },
      { kind: "const-decl", name: "dbl", init: "~ * 2" },
    ];
    const results = emitLogicBody(nodes);
    expect(results).toHaveLength(2);
    // The if-as-expression block
    expect(results[0]).toMatch(/const selected = _scrml_tilde_\d+;/);
    // dbl must reference the same tilde var (not contain literal `~`)
    expect(results[1]).not.toContain("~");
    expect(results[1]).toMatch(/^const dbl = _scrml_tilde_\d+ \* 2;$/);
  });

  test("~ in subsequent let-decl resolves to if-as-expression tilde var", () => {
    const nodes = [
      {
        kind: "const-decl",
        name: "val",
        ifExpr: ifExprNode("flag", [liftExpr("10")], [liftExpr("20")]),
      },
      { kind: "let-decl", name: "doubled", init: "~ * 2" },
    ];
    const results = emitLogicBody(nodes);
    expect(results).toHaveLength(2);
    expect(results[1]).not.toContain("~");
    expect(results[1]).toMatch(/^let doubled = _scrml_tilde_\d+ \* 2;$/);
  });

  test("the tilde var in dbl references the SAME var as the if-as-expression", () => {
    const nodes = [
      {
        kind: "const-decl",
        name: "result",
        ifExpr: ifExprNode("ok", [liftExpr("42")], [liftExpr("0")]),
      },
      { kind: "const-decl", name: "triple", init: "~ * 3" },
    ];
    const results = emitLogicBody(nodes);
    // Extract all tilde var names from both results
    const allMatches = results.join("\n").match(/_scrml_tilde_\d+/g) ?? [];
    const unique = new Set(allMatches);
    // All tilde references across both outputs should be the same variable
    expect(unique.size).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// §5: E-LIFT-002 — multiple lifts in same arm
// ---------------------------------------------------------------------------

describe("§5 E-LIFT-002: multiple lifts on same execution path", () => {
  test("two lifts in the if-arm consequent emits E-LIFT-002 comment", () => {
    const node = {
      kind: "const-decl",
      name: "a",
      ifExpr: ifExprNode(
        "cond",
        [liftExpr("1"), liftExpr("2")],  // two lifts in same arm
        [liftExpr("3")]
      ),
    };
    const result = emitLogicNode(node, {});
    expect(result).toContain("E-LIFT-002");
  });

  test("two lifts in the else arm emits E-LIFT-002 comment", () => {
    const node = {
      kind: "const-decl",
      name: "a",
      ifExpr: ifExprNode(
        "cond",
        [liftExpr("1")],
        [liftExpr("2"), liftExpr("3")]   // two lifts in else arm
      ),
    };
    const result = emitLogicNode(node, {});
    expect(result).toContain("E-LIFT-002");
  });

  test("single lift in each arm does NOT emit E-LIFT-002", () => {
    const node = {
      kind: "const-decl",
      name: "a",
      ifExpr: ifExprNode(
        "cond",
        [liftExpr("1")],
        [liftExpr("2")]
      ),
    };
    const result = emitLogicNode(node, {});
    expect(result).not.toContain("E-LIFT-002");
  });

  test("two lifts in else-if arm emits E-LIFT-002 for that arm", () => {
    const innerIf = {
      kind: "if-stmt",
      condition: "y",
      consequent: [liftExpr("x"), liftExpr("x . extra")],  // two lifts
      alternate: [liftExpr("0")],
    };
    const node = {
      kind: "const-decl",
      name: "a",
      ifExpr: {
        condition: "p",
        consequent: [liftExpr("1")],
        alternate: [innerIf],
      },
    };
    const result = emitLogicNode(node, {});
    expect(result).toContain("E-LIFT-002");
  });
});

// ---------------------------------------------------------------------------
// §6: Nested if-as-expression
// ---------------------------------------------------------------------------

describe("§6 Nested if-as-expression", () => {
  /**
   * Represents:
   *   const outer = if (p) {
   *     lift if (q) { lift 1 } else { lift 2 }
   *   } else {
   *     lift 3
   *   }
   *
   * The inner if is NOT an if-as-expression (it's a plain if-stmt inside the
   * outer arm body). This tests that lift inside a nested if still reaches the
   * outer tilde var.
   */
  test("lift inside nested if-stmt in outer arm assigns to outer tilde var", () => {
    const innerIf = {
      kind: "if-stmt",
      condition: "q",
      consequent: [liftExpr("1")],
      alternate: [liftExpr("2")],
    };
    const node = {
      kind: "const-decl",
      name: "outer",
      ifExpr: {
        condition: "p",
        consequent: [innerIf],
        alternate: [liftExpr("3")],
      },
    };
    const result = emitLogicNode(node, {});
    // The outer tilde var must appear
    expect(result).toMatch(/let _scrml_tilde_\d+ = null;/);
    // The final assignment binds outer to the tilde var
    const lines = result.split("\n").filter(l => l.trim());
    expect(lines[lines.length - 1]).toMatch(/^const outer = _scrml_tilde_\d+;$/);
  });

  test("two sequential if-as-expressions produce two distinct tilde vars", () => {
    const nodes = [
      {
        kind: "const-decl",
        name: "x",
        ifExpr: ifExprNode("a", [liftExpr("1")], [liftExpr("2")]),
      },
      {
        kind: "const-decl",
        name: "y",
        ifExpr: ifExprNode("b", [liftExpr("10")], [liftExpr("20")]),
      },
    ];
    const results = emitLogicBody(nodes);
    expect(results).toHaveLength(2);
    // Each result uses a different tilde var
    const firstMatch = results[0].match(/_scrml_tilde_(\d+)/)?.[1];
    const secondMatch = results[1].match(/_scrml_tilde_(\d+)/)?.[1];
    expect(firstMatch).toBeDefined();
    expect(secondMatch).toBeDefined();
    expect(firstMatch).not.toBe(secondMatch);
  });
});

// ---------------------------------------------------------------------------
// §7: let-decl if-as-expression (keyword is "let", not "const")
// ---------------------------------------------------------------------------

describe("§7 let-decl if-as-expression", () => {
  test("emits 'let a = tildeVar' (not const) when keyword is let", () => {
    const node = {
      kind: "let-decl",
      name: "a",
      ifExpr: ifExprNode("cond", [liftExpr("99")], [liftExpr("0")]),
    };
    const result = emitLogicNode(node, {});
    const lines = result.split("\n").filter(l => l.trim());
    expect(lines[lines.length - 1]).toMatch(/^let a = _scrml_tilde_\d+;$/);
  });

  test("let-decl if-as-expression still pre-declares tilde var as null", () => {
    const node = {
      kind: "let-decl",
      name: "a",
      ifExpr: ifExprNode("flag", [liftExpr("7")], null),
    };
    const result = emitLogicNode(node, {});
    expect(result).toMatch(/^let _scrml_tilde_\d+ = null;/m);
  });
});

// ---------------------------------------------------------------------------
// §8: Regression — plain const/let-decl unaffected
// ---------------------------------------------------------------------------

describe("§8 Regression: plain declarations without ifExpr unchanged", () => {
  test("plain const-decl without ifExpr is unaffected", () => {
    const node = { kind: "const-decl", name: "x", init: "42" };
    const result = emitLogicNode(node, {});
    expect(result).toBe("const x = 42;");
  });

  test("plain let-decl without ifExpr is unaffected", () => {
    const node = { kind: "let-decl", name: "y", init: "hello" };
    const result = emitLogicNode(node, {});
    expect(result).toBe("let y = hello;");
  });

  test("plain const-decl does not emit tilde vars", () => {
    const node = { kind: "const-decl", name: "z", init: "x + 1" };
    const result = emitLogicNode(node, {});
    expect(result).not.toContain("_scrml_tilde_");
  });

  test("emitLogicBody with no if-as-expression nodes produces no tilde vars", () => {
    const nodes = [
      { kind: "const-decl", name: "a", init: "1" },
      { kind: "let-decl", name: "b", init: "2" },
      { kind: "bare-expr", expr: "console . log ( a + b )" },
    ];
    const results = emitLogicBody(nodes);
    expect(results).toHaveLength(3);
    expect(results[0]).toBe("const a = 1;");
    expect(results[1]).toBe("let b = 2;");
    expect(results[2]).toBe("console . log ( a + b );");
    for (const r of results) {
      expect(r).not.toContain("_scrml_tilde_");
    }
  });
});
