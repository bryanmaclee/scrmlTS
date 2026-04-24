/**
 * CSS At-Rule Handling — Unit + Integration Tests (GITI-011)
 *
 * Verifies that CSS at-rules (@import, @media, @keyframes, @font-face,
 * @supports, @page, @layer) in #{} blocks are correctly tokenized, parsed
 * into AST nodes, and emitted as valid CSS.
 *
 * Background (GITI-011, 2026-04-22): The CSS tokenizer did not recognize `@`
 * as a valid character to start a token. `@import` became `import: ;`, `@media`
 * became `media: ;`, etc. — the `@` was skipped as unrecognized and the ident
 * fell through to the property-declaration path.
 *
 * Pipeline path:
 *   - tokenizer.ts: `@` → CSS_AT_RULE token (verbatim text including body)
 *   - ast-builder.js: CSS_AT_RULE → { atRule: text } in rules array
 *   - emit-css.ts: atRule text emitted verbatim in CSS output
 */

import { describe, test, expect } from "bun:test";
import { tokenizeCSS } from "../../src/tokenizer.ts";
import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";
import { runCG } from "../../src/code-generator.js";
import { generateCss, isFlatDeclarationBlock } from "../../src/codegen/emit-css.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function cssTokens(css) {
  return tokenizeCSS(css, 0, 1, 1).filter(t => t.kind !== "EOF");
}

function tokenKinds(css) {
  return cssTokens(css).map(t => t.kind);
}

function span(start = 0, file = "/test/app.scrml") {
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

function compileSource(source, filePath = "/test/app.scrml") {
  const bsOut = splitBlocks(filePath, source);
  const { ast, errors: tabErrors } = buildAST(bsOut);
  const fileAST = makeFileAST(filePath, ast.nodes);
  const result = runCG({
    files: [fileAST],
    routeMap: { functions: new Map() },
    depGraph: { nodes: new Map(), edges: [] },
    protectAnalysis: { views: new Map() },
  });
  const output = result.outputs.get(filePath) ?? {};
  return {
    css: output.css ?? "",
    html: output.html ?? "",
    errors: result.errors ?? [],
    tabErrors,
    bsErrors: bsOut.errors ?? [],
    ast,
  };
}

// ---------------------------------------------------------------------------
// Tokenizer tests
// ---------------------------------------------------------------------------

describe("CSS at-rule tokenization (GITI-011)", () => {
  test("@import produces CSS_AT_RULE token", () => {
    const tokens = cssTokens("@import url('theme.css');");
    expect(tokens).toHaveLength(1);
    expect(tokens[0].kind).toBe("CSS_AT_RULE");
    expect(tokens[0].text).toBe("@import url('theme.css');");
  });

  test("@media block produces CSS_AT_RULE token with body", () => {
    const tokens = cssTokens("@media (max-width: 600px) { .foo { color: red; } }");
    expect(tokens).toHaveLength(1);
    expect(tokens[0].kind).toBe("CSS_AT_RULE");
    expect(tokens[0].text).toContain("@media");
    expect(tokens[0].text).toContain("max-width: 600px");
    expect(tokens[0].text).toContain(".foo { color: red; }");
  });

  test("@keyframes block produces CSS_AT_RULE with nested braces", () => {
    const css = `@keyframes spin {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }`;
    const tokens = cssTokens(css);
    expect(tokens).toHaveLength(1);
    expect(tokens[0].kind).toBe("CSS_AT_RULE");
    expect(tokens[0].text).toContain("@keyframes spin");
    expect(tokens[0].text).toContain("rotate(0deg)");
    expect(tokens[0].text).toContain("rotate(360deg)");
  });

  test("@font-face block produces CSS_AT_RULE token", () => {
    const css = `@font-face { font-family: 'Custom'; src: url('font.woff2'); }`;
    const tokens = cssTokens(css);
    expect(tokens).toHaveLength(1);
    expect(tokens[0].kind).toBe("CSS_AT_RULE");
    expect(tokens[0].text).toContain("@font-face");
    expect(tokens[0].text).toContain("font-family");
  });

  test("@supports block produces CSS_AT_RULE token", () => {
    const css = `@supports (display: grid) { .grid { display: grid; } }`;
    const tokens = cssTokens(css);
    expect(tokens).toHaveLength(1);
    expect(tokens[0].kind).toBe("CSS_AT_RULE");
    expect(tokens[0].text).toContain("@supports");
    expect(tokens[0].text).toContain("display: grid");
  });

  test("@layer statement produces CSS_AT_RULE token", () => {
    const tokens = cssTokens("@layer utilities;");
    expect(tokens).toHaveLength(1);
    expect(tokens[0].kind).toBe("CSS_AT_RULE");
    expect(tokens[0].text).toContain("@layer");
  });

  test("@charset statement at-rule", () => {
    const tokens = cssTokens("@charset 'UTF-8';");
    expect(tokens).toHaveLength(1);
    expect(tokens[0].kind).toBe("CSS_AT_RULE");
    expect(tokens[0].text).toBe("@charset 'UTF-8';");
  });

  test("@namespace statement at-rule", () => {
    const tokens = cssTokens("@namespace svg url(http://www.w3.org/2000/svg);");
    expect(tokens).toHaveLength(1);
    expect(tokens[0].kind).toBe("CSS_AT_RULE");
    expect(tokens[0].text).toContain("@namespace");
  });

  test("mixed at-rules and regular rules tokenize correctly", () => {
    const css = `
      @import url('base.css');
      .foo { color: red; }
      @media (min-width: 768px) { .foo { color: blue; } }
      body { margin: 0; }
    `;
    const kinds = tokenKinds(css);
    expect(kinds[0]).toBe("CSS_AT_RULE");
    expect(kinds).toContain("CSS_SELECTOR");
    expect(kinds.filter(k => k === "CSS_AT_RULE")).toHaveLength(2);
  });

  test("@page block at-rule", () => {
    const tokens = cssTokens("@page { margin: 2cm; }");
    expect(tokens).toHaveLength(1);
    expect(tokens[0].kind).toBe("CSS_AT_RULE");
    expect(tokens[0].text).toContain("@page");
    expect(tokens[0].text).toContain("margin: 2cm;");
  });

  test("bare @ with no ident is skipped gracefully", () => {
    const tokens = cssTokens("@ .foo { color: red; }");
    // The bare @ is skipped; .foo should be tokenized as a selector
    const kinds = tokens.map(t => t.kind);
    expect(kinds).toContain("CSS_SELECTOR");
    expect(kinds).not.toContain("CSS_AT_RULE");
  });
});

// ---------------------------------------------------------------------------
// AST builder tests (via full pipeline)
// ---------------------------------------------------------------------------

describe("CSS at-rule AST building (GITI-011)", () => {
  test("at-rule tokens produce { atRule } nodes in rules array", () => {
    const { ast } = compileSource(
      "<program>#{ @import url('base.css'); }</>"
    );
    // Find the css-inline node
    const program = ast.nodes.find(n => n.kind === "markup" && n.tag === "program");
    const cssNode = program?.children?.find(c => c.kind === "css-inline");
    expect(cssNode).toBeDefined();
    expect(cssNode.rules).toBeDefined();
    const atRuleNode = cssNode.rules.find(r => r.atRule);
    expect(atRuleNode).toBeDefined();
    expect(atRuleNode.atRule).toContain("@import");
  });

  test("mixed at-rules and selectors produce correct rule ordering", () => {
    const { ast } = compileSource(
      `<program>#{ @import url('a.css'); .foo { color: red; } @media (max-width: 600px) { .foo { color: blue; } } }</>`
    );
    const program = ast.nodes.find(n => n.kind === "markup" && n.tag === "program");
    const cssNode = program?.children?.find(c => c.kind === "css-inline");
    expect(cssNode).toBeDefined();
    expect(cssNode.rules.length).toBe(3);
    expect(cssNode.rules[0].atRule).toContain("@import");
    expect(cssNode.rules[1].selector).toBe(".foo");
    expect(cssNode.rules[2].atRule).toContain("@media");
  });
});

// ---------------------------------------------------------------------------
// Emission tests (via full pipeline)
// ---------------------------------------------------------------------------

describe("CSS at-rule emission (GITI-011)", () => {
  test("at-rules pass through verbatim in CSS output", () => {
    const { css } = compileSource(
      "<program>#{ @import url('theme.css'); .base { color: red; } }</>"
    );
    expect(css).toContain("@import url('theme.css');");
    expect(css).toContain(".base { color: red; }");
  });

  test("GITI-011 reproducer compiles with valid at-rules", () => {
    const { css, bsErrors, tabErrors, errors } = compileSource(`<program>

<div>
  <p>at-rule probe</p>
</div>

#{
  @import url('theme.css');

  .base { color: red; }

  @media (max-width: 600px) {
    .base { color: blue; }
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
}

</program>`);
    expect(bsErrors).toHaveLength(0);
    expect(tabErrors).toHaveLength(0);

    // All three at-rules should be present
    expect(css).toContain("@import url('theme.css');");
    expect(css).toContain("@media");
    expect(css).toContain("max-width: 600px");
    expect(css).toContain("@keyframes spin");
    expect(css).toContain("rotate(0deg)");
    expect(css).toContain("rotate(360deg)");

    // Regular rule should still be present
    expect(css).toContain(".base { color: red; }");

    // Should NOT contain the mangled output
    expect(css).not.toContain("import: ;");
    expect(css).not.toContain("media: ;");
  });

  test("@font-face emitted correctly in full pipeline", () => {
    const { css } = compileSource(
      `<program>#{ @font-face { font-family: 'MyFont'; src: url('myfont.woff2'); } .text { font-family: 'MyFont'; } }</>`
    );
    expect(css).toContain("@font-face");
    expect(css).toContain("font-family");
    expect(css).toContain("myfont.woff2");
  });

  test("@supports emitted correctly in full pipeline", () => {
    const { css } = compileSource(
      `<program>#{ @supports (display: grid) { .container { display: grid; } } }</>`
    );
    expect(css).toContain("@supports");
    expect(css).toContain("display: grid");
  });
});

// ---------------------------------------------------------------------------
// Unit: isFlatDeclarationBlock interaction
// ---------------------------------------------------------------------------

describe("isFlatDeclarationBlock with at-rules (GITI-011)", () => {
  test("returns false when at-rules present (at-rule has no .prop)", () => {
    const block = {
      rules: [
        { atRule: "@import url('a.css');", span: {} },
        { prop: "color", value: "red", span: {} },
      ],
    };
    expect(isFlatDeclarationBlock(block)).toBe(false);
  });

  test("returns true for pure prop blocks (unchanged behavior)", () => {
    const block = {
      rules: [
        { prop: "color", value: "red", span: {} },
        { prop: "font-size", value: "14px", span: {} },
      ],
    };
    expect(isFlatDeclarationBlock(block)).toBe(true);
  });
});
