/**
 * Phase A1b Step B21 — Refinement-type predicates §53 basic three-zone
 * (Wave 5 closer 2/2; A1b CLOSER).
 *
 * Per SPEC §53 (entirety) + §53.4 three-zone enforcement + §53.10 + §53.11
 * + §34 catalog rows 14181-14185 (E-CONTRACT-001..-004-WARN).
 *
 * **What B21 owns (ratified subset for A1b):**
 *   1. Static-zone literal-conformance check at let-decl + state-decl —
 *      EXISTING behavior (pre-B21); B21 verifies + completes annotation.
 *   2. Boundary-zone runtime-hook annotation recorded on `predicateCheck` —
 *      EXISTING for boundary; B21 extends to record static + trusted as well
 *      so all three zones produce a uniform AST annotation (additive, A1c
 *      codegen still gates on `zone === "boundary"`).
 *   3. Trusted-zone elision marker via T-PRED-4 `predicateImplies` — B21
 *      makes this reachable from real AST code by extending the SourceInfo
 *      classifier to detect predicated-typed `IdentExpr` RHS via scope-chain
 *      lookup. Pre-B21, `classifyLiteralFromExprNode` only returned
 *      `literal | arithmetic | unconstrained`, so the `predicated` SourceInfo
 *      was unreachable from real let-decl / state-decl declarations and
 *      trusted-zone never fired in practice.
 *
 * **Out of scope (deferred):**
 *   - Function-parameter / return-stmt three-zone classification — locus
 *     extension; deferred to A1c. (`function-decl` walker binds predicated
 *     params but does not classify caller-site or return-site zones today.)
 *   - Bare-expr reassignment to predicated state-decl — deferred to A1c.
 *   - HTML attr generation from named-shape predicates (§53.7) — A1c codegen
 *     concern (`emit-html.ts`). The codegen utility tables in
 *     `compiler/src/codegen/emit-predicates.ts` already exist.
 *   - E-CONTRACT-001-RT runtime check emission — already implemented in
 *     `emit-predicates.ts` + `emit-logic.ts`; not a B21 deferral.
 *   - E-CONTRACT-004-WARN bind:value attribute conflict — A1c codegen.
 *   - Named-shape registry extension via meta blocks — open SPEC-ISSUE.
 *   - Constraint arithmetic, type-aliases for predicates, boolean predicates
 *     — open SPEC-ISSUEs §53.13.
 *
 * Coverage areas:
 *   §B21.1  Static zone — literal pass: zone="static" annotation, no error
 *   §B21.2  Static zone — literal fail: zone="static", E-CONTRACT-001 fires
 *   §B21.3  Boundary zone — unconstrained source: zone="boundary" annotation
 *   §B21.4  Boundary zone — arithmetic source: zone="boundary" annotation
 *   §B21.5  Trusted zone — predicated ident source via scope, T-PRED-4
 *           tighter-or-equal predicate implication: zone="trusted"
 *   §B21.6  Boundary zone — predicated ident with predicate that does NOT
 *           imply target: zone="boundary"
 *   §B21.7  Trusted zone — same named-shape source/target: zone="trusted"
 *   §B21.8  state-decl — same three-zone semantics for reactive declarations
 *   §B21.9  E-CONTRACT-003 — predicate references @cell fires from let-decl
 *   §B21.10 E-CONTRACT-002 — unknown named shape fires from let-decl
 *   §B21.11 sourceKind metadata recorded for downstream consumers
 *   §B21.12 Conjunction implication — `>0 && <100` source implies `>0` target
 *   §B21.13 Boolean source-info upgrade safety — non-IdentExpr RHS preserved
 */

import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";
import { runTS } from "../../src/type-system.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function compile(source, filePath = "/test/b21.scrml") {
  const bs = splitBlocks(filePath, source);
  const { ast, errors: astErrors } = buildAST(bs);
  const res = runTS({ files: [ast] });
  const all = [...(bs.errors || []), ...(astErrors || []), ...(res.errors || [])];
  return {
    ast: res.files[0],
    errors: all,
    rawAst: ast,
  };
}

function errorsByCode(errors, code) {
  return (errors || []).filter((e) => e.code === code);
}

/**
 * Walk the AST and collect every node carrying a `predicateCheck` annotation.
 * Returns a map keyed by node.name.
 */
function collectPredicateChecks(ast) {
  const out = new Map();
  function walk(n) {
    if (!n || typeof n !== "object") return;
    if (n.predicateCheck && typeof n.name === "string") {
      out.set(n.name, n.predicateCheck);
    }
    const body = n.body;
    if (Array.isArray(body)) for (const c of body) walk(c);
    const children = n.children;
    if (Array.isArray(children)) for (const c of children) walk(c);
    const nodes = n.nodes;
    if (Array.isArray(nodes)) for (const c of nodes) walk(c);
    const arms = n.arms;
    if (Array.isArray(arms)) for (const c of arms) walk(c);
    if (n.consequent) walk(n.consequent);
    if (n.alternate) walk(n.alternate);
  }
  walk(ast);
  return out;
}

// ---------------------------------------------------------------------------
// §B21.1 — Static zone with literal pass
// ---------------------------------------------------------------------------

describe("§B21.1 static zone — literal pass", () => {
  test("`let x: number(>0) = 5` — zone=static, no error, predicateCheck recorded", () => {
    const source = `\${ let x: number(>0) = 5 }`;
    const { ast, errors } = compile(source);
    expect(errorsByCode(errors, "E-CONTRACT-001")).toHaveLength(0);
    const checks = collectPredicateChecks(ast);
    expect(checks.has("x")).toBe(true);
    const pc = checks.get("x");
    expect(pc.zone).toBe("static");
    expect(pc.sourceKind).toBe("literal");
  });

  test("`let p: number(>0 && <100) = 50` — zone=static, no error", () => {
    const source = `\${ let p: number(>0 && <100) = 50 }`;
    const { ast, errors } = compile(source);
    expect(errorsByCode(errors, "E-CONTRACT-001")).toHaveLength(0);
    const checks = collectPredicateChecks(ast);
    expect(checks.get("p").zone).toBe("static");
  });
});

// ---------------------------------------------------------------------------
// §B21.2 — Static zone with literal fail
// ---------------------------------------------------------------------------

describe("§B21.2 static zone — literal fail (E-CONTRACT-001)", () => {
  test("`let x: number(>0) = -1` — E-CONTRACT-001 fires, zone still static", () => {
    const source = `\${ let x: number(>0) = -1 }`;
    const { ast, errors } = compile(source);
    const fires = errorsByCode(errors, "E-CONTRACT-001");
    expect(fires.length).toBeGreaterThanOrEqual(1);
    expect(fires[0].message).toContain("-1");
    const checks = collectPredicateChecks(ast);
    // predicateCheck is still recorded — classification is informational
    expect(checks.get("x").zone).toBe("static");
  });

  test("`let x: number(<10000) = 10000` — boundary inclusive failure", () => {
    const source = `\${ let x: number(<10000) = 10000 }`;
    const { errors } = compile(source);
    const fires = errorsByCode(errors, "E-CONTRACT-001");
    expect(fires.length).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// §B21.3 — Boundary zone (unconstrained source)
// ---------------------------------------------------------------------------

describe("§B21.3 boundary zone — unconstrained source", () => {
  test("`let x: number(>0) = bare` (bare unbound ident) — zone=boundary, predicateCheck recorded", () => {
    // `bare` is not declared in scope, so SourceInfo classifies as unconstrained.
    // T-PRED-2 → boundary zone → A1c codegen will emit a runtime check.
    const source = `\${ let x: number(>0) = bare }`;
    const { ast } = compile(source);
    const checks = collectPredicateChecks(ast);
    expect(checks.get("x").zone).toBe("boundary");
  });

  test("`let x: number(>0) = returns_int()` — call returns unconstrained", () => {
    const source = `\${
fn returns_int() { return 42 }
let x: number(>0) = returns_int()
}`;
    const { ast } = compile(source);
    const checks = collectPredicateChecks(ast);
    expect(checks.get("x").zone).toBe("boundary");
  });
});

// ---------------------------------------------------------------------------
// §B21.4 — Boundary zone (arithmetic source — T-PRED-5)
// ---------------------------------------------------------------------------

describe("§B21.4 boundary zone — arithmetic source (T-PRED-5)", () => {
  test("`let x: number(>0) = a + b` — arithmetic strips constraints", () => {
    const source = `\${
let a = 5
let b = 10
let x: number(>0) = a + b
}`;
    const { ast } = compile(source);
    const checks = collectPredicateChecks(ast);
    expect(checks.get("x").zone).toBe("boundary");
    expect(checks.get("x").sourceKind).toBe("arithmetic");
  });
});

// ---------------------------------------------------------------------------
// §B21.5 — Trusted zone via T-PRED-4 — REAL AST PATH (B21 NEW BEHAVIOR)
// ---------------------------------------------------------------------------

describe("§B21.5 trusted zone — predicated ident, T-PRED-4 implication via scope (B21 NEW)", () => {
  test("`let a: number(>0 && <100) = 50; let b: number(>0) = a` — b zone=trusted (a's predicate implies b's)", () => {
    const source = `\${
let a: number(>0 && <100) = 50
let b: number(>0) = a
}`;
    const { ast, errors } = compile(source);
    const checks = collectPredicateChecks(ast);
    expect(checks.get("a").zone).toBe("static"); // 50 satisfies (>0 && <100)
    expect(checks.get("b").zone).toBe("trusted");
    expect(checks.get("b").sourceKind).toBe("predicated");
    // No errors should fire on the trusted assignment
    expect(errorsByCode(errors, "E-CONTRACT-001")).toHaveLength(0);
  });

  test("`let s: number(>5) = 10; let t: number(>0) = s` — tighter floor implies wider", () => {
    const source = `\${
let s: number(>5) = 10
let t: number(>0) = s
}`;
    const { ast } = compile(source);
    const checks = collectPredicateChecks(ast);
    expect(checks.get("t").zone).toBe("trusted");
  });

  test("`let s: number(<50) = 10; let t: number(<100) = s` — tighter ceiling implies wider", () => {
    const source = `\${
let s: number(<50) = 10
let t: number(<100) = s
}`;
    const { ast } = compile(source);
    const checks = collectPredicateChecks(ast);
    expect(checks.get("t").zone).toBe("trusted");
  });
});

// ---------------------------------------------------------------------------
// §B21.6 — Boundary zone — predicate does NOT imply target
// ---------------------------------------------------------------------------

describe("§B21.6 boundary zone — predicated source does not imply target", () => {
  test("`let s: number(>0) = 10; let t: number(>5) = s` — wider source → boundary", () => {
    const source = `\${
let s: number(>0) = 10
let t: number(>5) = s
}`;
    const { ast } = compile(source);
    const checks = collectPredicateChecks(ast);
    expect(checks.get("t").zone).toBe("boundary");
    expect(checks.get("t").sourceKind).toBe("predicated");
  });

  test("`let s: number(>0 && <10000) = 50; let t: number(>0 && <100) = s` — wider ceiling → boundary", () => {
    const source = `\${
let s: number(>0 && <10000) = 50
let t: number(>0 && <100) = s
}`;
    const { ast } = compile(source);
    const checks = collectPredicateChecks(ast);
    expect(checks.get("t").zone).toBe("boundary");
  });
});

// ---------------------------------------------------------------------------
// §B21.7 — Trusted zone — same named shape source/target
// ---------------------------------------------------------------------------

describe("§B21.7 trusted zone — same named shape", () => {
  test("`let s: string(email) = \"a@b.c\"; let t: string(email) = s` — t zone=trusted", () => {
    const source = `\${
let s: string(email) = "a@b.c"
let t: string(email) = s
}`;
    const { ast } = compile(source);
    const checks = collectPredicateChecks(ast);
    // The literal "a@b.c" is a named-shape source, statically undecidable -> evaluatePredicateOnLiteral returns null,
    // so static-zone but no error fires (named shape requires runtime).
    // For our second decl, the source is predicated `string(email)`, so trusted via T-PRED-4 same-name match.
    expect(checks.get("t").zone).toBe("trusted");
  });
});

// ---------------------------------------------------------------------------
// §B21.8 — state-decl — same three-zone semantics
// ---------------------------------------------------------------------------

describe("§B21.8 state-decl predicates — three-zone classification", () => {
  test("`@n: number(>0) = 5` — state-decl static-pass zone", () => {
    const source = `\${ @n: number(>0) = 5 }`;
    const { ast, errors } = compile(source);
    expect(errorsByCode(errors, "E-CONTRACT-001")).toHaveLength(0);
    const checks = collectPredicateChecks(ast);
    expect(checks.get("n")).toBeDefined();
    expect(checks.get("n").zone).toBe("static");
  });

  test("`@n: number(>0) = -1` — state-decl static-fail fires E-CONTRACT-001", () => {
    const source = `\${ @n: number(>0) = -1 }`;
    const { errors } = compile(source);
    const fires = errorsByCode(errors, "E-CONTRACT-001");
    expect(fires.length).toBeGreaterThanOrEqual(1);
  });

  test("`@n: number(>0) = unbound` — state-decl boundary zone", () => {
    const source = `\${ @n: number(>0) = unbound }`;
    const { ast } = compile(source);
    const checks = collectPredicateChecks(ast);
    expect(checks.get("n").zone).toBe("boundary");
  });
});

// ---------------------------------------------------------------------------
// §B21.9 — E-CONTRACT-003 — predicate references external @cell
// ---------------------------------------------------------------------------

describe("§B21.9 E-CONTRACT-003 — predicate references external state", () => {
  test("`let x: number(>=0 && <=@max) = 0` fires E-CONTRACT-003 from let-decl", () => {
    const source = `\${
let x: number(>=0 && <=@max) = 0
}`;
    const { errors } = compile(source);
    const fires = errorsByCode(errors, "E-CONTRACT-003");
    expect(fires.length).toBeGreaterThanOrEqual(1);
    expect(fires[0].message).toContain("E-CONTRACT-003");
  });
});

// ---------------------------------------------------------------------------
// §B21.10 — E-CONTRACT-002 — unknown named shape
// ---------------------------------------------------------------------------

describe("§B21.10 E-CONTRACT-002 — unknown named shape", () => {
  test("`let x: string(zipcode) = \"12345\"` fires E-CONTRACT-002", () => {
    const source = `\${ let x: string(zipcode) = "12345" }`;
    const { errors } = compile(source);
    const fires = errorsByCode(errors, "E-CONTRACT-002");
    expect(fires.length).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// §B21.11 — sourceKind metadata for downstream consumers
// ---------------------------------------------------------------------------

describe("§B21.11 sourceKind metadata recorded on predicateCheck", () => {
  test("literal source → sourceKind=literal", () => {
    const { ast } = compile(`\${ let x: number(>0) = 5 }`);
    const checks = collectPredicateChecks(ast);
    expect(checks.get("x").sourceKind).toBe("literal");
  });

  test("unconstrained ident source → sourceKind=unconstrained", () => {
    const { ast } = compile(`\${ let x: number(>0) = unbound }`);
    const checks = collectPredicateChecks(ast);
    expect(checks.get("x").sourceKind).toBe("unconstrained");
  });

  test("arithmetic source → sourceKind=arithmetic", () => {
    const { ast } = compile(`\${
let a = 1
let b = 2
let x: number(>0) = a + b
}`);
    const checks = collectPredicateChecks(ast);
    expect(checks.get("x").sourceKind).toBe("arithmetic");
  });

  test("predicated ident source → sourceKind=predicated", () => {
    const { ast } = compile(`\${
let a: number(>0 && <100) = 50
let b: number(>0) = a
}`);
    const checks = collectPredicateChecks(ast);
    expect(checks.get("b").sourceKind).toBe("predicated");
  });
});

// ---------------------------------------------------------------------------
// §B21.12 — Conjunction implication
// ---------------------------------------------------------------------------

describe("§B21.12 conjunction implication via T-PRED-4", () => {
  test("`>0 && <100` source implies `>0` target — zone=trusted", () => {
    const { ast } = compile(`\${
let a: number(>0 && <100) = 50
let b: number(>0) = a
}`);
    const checks = collectPredicateChecks(ast);
    expect(checks.get("b").zone).toBe("trusted");
  });

  test("`>0 && <100` source implies `<200` target — zone=trusted", () => {
    const { ast } = compile(`\${
let a: number(>0 && <100) = 50
let b: number(<200) = a
}`);
    const checks = collectPredicateChecks(ast);
    expect(checks.get("b").zone).toBe("trusted");
  });
});

// ---------------------------------------------------------------------------
// §B21.13 — SourceInfo upgrade safety
// ---------------------------------------------------------------------------

describe("§B21.13 SourceInfo upgrade is conservative — only fires on ident", () => {
  test("non-IdentExpr RHS does not get upgraded — call-result is unconstrained", () => {
    const source = `\${
fn produce() { return 5 }
let x: number(>0) = produce()
}`;
    const { ast } = compile(source);
    const checks = collectPredicateChecks(ast);
    // Function calls (even when the callee returns a predicated type at the
    // signature level) are NOT yet upgraded — that requires return-type
    // carry through FunctionType, deferred to A1c. Source classifies as
    // unconstrained → boundary zone. This test documents the conservative
    // behavior so future return-type integration has a known baseline.
    expect(checks.get("x").zone).toBe("boundary");
  });

  test("non-predicated source ident does not fire trusted-zone — zone=boundary", () => {
    const source = `\${
let plain = 5
let x: number(>0) = plain
}`;
    const { ast } = compile(source);
    const checks = collectPredicateChecks(ast);
    // `plain` infers to primitive number, not predicated, so source remains
    // unconstrained → boundary. No spurious trusted classification.
    expect(checks.get("x").zone).toBe("boundary");
  });

  test("dot-prefix bare-variant ident is not treated as a binding lookup", () => {
    // Sanity test: `.Variant`-shape idents (B20 territory) should not
    // collide with B21's scope-lookup upgrade.
    const source = `\${
type Color { Red, Green, Blue }
let c: Color = .Red
}`;
    const { errors } = compile(source);
    // The decl is non-predicated; just verify it doesn't crash or fire spurious diagnostics.
    expect(errorsByCode(errors, "E-CONTRACT-001")).toHaveLength(0);
    expect(errorsByCode(errors, "E-CONTRACT-003")).toHaveLength(0);
  });
});
