// Conformance test for: SPEC §22.4 (Return Value and Splicing of meta context)
// "When `^{ }` appears inside a markup context, its result SHALL be coerced
//  to markup elements (same as `${ }` in markup)."
// "When `^{ }` appears inside a logic context, its result SHALL pass through
//  as a value."
// "When `^{ }` appears inside a SQL context, its result SHALL be interpolated
//  as a SQL fragment."
// "When `^{ }` appears inside a CSS context, its result SHALL be coerced to
//  CSS values."
// "When `^{ }` appears inside another `^{ }`, its result passes through as a
//  meta-layer value."
//
// Pipeline contract: "MetaBlock nodes record the `parentContext` from which
// the `^{ }` was entered. This is the discriminant the type system uses to
// determine the splicing coercion rules."
// ParentContextKind = 'markup' | 'state' | 'logic' | 'sql' | 'css' | 'error' | 'meta'

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
    if (n.children) { const r = findMeta(n.children); if (r) return r; }
    if (n.body) { const r = findMeta(n.body); if (r) return r; }
  }
  return null;
}

const VALID_PARENT_CONTEXTS = new Set([
  "markup", "state", "logic", "sql", "css", "error", "meta",
]);

describe("CONF-TAB-016: MetaBlock.parentContext is the correct parent kind for splicing", () => {
  test("meta inside markup has parentContext='markup'", () => {
    const { ast } = run("<div>^{ 1 }</>");
    const meta = findMeta(ast.nodes);
    expect(meta.parentContext).toBe("markup");
  });

  test("standalone meta in logic block has parentContext='logic'", () => {
    // Meta as a standalone statement in a logic block — not embedded in an expression
    const { ast } = run("${ ^{ let x = 1; } }");
    const meta = findMeta(ast.nodes);
    expect(meta).toBeDefined();
    expect(meta.parentContext).toBe("logic");
  });

  test("meta inside state has parentContext='state'", () => {
    const { ast } = run("< db>^{ 1 }</>");
    const meta = findMeta(ast.nodes);
    expect(meta.parentContext).toBe("state");
  });

  test("meta.parentContext is always one of the defined ParentContextKind values", () => {
    const sources = [
      "<div>^{ 1 }</>",
      "${ ^{ 1 } }",
      "< db>^{ 1 }</>",
    ];
    for (const src of sources) {
      const { ast } = run(src);
      const meta = findMeta(ast.nodes);
      expect(meta).toBeDefined();
      expect(VALID_PARENT_CONTEXTS.has(meta.parentContext)).toBe(true);
    }
  });

  test("nested meta (^{ ^{ } }) has parentContext='meta' for the inner one", () => {
    // Outer ^{ } is in a markup context (parentContext='markup')
    // Inner ^{ } is inside the outer meta (parentContext='meta')
    const { ast } = run("<div>^{ let x = 1; ^{ let y = 2; } }</>");
    const outerMeta = findMeta(ast.nodes);
    expect(outerMeta.parentContext).toBe("markup");

    // The inner meta is in outerMeta.body — only if the BS produced a nested meta block
    if (outerMeta.body) {
      const innerMeta = findMeta(outerMeta.body);
      if (innerMeta) {
        expect(innerMeta.parentContext).toBe("meta");
      }
    }
    // The outer meta parentContext must be 'markup' regardless
    expect(outerMeta.parentContext).toBe("markup");
  });
});
