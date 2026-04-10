/**
 * `when message(binding)` — Worker lifecycle hook (§4.12.4)
 *
 * Tests for the worker message handler syntax:
 *   §A  Parse: `when message(data) { body }` produces when-message node
 *   §B  Binding: parameter name is captured correctly
 *   §C  Body: raw body string preserved
 *   §D  Regression: existing `when @var changes` still works
 */

import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";

function parse(source) {
  return buildAST(splitBlocks("test.scrml", source));
}

function findNodes(nodes, kind) {
  const result = [];
  function walk(list) {
    for (const n of list || []) {
      if (n.kind === kind) result.push(n);
      if (n.children) walk(n.children);
      if (n.body) walk(Array.isArray(n.body) ? n.body : [n.body]);
    }
  }
  walk(nodes);
  return result;
}

describe("when message() — worker lifecycle hook (§4.12.4)", () => {
  test("§A when message(data) produces when-message node", () => {
    const r = parse(`<program name="worker">\${ when message(data) { send(data) } }</program>`);
    const msgs = findNodes(r.ast.nodes, "when-message");
    expect(msgs).toHaveLength(1);
    expect(msgs[0].kind).toBe("when-message");
  });

  test("§B binding parameter name is captured", () => {
    const r = parse(`<program name="w">\${ when message(payload) { send(payload + 1) } }</program>`);
    const msgs = findNodes(r.ast.nodes, "when-message");
    expect(msgs[0].binding).toBe("payload");
  });

  test("§B2 default binding is 'data' when no parens", () => {
    const r = parse(`<program name="w">\${ when message { send(42) } }</program>`);
    const msgs = findNodes(r.ast.nodes, "when-message");
    expect(msgs).toHaveLength(1);
    expect(msgs[0].binding).toBe("data");
  });

  test("§C body raw string is preserved", () => {
    const r = parse(`<program name="w">\${ when message(n) { let result = n * 2 ; send(result) } }</program>`);
    const msgs = findNodes(r.ast.nodes, "when-message");
    expect(msgs[0].bodyRaw).toContain("n * 2");
    expect(msgs[0].bodyRaw).toContain("send");
    expect(msgs[0].bodyRaw).toContain("result");
  });

  test("§D regression: when @var changes still produces when-effect", () => {
    const r = parse(`<program>\${ @count = 0 }\${ when @count changes { console.log(@count) } }</program>`);
    const effects = findNodes(r.ast.nodes, "when-effect");
    expect(effects).toHaveLength(1);
    expect(effects[0].dependencies).toEqual(["count"]);
    expect(effects[0].bodyRaw).toContain("@count");
  });

  test("§D2 regression: when (@a, @b) changes still works", () => {
    const r = parse(`<program>\${ @a = 0 }\${ @b = 0 }\${ when (@a, @b) changes { console.log("changed") } }</program>`);
    const effects = findNodes(r.ast.nodes, "when-effect");
    expect(effects).toHaveLength(1);
    expect(effects[0].dependencies).toContain("a");
    expect(effects[0].dependencies).toContain("b");
  });
});
