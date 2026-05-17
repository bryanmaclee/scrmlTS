/**
 * ast-builder-parseparamlist-defaults — A3 regression suite.
 *
 * Bug (A2 anomaly-2 follow-up): parseParamList() in ast-builder.js accumulated
 * raw token text without splitting on the §7.3.2 default-value `=` separator.
 * For `function ch(n = 0)`, the resulting param object was `{ name: "n=0" }`
 * (or `{ name: "n", typeAnnotation: "number=0" }` when a type was present),
 * which caused the type-system's function-decl scope binder to register the
 * malformed name. Body references like `n` then surfaced as `E-SCOPE-001:
 * Undeclared identifier`.
 *
 * Fix (this suite verifies): parseParamList tracks `inDefault` mode; a bare
 * PUNCT `=` at depth==1 switches the accumulator from `cur` (name + type) to
 * `defBuf` (default value). Compound operators (`==`, `===`, `=>`, `+=`,
 * `-=`, `*=`, `/=`, `%=`, `&=`, `|=`, `^=`, `<<=`, `>>=`, `**=`, `??=`,
 * `||=`, `&&=`, `!=`, `!==`, `<=`, `>=`) all tokenize as OPERATOR (multi-char),
 * so the bare PUNCT `=` cannot collide.
 *
 * Per SPEC §7.3.2 (default parameter values):
 *   "Both `function` and `fn` declarations support default parameter values
 *    using the `= value` syntax. Default parameters compile directly to
 *    JavaScript default parameter syntax."
 *
 * Param shape this suite asserts:
 *   { name: string, typeAnnotation?: string, defaultValue?: string, isLin?: boolean }
 */

import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";

function parse(src) {
  const filePath = "/test/fixture.scrml";
  const bs = splitBlocks(filePath, src);
  return buildAST(bs);
}

function findAllNodesOfKind(ast, kind) {
  const out = [];
  function walk(n) {
    if (!n || typeof n !== "object") return;
    if (n.kind === kind) out.push(n);
    for (const k of Object.keys(n)) {
      const v = n[k];
      if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === "object" && k !== "span") walk(v);
    }
  }
  walk(ast);
  return out;
}

function getFn(result, name) {
  const fns = findAllNodesOfKind(result.ast, "function-decl");
  return fns.find(f => f.name === name);
}

// ---------------------------------------------------------------------------
// Primary shapes — the five §7.3.2 forms
// ---------------------------------------------------------------------------

describe("parseParamList — default-value parameter forms (§7.3.2)", () => {
  test("simple literal default — function foo(a, b = 0)", () => {
    const result = parse("${ function foo(a, b = 0) { return a + b } }");
    const fn = getFn(result, "foo");
    expect(fn).toBeDefined();
    expect(fn.params).toEqual([
      { name: "a" },
      { name: "b", defaultValue: "0" },
    ]);
  });

  test("expression default — function foo(a = b + 1)", () => {
    const result = parse("${ function foo(a = b + 1) { return a } }");
    const fn = getFn(result, "foo");
    expect(fn).toBeDefined();
    expect(fn.params).toHaveLength(1);
    expect(fn.params[0].name).toBe("a");
    // Whitespace between tokens is not byte-stable; assert the meaningful tokens.
    expect(fn.params[0].defaultValue).toMatch(/^b\s*\+\s*1$/);
  });

  test("string default — function foo(a = \"string\")", () => {
    const result = parse('${ function foo(a = "string") { return a } }');
    const fn = getFn(result, "foo");
    expect(fn).toBeDefined();
    expect(fn.params).toHaveLength(1);
    expect(fn.params[0].name).toBe("a");
    // STRING tokens lose their delimiter at tokenization. parseParamList
    // re-encodes via JSON.stringify so the round-tripped default-value remains
    // a syntactically-valid JS string literal.
    expect(fn.params[0].defaultValue).toBe('"string"');
  });

  test("multiple defaults — function clamp(value, min = 0, max = 100)", () => {
    const result = parse("${ function clamp(value, min = 0, max = 100) { return value } }");
    const fn = getFn(result, "clamp");
    expect(fn).toBeDefined();
    expect(fn.params).toEqual([
      { name: "value" },
      { name: "min", defaultValue: "0" },
      { name: "max", defaultValue: "100" },
    ]);
  });

  test("default referencing earlier param — function makeSpan(start, end, line = 1, col = start)", () => {
    const result = parse("${ function makeSpan(start, end, line = 1, col = start) { return col } }");
    const fn = getFn(result, "makeSpan");
    expect(fn).toBeDefined();
    expect(fn.params).toEqual([
      { name: "start" },
      { name: "end" },
      { name: "line", defaultValue: "1" },
      { name: "col", defaultValue: "start" },
    ]);
  });
});

// ---------------------------------------------------------------------------
// Combined with type annotations and lin
// ---------------------------------------------------------------------------

describe("parseParamList — default values combined with other annotations", () => {
  test("type annotation + default — function withType(n: number = 0)", () => {
    const result = parse("${ function withType(n: number = 0) { return n } }");
    const fn = getFn(result, "withType");
    expect(fn).toBeDefined();
    expect(fn.params).toEqual([
      { name: "n", typeAnnotation: "number", defaultValue: "0" },
    ]);
  });

  test("lin prefix + default on sibling — function f(lin x, b = 0)", () => {
    const result = parse("${ function f(lin x, b = 0) { return b } }");
    const fn = getFn(result, "f");
    expect(fn).toBeDefined();
    expect(fn.params).toEqual([
      { name: "x", isLin: true },
      { name: "b", defaultValue: "0" },
    ]);
  });
});

// ---------------------------------------------------------------------------
// Compound-operator disambiguation
// ---------------------------------------------------------------------------

describe("parseParamList — compound `=` operators inside defaults are not separators", () => {
  test("equality `==` inside parenthesized default — function f(x = (a == b))", () => {
    const result = parse("${ function f(x = (a == b)) { return x } }");
    const fn = getFn(result, "f");
    expect(fn).toBeDefined();
    expect(fn.params).toHaveLength(1);
    expect(fn.params[0].name).toBe("x");
    // The default's raw text contains the `==` operator and parens, regardless of whitespace.
    expect(fn.params[0].defaultValue).toMatch(/==/);
    expect(fn.params[0].defaultValue).toMatch(/^\(/);
    expect(fn.params[0].defaultValue).toMatch(/\)$/);
  });

  test("arrow function as default — function f(cb = () => 42)", () => {
    const result = parse("${ function f(cb = () => 42) { return cb() } }");
    const fn = getFn(result, "f");
    expect(fn).toBeDefined();
    expect(fn.params).toHaveLength(1);
    expect(fn.params[0].name).toBe("cb");
    expect(fn.params[0].defaultValue).toMatch(/=>/);
    expect(fn.params[0].defaultValue).toMatch(/42/);
  });
});

// ---------------------------------------------------------------------------
// Regression — the tab.scrml-specific shape that originally surfaced E-SCOPE-001
// ---------------------------------------------------------------------------

describe("parseParamList — tab.scrml regression (n = 0 / n = 1)", () => {
  test("function ch(n = 0) { return n } — `n` binds correctly in fn body", () => {
    const result = parse("${ function ch(n = 0) { return (pos + n < raw.length) ? raw[pos + n] : \"\" } }");
    const fn = getFn(result, "ch");
    expect(fn).toBeDefined();
    expect(fn.params).toEqual([
      { name: "n", defaultValue: "0" },
    ]);
  });

  test("function advance(n = 1) { ... } — `n` binds correctly", () => {
    const result = parse("${ function advance(n = 1) { let i = 0; while (i < n) { i = i + 1 } } }");
    const fn = getFn(result, "advance");
    expect(fn).toBeDefined();
    expect(fn.params).toEqual([
      { name: "n", defaultValue: "1" },
    ]);
  });
});

// ---------------------------------------------------------------------------
// Non-default cases — verify the existing shapes still parse identically
// ---------------------------------------------------------------------------

describe("parseParamList — non-default shapes preserved", () => {
  test("no defaults — function foo(a, b, c)", () => {
    const result = parse("${ function foo(a, b, c) { return a + b + c } }");
    const fn = getFn(result, "foo");
    expect(fn).toBeDefined();
    expect(fn.params).toEqual([
      { name: "a" },
      { name: "b" },
      { name: "c" },
    ]);
  });

  test("type annotations only — function foo(a: number, b: string)", () => {
    const result = parse("${ function foo(a: number, b: string) { return b } }");
    const fn = getFn(result, "foo");
    expect(fn).toBeDefined();
    expect(fn.params).toEqual([
      { name: "a", typeAnnotation: "number" },
      { name: "b", typeAnnotation: "string" },
    ]);
  });

  test("empty param list — function noop()", () => {
    const result = parse("${ function noop() { return 0 } }");
    const fn = getFn(result, "noop");
    expect(fn).toBeDefined();
    expect(fn.params).toEqual([]);
  });
});
