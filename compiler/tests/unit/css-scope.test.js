/**
 * CSS @scope — Unit Tests
 *
 * Tests for native CSS @scope wrapping of component-level style blocks.
 * Design decision: compiler wraps constructor-level #{} CSS in a native @scope block.
 * Class names are NEVER mangled. Source CSS = compiled CSS.
 *
 * Coverage:
 *   T1  Component CSS (css-inline inside _expandedFrom node) wrapped in @scope
 *   T2  Program-level CSS (not inside a component) NOT wrapped
 *   T3  data-scrml-scope attribute appears on component root element
 *   T4  data-scrml-scope does NOT appear on non-component elements
 *   T5  Nested components each get their own @scope (donut scope boundary)
 *   T6  data-scrml-scope is the FIRST attribute emitted (before other attrs)
 *   T7  Style block inside a component is wrapped in @scope
 *   T8  Program-level style block is NOT wrapped
 *   T9  Multiple components produce separate @scope blocks
 *   T10 @scope selector uses correct donut syntax
 */

import { describe, test, expect } from "bun:test";
import { runCG } from "../../src/code-generator.js";
import { generateCss } from "../../src/codegen/emit-css.ts";
import { collectCssBlocks } from "../../src/codegen/collect.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function span(start, file = "/test/app.scrml") {
  return { file, start, end: start + 10, line: 1, col: start + 1 };
}

function makeFileAST(filePath, nodes, opts = {}) {
  return {
    filePath,
    nodes,
    imports: opts.imports ?? [],
    exports: opts.exports ?? [],
    components: opts.components ?? [],
    typeDecls: opts.typeDecls ?? [],
    nodeTypes: opts.nodeTypes ?? new Map(),
    componentShapes: opts.componentShapes ?? new Map(),
    scopeChain: opts.scopeChain ?? null,
  };
}

function makeMarkupNode(tag, attrs = [], children = [], opts = {}) {
  return {
    kind: "markup",
    tag,
    attributes: attrs,
    children,
    selfClosing: opts.selfClosing ?? (children.length === 0 && opts.void !== true ? false : false),
    span: opts.span ?? span(0),
    ...(opts._expandedFrom ? { _expandedFrom: opts._expandedFrom } : {}),
  };
}

/**
 * Simulate a component-expanded root node (as CE produces with _expandedFrom set).
 */
function makeExpandedComponent(componentName, tag, children = []) {
  return {
    kind: "markup",
    tag,
    attributes: [],
    children,
    selfClosing: false,
    _expandedFrom: componentName,
    isComponent: false,
    span: span(0),
  };
}

function makeCssInlineBlock(body, s = span(0)) {
  return { kind: "css-inline", body, span: s };
}

function makeStyleBlock(body, s = span(0)) {
  return { kind: "style", body, span: s };
}

function makeRouteMap() {
  return { functions: new Map() };
}

function runCGSimple(nodes, filePath = "/test/app.scrml") {
  const fileAST = makeFileAST(filePath, nodes);
  const result = runCG({
    files: [fileAST],
    routeMap: makeRouteMap(),
    depGraph: { nodes: new Map(), edges: [] },
    protectAnalysis: { views: new Map() },
  });
  const output = result.outputs.get(filePath);
  return { output, errors: result.errors };
}

// ---------------------------------------------------------------------------
// T1: Component CSS wrapped in @scope
// ---------------------------------------------------------------------------

describe("CSS @scope — component scoping", () => {
  test("T1: css-inline inside a component root node is wrapped in @scope", () => {
    const cssBlock = makeCssInlineBlock(".card { color: red; }");
    const componentRoot = makeExpandedComponent("Card", "div", [cssBlock]);
    const nodes = [componentRoot];

    const css = generateCss(nodes);

    expect(css).toContain('@scope ([data-scrml-scope="Card"])');
    expect(css).toContain(".card { color: red; }");
    // The @scope block should contain the CSS
    expect(css).toMatch(/@scope.*{[\s\S]*.card { color: red; }[\s\S]*}/);
  });

  test("T2: program-level css-inline is NOT wrapped in @scope", () => {
    const cssBlock = makeCssInlineBlock("body { margin: 0; }");
    const nodes = [cssBlock];

    const css = generateCss(nodes);

    expect(css).not.toContain("@scope");
    expect(css).toContain("body { margin: 0; }");
  });

  test("T3: data-scrml-scope attribute on component root element", () => {
    const componentRoot = makeExpandedComponent("Card", "div", []);
    const nodes = [componentRoot];

    const { output } = runCGSimple(nodes);
    const html = output?.html ?? "";

    expect(html).toContain('data-scrml-scope="Card"');
  });

  test("T4: data-scrml-scope NOT on non-component elements", () => {
    const plainDiv = makeMarkupNode("div", [], []);
    const nodes = [plainDiv];

    const { output } = runCGSimple(nodes);
    const html = output?.html ?? "";

    expect(html).not.toContain("data-scrml-scope");
  });

  test("T5: nested components each get their own @scope (donut scope boundary)", () => {
    // Inner component: Button inside Card
    const innerCss = makeCssInlineBlock(".btn { font-size: 14px; }");
    const innerComponent = makeExpandedComponent("Button", "button", [innerCss]);

    const outerCss = makeCssInlineBlock(".card { padding: 16px; }");
    const outerComponent = makeExpandedComponent("Card", "div", [outerCss, innerComponent]);

    const nodes = [outerComponent];
    const css = generateCss(nodes);

    // Both components should have their own @scope block
    expect(css).toContain('@scope ([data-scrml-scope="Card"])');
    expect(css).toContain('@scope ([data-scrml-scope="Button"])');

    // Each uses donut scope — stops at its own boundary
    expect(css).toContain('to ([data-scrml-scope]:not([data-scrml-scope="Card"]))');
    expect(css).toContain('to ([data-scrml-scope]:not([data-scrml-scope="Button"]))');

    // CSS content is unchanged (no class mangling)
    expect(css).toContain(".card { padding: 16px; }");
    expect(css).toContain(".btn { font-size: 14px; }");
  });

  test("T6: data-scrml-scope is emitted before other attributes", () => {
    // Component root with a class attribute
    const componentRoot = {
      kind: "markup",
      tag: "div",
      attributes: [{ name: "class", value: { kind: "string-literal", value: "wrapper" } }],
      children: [],
      selfClosing: false,
      _expandedFrom: "Wrapper",
      isComponent: false,
      span: span(0),
    };
    const nodes = [componentRoot];
    const { output } = runCGSimple(nodes);
    const html = output?.html ?? "";

    // data-scrml-scope should appear before class in the tag
    const scopeIdx = html.indexOf('data-scrml-scope="Wrapper"');
    const classIdx = html.indexOf('class="wrapper"');
    expect(scopeIdx).toBeGreaterThanOrEqual(0);
    expect(classIdx).toBeGreaterThanOrEqual(0);
    expect(scopeIdx).toBeLessThan(classIdx);
  });

  test("T7: style block inside a component is wrapped in @scope", () => {
    const styleBlock = makeStyleBlock(".heading { font-weight: bold; }");
    const componentRoot = makeExpandedComponent("Hero", "section", [styleBlock]);
    const nodes = [componentRoot];

    const css = generateCss(nodes);

    expect(css).toContain('@scope ([data-scrml-scope="Hero"])');
    expect(css).toContain(".heading { font-weight: bold; }");
  });

  test("T8: program-level style block is NOT wrapped in @scope", () => {
    const styleBlock = makeStyleBlock(":root { --color: blue; }");
    const nodes = [styleBlock];

    const css = generateCss(nodes);

    expect(css).not.toContain("@scope");
    expect(css).toContain(":root { --color: blue; }");
  });

  test("T9: multiple components produce separate @scope blocks", () => {
    const cardCss = makeCssInlineBlock(".card { background: white; }");
    const cardRoot = makeExpandedComponent("Card", "div", [cardCss]);

    const badgeCss = makeCssInlineBlock(".badge { color: green; }");
    const badgeRoot = makeExpandedComponent("Badge", "span", [badgeCss]);

    const nodes = [cardRoot, badgeRoot];
    const css = generateCss(nodes);

    expect(css).toContain('@scope ([data-scrml-scope="Card"])');
    expect(css).toContain('@scope ([data-scrml-scope="Badge"])');
    expect(css).toContain(".card { background: white; }");
    expect(css).toContain(".badge { color: green; }");
  });

  test("T10: @scope selector uses correct donut syntax", () => {
    const cssBlock = makeCssInlineBlock(".item { display: flex; }");
    const componentRoot = makeExpandedComponent("List", "ul", [cssBlock]);
    const nodes = [componentRoot];

    const css = generateCss(nodes);

    // Full donut @scope pattern
    expect(css).toContain(
      '@scope ([data-scrml-scope="List"]) to ([data-scrml-scope]:not([data-scrml-scope="List"])) {'
    );
  });
});

// ---------------------------------------------------------------------------
// collectCssBlocks — _componentScope tagging unit tests
// ---------------------------------------------------------------------------

describe("collectCssBlocks — _componentScope tagging", () => {
  test("program-level css-inline block has _componentScope: null", () => {
    const cssBlock = makeCssInlineBlock("a { color: blue; }");
    const { inlineBlocks } = collectCssBlocks([cssBlock]);
    expect(inlineBlocks).toHaveLength(1);
    expect(inlineBlocks[0]._componentScope).toBeNull();
  });

  test("css-inline inside _expandedFrom node has _componentScope set to component name", () => {
    const cssBlock = makeCssInlineBlock(".btn { padding: 8px; }");
    const componentRoot = makeExpandedComponent("Button", "button", [cssBlock]);
    const { inlineBlocks } = collectCssBlocks([componentRoot]);
    expect(inlineBlocks).toHaveLength(1);
    expect(inlineBlocks[0]._componentScope).toBe("Button");
  });

  test("css-inline nested two levels inside a component has _componentScope set", () => {
    const cssBlock = makeCssInlineBlock(".inner { color: red; }");
    const innerDiv = makeMarkupNode("div", [], [cssBlock]);
    const componentRoot = makeExpandedComponent("Card", "article", [innerDiv]);
    const { inlineBlocks } = collectCssBlocks([componentRoot]);
    expect(inlineBlocks).toHaveLength(1);
    expect(inlineBlocks[0]._componentScope).toBe("Card");
  });

  test("nested component inner CSS gets innermost _expandedFrom as scope", () => {
    // Inner component's CSS should get "Button" scope, not "Card" scope
    const innerCss = makeCssInlineBlock(".btn { }");
    const innerComp = makeExpandedComponent("Button", "button", [innerCss]);

    const outerCss = makeCssInlineBlock(".card { }");
    const outerComp = makeExpandedComponent("Card", "div", [outerCss, innerComp]);

    const { inlineBlocks } = collectCssBlocks([outerComp]);

    // Two blocks total
    expect(inlineBlocks).toHaveLength(2);

    const cardBlock = inlineBlocks.find(b => b.body === ".card { }");
    const btnBlock = inlineBlocks.find(b => b.body === ".btn { }");

    expect(cardBlock?._componentScope).toBe("Card");
    expect(btnBlock?._componentScope).toBe("Button");
  });
});
