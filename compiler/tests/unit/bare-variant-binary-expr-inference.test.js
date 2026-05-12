/* SPDX-License-Identifier: MIT
 * S84 v0.2.4 #5 — bare-variant inference at binary-expression comparison
 * positions (§14.10 implicit seventh inference position; companion to
 * B20 §14.10 LHS-declared positions and Bug 7 §14.10 position #2
 * reassignment).
 *
 * Source-of-truth:
 *   - SPEC §14.10 line 7291 — "any other position where the type is fixed by
 *     the surrounding declaration" (the implicit seventh position; the
 *     enumerated six are positions 1-6).
 *   - SPEC §45.5 — `==` (value equality) vs `is` (variant tag check). Both
 *     fix the variant context from the cell's enum type; both should
 *     resolve bare variants at the comparison position.
 *   - SPEC §34 — E-VARIANT-AMBIGUOUS catalog row.
 *
 * **What this dispatch ships:**
 *   - Helper `inferBareVariantsAtComparisonSites` (type-system.ts) walks the
 *     ExprNode tree node-aware (not flat forEachIdentInExprNode). At every
 *     `binary { op ∈ {==, !=, is, is-not}, left, right }` node, if one
 *     operand resolves via the scopeChain to a reactive cell with enum or
 *     union resolvedType AND the other operand is a bare-variant ident, it
 *     resolves the variant against the cell's enum type and stamps a
 *     non-enumerable `_bareVariantInferredAtBinaryExpr` flag on the resolved
 *     ident.
 *   - `inferBareVariantsInExpr` skips flagged idents — the LHS-driven
 *     no-context branch no longer fires E-VARIANT-AMBIGUOUS on idents the
 *     pre-pass already settled.
 *   - Wire-in points:
 *       * let-decl / const-decl init (line ~4378)
 *       * bare-expr root (line ~4677)
 *
 * **OUT OF SCOPE for this dispatch** (per brief):
 *   - Ordered comparisons `<`/`>`/`<=`/`>=` — enums carry no order relation
 *     per current spec.
 *   - if-stmt / while-stmt conditions, return-stmt, function-call arg
 *     positions — these positions do not currently invoke the bare-variant
 *     inference walker at all. Wiring inference there is a separate
 *     enhancement and would surface fresh diagnostic behavior unrelated to
 *     the reported bug.
 *
 * Spec disposition: the rule is implicit in §14.10 line 7291 + §45.5. No
 * spec amendment proposed; flagged for PA review.
 */

import { describe, test, expect } from "bun:test";
import { runTS } from "../../src/type-system.ts";
import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";

// ---------------------------------------------------------------------------
// Helpers — mirror bare-variant-inference-b20.test.js scaffolding
// ---------------------------------------------------------------------------

function compile(source, filePath = "/test/app.scrml") {
  const bs = splitBlocks(filePath, source);
  const { ast } = buildAST(bs);
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
// §1 — `@cell == .V` (positive): bare variant resolves vs cell enum type
//
// Acceptance criterion 1 from brief.
// ===========================================================================

describe("§1 positive — `@cell == .V` with engine-declared cell", () => {
  test("§1.1 engine for=Phase, bare comparison in function body — no fire", () => {
    // Mirror brief's repro exactly. Engine auto-declares @phase: Phase.
    const src = `<program>\${
      type Phase:enum = { Idle, Loading, Ready }
    }
    <engine for=Phase initial=.Idle>
      <Idle    rule=.Loading></>
      <Loading rule=.Ready></>
      <Ready   rule=.Idle></>
    </>
    \${
      function isLoading() {
        let result = @phase == .Loading
        return result
      }
    }</program>`;
    const { errors } = compile(src);
    expect(errsByCode(errors, "E-VARIANT-AMBIGUOUS").length).toBe(0);
    expect(errsByCode(errors, "E-TYPE-063").length).toBe(0);
  });

  test("§1.2 explicit state-decl with enum annotation, == in function body — no fire", () => {
    const src = `<program>\${
      type Phase:enum = { Idle, Loading, Ready }
      <phase>: Phase = .Idle
      function isLoading() {
        let result = @phase == .Loading
        return result
      }
    }</program>`;
    const { errors } = compile(src);
    expect(errsByCode(errors, "E-VARIANT-AMBIGUOUS").length).toBe(0);
    expect(errsByCode(errors, "E-TYPE-063").length).toBe(0);
  });

  test("§1.3 every declared variant resolves cleanly via ==", () => {
    for (const v of ["Idle", "Loading", "Ready"]) {
      const src = `<program>\${
        type Phase:enum = { Idle, Loading, Ready }
        <phase>: Phase = .Idle
        function check() {
          let result = @phase == .${v}
          return result
        }
      }</program>`;
      const { errors } = compile(src);
      expect(errsByCode(errors, "E-VARIANT-AMBIGUOUS").length).toBe(0);
      expect(errsByCode(errors, "E-TYPE-063").length).toBe(0);
    }
  });
});

// ===========================================================================
// §2 — `.V == @cell` (symmetric): operand order does not matter
// ===========================================================================

describe("§2 symmetric — `.V == @cell` resolves identically", () => {
  test("§2.1 `.Loading == @phase` — bare variant on LHS — no fire", () => {
    const src = `<program>\${
      type Phase:enum = { Idle, Loading, Ready }
      <phase>: Phase = .Idle
      function check() {
        let result = .Loading == @phase
        return result
      }
    }</program>`;
    const { errors } = compile(src);
    expect(errsByCode(errors, "E-VARIANT-AMBIGUOUS").length).toBe(0);
    expect(errsByCode(errors, "E-TYPE-063").length).toBe(0);
  });
});

// ===========================================================================
// §3 — `@cell != .V` (inequality): same context-fix rule applies
// ===========================================================================

describe("§3 inequality — `@cell != .V` resolves like ==", () => {
  test("§3.1 `@phase != .Loading` — no fire", () => {
    const src = `<program>\${
      type Phase:enum = { Idle, Loading, Ready }
      <phase>: Phase = .Idle
      function notLoading() {
        let result = @phase != .Loading
        return result
      }
    }</program>`;
    const { errors } = compile(src);
    expect(errsByCode(errors, "E-VARIANT-AMBIGUOUS").length).toBe(0);
    expect(errsByCode(errors, "E-TYPE-063").length).toBe(0);
  });

  test("§3.2 `.Loading != @phase` — symmetric inequality — no fire", () => {
    const src = `<program>\${
      type Phase:enum = { Idle, Loading, Ready }
      <phase>: Phase = .Idle
      function notLoading() {
        let result = .Loading != @phase
        return result
      }
    }</program>`;
    const { errors } = compile(src);
    expect(errsByCode(errors, "E-VARIANT-AMBIGUOUS").length).toBe(0);
    expect(errsByCode(errors, "E-TYPE-063").length).toBe(0);
  });
});

// ===========================================================================
// §4 — Non-engine path: explicit `<phase>: Phase = .Idle` state-decl
//
// Confirms the fix is not engine-specific — the cell-type resolution path
// flows through the same scopeChain.lookup as the Bug 7 helper, so a
// hand-rolled state-decl with an enum annotation must work identically.
// ===========================================================================

describe("§4 explicit state-decl path (non-engine) — same behavior", () => {
  test("§4.1 hand-rolled enum-typed cell with == comparison — no fire", () => {
    const src = `<program>\${
      type Phase:enum = { Idle, Loading, Ready }
      <phase>: Phase = .Idle
      function check() {
        let result = @phase == .Idle
        return result
      }
    }</program>`;
    const { errors } = compile(src);
    expect(errsByCode(errors, "E-VARIANT-AMBIGUOUS").length).toBe(0);
    expect(errsByCode(errors, "E-TYPE-063").length).toBe(0);
  });
});

// ===========================================================================
// §5 — Negative: unknown variant on enum-typed cell fires E-TYPE-063
//
// Sanity check that the pre-pass still emits the right diagnostic when the
// bare variant is not declared in the cell's enum. The diagnostic comes
// from the same code path as inferBareVariantsInExpr's E-TYPE-063 branch.
// ===========================================================================

describe("§5 negative — unknown variant in `==` fires E-TYPE-063", () => {
  test("§5.1 `@phase == .Bogus` — fires E-TYPE-063 with known variants", () => {
    const src = `<program>\${
      type Phase:enum = { Idle, Loading, Ready }
      <phase>: Phase = .Idle
      function check() {
        let result = @phase == .Bogus
        return result
      }
    }</program>`;
    const { errors } = compile(src);
    const e063 = errsByCode(errors, "E-TYPE-063");
    expect(e063.length).toBeGreaterThanOrEqual(1);
    expect(e063[0].message).toMatch(/\.Bogus/);
    expect(e063[0].message).toMatch(/Phase/);
    // E-VARIANT-AMBIGUOUS must NOT also fire — the pre-pass settles the
    // ident with E-TYPE-063 and stamps the skip-flag, suppressing the
    // upstream no-context diagnostic for the same node.
    expect(errsByCode(errors, "E-VARIANT-AMBIGUOUS").length).toBe(0);
  });
});

// ===========================================================================
// §6 — Negative: union-typed cell with ambiguous shared variant still fires
//
// The brief calls this out as a regression gate: ambiguous unions must
// continue to fire E-VARIANT-AMBIGUOUS even after the comparison-site fix.
// ===========================================================================

describe("§6 negative — union-typed cell, shared variant — E-VARIANT-AMBIGUOUS", () => {
  test("§6.1 union with two enums sharing `.Small` — `==` fires E-VARIANT-AMBIGUOUS", () => {
    const src = `<program>\${
      type MarioState:enum = { Small, Big, Fire }
      type HealthRisk:enum = { Small, Critical }
      <picker>: MarioState | HealthRisk = MarioState.Big
      function check() {
        let result = @picker == .Small
        return result
      }
    }</program>`;
    const { errors } = compile(src);
    const e = errsByCode(errors, "E-VARIANT-AMBIGUOUS");
    expect(e.length).toBeGreaterThanOrEqual(1);
    expect(e[0].message).toMatch(/\.Small/);
    // Diagnostic should name BOTH declaring enums.
    expect(e[0].message).toMatch(/MarioState/);
    expect(e[0].message).toMatch(/HealthRisk/);
  });

  test("§6.2 union with two enums, variant unique to ONE — `==` resolves cleanly", () => {
    const src = `<program>\${
      type MarioState:enum = { Small, Big, Fire }
      type HealthRisk:enum = { Critical }
      <picker>: MarioState | HealthRisk = MarioState.Big
      function check() {
        let result = @picker == .Critical
        return result
      }
    }</program>`;
    const { errors } = compile(src);
    expect(errsByCode(errors, "E-VARIANT-AMBIGUOUS").length).toBe(0);
    expect(errsByCode(errors, "E-TYPE-063").length).toBe(0);
  });
});

// ===========================================================================
// §7 — Negative: non-enum cell type — pre-pass silently falls through
//
// `@count: number == .Small` — the LHS is a number cell, RHS is a bare
// variant. The pre-pass should NOT settle this ident (number is not enum).
// The let-decl visitor's normal no-context branch then fires
// E-VARIANT-AMBIGUOUS on `.Small`. Type mismatch (`number == enum-variant`)
// is owned by a separate diagnostic path (E-EQ-001 or similar) — this test
// asserts only the bare-variant inference contract, not the cross-type-
// comparison diagnostic.
// ===========================================================================

describe("§7 negative — non-enum cell — fall-through to E-VARIANT-AMBIGUOUS", () => {
  test("§7.1 `@count == .Small` where @count: number — variant ambiguity preserved", () => {
    const src = `<program>\${
      <count>: number = 0
      function check() {
        let result = @count == .Small
        return result
      }
    }</program>`;
    const { errors } = compile(src);
    // Because @count is non-enum, the pre-pass does not stamp the flag.
    // The let-decl's no-annotation branch then fires its
    // no-type-context E-VARIANT-AMBIGUOUS on `.Small`. This is the
    // expected fall-through behavior.
    const ambiguous = errsByCode(errors, "E-VARIANT-AMBIGUOUS");
    expect(ambiguous.length).toBeGreaterThanOrEqual(1);
    expect(ambiguous[0].message).toMatch(/\.Small/);
  });
});

// ===========================================================================
// §8 — Function-body context: confirms the resolver chain reaches the cell
//
// Acceptance criterion 7 from brief. The cell is declared at file scope;
// the comparison happens inside a function body. The scopeChain at the
// let-decl visit must still see `@phase` bound (declared at the outer
// program scope; function-decl pushes a child scope that inherits).
// ===========================================================================

describe("§8 function-body context — outer-scope cell visible to inner let", () => {
  test("§8.1 cell in file scope, comparison in nested function body — no fire", () => {
    const src = `<program>\${
      type Phase:enum = { Idle, Loading, Ready }
      <phase>: Phase = .Idle
      function outer() {
        function inner() {
          let result = @phase == .Loading
          return result
        }
        return inner()
      }
    }</program>`;
    const { errors } = compile(src);
    expect(errsByCode(errors, "E-VARIANT-AMBIGUOUS").length).toBe(0);
    expect(errsByCode(errors, "E-TYPE-063").length).toBe(0);
  });
});

// ===========================================================================
// §9 — Bare-expr context (companion to let-decl wire-in)
//
// A free-standing `@phase == .Loading` (not in a let-decl) lands in the
// bare-expr visitor. The same pre-pass fires from that site.
// ===========================================================================

describe("§9 bare-expr context — comparison-site pre-pass wired in", () => {
  test("§9.1 free-standing comparison expression — no fire", () => {
    // A bare-expr that's a pure comparison is unusual scrml (the result is
    // discarded), but the AST shape is valid and the pre-pass must still
    // settle the bare variant rather than fire E-VARIANT-AMBIGUOUS.
    const src = `<program>\${
      type Phase:enum = { Idle, Loading, Ready }
      <phase>: Phase = .Idle
      function check() {
        @phase == .Loading
      }
    }</program>`;
    const { errors } = compile(src);
    expect(errsByCode(errors, "E-VARIANT-AMBIGUOUS").length).toBe(0);
    expect(errsByCode(errors, "E-TYPE-063").length).toBe(0);
  });
});

// ===========================================================================
// §10 — Backward compat: qualified form continues to pass
// ===========================================================================

describe("§10 backward-compat — qualified `==` still passes", () => {
  test("§10.1 `@phase == Phase.Loading` — no fire (already-qualified)", () => {
    const src = `<program>\${
      type Phase:enum = { Idle, Loading, Ready }
      <phase>: Phase = .Idle
      function check() {
        let result = @phase == Phase.Loading
        return result
      }
    }</program>`;
    const { errors } = compile(src);
    expect(errsByCode(errors, "E-VARIANT-AMBIGUOUS").length).toBe(0);
    expect(errsByCode(errors, "E-TYPE-063").length).toBe(0);
  });
});

// ===========================================================================
// §11 — Idempotency: pre-pass + LHS-walker do not double-fire
//
// Regression gate. With the skip-flag wired, an ident resolved by the
// pre-pass must not be re-processed by inferBareVariantsInExpr. A double-
// fire would surface as 2x E-TYPE-063 on an unknown variant, or
// E-TYPE-063 + E-VARIANT-AMBIGUOUS on the same ident.
// ===========================================================================

describe("§11 idempotency — pre-pass + LHS walker share no diagnostic", () => {
  test("§11.1 unknown variant — E-TYPE-063 fires EXACTLY once (no double-fire)", () => {
    const src = `<program>\${
      type Phase:enum = { Idle, Loading, Ready }
      <phase>: Phase = .Idle
      function check() {
        let result = @phase == .Bogus
        return result
      }
    }</program>`;
    const { errors } = compile(src);
    const e063 = errsByCode(errors, "E-TYPE-063");
    expect(e063.length).toBe(1);
  });
});

// ===========================================================================
// §12 — Brief acceptance: mario-style fixture
//
// "A scrml snippet `let isSmall = @marioState == .Small` (using 14-mario's
// @marioState engine cell) compiles cleanly." — brief Acceptance, last bullet.
//
// The 14-mario sample's exact engine declaration is canonical scrml
// vocabulary; we synthesize the equivalent shape inline.
// ===========================================================================

describe("§12 mario-style acceptance fixture", () => {
  test("§12.1 `let isSmall = @marioState == .Small` — compiles cleanly", () => {
    const src = `<program>\${
      type MarioState:enum = { Small, Big, Fire, Cape }
    }
    <engine for=MarioState initial=.Small>
      <Small rule=.Big></>
      <Big rule=.Fire></>
      <Fire rule=.Cape></>
      <Cape rule=.Small></>
    </>
    \${
      function check() {
        let isSmall = @marioState == .Small
        return isSmall
      }
    }</program>`;
    const { errors } = compile(src);
    expect(errsByCode(errors, "E-VARIANT-AMBIGUOUS").length).toBe(0);
    expect(errsByCode(errors, "E-TYPE-063").length).toBe(0);
  });
});
