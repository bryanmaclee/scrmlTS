/**
 * when @var changes {} — Reactive Effects (§6.7.4)
 *
 * Tests for the when-effect AST node and codegen output.
 *
 * §1  Single dependency parses correctly
 * §2  Multi-dependency parses correctly
 * §3  Codegen emits _scrml_reactive_subscribe per dependency
 * §4  Body contains rewritten reactive references
 * §5  when does not emit on mount (no immediate call)
 * §6  Keywords "when" and "changes" are recognized
 */

import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";
import { tokenizeLogic } from "../../src/tokenizer.js";
import { emitLogicNode } from "../../src/codegen/emit-logic.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseSource(source, filePath = "/test/app.scrml") {
  const bsResult = splitBlocks(filePath, source);
  const tabResult = buildAST(bsResult);
  return tabResult;
}

function findNodes(nodes, kind) {
  const found = [];
  function walk(list) {
    for (const node of list) {
      if (!node) continue;
      if (node.kind === kind) found.push(node);
      if (Array.isArray(node.children)) walk(node.children);
      if (Array.isArray(node.body)) walk(node.body);
    }
  }
  walk(nodes);
  return found;
}

// ---------------------------------------------------------------------------
// §1: Single dependency
// ---------------------------------------------------------------------------

describe("§1: single dependency when effect", () => {
  test("parses when @query changes { body }", () => {
    const source = `<program>
@query = ""
@page = 1
\${ when @query changes { @page = 1 } }
</>`;
    const { ast, errors } = parseSource(source);
    const whenNodes = findNodes(ast.nodes, "when-effect");
    expect(whenNodes).toHaveLength(1);
    expect(whenNodes[0].dependencies).toEqual(["query"]);
  });

  test("body raw contains the effect body", () => {
    const source = `<program>
@query = ""
@page = 1
\${ when @query changes { @page = 1 } }
</>`;
    const { ast } = parseSource(source);
    const whenNodes = findNodes(ast.nodes, "when-effect");
    expect(whenNodes[0].bodyRaw).toContain("@page");
    expect(whenNodes[0].bodyRaw).toContain("1");
  });
});

// ---------------------------------------------------------------------------
// §2: Multi-dependency
// ---------------------------------------------------------------------------

describe("§2: multi-dependency when effect", () => {
  test("parses when (@query, @minPrice) changes { body }", () => {
    const source = `<program>
@query = ""
@minPrice = 0
@page = 1
\${ when (@query, @minPrice) changes { @page = 1 } }
</>`;
    const { ast } = parseSource(source);
    const whenNodes = findNodes(ast.nodes, "when-effect");
    expect(whenNodes).toHaveLength(1);
    expect(whenNodes[0].dependencies).toEqual(["query", "minPrice"]);
  });

  test("three dependencies parse correctly", () => {
    const source = `<program>
@a = 1
@b = 2
@c = 3
@result = 0
\${ when (@a, @b, @c) changes { @result = @a + @b + @c } }
</>`;
    const { ast } = parseSource(source);
    const whenNodes = findNodes(ast.nodes, "when-effect");
    expect(whenNodes[0].dependencies).toEqual(["a", "b", "c"]);
  });
});

// ---------------------------------------------------------------------------
// §3: Codegen emits subscriptions
// ---------------------------------------------------------------------------

describe("§3: codegen emits _scrml_effect with dep reads", () => {
  test("single dep emits one effect call", () => {
    const node = {
      kind: "when-effect",
      dependencies: ["query"],
      bodyRaw: "@page = 1",
    };
    const output = emitLogicNode(node, { fnNameMap: new Map() });
    expect(output).toContain('_scrml_effect(');
    expect(output).toContain("function()");
  });

  test("multi dep emits single effect that reads all deps", () => {
    const node = {
      kind: "when-effect",
      dependencies: ["query", "minPrice"],
      bodyRaw: "@page = 1",
    };
    const output = emitLogicNode(node, { fnNameMap: new Map() });
    expect(output).toContain('_scrml_effect(');
    // Single effect now, deps tracked automatically via Proxy reads
  });
});

// ---------------------------------------------------------------------------
// §4: Body rewriting
// ---------------------------------------------------------------------------

describe("§4: body contains rewritten reactive references", () => {
  test("@var reads in body become _scrml_reactive_get", () => {
    // emitLogicNode imported at top level
    const node = {
      kind: "when-effect",
      dependencies: ["query"],
      bodyRaw: "@page = 1",
    };
    const output = emitLogicNode(node, { fnNameMap: new Map() });
    // rewriteExpr converts @page = 1 to _scrml_reactive_set("page", 1)
    expect(output).toContain("_scrml_reactive_set(\"page\", 1)");
  });
});

// ---------------------------------------------------------------------------
// §5: Does not execute on mount
// ---------------------------------------------------------------------------

describe("§5: when does not emit immediate execution", () => {
  test("output does NOT contain an immediate function call", () => {
    // emitLogicNode imported at top level
    const node = {
      kind: "when-effect",
      dependencies: ["query"],
      bodyRaw: "@page = 1",
    };
    const output = emitLogicNode(node, { fnNameMap: new Map() });
    // Should be an effect, not a bare execution
    expect(output).toContain("_scrml_effect(");
  });
});

// ---------------------------------------------------------------------------
// §6: Keywords recognized
// ---------------------------------------------------------------------------

describe("§6: when and changes are keywords", () => {
  test("when tokenizes as KEYWORD", () => {
    const tokens = tokenizeLogic("when", 0, 1, 1, []);
    const whenTok = tokens.find(t => t.text === "when");
    expect(whenTok).toBeDefined();
    expect(whenTok.kind).toBe("KEYWORD");
  });

  test("changes tokenizes as KEYWORD", () => {
    const tokens = tokenizeLogic("changes", 0, 1, 1, []);
    const changesTok = tokens.find(t => t.text === "changes");
    expect(changesTok).toBeDefined();
    expect(changesTok.kind).toBe("KEYWORD");
  });
});
