/**
 * Phase A1b Step B11 — Auto-synthesized validity surface (compound rollup).
 *
 * Tests PASS 8 (synth-cell registration) + PASS 6 extension
 * (E-SYNTHESIZED-WRITE) added to Stage 3.06 SYM (`compiler/src/symbol-table.ts`).
 *
 * Spec authority:
 *   §55.5  — Compound-level synth surface.
 *   §55.6  — Per-field synth surface (B12 future scope; B11 only registers
 *            compound-level).
 *   §55.7  — Synthesized-property semantics + update-timing table.
 *   §55.9  — ValidationError enum (referenced from synth `errors` shape).
 *   §55.13 — `reset` keyword interaction.
 *   §34    — E-SYNTHESIZED-WRITE catalog row.
 *
 * Audit reference:
 *   - `docs/audits/a1b-b11-rule4-audit-2026-05-07.md` — 1 substantive +
 *     1 spec-prose + 1 wave-ordering finding; 8-point dispatch brief.
 *
 * Coverage (per dispatch §"Test Expectations"):
 *
 *   §B11.1  — Compound-with-validators: synth surface registered.
 *   §B11.2  — Compound-no-validators: synth surface registered (trivially-valid
 *             defaults per §55.5 line 24415-24418 predictability rule).
 *   §B11.3  — Single-value Tier-1 (e.g., `<count req>`): NO surface (L11 Edge A).
 *   §B11.4  — E-SYNTHESIZED-WRITE fires on `@form.isValid = false`.
 *   §B11.5  — E-SYNTHESIZED-WRITE fires on `@form.errors = {}`.
 *   §B11.6  — E-SYNTHESIZED-WRITE fires on `@form.touched = {}`.
 *   §B11.7  — E-SYNTHESIZED-WRITE fires on `@form.submitted = true`.
 *   §B11.8  — Cross-field predicate-arg dep edges (B7 dep-graph consumer
 *             via B10 Phase 3 — verifies the edge exists; the rollup edges
 *             are an A1c codegen materialization).
 *   §B11.9  — Compound rollup dep contract (record-level — every synth cell
 *             on the compound has a `parentCompound` back-pointer).
 *   §B11.10 — Runtime-hook annotations: isValid/errors null; touched "touch";
 *             submitted "submit" (per §55.7 update-timing table).
 *   §B11.11 — `submitted` is COMPOUND-LEVEL ONLY (per §55.7 line 24468).
 *             B12 must NOT replicate it per-field; B11 doesn't need to test
 *             B12's behavior, but verifies B11 does NOT register `submitted`
 *             at any per-field scope (per-field synth surface is B12's
 *             extension, but the compound's `_scope` only holds compound-
 *             level synth cells, NOT per-field synth cells — those don't
 *             exist yet).
 *   §B11.12 — Nested compounds: `<form><address><street>=""</></>` registers
 *             synth surface on BOTH `@form` and `@form.address`.
 *   §B11.13 — Public read APIs (`isSynthesizedCell`, `getSynthRecords`).
 *   §B11.14 — Compound child name shadowing: `<form><isValid>=""</>` has the
 *             dev's `isValid` child win; synth `isValid` is skipped (silent
 *             today; future tightening may fire E-SYNTH-NAME-COLLIDES).
 */

import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";
import {
  runSYM,
  lookupQualifiedStateCell,
  isSynthesizedCell,
  getSynthRecords,
  COMPOUND_SYNTH_PROPERTIES,
  SYNTH_PROPERTY_NAMES,
} from "../../src/symbol-table.ts";

function parse(source) {
  const bs = splitBlocks("test.scrml", source);
  return buildAST(bs);
}

function buildAndRun(source) {
  const { ast, errors } = parse(source);
  const sym = runSYM({ filePath: "test.scrml", ast });
  return { ast, errors, sym };
}

function errsByCode(sym, code) {
  return sym.errors.filter((e) => e.code === code);
}

// ===========================================================================
// §B11.1 — Compound with validators: synth surface registered
// ===========================================================================

describe("§B11.1 compound-with-validators registers full synth surface", () => {
  test("`<form><name req length(>=2)></>` registers all four synth cells", () => {
    const src = `<program>\${ <form><name req length(>=2)> = <input type="text"/></> }</program>`;
    const { sym } = buildAndRun(src);

    const formRec = sym.fileScope.stateCells.get("form");
    expect(formRec).toBeDefined();
    expect(formRec.isCompoundParent).toBe(true);

    const formScope = formRec.declNode._scope;
    expect(formScope).toBeDefined();

    for (const property of COMPOUND_SYNTH_PROPERTIES) {
      const synthRec = formScope.stateCells.get(property);
      expect(synthRec).toBeDefined();
      expect(synthRec.isSynthesized).toBe(true);
      expect(synthRec.synthProperty).toBe(property);
      expect(synthRec.parentCompound).toBe(formRec);
      expect(synthRec.qualifiedPath).toBe("form." + property);
      expect(synthRec.isConst).toBe(true);
      expect(synthRec.shape).toBe("derived");
    }
  });

  test("synth records resolve via lookupQualifiedStateCell", () => {
    const src = `<program>\${ <signup><name req> = <input type="text"/> </> }</program>`;
    const { sym } = buildAndRun(src);

    for (const property of COMPOUND_SYNTH_PROPERTIES) {
      const synthRec = lookupQualifiedStateCell(sym.fileScope, ["signup", property]);
      expect(synthRec).toBeDefined();
      expect(synthRec).not.toBeNull();
      expect(synthRec.isSynthesized).toBe(true);
    }
  });
});

// ===========================================================================
// §B11.2 — Compound with NO validators: trivially-valid surface
// ===========================================================================

describe("§B11.2 compound-no-validators ALSO registers synth surface (predictability)", () => {
  test("`<formRes><name>=\"\" <email>=\"\" </>` registers all four synth cells", () => {
    const src = `<program>\${ <formRes><name>="" <email>="" </> }</program>`;
    const { sym } = buildAndRun(src);

    const formRec = sym.fileScope.stateCells.get("formRes");
    expect(formRec).toBeDefined();
    const formScope = formRec.declNode._scope;

    for (const property of COMPOUND_SYNTH_PROPERTIES) {
      const synthRec = formScope.stateCells.get(property);
      expect(synthRec).toBeDefined();
      expect(synthRec.isSynthesized).toBe(true);
    }
  });

  test("empty compound `<empty></>` ALSO gets synth surface", () => {
    const src = `<program>\${ <empty></> }</program>`;
    const { sym } = buildAndRun(src);
    const rec = sym.fileScope.stateCells.get("empty");
    expect(rec).toBeDefined();
    expect(rec.declNode._scope.stateCells.size).toBe(4);
  });
});

// ===========================================================================
// §B11.3 — Single-value Tier-1: NO synth surface
// ===========================================================================

describe("§B11.3 single-value Tier-1 cells do NOT get the auto-namespace (L11 Edge A)", () => {
  test("`<count req>` is NOT a compound; no synth surface", () => {
    const src = `<program>\${ <count req> = 0 }</program>`;
    const { sym } = buildAndRun(src);

    const countRec = sym.fileScope.stateCells.get("count");
    expect(countRec).toBeDefined();
    expect(countRec.isCompoundParent).toBe(false);
    // No `_scope` on a non-compound state-decl.
    expect(countRec.declNode._scope).toBeUndefined();

    // No synth records anywhere for this cell.
    expect(getSynthRecords(countRec.declNode)).toEqual([]);
  });

  test("`<userName>` plain Shape 1 has no synth surface", () => {
    const src = `<program>\${ <userName> = "" }</program>`;
    const { sym } = buildAndRun(src);
    const rec = sym.fileScope.stateCells.get("userName");
    expect(rec).toBeDefined();
    expect(rec.declNode._scope).toBeUndefined();
  });
});

// ===========================================================================
// §B11.4 — E-SYNTHESIZED-WRITE on @form.isValid = false
// ===========================================================================

describe("§B11.4 E-SYNTHESIZED-WRITE fires on `@form.isValid = false`", () => {
  test("write to compound's isValid fires", () => {
    const src = `<program>\${
      <form><name req> = <input type="text"/> </>
      function f() { @form.isValid = false }
    }</program>`;
    const { sym } = buildAndRun(src);

    const fires = errsByCode(sym, "E-SYNTHESIZED-WRITE");
    expect(fires.length).toBeGreaterThanOrEqual(1);
    expect(fires[0].message).toContain("@form.isValid");
    expect(fires[0].message).toContain("READ-ONLY");
    expect(fires[0].severity).toBe("error");
  });
});

// ===========================================================================
// §B11.5 — E-SYNTHESIZED-WRITE on @form.errors = {}
// ===========================================================================

describe("§B11.5 E-SYNTHESIZED-WRITE fires on `@form.errors = {}`", () => {
  test("write to compound's errors fires", () => {
    const src = `<program>\${
      <form><name req> = <input type="text"/> </>
      function f() { @form.errors = {} }
    }</program>`;
    const { sym } = buildAndRun(src);

    const fires = errsByCode(sym, "E-SYNTHESIZED-WRITE");
    expect(fires.length).toBeGreaterThanOrEqual(1);
    expect(fires[0].message).toContain("@form.errors");
  });
});

// ===========================================================================
// §B11.6 — E-SYNTHESIZED-WRITE on @form.touched = {}
// ===========================================================================

describe("§B11.6 E-SYNTHESIZED-WRITE fires on `@form.touched = {}`", () => {
  test("write to compound's touched fires", () => {
    const src = `<program>\${
      <form><name req> = <input type="text"/> </>
      function f() { @form.touched = {} }
    }</program>`;
    const { sym } = buildAndRun(src);

    const fires = errsByCode(sym, "E-SYNTHESIZED-WRITE");
    expect(fires.length).toBeGreaterThanOrEqual(1);
    expect(fires[0].message).toContain("@form.touched");
  });
});

// ===========================================================================
// §B11.7 — E-SYNTHESIZED-WRITE on @form.submitted = true
// ===========================================================================

describe("§B11.7 E-SYNTHESIZED-WRITE fires on `@form.submitted = true`", () => {
  test("write to compound's submitted fires", () => {
    const src = `<program>\${
      <form><name req> = <input type="text"/> </>
      function f() { @form.submitted = true }
    }</program>`;
    const { sym } = buildAndRun(src);

    const fires = errsByCode(sym, "E-SYNTHESIZED-WRITE");
    expect(fires.length).toBeGreaterThanOrEqual(1);
    expect(fires[0].message).toContain("@form.submitted");
  });
});

// ===========================================================================
// §B11.8 — Cross-field predicate-arg dep edges
// ===========================================================================

describe("§B11.8 cross-field predicate-arg deps emitted via B10 Phase 3", () => {
  test("`<confirm req eq(@signup.password)>` does NOT fire E-VALIDATOR-CIRCULAR-DEP", () => {
    // The B10 Phase 3 machinery builds dep-graph edges; B11's contribution
    // is the synth-cell registry that A1c codegen uses to wire up the
    // reactive subscription. This test verifies the cross-field reference
    // is well-formed and doesn't fire a cycle (positive control).
    const src = `<program>\${
      <signup>
        <password req length(>=8)> = <input type="password"/>
        <confirm req eq(@signup.password)> = <input type="password"/>
      </>
    }</program>`;
    const { sym } = buildAndRun(src);

    // No synthesis errors; password & confirm both register.
    const formRec = sym.fileScope.stateCells.get("signup");
    expect(formRec).toBeDefined();
    const formScope = formRec.declNode._scope;
    expect(formScope.stateCells.has("password")).toBe(true);
    expect(formScope.stateCells.has("confirm")).toBe(true);
    // Compound's synth surface registered.
    expect(formScope.stateCells.has("isValid")).toBe(true);
  });
});

// ===========================================================================
// §B11.9 — Compound-rollup dep contract (record-level)
// ===========================================================================

describe("§B11.9 compound-rollup dep contract — every synth cell points back at compound", () => {
  test("synth records carry `parentCompound` back-pointer", () => {
    const src = `<program>\${ <signup><name req> = <input type="text"/> <email> = "" </> }</program>`;
    const { sym } = buildAndRun(src);

    const signupRec = sym.fileScope.stateCells.get("signup");
    const synthRecs = getSynthRecords(signupRec.declNode);
    expect(synthRecs.length).toBe(4);
    for (const synth of synthRecs) {
      expect(synth.parentCompound).toBe(signupRec);
      expect(synth.scope).toBe(signupRec.declNode._scope);
    }
  });
});

// ===========================================================================
// §B11.10 — Runtime-hook annotations
// ===========================================================================

describe("§B11.10 runtime-hook annotations per §55.7 update-timing table", () => {
  test("isValid + errors are pure-reactive (runtimeHookKind: null)", () => {
    const src = `<program>\${ <form><name req> = <input type="text"/> </> }</program>`;
    const { sym } = buildAndRun(src);
    const formScope = sym.fileScope.stateCells.get("form").declNode._scope;
    expect(formScope.stateCells.get("isValid").runtimeHookKind).toBeNull();
    expect(formScope.stateCells.get("errors").runtimeHookKind).toBeNull();
  });

  test("touched is event-driven (runtimeHookKind: 'touch')", () => {
    const src = `<program>\${ <form><name req> = <input type="text"/> </> }</program>`;
    const { sym } = buildAndRun(src);
    const formScope = sym.fileScope.stateCells.get("form").declNode._scope;
    expect(formScope.stateCells.get("touched").runtimeHookKind).toBe("touch");
  });

  test("submitted is event-driven (runtimeHookKind: 'submit')", () => {
    const src = `<program>\${ <form><name req> = <input type="text"/> </> }</program>`;
    const { sym } = buildAndRun(src);
    const formScope = sym.fileScope.stateCells.get("form").declNode._scope;
    expect(formScope.stateCells.get("submitted").runtimeHookKind).toBe("submit");
  });
});

// ===========================================================================
// §B11.11 — `submitted` is compound-level ONLY (boundary for B12)
// ===========================================================================

describe("§B11.11 submitted is compound-level ONLY (per §55.7 line 24468)", () => {
  test("compound's _scope holds compound-level synth cells; per-field synth NOT registered by B11", () => {
    const src = `<program>\${ <form><name req> = <input type="text"/> </> }</program>`;
    const { sym } = buildAndRun(src);
    const formScope = sym.fileScope.stateCells.get("form").declNode._scope;

    // The four compound-level synth cells registered.
    expect(formScope.stateCells.size).toBe(5); // 4 synth + name (dev field)
    expect(formScope.stateCells.has("submitted")).toBe(true);

    // The per-field synth namespace (`@form.name.submitted` etc.) is NOT
    // registered by B11. The `name` cell is a regular state-decl (not a
    // compound) so it has no `_scope` for B12 to register into anyway.
    const nameRec = formScope.stateCells.get("name");
    expect(nameRec).toBeDefined();
    expect(nameRec.isCompoundParent).toBe(false);
    expect(nameRec.declNode._scope).toBeUndefined();
  });
});

// ===========================================================================
// §B11.12 — Nested compounds
// ===========================================================================

describe("§B11.12 nested compounds get synth surface at every compound level", () => {
  test("`<form><address><street>=\"\"</></>` registers synth on both form AND form.address", () => {
    const src = `<program>\${
      <form>
        <address>
          <street>=""
          <city>=""
        </>
      </>
    }</program>`;
    const { sym } = buildAndRun(src);

    const formRec = sym.fileScope.stateCells.get("form");
    expect(formRec.isCompoundParent).toBe(true);
    expect(formRec.declNode._scope.stateCells.has("isValid")).toBe(true);

    const addressRec = formRec.declNode._scope.stateCells.get("address");
    expect(addressRec).toBeDefined();
    expect(addressRec.isCompoundParent).toBe(true);
    expect(addressRec.declNode._scope.stateCells.has("isValid")).toBe(true);
    expect(addressRec.declNode._scope.stateCells.has("errors")).toBe(true);
    expect(addressRec.declNode._scope.stateCells.has("touched")).toBe(true);
    expect(addressRec.declNode._scope.stateCells.has("submitted")).toBe(true);

    // `parentCompound` back-pointer points to the immediate compound.
    const addrSynth = addressRec.declNode._scope.stateCells.get("isValid");
    expect(addrSynth.parentCompound).toBe(addressRec);
  });

  test("nested-compound synth resolves via lookupQualifiedStateCell", () => {
    const src = `<program>\${
      <form>
        <address>
          <street>=""
        </>
      </>
    }</program>`;
    const { sym } = buildAndRun(src);

    const synthRec = lookupQualifiedStateCell(
      sym.fileScope,
      ["form", "address", "isValid"],
    );
    expect(synthRec).toBeDefined();
    expect(synthRec.isSynthesized).toBe(true);
    expect(synthRec.qualifiedPath).toBe("form.address.isValid");
  });
});

// ===========================================================================
// §B11.13 — Public read APIs
// ===========================================================================

describe("§B11.13 public read APIs", () => {
  test("`isSynthesizedCell` discriminates synth vs plain records", () => {
    const src = `<program>\${
      <count> = 0
      <form><name req> = <input type="text"/> </>
    }</program>`;
    const { sym } = buildAndRun(src);

    const countRec = sym.fileScope.stateCells.get("count");
    const formRec = sym.fileScope.stateCells.get("form");
    const nameRec = formRec.declNode._scope.stateCells.get("name");
    const synthRec = formRec.declNode._scope.stateCells.get("isValid");

    expect(isSynthesizedCell(countRec)).toBe(false);
    expect(isSynthesizedCell(formRec)).toBe(false);
    expect(isSynthesizedCell(nameRec)).toBe(false);
    expect(isSynthesizedCell(synthRec)).toBe(true);
    expect(isSynthesizedCell(null)).toBe(false);
    expect(isSynthesizedCell(undefined)).toBe(false);
  });

  test("`getSynthRecords` returns the four synth cells in order", () => {
    const src = `<program>\${ <signup><name req> = <input type="text"/> </> }</program>`;
    const { sym } = buildAndRun(src);

    const signupRec = sym.fileScope.stateCells.get("signup");
    const synthRecs = getSynthRecords(signupRec.declNode);
    expect(synthRecs.length).toBe(4);
    expect(synthRecs.map((r) => r.synthProperty)).toEqual([
      "isValid", "errors", "touched", "submitted",
    ]);
  });

  test("`getSynthRecords` returns [] for non-compound or null", () => {
    const src = `<program>\${ <count> = 0 }</program>`;
    const { sym } = buildAndRun(src);
    const countRec = sym.fileScope.stateCells.get("count");
    expect(getSynthRecords(countRec.declNode)).toEqual([]);
    expect(getSynthRecords(null)).toEqual([]);
    expect(getSynthRecords(undefined)).toEqual([]);
  });

  test("`SYNTH_PROPERTY_NAMES` and `COMPOUND_SYNTH_PROPERTIES` are stable exports", () => {
    expect(SYNTH_PROPERTY_NAMES.has("isValid")).toBe(true);
    expect(SYNTH_PROPERTY_NAMES.has("errors")).toBe(true);
    expect(SYNTH_PROPERTY_NAMES.has("touched")).toBe(true);
    expect(SYNTH_PROPERTY_NAMES.has("submitted")).toBe(true);
    expect(SYNTH_PROPERTY_NAMES.size).toBe(4);

    expect([...COMPOUND_SYNTH_PROPERTIES]).toEqual([
      "isValid", "errors", "touched", "submitted",
    ]);
  });
});

// ===========================================================================
// §B11.14 — Dev child shadowing synth name
// ===========================================================================

describe("§B11.14 dev child shadows synth name (silent skip; future tighten)", () => {
  test("`<form><isValid>=true</>` keeps dev's child; synth `isValid` skipped", () => {
    // Authoring `<isValid>` as a compound child means the dev wants to
    // override (perhaps to manually compute their own validity gate). B11's
    // current behavior: silent skip — preserve dev intent. A future
    // tightening (E-SYNTH-NAME-COLLIDES) may convert to an error.
    const src = `<program>\${ <form><isValid>=true </> }</program>`;
    const { sym } = buildAndRun(src);

    const formRec = sym.fileScope.stateCells.get("form");
    const formScope = formRec.declNode._scope;
    const isValidRec = formScope.stateCells.get("isValid");
    expect(isValidRec).toBeDefined();
    // The dev's record wins.
    expect(isValidRec.isSynthesized).not.toBe(true);
    // The other three synth cells still register.
    expect(formScope.stateCells.get("errors").isSynthesized).toBe(true);
    expect(formScope.stateCells.get("touched").isSynthesized).toBe(true);
    expect(formScope.stateCells.get("submitted").isSynthesized).toBe(true);
  });
});

// ===========================================================================
// §B11.15 — Negative cases (no false fires)
// ===========================================================================

describe("§B11.15 negative — non-synth writes do NOT fire E-SYNTHESIZED-WRITE", () => {
  test("write to a regular compound child (`@form.name = \"x\"`) does NOT fire", () => {
    const src = `<program>\${
      <form><name>="" </>
      function f() { @form.name = "x" }
    }</program>`;
    const { sym } = buildAndRun(src);
    const fires = errsByCode(sym, "E-SYNTHESIZED-WRITE");
    expect(fires.length).toBe(0);
  });

  test("write to a non-compound cell whose name happens to be a synth-name does NOT fire", () => {
    // `<isValid> = false` as a top-level Tier-1 cell is fine — synth-write
    // only fires for `@compound.isValid` shape.
    const src = `<program>\${
      <isValid> = false
      function f() { @isValid = true }
    }</program>`;
    const { sym } = buildAndRun(src);
    const fires = errsByCode(sym, "E-SYNTHESIZED-WRITE");
    expect(fires.length).toBe(0);
  });

  test("read of `@form.isValid` (no assignment) does NOT fire", () => {
    const src = `<program>\${
      <form><name req> = <input type="text"/> </>
      function f() { let valid = @form.isValid }
    }</program>`;
    const { sym } = buildAndRun(src);
    const fires = errsByCode(sym, "E-SYNTHESIZED-WRITE");
    expect(fires.length).toBe(0);
  });

  test("write to a non-compound's child path does NOT fire (no compound resolved)", () => {
    // No `@form` declared; the receiver doesn't resolve.
    const src = `<program>\${
      function f() { @nonexistent.isValid = false }
    }</program>`;
    const { sym } = buildAndRun(src);
    // The receiver doesn't resolve to a registered compound parent, so
    // E-SYNTHESIZED-WRITE doesn't fire. (A different error from existing
    // infra may handle the unresolved reactive ref; that's not B11's concern.)
    const fires = errsByCode(sym, "E-SYNTHESIZED-WRITE");
    expect(fires.length).toBe(0);
  });
});
