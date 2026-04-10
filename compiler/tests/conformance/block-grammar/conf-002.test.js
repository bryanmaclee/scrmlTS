// CONF-002 | §4.1
// The element name SHALL be the maximal sequence of alphanumeric characters,
// hyphens, and underscores following `<`.
import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../../src/block-splitter.js";

function split(src) {
  return splitBlocks("test.scrml", src).blocks;
}

describe("CONF-002: element name is maximal alphanumeric/hyphen/underscore sequence", () => {
  test("simple single-word element name", () => {
    const blocks = split("<button>click</>");
    expect(blocks[0].name).toBe("button");
  });

  test("hyphenated custom element name", () => {
    const blocks = split("<my-component>hello</>");
    expect(blocks[0].name).toBe("my-component");
  });

  test("element name with underscores", () => {
    const blocks = split("<my_widget>hello</>");
    expect(blocks[0].name).toBe("my_widget");
  });

  test("element name stops at first space (attribute boundary)", () => {
    const blocks = split('<input type="text">hello</>');
    expect(blocks[0].name).toBe("input");
  });

  test("element name stops at > (self-closing form)", () => {
    // <br> alone has no closer; use self-closing form to avoid E-CTX-003
    const blocks = split("<br/>");
    expect(blocks[0].name).toBe("br");
  });
});
