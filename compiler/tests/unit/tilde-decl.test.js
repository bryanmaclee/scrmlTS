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

// ---------------------------------------------------------------------------
// §48.3.3 reassignment-vs-declaration discrimination (Unit U regression)
// ---------------------------------------------------------------------------
// `tilde-decl` is the parser kind for any bare `name = expr` statement, but
// per §48.3.3 the SEMANTICS is reassignment when `name` is already bound
// elsewhere (let / const / lin-decl / param). The MustUseTracker MUST NOT
// register a fresh must-use entry for those — that's the original bug at
// compiler/native-parser/tag-frame.scrml:1492+1541 (`let consumedRhs = false`
// at fn scope; `consumedRhs = true` deeply nested; consumedRhs read in
// while-stmt body BEFORE the reassignment-as-declare fired, so markUsed was
// a no-op and E-MU-001 fired falsely at fn-scope exit).
// ---------------------------------------------------------------------------

describe("MustUseTracker: §48.3.3 — tilde-decl as reassignment to outer let → no error", () => {
  test("outer let-decl + nested tilde-decl reassignment + no use → no E-MU-001", () => {
    const errors = [];
    // Mirror of `fn f() { let consumedRhs = false; if (true) { consumedRhs = true } }`.
    // The inner `consumedRhs = true` parses to a tilde-decl; per §48.3.3 it is a
    // reassignment to the outer let-decl, NOT a fresh must-use declaration.
    checkLinear([
      { kind: "let-decl", name: "consumedRhs", init: "false", span: span(0) },
      { kind: "if-stmt", consequent: [
        { kind: "tilde-decl", name: "consumedRhs", init: "true", span: span(20) },
      ], span: span(10) },
    ], errors);
    const mu = errors.filter(e => e.code === "E-MU-001");
    expect(mu).toHaveLength(0);
  });

  test("tag-frame.scrml shape: outer let + while-stmt read + deeply-nested reassign → no E-MU-001", () => {
    const errors = [];
    // Mirror of the exact tag-frame.scrml:1492+1541 shape: `let X = false` at
    // fn scope; X read in while-stmt body; X reassigned in nested if branch.
    checkLinear([
      { kind: "let-decl", name: "consumedEq", init: "false", span: span(0) },
      { kind: "let-decl", name: "consumedRhs", init: "false", span: span(10) },
      { kind: "while-stmt", body: [
        { kind: "if-stmt", condition: "consumedEq && consumedRhs", consequent: [
          { kind: "bare-expr", expr: "break", span: span(30) },
        ], span: span(25) },
        { kind: "if-stmt", consequent: [
          { kind: "if-stmt", consequent: [
            { kind: "tilde-decl", name: "consumedRhs", init: "true", span: span(60) },
          ], span: span(55) },
        ], span: span(50) },
      ], span: span(20) },
    ], errors);
    const mu = errors.filter(e => e.code === "E-MU-001");
    expect(mu).toHaveLength(0);
  });

  test("outer const-decl + tilde-decl reassignment → no E-MU-001 (host-side mutability is type-system's job)", () => {
    // Note: const-mutation is rejected by a separate check (E-CONST-WRITE / similar);
    // checkLinear only owns the must-use discrimination. The reassignment must not
    // produce a spurious E-MU-001 regardless.
    const errors = [];
    checkLinear([
      { kind: "const-decl", name: "x", init: "1", span: span(0) },
      { kind: "tilde-decl", name: "x", init: "2", span: span(10) },
    ], errors);
    const mu = errors.filter(e => e.code === "E-MU-001");
    expect(mu).toHaveLength(0);
  });

  test("outer lin-decl + tilde-decl reassignment → no E-MU-001 (lin-decl is in scope)", () => {
    const errors = [];
    // lin-decl + tilde-decl reassignment is sketchy semantically (E-LIN-* may
    // fire from other code) but the must-use channel itself must not fire.
    checkLinear([
      { kind: "lin-decl", name: "y", init: "fetchUser()", span: span(0) },
      { kind: "tilde-decl", name: "y", init: "fetchOther()", span: span(20) },
    ], errors);
    const mu = errors.filter(e => e.code === "E-MU-001");
    expect(mu).toHaveLength(0);
  });

  test("fresh tilde-decl (name NOT in any enclosing scope) still fires E-MU-001 when unused", () => {
    // Regression-guard: the fix must NOT silence E-MU-001 for genuine
    // unused-must-use cases. A tilde-decl whose name is not bound elsewhere
    // remains a fresh must-use declaration.
    const errors = [];
    checkLinear([
      { kind: "tilde-decl", name: "trulyFresh", init: "computeIt()", span: span(0) },
    ], errors);
    const mu = errors.filter(e => e.code === "E-MU-001");
    expect(mu).toHaveLength(1);
    expect(mu[0].message).toContain("trulyFresh");
  });
});

describe("MustUseTracker: §48.3.3 — tilde-decl as reassignment to function param → no error", () => {
  test("fn param reassigned via tilde-decl (no later read) → no E-MU-001", () => {
    const errors = [];
    // Mirror of `fn f(x) { x = 5 }` — `x = 5` parses to a tilde-decl. Per
    // §48.3.3 it is a reassignment to the fn param, NOT a fresh must-use.
    // The function-decl recursion threads paramNames so checkLinear's
    // knownBindings includes `x`.
    checkLinear([
      { kind: "function-decl", name: "f", params: [
        { name: "x" },
      ], body: [
        { kind: "tilde-decl", name: "x", init: "5", span: span(20) },
      ], span: span(0) },
    ], errors);
    const mu = errors.filter(e => e.code === "E-MU-001");
    expect(mu).toHaveLength(0);
  });

  test("fn param of nested function-decl is recognised (no leak from outer scope)", () => {
    const errors = [];
    // Two unrelated fns each take `x`; the inner reassignment must not be
    // mistaken for outer-scope mutation, AND the must-use channel must not
    // fire for either.
    checkLinear([
      { kind: "function-decl", name: "outer", params: [{ name: "x" }], body: [
        { kind: "function-decl", name: "inner", params: [{ name: "x" }], body: [
          { kind: "tilde-decl", name: "x", init: "99", span: span(40) },
        ], span: span(20) },
      ], span: span(0) },
    ], errors);
    const mu = errors.filter(e => e.code === "E-MU-001");
    expect(mu).toHaveLength(0);
  });
});

describe("MustUseTracker: §48.3.3 — closure captures outer scope bindings", () => {
  test("tilde-decl inside closure body, name bound at outer fn scope → no E-MU-001", () => {
    const errors = [];
    // The closure body inherits the outer scope's known bindings via parentBindings.
    checkLinear([
      { kind: "let-decl", name: "z", init: "0", span: span(0) },
      { kind: "closure", captures: [], body: [
        { kind: "tilde-decl", name: "z", init: "1", span: span(20) },
      ], span: span(10) },
    ], errors);
    const mu = errors.filter(e => e.code === "E-MU-001");
    expect(mu).toHaveLength(0);
  });
});
