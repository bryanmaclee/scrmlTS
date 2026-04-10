/**
 * Block Splitter: </ > inferred closer — migration tests
 *
 * Tests that </> works as an inferred closer alongside existing / closers.
 */

import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../src/block-splitter.js";

function blocks(src) {
  const { blocks, errors } = splitBlocks("test.scrml", src);
  return { blocks, errors };
}

function firstChild(src) {
  const { blocks: b } = blocks(src);
  return b[0]?.children?.[0] ?? b[0];
}

describe("§4.4.2 </> inferred closer", () => {
  test("<div>hello</> produces block with closerForm inferred", () => {
    const { blocks: b, errors } = blocks("<div>hello</>");
    expect(errors.filter(e => e.severity !== "warning")).toHaveLength(0);
    expect(b[0].type).toBe("markup");
    expect(b[0].name).toBe("div");
    expect(b[0].closerForm).toBe("inferred");
  });

  test("</> on own line closes innermost element", () => {
    const { blocks: b, errors } = blocks("<div>\n  <span>text</>\n</>");
    expect(errors.filter(e => e.severity !== "warning")).toHaveLength(0);
    expect(b[0].name).toBe("div");
    expect(b[0].closerForm).toBe("inferred");
    const span = b[0].children.find(c => c.type === "markup");
    expect(span.name).toBe("span");
    expect(span.closerForm).toBe("inferred");
  });

  test("nested elements with </> both close correctly", () => {
    const { blocks: b, errors } = blocks("<ul><li>item</></>");
    expect(errors.filter(e => e.severity !== "warning")).toHaveLength(0);
    expect(b[0].name).toBe("ul");
    expect(b[0].closerForm).toBe("inferred");
    const li = b[0].children.find(c => c.type === "markup");
    expect(li.name).toBe("li");
    expect(li.closerForm).toBe("inferred");
  });

  test("</> inside <program> works", () => {
    const { blocks: b, errors } = blocks("<program><div>hi</></program>");
    expect(errors.filter(e => e.severity !== "warning")).toHaveLength(0);
    expect(b[0].name).toBe("program");
    const div = b[0].children.find(c => c.type === "markup");
    expect(div.name).toBe("div");
    expect(div.closerForm).toBe("inferred");
  });

  test("</> and / both work (Phase 1 additive)", () => {
    const { blocks: b, errors } = blocks("<div><span>a</><em>b</></>");
    expect(errors.filter(e => e.severity !== "warning")).toHaveLength(0);
    expect(b[0].name).toBe("div");
    const span = b[0].children.find(c => c.name === "span");
    const em = b[0].children.find(c => c.name === "em");
    expect(span.closerForm).toBe("inferred");
    expect(em.closerForm).toBe("inferred");
  });

  test("division operator in pressOp('/') is not confused with closer", () => {
    const src = '<button onclick=pressOp("/")></></>';
    const { blocks: b, errors } = blocks(src);
    expect(errors.filter(e => e.severity !== "warning")).toHaveLength(0);
    expect(b[0].name).toBe("button");
    expect(b[0].closerForm).toBe("inferred");
  });

  test("</> inside ${} decrements tagNesting", () => {
    const src = '<div>${ let x = "<span>hi</>"; }</div>';
    const { blocks: b, errors } = blocks(src);
    // Should not produce unclosed context errors from tagNesting mismatch
    const ctx = errors.filter(e => e.code === "E-CTX-003");
    expect(ctx).toHaveLength(0);
  });
});
