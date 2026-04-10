// Conformance test for: SPEC §5.3 (Boolean HTML Attributes)
// "For a known boolean attribute with an unquoted variable reference (e.g.,
//  `disabled=submitting`), the compiler SHALL emit a property assignment
//  (`element.disabled = submitting`) rather than a `setAttribute` call."
// "Emitting `setAttribute(\"disabled\", submitting)` for a boolean attribute
//  SHALL be a compiler defect."
// "`disabled=\"true\"` (quoted string) on a boolean attribute SHALL be a
//  compile error (E-ATTR-002). The correct form is `disabled=expr` with an
//  unquoted boolean expression."
//
// At the TAB stage: the distinction between quoted and unquoted forms on a
// known boolean attribute must be faithfully represented in the AST so that
// downstream stages can enforce E-ATTR-002. The TAB stage records the form;
// E-ATTR-002 is a TAB-level error (per PIPELINE Stage 3 error contract).

import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../../src/block-splitter.js";
import { buildAST } from "../../../src/ast-builder.js";

function run(src) {
  const bsOut = splitBlocks("test.scrml", src);
  return buildAST(bsOut);
}

describe("CONF-TAB-009: boolean attribute quoting is faithfully represented in AST", () => {
  test("disabled=submitting (unquoted) is classified as variable-ref", () => {
    const { ast } = run("<button disabled=submitting>Submit</>");
    const btn = ast.nodes[0];
    const attr = btn.attrs.find((a) => a.name === "disabled");
    expect(attr).toBeDefined();
    expect(attr.value.kind).toBe("variable-ref");
  });

  test("checked=isChecked (unquoted) on a div is classified as variable-ref", () => {
    // Use div to avoid void-element closer issues
    const { ast } = run("<div checked=isChecked>content</>");
    const el = ast.nodes[0];
    const attr = el.attrs.find((a) => a.name === "checked");
    expect(attr).toBeDefined();
    expect(attr.value.kind).toBe("variable-ref");
  });

  test("disabled=\"true\" (quoted string) is classified as string-literal in the AST", () => {
    // E-ATTR-002 fires at TAB or downstream; at minimum the form must be
    // distinguishable in the AST as string-literal (not variable-ref).
    const { ast } = run('<button disabled="true">Submit</>');
    const btn = ast.nodes[0];
    const attr = btn.attrs.find((a) => a.name === "disabled");
    expect(attr).toBeDefined();
    expect(attr.value.kind).toBe("string-literal");
  });

  test("readonly=flag (unquoted) is classified as variable-ref, not string-literal", () => {
    const { ast } = run("<div readonly=flag>content</>");
    const el = ast.nodes[0];
    const attr = el.attrs.find((a) => a.name === "readonly");
    expect(attr.value.kind).toBe("variable-ref");
    expect(attr.value.kind).not.toBe("string-literal");
  });

  test("required (boolean presence — no value) on a button is classified as absent", () => {
    const { ast } = run("<button required>Submit</>");
    const btn = ast.nodes[0];
    const attr = btn.attrs.find((a) => a.name === "required");
    expect(attr).toBeDefined();
    expect(attr.value.kind).toBe("absent");
  });
});
