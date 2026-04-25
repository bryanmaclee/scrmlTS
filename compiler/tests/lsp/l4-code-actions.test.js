// LSP L4.2 — code actions (quickfix) tests.
//
// Covers buildCodeActions (lsp/l4.js) for the 5 supported error codes:
//   - E-IMPORT-004 — import name not exported (Levenshtein-rank closest export)
//   - E-IMPORT-005 — bare npm-style specifier (prefix with "./")
//   - E-LIN-001    — linear var not consumed (prefix with "_")
//   - E-PA-007     — protect= field not in schema (Levenshtein-rank closest column)
//   - E-SQL-006    — `.prepare()` removed (drop the call)
//
// The tests build the LSP CodeActionContext directly (skipping the compiler
// pipeline for codes the LSP can't natively reach today, e.g. E-SQL-006 only
// fires from CG which the LSP doesn't run). For codes the LSP DOES surface
// natively (E-IMPORT-004, E-IMPORT-005), we drive the diagnostic through the
// real workspace cache to make sure the round-trip works end-to-end.

import { describe, it, expect } from "bun:test";
import { mkdtempSync, writeFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

import {
  CodeActionKind,
  DiagnosticSeverity,
} from "vscode-languageserver/node";

import { analyzeText } from "../../../lsp/handlers.js";
import {
  buildCodeActions,
  closestMatch,
  levenshtein,
  supportedQuickFixCodes,
  positionToOffset,
} from "../../../lsp/l4.js";
import {
  createWorkspace,
  bootstrapWorkspace,
} from "../../../lsp/workspace.js";

// ---------------------------------------------------------------------------
// Levenshtein helpers
// ---------------------------------------------------------------------------

describe("LSP L4.2 — levenshtein", () => {
  it("returns 0 for identical strings", () => {
    expect(levenshtein("abc", "abc")).toBe(0);
  });
  it("returns the length of the other when one is empty", () => {
    expect(levenshtein("", "abc")).toBe(3);
    expect(levenshtein("abc", "")).toBe(3);
  });
  it("counts a single substitution", () => {
    expect(levenshtein("abc", "abd")).toBe(1);
  });
  it("counts a single insertion", () => {
    expect(levenshtein("abc", "abdc")).toBe(1);
  });
  it("counts a single deletion", () => {
    expect(levenshtein("abcd", "abc")).toBe(1);
  });
  it("handles longer divergent strings", () => {
    expect(levenshtein("kitten", "sitting")).toBe(3);
  });
});

describe("LSP L4.2 — closestMatch", () => {
  it("returns the closest candidate within maxDistance", () => {
    const c = closestMatch("ema", ["email", "phone", "name"]);
    expect(c).toBe("email");
  });
  it("returns null when nothing is within maxDistance", () => {
    const c = closestMatch("xyz", ["alpha", "beta"], 1);
    expect(c).toBe(null);
  });
  it("is case-insensitive", () => {
    const c = closestMatch("USR", ["usr_id", "user_id"]);
    // "usr" → "usr_id" distance=3, "USR" lowercase = "usr"
    expect(c).toBe("usr_id");
  });
});

// ---------------------------------------------------------------------------
// Capability surface
// ---------------------------------------------------------------------------

describe("LSP L4.2 — supportedQuickFixCodes", () => {
  it("lists the 5 promised quick-fix error codes", () => {
    const codes = supportedQuickFixCodes();
    expect(codes).toContain("E-IMPORT-004");
    expect(codes).toContain("E-IMPORT-005");
    expect(codes).toContain("E-LIN-001");
    expect(codes).toContain("E-PA-007");
    expect(codes).toContain("E-SQL-006");
    expect(codes.length).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// buildCodeActions general behavior
// ---------------------------------------------------------------------------

describe("LSP L4.2 — buildCodeActions general", () => {
  it("returns [] when context is missing", () => {
    expect(buildCodeActions("text", "file:///a.scrml", null)).toEqual([]);
  });

  it("returns [] when no diagnostics in context", () => {
    expect(buildCodeActions("text", "file:///a.scrml", { diagnostics: [] })).toEqual([]);
  });

  it("returns [] when client filters to non-quickfix kinds", () => {
    const text = "lin x = 5";
    const ctx = {
      diagnostics: [{
        code: "E-LIN-001",
        severity: DiagnosticSeverity.Error,
        range: {
          start: { line: 0, character: 0 },
          end: { line: 0, character: 9 },
        },
        message: "...",
      }],
      only: ["refactor"],
    };
    expect(buildCodeActions(text, "file:///a.scrml", ctx, { linVars: [{ name: "x" }] })).toEqual([]);
  });

  it("ignores diagnostics with codes that have no quick-fix builder", () => {
    const ctx = {
      diagnostics: [{
        code: "E-NEVER-EXISTS",
        range: { start: { line: 0, character: 0 }, end: { line: 0, character: 1 } },
        message: "synthetic",
      }],
    };
    expect(buildCodeActions("text", "file:///a.scrml", ctx)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// E-LIN-001 — prefix with "_"
// ---------------------------------------------------------------------------

describe("LSP L4.2 — E-LIN-001 quickfix (prefix with _)", () => {
  it("emits a quickfix that prefixes the var name with '_'", () => {
    // Build a buffer where `lin myvar = 5` lives on line 1.
    const text = "<program>\n${\n  lin myvar = 5\n}\n</program>\n";
    const linDeclStart = text.indexOf("lin myvar = 5");
    const linDeclEnd = linDeclStart + "lin myvar = 5".length;
    const ctx = {
      diagnostics: [{
        code: "E-LIN-001",
        severity: DiagnosticSeverity.Error,
        range: {
          start: { line: 2, character: text.slice(0, linDeclStart).split("\n").pop().length },
          end: { line: 2, character: text.slice(0, linDeclEnd).split("\n").pop().length },
        },
        message: "E-LIN-001: Linear variable `myvar` declared but never consumed",
      }],
    };
    const { analysis } = analyzeText("/t.scrml", text);
    const actions = buildCodeActions(text, "file:///t.scrml", ctx, analysis);
    expect(actions.length).toBe(1);
    const a = actions[0];
    expect(a.kind).toBe(CodeActionKind.QuickFix);
    expect(a.title).toContain("myvar");
    expect(a.title).toContain('"_"');
    const edits = a.edit.changes["file:///t.scrml"];
    expect(edits.length).toBe(1);
    expect(edits[0].newText).toBe("_myvar");
  });

  it("does not emit a quickfix when var is already _-prefixed", () => {
    const text = "<program>\n${\n  lin _myvar = 5\n}\n</program>\n";
    const declStart = text.indexOf("lin _myvar = 5");
    const declEnd = declStart + "lin _myvar = 5".length;
    const ctx = {
      diagnostics: [{
        code: "E-LIN-001",
        severity: DiagnosticSeverity.Error,
        range: {
          start: { line: 2, character: text.slice(0, declStart).split("\n").pop().length },
          end: { line: 2, character: text.slice(0, declEnd).split("\n").pop().length },
        },
        message: "...",
      }],
    };
    const { analysis } = analyzeText("/t.scrml", text);
    const actions = buildCodeActions(text, "file:///t.scrml", ctx, analysis);
    expect(actions).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// E-IMPORT-005 — prefix with "./"
// ---------------------------------------------------------------------------

describe("LSP L4.2 — E-IMPORT-005 quickfix (prefix with ./)", () => {
  it("emits a quickfix that wraps the bare specifier with ./", () => {
    // Drive E-IMPORT-005 through the real workspace pipeline so the
    // diagnostic span is the actual one.
    const tmp = mkdtempSync(join(tmpdir(), "lsp-l4-import005-"));
    const fp = join(tmp, "main.scrml");
    const src = '<program>\n${\n  import { foo } from "react"\n}\n</program>\n';
    writeFileSync(fp, src);

    const ws = createWorkspace();
    bootstrapWorkspace(ws, tmp);

    const { diagnostics } = analyzeText(fp, src, undefined, ws);
    const importDiag = diagnostics.find(d => d.code === "E-IMPORT-005");
    expect(importDiag).toBeTruthy();

    const ctx = { diagnostics: [importDiag] };
    const actions = buildCodeActions(src, "file://" + fp, ctx, null, ws, fp);
    expect(actions.length).toBe(1);
    const a = actions[0];
    expect(a.kind).toBe(CodeActionKind.QuickFix);
    expect(a.title).toContain("./");
    const edits = a.edit.changes["file://" + fp];
    expect(edits.length).toBe(1);
    // The replacement should still contain quotes and prefix "react" with "./".
    expect(edits[0].newText).toContain("./react");

    rmSync(tmp, { recursive: true, force: true });
  });

  it("does not fire when the specifier is already relative", () => {
    const text = 'import { foo } from "./bar.scrml"';
    const ctx = {
      diagnostics: [{
        code: "E-IMPORT-005",
        range: {
          start: { line: 0, character: 19 },
          end: { line: 0, character: 33 },
        },
        message: "synthetic",
      }],
    };
    const actions = buildCodeActions(text, "file:///t.scrml", ctx);
    expect(actions).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// E-IMPORT-004 — Levenshtein-rank closest exported name
// ---------------------------------------------------------------------------

describe("LSP L4.2 — E-IMPORT-004 quickfix (closest export)", () => {
  it("emits a rename quickfix to the nearest exported name", () => {
    const tmp = mkdtempSync(join(tmpdir(), "lsp-l4-import004-"));
    const helperPath = join(tmp, "helpers.scrml");
    const importerPath = join(tmp, "main.scrml");
    writeFileSync(
      helperPath,
      '<program>\n${\n  export function multiply(x, y) { return x * y }\n}\n</program>\n',
    );
    // Importer typoed the name as "multipy".
    const importerSrc = '<program>\n${\n  import { multipy } from "./helpers.scrml"\n}\n</program>\n';
    writeFileSync(importerPath, importerSrc);

    const ws = createWorkspace();
    bootstrapWorkspace(ws, tmp);

    const { diagnostics } = analyzeText(importerPath, importerSrc, undefined, ws);
    const diag = diagnostics.find(d => d.code === "E-IMPORT-004");
    expect(diag).toBeTruthy();

    const ctx = { diagnostics: [diag] };
    const actions = buildCodeActions(importerSrc, "file://" + importerPath, ctx, null, ws, importerPath);
    // We allow 0 or 1 — the underlying span coverage may include other
    // tokens. When >0, the first action should rename to "multiply".
    expect(actions.length).toBeGreaterThanOrEqual(1);
    const renameToMultiply = actions.find(a => (a.title || "").includes("multiply"));
    expect(renameToMultiply).toBeTruthy();
    expect(renameToMultiply.kind).toBe(CodeActionKind.QuickFix);

    rmSync(tmp, { recursive: true, force: true });
  });

  it("returns [] when no workspace is supplied", () => {
    const ctx = {
      diagnostics: [{
        code: "E-IMPORT-004",
        range: { start: { line: 0, character: 0 }, end: { line: 0, character: 5 } },
        message: "synthetic",
      }],
    };
    expect(buildCodeActions("text", "file:///t.scrml", ctx, null, null, "/t.scrml")).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// E-SQL-006 — drop `.prepare()`
// ---------------------------------------------------------------------------

describe("LSP L4.2 — E-SQL-006 quickfix (drop .prepare())", () => {
  it("emits a quickfix that deletes a `.prepare()` call", () => {
    // Build a synthetic source where `.prepare()` lives on line 0.
    const text = 'const stmt = ?{`SELECT * FROM users`}.prepare()';
    const prepareIdx = text.indexOf(".prepare()");
    const prepareEnd = prepareIdx + ".prepare()".length;
    const ctx = {
      diagnostics: [{
        code: "E-SQL-006",
        severity: DiagnosticSeverity.Error,
        range: {
          start: { line: 0, character: prepareIdx },
          end: { line: 0, character: prepareEnd },
        },
        message: "E-SQL-006: .prepare() is removed in Bun.SQL",
      }],
    };
    const actions = buildCodeActions(text, "file:///t.scrml", ctx);
    expect(actions.length).toBe(1);
    const a = actions[0];
    expect(a.kind).toBe(CodeActionKind.QuickFix);
    expect(a.title).toContain(".prepare()");
    const edits = a.edit.changes["file:///t.scrml"];
    expect(edits.length).toBe(1);
    expect(edits[0].newText).toBe("");
    // Edit range should cover ".prepare()" precisely.
    const startOff = positionToOffset(text, edits[0].range.start);
    const endOff = positionToOffset(text, edits[0].range.end);
    expect(text.slice(startOff, endOff)).toBe(".prepare()");
  });

  it("widens the search when the diagnostic span is too narrow", () => {
    // Diagnostic only points at "prepare" without the parens — quickfix
    // still locates the full ".prepare()" call.
    const text = 'const x = q.prepare()';
    const idx = text.indexOf("prepare");
    const end = idx + "prepare".length;
    const ctx = {
      diagnostics: [{
        code: "E-SQL-006",
        range: {
          start: { line: 0, character: idx },
          end: { line: 0, character: end },
        },
        message: "...",
      }],
    };
    const actions = buildCodeActions(text, "file:///t.scrml", ctx);
    expect(actions.length).toBe(1);
    const a = actions[0];
    const edits = a.edit.changes["file:///t.scrml"];
    const startOff = positionToOffset(text, edits[0].range.start);
    const endOff = positionToOffset(text, edits[0].range.end);
    expect(text.slice(startOff, endOff)).toBe(".prepare()");
  });
});

// ---------------------------------------------------------------------------
// E-PA-007 — protect= field doesn't match — closest column
// ---------------------------------------------------------------------------

describe("LSP L4.2 — E-PA-007 quickfix (closest column)", () => {
  it("emits a rename quickfix to the closest column when analysis carries views", () => {
    // Synthesize an analysis with a `protectAnalysis.views` map containing
    // a single table whose schema includes "email". The diagnostic spans
    // the protect="emial" attribute value.
    const text = '< db src="x" tables="users" protect="emial">\n</db>\n';
    const idx = text.indexOf("emial");
    const end = idx + "emial".length;
    const fakeAnalysis = {
      protectAnalysis: {
        views: new Map([
          ["sb1", { tables: new Map([
            ["users", { fullSchema: [
              { name: "id", sqlType: "INTEGER" },
              { name: "email", sqlType: "TEXT" },
              { name: "name", sqlType: "TEXT" },
            ] }],
          ]) }],
        ]),
      },
    };
    const ctx = {
      diagnostics: [{
        code: "E-PA-007",
        range: {
          start: { line: 0, character: idx },
          end: { line: 0, character: end },
        },
        message: "E-PA-007: protect= field `emial` matches no column",
      }],
    };
    const actions = buildCodeActions(text, "file:///t.scrml", ctx, fakeAnalysis);
    expect(actions.length).toBe(1);
    const a = actions[0];
    expect(a.title).toContain("email");
    const edits = a.edit.changes["file:///t.scrml"];
    expect(edits[0].newText).toBe("email");
  });

  it("returns [] when analysis has no protectAnalysis.views", () => {
    const ctx = {
      diagnostics: [{
        code: "E-PA-007",
        range: { start: { line: 0, character: 0 }, end: { line: 0, character: 3 } },
        message: "synthetic",
      }],
    };
    const actions = buildCodeActions("foo", "file:///t.scrml", ctx, {});
    expect(actions).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// positionToOffset round-trip
// ---------------------------------------------------------------------------

describe("LSP L4.2 — positionToOffset", () => {
  it("returns 0 for line 0, char 0", () => {
    expect(positionToOffset("hello", { line: 0, character: 0 })).toBe(0);
  });
  it("counts newlines correctly", () => {
    const text = "abc\ndef";
    expect(positionToOffset(text, { line: 1, character: 0 })).toBe(4);
    expect(positionToOffset(text, { line: 1, character: 2 })).toBe(6);
  });
  it("clamps to text length when position is beyond end", () => {
    expect(positionToOffset("ab", { line: 5, character: 5 })).toBe(2);
  });
});
