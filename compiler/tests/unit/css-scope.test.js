/**
 * CSS @scope — Unit Tests
 *
 * Tests for native CSS @scope wrapping of component-level style blocks.
 * Design decision DQ-7: compiler wraps constructor-level #{} CSS in a native @scope block.
 * Class names are NEVER mangled. Source CSS = compiled CSS.
 *
 * Coverage:
 *   T1  Component CSS (css-inline inside _expandedFrom node) wrapped in @scope
 *   T2  Program-level CSS (not inside a component) NOT wrapped
 *   T3  data-scrml attribute appears on component root element
 *   T4  data-scrml does NOT appear on non-component elements
 *   T5  Nested components each get their own @scope (donut scope boundary)
 *   T6  data-scrml is the FIRST attribute emitted (before other attrs)
 *   T7  Style block inside a component is wrapped in @scope
 *   T8  Program-level style block is NOT wrapped
 *   T9  Multiple components produce separate @scope blocks
 *   T10 @scope selector uses correct donut syntax (DQ-7: to ([data-scrml]))
 *   T11 Flat-declaration #{} inside a component emits as inline style="" (DQ-7)
 *   T12 Flat-declaration #{} inside a component does NOT appear in CSS output
 *   T13 Flat-declaration #{} at program scope still emits to CSS (not inline)
 *   T14 Mixed flat+selector #{} inside a component: selector → @scope, flat → inline style
 *   T15 data-scrml attribute on component root uses exact value "ComponentName"
 */

import { describe, test, expect } from "bun:test";
import { runCG } from "../../src/code-generator.js";
import { generateCss, isFlatDeclarationBlock, renderFlatDeclarationAsInlineStyle } from "../../src/codegen/emit-css.ts";
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

function makeCssInlineWithRules(rules, s = span(0)) {
  return { kind: "css-inline", rules, span: s };
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

describe("CSS @scope — component scoping (DQ-7)", () => {
  test("T1: css-inline inside a component root node is wrapped in @scope", () => {
    const cssBlock = makeCssInlineBlock(".card { color: red; }");
    const componentRoot = makeExpandedComponent("Card", "div", [cssBlock]);
    const nodes = [componentRoot];

    const css = generateCss(nodes);

    expect(css).toContain('@scope ([data-scrml="Card"])');
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

  test("T3: data-scrml attribute on component root element", () => {
    const componentRoot = makeExpandedComponent("Card", "div", []);
    const nodes = [componentRoot];

    const { output } = runCGSimple(nodes);
    const html = output?.html ?? "";

    expect(html).toContain('data-scrml="Card"');
  });

  test("T4: data-scrml scope attribute NOT on non-component elements", () => {
    const plainDiv = makeMarkupNode("div", [], []);
    const nodes = [plainDiv];

    const { output } = runCGSimple(nodes);
    const html = output?.html ?? "";

    // data-scrml="..." (with equals sign) must not appear on plain elements
    expect(html).not.toContain('data-scrml="');
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
    expect(css).toContain('@scope ([data-scrml="Card"])');
    expect(css).toContain('@scope ([data-scrml="Button"])');

    // DQ-7 donut scope: to ([data-scrml]) — stops at ANY nested [data-scrml] boundary
    expect(css).toContain('to ([data-scrml])');

    // CSS content is unchanged (no class mangling)
    expect(css).toContain(".card { padding: 16px; }");
    expect(css).toContain(".btn { font-size: 14px; }");
  });

  test("T6: data-scrml is emitted before other attributes", () => {
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

    // data-scrml should appear before class in the tag
    const scopeIdx = html.indexOf('data-scrml="Wrapper"');
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

    expect(css).toContain('@scope ([data-scrml="Hero"])');
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

    expect(css).toContain('@scope ([data-scrml="Card"])');
    expect(css).toContain('@scope ([data-scrml="Badge"])');
    expect(css).toContain(".card { background: white; }");
    expect(css).toContain(".badge { color: green; }");
  });

  test("T10: @scope selector uses correct DQ-7 donut syntax", () => {
    const cssBlock = makeCssInlineBlock(".item { display: flex; }");
    const componentRoot = makeExpandedComponent("List", "ul", [cssBlock]);
    const nodes = [componentRoot];

    const css = generateCss(nodes);

    // DQ-7 donut scope: parent stops at any [data-scrml] boundary (any child constructor)
    expect(css).toContain(
      '@scope ([data-scrml="List"]) to ([data-scrml]) {'
    );
  });

  test("T15: data-scrml attribute value matches component name exactly", () => {
    const componentRoot = makeExpandedComponent("TodoItem", "li", []);
    const nodes = [componentRoot];

    const { output } = runCGSimple(nodes);
    const html = output?.html ?? "";

    expect(html).toContain('data-scrml="TodoItem"');
    // Must not use old data-scrml-scope attribute name
    expect(html).not.toContain("data-scrml-scope");
  });
});

// ---------------------------------------------------------------------------
// T11-T14: Flat-declaration #{} → inline style="" (DQ-7)
// ---------------------------------------------------------------------------

describe("CSS @scope — flat-declaration inline style (DQ-7)", () => {
  test("T11: flat-declaration #{} inside a component emits as inline style='' on the element", () => {
    // Flat-declaration #{}: only prop:value pairs, no selectors
    const flatCss = makeCssInlineWithRules([
      { prop: "color", value: "red", span: span(0) },
      { prop: "font-size", value: "14px", span: span(0) },
    ]);
    const componentRoot = makeExpandedComponent("Card", "div", [flatCss]);
    const nodes = [componentRoot];

    const { output } = runCGSimple(nodes);
    const html = output?.html ?? "";

    // The flat CSS should appear as inline style on the element
    expect(html).toContain('style="');
    expect(html).toContain("color: red;");
    expect(html).toContain("font-size: 14px;");
  });

  test("T12: flat-declaration #{} inside a component does NOT appear in CSS output", () => {
    const flatCss = makeCssInlineWithRules([
      { prop: "margin", value: "0", span: span(0) },
    ]);
    const componentRoot = makeExpandedComponent("Card", "div", [flatCss]);
    const nodes = [componentRoot];

    // generateCss should NOT include the flat rule (it goes to inline style instead)
    const css = generateCss(nodes);

    // Should not appear in @scope block (flat-declaration skipped from CSS)
    expect(css).not.toContain("margin: 0;");
    // And no @scope block at all (no selector rules to scope)
    expect(css).not.toContain("@scope");
  });

  test("T13: flat-declaration #{} at program scope still emits to global CSS (not inline)", () => {
    // At program scope, flat declarations stay in global CSS
    const flatCss = makeCssInlineWithRules([
      { prop: "color", value: "blue", span: span(0) },
    ]);
    const nodes = [flatCss]; // program-level, no _expandedFrom

    const css = generateCss(nodes);

    // Should appear in CSS output as global (no @scope)
    expect(css).toContain("color: blue;");
    expect(css).not.toContain("@scope");
  });

  test("T14: mixed #{} (flat decls + selectors) inside component: selectors→@scope, flat→inline", () => {
    // A component with two css-inline blocks:
    //   1. flat-declaration → inline style
    //   2. selector block → @scope CSS
    const flatCss = makeCssInlineWithRules([
      { prop: "display", value: "flex", span: span(0) },
    ]);
    const selectorCss = makeCssInlineBlock(".title { font-weight: bold; }");
    const componentRoot = makeExpandedComponent("Card", "div", [flatCss, selectorCss]);
    const nodes = [componentRoot];

    const css = generateCss(nodes);
    const { output } = runCGSimple(nodes);
    const html = output?.html ?? "";

    // Selector CSS → @scope block in CSS
    expect(css).toContain('@scope ([data-scrml="Card"])');
    expect(css).toContain(".title { font-weight: bold; }");

    // Flat CSS → NOT in the CSS file (goes to inline style)
    expect(css).not.toContain("display: flex;");

    // Flat CSS → appears as inline style on the HTML element
    expect(html).toContain('style="');
    expect(html).toContain("display: flex;");
  });
});

// ---------------------------------------------------------------------------
// isFlatDeclarationBlock and renderFlatDeclarationAsInlineStyle — unit tests
// ---------------------------------------------------------------------------

describe("isFlatDeclarationBlock — unit tests", () => {
  test("returns true for a block with only prop:value rules (no selectors)", () => {
    const block = makeCssInlineWithRules([
      { prop: "color", value: "red", span: span(0) },
      { prop: "margin", value: "0", span: span(0) },
    ]);
    expect(isFlatDeclarationBlock(block)).toBe(true);
  });

  test("returns false for a block with a selector rule", () => {
    const block = makeCssInlineWithRules([
      { selector: ".foo", declarations: [{ prop: "color", value: "red", span: span(0) }], span: span(0) },
    ]);
    expect(isFlatDeclarationBlock(block)).toBe(false);
  });

  test("returns false for mixed (selector + flat) block", () => {
    const block = makeCssInlineWithRules([
      { prop: "color", value: "red", span: span(0) },
      { selector: ".foo", declarations: [], span: span(0) },
    ]);
    expect(isFlatDeclarationBlock(block)).toBe(false);
  });

  test("returns false for empty rules array", () => {
    const block = makeCssInlineWithRules([]);
    expect(isFlatDeclarationBlock(block)).toBe(false);
  });

  test("returns false for body-string block (no rules array)", () => {
    const block = makeCssInlineBlock("color: red;");
    expect(isFlatDeclarationBlock(block)).toBe(false);
  });
});

describe("renderFlatDeclarationAsInlineStyle — unit tests", () => {
  test("renders flat rules as 'prop: value; prop: value;' string", () => {
    const block = makeCssInlineWithRules([
      { prop: "color", value: "red", span: span(0) },
      { prop: "font-size", value: "14px", span: span(0) },
    ]);
    const result = renderFlatDeclarationAsInlineStyle(block);
    expect(result).toContain("color: red;");
    expect(result).toContain("font-size: 14px;");
  });

  test("returns empty string for empty rules", () => {
    const block = makeCssInlineWithRules([]);
    expect(renderFlatDeclarationAsInlineStyle(block)).toBe("");
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
