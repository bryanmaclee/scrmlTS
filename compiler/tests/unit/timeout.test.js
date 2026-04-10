/**
 * §6.7.8 <timeout> — Single-Shot Timer State Type
 *
 * Tests for timeout validation (emit-html) and codegen (emit-reactive-wiring).
 */

import { describe, test, expect } from "bun:test";
import { generateHtml } from "../../src/codegen/emit-html.ts";
import { emitReactiveWiring } from "../../src/codegen/emit-reactive-wiring.ts";
import { makeCompileContext } from "../../src/codegen/context.ts";

function span(start = 0) {
  return { file: "test.scrml", start, end: start + 10, line: 1, col: 1 };
}

function makeTimeoutNode(attrs = {}, children = []) {
  const attrList = Object.entries(attrs).map(([name, value]) => ({
    name,
    value: typeof value === "string"
      ? { kind: "string-literal", value }
      : { kind: "variable-ref", name: String(value) },
  }));
  return {
    kind: "markup",
    tag: "timeout",
    attrs: attrList,
    attributes: attrList,
    children,
    selfClosing: children.length === 0,
    span: span(),
  };
}

function makeLogicChild(bodyNodes) {
  return {
    kind: "logic",
    body: bodyNodes,
    span: span(),
  };
}

// ---------------------------------------------------------------------------
// §1: HTML validation — silent tag (no HTML output)
// ---------------------------------------------------------------------------

describe("§1: <timeout> is a silent tag", () => {
  test("timeout does not appear in HTML output", () => {
    const errors = [];
    const node = makeTimeoutNode({ delay: "5000" });
    const html = generateHtml([node], errors);
    expect(html).not.toContain("<timeout");
    expect(html).not.toContain("timeout");
  });
});

// ---------------------------------------------------------------------------
// §2: Error E-TIMEOUT-001 — missing delay
// ---------------------------------------------------------------------------

describe("§2: E-TIMEOUT-001 — missing delay attribute", () => {
  test("timeout without delay emits E-TIMEOUT-001", () => {
    const errors = [];
    const node = makeTimeoutNode({ id: "guard" });
    generateHtml([node], errors);
    const err = errors.find(e => e.code === "E-TIMEOUT-001");
    expect(err).toBeDefined();
    expect(err.message).toContain("delay");
  });
});

// ---------------------------------------------------------------------------
// §3: Error E-TIMEOUT-002 — delay <= 0
// ---------------------------------------------------------------------------

describe("§3: E-TIMEOUT-002 — delay zero or negative", () => {
  test("timeout with delay=0 emits E-TIMEOUT-002", () => {
    const errors = [];
    const node = makeTimeoutNode({ delay: "0" });
    generateHtml([node], errors);
    const err = errors.find(e => e.code === "E-TIMEOUT-002");
    expect(err).toBeDefined();
    expect(err.message).toContain("zero or negative");
  });

  test("timeout with negative delay emits E-TIMEOUT-002", () => {
    const errors = [];
    const node = makeTimeoutNode({ delay: "-100" });
    generateHtml([node], errors);
    const err = errors.find(e => e.code === "E-TIMEOUT-002");
    expect(err).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// §4: Codegen — generates setTimeout
// ---------------------------------------------------------------------------

describe("§4: <timeout> codegen generates setTimeout", () => {
  test("timeout generates setTimeout in reactive wiring output", () => {
    const errors = [];
    const body = [{ kind: "bare-expr", expr: "@done = true", span: span() }];
    const node = makeTimeoutNode({ delay: "3000" }, [makeLogicChild(body)]);
    const fileAST = { filePath: "test.scrml", nodes: [node], ast: { nodes: [node] } };
    const ctx = makeCompileContext("test.scrml");
    const output = emitReactiveWiring({ fileAST, errors, ctx });
    const js = output.join("\n");
    expect(js).toContain("setTimeout");
    expect(js).toContain("3000");
  });

  test("timeout generates scope cleanup with clearTimeout", () => {
    const errors = [];
    const body = [{ kind: "bare-expr", expr: "@x = 1", span: span() }];
    const node = makeTimeoutNode({ delay: "5000" }, [makeLogicChild(body)]);
    const fileAST = { filePath: "test.scrml", nodes: [node], ast: { nodes: [node] } };
    const ctx = makeCompileContext("test.scrml");
    const output = emitReactiveWiring({ fileAST, errors, ctx });
    const js = output.join("\n");
    expect(js).toContain("clearTimeout");
    expect(js).toContain("_scrml_register_cleanup");
  });
});

// ---------------------------------------------------------------------------
// §5: Codegen — timeout with id
// ---------------------------------------------------------------------------

describe("§5: <timeout> with id generates cancel and fired state", () => {
  test("timeout with id emits fired reactive state", () => {
    const errors = [];
    const body = [{ kind: "bare-expr", expr: "@expired = true", span: span() }];
    const node = makeTimeoutNode({ id: "guard", delay: "5000" }, [makeLogicChild(body)]);
    const fileAST = { filePath: "test.scrml", nodes: [node], ast: { nodes: [node] } };
    const ctx = makeCompileContext("test.scrml");
    const output = emitReactiveWiring({ fileAST, errors, ctx });
    const js = output.join("\n");
    expect(js).toContain("guard_fired");
  });

  test("timeout with id emits cancel function", () => {
    const errors = [];
    const body = [{ kind: "bare-expr", expr: "@expired = true", span: span() }];
    const node = makeTimeoutNode({ id: "guard", delay: "5000" }, [makeLogicChild(body)]);
    const fileAST = { filePath: "test.scrml", nodes: [node], ast: { nodes: [node] } };
    const ctx = makeCompileContext("test.scrml");
    const output = emitReactiveWiring({ fileAST, errors, ctx });
    const js = output.join("\n");
    expect(js).toContain("guard_cancel");
  });
});

// ---------------------------------------------------------------------------
// §6: Valid timeout has no timeout errors
// ---------------------------------------------------------------------------

describe("§6: valid timeout compiles cleanly", () => {
  test("timeout with delay and body has no E-TIMEOUT errors", () => {
    const errors = [];
    const node = makeTimeoutNode({ delay: "5000" });
    generateHtml([node], errors);
    const timeoutErrors = errors.filter(e => e.code && e.code.startsWith("E-TIMEOUT"));
    expect(timeoutErrors).toHaveLength(0);
  });
});
