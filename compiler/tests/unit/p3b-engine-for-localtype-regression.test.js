/**
 * P3.B — `<engine for=LocalType>` regression pin — Unit Tests
 *
 * These tests pin the SAME-FILE behaviour of `<engine for=LocalType>` (and
 * the deprecated `<machine for=LocalType>` alias) so that the P3.B fix in
 * ast-builder.js (synthesizing type-decl alongside export-decl when parsing
 * `export type X = {...}`) does not regress the existing local-type path.
 *
 * Pre-fix invariant (must continue to hold):
 *   - `<engine for=LocalType>` where `LocalType` is declared in the same file
 *     compiles cleanly (no E-MACHINE-004).
 *   - This is the dispatch app's existing pattern at pages/driver/hos.scrml.
 *
 * Post-fix invariant (must hold after P3.B):
 *   - The above continues to hold (regression pin).
 *
 * SPEC §51.3.2 (engine syntax + type resolution).
 * Closes F-ENGINE-001 architecturally per P3 deep-dive §5.1, §5.4.
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

describe("§A engine for=LocalType — non-exported same-file types", () => {
  test("`<engine for=LocalEnum>` compiles cleanly when LocalEnum is non-exported in-file", () => {
    const src = `\${
  type Status:enum = {
    Pending
    Done
  }
}

< engine name=Flow for=Status>
  .Pending => .Done
</>`;
    const tab = build(src);
    expect(realErrors(tab.errors)).toEqual([]);

    // type-decl present
    const td = tab.ast.typeDecls.find(t => t.name === "Status");
    expect(td).toBeTruthy();
    expect(td.typeKind).toBe("enum");
    expect(td.fromExport).toBeUndefined();

    // machine-decl present
    const md = tab.ast.machineDecls.find(m => m.machineName === "Flow");
    expect(md).toBeTruthy();
    expect(md.governedType).toBe("Status");
    expect(md.legacyMachineKeyword).toBe(false);
  });

  test("`<engine for=LocalStruct>` compiles cleanly when LocalStruct is non-exported in-file", () => {
    const src = `\${
  type Person:struct = {
    name: string
    age: number
  }
}

< engine name=PersonFlow for=Person>
  .Anonymous => .Identified given (self.name != "")
</>`;
    const tab = build(src);
    expect(realErrors(tab.errors)).toEqual([]);

    const td = tab.ast.typeDecls.find(t => t.name === "Person");
    expect(td).toBeTruthy();
    expect(td.typeKind).toBe("struct");
    expect(td.fromExport).toBeUndefined();

    const md = tab.ast.machineDecls.find(m => m.machineName === "PersonFlow");
    expect(md).toBeTruthy();
    expect(md.governedType).toBe("Person");
  });

  test("`<engine for=LocalEnum>` continues to work when LocalEnum has many variants", () => {
    const src = `\${
  type DriverStatus:enum = {
    OffDuty
    OnDuty
    Driving
    SleeperBerth
  }
}

< engine name=HOSMachine for=DriverStatus>
  .OffDuty      => .OnDuty | .SleeperBerth
  .OnDuty       => .OffDuty | .Driving
  .Driving      => .OffDuty | .OnDuty
  .SleeperBerth => .OnDuty | .OffDuty
</>`;
    const tab = build(src);
    expect(realErrors(tab.errors)).toEqual([]);

    const td = tab.ast.typeDecls.find(t => t.name === "DriverStatus");
    expect(td).toBeTruthy();
    expect(td.typeKind).toBe("enum");

    const md = tab.ast.machineDecls.find(m => m.machineName === "HOSMachine");
    expect(md).toBeTruthy();
    expect(md.governedType).toBe("DriverStatus");
  });
});

describe("§B legacy `<machine for=LocalType>` continues to compile + emit W-DEPRECATED-001", () => {
  test("`<machine for=LocalEnum>` (deprecated keyword) still works with same-file type", () => {
    const src = `\${
  type LegacyStatus:enum = { A B }
}

< machine name=LegacyFlow for=LegacyStatus>
  .A => .B
</>`;
    const tab = build(src);
    // Only W-DEPRECATED-001 expected; no real errors
    expect(realErrors(tab.errors)).toEqual([]);
    const dep = (tab.errors || []).filter(e => e.code === "W-DEPRECATED-001");
    expect(dep.length).toBe(1);

    const md = tab.ast.machineDecls.find(m => m.machineName === "LegacyFlow");
    expect(md).toBeTruthy();
    expect(md.governedType).toBe("LegacyStatus");
    expect(md.legacyMachineKeyword).toBe(true);
  });

  test("`<machine for=LocalStruct>` (deprecated keyword) still works", () => {
    const src = `\${
  type LegacyShape:struct = { x: number, y: number }
}

< machine name=LegacyShapeFlow for=LegacyShape>
  .Initial => .Final given (self.x > 0)
</>`;
    const tab = build(src);
    expect(realErrors(tab.errors)).toEqual([]);
    const dep = (tab.errors || []).filter(e => e.code === "W-DEPRECATED-001");
    expect(dep.length).toBe(1);

    const md = tab.ast.machineDecls.find(m => m.machineName === "LegacyShapeFlow");
    expect(md).toBeTruthy();
    expect(md.governedType).toBe("LegacyShape");
  });
});
