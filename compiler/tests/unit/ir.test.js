/**
 * ir.js — Unit Tests
 *
 * Tests for the CG Intermediate Representation factory functions.
 *
 * Coverage:
 *   §1  createHtmlIR — returns { parts: [] }
 *   §2  createCssIR — returns { userCss: "", tailwindCss: "" }
 *   §3  createServerIR — returns { lines: [] }
 *   §4  createClientIR — returns { lines: [] }
 *   §5  createFileIR — top-level container with all sub-IRs
 *   §6  IR mutability — containers are mutable (push, assign)
 *   §7  IR independence — each call returns a fresh object
 */

import { describe, test, expect } from "bun:test";
import {
  createHtmlIR,
  createCssIR,
  createServerIR,
  createClientIR,
  createFileIR,
} from "../../src/codegen/ir.js";

// ---------------------------------------------------------------------------
// §1  createHtmlIR
// ---------------------------------------------------------------------------

describe("createHtmlIR", () => {
  test("returns object with empty parts array", () => {
    const ir = createHtmlIR();
    expect(ir).toEqual({ parts: [] });
  });

  test("parts is an array", () => {
    expect(Array.isArray(createHtmlIR().parts)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// §2  createCssIR
// ---------------------------------------------------------------------------

describe("createCssIR", () => {
  test("returns object with empty userCss and tailwindCss", () => {
    const ir = createCssIR();
    expect(ir).toEqual({ userCss: "", tailwindCss: "" });
  });

  test("userCss is empty string", () => {
    expect(createCssIR().userCss).toBe("");
  });

  test("tailwindCss is empty string", () => {
    expect(createCssIR().tailwindCss).toBe("");
  });
});

// ---------------------------------------------------------------------------
// §3  createServerIR
// ---------------------------------------------------------------------------

describe("createServerIR", () => {
  test("returns object with empty lines array", () => {
    const ir = createServerIR();
    expect(ir).toEqual({ lines: [] });
  });
});

// ---------------------------------------------------------------------------
// §4  createClientIR
// ---------------------------------------------------------------------------

describe("createClientIR", () => {
  test("returns object with empty lines array", () => {
    const ir = createClientIR();
    expect(ir).toEqual({ lines: [] });
  });
});

// ---------------------------------------------------------------------------
// §5  createFileIR
// ---------------------------------------------------------------------------

describe("createFileIR", () => {
  test("stores filePath", () => {
    const ir = createFileIR("test.scrml");
    expect(ir.filePath).toBe("test.scrml");
  });

  test("contains html sub-IR", () => {
    const ir = createFileIR("test.scrml");
    expect(ir.html).toEqual({ parts: [] });
  });

  test("contains css sub-IR", () => {
    const ir = createFileIR("test.scrml");
    expect(ir.css).toEqual({ userCss: "", tailwindCss: "" });
  });

  test("contains server sub-IR", () => {
    const ir = createFileIR("test.scrml");
    expect(ir.server).toEqual({ lines: [] });
  });

  test("contains client sub-IR", () => {
    const ir = createFileIR("test.scrml");
    expect(ir.client).toEqual({ lines: [] });
  });

  test("has correct shape with all five fields", () => {
    const ir = createFileIR("app.scrml");
    expect(Object.keys(ir).sort()).toEqual(["client", "css", "filePath", "html", "server"]);
  });
});

// ---------------------------------------------------------------------------
// §6  IR mutability
// ---------------------------------------------------------------------------

describe("IR mutability", () => {
  test("HtmlIR parts array is mutable", () => {
    const ir = createHtmlIR();
    ir.parts.push("<div>hello</div>");
    expect(ir.parts).toHaveLength(1);
    expect(ir.parts[0]).toBe("<div>hello</div>");
  });

  test("CssIR fields are assignable", () => {
    const ir = createCssIR();
    ir.userCss = ".card { color: red; }";
    ir.tailwindCss = ".flex { display: flex; }";
    expect(ir.userCss).toBe(".card { color: red; }");
    expect(ir.tailwindCss).toBe(".flex { display: flex; }");
  });

  test("ServerIR lines array is mutable", () => {
    const ir = createServerIR();
    ir.lines.push("export default handler;");
    expect(ir.lines).toHaveLength(1);
  });

  test("ClientIR lines array is mutable", () => {
    const ir = createClientIR();
    ir.lines.push("document.addEventListener('click', fn);");
    expect(ir.lines).toHaveLength(1);
  });

  test("FileIR sub-IRs are mutable through the parent", () => {
    const ir = createFileIR("test.scrml");
    ir.html.parts.push("<p>test</p>");
    ir.server.lines.push("// server");
    ir.client.lines.push("// client");
    expect(ir.html.parts).toHaveLength(1);
    expect(ir.server.lines).toHaveLength(1);
    expect(ir.client.lines).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// §7  IR independence
// ---------------------------------------------------------------------------

describe("IR independence", () => {
  test("each createHtmlIR call returns a fresh object", () => {
    const a = createHtmlIR();
    const b = createHtmlIR();
    a.parts.push("mutated");
    expect(b.parts).toHaveLength(0);
  });

  test("each createFileIR call returns independent sub-IRs", () => {
    const a = createFileIR("a.scrml");
    const b = createFileIR("b.scrml");
    a.html.parts.push("a-html");
    a.server.lines.push("a-server");
    expect(b.html.parts).toHaveLength(0);
    expect(b.server.lines).toHaveLength(0);
  });
});
