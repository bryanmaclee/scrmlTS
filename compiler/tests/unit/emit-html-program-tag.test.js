/**
 * emit-html.js — Program Tag Regression Tests
 *
 * BUG-R15-004: <program> and </program> tags leaked into generated HTML output.
 * The <program> element is scrml's root container — it must NEVER appear in HTML output.
 * Its children should be emitted directly without any wrapping tag.
 *
 * Coverage:
 *   §1  <program> tag itself does not appear in HTML output
 *   §2  Children of <program> are emitted directly
 *   §3  Nested elements inside <program> are preserved
 *   §4  Text nodes inside <program> are emitted
 *   §5  Empty <program> emits nothing
 *   §6  <program> with attributes does not leak attributes into HTML
 *   §7  Sibling elements at top level without <program> still work (no regression)
 *   §8  Synthetic program node test — direct generateHtml call
 */

import { describe, test, expect } from "bun:test";
import { generateHtml } from "../../src/codegen/emit-html.js";
import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseSource(source, filePath = "/test/app.scrml") {
  const bsResult = splitBlocks(filePath, source);
  const tabResult = buildAST(bsResult);
  return tabResult;
}

function compileHtml(source) {
  const { ast, errors } = parseSource(source);
  const htmlErrors = [];
  const html = generateHtml(ast.nodes, htmlErrors, false, null, ast);
  return { html, errors: htmlErrors, ast };
}

// Build a synthetic <program> markup node for direct testing.
function makeProgramNode(children = []) {
  return {
    kind: "markup",
    tag: "program",
    attrs: [],
    children,
    selfClosing: false,
    span: { file: "/test/app.scrml", start: 0, end: 20, line: 1, col: 1 },
  };
}

function makeMarkupNode(tag, children = [], attrs = []) {
  return {
    kind: "markup",
    tag,
    attrs,
    children,
    selfClosing: false,
    span: { file: "/test/app.scrml", start: 0, end: 10, line: 1, col: 1 },
  };
}

function makeTextNode(text) {
  return {
    kind: "text",
    value: text,
    span: { file: "/test/app.scrml", start: 0, end: text.length, line: 1, col: 1 },
  };
}

// ---------------------------------------------------------------------------
// §1: <program> tag itself does not appear in HTML output
// ---------------------------------------------------------------------------

describe("emit-html program §1: program tag not emitted", () => {
  test("program tag does not appear in HTML output (synthetic node)", () => {
    const nodes = [makeProgramNode([makeMarkupNode("div", [makeTextNode("Hello")])])];
    const html = generateHtml(nodes, [], false, null, null);
    expect(html).not.toContain("<program");
    expect(html).not.toContain("</program>");
  });

  test("program tag does not appear in HTML output (full pipeline)", () => {
    const { html } = compileHtml("<program>\n<div>Hello</>\n</program>");
    expect(html).not.toContain("<program");
    expect(html).not.toContain("</program>");
  });
});

// ---------------------------------------------------------------------------
// §2: Children of <program> are emitted directly
// ---------------------------------------------------------------------------

describe("emit-html program §2: children are emitted", () => {
  test("single child div is emitted (synthetic)", () => {
    const nodes = [makeProgramNode([makeMarkupNode("div", [makeTextNode("Hello")])])];
    const html = generateHtml(nodes, [], false, null, null);
    expect(html).toContain("<div>");
    expect(html).toContain("Hello");
    expect(html).toContain("</div>");
  });

  test("single child div is emitted (full pipeline)", () => {
    const { html } = compileHtml("<program>\n<div>Hello</>\n</program>");
    expect(html).toContain("<div>");
    expect(html).toContain("Hello");
    expect(html).toContain("</div>");
  });
});

// ---------------------------------------------------------------------------
// §3: Nested elements inside <program> are preserved
// ---------------------------------------------------------------------------

describe("emit-html program §3: nested elements preserved", () => {
  test("deeply nested markup inside program is emitted correctly (synthetic)", () => {
    const inner = makeMarkupNode("span", [makeTextNode("inner")]);
    const middle = makeMarkupNode("p", [inner]);
    const outer = makeMarkupNode("div", [middle]);
    const nodes = [makeProgramNode([outer])];
    const html = generateHtml(nodes, [], false, null, null);
    expect(html).toBe("<div><p><span>inner</span></p></div>");
  });

  test("sibling children inside program are all emitted (synthetic)", () => {
    const nodes = [makeProgramNode([
      makeMarkupNode("h1", [makeTextNode("Title")]),
      makeMarkupNode("p", [makeTextNode("Body")]),
    ])];
    const html = generateHtml(nodes, [], false, null, null);
    expect(html).toContain("<h1>");
    expect(html).toContain("Title");
    expect(html).toContain("</h1>");
    expect(html).toContain("<p>");
    expect(html).toContain("Body");
    expect(html).toContain("</p>");
    expect(html).not.toContain("<program");
  });
});

// ---------------------------------------------------------------------------
// §4: Text nodes inside <program> are emitted
// ---------------------------------------------------------------------------

describe("emit-html program §4: text nodes inside program", () => {
  test("text child of program is emitted directly (synthetic)", () => {
    const nodes = [makeProgramNode([makeTextNode("bare text")])];
    const html = generateHtml(nodes, [], false, null, null);
    expect(html).toBe("bare text");
  });
});

// ---------------------------------------------------------------------------
// §5: Empty <program> emits nothing
// ---------------------------------------------------------------------------

describe("emit-html program §5: empty program emits nothing", () => {
  test("program with no children emits empty string (synthetic)", () => {
    const nodes = [makeProgramNode([])];
    const html = generateHtml(nodes, [], false, null, null);
    expect(html).toBe("");
  });
});

// ---------------------------------------------------------------------------
// §6: <program> with attributes does not leak attributes into HTML
// ---------------------------------------------------------------------------

describe("emit-html program §6: program attributes do not leak", () => {
  test("program with auth= attribute produces no HTML attribute output (synthetic)", () => {
    const programNode = {
      kind: "markup",
      tag: "program",
      attrs: [
        { name: "auth", value: { kind: "string-literal", value: "required" } },
        { name: "csrf", value: { kind: "string-literal", value: "auto" } },
      ],
      children: [makeMarkupNode("main", [makeTextNode("content")])],
      selfClosing: false,
      span: { file: "/test/app.scrml", start: 0, end: 40, line: 1, col: 1 },
    };
    const html = generateHtml([programNode], [], false, null, null);
    expect(html).not.toContain("auth");
    expect(html).not.toContain("csrf");
    expect(html).not.toContain("<program");
    expect(html).toContain("<main>");
    expect(html).toContain("content");
  });
});

// ---------------------------------------------------------------------------
// §7: Sibling elements at top level without <program> still work (no regression)
// ---------------------------------------------------------------------------

describe("emit-html program §7: non-program markup unaffected", () => {
  test("regular div at top level still emits correctly (synthetic)", () => {
    const nodes = [makeMarkupNode("div", [makeTextNode("Hello")])];
    const html = generateHtml(nodes, [], false, null, null);
    expect(html).toBe("<div>Hello</div>");
  });

  test("full pipeline without program tag still works", () => {
    const { html } = compileHtml("<div>Hello World</>");
    expect(html).toContain("<div>");
    expect(html).toContain("Hello World");
    expect(html).toContain("</div>");
    expect(html).not.toContain("<program");
  });
});

// ---------------------------------------------------------------------------
// §8: Synthetic program node — generateHtml called directly
// ---------------------------------------------------------------------------

describe("emit-html program §8: direct generateHtml with program node", () => {
  test("program node at top level is transparent — only children rendered", () => {
    const nodes = [
      makeProgramNode([
        makeMarkupNode("nav", [makeTextNode("nav content")]),
        makeMarkupNode("section", [makeTextNode("main content")]),
        makeMarkupNode("footer", [makeTextNode("footer content")]),
      ]),
    ];
    const html = generateHtml(nodes, [], false, null, null);
    expect(html).toBe("<nav>nav content</nav><section>main content</section><footer>footer content</footer>");
    expect(html).not.toContain("program");
  });

  test("program node mixed with sibling top-level nodes (program + regular)", () => {
    // If somehow both a program node and a regular node are at top level,
    // both should render without leaking <program> tags.
    const nodes = [
      makeProgramNode([makeMarkupNode("div", [makeTextNode("from program")])]),
      makeMarkupNode("span", [makeTextNode("sibling")]),
    ];
    const html = generateHtml(nodes, [], false, null, null);
    expect(html).toContain("<div>from program</div>");
    expect(html).toContain("<span>sibling</span>");
    expect(html).not.toContain("<program");
    expect(html).not.toContain("</program>");
  });
});
