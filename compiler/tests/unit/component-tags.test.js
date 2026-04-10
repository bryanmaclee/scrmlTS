/**
 * Component tag isComponent flag — integration tests
 *
 * Tests that uppercase-initial tag names are correctly identified as component
 * references at every pipeline stage: BS and TAB.
 *
 * Coverage:
 *   §A  BS stage — isComponent flag set on markup blocks
 *   §B  TAB stage — isComponent propagated to AST markup nodes
 *   §C  No E-MARKUP errors for component tags
 *   §D  Lift position — uppercase tags in lift produce no E-MARKUP errors
 */

import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function split(source) {
  return splitBlocks("test.scrml", source).blocks;
}

function splitFirst(source) {
  return split(source)[0];
}

function parse(source) {
  const bsOut = splitBlocks("test.scrml", source);
  return buildAST(bsOut);
}

function parseAST(source) {
  return parse(source).ast;
}

function firstNode(source) {
  return parseAST(source).nodes[0];
}

/**
 * Returns errors from a parse result filtered to only E-MARKUP-* codes.
 * W-PROGRAM-001 fires for all snippet tests (missing <program> root) and
 * is unrelated to component tag handling — we exclude it here.
 */
function markupErrors(source) {
  const result = parse(source);
  return result.errors.filter(e => e.code && e.code.startsWith("E-MARKUP-"));
}

// ---------------------------------------------------------------------------
// §A  BS stage — isComponent flag
// ---------------------------------------------------------------------------

describe("§A BS stage — isComponent flag on markup blocks", () => {
  test("self-closing uppercase tag sets isComponent: true", () => {
    const b = splitFirst("<TodoItem/>");
    expect(b.type).toBe("markup");
    expect(b.name).toBe("TodoItem");
    expect(b.isComponent).toBe(true);
    expect(b.closerForm).toBe("self-closing");
  });

  test("self-closing lowercase tag sets isComponent: false", () => {
    const b = splitFirst("<div/>");
    expect(b.type).toBe("markup");
    expect(b.isComponent).toBe(false);
  });

  test("block-form uppercase tag with inferred closer: isComponent true", () => {
    const b = splitFirst("<UserCard>content</>");
    expect(b.name).toBe("UserCard");
    expect(b.isComponent).toBe(true);
    expect(b.closerForm).toBe("inferred");
  });

  test("block-form uppercase tag with explicit closer: isComponent true", () => {
    const b = splitFirst("<ContactCard>content</ContactCard>");
    expect(b.name).toBe("ContactCard");
    expect(b.isComponent).toBe(true);
    expect(b.closerForm).toBe("explicit");
  });

  test("component nested inside HTML element — child has isComponent: true", () => {
    const div = splitFirst("<div><TodoItem/></div>");
    expect(div.name).toBe("div");
    expect(div.isComponent).toBe(false);
    const child = div.children.find(c => c.type === "markup");
    expect(child).toBeDefined();
    expect(child.name).toBe("TodoItem");
    expect(child.isComponent).toBe(true);
  });

  test("HTML element nested inside component — child has isComponent: false", () => {
    const modal = splitFirst("<Modal><span>inner</span></Modal>");
    expect(modal.isComponent).toBe(true);
    const child = modal.children.find(c => c.type === "markup");
    expect(child).toBeDefined();
    expect(child.name).toBe("span");
    expect(child.isComponent).toBe(false);
  });

  test("component with attributes does not throw", () => {
    expect(() => split('<UserCard id="123" name="Alice"/>')).not.toThrow();
    const b = split('<UserCard id="123" name="Alice"/>')[0];
    expect(b.isComponent).toBe(true);
  });

  test("single uppercase letter is a component", () => {
    expect(splitFirst("<A/>").isComponent).toBe(true);
  });

  test("single lowercase letter is not a component", () => {
    expect(splitFirst("<a/>").isComponent).toBe(false);
  });

  test("underscore-initial tag is not a component (starts with _)", () => {
    // _ is not uppercase — isComponentName uses charCode 65-90 (A-Z)
    const b = splitFirst("<_private/>");
    expect(b.isComponent).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// §B  TAB stage — isComponent propagated to AST markup nodes
// ---------------------------------------------------------------------------

describe("§B TAB stage — isComponent propagated to AST markup nodes", () => {
  test("self-closing uppercase tag produces markup node with isComponent: true", () => {
    const node = firstNode("<TodoItem/>");
    expect(node.kind).toBe("markup");
    expect(node.tag).toBe("TodoItem");
    expect(node.isComponent).toBe(true);
  });

  test("self-closing lowercase tag produces markup node with isComponent falsy", () => {
    const node = firstNode("<div/>");
    expect(node.kind).toBe("markup");
    expect(node.isComponent).toBeFalsy();
  });

  test("block-form uppercase tag has isComponent: true in AST", () => {
    const node = firstNode("<UserCard>content</>");
    expect(node.kind).toBe("markup");
    expect(node.tag).toBe("UserCard");
    expect(node.isComponent).toBe(true);
  });

  test("explicit-close uppercase tag has isComponent: true in AST", () => {
    const node = firstNode("<ContactCard>content</ContactCard>");
    expect(node.kind).toBe("markup");
    expect(node.isComponent).toBe(true);
  });

  test("component nested in HTML element — child AST node has isComponent: true", () => {
    const ast = parseAST("<div><TodoItem/></div>");
    const div = ast.nodes[0];
    expect(div.tag).toBe("div");
    expect(div.isComponent).toBeFalsy();
    const child = div.children.find(c => c.kind === "markup");
    expect(child).toBeDefined();
    expect(child.tag).toBe("TodoItem");
    expect(child.isComponent).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// §C  No E-MARKUP errors for component tags
//
// Note: parse() of small snippets produces W-PROGRAM-001 (missing <program>
// root), which is expected and unrelated to component handling. We filter
// to E-MARKUP-* codes only.
// ---------------------------------------------------------------------------

describe("§C No E-MARKUP errors for component tags", () => {
  test("uppercase tag with standard HTML attributes produces no E-MARKUP errors", () => {
    // class and id are HTML attributes — they should not trigger E-MARKUP-003
    // on a component node (attribute shape validation is skipped for isComponent=true)
    expect(markupErrors('<TodoItem class="foo" id="bar"/>')).toHaveLength(0);
  });

  test("uppercase tag with custom props produces no E-MARKUP errors", () => {
    // Custom prop names would fail E-MARKUP-003 on HTML elements — not on components
    expect(markupErrors('<UserCard name="Alice" avatar="img.jpg"/>')).toHaveLength(0);
  });

  test("component not in state type registry produces no E-MARKUP errors", () => {
    // TodoItem is not a pre-defined HTML element or user state type
    expect(markupErrors("<TodoItem/>")).toHaveLength(0);
  });

  test("lowercase HTML div with class produces no E-MARKUP errors either", () => {
    // Baseline: HTML elements with valid attrs are also fine
    expect(markupErrors('<div class="foo"/>')).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// §D  Lift position — uppercase tags in lift produce no E-MARKUP errors
// ---------------------------------------------------------------------------

describe("§D Lift position — component tags in lift produce no E-MARKUP errors", () => {
  test("lift of self-closing component produces no E-MARKUP errors", () => {
    expect(markupErrors("${ lift <TodoItem/> }")).toHaveLength(0);
  });

  test("lift of component with attributes produces no E-MARKUP errors", () => {
    expect(markupErrors('${ lift <TodoItem id="1" title="Buy milk"/> }')).toHaveLength(0);
  });

  test("component in for-lift body produces no E-MARKUP errors", () => {
    const source = `\${
      for item in @items {
        lift <TodoItem id=item.id/>
      }
    }`;
    expect(markupErrors(source)).toHaveLength(0);
  });
});
