/**
 * `test-bind` Parser Support — Unit Tests (Phase A8 / A6-2)
 *
 * Tests the parser-level support for `test-bind <ident> = <expression>`
 * declarations inside `~{}` test blocks per SPEC §19.12.6.
 *
 * Coverage:
 *   §1  Positive — `test-bind` parses cleanly to a TestBindDecl on the testGroup.
 *   §2  Multiple `test-bind` declarations in one `~{}` block.
 *   §3  Function-form RHS — `(args) => { ... }` body preserved (brace-balanced).
 *   §4  Literal RHS — `[]`, primitives, identifiers all parse.
 *   §5  Duplicate identifier in same `~{}` block fires E-TEST-005.
 *   §6  `test-bind` inside `test "..." {...}` case body fires E-TEST-005.
 *   §7  Malformed `test-bind` — missing identifier, missing `=`, missing RHS,
 *       all fire E-TEST-005.
 *   §8  Regression — existing `~{}` test-block parsing (group name, before/after,
 *       multiple test cases, top-level assert) still works.
 *   §9  `testBinds` field is always present (default `[]`).
 *
 * NB: A6-2 is parser-only. Type-checking (function-typed RHS vs return-stub
 * discrimination per S74 hand-off item 178) is A6-3's territory; codegen is
 * A6-4's. This file tests AST shape + diagnostics only.
 */

import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parse a scrml source and return { ast, errors }.
 */
function parseFile(source) {
  const bsOut = splitBlocks("test.scrml", source);
  return buildAST(bsOut);
}

/**
 * Wrap a `~{}` body fragment, parse, and return the test-block node.
 */
function parseTestBlock(body) {
  const src = `~{ ${body} }`;
  const { ast, errors } = parseFile(src);
  const node = ast.nodes.find(n => n.kind === "test");
  return { node, errors };
}

/**
 * Filter errors to non-warning E-TEST-005 entries (the parser-level diagnostic
 * for invalid test structure). Filters out the W-PROGRAM-001 warning the AST
 * builder fires when no `<program>` wrapper is present.
 */
function eTest005s(errors) {
  return errors.filter(e => e.code === "E-TEST-005");
}

// ---------------------------------------------------------------------------
// §1 — Positive: single `test-bind` declaration parses to a TestBindDecl
// ---------------------------------------------------------------------------

describe("test-bind §1: positive parse", () => {
  test("a single `test-bind ident = expr` produces one TestBindDecl", () => {
    const { node, errors } = parseTestBlock(`test-bind fetchUser = mockFetchUser`);
    expect(eTest005s(errors)).toHaveLength(0);
    expect(node).toBeTruthy();
    expect(node.testGroup.testBinds).toHaveLength(1);
    expect(node.testGroup.testBinds[0]).toMatchObject({
      identifier: "fetchUser",
      expression: "mockFetchUser",
    });
    expect(typeof node.testGroup.testBinds[0].line).toBe("number");
  });

  test("`test-bind` does not appear in the implicit/explicit test-case body", () => {
    const { node } = parseTestBlock(
      `test-bind fetchUser = mockFetchUser\n` +
      `test "x" { assert 1 == 1 }`
    );
    expect(node.testGroup.tests).toHaveLength(1);
    expect(node.testGroup.tests[0].name).toBe("x");
    expect(node.testGroup.tests[0].body).toEqual(["assert 1 == 1"]);
    expect(node.testGroup.testBinds).toHaveLength(1);
  });

  test("group-name STRING + test-bind + test case all coexist", () => {
    const { node } = parseTestBlock(
      `"my group"\n` +
      `test-bind fetchUser = stub\n` +
      `test "case" { assert true }`
    );
    expect(node.testGroup.name).toBe("my group");
    expect(node.testGroup.testBinds).toHaveLength(1);
    expect(node.testGroup.testBinds[0].identifier).toBe("fetchUser");
    expect(node.testGroup.tests).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// §2 — Multiple `test-bind` declarations in one `~{}` block
// ---------------------------------------------------------------------------

describe("test-bind §2: multiple declarations", () => {
  test("two distinct test-bind declarations both parsed", () => {
    const { node, errors } = parseTestBlock(
      `test-bind fetchUser = stubA\n` +
      `test-bind fetchPosts = stubB`
    );
    expect(eTest005s(errors)).toHaveLength(0);
    expect(node.testGroup.testBinds).toHaveLength(2);
    expect(node.testGroup.testBinds[0].identifier).toBe("fetchUser");
    expect(node.testGroup.testBinds[1].identifier).toBe("fetchPosts");
  });

  test("three test-bind declarations preserved in declaration order", () => {
    const { node } = parseTestBlock(
      `test-bind a = 1\n` +
      `test-bind b = 2\n` +
      `test-bind c = 3`
    );
    expect(node.testGroup.testBinds.map(b => b.identifier)).toEqual(["a", "b", "c"]);
    expect(node.testGroup.testBinds.map(b => b.expression)).toEqual(["1", "2", "3"]);
  });
});

// ---------------------------------------------------------------------------
// §3 — Function-form RHS — brace-balanced body preserved
// ---------------------------------------------------------------------------

describe("test-bind §3: function-form RHS", () => {
  test("arrow function with object-literal body — braces balanced", () => {
    const { node, errors } = parseTestBlock(
      `test-bind fetchUser = (id) => { id, name: stubName }`
    );
    expect(eTest005s(errors)).toHaveLength(0);
    expect(node.testGroup.testBinds).toHaveLength(1);
    const expr = node.testGroup.testBinds[0].expression;
    // The brace-balanced body must be preserved (open and close present).
    expect(expr).toContain("{");
    expect(expr).toContain("}");
    expect(expr).toContain("id");
    expect(expr).toContain("name");
  });

  test("arrow function with nested braces does not break parsing", () => {
    const { node, errors } = parseTestBlock(
      `test-bind handler = (x) => { if (x) { x } else { 0 } }`
    );
    expect(eTest005s(errors)).toHaveLength(0);
    expect(node.testGroup.testBinds).toHaveLength(1);
    expect(node.testGroup.testBinds[0].identifier).toBe("handler");
  });

  test("function-form RHS does not absorb the following test-bind", () => {
    const { node } = parseTestBlock(
      `test-bind a = (x) => { x + 1 }\n` +
      `test-bind b = stubB`
    );
    expect(node.testGroup.testBinds).toHaveLength(2);
    expect(node.testGroup.testBinds[1].identifier).toBe("b");
    expect(node.testGroup.testBinds[1].expression).toBe("stubB");
  });
});

// ---------------------------------------------------------------------------
// §4 — Literal/identifier RHS shapes
// ---------------------------------------------------------------------------

describe("test-bind §4: literal RHS", () => {
  test("empty array literal RHS", () => {
    const { node, errors } = parseTestBlock(`test-bind fetchPosts = []`);
    expect(eTest005s(errors)).toHaveLength(0);
    expect(node.testGroup.testBinds).toHaveLength(1);
    expect(node.testGroup.testBinds[0].expression).toBe("[ ]");
  });

  test("number literal RHS", () => {
    const { node, errors } = parseTestBlock(`test-bind getCount = 42`);
    expect(eTest005s(errors)).toHaveLength(0);
    expect(node.testGroup.testBinds[0].expression).toBe("42");
  });

  test("identifier RHS", () => {
    const { node, errors } = parseTestBlock(`test-bind fetchUser = someStub`);
    expect(eTest005s(errors)).toHaveLength(0);
    expect(node.testGroup.testBinds[0].expression).toBe("someStub");
  });
});

// ---------------------------------------------------------------------------
// §5 — Duplicate identifier fires E-TEST-005
// ---------------------------------------------------------------------------

describe("test-bind §5: duplicate identifier", () => {
  test("same identifier declared twice in one ~{} block fires E-TEST-005", () => {
    const { node, errors } = parseTestBlock(
      `test-bind fetchUser = stubA\n` +
      `test-bind fetchUser = stubB`
    );
    const tests = eTest005s(errors);
    expect(tests).toHaveLength(1);
    expect(tests[0].message).toContain("duplicate");
    expect(tests[0].message).toContain("fetchUser");
    // First declaration is retained; the duplicate is dropped.
    expect(node.testGroup.testBinds).toHaveLength(1);
    expect(node.testGroup.testBinds[0].expression).toBe("stubA");
  });

  test("triplicate identifier fires two diagnostics", () => {
    const { errors } = parseTestBlock(
      `test-bind x = 1\n` +
      `test-bind x = 2\n` +
      `test-bind x = 3`
    );
    const tests = eTest005s(errors);
    expect(tests).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// §6 — `test-bind` inside `test "..." {...}` case body fires E-TEST-005
// ---------------------------------------------------------------------------

describe("test-bind §6: context violation inside test case body", () => {
  test("test-bind inside a test case body fires E-TEST-005", () => {
    const { errors } = parseTestBlock(
      `test "case" {\n` +
      `  test-bind fetchUser = stub\n` +
      `  assert true\n` +
      `}`
    );
    const tests = eTest005s(errors);
    expect(tests).toHaveLength(1);
    expect(tests[0].message.toLowerCase()).toContain("not legal");
    expect(tests[0].message.toLowerCase()).toContain("case body");
  });

  test("test-bind inside test-case body does NOT leak to testGroup.testBinds", () => {
    const { node } = parseTestBlock(
      `test "case" {\n` +
      `  test-bind fetchUser = stub\n` +
      `  assert true\n` +
      `}`
    );
    // Only sibling-of-test-case test-binds populate testGroup.testBinds.
    // The illegal test-bind inside the case body must NOT promote.
    expect(node.testGroup.testBinds).toHaveLength(0);
  });

  test("test-bind followed by assert in case body — assert still parses", () => {
    const { node } = parseTestBlock(
      `test "case" {\n` +
      `  test-bind x = 1\n` +
      `  assert 2 == 2\n` +
      `}`
    );
    expect(node.testGroup.tests).toHaveLength(1);
    expect(node.testGroup.tests[0].asserts).toHaveLength(1);
    expect(node.testGroup.tests[0].asserts[0].raw).toBe("2 == 2");
  });
});

// ---------------------------------------------------------------------------
// §7 — Malformed `test-bind` declarations
// ---------------------------------------------------------------------------

describe("test-bind §7: malformed declarations", () => {
  test("missing identifier fires E-TEST-005", () => {
    const { errors } = parseTestBlock(`test-bind = stub`);
    const tests = eTest005s(errors);
    expect(tests.length).toBeGreaterThanOrEqual(1);
    expect(tests[0].message.toLowerCase()).toContain("identifier");
  });

  test("missing `=` separator fires E-TEST-005", () => {
    const { errors } = parseTestBlock(`test-bind fetchUser stub`);
    const tests = eTest005s(errors);
    expect(tests.length).toBeGreaterThanOrEqual(1);
    expect(tests[0].message).toContain("=");
  });

  test("missing RHS expression fires E-TEST-005", () => {
    const { errors } = parseTestBlock(`test-bind fetchUser =`);
    const tests = eTest005s(errors);
    expect(tests.length).toBeGreaterThanOrEqual(1);
    expect(tests[0].message.toLowerCase()).toContain("right-hand-side");
  });
});

// ---------------------------------------------------------------------------
// §8 — Regression: existing `~{}` parsing unaffected
// ---------------------------------------------------------------------------

describe("test-bind §8: regression — existing ~{} parsing", () => {
  test("plain group with one test case still parses", () => {
    const { node, errors } = parseTestBlock(
      `"math"\n` +
      `test "addition" { assert 1 + 1 == 2 }`
    );
    expect(eTest005s(errors)).toHaveLength(0);
    expect(node.testGroup.name).toBe("math");
    expect(node.testGroup.tests).toHaveLength(1);
    expect(node.testGroup.tests[0].name).toBe("addition");
  });

  test("before/after blocks still parse", () => {
    const { node } = parseTestBlock(
      `before { let x = 1 }\n` +
      `test "uses x" { assert x == 1 }\n` +
      `after { cleanup() }`
    );
    expect(node.testGroup.before).toEqual(["let x = 1"]);
    expect(node.testGroup.after).toEqual(["cleanup ( )"]);
    expect(node.testGroup.tests).toHaveLength(1);
  });

  test("top-level asserts still create implicit anonymous test", () => {
    const { node } = parseTestBlock(`assert 1 == 1\nassert 2 == 2`);
    expect(node.testGroup.tests).toHaveLength(1);
    expect(node.testGroup.tests[0].name).toBe("");
    expect(node.testGroup.tests[0].asserts).toHaveLength(2);
  });

  test("multiple test cases each with multiple asserts still parse", () => {
    const { node } = parseTestBlock(
      `test "a" { assert 1 == 1\nassert 2 == 2 }\n` +
      `test "b" { assert 3 == 3 }`
    );
    expect(node.testGroup.tests).toHaveLength(2);
    expect(node.testGroup.tests[0].asserts).toHaveLength(2);
    expect(node.testGroup.tests[1].asserts).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// §9 — `testBinds` field is always present (default empty array)
// ---------------------------------------------------------------------------

describe("test-bind §9: testBinds field default", () => {
  test("a ~{} block with no test-bind has testBinds === []", () => {
    const { node } = parseTestBlock(`test "x" { assert 1 == 1 }`);
    expect(node.testGroup.testBinds).toBeDefined();
    expect(Array.isArray(node.testGroup.testBinds)).toBe(true);
    expect(node.testGroup.testBinds).toHaveLength(0);
  });

  test("an empty ~{} block has testBinds === []", () => {
    const { node } = parseTestBlock(``);
    expect(node.testGroup.testBinds).toEqual([]);
  });
});
