// Conformance test for: SPEC §5.2 (Attribute Quoting Semantics — absent form)
// Pipeline contract: AttrValue | { kind: 'absent' }   // boolean attribute
//
// A boolean attribute written without a value (e.g., `<button required>`)
// SHALL be represented as AttrValue { kind: 'absent' } in the AST.
// Pipeline contract: "Attribute values are fully classified into their quoting
// form. No unclassified raw attribute strings remain in the AST."

import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../../src/block-splitter.js";
import { buildAST } from "../../../src/ast-builder.js";

function run(src) {
  const bsOut = splitBlocks("test.scrml", src);
  return buildAST(bsOut);
}

describe("CONF-TAB-010: boolean (no-value) attribute produces kind=absent", () => {
  test("standalone `required` attribute on button produces kind=absent", () => {
    const { ast } = run("<button required>Submit</>");
    const btn = ast.nodes[0];
    const attr = btn.attrs.find((a) => a.name === "required");
    expect(attr).toBeDefined();
    expect(attr.value.kind).toBe("absent");
  });

  test("standalone `disabled` attribute (no value) produces kind=absent", () => {
    const { ast } = run("<button disabled>Submit</>");
    const btn = ast.nodes[0];
    const attr = btn.attrs.find((a) => a.name === "disabled");
    expect(attr).toBeDefined();
    expect(attr.value.kind).toBe("absent");
  });

  test("multiple boolean attributes on a div each produce kind=absent", () => {
    const { ast } = run("<div required readonly multiple>content</>");
    const el = ast.nodes[0];
    for (const name of ["required", "readonly", "multiple"]) {
      const attr = el.attrs.find((a) => a.name === name);
      expect(attr).toBeDefined();
      expect(attr.value.kind).toBe("absent");
    }
  });

  test("boolean attribute mixed with quoted attribute parses correctly", () => {
    const { ast } = run('<button required class="btn">Submit</>');
    const btn = ast.nodes[0];
    const req = btn.attrs.find((a) => a.name === "required");
    const cls = btn.attrs.find((a) => a.name === "class");
    expect(req.value.kind).toBe("absent");
    expect(cls.value.kind).toBe("string-literal");
  });

  test("absent kind is NOT confused with variable-ref or string-literal", () => {
    const { ast } = run("<button checked>Go</>");
    const btn = ast.nodes[0];
    const attr = btn.attrs.find((a) => a.name === "checked");
    expect(attr.value.kind).not.toBe("variable-ref");
    expect(attr.value.kind).not.toBe("string-literal");
    expect(attr.value.kind).not.toBe("call-ref");
  });
});
