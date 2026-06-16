/**
 * engine-hydration-server-source.test.js
 *
 * §52 / §51.0.E (S199 — the E-leg) — server-authoritative reactive hydration
 * `<engine for=T server=@source>`. The engine HYDRATES from a server-owned source
 * cell GUARD-FREE + REACTIVELY (every source change re-hydrates via
 * `_scrml_engine_hydrate_init`, NOT the `rule=` transition guard — the server is
 * the authority asserting truth); CLIENT writes stay GUARDED transitions and the
 * engine REMAINS WRITABLE. Sibling to the A-leg `initial=@cell` (snapshot-once).
 *
 * Coverage:
 *   §1  Parser — `server=@source` captured as engine-decl.serverSource (bare cell
 *        + dotted field-access path); distinct from initialCell / derived.
 *   §2  SYM B15 — existence (reused E-ENGINE-INITIAL-CELL-UNDECLARED), type-compat
 *        (reused E-ENGINE-INITIAL-CELL-TYPE, bare-root only — field-access passes
 *        conservatively), mutual-exclusion (E-ENGINE-SERVER-WITH-DERIVED,
 *        E-ENGINE-SERVER-WITH-INITIAL-CELL), no W-ENGINE-INITIAL-MISSING when
 *        serverSource set, W-ENGINE-SERVER-SOURCE-NOT-AUTHORITATIVE info nudge on a
 *        non-§52 cell, initial=.Variant placeholder coexists.
 *   §3  Codegen — emitEngineServerSourceHydration emits the reactive IIFE:
 *        `_scrml_reactive_subscribe(root)` → `_scrml_engine_hydrate_init` (NOT
 *        `_scrml_engine_direct_set`); skip-if-absent; field-access null-safe walk.
 *   §4  Runtime — reuses `_scrml_engine_hydrate_init` (the decoder boundary) +
 *        `_scrml_reactive_subscribe`; both present in SCRML_RUNTIME.
 */

import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";
import { runSYM } from "../../src/symbol-table.ts";
import { emitEngineServerSourceHydration } from "../../src/codegen/emit-engine.ts";
import { SCRML_RUNTIME } from "../../src/runtime-template.js";

function buildAstFromSource(source, filePath = "test.scrml") {
  const bs = splitBlocks(filePath, source);
  return buildAST(bs).ast;
}

function runUpToSYM(source, filePath = "test.scrml") {
  const bs = splitBlocks(filePath, source);
  const { ast } = buildAST(bs);
  return runSYM({ filePath, ast });
}

function findEngineDecl(ast) {
  let found = null;
  function walk(nodes) {
    if (!nodes) return;
    for (const n of nodes) {
      if (!n) continue;
      if (n.kind === "engine-decl") { if (!found) found = n; return; }
      if (n.children) walk(n.children);
      if (n.body) walk(n.body);
    }
  }
  walk(ast.nodes || []);
  if (!found && ast.machineDecls) {
    for (const m of ast.machineDecls) {
      if (m && m.kind === "engine-decl") { found = m; break; }
    }
  }
  return found;
}

function codes(sym) {
  return (sym.errors || []).map((e) => e.code);
}

/** Build a minimal engineMeta carrying the fields the codegen reads. */
function meta(overrides = {}) {
  return {
    forType: "DriverStatus",
    varName: "driverStatus",
    initialVariant: null,
    initialCell: null,
    serverSource: null,
    variants: ["OffDuty", "Driving", "OnDuty", "Sleeper"],
    stateChildren: [
      { tag: "OffDuty", rule: { kind: "multi", targets: ["Driving", "OnDuty", "Sleeper"] } },
      { tag: "Driving", rule: { kind: "multi", targets: ["OnDuty", "OffDuty"] } },
      { tag: "OnDuty", rule: { kind: "multi", targets: ["Driving", "OffDuty", "Sleeper"] } },
      { tag: "Sleeper", rule: { kind: "multi", targets: ["OffDuty", "OnDuty"] } },
    ],
    derivedExpr: null,
    isExported: false,
    isPinned: false,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// §1 — Parser
// ---------------------------------------------------------------------------

describe("§1 parser — server=@source capture", () => {
  test("`server=@cell` recorded on engine-decl.serverSource (bare root)", () => {
    const src = `<program>
<status> : string = "Driving"
<engine for=DriverStatus server=@status initial=.OffDuty>
  <OffDuty rule=.Driving : "Off duty">
  <Driving rule=.OffDuty : "Driving">
</>
</program>`;
    const eng = findEngineDecl(buildAstFromSource(src));
    expect(eng).not.toBeNull();
    expect(eng.serverSource).toBe("status");
    expect(eng.initialCell ?? null).toBeNull();
  });

  test("`server=@a.b.c` records the full dotted field-access path", () => {
    const src = `<program>
<driver> = { current_status: "Driving" }
<engine for=DriverStatus server=@driver.current_status initial=.OffDuty>
  <OffDuty rule=.Driving : "Off duty">
  <Driving rule=.OffDuty : "Driving">
</>
</program>`;
    const eng = findEngineDecl(buildAstFromSource(src));
    expect(eng.serverSource).toBe("driver.current_status");
  });

  test("absent server= leaves serverSource null", () => {
    const src = `<program>
<engine for=DriverStatus initial=.Driving>
  <OffDuty rule=.Driving : "Off duty">
  <Driving rule=.OffDuty : "Driving">
</>
</program>`;
    const eng = findEngineDecl(buildAstFromSource(src));
    expect(eng.serverSource ?? null).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// §2 — SYM B15 validation
// ---------------------------------------------------------------------------

describe("§2 SYM B15 — server=@source validation", () => {
  test("string cell holding a variant name → no ERROR, no MISSING warning, info nudge fires", () => {
    const src = `<program>
type DriverStatus:enum = { OffDuty, Driving, OnDuty, Sleeper }
<status> : string = "Driving"
<engine for=DriverStatus server=@status initial=.OffDuty>
  <OffDuty rule=.Driving : "Off duty">
  <Driving rule=.OffDuty : "Driving">
</>
</program>`;
    const c = codes(runUpToSYM(src));
    expect(c).not.toContain("E-ENGINE-INITIAL-CELL-UNDECLARED");
    expect(c).not.toContain("E-ENGINE-INITIAL-CELL-TYPE");
    expect(c).not.toContain("E-ENGINE-SERVER-WITH-DERIVED");
    expect(c).not.toContain("E-ENGINE-SERVER-WITH-INITIAL-CELL");
    expect(c).not.toContain("W-ENGINE-INITIAL-MISSING");
    // A plain (non-§52) cell as the source fires the lenient info nudge.
    expect(c).toContain("W-ENGINE-SERVER-SOURCE-NOT-AUTHORITATIVE");
  });

  test("no initial= + server=@source → W-ENGINE-INITIAL-MISSING suppressed", () => {
    const src = `<program>
type DriverStatus:enum = { OffDuty, Driving, OnDuty, Sleeper }
<status> : string = "Driving"
<engine for=DriverStatus server=@status>
  <OffDuty rule=.Driving : "Off duty">
  <Driving rule=.OffDuty : "Driving">
</>
</program>`;
    expect(codes(runUpToSYM(src))).not.toContain("W-ENGINE-INITIAL-MISSING");
  });

  test("non-existent source → E-ENGINE-INITIAL-CELL-UNDECLARED", () => {
    const src = `<program>
type DriverStatus:enum = { OffDuty, Driving, OnDuty, Sleeper }
<engine for=DriverStatus server=@doesNotExist initial=.OffDuty>
  <OffDuty rule=.Driving : "Off duty">
  <Driving rule=.OffDuty : "Driving">
</>
</program>`;
    expect(codes(runUpToSYM(src))).toContain("E-ENGINE-INITIAL-CELL-UNDECLARED");
  });

  test("type-incompatible bare-root source (number) → E-ENGINE-INITIAL-CELL-TYPE", () => {
    const src = `<program>
type DriverStatus:enum = { OffDuty, Driving, OnDuty, Sleeper }
<count> : number = 3
<engine for=DriverStatus server=@count initial=.OffDuty>
  <OffDuty rule=.Driving : "Off duty">
  <Driving rule=.OffDuty : "Driving">
</>
</program>`;
    expect(codes(runUpToSYM(src))).toContain("E-ENGINE-INITIAL-CELL-TYPE");
  });

  test("field-access source passes conservatively (no E-ENGINE-INITIAL-CELL-TYPE)", () => {
    const src = `<program>
type DriverStatus:enum = { OffDuty, Driving, OnDuty, Sleeper }
type Driver:struct = { id: int, current_status: string }
<driver> : Driver = { id: 1, current_status: "Driving" }
<engine for=DriverStatus server=@driver.current_status initial=.OffDuty>
  <OffDuty rule=.Driving : "Off duty">
  <Driving rule=.OffDuty : "Driving">
</>
</program>`;
    const c = codes(runUpToSYM(src));
    expect(c).not.toContain("E-ENGINE-INITIAL-CELL-TYPE");
    expect(c).not.toContain("E-ENGINE-INITIAL-CELL-UNDECLARED");
  });

  test("server=@source + derived= → E-ENGINE-SERVER-WITH-DERIVED", () => {
    const src = `<program>
type DriverStatus:enum = { OffDuty, Driving, OnDuty, Sleeper }
<status> : string = "Driving"
<engine for=DriverStatus server=@status derived=if @status == "Driving" then .Driving else .OffDuty>
</>
</program>`;
    expect(codes(runUpToSYM(src))).toContain("E-ENGINE-SERVER-WITH-DERIVED");
  });

  test("server=@source + initial=@cell → E-ENGINE-SERVER-WITH-INITIAL-CELL", () => {
    const src = `<program>
type DriverStatus:enum = { OffDuty, Driving, OnDuty, Sleeper }
<status> : string = "Driving"
<seed> : string = "OffDuty"
<engine for=DriverStatus server=@status initial=@seed>
  <OffDuty rule=.Driving : "Off duty">
  <Driving rule=.OffDuty : "Driving">
</>
</program>`;
    expect(codes(runUpToSYM(src))).toContain("E-ENGINE-SERVER-WITH-INITIAL-CELL");
  });

  test("server=@source + initial=.Variant placeholder → no mutual-exclusion error", () => {
    const src = `<program>
type DriverStatus:enum = { OffDuty, Driving, OnDuty, Sleeper }
<status> : string = "Driving"
<engine for=DriverStatus server=@status initial=.OffDuty>
  <OffDuty rule=.Driving : "Off duty">
  <Driving rule=.OffDuty : "Driving">
</>
</program>`;
    const c = codes(runUpToSYM(src));
    expect(c).not.toContain("E-ENGINE-SERVER-WITH-INITIAL-CELL");
    expect(c).not.toContain("E-ENGINE-SERVER-WITH-DERIVED");
  });
});

// ---------------------------------------------------------------------------
// §3 — Codegen
// ---------------------------------------------------------------------------

describe("§3 codegen — emitEngineServerSourceHydration", () => {
  test("no serverSource → emits nothing (tree-shake)", () => {
    expect(emitEngineServerSourceHydration(meta())).toEqual([]);
  });

  test("bare-root: subscribes the cell + hydrates guard-free via _scrml_engine_hydrate_init", () => {
    const out = emitEngineServerSourceHydration(meta({ serverSource: "status" })).join("\n");
    expect(out).toContain('_scrml_reactive_get("status")');
    expect(out).toContain('_scrml_engine_hydrate_init("driverStatus"');
    expect(out).toContain('_scrml_reactive_subscribe("status"');
    // skip-if-absent: an unresolved source waits, it does not throw.
    expect(out).toContain("if (__v == null) return;");
    // carries the valid-variant set + forType for the decoder boundary.
    expect(out).toContain('["OffDuty","Driving","OnDuty","Sleeper"]');
    expect(out).toContain('"DriverStatus"');
  });

  test("hydration does NOT route through the transition guard", () => {
    const out = emitEngineServerSourceHydration(meta({ serverSource: "status" })).join("\n");
    expect(out).not.toContain("_scrml_engine_direct_set");
  });

  test("field-access: reads root + walks the dotted tail null-safely; subscribes the ROOT", () => {
    const out = emitEngineServerSourceHydration(
      meta({ serverSource: "driver.current_status" }),
    ).join("\n");
    expect(out).toContain('_scrml_reactive_get("driver")');
    expect(out).toContain('__v = (__v == null) ? null : __v["current_status"];');
    // the subscription is on the ROOT cell (a server load that sets @driver fires it).
    expect(out).toContain('_scrml_reactive_subscribe("driver"');
  });

  test("variant set falls back to stateChildren tags when variants[] empty", () => {
    const out = emitEngineServerSourceHydration(
      meta({ serverSource: "status", variants: [] }),
    ).join("\n");
    expect(out).toContain('["OffDuty","Driving","OnDuty","Sleeper"]');
  });
});

// ---------------------------------------------------------------------------
// §4 — Runtime helpers
// ---------------------------------------------------------------------------

describe("§4 runtime — reused helpers present", () => {
  test("_scrml_engine_hydrate_init (the decoder boundary) is in SCRML_RUNTIME", () => {
    expect(SCRML_RUNTIME).toContain("function _scrml_engine_hydrate_init(");
  });

  test("_scrml_reactive_subscribe (the reactive seam) is in SCRML_RUNTIME", () => {
    expect(SCRML_RUNTIME).toContain("function _scrml_reactive_subscribe(");
  });
});
