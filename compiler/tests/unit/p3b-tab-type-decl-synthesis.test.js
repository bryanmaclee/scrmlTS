/**
 * P3.B — TAB type-decl synthesis for `export type X = {...}` — Unit Tests
 *
 * Coverage:
 *   §A  All 4 type kinds (enum, struct, tuple, map) — `export type X:K = {...}`
 *       produces BOTH a type-decl (in ast.typeDecls) AND an export-decl (in
 *       ast.exports).
 *   §B  Non-exported types continue to produce ONLY a type-decl (regression pin).
 *   §C  Mixed file: one exported type + one non-exported type — both appear in
 *       ast.typeDecls.
 *   §D  Order preservation: synthetic type-decl appears in node order with its
 *       export-decl in the logic-block body.
 *   §E  Inline type aliases (`export type Alias = number`) — type-decl carries
 *       inline raw with empty typeKind.
 *   §F  Empty body / malformed input — no crash; existing error path unchanged.
 *
 * State-as-Primary unification — Phase P3.B (2026-05-02).
 * Closes F-ENGINE-001 architecturally per P3 deep-dive §5.1, §5.4.
 *
 * SPEC §21.2 (export forms), §51.3.2 (engine for=Type resolution).
 */

import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";

function build(src) {
  const bs = splitBlocks("test.scrml", src);
  return buildAST(bs);
}

function realErrors(errs) {
  return (errs || []).filter(e => e && e.severity !== "warning");
}

// ---------------------------------------------------------------------------
// §A — All 4 type kinds produce both type-decl and export-decl
// ---------------------------------------------------------------------------

describe("§A export type X:kind = {...} produces type-decl + export-decl pair", () => {
  test("export type X:enum = {...} produces type-decl with typeKind='enum' AND export-decl", () => {
    const src = `\${
  export type Status:enum = {
    Pending
    Done
    Cancelled
  }
}`;
    const tab = build(src);
    expect(realErrors(tab.errors)).toEqual([]);

    // type-decl appears in ast.typeDecls
    expect(tab.ast.typeDecls.length).toBe(1);
    const td = tab.ast.typeDecls[0];
    expect(td.kind).toBe("type-decl");
    expect(td.name).toBe("Status");
    expect(td.typeKind).toBe("enum");
    expect(td.raw).toContain("Pending");
    expect(td.raw).toContain("Cancelled");
    // Brace-bounded raw mirrors the existing type-decl path's shape
    expect(td.raw.startsWith("{")).toBe(true);
    expect(td.raw.endsWith("}")).toBe(true);
    // Marker for downstream debugging / introspection
    expect(td.fromExport).toBe(true);

    // export-decl appears in ast.exports
    expect(tab.ast.exports.length).toBe(1);
    const exp = tab.ast.exports[0];
    expect(exp.kind).toBe("export-decl");
    expect(exp.exportKind).toBe("type");
    expect(exp.exportedName).toBe("Status");
  });

  test("export type X:struct = {...} produces type-decl with typeKind='struct' AND export-decl", () => {
    const src = `\${
  export type Config:struct = {
    timeout: number
    retries: number
  }
}`;
    const tab = build(src);
    expect(realErrors(tab.errors)).toEqual([]);

    expect(tab.ast.typeDecls.length).toBe(1);
    const td = tab.ast.typeDecls[0];
    expect(td.name).toBe("Config");
    expect(td.typeKind).toBe("struct");
    expect(td.raw).toContain("timeout");
    expect(td.raw).toContain("retries");
    expect(td.fromExport).toBe(true);

    expect(tab.ast.exports.length).toBe(1);
    expect(tab.ast.exports[0].exportKind).toBe("type");
    expect(tab.ast.exports[0].exportedName).toBe("Config");
  });

  test("export type X:tuple = {...} produces type-decl with typeKind='tuple' AND export-decl", () => {
    const src = `\${
  export type Pair:tuple = { number, number }
}`;
    const tab = build(src);
    expect(realErrors(tab.errors)).toEqual([]);

    expect(tab.ast.typeDecls.length).toBe(1);
    const td = tab.ast.typeDecls[0];
    expect(td.name).toBe("Pair");
    expect(td.typeKind).toBe("tuple");
    expect(td.fromExport).toBe(true);

    expect(tab.ast.exports.length).toBe(1);
    expect(tab.ast.exports[0].exportKind).toBe("type");
    expect(tab.ast.exports[0].exportedName).toBe("Pair");
  });

  test("export type X:map = {...} produces type-decl with typeKind='map' AND export-decl", () => {
    const src = `\${
  export type Lookup:map = { string => number }
}`;
    const tab = build(src);
    expect(realErrors(tab.errors)).toEqual([]);

    expect(tab.ast.typeDecls.length).toBe(1);
    const td = tab.ast.typeDecls[0];
    expect(td.name).toBe("Lookup");
    expect(td.typeKind).toBe("map");
    expect(td.fromExport).toBe(true);

    expect(tab.ast.exports.length).toBe(1);
    expect(tab.ast.exports[0].exportKind).toBe("type");
    expect(tab.ast.exports[0].exportedName).toBe("Lookup");
  });
});

// ---------------------------------------------------------------------------
// §B — Non-exported types continue to produce ONLY a type-decl (regression pin)
// ---------------------------------------------------------------------------

describe("§B non-exported types continue to produce ONLY a type-decl (no export-decl)", () => {
  test("type X:enum = {...} (non-exported) produces type-decl only — exports.length === 0", () => {
    const src = `\${
  type LocalStatus:enum = { A B C }
}`;
    const tab = build(src);
    expect(realErrors(tab.errors)).toEqual([]);

    // type-decl present
    expect(tab.ast.typeDecls.length).toBe(1);
    expect(tab.ast.typeDecls[0].name).toBe("LocalStatus");
    expect(tab.ast.typeDecls[0].typeKind).toBe("enum");
    // fromExport flag is NOT set for non-exported types
    expect(tab.ast.typeDecls[0].fromExport).toBeUndefined();

    // No export-decl
    expect(tab.ast.exports.length).toBe(0);
  });

  test("type X:struct = {...} (non-exported) — fromExport flag absent", () => {
    const src = `\${
  type LocalConfig:struct = { x: number, y: number }
}`;
    const tab = build(src);
    expect(realErrors(tab.errors)).toEqual([]);

    expect(tab.ast.typeDecls.length).toBe(1);
    expect(tab.ast.typeDecls[0].name).toBe("LocalConfig");
    expect(tab.ast.typeDecls[0].fromExport).toBeUndefined();
    expect(tab.ast.exports.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// §C — Mixed file: exported + non-exported coexist; both in ast.typeDecls
// ---------------------------------------------------------------------------

describe("§C mixed file: one exported, one non-exported type", () => {
  test("both types appear in ast.typeDecls; exported type also has an export-decl", () => {
    const src = `\${
  export type Pub:enum = { A B C }

  type Priv:enum = { D E F }
}`;
    const tab = build(src);
    expect(realErrors(tab.errors)).toEqual([]);

    expect(tab.ast.typeDecls.length).toBe(2);
    const names = tab.ast.typeDecls.map(td => td.name).sort();
    expect(names).toEqual(["Priv", "Pub"]);

    const pub = tab.ast.typeDecls.find(td => td.name === "Pub");
    const priv = tab.ast.typeDecls.find(td => td.name === "Priv");
    expect(pub.fromExport).toBe(true);
    expect(priv.fromExport).toBeUndefined();

    // Only Pub has an export-decl
    expect(tab.ast.exports.length).toBe(1);
    expect(tab.ast.exports[0].exportedName).toBe("Pub");
  });
});

// ---------------------------------------------------------------------------
// §D — Order preservation in logic body
// ---------------------------------------------------------------------------

describe("§D synthetic type-decl precedes its export-decl in source order", () => {
  test("logic-block body order: type-decl appears before its sibling export-decl", () => {
    const src = `\${
  export type X:enum = { A B }
}`;
    const tab = build(src);
    expect(realErrors(tab.errors)).toEqual([]);

    // The logic-block body must have BOTH the type-decl and the export-decl,
    // in that order (synthetic type-decl pushed before export-decl).
    const logic = tab.ast.nodes.find(n => n.kind === "logic");
    expect(logic).toBeTruthy();
    const kinds = logic.body.map(b => b.kind);
    const tdIdx = kinds.indexOf("type-decl");
    const edIdx = kinds.indexOf("export-decl");
    expect(tdIdx).toBeGreaterThanOrEqual(0);
    expect(edIdx).toBeGreaterThanOrEqual(0);
    expect(tdIdx).toBeLessThan(edIdx);
  });
});

// ---------------------------------------------------------------------------
// §E — Inline type aliases (no body braces)
// ---------------------------------------------------------------------------

describe("§E inline type aliases — `export type X = expr` produces type-decl with raw expr", () => {
  test("export type Alias = number produces type-decl with empty typeKind and raw='number'", () => {
    const src = `\${ export type IntAlias = number }`;
    const tab = build(src);
    expect(realErrors(tab.errors)).toEqual([]);

    expect(tab.ast.typeDecls.length).toBe(1);
    const td = tab.ast.typeDecls[0];
    expect(td.name).toBe("IntAlias");
    expect(td.typeKind).toBe("");
    expect(td.raw.trim()).toBe("number");
    expect(td.fromExport).toBe(true);

    expect(tab.ast.exports.length).toBe(1);
    expect(tab.ast.exports[0].exportKind).toBe("type");
    expect(tab.ast.exports[0].exportedName).toBe("IntAlias");
  });
});

// ---------------------------------------------------------------------------
// §F — Robustness: empty / degenerate forms must not crash
// ---------------------------------------------------------------------------

describe("§F robustness — degenerate input does not crash; existing error paths unchanged", () => {
  test("export type without a name does not crash; produces no synthetic type-decl", () => {
    const src = `\${
  export type
}`;
    // Should not throw. May produce errors per existing path.
    const tab = build(src);
    // The malformed export does not match the regex → exportNode.exportKind
    // stays null and no synthetic type-decl is pushed.
    const synth = tab.ast.typeDecls.filter(td => td.fromExport === true);
    expect(synth.length).toBe(0);
  });
});
