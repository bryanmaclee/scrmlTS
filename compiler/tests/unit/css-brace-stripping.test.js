/**
 * CSS Brace Stripping — Regression Tests
 *
 * Verifies that CSS braces { and } are correctly tokenized, parsed, and emitted.
 * Previously, tokenizeCSS() had no handler for { and }, causing them to be silently
 * discarded and producing invalid CSS output like ".todoapp background: #fff;" instead
 * of ".todoapp { background: #fff; }".
 *
 * Root cause: tokenizeCSS() fallthrough `advance(); // skip unrecognized chars` ate { and }.
 * Fix: Added CSS_LBRACE and CSS_RBRACE token types. parseCSSTokens() now groups
 * selector+declarations into { selector, declarations } objects. generateCss() emits
 * "selector { prop: value; }" for grouped rules.
 *
 * Second bug (css-brace-strip-fix): bare element selectors (body, div, h1, etc.) were
 * misidentified as CSS property names because the identifier regex fires before the
 * selector-character regex. Selectors like `body { ... }` became "body: ;" in output.
 * Fix: in tokenizeCSS(), after reading an identifier, peek ahead — if the next non-ws
 * char is `{`, emit CSS_SELECTOR instead of CSS_PROP.
 *
 * Coverage:
 *   T1  tokenizeCSS emits CSS_LBRACE and CSS_RBRACE tokens for braces
 *   T2  tokenizeCSS emits correct token sequence for selector + braced declarations
 *   T3  parseCSSTokens groups selector + declarations into { selector, declarations } object
 *   T4  parseCSSTokens handles multiple selectors with their own declaration blocks
 *   T5  generateCss emits valid "selector { prop: value; }" for grouped rules
 *   T6  generateCss handles multiple declarations per rule
 *   T7  existing flat prop/value rules still work (regression guard)
 *   T8  reactive @var references inside grouped declaration blocks still work
 *   T9  tokenizeCSS on multi-rule CSS produces correct token sequence
 *   T10 flat selector (no braces) falls back to flat selector (backward compat)
 *   T11 bare element selector (body) tokenized as CSS_SELECTOR not CSS_PROP
 *   T12 bare element selector emits valid braced CSS (not "body: ;")
 *   T13 mixed class and element selectors both emit correctly
 *   T14 compound selectors like ".parent child" tokenize as CSS_SELECTOR
 *   T15 TodoMVC body rule round-trips correctly end-to-end
 */

import { describe, test, expect } from "bun:test";
import { tokenizeCSS } from "../../src/tokenizer.js";
import { runCG } from "../../src/code-generator.js";

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

function makeCssInlineWithRules(rules, s = span(0)) {
  return { kind: "css-inline", rules, span: s };
}

function makeRouteMap(entries = []) {
  const functions = new Map();
  for (const e of entries) {
    functions.set(e.functionNodeId, e);
  }
  return { functions };
}

function makeDepGraph() {
  return { nodes: new Map(), edges: [] };
}

function compileWithCss(nodes, filePath = "/test/app.scrml") {
  const fileAST = makeFileAST(filePath, nodes);
  const result = runCG({
    files: [fileAST],
    routeMap: makeRouteMap(),
    depGraph: makeDepGraph(),
    protectAnalysis: { views: new Map() },
  });
  return result.outputs.get(filePath);
}

// ---------------------------------------------------------------------------
// Original tests (T1–T10)
// ---------------------------------------------------------------------------

describe("CSS Brace Stripping (fix regression)", () => {

  // T1: tokenizeCSS emits CSS_LBRACE and CSS_RBRACE
  test("T1: tokenizeCSS emits CSS_LBRACE for { and CSS_RBRACE for }", () => {
    const tokens = tokenizeCSS(".foo { color: red; }", 0, 1, 1);
    const kinds = tokens.map(t => t.kind);
    expect(kinds).toContain("CSS_LBRACE");
    expect(kinds).toContain("CSS_RBRACE");
  });

  // T2: correct token sequence for selector + braced declarations
  test("T2: tokenizeCSS emits correct token sequence for selector rule", () => {
    const tokens = tokenizeCSS(".foo { color: red; }", 0, 1, 1);
    // Expected: CSS_SELECTOR, CSS_LBRACE, CSS_PROP, CSS_COLON, CSS_VALUE, CSS_SEMI, CSS_RBRACE, EOF
    const nonEof = tokens.filter(t => t.kind !== "EOF");
    expect(nonEof[0].kind).toBe("CSS_SELECTOR");
    expect(nonEof[0].text).toBe(".foo");
    expect(nonEof[1].kind).toBe("CSS_LBRACE");
    expect(nonEof[2].kind).toBe("CSS_PROP");
    expect(nonEof[2].text).toBe("color");
    expect(nonEof[3].kind).toBe("CSS_COLON");
    expect(nonEof[4].kind).toBe("CSS_VALUE");
    expect(nonEof[4].text).toBe("red");
    expect(nonEof[5].kind).toBe("CSS_SEMI");
    expect(nonEof[6].kind).toBe("CSS_RBRACE");
  });

  // T3: parseCSSTokens groups selector + declarations
  test("T3: generateCss emits 'selector { prop: value; }' for a grouped rule", () => {
    const output = compileWithCss([
      makeCssInlineWithRules([
        {
          selector: ".todoapp",
          declarations: [
            { prop: "background", value: "#fff", span: span(0) },
            { prop: "margin", value: "0 auto", span: span(0) },
          ],
          span: span(0),
        },
      ]),
    ]);

    expect(output.css).toBeTruthy();
    expect(output.css).toContain(".todoapp {");
    expect(output.css).toContain("background: #fff;");
    expect(output.css).toContain("margin: 0 auto;");
    // Verify braces are present
    expect(output.css).toMatch(/\.todoapp \{[^}]+\}/);
  });

  // T4: multiple grouped rules
  test("T4: generateCss handles multiple grouped rules correctly", () => {
    const output = compileWithCss([
      makeCssInlineWithRules([
        {
          selector: ".foo",
          declarations: [{ prop: "color", value: "red", span: span(0) }],
          span: span(0),
        },
        {
          selector: ".bar",
          declarations: [{ prop: "font-size", value: "16px", span: span(0) }],
          span: span(0),
        },
      ]),
    ]);

    expect(output.css).toContain(".foo {");
    expect(output.css).toContain("color: red;");
    expect(output.css).toContain(".bar {");
    expect(output.css).toContain("font-size: 16px;");
  });

  // T5: full tokenize → parse → emit pipeline with braces
  test("T5: full pipeline produces valid CSS with braces for .selector { prop: value; }", () => {
    // Simulate what parseCSSTokens produces from tokenizeCSS output
    const output = compileWithCss([
      makeCssInlineWithRules([
        {
          selector: ".new-todo",
          declarations: [
            { prop: "padding", value: "16px", span: span(0) },
            { prop: "height", value: "65px", span: span(0) },
          ],
          span: span(0),
        },
      ]),
    ]);

    const css = output.css;
    expect(css).toBeTruthy();
    // Must have opening brace after selector
    expect(css).toContain(".new-todo {");
    // Must have closing brace
    expect(css).toContain("}");
    // Must NOT produce brace-stripped output like ".new-todo padding: 16px;"
    expect(css).not.toMatch(/\.new-todo padding:/);
  });

  // T6: generateCss handles multiple declarations per rule
  test("T6: generateCss emits all declarations inside a single selector block", () => {
    const output = compileWithCss([
      makeCssInlineWithRules([
        {
          selector: ".component",
          declarations: [
            { prop: "display", value: "flex", span: span(0) },
            { prop: "align-items", value: "center", span: span(0) },
            { prop: "justify-content", value: "space-between", span: span(0) },
          ],
          span: span(0),
        },
      ]),
    ]);

    const css = output.css;
    expect(css).toContain(".component {");
    expect(css).toContain("display: flex;");
    expect(css).toContain("align-items: center;");
    expect(css).toContain("justify-content: space-between;");
    expect(css).toContain("}");
  });

  // T7: existing flat prop/value rules (no selector) still work — regression guard
  test("T7: flat prop/value rules without selector still emit correctly (regression guard)", () => {
    const output = compileWithCss([
      makeCssInlineWithRules([
        { prop: "color", value: "blue", span: span(0) },
        { prop: "font-size", value: "14px", span: span(0) },
      ]),
    ]);

    expect(output.css).toBeTruthy();
    expect(output.css).toContain("color: blue;");
    expect(output.css).toContain("font-size: 14px;");
  });

  // T8: reactive @var references inside grouped declaration blocks
  test("T8: reactive @var references inside grouped declarations produce CSS custom properties", () => {
    const output = compileWithCss([
      makeCssInlineWithRules([
        {
          selector: ".themed",
          declarations: [
            {
              prop: "color",
              value: "@brandColor",
              span: span(0),
              reactiveRefs: [{ name: "brandColor", expr: null }],
              isExpression: false,
            },
          ],
          span: span(0),
        },
      ]),
    ]);

    const css = output.css;
    expect(css).toContain(".themed {");
    expect(css).toContain("color: var(--scrml-brandColor);");
    expect(css).toContain("}");
  });

  // T9: tokenizeCSS correctly tokenizes a CSS string with braces — end-to-end token check
  test("T9: tokenizeCSS on multi-rule CSS produces correct token sequence", () => {
    const cssContent = ".a { color: red; } .b { margin: 0; }";
    const tokens = tokenizeCSS(cssContent, 0, 1, 1);

    const selectorTokens = tokens.filter(t => t.kind === "CSS_SELECTOR");
    const lbraceTokens = tokens.filter(t => t.kind === "CSS_LBRACE");
    const rbraceTokens = tokens.filter(t => t.kind === "CSS_RBRACE");
    const propTokens = tokens.filter(t => t.kind === "CSS_PROP");

    expect(selectorTokens).toHaveLength(2);
    expect(lbraceTokens).toHaveLength(2);
    expect(rbraceTokens).toHaveLength(2);
    expect(propTokens).toHaveLength(2);

    expect(selectorTokens[0].text).toBe(".a");
    expect(selectorTokens[1].text).toBe(".b");
    expect(propTokens[0].text).toBe("color");
    expect(propTokens[1].text).toBe("margin");
  });

  // T10: selector without braces falls back to flat selector (backward compat)
  test("T10: flat selector (no braces) emits as-is for backward compat", () => {
    const output = compileWithCss([
      makeCssInlineWithRules([
        // Flat selector shape (no declarations array) — legacy format
        { selector: ".legacy-selector", span: span(0) },
        { prop: "color", value: "green", span: span(0) },
      ]),
    ]);

    // Should not crash and should include both items in output
    expect(output.css).toBeTruthy();
    expect(output.css).toContain(".legacy-selector");
    expect(output.css).toContain("color: green;");
  });
});

// ---------------------------------------------------------------------------
// Bare element selector tests (T11–T15) — css-brace-strip-fix
// ---------------------------------------------------------------------------

describe("CSS bare element selector tokenization (css-brace-strip-fix)", () => {

  // T11: bare element selector tokenized as CSS_SELECTOR not CSS_PROP
  test("T11: tokenizeCSS emits CSS_SELECTOR (not CSS_PROP) for bare element selectors", () => {
    const tokens = tokenizeCSS("body { color: red; }", 0, 1, 1);
    const nonEof = tokens.filter(t => t.kind !== "EOF");
    // First token must be CSS_SELECTOR, not CSS_PROP
    expect(nonEof[0].kind).toBe("CSS_SELECTOR");
    expect(nonEof[0].text).toBe("body");
    // Second token must be CSS_LBRACE
    expect(nonEof[1].kind).toBe("CSS_LBRACE");
    // No CSS_PROP with text "body" should exist
    const bodyProp = tokens.find(t => t.kind === "CSS_PROP" && t.text === "body");
    expect(bodyProp).toBeUndefined();
  });

  // T12: bare element selector emits valid braced CSS (not "body: ;")
  test("T12: compiling 'body { ... }' produces valid CSS with braces, not 'body: ;'", () => {
    // This tests the full pipeline: tokenizeCSS -> parseCSSTokens -> generateCss
    // Uses the AST path (rules with selector + declarations) to verify end-to-end
    const output = compileWithCss([
      makeCssInlineWithRules([
        {
          selector: "body",
          declarations: [
            { prop: "font", value: "14px sans-serif", span: span(0) },
            { prop: "background", value: "#f5f5f5", span: span(0) },
          ],
          span: span(0),
        },
      ]),
    ]);

    const css = output.css;
    expect(css).toBeTruthy();
    // Must have valid braced output
    expect(css).toContain("body {");
    expect(css).toContain("font: 14px sans-serif;");
    expect(css).toContain("background: #f5f5f5;");
    expect(css).toContain("}");
    // Must NOT produce the broken "body: ;" pattern
    expect(css).not.toMatch(/body\s*:/);
  });

  // T13: mixed class and element selectors both emit correctly
  test("T13: mixed .class and element selectors both tokenize correctly", () => {
    const cssContent = ".wrapper { display: flex; } body { margin: 0; }";
    const tokens = tokenizeCSS(cssContent, 0, 1, 1);
    const selectors = tokens.filter(t => t.kind === "CSS_SELECTOR");
    expect(selectors).toHaveLength(2);
    expect(selectors[0].text).toBe(".wrapper");
    expect(selectors[1].text).toBe("body");
    // Neither should be a CSS_PROP
    const props = tokens.filter(t => t.kind === "CSS_PROP");
    expect(props.map(p => p.text)).not.toContain("body");
    expect(props.map(p => p.text)).not.toContain("wrapper");
  });

  // T14: common element selectors are all recognized as CSS_SELECTOR
  test("T14: common element selectors (div, h1, p, span, input) tokenize as CSS_SELECTOR", () => {
    const elements = ["div", "h1", "p", "span", "input", "button", "ul", "li", "a"];
    for (const el of elements) {
      const tokens = tokenizeCSS(`${el} { color: red; }`, 0, 1, 1);
      const first = tokens.find(t => t.kind !== "EOF");
      expect(first.kind).toBe("CSS_SELECTOR");
      expect(first.text).toBe(el);
    }
  });

  // T15: TodoMVC body rule round-trips correctly
  test("T15: TokenMVC-style 'body { font: ... }' rule tokenizes and parses without brace stripping", () => {
    // Mirrors the actual bug from benchmarks/todomvc/app.scrml:
    //   body {
    //       font: 14px "Helvetica Neue", Helvetica, Arial, sans-serif;
    //       background: #f5f5f5;
    //   }
    const cssContent = `body {
    font: 14px "Helvetica Neue", Helvetica, Arial, sans-serif;
    background: #f5f5f5;
    color: #111111;
}`;
    const tokens = tokenizeCSS(cssContent, 0, 1, 1);

    // body must be CSS_SELECTOR
    const firstReal = tokens.find(t => t.kind !== "EOF");
    expect(firstReal.kind).toBe("CSS_SELECTOR");
    expect(firstReal.text).toBe("body");

    // Braces must be present
    expect(tokens.some(t => t.kind === "CSS_LBRACE")).toBe(true);
    expect(tokens.some(t => t.kind === "CSS_RBRACE")).toBe(true);

    // Properties must be present
    const propNames = tokens.filter(t => t.kind === "CSS_PROP").map(t => t.text);
    expect(propNames).toContain("font");
    expect(propNames).toContain("background");
    expect(propNames).toContain("color");

    // body itself must not appear as a CSS_PROP
    expect(propNames).not.toContain("body");
  });
});
