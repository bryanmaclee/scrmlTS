// Conformance test for: SPEC §22.6 (Runtime Macros)
// "A `^{ }` block whose result is fully deterministic at compile time SHALL
//  be evaluated at compile time and its result inlined. No runtime stub is
//  emitted."
// "A `^{ }` block that depends on runtime values SHALL emit a runtime macro
//  stub that performs the expansion at execution time."
// "The compiler setting `meta.runtime` (default: `true`) controls whether
//  runtime macro stubs are permitted. When `false`, any `^{ }` block that
//  cannot be fully resolved at compile time SHALL be a compile error
//  (E-META-001)."
//
// At the TAB stage: these are code-generation decisions. The TAB stage's
// contribution is to correctly parse ALL meta blocks into MetaBlock nodes
// with their full body content — whether or not the block is deterministic.
// The CG stage later decides whether to inline or emit a stub.
// The conformance guarantee at TAB is: meta block body is fully parsed into
// ASTNode[] regardless of whether it contains runtime-dependent expressions.

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

describe("CONF-TAB-018: meta block body is fully parsed (runtime vs compile-time is CG concern)", () => {
  test("meta block with compile-time-only content is parsed into a MetaBlock node", () => {
    const { ast } = run("<div>^{ let x = 1 + 2; }</>");
    const meta = findMeta(ast.nodes);
    expect(meta).toBeDefined();
    expect(meta.kind).toBe("meta");
    expect(meta.body.length).toBeGreaterThan(0);
  });

  test("meta block referencing an outer variable is parsed without TAB-level error", () => {
    // Whether `runtimeVal` is runtime-dependent is a CG/TS decision.
    // TAB must not throw on it.
    const { ast } = run("<div>^{ let computed = runtimeVal * 2; }</>");
    const meta = findMeta(ast.nodes);
    expect(meta).toBeDefined();
    expect(meta.body.length).toBeGreaterThan(0);
  });

  test("meta block with a function call is parsed without TAB-level error", () => {
    const { ast } = run("<div>^{ let result = computeSomething(); }</>");
    const meta = findMeta(ast.nodes);
    expect(meta).toBeDefined();
    // No TABError thrown
    expect(meta.kind).toBe("meta");
  });

  test("TAB does NOT evaluate meta block content — it only parses it", () => {
    // If TAB were evaluating, a reference to an undefined name would throw.
    // It should not — TAB is a pure structural parser.
    const { ast } = run("<div>^{ let x = undefinedAtCompileTime; }</>");
    const meta = findMeta(ast.nodes);
    expect(meta).toBeDefined();
    // No evaluation error; just a parsed node
    expect(meta.kind).toBe("meta");
  });

  test("meta block body nodes have spans (needed for downstream error reporting)", () => {
    const { ast } = run("<div>^{ let x = 1; let y = 2; }</>");
    const meta = findMeta(ast.nodes);
    expect(meta).toBeDefined();
    for (const node of meta.body) {
      expect(node.span).toBeDefined();
    }
  });
});
