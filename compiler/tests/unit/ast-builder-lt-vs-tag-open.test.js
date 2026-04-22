/**
 * AST Builder — `<` as less-than vs tag-opener disambiguation (Bug 3)
 *
 * Root cause: `collectExpr`'s angle-bracket tracker (for tag expressions)
 * bumped `angleDepth` unconditionally when `<` was followed by an IDENT.
 * In `base < limit ? base : limit`, no matching `>` appears, so angleDepth
 * stayed at 1 — which disabled the statement-boundary check (`angleDepth === 0`
 * guard) and caused greedy collect to eat subsequent statements (including
 * `return`) into the expression. Meriyah then rejected the mashed string
 * and downstream fallback dropped the tail.
 *
 * Fix: treat `<` as a less-than comparison (no angleDepth bump) when the
 * previous token is a clearly value-producing token — IDENT, AT_IDENT,
 * NUMBER, STRING, `)`, `]`. Tag openers always appear at expression
 * positions (after `=`, `,`, `(`, statement-start, keywords like `return`/`lift`).
 *
 * Verified against the 6nz repro (bug3-return-after-ternary-const.scrml):
 * `function broken(base, limit) { const min = base < limit ? base : limit; return base + min }`
 * now emits the return statement; before fix it was dropped.
 */

import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";

function parse(source) {
  const bs = splitBlocks("test.scrml", source);
  return buildAST(bs);
}

function findFn(source, name) {
  const { ast } = parse(source);
  const logic = ast.nodes.find(n => n.kind === "logic");
  return logic?.body?.find(n => n.kind === "function-decl" && n.name === name);
}

describe("ast-builder `<` disambiguation (Bug 3)", () => {
  test("const with ternary-init does NOT drop trailing return", () => {
    const src = `\${ function broken(base, limit) { const min = base < limit ? base : limit\n return base + min } }`;
    const fn = findFn(src, "broken");
    expect(fn).toBeDefined();
    expect(fn.body.length).toBe(2);
    const ret = fn.body.find(n => n.kind === "return-stmt" || n.kind === "return");
    expect(ret).toBeDefined();
  });

  test("simple a < b comparison does not consume following return", () => {
    const src = `\${ function f(a, b) { const ok = a < b\n return ok } }`;
    const fn = findFn(src, "f");
    expect(fn.body.length).toBe(2);
  });

  test("parenthesized ternary-init still works (regression guard)", () => {
    const src = `\${ function f(a, b) { const x = (a < b ? a : b)\n return a + x } }`;
    const fn = findFn(src, "f");
    expect(fn.body.length).toBe(2);
  });

  test("nested ternary with < and > on same line (datatable-style sort)", () => {
    const src = `\${ function cmp(a, b) { return a < b ? -1 : a > b ? 1 : 0 } }`;
    const fn = findFn(src, "cmp");
    expect(fn.body.length).toBe(1);
  });

  test("tag expression after `=` still opens as a tag (regression guard)", () => {
    const src = `\${ const Badge = <span class="badge">hello</span> }`;
    const { ast } = parse(src);
    const logic = ast.nodes.find(n => n.kind === "logic");
    // `const X = <tag>` is a component-def in scrml, not a const-decl
    const comp = logic?.body?.find(n => n.kind === "component-def" && n.name === "Badge");
    expect(comp).toBeDefined();
  });

  test("tag expression after `return` still opens as a tag", () => {
    const src = `\${ function f() { return <div>hi</div> } }`;
    const fn = findFn(src, "f");
    expect(fn).toBeDefined();
    expect(fn.body.length).toBeGreaterThan(0);
  });

  test("tag expression after `lift` still opens as a tag", () => {
    const src = `\${ function f() { lift <li>x</li> } }`;
    const fn = findFn(src, "f");
    expect(fn).toBeDefined();
    expect(fn.body.length).toBeGreaterThan(0);
  });

  test("call-result `<` comparison: foo() < 10 does not bump angle depth", () => {
    const src = `\${ function f(x) { const ok = foo(x) < 10\n return ok } }`;
    const fn = findFn(src, "f");
    expect(fn.body.length).toBe(2);
  });

  test("array-index `<` comparison: arr[0] < 10 does not bump angle depth", () => {
    const src = `\${ function f(arr) { const ok = arr[0] < 10\n return ok } }`;
    const fn = findFn(src, "f");
    expect(fn.body.length).toBe(2);
  });

  test("AT_IDENT `<` comparison: @count < 5 does not bump angle depth", () => {
    const src = `\${ function f() { const ok = @count < 5\n return ok } }`;
    const fn = findFn(src, "f");
    expect(fn.body.length).toBe(2);
  });

  test("number-lhs `<` comparison: 10 < x does not bump angle depth", () => {
    const src = `\${ function f(x) { const ok = 10 < x\n return ok } }`;
    const fn = findFn(src, "f");
    expect(fn.body.length).toBe(2);
  });
});
