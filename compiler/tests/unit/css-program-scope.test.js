/**
 * CSS #{} at Program Scope — Unit + Integration Tests
 *
 * Verifies that inline CSS contexts `#{}` placed directly inside `<program>...</program>`
 * (top-level, not nested inside any element) compile correctly and produce CSS output.
 *
 * Background (R13 issue #13): Developers expected to write global styles at the program
 * level using `#{}`. §9.1 of the spec says `#{}` is "valid inside markup and state
 * contexts" — this was ambiguous about whether program scope (a special markup context)
 * is included. Investigation confirmed the code paths exist and the feature works;
 * these tests provide explicit coverage and serve as regression guards.
 *
 * Pipeline path verified:
 *   - block-splitter.js lines 620-625: `#{}` at markup/top-level → "css" block
 *   - ast-builder.js lines 3106-3122: "css" block → css-inline AST node (child of program node)
 *   - collect.ts lines 128-136: collectCssBlocks finds css-inline nodes via children recursion
 *   - emit-css.ts lines 99-111: programInlineBlocks (_componentScope==null) emitted without @scope
 *
 * Note on scrml closer syntax:
 *   - `</tag>` — explicit closer (always valid)
 *   - `/` alone on same line — shorthand closer for innermost open tag
 *   - `//` is a comment token, not two closers
 *   - Correct pattern inside program: `<div>#{ }...</div>/` or `<div>#{ }.../\n/`
 *
 * Coverage:
 *   T1  Full pipeline: #{} at program scope → css output contains the rule
 *   T2  Full pipeline: #{} inside an element (regression guard — still works)
 *   T3  Full pipeline: multiple #{} blocks at program scope → all rules emitted
 *   T4  Full pipeline: #{} at program scope produces no compilation errors
 *   T5  Unit: css-inline node at top-level of nodes[] is collected by collectCssBlocks
 *   T6  Unit: css-inline as child of program markup node is collected with _componentScope null
 *   T7  Unit: generateCss emits program-level #{} without @scope wrapping
 *   T8  Full pipeline: #{} at program scope + #{} inside element → both emitted
 */

import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";
import { runCG } from "../../src/code-generator.js";
import { generateCss } from "../../src/codegen/emit-css.ts";
import { collectCssBlocks } from "../../src/codegen/collect.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

function makeRouteMap() {
  return { functions: new Map() };
}

function makeDepGraph() {
  return { nodes: new Map(), edges: [] };
}

/**
 * Compile a scrml source string through the full pipeline and return
 * { css, html, clientJs, serverJs, errors, tabErrors, bsErrors }.
 */
function compileSource(source, filePath = "/test/app.scrml") {
  const bsOut = splitBlocks(filePath, source);
  const { ast, errors: tabErrors } = buildAST(bsOut);
  const fileAST = makeFileAST(filePath, ast.nodes);
  const result = runCG({
    files: [fileAST],
    routeMap: makeRouteMap(),
    depGraph: makeDepGraph(),
    protectAnalysis: { views: new Map() },
  });
  const output = result.outputs.get(filePath) ?? {};
  return {
    css: output.css ?? "",
    html: output.html ?? "",
    clientJs: output.clientJs ?? "",
    serverJs: output.serverJs ?? "",
    errors: result.errors ?? [],
    tabErrors,
    bsErrors: bsOut.errors ?? [],
  };
}

function makeCssInlineBlock(body, s = span(0)) {
  return { kind: "css-inline", body, span: s };
}

function makeCssInlineWithRules(rules, s = span(0)) {
  return { kind: "css-inline", rules, span: s };
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

// ---------------------------------------------------------------------------
// T1–T4: Full pipeline tests (source text → compiled output)
// ---------------------------------------------------------------------------

describe("CSS #{} at program scope — full pipeline", () => {

  test("T1: #{} at program scope → css output contains the rule", () => {
    // #{} placed directly in <program> body, before the / closer
    const { css, tabErrors, bsErrors } = compileSource(
      "<program>#{ .foo { color: red; } }</>"
    );
    expect(bsErrors).toHaveLength(0);
    expect(tabErrors).toHaveLength(0);
    expect(css).toContain(".foo");
    expect(css).toContain("color");
    expect(css).toContain("red");
  });

  test("T2: #{} inside a child element → css output contains the rule (regression guard)", () => {
    // #{} nested inside <div> inside <program>. Closer: </div> (explicit) then / for program.
    const { css, tabErrors, bsErrors } = compileSource(
      '<program><div class="wrap">#{ .bar { margin: 0; } }</div></>'
    );
    expect(bsErrors).toHaveLength(0);
    expect(tabErrors).toHaveLength(0);
    expect(css).toContain(".bar");
    expect(css).toContain("margin");
  });

  test("T3: multiple #{} blocks at program scope → all rules emitted", () => {
    // Two #{} blocks at program scope, back-to-back
    const { css, bsErrors, tabErrors } = compileSource(
      "<program>#{ .alpha { color: blue; } }#{ .beta { font-size: 14px; } }</>"
    );
    expect(bsErrors).toHaveLength(0);
    expect(tabErrors).toHaveLength(0);
    expect(css).toContain(".alpha");
    expect(css).toContain("color");
    expect(css).toContain("blue");
    expect(css).toContain(".beta");
    expect(css).toContain("font-size");
    expect(css).toContain("14px");
  });

  test("T4: #{} at program scope produces no compilation errors", () => {
    // Verify there are no BS, TAB, or CG errors
    const { errors, tabErrors, bsErrors } = compileSource(
      "<program>#{ body { margin: 0; padding: 0; } }</>"
    );
    expect(bsErrors).toHaveLength(0);
    expect(tabErrors).toHaveLength(0);
    expect(errors).toHaveLength(0);
  });

});

// ---------------------------------------------------------------------------
// T5–T7: Unit tests (manual AST construction)
// ---------------------------------------------------------------------------

describe("CSS #{} at program scope — unit (collectCssBlocks + generateCss)", () => {

  test("T5: css-inline node at top-level of nodes[] is collected by collectCssBlocks", () => {
    // Direct top-level css-inline node (no parent markup node)
    const cssNode = makeCssInlineBlock("body { margin: 0; }");
    const { inlineBlocks, styleBlocks } = collectCssBlocks([cssNode]);

    expect(inlineBlocks).toHaveLength(1);
    expect(styleBlocks).toHaveLength(0);
    // Program-level: no component scope
    expect(inlineBlocks[0]._componentScope).toBeNull();
  });

  test("T6: css-inline as child of program markup node is collected with _componentScope null", () => {
    // This mirrors the real AST shape: program node owns #{} as a child
    const cssNode = makeCssInlineBlock(".global { color: green; }");
    const programNode = makeMarkupNode("program", [], [cssNode]);
    const { inlineBlocks } = collectCssBlocks([programNode]);

    expect(inlineBlocks).toHaveLength(1);
    // Must have null componentScope (program-level, not component-scoped)
    expect(inlineBlocks[0]._componentScope).toBeNull();
  });

  test("T7: generateCss emits program-level #{} without @scope wrapping", () => {
    // A css-inline with rules structure (as produced by the tokenizer/parser)
    const cssNode = makeCssInlineWithRules([
      {
        selector: ".global",
        declarations: [{ prop: "color", value: "green" }],
      },
    ]);
    const css = generateCss([cssNode]);

    expect(css).toContain(".global");
    expect(css).toContain("color");
    expect(css).toContain("green");
    // Program-level CSS must NOT be wrapped in a @scope block
    expect(css).not.toContain("@scope");
  });

});

// ---------------------------------------------------------------------------
// T8: Combined program-scope + element-scope #{} — both emitted
// ---------------------------------------------------------------------------

describe("CSS #{} program scope + element scope — combined", () => {

  test("T8: program-scope #{} and element-scope #{} both emit CSS", () => {
    // #{} at program scope AND #{} nested inside <section>.
    // Uses explicit </section> closer (not / shorthand) to avoid BS ambiguity.
    const source = [
      "<program>",
      "#{ .global-rule { background: white; } }",
      "<section>",
      "#{ .section-rule { padding: 16px; } }",
      "</section>",
      "</>",
    ].join("");

    const { css, bsErrors, tabErrors } = compileSource(source);

    expect(bsErrors).toHaveLength(0);
    expect(tabErrors).toHaveLength(0);
    expect(css).toContain(".global-rule");
    expect(css).toContain("background");
    expect(css).toContain("white");
    expect(css).toContain(".section-rule");
    expect(css).toContain("padding");
    expect(css).toContain("16px");
  });

});

// ---------------------------------------------------------------------------
// GITI-007: bare-tag descendant combinator
// ---------------------------------------------------------------------------

describe("GITI-007: bare-tag descendant combinator", () => {
  test("`nav a { ... }` after a prior rule emits as a compound selector", () => {
    const source = [
      "<program>",
      "#{",
      "  nav { display: flex; }",
      "  nav a { color: red; }",
      "}",
      "</>",
    ].join("\n");
    const { css, bsErrors, tabErrors } = compileSource(source);
    expect(bsErrors).toHaveLength(0);
    expect(tabErrors).toHaveLength(0);
    expect(css).toContain("nav a { color: red; }");
    expect(css).not.toMatch(/nav:\s*;/);
  });

  test("bare-tag descendant works alone in a block", () => {
    const source = [
      "<program>",
      "#{ main article { color: blue; } }",
      "</>",
    ].join("\n");
    const { css, bsErrors, tabErrors } = compileSource(source);
    expect(bsErrors).toHaveLength(0);
    expect(tabErrors).toHaveLength(0);
    expect(css).toContain("main article { color: blue; }");
  });

  test("plain property `color: red` still classifies as declaration (not selector)", () => {
    const source = [
      "<program>",
      "#{ .x { color: red; padding: 10px; } }",
      "</>",
    ].join("\n");
    const { css, bsErrors, tabErrors } = compileSource(source);
    expect(bsErrors).toHaveLength(0);
    expect(tabErrors).toHaveLength(0);
    expect(css).toContain("color: red");
    expect(css).toContain("padding: 10px");
  });
});
