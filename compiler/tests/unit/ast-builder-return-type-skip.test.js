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
 *   §12 INLINE-STRUCT return type `-> { k: T, … }` — body parses, not the struct (ss25-2)
 *   §13 fn shorthand inline-struct return — body parses (ss25-2)
 *   §14 nested inline-struct return `-> { a: { b: T } }` — body parses (ss25-2)
 *   §15 union with inline-struct member `-> int | { e: T }` — body parses (ss25-2)
 *   §16 array-of-inline-struct return `-> { id: T }[]` — body parses (ss25-2)
 *   §17 inline-struct return + multi-statement body — all statements parse (ss25-2)
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

  // -------------------------------------------------------------------------
  // ss25-2: INLINE-STRUCT return type disambiguation.
  //
  // Before the fix, the return-type-token loop broke at the FIRST `{` at
  // depth 0 — but an inline-struct return type `-> { k: T, … }` opens a `{`
  // that is part of the TYPE, not the fn body. The splitter mistook the
  // struct opener for the body, so the REAL body `{ return … }` became a
  // dangling block and `return active;`-style statements emitted standalone
  // → E-SCOPE-001 on the first field. The fix brace-balances the inline
  // struct and only treats the brace AFTER the completed return type as the
  // body. Mirror: a NAMED return type already worked (the §1-§11 cases).
  // -------------------------------------------------------------------------

  // §12: inline-struct return type — the BODY must be the real body, and the
  // returnTypeAnnotation must capture the inline struct (not be empty).
  test("§12 inline-struct return type -> { k: T } — body parses, not the struct (ss25-2)", () => {
    const fn = parseFunctionDecl(
      'function f() -> { active: int, name: string } { return { active: 1, name: "x" } }');
    expect(fn).toBeDefined();
    expect(fn.hasReturnType).toBe(true);
    // The inline struct is the RETURN TYPE, not the body.
    expect(fn.returnTypeAnnotation).toContain("active");
    expect(fn.returnTypeAnnotation).toContain("name");
    // The body is the REAL body: a single return-stmt — NOT the struct fields
    // misparsed as bare statements.
    expect(fn.body.length).toBe(1);
    expect(fn.body[0].kind).toBe("return-stmt");
  });

  // §13: fn shorthand with inline-struct return type (Site 3 / 4).
  test("§13 fn shorthand inline-struct return — body parses (ss25-2)", () => {
    const fn = parseFnDecl(
      'fn f() -> { active: int, name: string } { return { active: 1, name: "x" } }');
    expect(fn).toBeDefined();
    expect(fn.fnKind).toBe("fn");
    expect(fn.returnTypeAnnotation).toContain("active");
    expect(fn.body.length).toBe(1);
    expect(fn.body[0].kind).toBe("return-stmt");
  });

  // §14: nested inline-struct return type — `-> { a: { b: int } }`.
  test("§14 nested inline-struct return -> { a: { b: T } } — body parses (ss25-2)", () => {
    const fn = parseFunctionDecl(
      "function f() -> { a: { b: int } } { return { a: { b: 1 } } }");
    expect(fn).toBeDefined();
    expect(fn.returnTypeAnnotation).toContain("a");
    expect(fn.returnTypeAnnotation).toContain("b");
    expect(fn.body.length).toBe(1);
    expect(fn.body[0].kind).toBe("return-stmt");
  });

  // §15: union return type with an inline-struct member — `-> int | { e: T }`.
  // The `{` after `|` is a type-struct opener, not the body.
  test("§15 union with inline-struct member -> int | { e: T } — body parses (ss25-2)", () => {
    const fn = parseFunctionDecl(
      'function f(x: int) -> int | { e: string } { if x > 0 { return 1 } return { e: "bad" } }');
    expect(fn).toBeDefined();
    expect(fn.returnTypeAnnotation).toContain("e");
    // Body holds both the if-stmt and the trailing return-stmt.
    expect(fn.body.length).toBe(2);
    expect(fn.body.map(s => s.kind)).toEqual(["if-stmt", "return-stmt"]);
  });

  // §16: array-of-inline-struct return type — `-> { id: T }[]`.
  test("§16 array-of-inline-struct return -> { id: T }[] — body parses (ss25-2)", () => {
    const fn = parseFunctionDecl(
      "function f() -> { id: int }[] { return [{ id: 1 }] }");
    expect(fn).toBeDefined();
    expect(fn.returnTypeAnnotation).toContain("id");
    expect(fn.body.length).toBe(1);
    expect(fn.body[0].kind).toBe("return-stmt");
  });

  // §17: inline-struct return type + multi-statement body — every statement
  // must land in the body, none leaked from the struct.
  test("§17 inline-struct return + multi-statement body — all statements parse (ss25-2)", () => {
    const fn = parseFunctionDecl(
      'function f() -> { active: int, name: string } { let t = 1 let u = "y" return { active: t, name: u } }');
    expect(fn).toBeDefined();
    expect(fn.returnTypeAnnotation).toContain("active");
    expect(fn.body.length).toBe(3);
    expect(fn.body.map(s => s.kind)).toEqual(["let-decl", "let-decl", "return-stmt"]);
  });
});
