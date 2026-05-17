/**
 * ast-builder-destructuring-patterns.test.js — A5 (2026-05-17)
 *
 * Verifies that ast-builder.js emits structured DestructurePattern AST nodes
 * for destructured `const`/`let` declarations and destructured for-of LHS.
 * This retires A1's text-and-regex extractDestructuredNames workaround in
 * type-system.ts by moving the destructuring shape ONTO the AST.
 *
 * AST shape per compiler/src/types/ast.ts:
 *
 *   { kind: "destructure-array",
 *     elements: Array<
 *       | { kind: "name",   name: string, default?: string }
 *       | { kind: "nested", pattern: DestructurePattern, default?: string }
 *       | { kind: "hole" }
 *     >,
 *     rest?: string
 *   }
 *
 *   { kind: "destructure-object",
 *     properties: Array<
 *       | { kind: "name",   fieldName: string, bindName: string, default?: string }
 *       | { kind: "nested", fieldName: string, pattern: DestructurePattern, default?: string }
 *     >,
 *     rest?: string
 *   }
 *
 * Coverage:
 *   §A — const-decl array patterns (incl. rest, hole, nested)
 *   §B — const-decl object patterns (incl. shorthand, rename, default, rest, nested)
 *   §C — let-decl mirror cases
 *   §D — for-of LHS patterns (array + object, with rest/default/nested)
 *   §E — span and structural-shape sanity
 */

import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";

/**
 * Build an AST for a tiny program wrapping the given logic-block source and
 * return the array of logic-block child nodes.
 *
 * The AST shape: `markup{tag:"program"} → children[] → logic{body[]}`.
 * We descend to the first `logic` child and return its body.
 */
function logicNodesFor(src) {
  const wrapped = `<program>\n\${\n${src}\n}\n</program>\n`;
  const bs = splitBlocks("/test/app.scrml", wrapped);
  const { ast } = buildAST(bs);
  // Find the program markup node, then the logic child
  const prog = (ast.nodes ?? []).find((n) => n && n.kind === "markup" && n.tag === "program");
  expect(prog).toBeDefined();
  const logicChild = (prog.children ?? []).find((c) => c && c.kind === "logic");
  expect(logicChild).toBeDefined();
  return logicChild.body ?? [];
}

/** Find the first node of a given kind in a list. */
function firstOfKind(nodes, kind) {
  return nodes.find((n) => n && n.kind === kind);
}

// ---------------------------------------------------------------------------
// §A — const-decl array patterns
// ---------------------------------------------------------------------------

describe("§A: const-decl array destructure patterns", () => {
  test("§A.1 — `const [a, b] = x` produces destructure-array with two name elements", () => {
    const nodes = logicNodesFor(`const [a, b] = x`);
    const decl = firstOfKind(nodes, "const-decl");
    expect(decl).toBeDefined();
    expect(decl.name).toMatchObject({
      kind: "destructure-array",
      elements: [
        { kind: "name", name: "a" },
        { kind: "name", name: "b" },
      ],
    });
    expect(decl.name.rest).toBeUndefined();
  });

  test("§A.2 — `const [a, b, ...rest] = x` carries rest as a sibling field", () => {
    const nodes = logicNodesFor(`const [a, b, ...rest] = x`);
    const decl = firstOfKind(nodes, "const-decl");
    expect(decl.name).toMatchObject({
      kind: "destructure-array",
      elements: [
        { kind: "name", name: "a" },
        { kind: "name", name: "b" },
      ],
      rest: "rest",
    });
  });

  test("§A.3 — `const [a, , b] = x` records a hole element", () => {
    const nodes = logicNodesFor(`const [a, , b] = x`);
    const decl = firstOfKind(nodes, "const-decl");
    expect(decl.name.kind).toBe("destructure-array");
    expect(decl.name.elements).toHaveLength(3);
    expect(decl.name.elements[0]).toMatchObject({ kind: "name", name: "a" });
    expect(decl.name.elements[1]).toMatchObject({ kind: "hole" });
    expect(decl.name.elements[2]).toMatchObject({ kind: "name", name: "b" });
  });

  test("§A.4 — `const [a, [b, c]] = x` records a nested array pattern", () => {
    const nodes = logicNodesFor(`const [a, [b, c]] = x`);
    const decl = firstOfKind(nodes, "const-decl");
    expect(decl.name.kind).toBe("destructure-array");
    expect(decl.name.elements[0]).toMatchObject({ kind: "name", name: "a" });
    expect(decl.name.elements[1]).toMatchObject({
      kind: "nested",
      pattern: {
        kind: "destructure-array",
        elements: [
          { kind: "name", name: "b" },
          { kind: "name", name: "c" },
        ],
      },
    });
  });

  test("§A.5 — `const [a = 1, b] = x` records the default text on the array element", () => {
    const nodes = logicNodesFor(`const [a = 1, b] = x`);
    const decl = firstOfKind(nodes, "const-decl");
    expect(decl.name.elements[0]).toMatchObject({ kind: "name", name: "a" });
    expect(decl.name.elements[0].default).toBe("1");
  });
});

// ---------------------------------------------------------------------------
// §B — const-decl object patterns
// ---------------------------------------------------------------------------

describe("§B: const-decl object destructure patterns", () => {
  test("§B.1 — `const {a, b} = x` produces destructure-object with shorthand bindings", () => {
    const nodes = logicNodesFor(`const {a, b} = x`);
    const decl = firstOfKind(nodes, "const-decl");
    expect(decl.name).toMatchObject({
      kind: "destructure-object",
      properties: [
        { kind: "name", fieldName: "a", bindName: "a" },
        { kind: "name", fieldName: "b", bindName: "b" },
      ],
    });
  });

  test("§B.2 — `const {a, b: ren} = x` records the renamed bindName", () => {
    const nodes = logicNodesFor(`const {a, b: ren} = x`);
    const decl = firstOfKind(nodes, "const-decl");
    expect(decl.name.properties[0]).toMatchObject({ kind: "name", fieldName: "a", bindName: "a" });
    expect(decl.name.properties[1]).toMatchObject({ kind: "name", fieldName: "b", bindName: "ren" });
  });

  test("§B.3 — `const {a, b = 1} = x` records the default on the property", () => {
    const nodes = logicNodesFor(`const {a, b = 1} = x`);
    const decl = firstOfKind(nodes, "const-decl");
    expect(decl.name.properties[1]).toMatchObject({ kind: "name", fieldName: "b", bindName: "b" });
    expect(decl.name.properties[1].default).toBe("1");
  });

  test("§B.4 — `const {a, ...rest} = x` carries rest as a sibling field", () => {
    const nodes = logicNodesFor(`const {a, ...rest} = x`);
    const decl = firstOfKind(nodes, "const-decl");
    expect(decl.name).toMatchObject({
      kind: "destructure-object",
      properties: [{ kind: "name", fieldName: "a", bindName: "a" }],
      rest: "rest",
    });
  });

  test("§B.5 — `const {a: {b, c}} = x` records a nested object pattern at the bind position", () => {
    const nodes = logicNodesFor(`const {a: {b, c}} = x`);
    const decl = firstOfKind(nodes, "const-decl");
    expect(decl.name.kind).toBe("destructure-object");
    expect(decl.name.properties[0]).toMatchObject({
      kind: "nested",
      fieldName: "a",
      pattern: {
        kind: "destructure-object",
        properties: [
          { kind: "name", fieldName: "b", bindName: "b" },
          { kind: "name", fieldName: "c", bindName: "c" },
        ],
      },
    });
  });
});

// ---------------------------------------------------------------------------
// §C — let-decl mirror cases (parser path parity with const-decl)
// ---------------------------------------------------------------------------

describe("§C: let-decl destructure patterns mirror const-decl shape", () => {
  test("§C.1 — `let [a, b] = x` produces destructure-array under let-decl.name", () => {
    const nodes = logicNodesFor(`let [a, b] = x`);
    const decl = firstOfKind(nodes, "let-decl");
    expect(decl).toBeDefined();
    expect(decl.name).toMatchObject({
      kind: "destructure-array",
      elements: [
        { kind: "name", name: "a" },
        { kind: "name", name: "b" },
      ],
    });
  });

  test("§C.2 — `let {a, b: ren} = x` produces destructure-object under let-decl.name", () => {
    const nodes = logicNodesFor(`let {a, b: ren} = x`);
    const decl = firstOfKind(nodes, "let-decl");
    expect(decl.name.kind).toBe("destructure-object");
    expect(decl.name.properties[1]).toMatchObject({ kind: "name", fieldName: "b", bindName: "ren" });
  });
});

// ---------------------------------------------------------------------------
// §D — for-of LHS destructuring
// ---------------------------------------------------------------------------

describe("§D: for-of destructuring LHS lands on for-stmt.variable", () => {
  test("§D.1 — `for (const [a, b] of arr)` lands array pattern on for-stmt.variable", () => {
    const nodes = logicNodesFor(`for (const [a, b] of arr) { let x = a }`);
    const forNode = firstOfKind(nodes, "for-stmt");
    expect(forNode).toBeDefined();
    expect(forNode.variable).toMatchObject({
      kind: "destructure-array",
      elements: [
        { kind: "name", name: "a" },
        { kind: "name", name: "b" },
      ],
    });
    // The iterable no longer carries the pattern — it is the pure iterable expr.
    expect(typeof forNode.iterable).toBe("string");
    expect(forNode.iterable.trim()).toBe("arr");
  });

  test("§D.2 — `for (const [a, b, ...rest] of arr)` records rest on the pattern", () => {
    const nodes = logicNodesFor(`for (const [a, b, ...rest] of arr) { let x = a }`);
    const forNode = firstOfKind(nodes, "for-stmt");
    expect(forNode.variable).toMatchObject({
      kind: "destructure-array",
      rest: "rest",
    });
  });

  test("§D.3 — `for (const {a, b} of arr)` lands object pattern on for-stmt.variable", () => {
    const nodes = logicNodesFor(`for (const {a, b} of arr) { let x = a }`);
    const forNode = firstOfKind(nodes, "for-stmt");
    expect(forNode.variable).toMatchObject({
      kind: "destructure-object",
      properties: [
        { kind: "name", fieldName: "a", bindName: "a" },
        { kind: "name", fieldName: "b", bindName: "b" },
      ],
    });
  });

  test("§D.4 — `for (const {a, b: ren} of arr)` records the rename on the pattern", () => {
    const nodes = logicNodesFor(`for (const {a, b: ren} of arr) { let x = a }`);
    const forNode = firstOfKind(nodes, "for-stmt");
    expect(forNode.variable.kind).toBe("destructure-object");
    expect(forNode.variable.properties[1]).toMatchObject({
      kind: "name",
      fieldName: "b",
      bindName: "ren",
    });
  });

  test("§D.5 — `for (const {a, b = 1} of arr)` records the default", () => {
    const nodes = logicNodesFor(`for (const {a, b = 1} of arr) { let x = a }`);
    const forNode = firstOfKind(nodes, "for-stmt");
    expect(forNode.variable.properties[1].default).toBe("1");
  });

  test("§D.6 — `for (const {a, ...rest} of arr)` records rest on the pattern", () => {
    const nodes = logicNodesFor(`for (const {a, ...rest} of arr) { let x = a }`);
    const forNode = firstOfKind(nodes, "for-stmt");
    expect(forNode.variable).toMatchObject({
      kind: "destructure-object",
      properties: [{ kind: "name", fieldName: "a", bindName: "a" }],
      rest: "rest",
    });
  });
});

// ---------------------------------------------------------------------------
// §E — Bare-ident path unchanged (regression guard)
// ---------------------------------------------------------------------------

describe("§E: bare-ident LHS still produces string name (no regression)", () => {
  test("§E.1 — `const a = 1` keeps name as a string", () => {
    const nodes = logicNodesFor(`const a = 1`);
    const decl = firstOfKind(nodes, "const-decl");
    expect(typeof decl.name).toBe("string");
    expect(decl.name).toBe("a");
  });

  test("§E.2 — `let x = 1` keeps name as a string", () => {
    const nodes = logicNodesFor(`let x = 1`);
    const decl = firstOfKind(nodes, "let-decl");
    expect(typeof decl.name).toBe("string");
    expect(decl.name).toBe("x");
  });

  test("§E.3 — `for (const item of xs)` keeps variable as a string", () => {
    const nodes = logicNodesFor(`for (const item of xs) { let x = item }`);
    const forNode = firstOfKind(nodes, "for-stmt");
    expect(typeof forNode.variable).toBe("string");
    expect(forNode.variable).toBe("item");
  });
});
