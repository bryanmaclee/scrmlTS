/**
 * tilde-decl AST node — Unit Tests
 *
 * Tests that bare `name = expr` statements (no keyword) in logic blocks
 * produce `tilde-decl` AST nodes, while dotted assignments, augmented
 * assignments, comparisons, and keyword declarations remain unaffected.
 *
 * Also tests MustUseTracker enforcement (E-MU-001) via checkLinear.
 */

import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";
import { checkLinear, MustUseTracker } from "../../src/type-system.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseLogicBody(source) {
  const bsOut = splitBlocks("test.scrml", source);
  const { ast } = buildAST(bsOut);
  // Find the logic node and return its body
  const logic = ast.nodes.find(n => n.kind === "logic");
  return logic ? logic.body : [];
}

function findNode(body, kind) {
  return body.find(n => n && n.kind === kind);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

// NOTE: AST-level tests require ast-builder tilde-decl support (Step 1).
// Skipped until Step 1 changes are merged into this branch.
describe("tilde-decl: bare `name = expr` produces tilde-decl AST node", () => {
  test("simple string assignment → tilde-decl", () => {
    const body = parseLogicBody('${ name = "Alice" }');
    const node = findNode(body, "tilde-decl");
    expect(node).toBeDefined();
    expect(node.kind).toBe("tilde-decl");
    expect(node.name).toBe("name");
    expect(node.init).toContain("Alice");
    expect(node.span).toBeDefined();
  });

  test("numeric assignment → tilde-decl", () => {
    const body = parseLogicBody("${ count = 42 }");
    const node = findNode(body, "tilde-decl");
    expect(node).toBeDefined();
    expect(node.kind).toBe("tilde-decl");
    expect(node.name).toBe("count");
    expect(node.init).toContain("42");
  });

  test("expression assignment → tilde-decl", () => {
    const body = parseLogicBody("${ total = price + tax }");
    const node = findNode(body, "tilde-decl");
    expect(node).toBeDefined();
    expect(node.kind).toBe("tilde-decl");
    expect(node.name).toBe("total");
  });

  test("tilde-decl has a valid span", () => {
    const body = parseLogicBody('${ greeting = "hello" }');
    const node = findNode(body, "tilde-decl");
    expect(node).toBeDefined();
    expect(node.span).toBeDefined();
    expect(typeof node.span.file).toBe("string");
    expect(typeof node.span.start).toBe("number");
    expect(typeof node.span.end).toBe("number");
  });

  test("tilde-decl has an id", () => {
    const body = parseLogicBody('${ x = 1 }');
    const node = findNode(body, "tilde-decl");
    expect(node).toBeDefined();
    expect(typeof node.id).toBe("number");
  });
});

describe("tilde-decl exclusions: patterns that must NOT become tilde-decl", () => {
  test("dotted LHS (obj.prop = val) → bare-expr, not tilde-decl", () => {
    const body = parseLogicBody("${ obj.prop = val }");
    const tildeNode = findNode(body, "tilde-decl");
    expect(tildeNode).toBeUndefined();
    const bareNode = findNode(body, "bare-expr");
    expect(bareNode).toBeDefined();
  });

  test("augmented assignment (name += val) → bare-expr, not tilde-decl", () => {
    const body = parseLogicBody("${ count += 1 }");
    const tildeNode = findNode(body, "tilde-decl");
    expect(tildeNode).toBeUndefined();
    const bareNode = findNode(body, "bare-expr");
    expect(bareNode).toBeDefined();
  });

  test("comparison (name == val) → bare-expr, not tilde-decl", () => {
    const body = parseLogicBody("${ name == val }");
    const tildeNode = findNode(body, "tilde-decl");
    expect(tildeNode).toBeUndefined();
    const bareNode = findNode(body, "bare-expr");
    expect(bareNode).toBeDefined();
  });

  test("triple-equals (name === val) → bare-expr, not tilde-decl", () => {
    const body = parseLogicBody("${ name === val }");
    const tildeNode = findNode(body, "tilde-decl");
    expect(tildeNode).toBeUndefined();
    const bareNode = findNode(body, "bare-expr");
    expect(bareNode).toBeDefined();
  });

  test("let declaration → let-decl, not tilde-decl", () => {
    const body = parseLogicBody('${ let name = "Alice" }');
    const tildeNode = findNode(body, "tilde-decl");
    expect(tildeNode).toBeUndefined();
    const letNode = findNode(body, "let-decl");
    expect(letNode).toBeDefined();
    expect(letNode.name).toBe("name");
  });

  test("const declaration → const-decl, not tilde-decl", () => {
    const body = parseLogicBody('${ const name = "Alice" }');
    const tildeNode = findNode(body, "tilde-decl");
    expect(tildeNode).toBeUndefined();
    const constNode = findNode(body, "const-decl");
    expect(constNode).toBeDefined();
    expect(constNode.name).toBe("name");
  });

  test("function call (foo(bar)) → bare-expr, not tilde-decl", () => {
    const body = parseLogicBody("${ foo(bar) }");
    const tildeNode = findNode(body, "tilde-decl");
    expect(tildeNode).toBeUndefined();
    const bareNode = findNode(body, "bare-expr");
    expect(bareNode).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// MustUseTracker — E-MU-001 enforcement via checkLinear
// ---------------------------------------------------------------------------

function span(start = 0, file = "/test/app.scrml") {
  return { file, start, end: start + 10, line: 1, col: start + 1 };
}

describe("MustUseTracker: tilde-decl + reference → no error", () => {
  test("tilde-decl declared and referenced in bare-expr produces no errors", () => {
    const errors = [];
    checkLinear([
      { kind: "tilde-decl", name: "config", init: "getConfig()", span: span(0) },
      { kind: "bare-expr", expr: "useConfig(config)", span: span(20) },
    ], errors);
    const mu = errors.filter(e => e.code === "E-MU-001");
    expect(mu).toHaveLength(0);
  });

  test("tilde-decl referenced in another tilde-decl init → first var no error", () => {
    const errors = [];
    checkLinear([
      { kind: "tilde-decl", name: "base", init: "10", span: span(0) },
      { kind: "tilde-decl", name: "derived", init: "base + 5", span: span(10) },
      { kind: "bare-expr", expr: "use(derived)", span: span(20) },
    ], errors);
    const mu = errors.filter(e => e.code === "E-MU-001");
    expect(mu).toHaveLength(0);
  });
});

describe("MustUseTracker: tilde-decl + no reference → E-MU-001", () => {
  test("tilde-decl declared but never referenced produces E-MU-001", () => {
    const errors = [];
    checkLinear([
      { kind: "tilde-decl", name: "config", init: "getConfig()", span: span(0) },
    ], errors);
    const mu = errors.filter(e => e.code === "E-MU-001");
    expect(mu).toHaveLength(1);
    expect(mu[0].message).toContain("config");
    expect(mu[0].message).toContain("E-MU-001");
  });

  test("E-MU-001 error has correct severity and includes help text", () => {
    const errors = [];
    checkLinear([
      { kind: "tilde-decl", name: "unused", init: "42", span: span(0) },
    ], errors);
    const mu = errors.filter(e => e.code === "E-MU-001");
    expect(mu).toHaveLength(1);
    expect(mu[0].severity).toBe("error");
    expect(mu[0].message).toContain("suppress this warning");
  });
});

describe("MustUseTracker: tilde-decl + multiple references → no error", () => {
  test("tilde-decl referenced twice produces no errors", () => {
    const errors = [];
    checkLinear([
      { kind: "tilde-decl", name: "data", init: "fetchData()", span: span(0) },
      { kind: "bare-expr", expr: "process(data)", span: span(20) },
      { kind: "bare-expr", expr: "log(data)", span: span(40) },
    ], errors);
    const mu = errors.filter(e => e.code === "E-MU-001");
    expect(mu).toHaveLength(0);
  });
});

describe("MustUseTracker: tilde-decl in nested scope", () => {
  test("tilde-decl in closure body, used in closure body → no error", () => {
    const errors = [];
    checkLinear([
      { kind: "closure", captures: [], body: [
        { kind: "tilde-decl", name: "inner", init: "1", span: span(0) },
        { kind: "bare-expr", expr: "use(inner)", span: span(10) },
      ], span: span(0) },
    ], errors);
    const mu = errors.filter(e => e.code === "E-MU-001");
    expect(mu).toHaveLength(0);
  });

  test("tilde-decl in closure body, NOT used → E-MU-001", () => {
    const errors = [];
    checkLinear([
      { kind: "closure", captures: [], body: [
        { kind: "tilde-decl", name: "forgotten", init: "1", span: span(0) },
      ], span: span(0) },
    ], errors);
    const mu = errors.filter(e => e.code === "E-MU-001");
    expect(mu).toHaveLength(1);
    expect(mu[0].message).toContain("forgotten");
  });
});

describe("MustUseTracker: word-boundary correctness", () => {
  test("substring match does not count as reference (name vs nameExtra)", () => {
    const errors = [];
    checkLinear([
      { kind: "tilde-decl", name: "name", init: "'Alice'", span: span(0) },
      { kind: "bare-expr", expr: "useNameExtra(nameExtra)", span: span(20) },
    ], errors);
    const mu = errors.filter(e => e.code === "E-MU-001");
    expect(mu).toHaveLength(1);
    expect(mu[0].message).toContain("name");
  });

  test("exact word-boundary match does count as reference", () => {
    const errors = [];
    checkLinear([
      { kind: "tilde-decl", name: "name", init: "'Alice'", span: span(0) },
      { kind: "bare-expr", expr: "use(name)", span: span(20) },
    ], errors);
    const mu = errors.filter(e => e.code === "E-MU-001");
    expect(mu).toHaveLength(0);
  });
});
