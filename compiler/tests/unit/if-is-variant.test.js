/**
 * is .Variant expression in if= attributes — Unit Tests (IS-VARIANT-ATTR)
 *
 * Tests for `is .Variant` and `is not` inside if={} attribute expressions.
 * These expressions have no @-prefixed reactive refs, which previously caused
 * emit-event-wiring.ts to silently drop the condition (refs.length > 0 guard).
 *
 * Coverage:
 *   §1  Tokenizer: if={state is .Loading} emits ATTR_BLOCK with raw expression
 *   §2  AST builder: ATTR_BLOCK produces expr kind with empty refs
 *   §3  emit-html: data-scrml-bind-if placeholder emitted for is .Variant expr
 *   §4  emit-html: registry binding has condExpr set to raw is .Variant expression
 *   §5  emit-event-wiring: is .Variant compiles to === "Variant"
 *   §6  emit-event-wiring: el.style.display emitted even when refs is empty
 *   §7  emit-event-wiring: @state is .Variant (reactive) compiles correctly
 *   §8  Full pipeline: if={state is .Loading} round-trip compilation
 *   §9  Full pipeline: if={@state is .Active} reactive round-trip
 */

import { describe, test, expect, beforeEach } from "bun:test";
import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";
import { tokenizeAttributes } from "../../src/tokenizer.js";
import { generateHtml } from "../../src/codegen/emit-html.js";
import { BindingRegistry } from "../../src/codegen/binding-registry.ts";
import { resetVarCounter } from "../../src/codegen/var-counter.ts";
import { runCG } from "../../src/code-generator.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function span(start = 0, file = "/test/app.scrml") {
  return { file, start, end: start + 10, line: 1, col: start + 1 };
}

function parseAttrs(source) {
  const bsOut = splitBlocks("test.scrml", source);
  const { ast } = buildAST(bsOut);
  const node = ast.nodes.find(n => n.kind === "markup" && n.tag !== "program")
    ?? ast.nodes.find(n => n.kind === "markup");
  return node ? (node.attrs ?? node.attributes ?? []) : [];
}

function makeMarkupNode(tag, attrs = [], children = [], opts = {}) {
  return {
    kind: "markup",
    tag,
    attributes: attrs,
    children,
    selfClosing: opts.selfClosing ?? false,
    span: opts.span ?? span(0),
  };
}

function makeFileAST(nodes) {
  return {
    filePath: "/test/app.scrml",
    nodes,
    imports: [],
    exports: [],
    components: [],
    typeDecls: [],
    nodeTypes: new Map(),
    componentShapes: new Map(),
    scopeChain: null,
  };
}

function makeRouteMap() { return { functions: new Map() }; }
function makeDepGraph() { return { nodes: new Map(), edges: [] }; }
function makeProtectAnalysis() { return { views: new Map() }; }

function compile(markupNode) {
  const ast = makeFileAST([markupNode]);
  return runCG({
    files: [ast],
    routeMap: makeRouteMap(),
    depGraph: makeDepGraph(),
    protectAnalysis: makeProtectAnalysis(),
  });
}

/** Build an expr attribute with explicit refs (default: empty for non-reactive expressions). */
function exprAttr(name, raw, refs = []) {
  return {
    name,
    value: { kind: "expr", raw, refs, span: span(0) },
    span: span(0),
  };
}

beforeEach(() => {
  resetVarCounter();
});

// ---------------------------------------------------------------------------
// §1  Tokenizer: if={state is .Loading} emits ATTR_BLOCK with raw expression
// ---------------------------------------------------------------------------

describe("§1: tokenizer emits ATTR_BLOCK for if={state is .Loading}", () => {
  test("if={state is .Loading} emits ATTR_BLOCK token", () => {
    const tokens = tokenizeAttributes("<div if={state is .Loading}>", 0, 1, 1, "markup");
    const blockTok = tokens.find(t => t.kind === "ATTR_BLOCK");

    expect(blockTok).toBeDefined();
    expect(blockTok.text).toBe("state is .Loading");
  });

  test("if={@state is .Loading} emits ATTR_BLOCK with reactive prefix", () => {
    const tokens = tokenizeAttributes("<div if={@state is .Loading}>", 0, 1, 1, "markup");
    const blockTok = tokens.find(t => t.kind === "ATTR_BLOCK");

    expect(blockTok).toBeDefined();
    expect(blockTok.text).toBe("@state is .Loading");
  });

  test("if={x is .Active} emits ATTR_BLOCK", () => {
    const tokens = tokenizeAttributes("<div if={x is .Active}>", 0, 1, 1, "markup");
    const blockTok = tokens.find(t => t.kind === "ATTR_BLOCK");

    expect(blockTok).toBeDefined();
    expect(blockTok.text).toBe("x is .Active");
  });
});

// ---------------------------------------------------------------------------
// §2  AST builder: ATTR_BLOCK produces expr kind
// ---------------------------------------------------------------------------

describe("§2: AST builder produces expr kind from brace-block is .Variant expression", () => {
  test("if={state is .Loading} — produces expr kind", () => {
    const attrs = parseAttrs("<div if={state is .Loading}>text</>");
    const ifAttr = attrs.find(a => a.name === "if");

    expect(ifAttr).toBeDefined();
    expect(ifAttr.value.kind).toBe("expr");
  });

  test("if={state is .Loading} — raw expression preserved", () => {
    const attrs = parseAttrs("<div if={state is .Loading}>text</>");
    const ifAttr = attrs.find(a => a.name === "if");

    expect(ifAttr).toBeDefined();
    expect(ifAttr.value.raw).toBe("state is .Loading");
  });

  test("if={state is .Loading} — refs is empty (no @ prefixed vars)", () => {
    const attrs = parseAttrs("<div if={state is .Loading}>text</>");
    const ifAttr = attrs.find(a => a.name === "if");

    expect(ifAttr).toBeDefined();
    expect(ifAttr.value.refs).toEqual([]);
  });

  test("if={@state is .Loading} — refs contains 'state'", () => {
    const attrs = parseAttrs("<div if={@state is .Loading}>text</>");
    const ifAttr = attrs.find(a => a.name === "if");

    expect(ifAttr).toBeDefined();
    expect(ifAttr.value.refs).toContain("state");
  });
});

// ---------------------------------------------------------------------------
// §3  emit-html: data-scrml-bind-if placeholder emitted for is .Variant expr
// ---------------------------------------------------------------------------

describe("§3: emit-html emits data-scrml-bind-if for is .Variant expression", () => {
  test("if={state is .Loading} — HTML contains data-scrml-bind-if", () => {
    const node = makeMarkupNode("div", [exprAttr("if", "state is .Loading", [])], [
      { kind: "text", value: "Loading...", span: span(0) }
    ]);
    const registry = new BindingRegistry();
    const html = generateHtml([node], [], false, registry, null);

    expect(html).toContain("data-scrml-bind-if=");
  });

  test("if={state is .Loading} — binding registered in registry", () => {
    const node = makeMarkupNode("div", [exprAttr("if", "state is .Loading", [])], [
      { kind: "text", value: "text", span: span(0) }
    ]);
    const registry = new BindingRegistry();
    generateHtml([node], [], false, registry, null);

    const binding = registry.logicBindings.find(b => b.isConditionalDisplay);
    expect(binding).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// §4  emit-html: registry binding has condExpr for is .Variant expr
// ---------------------------------------------------------------------------

describe("§4: registry binding has condExpr for is .Variant expression", () => {
  test("condExpr is set to raw 'state is .Loading' expression", () => {
    const node = makeMarkupNode("div", [exprAttr("if", "state is .Loading", [])], [
      { kind: "text", value: "text", span: span(0) }
    ]);
    const registry = new BindingRegistry();
    generateHtml([node], [], false, registry, null);

    const binding = registry.logicBindings.find(b => b.isConditionalDisplay);
    expect(binding.condExpr).toBe("state is .Loading");
  });

  test("refs is empty array for non-reactive is .Variant expr", () => {
    const node = makeMarkupNode("div", [exprAttr("if", "state is .Loading", [])], [
      { kind: "text", value: "text", span: span(0) }
    ]);
    const registry = new BindingRegistry();
    generateHtml([node], [], false, registry, null);

    const binding = registry.logicBindings.find(b => b.isConditionalDisplay);
    expect(binding.refs).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// §5  emit-event-wiring: is .Variant compiles to === "Variant"
// ---------------------------------------------------------------------------

describe("§5: is .Variant compiles to === \"Variant\" in client JS", () => {
  test("if={state is .Loading} — client JS contains === \"Loading\"", () => {
    const node = makeMarkupNode("div", [exprAttr("if", "state is .Loading", [])], [
      { kind: "text", value: "Loading...", span: span(0) }
    ]);
    const result = compile(node);
    const out = result.outputs.get("/test/app.scrml");

    expect(out.clientJs).toContain('=== "Loading"');
  });

  test("if={x is .Active} — client JS contains === \"Active\"", () => {
    const node = makeMarkupNode("div", [exprAttr("if", "x is .Active", [])], [
      { kind: "text", value: "text", span: span(0) }
    ]);
    const result = compile(node);
    const out = result.outputs.get("/test/app.scrml");

    expect(out.clientJs).toContain('=== "Active"');
  });

  test("if={status is .Done} — client JS contains === \"Done\"", () => {
    const node = makeMarkupNode("div", [exprAttr("if", "status is .Done", [])], [
      { kind: "text", value: "text", span: span(0) }
    ]);
    const result = compile(node);
    const out = result.outputs.get("/test/app.scrml");

    expect(out.clientJs).toContain('=== "Done"');
  });
});

// ---------------------------------------------------------------------------
// §6  emit-event-wiring: el.style.display emitted even when refs is empty
// ---------------------------------------------------------------------------

describe("§6: el.style.display emitted even when refs is empty (non-reactive is .Variant)", () => {
  test("if={state is .Loading} — client JS contains el.style.display", () => {
    const node = makeMarkupNode("div", [exprAttr("if", "state is .Loading", [])], [
      { kind: "text", value: "text", span: span(0) }
    ]);
    const result = compile(node);
    const out = result.outputs.get("/test/app.scrml");

    expect(out.clientJs).toContain("el.style.display");
  });

  test("if={state is .Loading} — client JS contains _scrml_effect", () => {
    const node = makeMarkupNode("div", [exprAttr("if", "state is .Loading", [])], [
      { kind: "text", value: "text", span: span(0) }
    ]);
    const result = compile(node);
    const out = result.outputs.get("/test/app.scrml");

    expect(out.clientJs).toContain("_scrml_effect");
  });

  test("if={state is .Loading} — client JS contains '\"none\"' for display-off branch", () => {
    const node = makeMarkupNode("div", [exprAttr("if", "state is .Loading", [])], [
      { kind: "text", value: "text", span: span(0) }
    ]);
    const result = compile(node);
    const out = result.outputs.get("/test/app.scrml");

    expect(out.clientJs).toContain('"none"');
  });
});

// ---------------------------------------------------------------------------
// §7  emit-event-wiring: @state is .Variant (reactive) compiles correctly
// ---------------------------------------------------------------------------

describe("§7: @state is .Variant reactive expression compiles correctly", () => {
  test("if={@state is .Loading} — client JS contains _scrml_reactive_get(\"state\")", () => {
    const node = makeMarkupNode("div", [exprAttr("if", "@state is .Loading", ["state"])], [
      { kind: "text", value: "text", span: span(0) }
    ]);
    const result = compile(node);
    const out = result.outputs.get("/test/app.scrml");

    expect(out.clientJs).toContain('_scrml_reactive_get("state")');
  });

  test("if={@state is .Loading} — client JS contains === \"Loading\"", () => {
    const node = makeMarkupNode("div", [exprAttr("if", "@state is .Loading", ["state"])], [
      { kind: "text", value: "text", span: span(0) }
    ]);
    const result = compile(node);
    const out = result.outputs.get("/test/app.scrml");

    expect(out.clientJs).toContain('=== "Loading"');
  });

  test("if={@state is .Loading} — client JS contains el.style.display toggle", () => {
    const node = makeMarkupNode("div", [exprAttr("if", "@state is .Loading", ["state"])], [
      { kind: "text", value: "text", span: span(0) }
    ]);
    const result = compile(node);
    const out = result.outputs.get("/test/app.scrml");

    expect(out.clientJs).toContain("el.style.display");
    expect(out.clientJs).toContain('"none"');
  });
});

// ---------------------------------------------------------------------------
// §8  Full pipeline: if={state is .Loading} round-trip
// ---------------------------------------------------------------------------

describe("§8: full pipeline round-trip for if={state is .Loading}", () => {
  test("HTML placeholder and client JS wiring both emitted", () => {
    const source = `<program>
<div if={state is .Loading}>
  Loading...</>
</>`;
    const bsOut = splitBlocks("test.scrml", source);
    const { ast } = buildAST(bsOut);
    const result = runCG({
      files: [ast],
      routeMap: makeRouteMap(),
      depGraph: makeDepGraph(),
      protectAnalysis: makeProtectAnalysis(),
    });
    const out = result.outputs.get("test.scrml");

    expect(out.html).toContain("data-scrml-bind-if=");
    expect(out.clientJs).toContain('=== "Loading"');
    expect(out.clientJs).toContain("el.style.display");
  });
});

// ---------------------------------------------------------------------------
// §9  Full pipeline: if={@state is .Active} reactive round-trip
// ---------------------------------------------------------------------------

describe("§9: full pipeline round-trip for if={@state is .Active}", () => {
  test("HTML placeholder emitted with reactive condition", () => {
    const source = `<program>
<div if={@state is .Active}>
  Active content</>
</>`;
    const bsOut = splitBlocks("test.scrml", source);
    const { ast } = buildAST(bsOut);
    const result = runCG({
      files: [ast],
      routeMap: makeRouteMap(),
      depGraph: makeDepGraph(),
      protectAnalysis: makeProtectAnalysis(),
    });
    const out = result.outputs.get("test.scrml");

    expect(out.html).toContain("data-scrml-bind-if=");
    expect(out.clientJs).toContain('_scrml_reactive_get("state")');
    expect(out.clientJs).toContain('=== "Active"');
  });
});
