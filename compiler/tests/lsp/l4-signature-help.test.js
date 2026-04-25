// LSP L4.1 — signature help tests.
//
// Covers buildSignatureHelp (lsp/l4.js):
//   - Same-file function call: cursor inside `add(|, b)` returns
//     SignatureHelp with one signature, parameter offsets, and active
//     parameter index 0.
//   - Cursor advanced past first comma → activeParameter increments.
//   - Cursor outside any open `(` returns null.
//   - Cross-file imported function via L2 workspace cache.
//   - Param strings of the form "name: Type" parse the type into the
//     parameter label.
//   - Server function gets the [server] tag in the signature label.
//   - Generator/canFail markers surface in the signature label.

import { describe, it, expect, beforeAll } from "bun:test";
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

import { analyzeText } from "../../../lsp/handlers.js";
import {
  buildSignatureHelp,
  findEnclosingCallParen,
  extractCalleeBefore,
  countActiveParamIndex,
  buildSignatureInformation,
} from "../../../lsp/l4.js";
import {
  createWorkspace,
  bootstrapWorkspace,
} from "../../../lsp/workspace.js";

describe("LSP L4.1 — findEnclosingCallParen", () => {
  it("locates the open paren of an in-progress call", () => {
    const src = "add(1, ";
    const off = src.length; // cursor after the trailing space
    const p = findEnclosingCallParen(src, off);
    expect(p).toBe(3); // index of the `(`
  });

  it("returns null when not inside any open paren", () => {
    const src = "add(1, 2)\n";
    expect(findEnclosingCallParen(src, src.length)).toBe(null);
  });

  it("balances nested parens — closer paren of an inner call doesn't fool us", () => {
    const src = "outer(inner(), ";
    const off = src.length;
    const p = findEnclosingCallParen(src, off);
    expect(p).toBe(5); // outer's `(`
  });

  it("stops on `;` boundary so it doesn't escape to the prior statement", () => {
    const src = "x = 1; y(";
    const p = findEnclosingCallParen(src, src.length);
    expect(p).toBe(8); // y's `(`
  });
});

describe("LSP L4.1 — extractCalleeBefore", () => {
  it("returns the identifier immediately before `(`", () => {
    const src = "compute(";
    expect(extractCalleeBefore(src, 7)).toBe("compute");
  });

  it("returns the trailing identifier of a member-access chain", () => {
    const src = "obj.method(";
    expect(extractCalleeBefore(src, src.indexOf("("))).toBe("method");
  });

  it("returns null when preceded by non-identifier (e.g. `(`)", () => {
    const src = "((";
    expect(extractCalleeBefore(src, 1)).toBe(null);
  });
});

describe("LSP L4.1 — countActiveParamIndex", () => {
  it("returns 0 immediately after the open paren", () => {
    const src = "f(";
    expect(countActiveParamIndex(src, 1, 2)).toBe(0);
  });

  it("returns 1 after one comma", () => {
    const src = "f(a, ";
    expect(countActiveParamIndex(src, 1, src.length)).toBe(1);
  });

  it("returns 2 after two commas", () => {
    const src = "f(a, b, ";
    expect(countActiveParamIndex(src, 1, src.length)).toBe(2);
  });

  it("ignores commas inside nested parens", () => {
    const src = "f(g(1, 2), ";
    expect(countActiveParamIndex(src, 1, src.length)).toBe(1);
  });

  it("ignores commas inside string literals", () => {
    const src = "f(\"a, b\", ";
    expect(countActiveParamIndex(src, 1, src.length)).toBe(1);
  });

  it("ignores commas inside nested arrays", () => {
    const src = "f([1, 2, 3], ";
    expect(countActiveParamIndex(src, 1, src.length)).toBe(1);
  });
});

describe("LSP L4.1 — buildSignatureInformation", () => {
  it("renders a string-param signature with offsets", () => {
    const sig = buildSignatureInformation({
      name: "add",
      params: ["a", "b"],
      isServer: false,
      fnKind: "function",
    });
    expect(sig.label).toBe("add(a, b)");
    expect(sig.parameters.length).toBe(2);
    // `a` occupies positions 4..5
    expect(sig.parameters[0].label).toEqual([4, 5]);
    // `b` occupies positions 7..8
    expect(sig.parameters[1].label).toEqual([7, 8]);
  });

  it("parses `name: Type` param strings", () => {
    const sig = buildSignatureInformation({
      name: "compute",
      params: ["x: number", "y: string"],
      isServer: false,
    });
    expect(sig.label).toContain("x: number");
    expect(sig.label).toContain("y: string");
    // First param starts at offset 8 (after "compute(").
    const [start] = sig.parameters[0].label;
    expect(sig.label.slice(start, start + "x: number".length)).toBe("x: number");
  });

  it("appends `[server]` tag for server functions", () => {
    const sig = buildSignatureInformation({
      name: "fetch_user",
      params: ["id"],
      isServer: true,
    });
    expect(sig.label.endsWith(" [server]")).toBe(true);
  });

  it("appends `!` marker for failable functions", () => {
    const sig = buildSignatureInformation({
      name: "risky",
      params: ["x"],
      isServer: false,
      canFail: true,
    });
    expect(sig.label).toContain(" !");
  });

  it("appends `! -> ErrType` marker for failable functions with declared error type", () => {
    const sig = buildSignatureInformation({
      name: "risky",
      params: ["x"],
      isServer: false,
      canFail: true,
      errorType: "ApiError",
    });
    expect(sig.label).toContain(" ! -> ApiError");
  });

  it("handles object-shape params {name, type}", () => {
    const sig = buildSignatureInformation({
      name: "update",
      params: [{ name: "u", type: "User" }, { name: "p", type: "Patch" }],
      isServer: false,
    });
    expect(sig.label).toContain("u: User");
    expect(sig.label).toContain("p: Patch");
  });
});

describe("LSP L4.1 — buildSignatureHelp same-file", () => {
  it("returns a SignatureHelp for a same-file function call", () => {
    const src = [
      "<program>",
      "${",
      "  function add(a, b) { return a + b }",
      "  add(",
      "}",
      "</program>",
      "",
    ].join("\n");
    const cursor = src.indexOf("add(\n") + "add(".length;
    const { analysis } = analyzeText("/t.scrml", src);
    const sig = buildSignatureHelp(src, cursor, analysis);
    expect(sig).not.toBe(null);
    expect(sig.signatures.length).toBe(1);
    expect(sig.signatures[0].label).toContain("add(");
    expect(sig.signatures[0].parameters.length).toBe(2);
    expect(sig.activeSignature).toBe(0);
    expect(sig.activeParameter).toBe(0);
  });

  it("advances activeParameter as commas accumulate", () => {
    const src = [
      "<program>",
      "${",
      "  function add(a, b) { return a + b }",
      "  add(1, ",
      "}",
      "</program>",
      "",
    ].join("\n");
    const cursor = src.indexOf("add(1, \n") + "add(1, ".length;
    const { analysis } = analyzeText("/t.scrml", src);
    const sig = buildSignatureHelp(src, cursor, analysis);
    expect(sig).not.toBe(null);
    expect(sig.activeParameter).toBe(1);
  });

  it("clamps activeParameter to last param index when overshooting", () => {
    // Cursor placed after a third comma but the function has only 2 params.
    const src = [
      "<program>",
      "${",
      "  function add(a, b) { return a + b }",
      "  add(1, 2, 3, ",
      "}",
      "</program>",
      "",
    ].join("\n");
    const cursor = src.indexOf("add(1, 2, 3, \n") + "add(1, 2, 3, ".length;
    const { analysis } = analyzeText("/t.scrml", src);
    const sig = buildSignatureHelp(src, cursor, analysis);
    expect(sig).not.toBe(null);
    expect(sig.activeParameter).toBe(1); // clamped (last index = 1)
  });

  it("returns null when the cursor is not inside any call", () => {
    const src = [
      "<program>",
      "${",
      "  function add(a, b) { return a + b }",
      "  add(1, 2)",
      "  ", // cursor here — outside all calls
      "}",
      "</program>",
      "",
    ].join("\n");
    const cursor = src.indexOf("add(1, 2)\n  ") + "add(1, 2)\n  ".length;
    const { analysis } = analyzeText("/t.scrml", src);
    const sig = buildSignatureHelp(src, cursor, analysis);
    expect(sig).toBe(null);
  });

  it("returns null when the callee is not a known function", () => {
    const src = [
      "<program>",
      "${",
      "  function add(a, b) { return a + b }",
      "  unknownFn(",
      "}",
      "</program>",
      "",
    ].join("\n");
    const cursor = src.indexOf("unknownFn(\n") + "unknownFn(".length;
    const { analysis } = analyzeText("/t.scrml", src);
    const sig = buildSignatureHelp(src, cursor, analysis);
    expect(sig).toBe(null);
  });

  it("renders a server function call with the [server] tag", () => {
    const src = [
      "<program>",
      "${",
      "  server function load_user(id) { return id }",
      "  load_user(",
      "}",
      "</program>",
      "",
    ].join("\n");
    const cursor = src.indexOf("load_user(\n") + "load_user(".length;
    const { analysis } = analyzeText("/t.scrml", src);
    const sig = buildSignatureHelp(src, cursor, analysis);
    expect(sig).not.toBe(null);
    expect(sig.signatures[0].label).toContain("[server]");
  });
});

describe("LSP L4.1 — buildSignatureHelp cross-file", () => {
  let tmp;
  let importerPath;
  let helperPath;

  beforeAll(() => {
    tmp = mkdtempSync(join(tmpdir(), "lsp-l4-sighelp-"));
    helperPath = join(tmp, "helpers.scrml");
    importerPath = join(tmp, "main.scrml");

    writeFileSync(
      helperPath,
      [
        "<program>",
        "${",
        "  export function multiply(x, y) { return x * y }",
        "}",
        "</program>",
        "",
      ].join("\n"),
    );
    writeFileSync(
      importerPath,
      [
        "<program>",
        "${",
        '  import { multiply } from "./helpers.scrml"',
        "  multiply(",
        "}",
        "</program>",
        "",
      ].join("\n"),
    );
  });

  it("returns a signature for a cross-file imported function", () => {
    const ws = createWorkspace();
    bootstrapWorkspace(ws, tmp);

    const src = [
      "<program>",
      "${",
      '  import { multiply } from "./helpers.scrml"',
      "  multiply(",
      "}",
      "</program>",
      "",
    ].join("\n");
    const cursor = src.indexOf("multiply(\n") + "multiply(".length;
    const { analysis } = analyzeText(importerPath, src, undefined, ws);

    const sig = buildSignatureHelp(src, cursor, analysis, ws, importerPath);
    expect(sig).not.toBe(null);
    expect(sig.signatures[0].label).toContain("multiply(");
    expect(sig.signatures[0].parameters.length).toBe(2);
    // The cross-file annotation lands in the documentation.
    expect(sig.signatures[0].documentation.value).toContain("Imported from");

    rmSync(tmp, { recursive: true, force: true });
  });
});
