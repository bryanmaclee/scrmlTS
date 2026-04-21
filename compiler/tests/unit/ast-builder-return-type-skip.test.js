/**
 * AST Builder — Return Type Annotation Skip Tests
 *
 * Verifies that function declarations with return type annotations — e.g.
 * `function foo(x: Mario): Mario { return x }` — parse their body correctly.
 *
 * Root cause (before fix): after parsing params and the optional `!` canFail
 * marker, the parser checked for `{` to start the body. Functions with `: TypeName`
 * between `)` and `{` left `body` as empty `[]` and leaked the body tokens into
 * surrounding output.
 *
 * The fix inserts a return type skip block at all 3 function-decl creation sites
 * in ast-builder.js: parseOneStatement nested function (Site 1), top-level
 * `function` in the main while loop (Site 2), and `fn` shorthand (Site 3).
 *
 * Coverage:
 *   §1  simple return type  — body is non-empty
 *   §2  generic return type — Array<T> — body is non-empty
 *   §3  no return type      — regression guard — body still non-empty
 *   §4  canFail before return type — function()!: Mario — body non-empty
 *   §5  server function with return type — body non-empty
 *   §6  fn shorthand with return type — body non-empty (Site 3)
 *   §7  nested function inside logic block — body non-empty (Site 1)
 *   §8  multi-generic return type — Map<string, Mario> — body non-empty
 *   §9  return type with dotted path — Result.Ok — body non-empty
 *   §10 fn shorthand with `-> Type` arrow return — body non-empty (Bug G)
 *   §11 fn shorthand with `-> Type | not` union return — body non-empty (Bug G)
 */

import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parse(source) {
  const bsOut = splitBlocks("test.scrml", source);
  return buildAST(bsOut);
}

/**
 * Parse a logic block containing a function declaration and return the
 * function-decl node.
 */
function parseFunctionDecl(funcSource) {
  const source = `\${ ${funcSource} }`;
  const { ast } = parse(source);
  const logic = ast.nodes[0];
  return logic.body.find(n => n.kind === "function-decl");
}

/**
 * Parse a logic block containing an fn shorthand and return the function-decl node.
 */
function parseFnDecl(fnSource) {
  const source = `\${ ${fnSource} }`;
  const { ast } = parse(source);
  const logic = ast.nodes[0];
  return logic.body.find(n => n.kind === "function-decl");
}

// ---------------------------------------------------------------------------
// §1: simple return type — body is non-empty
// ---------------------------------------------------------------------------

describe("ast-builder return type skip", () => {
  test("§1 simple return type — body is non-empty", () => {
    const fn = parseFunctionDecl("function eatPowerUp(mario: Mario, powerUp: PowerUp): Mario { return mario }");
    expect(fn).toBeDefined();
    expect(fn.kind).toBe("function-decl");
    expect(fn.name).toBe("eatPowerUp");
    expect(fn.body).toBeDefined();
    expect(fn.body.length).toBeGreaterThan(0);
  });

  // §2: generic return type — Array<T>
  test("§2 generic return type Array<T> — body is non-empty", () => {
    const fn = parseFunctionDecl("function getItems(): Array<Item> { return items }");
    expect(fn).toBeDefined();
    expect(fn.body.length).toBeGreaterThan(0);
  });

  // §3: no return type — regression guard
  test("§3 no return type — body is still non-empty (regression guard)", () => {
    const fn = parseFunctionDecl("function foo(x: string) { return x }");
    expect(fn).toBeDefined();
    expect(fn.body.length).toBeGreaterThan(0);
  });

  // §4: canFail before return type
  test("§4 canFail ! before return type — body is non-empty", () => {
    const fn = parseFunctionDecl("function load()!: Mario { return mario }");
    expect(fn).toBeDefined();
    expect(fn.canFail).toBe(true);
    expect(fn.body.length).toBeGreaterThan(0);
  });

  // §5: server function with return type
  test("§5 server function with return type — body is non-empty", () => {
    const source = `\${ server function save(data: FormData): SaveResult { return result } }`;
    const { ast } = parse(source);
    const logic = ast.nodes[0];
    const fn = logic.body.find(n => n.kind === "function-decl");
    expect(fn).toBeDefined();
    expect(fn.isServer).toBe(true);
    expect(fn.body.length).toBeGreaterThan(0);
  });

  // §6: fn shorthand with return type (Site 3)
  test("§6 fn shorthand with return type — body is non-empty", () => {
    const fn = parseFnDecl("fn compute(x: Num): Result { return x }");
    expect(fn).toBeDefined();
    expect(fn.fnKind).toBe("fn");
    expect(fn.body.length).toBeGreaterThan(0);
  });

  // §7: nested function inside logic block (Site 1 — parseOneStatement)
  test("§7 nested function inside logic block — body is non-empty", () => {
    const source = `\${ function outer() { function inner(x: Mario): Mario { return x } } }`;
    const { ast } = parse(source);
    const logic = ast.nodes[0];
    const outer = logic.body.find(n => n.kind === "function-decl" && n.name === "outer");
    expect(outer).toBeDefined();
    const inner = outer.body.find(n => n.kind === "function-decl" && n.name === "inner");
    expect(inner).toBeDefined();
    expect(inner.body.length).toBeGreaterThan(0);
  });

  // §8: multi-generic return type — Map<string, Mario>
  test("§8 multi-generic Map<K,V> return type — body is non-empty", () => {
    const fn = parseFunctionDecl("function index(items: Array<Mario>): Map<string, Mario> { return m }");
    expect(fn).toBeDefined();
    expect(fn.body.length).toBeGreaterThan(0);
  });

  // §9: return type with dotted name — Result.Ok style
  test("§9 dotted return type path — body is non-empty", () => {
    const fn = parseFunctionDecl("function getStatus(): Result.Ok { return ok }");
    expect(fn).toBeDefined();
    expect(fn.body.length).toBeGreaterThan(0);
  });

  // §10: Bug G regression — fn shorthand with `-> Type` arrow return.
  //
  // Before the fix, the fn-shorthand parsing branch only handled `: TypeName`
  // (colon form). A declaration like `fn foo(p: T) -> string { body }` would
  // leave body = [] (empty) AND leak the `-`, `>`, type tokens, and `{` as
  // subsequent top-level bare-exprs. 6nz hit this writing playground-one;
  // examples/14-mario-state-machine.scrml already shipped the pattern.
  test("§10 fn shorthand with -> return type — body is non-empty (Bug G)", () => {
    const fn = parseFnDecl("fn colorName(c: Color) -> string { return c }");
    expect(fn).toBeDefined();
    expect(fn.fnKind).toBe("fn");
    expect(fn.body.length).toBeGreaterThan(0);
  });

  // §11: Bug G regression — fn shorthand with `-> Type | not` union return.
  // Covers the same fix path with a more elaborate type expression.
  test("§11 fn shorthand with -> union return type — body is non-empty (Bug G)", () => {
    const fn = parseFnDecl("fn safeDiv(a: number, b: number) -> number | not { return a / b }");
    expect(fn).toBeDefined();
    expect(fn.fnKind).toBe("fn");
    expect(fn.body.length).toBeGreaterThan(0);
  });
});
