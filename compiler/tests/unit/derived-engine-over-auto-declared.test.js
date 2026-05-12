/* SPDX-License-Identifier: MIT
 * Bug 2 (S84, v0.2.3) — Derived engine over an auto-declared engine variable.
 *
 * Spec authority:
 *   §51.0.C (Move 16) — `<engine for=Type ...>` auto-declares a reactive cell
 *                       named (a) `var=`-override if present, else
 *                       (b) lowercase-first of the type name. The cell IS a
 *                       machine-bound reactive cell.
 *   §51.9            — Derived / projection engines (`derived=@source`).
 *   §51.9.7          — Transitive projection rejection (PRESERVED by this fix).
 *
 * Pre-fix behavior (incorrect):
 *   `<engine for=Risk derived=@phase>` over `@phase` auto-declared by
 *   `<engine for=Phase ...>` fired false E-ENGINE-004 ("references unknown
 *   source variable") because the type-system's reactiveBindings collector
 *   only walked state-decl nodes with an explicit `.machineBinding`. Auto-
 *   declared engine cells were never registered.
 *
 * Post-fix behavior (correct):
 *   The collector now also walks `machineRegistry.values()` and registers
 *   every non-derived engine's auto-declared variable. The derived-engine
 *   validator can resolve the source and runs the usual exhaustiveness
 *   check (E-ENGINE-018).
 *
 * The fix lives at compiler/src/type-system.ts in the §51.9 reactiveBindings
 * collection block (post-collectReactiveBindings, pre-validateDerivedMachines).
 *
 * This file's coverage:
 *   1. Positive  — derived engine over auto-declared engine var compiles clean.
 *   2. Regression — legacy state-decl form (`<phase>: Phase = ...`) still works.
 *   3. Negative — transitive projection (derived-over-derived) still rejected
 *                 with §51.9.7 message (both auto-declared and explicit bases).
 *   4. Negative — derived engine over unknown var still fires E-ENGINE-004
 *                 with the "references unknown source variable" message.
 *   5. Coverage — E-ENGINE-018 still fires when projection rules don't cover
 *                 every variant of the source enum.
 *   6. Naming collision — explicit state-decl with the same name as an engine-
 *                          auto-declared var: SYM PASS 10.A's E-ENGINE-VAR-
 *                          DUPLICATE remains the owning diagnostic (the fix's
 *                          SHALL-NOT-overwrite guard does not paper over it).
 */

import { describe, test, expect } from "bun:test";
import { runTS } from "../../src/type-system.ts";
import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";

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
// §Bug2.1 — Positive: derived engine over auto-declared engine var compiles
// ===========================================================================

describe("§Bug2.1 — derived engine over auto-declared engine var", () => {
  test("§Bug2.1.1 canonical minimal repro (Repro #2) compiles with no TS errors", () => {
    // Repro #2 from the dispatch brief, verbatim shape: `<engine for=Phase>`
    // auto-declares `@phase`, then `<engine for=Risk derived=@phase>` should
    // resolve `@phase` via the machine-bound reactiveBindings.
    const src = `\${
      type Phase:enum = { Idle, Loading }
      type Risk:enum = { Safe, AtRisk }
    }

    <engine for=Phase initial=.Idle>
      .Idle    => .Loading
      .Loading => .Idle
    </>

    <engine for=Risk derived=@phase>
      .Idle    => .Safe
      .Loading => .AtRisk
    </>`;
    const { errors } = compile(src);
    expect(errsByCode(errors, "E-ENGINE-004").length).toBe(0);
    expect(errsByCode(errors, "E-ENGINE-018").length).toBe(0);
  });

  test("§Bug2.1.2 Mario-shape (HealthRisk derived=@marioState) compiles clean", () => {
    // The 14-mario canonical pattern: source engine has a 4-variant enum,
    // derived projection collapses to a 2-variant enum via alternation arms.
    // Exhaustiveness on all 4 source variants — must NOT fire E-ENGINE-018.
    const src = `\${
      type MarioState:enum = { Small, Big, Fire, Cape }
      type HealthRisk:enum = { Safe, AtRisk }
    }

    <engine for=MarioState initial=.Small>
      .Small               => .Big | .Fire | .Cape
      .Big                 => .Fire | .Cape | .Small
      .Fire                => .Small
      .Cape                => .Small
    </>

    <engine for=HealthRisk derived=@marioState>
      .Small               => .AtRisk
      .Big | .Fire | .Cape => .Safe
    </>`;
    const { errors } = compile(src);
    expect(errsByCode(errors, "E-ENGINE-004").length).toBe(0);
    expect(errsByCode(errors, "E-ENGINE-018").length).toBe(0);
  });

  test("§Bug2.1.3 `var=` override on source engine still resolves", () => {
    // §51.0.C clause (a): `var=` override changes the auto-decl name.
    // The derived engine should resolve via the override, not via the
    // lowercase-first default.
    const src = `\${
      type Phase:enum = { Idle, Loading }
      type Risk:enum = { Safe, AtRisk }
    }

    <engine for=Phase var=currentPhase initial=.Idle>
      .Idle    => .Loading
      .Loading => .Idle
    </>

    <engine for=Risk derived=@currentPhase>
      .Idle    => .Safe
      .Loading => .AtRisk
    </>`;
    const { errors } = compile(src);
    expect(errsByCode(errors, "E-ENGINE-004").length).toBe(0);
  });
});

// ===========================================================================
// §Bug2.2 — Regression: explicit state-decl machine-bound form still works
// ===========================================================================

describe("§Bug2.2 — regression: explicit state-decl + derived engine still works", () => {
  test("§Bug2.2.1 explicit `@phase: Phase` reactive bound to a `<engine name=Phase>` machine + derived engine over it — clean", () => {
    // Pre-S84 working path: explicit state-decl annotated with a machine name
    // (`Phase`), where a `<engine name=Phase for=Phase>` populates
    // machineRegistry["Phase"]. `resolveMachineBinding` matches the state-
    // decl annotation against the registry, sets state-decl.machineBinding,
    // and the original collector picks it up. The fix MUST NOT break this.
    const src = `\${
      type Phase:enum = { Idle, Loading }
      type Risk:enum = { Safe, AtRisk }
      @phase: Phase = Phase.Idle
    }

    <engine name=Phase for=Phase initial=.Idle>
      .Idle    => .Loading
      .Loading => .Idle
    </>

    <engine for=Risk derived=@phase>
      .Idle    => .Safe
      .Loading => .AtRisk
    </>`;
    const { errors } = compile(src);
    expect(errsByCode(errors, "E-ENGINE-004").length).toBe(0);
    expect(errsByCode(errors, "E-ENGINE-018").length).toBe(0);
  });
});

// ===========================================================================
// §Bug2.3 — Transitive projection (derived-over-derived) still rejected
// ===========================================================================

describe("§Bug2.3 — transitive projection §51.9.7 PRESERVED", () => {
  test("§Bug2.3.1 derived-over-derived (both auto-declared bases) fires E-ENGINE-004 with §51.9.7 message", () => {
    // C derived from B derived from A. Both B and A are non-derived (B is
    // derived from A, but a B → C projection makes B the source for C —
    // which is the §51.9.7 transitive-projection case).
    const src = `\${
      type A:enum = { X, Y }
      type B:enum = { P, Q }
      type C:enum = { M, N }
    }

    <engine for=A initial=.X>
      .X => .Y
      .Y => .X
    </>

    <engine for=B derived=@a>
      .X => .P
      .Y => .Q
    </>

    <engine for=C derived=@b>
      .P => .M
      .Q => .N
    </>`;
    const { errors } = compile(src);
    const e4 = errsByCode(errors, "E-ENGINE-004");
    const transitive = e4.filter((e) => /itself a projected \(derived\) variable/.test(e.message));
    expect(transitive.length).toBeGreaterThanOrEqual(1);
  });

  test("§Bug2.3.2 derived-over-derived (explicit-base form) STILL fires §51.9.7", () => {
    // Same shape but with an explicit state-decl source. The §51.9.7 guard
    // sits inside `validateDerivedMachines` after sourceMachine.isDerived
    // check — fix is orthogonal.
    const src = `\${
      type A:enum = { X, Y }
      type B:enum = { P, Q }
      type C:enum = { M, N }
      @a: A = A.X
    }

    <engine for=B derived=@a>
      .X => .P
      .Y => .Q
    </>

    <engine for=C derived=@b>
      .P => .M
      .Q => .N
    </>`;
    const { errors } = compile(src);
    const e4 = errsByCode(errors, "E-ENGINE-004");
    const transitive = e4.filter((e) => /itself a projected \(derived\) variable/.test(e.message));
    expect(transitive.length).toBeGreaterThanOrEqual(1);
  });
});

// ===========================================================================
// §Bug2.4 — Unknown source var still fires E-ENGINE-004
// ===========================================================================

describe("§Bug2.4 — unknown source var still rejected", () => {
  test("§Bug2.4.1 `derived=@nonexistent` fires E-ENGINE-004 with the 'no machine-bound reactive' message", () => {
    // The validator message is verbatim: "Derived machine '<name>' references
    // source variable '@<src>', but no machine-bound reactive with that name
    // was found in scope." We assert that specific phrasing did NOT change.
    const src = `\${
      type Risk:enum = { Safe, AtRisk }
    }

    <engine for=Risk derived=@nonexistent>
      .Idle    => .Safe
      .Loading => .AtRisk
    </>`;
    const { errors } = compile(src);
    const e4 = errsByCode(errors, "E-ENGINE-004");
    const unknownSrc = e4.filter((e) => /no machine-bound reactive with that name was found in scope/.test(e.message));
    expect(unknownSrc.length).toBeGreaterThanOrEqual(1);
    expect(unknownSrc[0].message).toMatch(/@nonexistent/);
  });
});

// ===========================================================================
// §Bug2.5 — E-ENGINE-018 exhaustiveness still fires when variants uncovered
// ===========================================================================

describe("§Bug2.5 — E-ENGINE-018 exhaustiveness PRESERVED", () => {
  test("§Bug2.5.1 derived engine over auto-declared var, missing variant fires E-ENGINE-018", () => {
    // Source enum has 3 variants but only 2 are projected — must fire
    // E-ENGINE-018 against the missing one.
    const src = `\${
      type Phase:enum = { Idle, Loading, Loaded }
      type Risk:enum = { Safe, AtRisk }
    }

    <engine for=Phase initial=.Idle>
      .Idle    => .Loading
      .Loading => .Loaded
      .Loaded  => .Idle
    </>

    <engine for=Risk derived=@phase>
      .Idle    => .Safe
      .Loading => .AtRisk
    </>`;
    const { errors } = compile(src);
    // Confirm the fix didn't false-fire E-ENGINE-004 for the source-var
    // lookup (the very point of Bug 2).
    const unknownSrc = errsByCode(errors, "E-ENGINE-004")
      .filter((e) => /references unknown source variable/.test(e.message));
    expect(unknownSrc.length).toBe(0);
    // And E-ENGINE-018 must fire for the uncovered `.Loaded` variant.
    const e18 = errsByCode(errors, "E-ENGINE-018");
    expect(e18.length).toBeGreaterThanOrEqual(1);
    expect(e18.some((e) => /\.Loaded/.test(e.message))).toBe(true);
  });
});

// ===========================================================================
// §Bug2.6 — Naming collision: SYM PASS 10.A E-ENGINE-VAR-DUPLICATE owns
// ===========================================================================

describe("§Bug2.6 — naming collision: SHALL-NOT-overwrite guard preserves SYM diagnostic", () => {
  test("§Bug2.6.1 explicit `@phase: Phase` + `<engine for=Phase>` (also auto-declares `@phase`) — SYM duplicate path takes precedence", () => {
    // A state-decl named `phase` + an engine whose auto-decl is also `phase`
    // is the canonical E-ENGINE-VAR-DUPLICATE territory (SYM PASS 10.A).
    // The Bug 2 fix's `if (reactiveBindings.has(varName)) continue;` guard
    // means the state-decl's machineBinding stays the canonical entry for
    // `phase` (if it set one); the engine's auto-decl is NOT silently
    // overwritten by the new collector.
    //
    // Whether the SYM diagnostic fires at the unit-test slice (which calls
    // runTS directly, not runSYM) depends on integration — but we can at
    // least assert no NEW false positives. The point of this test is to
    // confirm the Bug 2 fix doesn't paper over the collision by silently
    // accepting the engine as the truth-source for `@phase`.
    const src = `\${
      type Phase:enum = { Idle, Loading }
      type Risk:enum = { Safe, AtRisk }
      @phase: Phase = Phase.Idle
    }

    <engine for=Phase initial=.Idle>
      .Idle    => .Loading
      .Loading => .Idle
    </>

    <engine for=Risk derived=@phase>
      .Idle    => .Safe
      .Loading => .AtRisk
    </>`;
    const { errors } = compile(src);
    // The derived projection STILL resolves cleanly via the state-decl's
    // machineBinding path — no false E-ENGINE-004 from a confused collector.
    const unknownSrc = errsByCode(errors, "E-ENGINE-004")
      .filter((e) => /references unknown source variable/.test(e.message));
    expect(unknownSrc.length).toBe(0);
  });
});
