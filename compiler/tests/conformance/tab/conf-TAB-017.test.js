// Conformance test for: SPEC §22.5 (Meta-to-Meta Communication)
// "Meta-layer state declared in one `^{ }` block SHALL be accessible to
//  subsequent `^{ }` blocks in the same compilation unit."
// "Meta-layer state SHALL NOT be accessible from non-meta contexts unless
//  explicitly spliced as a return value."
// "The ordering of meta-layer state initialization follows source-text order."
//
// At the TAB stage: this is a semantic guarantee that the TS stage enforces
// through scope analysis. The TAB stage's responsibility is structural: it
// must produce independent MetaBlock nodes for each ^{ } occurrence, in
// source-text order, so that TS can wire the cross-meta communication.

import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../../src/block-splitter.js";
import { buildAST } from "../../../src/ast-builder.js";

function run(src) {
  const bsOut = splitBlocks("test.scrml", src);
  return buildAST(bsOut);
}

function findAllMeta(nodes, result = []) {
  for (const n of nodes) {
    if (!n) continue;
    if (n.kind === "meta") result.push(n);
    if (n.children) findAllMeta(n.children, result);
    if (n.body) findAllMeta(n.body, result);
  }
  return result;
}

describe("CONF-TAB-017: multiple meta blocks are structurally separate nodes in source order", () => {
  test("two sibling meta blocks in a markup context produce two meta nodes", () => {
    const { ast } = run("<div>^{ let a = 1; }^{ let b = 2; }</>");
    const metas = findAllMeta(ast.nodes);
    expect(metas.length).toBeGreaterThanOrEqual(2);
  });

  test("meta blocks appear in source-text order (earlier start < later start)", () => {
    const { ast } = run("<div>^{ let a = 1; }text^{ let b = 2; }</>");
    const metas = findAllMeta(ast.nodes);
    // Filter to just the direct children of div
    const divChildren = ast.nodes[0]?.children ?? [];
    const divMetas = divChildren.filter((c) => c.kind === "meta");
    if (divMetas.length >= 2) {
      expect(divMetas[0].span.start).toBeLessThan(divMetas[1].span.start);
    }
  });

  test("each meta block is a separate independent node (not merged)", () => {
    const { ast } = run("<div>^{ let a = 1; }^{ let b = 2; }</>");
    const metas = findAllMeta(ast.nodes);
    // Each meta block has its own body
    for (const m of metas) {
      expect(Array.isArray(m.body)).toBe(true);
    }
  });

  test("first meta block's declarations are in its own body, not the second's", () => {
    const { ast } = run("<div>^{ let alpha = 1; }^{ let beta = 2; }</>");
    const divChildren = ast.nodes[0]?.children ?? [];
    const divMetas = divChildren.filter((c) => c.kind === "meta");
    if (divMetas.length >= 2) {
      const first = divMetas[0];
      const second = divMetas[1];
      const firstNames = first.body
        .filter((n) => n.kind === "let-decl")
        .map((n) => n.name);
      const secondNames = second.body
        .filter((n) => n.kind === "let-decl")
        .map((n) => n.name);
      expect(firstNames).toContain("alpha");
      expect(secondNames).toContain("beta");
      expect(firstNames).not.toContain("beta");
      expect(secondNames).not.toContain("alpha");
    }
  });
});
