// Conformance test for: SPEC §4.10.1 (Newline Before Tag Identifier —
// TAB receives the correctly-classified block from BS)
// "A newline (U+000A or U+000D) between `<` and an identifier SHALL be
//  treated identically to a space (U+0020) or tab (U+0009) between `<` and
//  an identifier. The block SHALL be classified as a state object opener."
// "The scrml language defines NO multiline HTML element opening syntax."
//
// The block splitter enforces this classification. The TAB stage must
// correctly consume the block type it receives.  When the BS classifies
// `<\ndiv>` as a state block (not markup), TAB must produce kind='state'
// with stateType='div', not kind='markup' with tag='div'.
//
// The TAB stage is NOT allowed to re-classify block types; it must trust
// the BS classification.

import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../../src/block-splitter.js";
import { buildAST } from "../../../src/ast-builder.js";

function run(src) {
  const bsOut = splitBlocks("test.scrml", src);
  return buildAST(bsOut);
}

describe("CONF-TAB-030: TAB preserves BS block classification — newline-before-ident is state", () => {
  test("<div ...> (no whitespace) is classified as markup by BS, TAB produces markup node", () => {
    const { ast } = run("<div>hello</>");
    expect(ast.nodes[0].kind).toBe("markup");
    expect(ast.nodes[0].tag).toBe("div");
  });

  test("< div> (space) is classified as state by BS, TAB produces state node", () => {
    const { ast } = run("< div></>");
    expect(ast.nodes[0].kind).toBe("state");
    expect(ast.nodes[0].stateType).toBe("div");
  });

  test("<\\ndiv> (newline) is classified as state by BS, TAB produces state node", () => {
    const { ast } = run("<\ndiv></>");
    expect(ast.nodes[0].kind).toBe("state");
    expect(ast.nodes[0].stateType).toBe("div");
  });

  test("<\\tdiv> (tab) is classified as state by BS, TAB produces state node", () => {
    const { ast } = run("<\tdiv></>");
    expect(ast.nodes[0].kind).toBe("state");
    expect(ast.nodes[0].stateType).toBe("div");
  });

  test("TAB does NOT convert a state-classified block into a markup node", () => {
    // Even if the identifier 'div' is a known HTML element name, the BS
    // classified it as state (because of the whitespace). TAB must not
    // re-classify it as markup.
    const { ast } = run("< div></>");
    expect(ast.nodes[0].kind).not.toBe("markup");
  });

  test("<div\\n  class=\"c\"\\n> (newline in attribute area) is still markup — BS classified it so", () => {
    // The newline here is AFTER the identifier (in the attribute span), not
    // between < and the identifier. BS classifies this as markup.
    const { ast } = run('<div\n  class="c"\n>hello</>');
    expect(ast.nodes[0].kind).toBe("markup");
    expect(ast.nodes[0].tag).toBe("div");
  });
});
