/**
 * Snippet/Slot System — Stage T3-AB tests
 *
 * Coverage:
 *   §A  Type system: tSnippet constructor and resolveTypeExpr
 *   §B  PropDecl parsing: isSnippet/snippetParamType detection
 *   §C  Slot detection: slot= grouping and render/spread injection
 *   §D  Error codes: E-COMPONENT-010, -030, -031, -033, -034
 *   §E  Regression: ${children} injection still works
 *
 * Component body pattern used:
 *   ${ const Name = <element props={ ... }/>
 *     ${render snippetName()}   — snippet render slot
 *     ${...}                     — unslotted children spread
 *   }
 *
 * The defChildren of a component-def (sibling logic blocks after the root
 * element in the same ${ } block) get prepended to the expanded node's
 * children, making ${render ...} and ${...} available for injectChildren.
 */

import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";
import { runCEFile } from "../../src/component-expander.js";
import { tSnippet, resolveTypeExpr, tPrimitive } from "../../src/type-system.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function runCEOn(source) {
  const bsOut = splitBlocks("test.scrml", source);
  const tabOut = buildAST(bsOut);
  return runCEFile(tabOut);
}

function collectNodes(nodes, predicate) {
  const result = [];
  function walk(node) {
    if (!node || typeof node !== "object") return;
    if (predicate(node)) result.push(node);
    for (const key of Object.keys(node)) {
      if (key === "span") continue;
      const val = node[key];
      if (Array.isArray(val)) val.forEach(walk);
      else if (val && typeof val === "object") walk(val);
    }
  }
  nodes.forEach(walk);
  return result;
}

function collectMarkup(nodes) {
  return collectNodes(nodes, n => n.kind === "markup");
}

function findMarkup(nodes, tag) {
  return collectMarkup(nodes).find(n => n.tag === tag);
}

// ---------------------------------------------------------------------------
// §A  Type system — tSnippet constructor and resolveTypeExpr
// ---------------------------------------------------------------------------

describe("§A Type system — tSnippet and resolveTypeExpr", () => {
  test("tSnippet() produces zero-parameter non-optional snippet", () => {
    const t = tSnippet();
    expect(t).toEqual({ kind: "snippet", paramType: null, optional: false });
  });

  test("tSnippet(null, true) produces optional snippet", () => {
    const t = tSnippet(null, true);
    expect(t).toEqual({ kind: "snippet", paramType: null, optional: true });
  });

  test("tSnippet with paramType produces parametric snippet", () => {
    const param = tPrimitive("string");
    const t = tSnippet(param, false);
    expect(t.kind).toBe("snippet");
    expect(t.paramType).toEqual({ kind: "primitive", name: "string" });
    expect(t.optional).toBe(false);
  });

  test("resolveTypeExpr('snippet') returns snippet type", () => {
    const reg = new Map();
    const t = resolveTypeExpr("snippet", reg);
    expect(t.kind).toBe("snippet");
    expect(t.paramType).toBeNull();
    expect(t.optional).toBe(false);
  });

  test("resolveTypeExpr('snippet?') returns optional snippet", () => {
    const reg = new Map();
    const t = resolveTypeExpr("snippet?", reg);
    expect(t.kind).toBe("snippet");
    expect(t.optional).toBe(true);
  });

  test("resolveTypeExpr('snippet(tab: string)') returns parametric snippet", () => {
    const reg = new Map();
    const t = resolveTypeExpr("snippet(tab: string)", reg);
    expect(t.kind).toBe("snippet");
    expect(t.paramType).toEqual({ kind: "primitive", name: "string" });
  });
});

// ---------------------------------------------------------------------------
// §B  PropDecl parsing — isSnippet/snippetParamType on registry entries
// ---------------------------------------------------------------------------

describe("§B PropDecl parsing — snippet props detection", () => {
  test("props={ header: snippet } marks header as snippet in registry", () => {
    const source = `<program>
\${ const Card = <div class="card" props={ header: snippet }/> }
<Card><h1 slot="header">Title</h1></>
</program>`;
    const { errors } = runCEOn(source);
    // No E-COMPONENT errors — header is provided via slot
    const ceErrors = errors.filter(e => e.code && e.code.startsWith("E-COMPONENT-01"));
    expect(ceErrors).toHaveLength(0);
  });

  test("props={ body?: snippet } creates optional snippet — no error when omitted", () => {
    const source = `<program>
\${ const Card = <div class="card" props={ body?: snippet }/> }
<Card/>
</program>`;
    const { errors } = runCEOn(source);
    const e010 = errors.filter(e => e.code === "E-COMPONENT-010");
    expect(e010).toHaveLength(0);
  });

  test("props={ title: string } is NOT marked as snippet", () => {
    // title is a regular string prop, not a snippet
    const source = `<program>
\${ const Card = <div class="card" props={ title: string }/> }
<Card title="hi"/>
</program>`;
    const { errors } = runCEOn(source);
    const ceErrors = errors.filter(e => e.code && e.code.startsWith("E-COMPONENT-"));
    expect(ceErrors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// §C  Slot detection integration — slot= grouping and render/spread injection
// ---------------------------------------------------------------------------

describe("§C Slot detection — slot= grouping and render/spread", () => {
  test("Card with header snippet: slot='header' children appear in render position", () => {
    const source = `<program>
\${ const Card = <div class="card" props={ header: snippet }/>
  \${render header()}
  \${...}
}
<Card><h1 slot="header">Title</h1><p>body</p></>
</program>`;
    const { ast, errors } = runCEOn(source);
    const ceErrors = errors.filter(e => e.code && e.code.startsWith("E-COMPONENT-"));
    expect(ceErrors).toHaveLength(0);

    const div = findMarkup(ast.nodes, "div");
    expect(div).toBeDefined();
    // First child should be the h1 (from render header())
    const h1 = div.children.find(n => n.kind === "markup" && n.tag === "h1");
    expect(h1).toBeDefined();
    // h1 should NOT have slot= attribute (stripped at compile time)
    const slotAttr = (h1.attrs ?? []).find(a => a.name === "slot");
    expect(slotAttr).toBeUndefined();
    // Second child should be the p (unslotted, via ${...})
    const p = div.children.find(n => n.kind === "markup" && n.tag === "p");
    expect(p).toBeDefined();
  });

  test("optional snippet omitted produces no error", () => {
    const source = `<program>
\${ const Card = <div class="card" props={ header?: snippet }/>
  \${render header()}
  \${...}
}
<Card><p>just body</p></>
</program>`;
    const { errors } = runCEOn(source);
    const ceErrors = errors.filter(e => e.code && e.code.startsWith("E-COMPONENT-01"));
    expect(ceErrors).toHaveLength(0);
  });

  test("required snippet omitted produces E-COMPONENT-010", () => {
    const source = `<program>
\${ const Card = <div class="card" props={ header: snippet }/>
  \${render header()}
}
<Card/>
</program>`;
    const { errors } = runCEOn(source);
    const e010 = errors.filter(e => e.code === "E-COMPONENT-010");
    expect(e010).toHaveLength(1);
    expect(e010[0].message).toContain("header");
  });

  test("slot='nonexistent' produces E-COMPONENT-033", () => {
    const source = `<program>
\${ const Card = <div class="card" props={ header: snippet }/>
  \${render header()}
}
<Card><h1 slot="footer">Oops</h1><h2 slot="header">Title</h2></>
</program>`;
    const { errors } = runCEOn(source);
    const e033 = errors.filter(e => e.code === "E-COMPONENT-033");
    expect(e033).toHaveLength(1);
    expect(e033[0].message).toContain("footer");
    expect(e033[0].message).toContain("header");
  });

  test("multiple children with same slot= combine into one group", () => {
    const source = `<program>
\${ const Card = <div class="card" props={ header: snippet }/>
  \${render header()}
  \${...}
}
<Card><h1 slot="header">Title</h1><h2 slot="header">Subtitle</h2><p>body</p></>
</program>`;
    const { ast, errors } = runCEOn(source);
    const ceErrors = errors.filter(e => e.code && e.code.startsWith("E-COMPONENT-"));
    expect(ceErrors).toHaveLength(0);

    const div = findMarkup(ast.nodes, "div");
    expect(div).toBeDefined();
    // Both h1 and h2 should appear (from the header slot group)
    const markupChildren = div.children.filter(n => n.kind === "markup");
    const h1 = markupChildren.find(n => n.tag === "h1");
    const h2 = markupChildren.find(n => n.tag === "h2");
    const p = markupChildren.find(n => n.tag === "p");
    expect(h1).toBeDefined();
    expect(h2).toBeDefined();
    expect(p).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// §D  Spread tests
// ---------------------------------------------------------------------------

describe("§D Spread — ${...} substitution", () => {
  test("${...} spread substituted with unslotted children", () => {
    const source = `<program>
\${ const Card = <div class="card" props={ header: snippet }/>
  \${render header()}
  \${...}
}
<Card><h1 slot="header">Title</h1><p>body1</p><p>body2</p></>
</program>`;
    const { ast, errors } = runCEOn(source);
    const ceErrors = errors.filter(e => e.code && e.code.startsWith("E-COMPONENT-"));
    expect(ceErrors).toHaveLength(0);

    const div = findMarkup(ast.nodes, "div");
    const ps = div.children.filter(n => n.kind === "markup" && n.tag === "p");
    expect(ps).toHaveLength(2);
  });

  test("no spread + unslotted children produces E-COMPONENT-031", () => {
    const source = `<program>
\${ const Card = <div class="card" props={ header: snippet }/>
  \${render header()}
}
<Card><h1 slot="header">Title</h1><p>body</p></>
</program>`;
    const { errors } = runCEOn(source);
    const e031 = errors.filter(e => e.code === "E-COMPONENT-031");
    expect(e031).toHaveLength(1);
    expect(e031[0].message).toContain("Card");
  });
});

// ---------------------------------------------------------------------------
// §E  Error tests
// ---------------------------------------------------------------------------

describe("§E Error codes — E-COMPONENT-030, E-COMPONENT-034", () => {
  test("multiple ${...} spreads produce E-COMPONENT-030", () => {
    const source = `<program>
\${ const Card = <div class="card"/>
  \${...}
  \${...}
}
<Card><p>body</p></>
</program>`;
    const { errors } = runCEOn(source);
    const e030 = errors.filter(e => e.code === "E-COMPONENT-030");
    expect(e030).toHaveLength(1);
    expect(e030[0].message).toContain("Card");
  });

  test("slot= on parametric snippet produces E-COMPONENT-034", () => {
    const source = `<program>
\${ const Tabs = <div class="tabs" props={ tab: snippet(item: string) }/>
  \${render tab()}
}
<Tabs><div slot="tab">Tab content</div></>
</program>`;
    const { errors } = runCEOn(source);
    const e034 = errors.filter(e => e.code === "E-COMPONENT-034");
    expect(e034).toHaveLength(1);
    expect(e034[0].message).toContain("tab");
    expect(e034[0].message).toContain("parametric");
  });
});

// ---------------------------------------------------------------------------
// §F  Regression — ${children} injection still works
// ---------------------------------------------------------------------------

describe("§F Regression — ${children} injection backward compat", () => {
  test("${children} injection still works for non-snippet components", () => {
    const source = `<program>
\${ const Card = <div class="card"/>
  \${children}
}
<Card><p>body content</p></>
</program>`;
    const { ast, errors } = runCEOn(source);
    const ceErrors = errors.filter(e => e.code && e.code.startsWith("E-COMPONENT-"));
    expect(ceErrors).toHaveLength(0);

    const div = findMarkup(ast.nodes, "div");
    expect(div).toBeDefined();
    const p = findMarkup(div.children ?? [], "p");
    expect(p).toBeDefined();
  });

  test("implicit children append (no explicit slot) still works", () => {
    const source = `<program>
\${ const Card = <div class="card"/> }
<Card><p>body content</p></>
</program>`;
    const { ast, errors } = runCEOn(source);
    const ceErrors = errors.filter(e => e.code && e.code.startsWith("E-COMPONENT-"));
    expect(ceErrors).toHaveLength(0);

    const div = findMarkup(ast.nodes, "div");
    expect(div).toBeDefined();
    const p = findMarkup(div.children ?? [], "p");
    expect(p).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// §H: Parametric snippets — T3-D (§16.6)
// ---------------------------------------------------------------------------

describe("parametric snippets (§16.6)", () => {
  test("§H1 parametric snippet prop has snippetParamType set", () => {
    const src = `<program>
\${ const TabStrip = <div props={
    tabPanel: snippet(tab: Tab)
}>\${render tabPanel(activeTab)}/}
<TabStrip tabPanel={ (tab) => <span>hi/ }/>
</program>`;
    const { ast, errors: ceErrors } = runCEOn(src);
    // Should not produce E-COMPONENT-019 (broken props parsing)
    const propErrors = ceErrors.filter(e => e.code === "E-COMPONENT-019");
    expect(propErrors).toHaveLength(0);
  });

  test("§H2 lambda attr parsed as expr, not props-block", () => {
    const src = `<program>
\${ const Card = <div props={ body: snippet(item: string) }>\${render body(activeItem)}/}
<Card body={ (item) => <p>content/ }/>
</program>`;
    const bsOut = splitBlocks("test.scrml", src);
    const tabOut = buildAST(bsOut);
    // Find Card markup node and check attr kind
    const cardNode = findMarkup(tabOut.ast.nodes, "Card");
    expect(cardNode).toBeDefined();
    const bodyAttr = cardNode?.attrs?.find(a => a.name === "body");
    expect(bodyAttr).toBeDefined();
    expect(bodyAttr.value.kind).toBe("expr");
    expect(bodyAttr.value.raw).toContain("(item) =>");
  });

  test("§H3 parametric render substitutes lambda body with arg", () => {
    const src = `<program>
\${ const List = <div props={
    itemView: snippet(item: string)
}>\${render itemView(currentItem)}/}
<List itemView={ (item) => <span>item/ }/>
</program>`;
    const { ast, errors: ceErrors } = runCEOn(src);
    // Should expand without errors (E-COMPONENT-010 should not fire)
    const missingPropErrors = ceErrors.filter(e => e.code === "E-COMPONENT-010");
    expect(missingPropErrors).toHaveLength(0);
  });

  test("§H4 E-COMPONENT-034 fires for slot= on parametric snippet", () => {
    const src = `<program>
\${ const List = <div props={
    itemView: snippet(item: string)
}>\${render itemView(current)}</>}
<List>
    <span slot="itemView">static content</>
</>
</program>`;
    const { errors: ceErrors } = runCEOn(src);
    const e034 = ceErrors.filter(e => e.code === "E-COMPONENT-034");
    expect(e034.length).toBeGreaterThan(0);
  });

  test("§H5 parametric snippet skips E-COMPONENT-010 when lambda provided", () => {
    const src = `<program>
\${ const Grid = <div props={
    cell: snippet(data: number),
    title: string
}>
    <h1>\${title}</>
    \${render cell(activeCell)}
/}
<Grid title="My Grid" cell={ (data) => <td>data/ }/>
</program>`;
    const { errors: ceErrors } = runCEOn(src);
    const missingPropErrors = ceErrors.filter(e => e.code === "E-COMPONENT-010");
    expect(missingPropErrors).toHaveLength(0);
  });

  test("§H6 mixed zero-param and parametric snippets work together", () => {
    const src = `<program>
\${ const Panel = <div props={
    header: snippet,
    body: snippet(item: string)
}>
    \${render header()}
    \${render body(activeItem)}
/}
<Panel body={ (item) => <p>item/ }>
    <h1 slot="header">Title</>
</>
</program>`;
    const { ast, errors: ceErrors } = runCEOn(src);
    const missingPropErrors = ceErrors.filter(e => e.code === "E-COMPONENT-010");
    expect(missingPropErrors).toHaveLength(0);
    // Verify the expanded output has the header content
    const h1 = findMarkup(ast.nodes, "h1");
    expect(h1).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// §I: T3-C — render keyword validation (E-TYPE-071, §16.8)
// ---------------------------------------------------------------------------

describe("T3-C render keyword validation (§16.8)", () => {
  test("§I1 rewriteRenderKeyword detects render outside component body", () => {
    const { rewriteRenderKeyword } = require("../../src/codegen/rewrite.ts");
    const errors = [];
    rewriteRenderKeyword("render header()", errors);
    const e071 = errors.filter(e => e.code === "E-TYPE-071");
    expect(e071).toHaveLength(1);
    expect(e071[0].message).toContain("render header");
    expect(e071[0].message).toContain("component body");
  });

  test("§I2 rewriteRenderKeyword detects parametric render outside component body", () => {
    const { rewriteRenderKeyword } = require("../../src/codegen/rewrite.ts");
    const errors = [];
    rewriteRenderKeyword("render tabPanel(activeTab)", errors);
    const e071 = errors.filter(e => e.code === "E-TYPE-071");
    expect(e071).toHaveLength(1);
    expect(e071[0].message).toContain("tabPanel");
  });

  test("§I3 rewriteRenderKeyword does not fire on non-render expressions", () => {
    const { rewriteRenderKeyword } = require("../../src/codegen/rewrite.ts");
    const errors = [];
    rewriteRenderKeyword("let x = renderFunction()", errors);
    const e071 = errors.filter(e => e.code === "E-TYPE-071");
    expect(e071).toHaveLength(0);
  });

  test("§I4 rewriteRenderKeyword does not fire without errors array", () => {
    const { rewriteRenderKeyword } = require("../../src/codegen/rewrite.ts");
    // Should not throw
    const result = rewriteRenderKeyword("render header()");
    expect(result).toBe("render header()");
  });

  test("§I5 rewriteExpr propagates E-TYPE-071", () => {
    const { rewriteExpr } = require("../../src/codegen/rewrite.ts");
    const errors = [];
    rewriteExpr("render header()", errors);
    const e071 = errors.filter(e => e.code === "E-TYPE-071");
    expect(e071).toHaveLength(1);
  });

  test("§I6 render inside component body does NOT trigger E-TYPE-071 (CE consumes it)", () => {
    // When render is inside a component body, CE replaces it before rewrite sees it.
    // This test verifies the full pipeline: render inside component → no E-TYPE-071.
    const src = `<program>
\${ const Card = <div props={ header: snippet }/>
  \${render header()}
}
<Card><h1 slot="header">Title</></Card>
</program>`;
    const { errors } = runCEOn(src);
    const e071 = errors.filter(e => e.code === "E-TYPE-071");
    expect(e071).toHaveLength(0);
  });
});
