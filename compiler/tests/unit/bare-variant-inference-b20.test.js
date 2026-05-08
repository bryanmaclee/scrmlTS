/* SPDX-License-Identifier: MIT
 * Phase A1b Step B20 — Bare-variant inference (§14.10, M9, E-VARIANT-AMBIGUOUS).
 *
 * Source-of-truth: SPEC §14.10 (line 7149-7183) — six inference positions +
 * E-VARIANT-AMBIGUOUS fire conditions. §34 catalog row at line 14233 (currently
 * §18.0.3-only; B20 surfaces this as a SPEC-PROSE follow-up).
 *
 * **What B20 SHIPS:**
 *   - Helper `inferBareVariantsInExpr` walks ExprNode trees and resolves bare-variant
 *     IdentExprs (`name: ".Variant"`) against an LHS-driven contextType.
 *   - Wired into:
 *       * `state-decl` case (position 1: `<x>: T = .V`).
 *       * `let-decl` / `const-decl` case (position 1b: `let x: T = .V`).
 *   - Fires `E-VARIANT-AMBIGUOUS` when:
 *       * No type context (no annotation): `<x> = .Small` / `let x = .Small`.
 *       * Position type is a UNION with multiple enum members declaring the
 *         same variant name (`MarioState | HealthRisk` both have `.Small`).
 *       * Position type is `asIs` / `unknown` / non-enum / non-union.
 *   - Fires `E-TYPE-063` when:
 *       * Variant exists in the position's enum context but is NOT declared in
 *         that enum (typo / unknown).
 *       * Variant is not declared in any enum member of a position-type union.
 *
 * **OUT OF SCOPE for B20** (per BRIEF):
 *   - §18.0.3 match-arm pattern bare-variants (handled by exhaustiveness today;
 *     ambiguity check in arm patterns deferred).
 *   - Engine `initial=.Variant` (§51.0.B / position 6) — B14/B15 already cover.
 *   - Function param type (position 3) — requires FunctionType.params upgrade.
 *   - Function return type (position 4) — requires return-type capture.
 *   - Compound-nav `@compound.field = .V` — depends on compound-nav typing.
 *
 * Spec authority:
 *   §14.10 — Bare-variant inference (M9), normative statements + six positions.
 *   §34    — error catalog (row at line 14233 — E-VARIANT-AMBIGUOUS).
 */

import { describe, test, expect } from "bun:test";
import { runTS } from "../../src/type-system.ts";
import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Compile a scrml source string up to TS and return the diagnostics.
 * Mirrors the B22 / B19 / B18 test scaffolding (block-splitter → buildAST → runTS).
 */
function compile(source, filePath = "/test/app.scrml") {
  const bs = splitBlocks(filePath, source);
  const { ast } = buildAST(bs);
  // runTS expects a FileAST. Build a minimal one with empty maps.
  const fileAST = {
    filePath,
    source,
    nodes: ast.nodes ?? [],
    machineDecls: ast.machineDecls ?? [],
    typeDecls: ast.typeDecls ?? [],
    components: ast.components ?? [],
    imports: ast.imports ?? [],
    exports: ast.exports ?? [],
    ast,
  };
  const result = runTS({
    files: [fileAST],
    protectAnalysis: { views: new Map() },
    routeMap: { functions: new Map() },
  });
  return { ast, errors: result.errors };
}

function errsByCode(errors, code) {
  return (errors ?? []).filter((e) => e?.code === code);
}

// ===========================================================================
// §B20.1 — POSITIVE: Position 1 (state-decl LHS annotation) — bare variant resolves
// ===========================================================================

describe("§B20.1 positive — state-decl `<x>: T = .V` resolves bare variant", () => {
  test("§B20.1.1 enum LHS — bare variant matches a declared variant", () => {
    const src = `<program>\${
      type MarioState:enum = { Small, Big, Fire, Cape }
      <state>: MarioState = .Small
    }</program>`;
    const { errors } = compile(src);
    expect(errsByCode(errors, "E-VARIANT-AMBIGUOUS").length).toBe(0);
    expect(errsByCode(errors, "E-TYPE-063").length).toBe(0);
  });

  test("§B20.1.2 enum LHS — every declared variant resolves cleanly", () => {
    // Run separately for each variant — combining them in one decl would
    // reuse the same name and conflict.
    for (const v of ["Small", "Big", "Fire", "Cape"]) {
      const src = `<program>\${
        type MarioState:enum = { Small, Big, Fire, Cape }
        <state>: MarioState = .${v}
      }</program>`;
      const { errors } = compile(src);
      expect(errsByCode(errors, "E-VARIANT-AMBIGUOUS").length).toBe(0);
      expect(errsByCode(errors, "E-TYPE-063").length).toBe(0);
    }
  });
});

// ===========================================================================
// §B20.2 — NEGATIVE: Position 1 — bare variant unknown to enum
// ===========================================================================

describe("§B20.2 negative — `.UnknownVariant` fires E-TYPE-063", () => {
  test("§B20.2.1 unknown variant → E-TYPE-063 with known list", () => {
    const src = `<program>\${
      type MarioState:enum = { Small, Big, Fire, Cape }
      <state>: MarioState = .Tanooki
    }</program>`;
    const { errors } = compile(src);
    const e063 = errsByCode(errors, "E-TYPE-063");
    expect(e063.length).toBeGreaterThanOrEqual(1);
    expect(e063[0].message).toMatch(/\.Tanooki/);
    expect(e063[0].message).toMatch(/MarioState/);
  });

  test("§B20.2.2 unknown variant → silent on E-VARIANT-AMBIGUOUS (different code)", () => {
    const src = `<program>\${
      type MarioState:enum = { Small, Big }
      <state>: MarioState = .Bogus
    }</program>`;
    const { errors } = compile(src);
    expect(errsByCode(errors, "E-VARIANT-AMBIGUOUS").length).toBe(0);
  });
});

// ===========================================================================
// §B20.3 — NEGATIVE: Position 1 — no annotation = no type context
// ===========================================================================

describe("§B20.3 negative — `<x> = .V` (no annotation) fires E-VARIANT-AMBIGUOUS", () => {
  test("§B20.3.1 state-decl without annotation, bare variant → E-VARIANT-AMBIGUOUS", () => {
    const src = `<program>\${
      type MarioState:enum = { Small, Big }
      <state> = .Small
    }</program>`;
    const { errors } = compile(src);
    const e = errsByCode(errors, "E-VARIANT-AMBIGUOUS");
    expect(e.length).toBeGreaterThanOrEqual(1);
    expect(e[0].message).toMatch(/\.Small/);
    expect(e[0].message).toMatch(/no.*type context|no resolvable/);
  });
});

// ===========================================================================
// §B20.4 — POSITIVE: Position 1b (let/const-decl LHS annotation) — resolves
// ===========================================================================

describe("§B20.4 positive — `let x: T = .V` resolves bare variant", () => {
  test("§B20.4.1 let-decl with enum annotation — bare variant clean", () => {
    const src = `<program>\${
      type Phase:enum = { Idle, Loading, Done }
      let p: Phase = .Idle
    }</program>`;
    const { errors } = compile(src);
    expect(errsByCode(errors, "E-VARIANT-AMBIGUOUS").length).toBe(0);
    expect(errsByCode(errors, "E-TYPE-063").length).toBe(0);
  });

  test("§B20.4.2 const-decl with enum annotation — bare variant clean", () => {
    const src = `<program>\${
      type Phase:enum = { Idle, Loading, Done }
      const p: Phase = .Loading
    }</program>`;
    const { errors } = compile(src);
    expect(errsByCode(errors, "E-VARIANT-AMBIGUOUS").length).toBe(0);
    expect(errsByCode(errors, "E-TYPE-063").length).toBe(0);
  });
});

// ===========================================================================
// §B20.5 — NEGATIVE: Position 1b — let with bare variant + unknown
// ===========================================================================

describe("§B20.5 negative — let with annotation, `.Bogus` fires E-TYPE-063", () => {
  test("§B20.5.1 unknown variant in known enum → E-TYPE-063", () => {
    const src = `<program>\${
      type Phase:enum = { Idle, Loading }
      let p: Phase = .Done
    }</program>`;
    const { errors } = compile(src);
    const e063 = errsByCode(errors, "E-TYPE-063");
    expect(e063.length).toBeGreaterThanOrEqual(1);
    expect(e063[0].message).toMatch(/\.Done/);
  });
});

// ===========================================================================
// §B20.6 — NEGATIVE: Position 1b — let without annotation = no context
// ===========================================================================

describe("§B20.6 negative — `let x = .V` (no annotation) fires E-VARIANT-AMBIGUOUS", () => {
  test("§B20.6.1 let-decl without annotation → E-VARIANT-AMBIGUOUS", () => {
    const src = `<program>\${
      type MarioState:enum = { Small, Big }
      let x = .Small
    }</program>`;
    const { errors } = compile(src);
    const e = errsByCode(errors, "E-VARIANT-AMBIGUOUS");
    expect(e.length).toBeGreaterThanOrEqual(1);
    expect(e[0].message).toMatch(/\.Small/);
  });

  test("§B20.6.2 const-decl without annotation → E-VARIANT-AMBIGUOUS", () => {
    const src = `<program>\${
      type MarioState:enum = { Small, Big }
      const x = .Big
    }</program>`;
    const { errors } = compile(src);
    expect(errsByCode(errors, "E-VARIANT-AMBIGUOUS").length).toBeGreaterThanOrEqual(1);
  });
});

// ===========================================================================
// §B20.7 — NEGATIVE: union with shared variant name — E-VARIANT-AMBIGUOUS
// ===========================================================================

describe("§B20.7 negative — union with shared variant fires E-VARIANT-AMBIGUOUS", () => {
  test("§B20.7.1 union of two enums sharing `.Small` → E-VARIANT-AMBIGUOUS", () => {
    const src = `<program>\${
      type MarioState:enum = { Small, Big, Fire }
      type HealthRisk:enum = { Small, Critical }
      let v: MarioState | HealthRisk = .Small
    }</program>`;
    const { errors } = compile(src);
    const e = errsByCode(errors, "E-VARIANT-AMBIGUOUS");
    expect(e.length).toBeGreaterThanOrEqual(1);
    expect(e[0].message).toMatch(/\.Small/);
    expect(e[0].message).toMatch(/MarioState/);
    expect(e[0].message).toMatch(/HealthRisk/);
  });

  test("§B20.7.2 union with unique variant resolves cleanly (only one declarer)", () => {
    const src = `<program>\${
      type MarioState:enum = { Small, Big, Fire }
      type HealthRisk:enum = { Critical }
      let v: MarioState | HealthRisk = .Big
    }</program>`;
    const { errors } = compile(src);
    expect(errsByCode(errors, "E-VARIANT-AMBIGUOUS").length).toBe(0);
    expect(errsByCode(errors, "E-TYPE-063").length).toBe(0);
  });

  test("§B20.7.3 union with no declarer fires E-TYPE-063 listing all enum names", () => {
    const src = `<program>\${
      type MarioState:enum = { Small, Big }
      type HealthRisk:enum = { Critical }
      let v: MarioState | HealthRisk = .Bogus
    }</program>`;
    const { errors } = compile(src);
    const e063 = errsByCode(errors, "E-TYPE-063");
    expect(e063.length).toBeGreaterThanOrEqual(1);
    expect(e063[0].message).toMatch(/\.Bogus/);
  });
});

// ===========================================================================
// §B20.8 — POSITIVE: bare variant in non-leaf positions (ternary, array, call arg)
// ===========================================================================

describe("§B20.8 positive — bare variant resolves in nested expressions", () => {
  test("§B20.8.1 ternary branch — bare variants resolve from LHS context", () => {
    const src = `<program>\${
      type Phase:enum = { Idle, Loading, Done }
      <state>: Phase = (1 > 0) ? .Idle : .Loading
    }</program>`;
    const { errors } = compile(src);
    expect(errsByCode(errors, "E-VARIANT-AMBIGUOUS").length).toBe(0);
    expect(errsByCode(errors, "E-TYPE-063").length).toBe(0);
  });

  test("§B20.8.2 ternary with one unknown variant → E-TYPE-063 only", () => {
    const src = `<program>\${
      type Phase:enum = { Idle, Loading, Done }
      <state>: Phase = (1 > 0) ? .Idle : .Bogus
    }</program>`;
    const { errors } = compile(src);
    const e063 = errsByCode(errors, "E-TYPE-063");
    expect(e063.length).toBeGreaterThanOrEqual(1);
    expect(e063[0].message).toMatch(/\.Bogus/);
  });
});

// ===========================================================================
// §B20.9 — NEGATIVE: position type is non-enum primitive — fires
// ===========================================================================

describe("§B20.9 negative — non-enum context fires E-VARIANT-AMBIGUOUS", () => {
  test("§B20.9.1 `let x: number = .Small` (impossible) → E-VARIANT-AMBIGUOUS", () => {
    const src = `<program>\${
      let x: number = .Small
    }</program>`;
    const { errors } = compile(src);
    // The non-enum context branch fires E-VARIANT-AMBIGUOUS per the helper's
    // last-resort fallback (per §14.10 line 7174's wording).
    expect(errsByCode(errors, "E-VARIANT-AMBIGUOUS").length).toBeGreaterThanOrEqual(1);
  });
});

// ===========================================================================
// §B20.10 — POSITIVE: fully-qualified form remains legal (no false fire)
// ===========================================================================

describe("§B20.10 positive — fully-qualified `T.Variant` does not fire", () => {
  test("§B20.10.1 `MarioState.Small` form (no leading dot) — no fire", () => {
    // Note: this form parses as MemberExpr(Ident("MarioState"), "Small")
    // which is NOT a bare-variant IdentExpr, so the helper is silent on it.
    const src = `<program>\${
      type MarioState:enum = { Small, Big }
      <state>: MarioState = MarioState.Small
    }</program>`;
    const { errors } = compile(src);
    expect(errsByCode(errors, "E-VARIANT-AMBIGUOUS").length).toBe(0);
  });
});

// ===========================================================================
// §B20.11 — POSITIVE: regression — no spurious fires on plain idents starting `.`
//
// The helper's regex `^[A-Z][A-Za-z0-9_]*$` on the post-dot tail ensures we
// only fire on properly-cased variant names. Defensive coverage.
// ===========================================================================

describe("§B20.11 regression — non-bare-variant idents are skipped", () => {
  test("§B20.11.1 reactive ref `@cell` (no leading dot) is silent", () => {
    const src = `<program>\${
      type Phase:enum = { Idle }
      <state>: Phase = .Idle
      <other>: Phase = @state
    }</program>`;
    const { errors } = compile(src);
    expect(errsByCode(errors, "E-VARIANT-AMBIGUOUS").length).toBe(0);
  });

  test("§B20.11.2 numeric literal in init is silent", () => {
    const src = `<program>\${
      let x: number = 42
    }</program>`;
    const { errors } = compile(src);
    expect(errsByCode(errors, "E-VARIANT-AMBIGUOUS").length).toBe(0);
  });
});

// ===========================================================================
// §B20.12 — Engine `initial=` (position 6) regression — B15 still owns this
// ===========================================================================

describe("§B20.12 regression — engine `initial=.V` (B15 territory) unchanged", () => {
  test("§B20.12.1 engine with valid initial= variant — no B20 fires", () => {
    const src = `<program>\${
      type MarioState:enum = { Small, Big }
      <engine for=MarioState initial=.Small>
        <Small></>
        <Big></>
      </>
    }</program>`;
    const { errors } = compile(src);
    // B20 does not interfere with engine attributes — its scope is state-decl
    // and let/const-decl init expressions only.
    expect(errsByCode(errors, "E-VARIANT-AMBIGUOUS").length).toBe(0);
  });
});
