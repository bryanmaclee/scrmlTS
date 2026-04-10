// Conformance test for: SPEC §22.2 (Meta Context Placement Rules)
// "`^{ }` SHALL be valid inside ANY context: markup, state, logic (`${ }`),
//  SQL (`?{ }`), CSS (`#{ }`), error (`!{ }`), and nested meta (`^{ }`)."
// "The block splitter SHALL recognize `^{` as a brace-delimited context opener,
//  subject to the same rules as `${`, `?{`, `#{`, and `!{`."
// "`^{ }` contexts may nest arbitrarily: `^{ ... ^{ ... } ... }` is valid."
// "The `}` closer for `^{ }` follows standard brace-depth tracking."
//
// At the TAB stage: a meta block parsed from a `^{` BS block must produce a
// node with kind='meta'. The parentContext field must reflect the enclosing
// block's kind.

import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../../src/block-splitter.js";
import { buildAST } from "../../../src/ast-builder.js";

function run(src) {
  const bsOut = splitBlocks("test.scrml", src);
  return buildAST(bsOut);
}

function findMeta(nodes) {
  for (const n of nodes) {
    if (!n) continue;
    if (n.kind === "meta") return n;
    if (n.children) {
      const r = findMeta(n.children);
      if (r) return r;
    }
    if (n.body) {
      const r = findMeta(n.body);
      if (r) return r;
    }
  }
  return null;
}

describe("CONF-TAB-014: meta context produces kind=meta node in any parent context", () => {
  test("^{ } inside markup context produces a meta node with parentContext='markup'", () => {
    const { ast } = run("<div>^{ let x = 1; }</>");
    const meta = findMeta(ast.nodes);
    expect(meta).toBeDefined();
    expect(meta.kind).toBe("meta");
    expect(meta.parentContext).toBe("markup");
  });

  test("^{ } as standalone statement in logic context produces meta node with parentContext='logic'", () => {
    // Standalone ^{ } in a ${ } block — not embedded in an assignment expression
    const { ast } = run("${ ^{ let x = 2; } }");
    const meta = findMeta(ast.nodes);
    expect(meta).toBeDefined();
    expect(meta.kind).toBe("meta");
    expect(meta.parentContext).toBe("logic");
  });

  test("^{ } inside state context produces a meta node with parentContext='state'", () => {
    const { ast } = run("< db>^{ let x = 1; }</>");
    const meta = findMeta(ast.nodes);
    expect(meta).toBeDefined();
    expect(meta.kind).toBe("meta");
    expect(meta.parentContext).toBe("state");
  });

  test("meta node has a body array (even if empty)", () => {
    const { ast } = run("<div>^{ }</>");
    const meta = findMeta(ast.nodes);
    expect(meta).toBeDefined();
    expect(Array.isArray(meta.body)).toBe(true);
  });

  test("meta node body contains nodes for its content", () => {
    const { ast } = run("<div>^{ let x = 1; }</>");
    const meta = findMeta(ast.nodes);
    expect(meta).toBeDefined();
    expect(meta.body.length).toBeGreaterThan(0);
  });

  test("meta node carries a valid span", () => {
    const { ast } = run("<div>^{ let x = 1; }</>");
    const meta = findMeta(ast.nodes);
    expect(meta.span).toBeDefined();
    expect(typeof meta.span.start).toBe("number");
    expect(typeof meta.span.end).toBe("number");
  });
});
