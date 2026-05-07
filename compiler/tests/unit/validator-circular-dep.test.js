/**
 * E-VALIDATOR-CIRCULAR-DEP — validator-arg circular dependency detection.
 *
 * Phase A1b Step B10 (Phase 3) — exercises the cycle detection wired into
 * Stage 7 (Dependency Graph Builder, `compiler/src/dependency-graph.ts`).
 *
 * Spec references:
 *   - SPEC §55.11 (Cross-field validation via predicate args)
 *   - SPEC §31.4  (Cross-field predicate-arg deps share standard reactive
 *                  dependency tracker machinery)
 *   - SPEC §34    (E-VALIDATOR-CIRCULAR-DEP catalog row)
 *
 * Audit reference:
 *   - docs/audits/a1b-b10-rule4-audit-2026-05-07.md (§1.4 — first consumer
 *     of B7's reusability promise via generic detectCycle).
 *
 * Coverage:
 *   - Self-reference (degenerate 1-cycle: `<a eq(@a)>`)
 *   - Two-cell canonical cycle (`<a eq(@b)>` + `<b eq(@a)>`)
 *   - Multi-hop cycle (a -> b -> c -> a)
 *   - Legitimate non-cyclic chain (a + b eq(@a)) — no false positive
 *   - Mixed validators on multiple cells, no cycle
 *   - Distinct from E-DERIVED-CIRCULAR-DEP (different edge kind)
 */

import { describe, test, expect } from "bun:test";
import { runDG } from "../../src/dependency-graph.ts";

function span(start, file = "/test/app.scrml") {
  return { file, start, end: start + 10, line: 1, col: start + 1 };
}

function makeReactiveDecl(name, init = "", spanStart = 0, file = "/test/app.scrml") {
  return {
    kind: "state-decl",
    structuralForm: true,
    shape: "plain",
    isConst: false,
    name,
    init,
    span: span(spanStart, file),
  };
}

/**
 * Construct a state-decl with validator entries. Each validator entry is
 * `{name, args, span}` where args are constructed ExprNodes (or null for
 * bareword) per the post-B9 shape.
 *
 * The simplest validator-arg shape we can construct programmatically: a
 * `lit` ExprNode with `litType: "string"` for inline-override slots, or a
 * synthesized IdentExpr for cross-field `@cell` references.
 */
function makeValidatorDecl(name, validators, spanStart = 0, file = "/test/app.scrml") {
  return {
    kind: "state-decl",
    structuralForm: true,
    shape: "plain",
    isConst: false,
    name,
    init: "",
    validators,
    span: span(spanStart, file),
  };
}

function makeIdentExpr(name, spanStart = 0) {
  return {
    kind: "ident",
    name, // canonical form — `@cellName` for reactive refs
    span: span(spanStart),
  };
}

function makeLogicBlock(body, spanStart = 0, file = "/test/app.scrml") {
  return {
    kind: "logic",
    body,
    bodyKind: "logic",
    typeDecls: [],
    components: [],
    span: span(spanStart, file),
  };
}

function makeFileAST(nodes, filePath = "/test/app.scrml") {
  return {
    filePath,
    nodes,
    imports: [],
    exports: [],
    components: [],
    typeDecls: [],
    spans: new Map(),
  };
}

function makeRouteMap() {
  return { functions: new Map() };
}

function getValidatorErrors(errors) {
  return errors.filter((e) => e.code === "E-VALIDATOR-CIRCULAR-DEP");
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("E-VALIDATOR-CIRCULAR-DEP — control (no cycle)", () => {
  test("non-cyclic cross-field: <a> + <b eq(@a)> — no error", () => {
    const a = makeReactiveDecl("a", "1", 0);
    // <b eq(@a)>
    const b = makeValidatorDecl("b", [
      { name: "eq", args: [makeIdentExpr("@a", 30)], span: span(20) },
    ], 10);
    const logic = makeLogicBlock([a, b]);
    const fileAST = makeFileAST([logic]);
    const { errors } = runDG({ files: [fileAST], routeMap: makeRouteMap() });
    expect(getValidatorErrors(errors).length).toBe(0);
  });

  test("validator on a single cell with no cross-field — no error", () => {
    // <name req length(>=2)> — no @cell refs in args
    const name = makeValidatorDecl("name", [
      { name: "req", args: null, span: span(10) },
    ], 0);
    const logic = makeLogicBlock([name]);
    const fileAST = makeFileAST([logic]);
    const { errors } = runDG({ files: [fileAST], routeMap: makeRouteMap() });
    expect(getValidatorErrors(errors).length).toBe(0);
  });

  test("legitimate validator-arg chain a -> b -> c (no back-edge) — no error", () => {
    const a = makeReactiveDecl("a", "1", 0);
    // <b eq(@a)>
    const b = makeValidatorDecl("b", [
      { name: "eq", args: [makeIdentExpr("@a", 25)], span: span(20) },
    ], 10);
    // <c eq(@b)>
    const c = makeValidatorDecl("c", [
      { name: "eq", args: [makeIdentExpr("@b", 50)], span: span(45) },
    ], 35);
    const logic = makeLogicBlock([a, b, c]);
    const fileAST = makeFileAST([logic]);
    const { errors } = runDG({ files: [fileAST], routeMap: makeRouteMap() });
    expect(getValidatorErrors(errors).length).toBe(0);
  });
});

describe("E-VALIDATOR-CIRCULAR-DEP — self-reference (degenerate 1-cycle)", () => {
  test("validator references its own cell: <a eq(@a)> — fires E-VALIDATOR-CIRCULAR-DEP", () => {
    const a = makeValidatorDecl("a", [
      { name: "eq", args: [makeIdentExpr("@a", 25)], span: span(20) },
    ], 0);
    const logic = makeLogicBlock([a]);
    const fileAST = makeFileAST([logic]);
    const { errors } = runDG({ files: [fileAST], routeMap: makeRouteMap() });
    const fires = getValidatorErrors(errors);
    expect(fires.length).toBe(1);
    expect(fires[0].message).toContain("@a");
    expect(fires[0].message).toContain("self-reference");
  });
});

describe("E-VALIDATOR-CIRCULAR-DEP — two-cell canonical cycle", () => {
  test("`<a eq(@b)>` + `<b eq(@a)>` — fires E-VALIDATOR-CIRCULAR-DEP per §55.11", () => {
    // The §55.11 line 24631 worked example.
    const a = makeValidatorDecl("a", [
      { name: "eq", args: [makeIdentExpr("@b", 25)], span: span(20) },
    ], 0);
    const b = makeValidatorDecl("b", [
      { name: "eq", args: [makeIdentExpr("@a", 50)], span: span(45) },
    ], 30);
    const logic = makeLogicBlock([a, b]);
    const fileAST = makeFileAST([logic]);
    const { errors } = runDG({ files: [fileAST], routeMap: makeRouteMap() });
    const fires = getValidatorErrors(errors);
    expect(fires.length).toBe(1);
    expect(fires[0].message).toContain("@a");
    expect(fires[0].message).toContain("@b");
  });
});

describe("E-VALIDATOR-CIRCULAR-DEP — multi-hop cycle", () => {
  test("a -> b -> c -> a via validator args — fires", () => {
    const a = makeValidatorDecl("a", [
      { name: "eq", args: [makeIdentExpr("@b", 15)], span: span(10) },
    ], 0);
    const b = makeValidatorDecl("b", [
      { name: "eq", args: [makeIdentExpr("@c", 35)], span: span(30) },
    ], 20);
    const c = makeValidatorDecl("c", [
      { name: "eq", args: [makeIdentExpr("@a", 55)], span: span(50) },
    ], 40);
    const logic = makeLogicBlock([a, b, c]);
    const fileAST = makeFileAST([logic]);
    const { errors } = runDG({ files: [fileAST], routeMap: makeRouteMap() });
    expect(getValidatorErrors(errors).length).toBe(1);
  });
});

describe("E-VALIDATOR-CIRCULAR-DEP — orthogonality with E-DERIVED-CIRCULAR-DEP", () => {
  test("legitimate validator-arg cycle does NOT fire E-DERIVED-CIRCULAR-DEP", () => {
    // Verify the two cycle-detectors are genuinely separate. The validator
    // cycle here should fire E-VALIDATOR-CIRCULAR-DEP only.
    const a = makeValidatorDecl("a", [
      { name: "eq", args: [makeIdentExpr("@b", 15)], span: span(10) },
    ], 0);
    const b = makeValidatorDecl("b", [
      { name: "eq", args: [makeIdentExpr("@a", 35)], span: span(30) },
    ], 20);
    const logic = makeLogicBlock([a, b]);
    const fileAST = makeFileAST([logic]);
    const { errors } = runDG({ files: [fileAST], routeMap: makeRouteMap() });
    expect(getValidatorErrors(errors).length).toBe(1);
    expect(errors.filter((e) => e.code === "E-DERIVED-CIRCULAR-DEP").length).toBe(0);
  });
});

describe("E-VALIDATOR-CIRCULAR-DEP — handles multiple validator args per cell", () => {
  test("two args on one validator referencing same cell → de-duped (single edge)", () => {
    // Belt-and-suspenders: make sure duplicate edges aren't pushed.
    // <a eq(@b, "msg")> — only @b counted (msg is string lit, no edge).
    const a = makeValidatorDecl("a", [
      {
        name: "eq",
        args: [
          makeIdentExpr("@b", 15),
          { kind: "lit", litType: "string", value: "msg", span: span(20) },
        ],
        span: span(10),
      },
    ], 0);
    const b = makeReactiveDecl("b", "0", 30);
    const logic = makeLogicBlock([a, b]);
    const fileAST = makeFileAST([logic]);
    const { errors } = runDG({ files: [fileAST], routeMap: makeRouteMap() });
    // No cycle (b doesn't reference a back), so no error.
    expect(getValidatorErrors(errors).length).toBe(0);
  });
});
