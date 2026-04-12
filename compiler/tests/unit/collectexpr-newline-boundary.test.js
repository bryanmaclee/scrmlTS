/**
 * collectExpr newline-boundary tests — Phase 2 Slice 3
 *
 * Verifies the BUG-ASI-NEWLINE guard correctly terminates expression collection
 * after a single-token value RHS followed by a newline + statement-starting token.
 *
 * Before Slice 3: collectExpr() over-collected across newlines for single-token
 * RHS. Example:
 *
 *   lin x = "hello"
 *   console.log(x)
 *
 * was parsed as ONE lin-decl with init = '"hello"\nconsole.log(x)'. Acorn's
 * parseExpression on that string only saw the first sub-expression, so the
 * structured ExprNode tree never referenced the next-line identifier. This is
 * why Slice 2's Pass-2 string-scan existed in scanNodeExprNodesForLin.
 *
 * After Slice 3: each symmetric declaration form (let, const, const @derived,
 * lin, tilde, @debounced) emits two separate AST nodes — the decl plus a
 * bare-expr containing the next-line reference.
 *
 * The fix was a one-line deletion in collectExpr: removing the redundant
 * `lastTok !== startTok` identity guard, which was an off-by-one check
 * (peek and consume return the same token object from the shared tokens array,
 * so the identity guard actually meant "have we consumed at least TWO tokens",
 * not "at least one"). The adjacent `parts.length > 0` clause is the correct
 * signal and remains.
 *
 * @see docs/changes/expr-ast-phase-2-slice-3/impact-analysis.md
 * @see compiler/src/ast-builder.js — collectExpr + BUG-ASI-NEWLINE guard
 */

import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseLogic(body) {
  // Wrap a raw logic body in a ${} block and parse. Return the logic block's
  // body array (the list of top-level statements inside the logic block).
  const source = `\${\n${body}\n}`;
  const bsOut = splitBlocks("test.scrml", source);
  const { ast } = buildAST(bsOut);
  const logicNode = ast.nodes.find(n => n.kind === "logic");
  if (!logicNode) throw new Error("no logic node in parse output");
  return logicNode.body;
}

// ---------------------------------------------------------------------------
// Symmetric decl forms — each should produce TWO separate nodes after the fix
// ---------------------------------------------------------------------------

describe("collectExpr newline boundary — symmetric single-token RHS decls", () => {

  test("lin-decl with single STRING RHS breaks at newline before next statement", () => {
    const stmts = parseLogic(`lin x = "hello"\nconsole.log(x)`);
    expect(stmts).toHaveLength(2);
    expect(stmts[0].kind).toBe("lin-decl");
    expect(stmts[0].name).toBe("x");
    // RHS must be just the string, NOT fused with the next line.
    expect(stmts[0].init).toBe(`"hello"`);
    // Second node is a bare expression containing console.log(x).
    expect(stmts[1].kind).toBe("bare-expr");
    expect(stmts[1].expr).toContain("console");
    expect(stmts[1].expr).toContain("x");
  });

  test("let-decl with single NUMBER RHS breaks at newline before next statement", () => {
    const stmts = parseLogic(`let x = 42\nconsole.log(x)`);
    expect(stmts).toHaveLength(2);
    expect(stmts[0].kind).toBe("let-decl");
    expect(stmts[0].name).toBe("x");
    expect(stmts[0].init).toBe("42");
    expect(stmts[1].kind).toBe("bare-expr");
    expect(stmts[1].expr).toContain("console");
  });

  test("const-decl with single STRING RHS breaks at newline before next statement", () => {
    const stmts = parseLogic(`const x = "y"\nconsole.log(x)`);
    expect(stmts).toHaveLength(2);
    expect(stmts[0].kind).toBe("const-decl");
    expect(stmts[0].name).toBe("x");
    expect(stmts[0].init).toBe(`"y"`);
    expect(stmts[1].kind).toBe("bare-expr");
  });

  test("reactive-derived-decl (const @name) with single STRING RHS breaks at newline", () => {
    const stmts = parseLogic(`const @d = "v"\nconsole.log(@d)`);
    expect(stmts).toHaveLength(2);
    expect(stmts[0].kind).toBe("reactive-derived-decl");
    expect(stmts[0].name).toBe("d");
    expect(stmts[0].init).toBe(`"v"`);
    expect(stmts[1].kind).toBe("bare-expr");
  });

  test("tilde-decl (bare name = expr) with single STRING RHS breaks at newline", () => {
    const stmts = parseLogic(`x = "hi"\nconsole.log(x)`);
    expect(stmts).toHaveLength(2);
    expect(stmts[0].kind).toBe("tilde-decl");
    expect(stmts[0].name).toBe("x");
    expect(stmts[0].init).toBe(`"hi"`);
    expect(stmts[1].kind).toBe("bare-expr");
  });

  test("@debounced decl with single STRING RHS breaks at newline", () => {
    const stmts = parseLogic(`@debounced(300) x = "hi"\nconsole.log(x)`);
    expect(stmts).toHaveLength(2);
    expect(stmts[0].kind).toBe("reactive-debounced-decl");
    expect(stmts[0].name).toBe("x");
    expect(stmts[0].init).toBe(`"hi"`);
    expect(stmts[1].kind).toBe("bare-expr");
  });

});

// ---------------------------------------------------------------------------
// Negative cases — forms that MUST remain glued across newlines
// ---------------------------------------------------------------------------

describe("collectExpr newline boundary — negative cases (must not break)", () => {

  test("operator continuation across newline stays glued (one node, two lines of RHS)", () => {
    // `let x = "a"\n+ "b"` — line 2 begins with an OPERATOR, so tokStartsStmt
    // is false. The guard must NOT fire.
    const stmts = parseLogic(`let x = "a"\n+ "b"`);
    expect(stmts).toHaveLength(1);
    expect(stmts[0].kind).toBe("let-decl");
    // The multi-line RHS is preserved in the init string.
    expect(stmts[0].init).toContain(`"a"`);
    expect(stmts[0].init).toContain(`"b"`);
    expect(stmts[0].init).toContain("+");
  });

  test("multi-token RHS (reflect chain) followed by next-line call breaks — existing §16 case", () => {
    // This was the multi-token case the guard was originally written to handle.
    // It worked before Slice 3 (multi-token RHS avoided the off-by-one) and must
    // still work after Slice 3.
    const stmts = parseLogic(`let variants = reflect(Color).variants\nconsole.log(variants)`);
    expect(stmts).toHaveLength(2);
    expect(stmts[0].kind).toBe("let-decl");
    expect(stmts[0].name).toBe("variants");
    expect(stmts[1].kind).toBe("bare-expr");
  });

  test("newline after `=` with RHS on next line stays glued (one node)", () => {
    // `let result =\n  fetchData()` — lastTok at the newline is `=` (PUNCT, not
    // a value-ending token), so lastEndsValue is false and the guard does not
    // fire. The RHS must be collected onto the let-decl.
    const stmts = parseLogic(`let result =\n  fetchData()`);
    expect(stmts).toHaveLength(1);
    expect(stmts[0].kind).toBe("let-decl");
    expect(stmts[0].name).toBe("result");
    expect(stmts[0].init).toContain("fetchData");
  });

  test("method chain across newline stays glued (one node)", () => {
    // `let chain = a\n  .then(b)` — tok at the newline is `.` (PUNCT), not
    // IDENT or KEYWORD, so tokStartsStmt is false and the guard does not fire.
    const stmts = parseLogic(`let chain = a\n  .then(b)`);
    expect(stmts).toHaveLength(1);
    expect(stmts[0].kind).toBe("let-decl");
    expect(stmts[0].name).toBe("chain");
    expect(stmts[0].init).toContain("then");
  });

});

// ---------------------------------------------------------------------------
// Slice 2 Pass-2 crutch removal — Scenario 2 cross-node double-consume path
// ---------------------------------------------------------------------------

describe("collectExpr newline boundary — cross-node structural proof for E-LIN-002", () => {

  test("lin x = \"hello\"\\nconsole.log(x)\\nconsole.log(x) produces three separate nodes", () => {
    // Scenario 2 from lin-enforcement-e2e.test.js. Before Slice 3, this input
    // produced ONE lin-decl with init = '"hello"\nconsole.log(x)\nconsole.log(x)'
    // and E-LIN-002 fired via the Pass-2 string-scan dedup quirk. After Slice 3,
    // the parser emits three separate nodes and E-LIN-002 fires via the INTENDED
    // cross-node double-consume path. This test asserts the structural prerequisite.
    const stmts = parseLogic(`lin x = "hello"\nconsole.log(x)\nconsole.log(x)`);
    expect(stmts).toHaveLength(3);
    expect(stmts[0].kind).toBe("lin-decl");
    expect(stmts[0].init).toBe(`"hello"`);
    expect(stmts[1].kind).toBe("bare-expr");
    expect(stmts[2].kind).toBe("bare-expr");
  });

});
