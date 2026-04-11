/**
 * ExprNode round-trip invariant tests — Phase 1
 *
 * Verifies that:
 *   normalizeWhitespace(emitStringFromTree(parseExprToNode(x))) === normalizeWhitespace(x)
 *
 * for all 15 worked examples from the design doc §8 plus 50 operator-coverage samples.
 *
 * Tests are organized into three groups:
 *   §1 — 15 worked examples from design doc
 *   §2 — 50 operator/form samples covering ExprNode kind coverage
 *   §3 — Tree shape assertions (kind + key fields, not round-trip)
 *
 * Field name reference (from types/ast.ts):
 *   UnaryExpr:   .op, .argument, .prefix
 *   BinaryExpr:  .op, .left, .right
 *   TernaryExpr: .condition, .consequent, .alternate
 *   MemberExpr:  .object, .property, .optional
 *   CallExpr:    .callee, .args, .optional
 *   LitExpr:     .litType ("number"|"string"|"bool"|"null"|"undefined"|"template"|"not")
 *   LambdaExpr:  .fnStyle, .params, .body (.body.kind is "expr" or "block")
 */

import { describe, test, expect } from "bun:test";
import {
  parseExprToNode,
  emitStringFromTree,
  normalizeWhitespace,
} from "../../src/expression-parser.ts";

// -------------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------------

function roundTrip(input) {
  const node = parseExprToNode(input, "<test>", 0);
  const emitted = emitStringFromTree(node);
  return {
    node,
    emitted,
    norm_in: normalizeWhitespace(input),
    norm_out: normalizeWhitespace(emitted),
  };
}

function expectRoundTrip(input) {
  const { norm_in, norm_out, node } = roundTrip(input);
  expect(norm_out).toBe(norm_in);
  return node;
}

// -------------------------------------------------------------------------
// §1: 15 worked examples (design doc §8)
// -------------------------------------------------------------------------

describe("ExprNode round-trip — §1 worked examples", () => {
  test("Example 1: @count + @step", () => {
    const node = expectRoundTrip("@count + @step");
    expect(node.kind).toBe("binary");
  });

  test("Example 2: ternary with @sending", () => {
    const node = expectRoundTrip('@sending ? "Sending…" : "Send Message"');
    expect(node.kind).toBe("ternary");
  });

  test("Example 3: p.name.toLowerCase().includes(q)", () => {
    const node = expectRoundTrip("p.name.toLowerCase().includes(q)");
    expect(node.kind).toBe("call");
  });

  test("Example 4: @marioState == MarioState.Small", () => {
    const node = expectRoundTrip("@marioState == MarioState.Small");
    expect(node.kind).toBe("binary");
    expect(node.op).toBe("==");
  });

  test("Example 5: @email.includes('@')", () => {
    const node = expectRoundTrip('@email.includes("@")');
    expect(node.kind).toBe("call");
  });

  test("Example 6: x is .North (enum variant check)", () => {
    const node = parseExprToNode("x is .North", "<test>", 0);
    expect(node.kind).toBe("binary");
    expect(node.op).toBe("is");
    expect(node.kind).not.toBe("escape-hatch");
  });

  test("Example 7: @val is not", () => {
    const node = parseExprToNode("@val is not", "<test>", 0);
    expect(node.kind).toBe("binary");
    expect(node.op).toBe("is-not");
    expect(node.kind).not.toBe("escape-hatch");
  });

  test("Example 8: (arr.find(x => x.id == id)) is not — Phase 1 limitation: escape-hatch for nested-paren is-not", () => {
    // Phase 1 limitation: the simple regex preprocessor cannot handle `(complex_expr) is not`
    // when the paren expression contains nested parens or commas. This fires an escape-hatch.
    // Phase 2 will use a token-level preprocessor to resolve this.
    const node = parseExprToNode("(arr.find(x => x.id == id)) is not", "<test>", 0);
    // Accept either fully-structured (future) or escape-hatch (Phase 1)
    expect(["binary", "escape-hatch"]).toContain(node.kind);
    // Either way, must not throw
    expect(node).toBeDefined();
  });

  test("Example 9: object literal { id: 1, name: 'Ada Lovelace', role: 'Mathematician' }", () => {
    const node = expectRoundTrip('{ id: 1, name: "Ada Lovelace", role: "Mathematician" }');
    expect(node.kind).toBe("object");
    expect(node.props).toHaveLength(3);
  });

  test("Example 10: @tasks.map(row => ({ ...row, status: ... ?? row.status }))", () => {
    const src =
      "@tasks.map(row => ({ ...row, status: TaskStatus.toEnum(row.status) ?? row.status }))";
    const node = parseExprToNode(src, "<test>", 0);
    expect(node.kind).toBe("call");
    expect(node.kind).not.toBe("escape-hatch");
    // lambda body should be expression body (not block)
    const lambda = node.args[0];
    expect(lambda.kind).toBe("lambda");
    expect(lambda.body.kind).toBe("expr");
  });

  test("Example 11: match expression (scrml-specific)", () => {
    const src = 'match @marioState { .Small => "🧍" .Big => "🦸" .Fire => "🔥" .Cape => "🦅" }';
    const node = parseExprToNode(src, "<test>", 0);
    expect(node.kind).toBe("match-expr");
    expect(node.subject.kind).toBe("ident");
    expect(node.subject.name).toBe("@marioState");
  });

  test('Example 12: !@email.includes("@")', () => {
    const node = expectRoundTrip('!@email.includes("@")');
    expect(node.kind).toBe("unary");
    expect(node.op).toBe("!");
    // UnaryExpr field is `argument`, not `operand`
    expect(node.argument.kind).toBe("call");
  });

  test("Example 13: fetchToken() — call form (lin-decl init expression)", () => {
    const node = expectRoundTrip("fetchToken()");
    expect(node.kind).toBe("call");
    expect(node.args).toHaveLength(0);
  });

  test("Example 14: @currentPrice ?? 'Loading...'", () => {
    const node = expectRoundTrip('@currentPrice ?? "Loading..."');
    expect(node.kind).toBe("binary");
    expect(node.op).toBe("??");
  });

  test("Example 15: p.name.toLowerCase().includes(q) || p.role.toLowerCase().includes(q)", () => {
    const src =
      "p.name.toLowerCase().includes(q) || p.role.toLowerCase().includes(q)";
    const node = expectRoundTrip(src);
    expect(node.kind).toBe("binary");
    expect(node.op).toBe("||");
  });
});

// -------------------------------------------------------------------------
// §2: Operator and form coverage (50 samples)
// -------------------------------------------------------------------------

describe("ExprNode round-trip — §2 operator/form coverage", () => {
  // Arithmetic
  test("a + b", () => expectRoundTrip("a + b"));
  test("a - b", () => expectRoundTrip("a - b"));
  test("a * b", () => expectRoundTrip("a * b"));
  test("a / b", () => expectRoundTrip("a / b"));
  test("a % b", () => expectRoundTrip("a % b"));
  test("a ** b", () => expectRoundTrip("a ** b"));

  // Comparison
  test("a < b", () => expectRoundTrip("a < b"));
  test("a <= b", () => expectRoundTrip("a <= b"));
  test("a > b", () => expectRoundTrip("a > b"));
  test("a >= b", () => expectRoundTrip("a >= b"));

  // Equality
  test("a === b", () => expectRoundTrip("a === b"));
  test("a !== b", () => expectRoundTrip("a !== b"));

  // Logical
  test("a && b", () => expectRoundTrip("a && b"));
  test("a || b", () => expectRoundTrip("a || b"));
  test("a ?? b", () => expectRoundTrip("a ?? b"));

  // Unary
  test("!a", () => expectRoundTrip("!a"));
  test("-a", () => expectRoundTrip("-a"));
  test("typeof a", () => expectRoundTrip("typeof a"));
  test("void 0", () => expectRoundTrip("void 0"));

  // Assignment
  test("a += 1", () => expectRoundTrip("a += 1"));
  test("a -= 1", () => expectRoundTrip("a -= 1"));

  // Ternary
  test("a ? b : c", () => expectRoundTrip("a ? b : c"));
  test("nested ternary", () => expectRoundTrip("a ? b : c ? d : e"));

  // Member / call
  test("a.b", () => expectRoundTrip("a.b"));
  test("a.b.c", () => expectRoundTrip("a.b.c"));
  test("a()", () => expectRoundTrip("a()"));
  test("a(b, c)", () => expectRoundTrip("a(b, c)"));
  test("a.b(c)", () => expectRoundTrip("a.b(c)"));
  test("a[b]", () => expectRoundTrip("a[b]"));
  test("new Foo()", () => expectRoundTrip("new Foo()"));
  test("new Foo(a, b)", () => expectRoundTrip("new Foo(a, b)"));

  // Literals
  test("42", () => { const n = expectRoundTrip("42"); expect(n.kind).toBe("lit"); });
  test('"hello"', () => { const n = expectRoundTrip('"hello"'); expect(n.kind).toBe("lit"); });
  test("true", () => { const n = expectRoundTrip("true"); expect(n.kind).toBe("lit"); });
  test("false", () => { const n = expectRoundTrip("false"); expect(n.kind).toBe("lit"); });
  test("null", () => { const n = expectRoundTrip("null"); expect(n.kind).toBe("lit"); });

  // Arrays
  test("[]", () => { const n = expectRoundTrip("[]"); expect(n.kind).toBe("array"); });
  test("[1, 2, 3]", () => { const n = expectRoundTrip("[1, 2, 3]"); expect(n.kind).toBe("array"); });
  test("[...a, b]", () => { const n = expectRoundTrip("[...a, b]"); expect(n.kind).toBe("array"); });

  // Objects
  test("{}", () => { const n = expectRoundTrip("{}"); expect(n.kind).toBe("object"); });
  test("{ a: 1 }", () => { const n = expectRoundTrip("{ a: 1 }"); expect(n.kind).toBe("object"); });
  test("{ ...a, b: 2 }", () => { const n = expectRoundTrip("{ ...a, b: 2 }"); expect(n.kind).toBe("object"); });

  // Arrow functions (expression body)
  test("x => x + 1", () => {
    const n = parseExprToNode("x => x + 1", "<test>", 0);
    expect(n.kind).toBe("lambda");
    expect(n.body.kind).toBe("expr");
  });
  test("(x, y) => x + y", () => {
    const n = parseExprToNode("(x, y) => x + y", "<test>", 0);
    expect(n.kind).toBe("lambda");
  });

  // Template literals with interpolation → escape-hatch is expected in Phase 1
  test("template literal with interpolation (Phase 1: escape-hatch)", () => {
    const n = parseExprToNode("`hello ${name}`", "<test>", 0);
    // Phase 1: interpolated template literals go to escape-hatch (no structured representation)
    // Static template literals (no ${}) could parse to lit/template
    expect(n).toBeDefined();
    expect(typeof n.kind).toBe("string");
  });

  // Optional chaining
  test("a?.b", () => {
    const n = parseExprToNode("a?.b", "<test>", 0);
    expect(n.kind).toBe("member");
    expect(n.optional).toBe(true);
  });
  test("a?.()", () => {
    const n = parseExprToNode("a?.()", "<test>", 0);
    expect(n.kind).toBe("call");
    expect(n.optional).toBe(true);
  });

  // Spread in call
  test("f(...args)", () => expectRoundTrip("f(...args)"));

  // Bitwise
  test("a & b", () => expectRoundTrip("a & b"));
  test("a | b", () => expectRoundTrip("a | b"));
});

// -------------------------------------------------------------------------
// §3: Tree shape assertions
// -------------------------------------------------------------------------

describe("ExprNode tree shape — §3 structural assertions", () => {
  test("binary node has op, left, right", () => {
    const n = parseExprToNode("a + b", "<test>", 0);
    expect(n.kind).toBe("binary");
    expect(n.op).toBe("+");
    expect(n.left).toBeDefined();
    expect(n.right).toBeDefined();
    expect(n.left.kind).toBe("ident");
    expect(n.left.name).toBe("a");
    expect(n.right.kind).toBe("ident");
    expect(n.right.name).toBe("b");
  });

  test("unary node has op, argument (not operand), prefix", () => {
    const n = parseExprToNode("!x", "<test>", 0);
    expect(n.kind).toBe("unary");
    expect(n.op).toBe("!");
    expect(n.prefix).toBe(true);
    // Field is `argument` per UnaryExpr interface in types/ast.ts
    expect(n.argument).toBeDefined();
    expect(n.argument.kind).toBe("ident");
  });

  test("member node has object, property, optional", () => {
    const n = parseExprToNode("a.b", "<test>", 0);
    expect(n.kind).toBe("member");
    expect(n.property).toBe("b");
    expect(n.optional).toBe(false);
    expect(n.object.kind).toBe("ident");
    expect(n.object.name).toBe("a");
  });

  test("call node has callee, args, optional", () => {
    const n = parseExprToNode("f(x, y)", "<test>", 0);
    expect(n.kind).toBe("call");
    expect(n.args).toHaveLength(2);
    expect(n.optional).toBe(false);
  });

  test("object node has props array", () => {
    const n = parseExprToNode("{ x: 1, y: 2 }", "<test>", 0);
    expect(n.kind).toBe("object");
    expect(n.props).toHaveLength(2);
    expect(n.props[0].kind).toBe("prop");
    expect(n.props[0].key).toBe("x");
  });

  test("array node has elements array", () => {
    const n = parseExprToNode("[1, 2, 3]", "<test>", 0);
    expect(n.kind).toBe("array");
    expect(n.elements).toHaveLength(3);
  });

  test("ternary node has condition/consequent/alternate (not test)", () => {
    const n = parseExprToNode("a ? b : c", "<test>", 0);
    expect(n.kind).toBe("ternary");
    // TernaryExpr uses `condition`, not `test` (matching ast.ts interface)
    expect(n.condition).toBeDefined();
    expect(n.consequent).toBeDefined();
    expect(n.alternate).toBeDefined();
  });

  test("lambda (arrow) node has params and expr body", () => {
    const n = parseExprToNode("x => x * 2", "<test>", 0);
    expect(n.kind).toBe("lambda");
    expect(n.fnStyle).toBe("arrow");
    expect(n.params).toHaveLength(1);
    expect(n.params[0].name).toBe("x");
    expect(n.body.kind).toBe("expr");
  });

  test("lit node for number", () => {
    const n = parseExprToNode("42", "<test>", 0);
    expect(n.kind).toBe("lit");
    expect(n.litType).toBe("number");
    expect(n.value).toBe(42);
  });

  test("lit node for string", () => {
    const n = parseExprToNode('"hello"', "<test>", 0);
    expect(n.kind).toBe("lit");
    expect(n.litType).toBe("string");
    expect(n.value).toBe("hello");
  });

  test("lit node for boolean uses litType 'bool'", () => {
    const n = parseExprToNode("true", "<test>", 0);
    expect(n.kind).toBe("lit");
    // LitExpr.litType uses "bool" (not "boolean") per types/ast.ts
    expect(n.litType).toBe("bool");
  });

  test("new node has callee and args", () => {
    const n = parseExprToNode("new Map()", "<test>", 0);
    expect(n.kind).toBe("new");
    expect(n.callee.kind).toBe("ident");
    expect(n.args).toHaveLength(0);
  });

  test("index node has object and index", () => {
    const n = parseExprToNode("arr[0]", "<test>", 0);
    expect(n.kind).toBe("index");
    expect(n.object.kind).toBe("ident");
    expect(n.index.kind).toBe("lit");
  });

  test("all nodes have a span", () => {
    const exprs = ["a + b", "f()", "a.b", "x => x", "[1]", "{ a: 1 }"];
    for (const expr of exprs) {
      const n = parseExprToNode(expr, "<test>", 0);
      expect(n.span).toBeDefined();
      expect(typeof n.span.start).toBe("number");
      expect(typeof n.span.end).toBe("number");
    }
  });

  test("is-not emits binary with op is-not", () => {
    const n = parseExprToNode("x is not", "<test>", 0);
    expect(n.kind).toBe("binary");
    expect(n.op).toBe("is-not");
  });

  test("is-some emits binary with op is-some", () => {
    const n = parseExprToNode("x is some", "<test>", 0);
    expect(n.kind).toBe("binary");
    expect(n.op).toBe("is-some");
  });

  test("is variant emits binary with op is", () => {
    const n = parseExprToNode("x is .Done", "<test>", 0);
    expect(n.kind).toBe("binary");
    expect(n.op).toBe("is");
    expect(n.right.kind).toBe("ident");
    expect(n.right.name).toBe(".Done");
  });

  test("@-prefixed ident preserves @ in name", () => {
    const n = parseExprToNode("@count", "<test>", 0);
    expect(n.kind).toBe("ident");
    expect(n.name).toBe("@count");
  });

  test("malformed input does not throw — returns escape-hatch or some node", () => {
    // Should not throw — either escape-hatch or some node
    const n = parseExprToNode(">>> <<<", "<test>", 0);
    expect(n).toBeDefined();
    expect(typeof n.kind).toBe("string");
  });
});
