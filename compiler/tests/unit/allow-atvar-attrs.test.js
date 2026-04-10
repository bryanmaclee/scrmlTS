/**
 * allow-atvar-in-attrs — Unit Tests
 *
 * Tests that @var syntax is accepted in attribute values across the full
 * pipeline: tokenizer → AST builder → codegen.
 *
 * Coverage:
 *   §1  show=@count compiles without error (@ stripped, same as show=count)
 *   §2  if=@visible compiles correctly (produces data-scrml-bind-if)
 *   §3  show=count still works (no regression)
 *   §4  bind:value=@var still works (no regression)
 *   §5  Tokenizer accepts @ in attribute values
 *   §6  AST builder preserves @ in variable-ref name
 *   §7  Multiple @-prefixed attributes on same element
 *   §8  @-prefixed attribute with dotted path (show=@obj.field)
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

/** Parse a scrml source string and return { attrs, errors }. */
function parseSource(source) {
  const bsOut = splitBlocks("test.scrml", source);
  const result = buildAST(bsOut);
  const node = result.ast.nodes.find(n => n.kind === "markup" && n.tag !== "program")
    ?? result.ast.nodes.find(n => n.kind === "markup");
  const attrs = node ? (node.attrs ?? node.attributes ?? []) : [];
  return { attrs, errors: result.errors ?? [] };
}

/** Build a markup AST node with given attributes. */
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

/** Compile a single markup node through the full CG pipeline. */
function compile(markupNode) {
  const ast = makeFileAST([markupNode]);
  return runCG({
    files: [ast],
    routeMap: makeRouteMap(),
    depGraph: makeDepGraph(),
    protectAnalysis: makeProtectAnalysis(),
  });
}

/** Build a variable-ref attribute value node. */
function varRefAttr(name, varName) {
  return {
    name,
    value: { kind: "variable-ref", name: varName, span: span(0) },
    span: span(0),
  };
}

beforeEach(() => {
  resetVarCounter();
});

// ---------------------------------------------------------------------------
// §1  show=@count compiles without error (@ stripped, same as show=count)
// ---------------------------------------------------------------------------

describe("§1: show=@count compiles without error", () => {
  test("tokenizer accepts show=@count", () => {
    const tokens = tokenizeAttributes("<div show=@count>", 0, 1, 1, "markup");
    const identTok = tokens.find(t => t.kind === "ATTR_IDENT");
    expect(identTok).toBeDefined();
    expect(identTok.text).toBe("@count");
  });

  test("AST builder produces variable-ref for show=@count", () => {
    const { attrs, errors } = parseSource("<div show=@count>text</>");
    const showAttr = attrs.find(a => a.name === "show");
    expect(showAttr).toBeDefined();
    expect(showAttr.value.kind).toBe("variable-ref");
    expect(showAttr.value.name).toBe("@count");
    // No errors for @ in attribute value
    const attrErrors = errors.filter(e => e.code && e.code.startsWith("E-ATTR"));
    expect(attrErrors).toHaveLength(0);
  });

  test("codegen strips @ and outputs show=\"count\" (same as show=count)", () => {
    const node = makeMarkupNode("div", [varRefAttr("show", "@count")], [
      { kind: "text", value: "text", span: span(0) }
    ]);
    const result = compile(node);
    const out = result.outputs.get("/test/app.scrml");
    expect(out.html).toContain('show="count"');
    // No data-scrml-bind-show placeholder — @ was stripped
    expect(out.html).not.toContain("data-scrml-bind-show");
  });
});

// ---------------------------------------------------------------------------
// §2  if=@visible compiles correctly (produces data-scrml-bind-if)
// ---------------------------------------------------------------------------

describe("§2: if=@visible compiles correctly", () => {
  test("if=@visible produces data-scrml-bind-if", () => {
    const node = makeMarkupNode("div", [varRefAttr("if", "@visible")], [
      { kind: "text", value: "text", span: span(0) }
    ]);
    const result = compile(node);
    const out = result.outputs.get("/test/app.scrml");
    expect(out.html).toContain("data-scrml-bind-if=");
  });

  test("if=@visible wires reactive subscription", () => {
    const node = makeMarkupNode("div", [varRefAttr("if", "@visible")], [
      { kind: "text", value: "text", span: span(0) }
    ]);
    const result = compile(node);
    const out = result.outputs.get("/test/app.scrml");
    expect(out.clientJs).toContain('_scrml_effect(');
    expect(out.clientJs).toContain("el.style.display");
  });

  test("if=@visible does not strip the @ prefix", () => {
    const node = makeMarkupNode("span", [varRefAttr("if", "@visible")], [
      { kind: "text", value: "shown", span: span(0) }
    ]);
    const result = compile(node);
    const out = result.outputs.get("/test/app.scrml");
    // if= should NOT produce if="visible" — it produces data-scrml-bind-if
    expect(out.html).not.toContain('if="visible"');
    expect(out.html).toContain("data-scrml-bind-if=");
  });
});

// ---------------------------------------------------------------------------
// §3  show=count still works (no regression)
// ---------------------------------------------------------------------------

describe("§3: show=count still works (no regression)", () => {
  test("show=count (no @) produces show=\"count\" literal", () => {
    const node = makeMarkupNode("div", [varRefAttr("show", "count")], [
      { kind: "text", value: "text", span: span(0) }
    ]);
    const result = compile(node);
    const out = result.outputs.get("/test/app.scrml");
    expect(out.html).toContain('show="count"');
  });

  test("show=@count and show=count produce identical output", () => {
    // With @
    const nodeWith = makeMarkupNode("div", [varRefAttr("show", "@count")], [
      { kind: "text", value: "a", span: span(0) }
    ]);
    const resultWith = compile(nodeWith);
    const htmlWith = resultWith.outputs.get("/test/app.scrml").html;

    resetVarCounter();

    // Without @
    const nodeWithout = makeMarkupNode("div", [varRefAttr("show", "count")], [
      { kind: "text", value: "a", span: span(0) }
    ]);
    const resultWithout = compile(nodeWithout);
    const htmlWithout = resultWithout.outputs.get("/test/app.scrml").html;

    expect(htmlWith).toBe(htmlWithout);
  });
});

// ---------------------------------------------------------------------------
// §4  bind:value=@var still works (no regression)
// ---------------------------------------------------------------------------

describe("§4: bind:value=@var still works (no regression)", () => {
  test("bind:value=@name produces data-scrml-bind-value", () => {
    const node = makeMarkupNode("input", [
      { name: "bind:value", value: { kind: "variable-ref", name: "@name" }, span: span(0) }
    ], [], { selfClosing: true });
    const result = compile(node);
    const out = result.outputs.get("/test/app.scrml");
    // bind: attributes are handled separately (before the variable-ref path)
    expect(out.html).toContain("data-scrml-bind-value=");
  });

  test("bind:checked=@agreed produces data-scrml-bind-checked", () => {
    const node = makeMarkupNode("input", [
      { name: "type", value: { kind: "string-literal", value: "checkbox" }, span: span(0) },
      { name: "bind:checked", value: { kind: "variable-ref", name: "@agreed" }, span: span(0) }
    ], [], { selfClosing: true });
    const result = compile(node);
    const out = result.outputs.get("/test/app.scrml");
    expect(out.html).toContain("data-scrml-bind-checked=");
  });
});

// ---------------------------------------------------------------------------
// §5  Tokenizer accepts @ in attribute values
// ---------------------------------------------------------------------------

describe("§5: tokenizer accepts @ in attribute values", () => {
  test("@myVar produces ATTR_IDENT with @ prefix", () => {
    const tokens = tokenizeAttributes("<div data-x=@myVar>", 0, 1, 1, "markup");
    const identTok = tokens.find(t => t.kind === "ATTR_IDENT");
    expect(identTok).toBeDefined();
    expect(identTok.text).toBe("@myVar");
  });

  test("@ at start of value does not produce ATTR_EXPR", () => {
    const tokens = tokenizeAttributes("<div show=@count>", 0, 1, 1, "markup");
    const exprTok = tokens.find(t => t.kind === "ATTR_EXPR");
    expect(exprTok).toBeUndefined();
  });

  test("@dotted.path tokenizes as single ATTR_IDENT", () => {
    const tokens = tokenizeAttributes("<div show=@obj.field>", 0, 1, 1, "markup");
    const identTok = tokens.find(t => t.kind === "ATTR_IDENT");
    expect(identTok).toBeDefined();
    expect(identTok.text).toBe("@obj.field");
  });
});

// ---------------------------------------------------------------------------
// §6  AST builder preserves @ in variable-ref name
// ---------------------------------------------------------------------------

describe("§6: AST builder preserves @ in variable-ref name", () => {
  test("show=@count creates variable-ref with name @count", () => {
    const { attrs } = parseSource("<div show=@count>text</>");
    const attr = attrs.find(a => a.name === "show");
    expect(attr.value.kind).toBe("variable-ref");
    expect(attr.value.name).toBe("@count");
  });

  test("if=@visible creates variable-ref with name @visible", () => {
    const { attrs } = parseSource("<div if=@visible>text</>");
    const attr = attrs.find(a => a.name === "if");
    expect(attr.value.kind).toBe("variable-ref");
    expect(attr.value.name).toBe("@visible");
  });

  test("no E-ATTR errors for @-prefixed regular attribute values", () => {
    const { errors } = parseSource("<div show=@count title=@name>text</>");
    const attrErrors = errors.filter(e => e.code && e.code.startsWith("E-ATTR"));
    expect(attrErrors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// §7  Multiple @-prefixed attributes on same element
// ---------------------------------------------------------------------------

describe("§7: multiple @-prefixed attributes on same element", () => {
  test("show=@x title=@y both strip @ in output", () => {
    const node = makeMarkupNode("div", [
      varRefAttr("show", "@x"),
      varRefAttr("title", "@y"),
    ], [
      { kind: "text", value: "text", span: span(0) }
    ]);
    const result = compile(node);
    const out = result.outputs.get("/test/app.scrml");
    expect(out.html).toContain('show="x"');
    expect(out.html).toContain('title="y"');
  });

  test("if=@visible + show=@count — if reactive, show literal", () => {
    const node = makeMarkupNode("div", [
      varRefAttr("if", "@visible"),
      varRefAttr("show", "@count"),
    ], [
      { kind: "text", value: "text", span: span(0) }
    ]);
    const result = compile(node);
    const out = result.outputs.get("/test/app.scrml");
    expect(out.html).toContain("data-scrml-bind-if=");
    expect(out.html).toContain('show="count"');
  });
});

// ---------------------------------------------------------------------------
// §8  @-prefixed attribute with dotted path (show=@obj.field)
// ---------------------------------------------------------------------------

describe("§8: @-prefixed attribute with dotted path", () => {
  test("show=@obj.field strips @ and outputs show=\"obj.field\"", () => {
    const node = makeMarkupNode("div", [varRefAttr("show", "@obj.field")], [
      { kind: "text", value: "text", span: span(0) }
    ]);
    const result = compile(node);
    const out = result.outputs.get("/test/app.scrml");
    expect(out.html).toContain('show="obj.field"');
  });

  test("if=@user.loggedIn keeps @ behavior (reactive binding)", () => {
    const node = makeMarkupNode("div", [varRefAttr("if", "@user.loggedIn")], [
      { kind: "text", value: "text", span: span(0) }
    ]);
    const result = compile(node);
    const out = result.outputs.get("/test/app.scrml");
    expect(out.html).toContain("data-scrml-bind-if=");
    expect(out.html).not.toContain('if="user.loggedIn"');
  });
});
