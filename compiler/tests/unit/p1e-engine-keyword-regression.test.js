// P1.E.E — Dedicated regression coverage for W-DEPRECATED-001 (`<machine>` →
// `<engine>` keyword migration). Replaces the prior coverage that lived in
// samples/compilation-tests/machine-*.scrml fixtures (now migrated to
// `<engine>` per P1.E.E).
//
// SPEC: §51.3.2 (canonical engine keyword), §15.15 (NR registry includes
// machine as deprecated alias), §34 (W-DEPRECATED-001 catalog).

import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";

function build(src) {
  const bs = splitBlocks("test.scrml", src);
  return buildAST(bs);
}

describe("P1.E.E: W-DEPRECATED-001 — `<machine>` keyword (with-space form)", () => {
  test("`< machine name=X for=Y>` emits exactly one W-DEPRECATED-001", () => {
    const tab = build("< machine name=Foo for=Bar>\n  .a => .b\n</>");
    const ws = tab.errors.filter(e => e.code === "W-DEPRECATED-001");
    expect(ws.length).toBe(1);
    expect(ws[0].severity).toBe("warning");
  });

  test("`<machine name=X for=Y>` (no-space) emits exactly one W-DEPRECATED-001", () => {
    const tab = build("<machine name=Foo for=Bar>\n  .a => .b\n</>");
    const ws = tab.errors.filter(e => e.code === "W-DEPRECATED-001");
    expect(ws.length).toBe(1);
    expect(ws[0].severity).toBe("warning");
  });

  test("multiple `<machine>` declarations each emit W-DEPRECATED-001", () => {
    const tab = build(
      "< machine name=A for=X>\n  .p => .q\n</>\n" +
      "< machine name=B for=Y>\n  .r => .s\n</>"
    );
    const ws = tab.errors.filter(e => e.code === "W-DEPRECATED-001");
    expect(ws.length).toBe(2);
  });

  test("`<engine>` (canonical) does NOT emit W-DEPRECATED-001", () => {
    const tab = build("< engine name=Foo for=Bar>\n  .a => .b\n</>");
    const ws = tab.errors.filter(e => e.code === "W-DEPRECATED-001");
    expect(ws.length).toBe(0);
  });

  test("`<machine>` continues to compile (P1 phase — both forms compile, becomes E-DEPRECATED-001 in P3)", () => {
    const tab = build("< machine name=Foo for=Bar>\n  .a => .b\n</>");
    expect(tab.ast.nodes[0].kind).toBe("engine-decl");
    expect(tab.ast.nodes[0].engineName).toBe("Foo");
    expect(tab.ast.nodes[0].governedType).toBe("Bar");
  });

  test("`<machine>` and `<engine>` produce structurally identical engine-decl ASTs (modulo legacyMachineKeyword flag)", () => {
    const m = build("< machine name=Foo for=Bar>\n  .a => .b\n</>").ast.nodes[0];
    const e = build("< engine name=Foo for=Bar>\n  .a => .b\n</>").ast.nodes[0];
    expect(m.kind).toBe("engine-decl");
    expect(e.kind).toBe("engine-decl");
    expect(m.engineName).toBe(e.engineName);
    expect(m.governedType).toBe(e.governedType);
    expect(m.rulesRaw).toBe(e.rulesRaw);
    expect(m.legacyMachineKeyword).toBe(true);
    expect(e.legacyMachineKeyword).toBe(false);
  });
});

describe("P1.E.E: W-DEPRECATED-001 — message content", () => {
  test("message references `<engine>` as the canonical alternative", () => {
    const tab = build("< machine name=Foo for=Bar>\n  .a => .b\n</>");
    const ws = tab.errors.find(e => e.code === "W-DEPRECATED-001");
    expect(ws).toBeTruthy();
    expect(ws.message).toContain("engine");
    expect(ws.message).toContain("deprecated");
  });

  test("message references P3 escalation to E-DEPRECATED-001", () => {
    const tab = build("< machine name=Foo for=Bar>\n  .a => .b\n</>");
    const ws = tab.errors.find(e => e.code === "W-DEPRECATED-001");
    expect(ws).toBeTruthy();
    expect(ws.message).toContain("P3");
  });
});
