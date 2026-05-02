/**
 * P3.B — `<engine for=ImportedType>` cross-file resolution — Integration Tests
 *
 * Coverage (cross-file behaviour after P3.B TAB type-decl synthesis fix):
 *   §X1 — `<engine for=ImportedEnum>` where ImportedEnum comes from another
 *         file via `${ export type ImportedEnum:enum = {...} }`. Pre-fix:
 *         E-ENGINE-004. Post-fix: compiles cleanly, machine-decl emitted.
 *   §X2 — `<engine for=ImportedStruct>` cross-file resolution.
 *   §X3 — End-to-end smoke: schema.scrml exports `DriverStatus`; consumer
 *         imports it and uses `<engine for=DriverStatus>`. Mirrors the
 *         dispatch app's pre-fix workaround removal (pages/driver/hos.scrml).
 *
 * These tests use the FULL CLI compilation surface (`compileScrml` from
 * api.js) so they exercise: TAB → MOD → NR → CE → TS (with importedTypesByFile
 * cross-file seeding) → machine-validation → CG.
 *
 * Pre-P3.B state: `<engine for=ImportedType>` failed at TS with
 *   E-ENGINE-004: Machine '...' references unknown type '...'
 * even though the import was valid.
 *
 * Post-P3.B state: TAB synthesizes a type-decl AST node from `export type X`
 * (in addition to the existing export-decl), so api.js:768-770 finds the
 * type when building importedTypesByFile, type-system.ts merges it into
 * the consumer's typeRegistry, and machine validation succeeds.
 *
 * State-as-Primary unification — Phase P3.B (2026-05-02).
 * Closes F-ENGINE-001 architecturally per P3 deep-dive §5.1, §5.4, §6.5.
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { mkdirSync, writeFileSync, rmSync, existsSync, mkdtempSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { compileScrml } from "../../src/api.js";

let TMP;

beforeAll(() => {
  TMP = mkdtempSync(join(tmpdir(), "p3b-engine-cf-"));
});

afterAll(() => {
  if (TMP && existsSync(TMP)) rmSync(TMP, { recursive: true, force: true });
});

function fx(relPath, source) {
  const abs = join(TMP, relPath);
  mkdirSync(join(abs, "..").replace(/\/$/, ""), { recursive: true });
  writeFileSync(abs, source);
  return abs;
}

/**
 * Filter to compile errors only (drops warnings like W-PROGRAM-001).
 */
function realCompileErrors(result) {
  return (result.errors || []).filter(e => e && e.severity !== "warning");
}

// ---------------------------------------------------------------------------
// §X1 — Cross-file enum import + `<engine for=ImportedEnum>`
// ---------------------------------------------------------------------------

describe("§X1 `<engine for=ImportedEnum>` cross-file resolves cleanly", () => {
  test("schema.scrml exports `Status:enum`; consumer imports and uses `<engine for=Status>`", () => {
    const ROOT = join(TMP, "x1");
    mkdirSync(ROOT, { recursive: true });

    fx("x1/schema.scrml", `\${
  export type Status:enum = {
    Pending
    Done
    Cancelled
  }
}
`);

    const consumer = fx("x1/consumer.scrml", `\${
  import { Status } from './schema.scrml'
}

< engine name=Flow for=Status>
  .Pending => .Done | .Cancelled
  .Done => .Cancelled
</>

<program>
  <p>workflow demo</p>
</program>
`);

    const outDir = join(ROOT, "dist");
    const result = compileScrml({
      inputFiles: [consumer],
      outputDir: outDir,
      write: true,
      log: () => {},
    });

    // Predicted post-fix: zero compile errors. Pre-fix: E-ENGINE-004.
    const errs = realCompileErrors(result);
    const e_machine_004 = errs.filter(e => e.code === "E-ENGINE-004");
    expect(e_machine_004).toEqual([]);
    expect(errs).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// §X2 — Cross-file struct import + `<engine for=ImportedStruct>`
// ---------------------------------------------------------------------------

describe("§X2 `<engine for=ImportedStruct>` cross-file resolves cleanly", () => {
  test("models.scrml exports `Person:struct`; consumer uses `<engine for=Person>`", () => {
    const ROOT = join(TMP, "x2");
    mkdirSync(ROOT, { recursive: true });

    fx("x2/models.scrml", `\${
  export type Person:struct = {
    name: string
    age: number
  }
}
`);

    const consumer = fx("x2/consumer.scrml", `\${
  import { Person } from './models.scrml'
}

< engine name=PersonFlow for=Person>
  .Anonymous => .Identified given (self.name != "")
</>

<program>
  <p>person flow</p>
</program>
`);

    const outDir = join(ROOT, "dist");
    const result = compileScrml({
      inputFiles: [consumer],
      outputDir: outDir,
      write: true,
      log: () => {},
    });

    const errs = realCompileErrors(result);
    const e_machine_004 = errs.filter(e => e.code === "E-ENGINE-004");
    expect(e_machine_004).toEqual([]);
    expect(errs).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// §X3 — Dispatch-app HOS pattern: schema.scrml DriverStatus + consumer engine
// ---------------------------------------------------------------------------

describe("§X3 dispatch-app HOS pattern (workaround removal)", () => {
  test("schema.scrml DriverStatus + consumer `<engine for=DriverStatus>` compiles clean", () => {
    const ROOT = join(TMP, "x3");
    mkdirSync(ROOT, { recursive: true });

    // Mirrors examples/23-trucking-dispatch/schema.scrml DriverStatus.
    fx("x3/schema.scrml", `\${
  export type DriverStatus:enum = {
    OffDuty
    OnDuty
    Driving
    SleeperBerth
  }
}
`);

    // Mirrors examples/23-trucking-dispatch/pages/driver/hos.scrml AFTER the
    // P3.B fix removes the local DriverStatus re-declaration.
    const consumer = fx("x3/hos.scrml", `\${
  import { DriverStatus } from './schema.scrml'
}

< engine name=HOSMachine for=DriverStatus>
  .OffDuty      => .OnDuty | .SleeperBerth
  .OnDuty       => .OffDuty | .Driving
  .Driving      => .OffDuty | .OnDuty
  .SleeperBerth => .OnDuty | .OffDuty
</>

<program>
  <p>HOS demo</p>
</program>
`);

    const outDir = join(ROOT, "dist");
    const result = compileScrml({
      inputFiles: [consumer],
      outputDir: outDir,
      write: true,
      log: () => {},
    });

    const errs = realCompileErrors(result);
    const e_machine_004 = errs.filter(e => e.code === "E-ENGINE-004");
    expect(e_machine_004).toEqual([]);
    expect(errs).toEqual([]);
  });

  test("multiple cross-file enum imports (UserRole + DriverStatus) coexist for separate engines", () => {
    const ROOT = join(TMP, "x3b");
    mkdirSync(ROOT, { recursive: true });

    fx("x3b/schema.scrml", `\${
  export type UserRole:enum = { Admin, User, Banned }
  export type DriverStatus:enum = { OffDuty, OnDuty, Driving }
}
`);

    const consumer = fx("x3b/consumer.scrml", `\${
  import { UserRole, DriverStatus } from './schema.scrml'
}

< engine name=RoleFlow for=UserRole>
  .User => .Admin
  .User => .Banned
</>

< engine name=DriveFlow for=DriverStatus>
  .OffDuty => .OnDuty
  .OnDuty => .Driving
</>

<program>
  <p>multi-engine demo</p>
</program>
`);

    const outDir = join(ROOT, "dist");
    const result = compileScrml({
      inputFiles: [consumer],
      outputDir: outDir,
      write: true,
      log: () => {},
    });

    const errs = realCompileErrors(result);
    expect(errs).toEqual([]);
  });
});
