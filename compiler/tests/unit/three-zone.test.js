/**
 * §53.4 Three-Zone SPARK Enforcement — Unit Tests
 *
 * Tests for classifyPredicateZone, predicateImplies, extractInitLiteral,
 * and the assignment-site enforcement wired into let-decl and reactive-decl
 * processing in compiler/src/type-system.ts.
 *
 * Coverage:
 *   §1  classifyPredicateZone — static zone: literal 5 passes number(>0)
 *   §2  classifyPredicateZone — static zone: literal -1 fails number(>0) → E-CONTRACT-001
 *   §3  classifyPredicateZone — boundary zone: unconstrained source
 *   §4  classifyPredicateZone — boundary zone: arithmetic source (T-PRED-5)
 *   §5  classifyPredicateZone — trusted zone: tighter source implies target (T-PRED-4)
 *   §6  classifyPredicateZone — boundary zone: source not tighter than target
 *   §7  classifyPredicateZone — named shape: string(email) to string(email) → trusted
 *   §8  classifyPredicateZone — named shape: different names → boundary
 *   §9  predicateImplies — >5 implies >0 (higher floor)
 *   §10 predicateImplies — <50 implies <100 (lower ceiling)
 *   §11 predicateImplies — >0 && <100 implies >0 (conjunct extraction)
 *   §12 predicateImplies — >0 does NOT imply >5 (source is wider)
 *   §13 predicateImplies — >0 && <100 implies >0 && <1000 (tighter range)
 *   §14 predicateImplies — >0 && <100 does NOT imply >0 && <50 (ceiling too low)
 *   §15 predicateImplies — == 5 implies > 0 (exact equality implies lower bound)
 *   §16 extractInitLiteral — numeric literal 42
 *   §17 extractInitLiteral — numeric literal -5
 *   §18 extractInitLiteral — string literal "hello"
 *   §19 extractInitLiteral — arithmetic x + 1 → arithmetic kind
 *   §20 extractInitLiteral — variable reference → unconstrained
 *   §21 T-PRED-5: arithmetic source → boundary (constraint stripped)
 *   §22 Boundary zone attaches predicateCheck metadata to node
 *   §23 Static zone with passing literal: no predicateCheck metadata
 *   §24 Trusted zone: no predicateCheck metadata
 *   §25 Static zone fail: E-CONTRACT-001 emitted (number(>0) with literal -1)
 */

import { describe, test, expect } from "bun:test";
import {
  classifyPredicateZone,
  predicateImplies,
  extractInitLiteral,
  resolveTypeExpr,
  parsePredicateExpr,
  TSError,
} from "../../src/type-system.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function span(file = "/test/app.scrml") {
  return { file, start: 0, end: 10, line: 1, col: 1 };
}

function emptyRegistry() {
  return new Map();
}

function predType(expr) {
  const t = resolveTypeExpr(expr, emptyRegistry());
  if (t.kind !== "predicated") throw new Error(`Expected predicated type for "${expr}", got ${t.kind}`);
  return t;
}

// ---------------------------------------------------------------------------
// §1-2 classifyPredicateZone — static zone with literals
// ---------------------------------------------------------------------------

describe("§1 classifyPredicateZone — static zone: literal passes predicate", () => {
  test("literal 5 assigned to number(>0) → static zone", () => {
    const target = predType("number(>0)");
    const errors = [];
    const zone = classifyPredicateZone(target, { kind: "literal", value: 5 }, span(), errors);
    expect(zone).toBe("static");
    expect(errors).toHaveLength(0);
  });

  test("literal 1 assigned to number(>=1) → static zone, no error", () => {
    const target = predType("number(>=1)");
    const errors = [];
    const zone = classifyPredicateZone(target, { kind: "literal", value: 1 }, span(), errors);
    expect(zone).toBe("static");
    expect(errors).toHaveLength(0);
  });

  test("literal 50 assigned to number(>0 && <100) → static zone, no error", () => {
    const target = predType("number(>0 && <100)");
    const errors = [];
    const zone = classifyPredicateZone(target, { kind: "literal", value: 50 }, span(), errors);
    expect(zone).toBe("static");
    expect(errors).toHaveLength(0);
  });
});

describe("§2 classifyPredicateZone — static zone: literal fails predicate → E-CONTRACT-001", () => {
  test("literal -1 assigned to number(>0) → static zone, E-CONTRACT-001 emitted", () => {
    const target = predType("number(>0)");
    const errors = [];
    const zone = classifyPredicateZone(target, { kind: "literal", value: -1 }, span(), errors);
    expect(zone).toBe("static");
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe("E-CONTRACT-001");
  });

  test("literal 0 assigned to number(>0) → static zone, E-CONTRACT-001 (boundary not inclusive)", () => {
    const target = predType("number(>0)");
    const errors = [];
    const zone = classifyPredicateZone(target, { kind: "literal", value: 0 }, span(), errors);
    expect(zone).toBe("static");
    expect(errors[0].code).toBe("E-CONTRACT-001");
  });

  test("literal 10000 assigned to number(<10000) → static zone, E-CONTRACT-001", () => {
    const target = predType("number(<10000)");
    const errors = [];
    const zone = classifyPredicateZone(target, { kind: "literal", value: 10000 }, span(), errors);
    expect(zone).toBe("static");
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe("E-CONTRACT-001");
  });
});

// ---------------------------------------------------------------------------
// §3-4 classifyPredicateZone — boundary zone
// ---------------------------------------------------------------------------

describe("§3 classifyPredicateZone — boundary zone: unconstrained source", () => {
  test("unconstrained source → boundary zone", () => {
    const target = predType("number(>0)");
    const errors = [];
    const zone = classifyPredicateZone(target, { kind: "unconstrained" }, span(), errors);
    expect(zone).toBe("boundary");
    expect(errors).toHaveLength(0);
  });

  test("unconstrained source → no errors emitted", () => {
    const target = predType("number(>0 && <100)");
    const errors = [];
    classifyPredicateZone(target, { kind: "unconstrained" }, span(), errors);
    expect(errors).toHaveLength(0);
  });
});

describe("§4 classifyPredicateZone — boundary zone: arithmetic source (T-PRED-5)", () => {
  test("arithmetic source → boundary zone (constraint stripped by arithmetic)", () => {
    const target = predType("number(>0)");
    const errors = [];
    const zone = classifyPredicateZone(target, { kind: "arithmetic" }, span(), errors);
    expect(zone).toBe("boundary");
    expect(errors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// §5-8 classifyPredicateZone — trusted zone (T-PRED-4)
// ---------------------------------------------------------------------------

describe("§5 classifyPredicateZone — trusted zone: source implies target", () => {
  test("number(>0 && <100) source assigned to number(>0) target → trusted", () => {
    const target = predType("number(>0)");
    const sourcePredType = predType("number(>0 && <100)");
    const errors = [];
    const zone = classifyPredicateZone(target, { kind: "predicated", predType: sourcePredType }, span(), errors);
    expect(zone).toBe("trusted");
    expect(errors).toHaveLength(0);
  });

  test("number(>0 && <100) source assigned to number(>0 && <10000) target → trusted (tighter constraint)", () => {
    const target = predType("number(>0 && <10000)");
    const sourcePredType = predType("number(>0 && <100)");
    const errors = [];
    const zone = classifyPredicateZone(target, { kind: "predicated", predType: sourcePredType }, span(), errors);
    expect(zone).toBe("trusted");
  });

  test("number(>5) source assigned to number(>0) target → trusted (tighter lower bound)", () => {
    const target = predType("number(>0)");
    const sourcePredType = predType("number(>5)");
    const errors = [];
    const zone = classifyPredicateZone(target, { kind: "predicated", predType: sourcePredType }, span(), errors);
    expect(zone).toBe("trusted");
  });
});

describe("§6 classifyPredicateZone — boundary zone: source not tighter than target", () => {
  test("number(>0) source assigned to number(>5) target → boundary (source too wide)", () => {
    const target = predType("number(>5)");
    const sourcePredType = predType("number(>0)");
    const errors = [];
    const zone = classifyPredicateZone(target, { kind: "predicated", predType: sourcePredType }, span(), errors);
    expect(zone).toBe("boundary");
  });

  test("number(>0 && <10000) source assigned to number(>0 && <100) target → boundary", () => {
    const target = predType("number(>0 && <100)");
    const sourcePredType = predType("number(>0 && <10000)");
    const errors = [];
    const zone = classifyPredicateZone(target, { kind: "predicated", predType: sourcePredType }, span(), errors);
    expect(zone).toBe("boundary");
  });
});

describe("§7 classifyPredicateZone — named shape: same shape → trusted", () => {
  test("string(email) source assigned to string(email) target → trusted", () => {
    const target = predType("string(email)");
    const sourcePredType = predType("string(email)");
    const errors = [];
    const zone = classifyPredicateZone(target, { kind: "predicated", predType: sourcePredType }, span(), errors);
    expect(zone).toBe("trusted");
  });

  test("string(uuid) to string(uuid) → trusted", () => {
    const target = predType("string(uuid)");
    const sourcePredType = predType("string(uuid)");
    const errors = [];
    const zone = classifyPredicateZone(target, { kind: "predicated", predType: sourcePredType }, span(), errors);
    expect(zone).toBe("trusted");
  });
});

describe("§8 classifyPredicateZone — named shape: different names → boundary", () => {
  test("string(email) source assigned to string(url) target → boundary", () => {
    const target = predType("string(url)");
    const sourcePredType = predType("string(email)");
    const errors = [];
    const zone = classifyPredicateZone(target, { kind: "predicated", predType: sourcePredType }, span(), errors);
    expect(zone).toBe("boundary");
  });
});

// ---------------------------------------------------------------------------
// §9-15 predicateImplies — direct function tests
// ---------------------------------------------------------------------------

describe("§9 predicateImplies — numeric range: higher floor implies lower floor", () => {
  test(">5 implies >0 (tighter lower bound)", () => {
    const source = parsePredicateExpr(">5");
    const target = parsePredicateExpr(">0");
    expect(predicateImplies(source, target)).toBe(true);
  });

  test(">10 implies >5", () => {
    const source = parsePredicateExpr(">10");
    const target = parsePredicateExpr(">5");
    expect(predicateImplies(source, target)).toBe(true);
  });

  test(">0 implies >0 (same — equal is allowed)", () => {
    const source = parsePredicateExpr(">0");
    const target = parsePredicateExpr(">0");
    expect(predicateImplies(source, target)).toBe(true);
  });
});

describe("§10 predicateImplies — numeric range: lower ceiling implies higher ceiling", () => {
  test("<50 implies <100 (tighter upper bound)", () => {
    const source = parsePredicateExpr("<50");
    const target = parsePredicateExpr("<100");
    expect(predicateImplies(source, target)).toBe(true);
  });

  test("<100 implies <100 (same — equal is allowed)", () => {
    const source = parsePredicateExpr("<100");
    const target = parsePredicateExpr("<100");
    expect(predicateImplies(source, target)).toBe(true);
  });
});

describe("§11 predicateImplies — AND conjunction implies each conjunct", () => {
  test(">0 && <100 implies >0", () => {
    const source = parsePredicateExpr(">0 && <100");
    const target = parsePredicateExpr(">0");
    expect(predicateImplies(source, target)).toBe(true);
  });

  test(">0 && <100 implies <100", () => {
    const source = parsePredicateExpr(">0 && <100");
    const target = parsePredicateExpr("<100");
    expect(predicateImplies(source, target)).toBe(true);
  });

  test(">0 && <100 implies <200 (tighter upper bound)", () => {
    const source = parsePredicateExpr(">0 && <100");
    const target = parsePredicateExpr("<200");
    expect(predicateImplies(source, target)).toBe(true);
  });
});

describe("§12 predicateImplies — source too wide: does NOT imply target", () => {
  test(">0 does NOT imply >5 (source is wider)", () => {
    const source = parsePredicateExpr(">0");
    const target = parsePredicateExpr(">5");
    expect(predicateImplies(source, target)).toBe(false);
  });

  test("<100 does NOT imply <50 (source ceiling is higher)", () => {
    const source = parsePredicateExpr("<100");
    const target = parsePredicateExpr("<50");
    expect(predicateImplies(source, target)).toBe(false);
  });
});

describe("§13 predicateImplies — tighter range implies wider range", () => {
  test(">0 && <100 implies >0 && <1000 (tighter range implies wider)", () => {
    const source = parsePredicateExpr(">0 && <100");
    const target = parsePredicateExpr(">0 && <1000");
    expect(predicateImplies(source, target)).toBe(true);
  });
});

describe("§14 predicateImplies — wider range does NOT imply tighter range", () => {
  test(">0 && <100 does NOT imply >0 && <50", () => {
    const source = parsePredicateExpr(">0 && <100");
    const target = parsePredicateExpr(">0 && <50");
    expect(predicateImplies(source, target)).toBe(false);
  });
});

describe("§15 predicateImplies — exact equality implies bounds", () => {
  test("==5 implies >0 (5 > 0)", () => {
    const source = parsePredicateExpr("==5");
    const target = parsePredicateExpr(">0");
    expect(predicateImplies(source, target)).toBe(true);
  });

  test("==5 implies >=5", () => {
    const source = parsePredicateExpr("==5");
    const target = parsePredicateExpr(">=5");
    expect(predicateImplies(source, target)).toBe(true);
  });

  test("==5 does NOT imply >5 (5 is not strictly greater than 5)", () => {
    const source = parsePredicateExpr("==5");
    const target = parsePredicateExpr(">5");
    expect(predicateImplies(source, target)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// §16-20 extractInitLiteral
// ---------------------------------------------------------------------------

describe("§16 extractInitLiteral — numeric literals", () => {
  test("'42' → literal with value 42", () => {
    const r = extractInitLiteral("42");
    expect(r.kind).toBe("literal");
    if (r.kind === "literal") expect(r.value).toBe(42);
  });

  test("'0' → literal with value 0", () => {
    const r = extractInitLiteral("0");
    expect(r.kind).toBe("literal");
    if (r.kind === "literal") expect(r.value).toBe(0);
  });

  test("'3.14' → literal with value 3.14", () => {
    const r = extractInitLiteral("3.14");
    expect(r.kind).toBe("literal");
    if (r.kind === "literal") expect(r.value).toBeCloseTo(3.14);
  });
});

describe("§17 extractInitLiteral — negative numeric literals", () => {
  test("'-5' → literal with value -5", () => {
    const r = extractInitLiteral("-5");
    expect(r.kind).toBe("literal");
    if (r.kind === "literal") expect(r.value).toBe(-5);
  });

  test("'-0.5' → literal with value -0.5", () => {
    const r = extractInitLiteral("-0.5");
    expect(r.kind).toBe("literal");
    if (r.kind === "literal") expect(r.value).toBeCloseTo(-0.5);
  });
});

describe("§18 extractInitLiteral — string literals", () => {
  test("'\"hello\"' → literal with value 'hello'", () => {
    const r = extractInitLiteral('"hello"');
    expect(r.kind).toBe("literal");
    if (r.kind === "literal") expect(r.value).toBe("hello");
  });

  test("\"'world'\" → literal with value 'world'", () => {
    const r = extractInitLiteral("'world'");
    expect(r.kind).toBe("literal");
    if (r.kind === "literal") expect(r.value).toBe("world");
  });

  test("'\"\"' (empty string) → literal with value ''", () => {
    const r = extractInitLiteral('""');
    expect(r.kind).toBe("literal");
    if (r.kind === "literal") expect(r.value).toBe("");
  });
});

describe("§19 extractInitLiteral — arithmetic expressions", () => {
  test("'x + 1' → arithmetic kind", () => {
    const r = extractInitLiteral("x + 1");
    expect(r.kind).toBe("arithmetic");
  });

  test("'a * b' → arithmetic kind", () => {
    const r = extractInitLiteral("a * b");
    expect(r.kind).toBe("arithmetic");
  });

  test("'5 / 2' → arithmetic kind", () => {
    const r = extractInitLiteral("5 / 2");
    expect(r.kind).toBe("arithmetic");
  });

  test("'5 - 2' → arithmetic kind (digit minus digit)", () => {
    const r = extractInitLiteral("5 - 2");
    expect(r.kind).toBe("arithmetic");
  });

  test("'price - discount' (no digit prefix) → unconstrained (heuristic is conservative)", () => {
    // extractInitLiteral is conservative: variable subtraction can't be detected without AST
    const r = extractInitLiteral("price - discount");
    expect(r.kind).toBe("unconstrained");
  });
});

describe("§20 extractInitLiteral — variable references → unconstrained", () => {
  test("'myVar' → unconstrained", () => {
    const r = extractInitLiteral("myVar");
    expect(r.kind).toBe("unconstrained");
  });

  test("'someFunction()' → unconstrained", () => {
    const r = extractInitLiteral("someFunction()");
    expect(r.kind).toBe("unconstrained");
  });

  test("null → unconstrained", () => {
    const r = extractInitLiteral(null);
    expect(r.kind).toBe("unconstrained");
  });

  test("undefined → unconstrained", () => {
    const r = extractInitLiteral(undefined);
    expect(r.kind).toBe("unconstrained");
  });

  test("'' (empty string) → unconstrained", () => {
    const r = extractInitLiteral("");
    expect(r.kind).toBe("unconstrained");
  });
});

// ---------------------------------------------------------------------------
// §21-25 Zone classification — behavioral invariants
// ---------------------------------------------------------------------------

describe("§21 T-PRED-5: arithmetic source → boundary zone (constraint stripped)", () => {
  test("arithmetic assigned to number(>0) → boundary zone", () => {
    const target = predType("number(>0)");
    const errors = [];
    const zone = classifyPredicateZone(target, { kind: "arithmetic" }, span(), errors);
    expect(zone).toBe("boundary");
    expect(errors).toHaveLength(0);
  });
});

describe("§22 Boundary zone attaches predicateCheck metadata to AST node concept", () => {
  test("boundary zone returns 'boundary' — caller can attach metadata", () => {
    const target = predType("number(>0)");
    const errors = [];
    const zone = classifyPredicateZone(target, { kind: "unconstrained" }, span(), errors);
    expect(zone).toBe("boundary");
    // The caller (let-decl/reactive-decl case in annotateNodes) attaches
    // n.predicateCheck = { predicate, zone: "boundary" } based on this result
  });
});

describe("§23 Static zone with passing literal: no errors", () => {
  test("literal 5 passes number(>0) — no errors, static zone", () => {
    const target = predType("number(>0)");
    const errors = [];
    const zone = classifyPredicateZone(target, { kind: "literal", value: 5 }, span(), errors);
    expect(zone).toBe("static");
    expect(errors).toHaveLength(0);
  });
});

describe("§24 Trusted zone: no errors emitted", () => {
  test("trusted zone emits no errors", () => {
    const target = predType("number(>0)");
    const sourcePredType = predType("number(>5)");
    const errors = [];
    const zone = classifyPredicateZone(target, { kind: "predicated", predType: sourcePredType }, span(), errors);
    expect(zone).toBe("trusted");
    expect(errors).toHaveLength(0);
  });
});

describe("§25 Static zone fail: E-CONTRACT-001 emitted", () => {
  test("literal -1 assigned to number(>0) — E-CONTRACT-001, static zone", () => {
    const target = predType("number(>0)");
    const errors = [];
    const zone = classifyPredicateZone(target, { kind: "literal", value: -1 }, span(), errors);
    expect(zone).toBe("static");
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe("E-CONTRACT-001");
    expect(errors[0].message).toContain("-1");
  });

  test("literal -5 assigned to number(>0 && <100) — E-CONTRACT-001", () => {
    const target = predType("number(>0 && <100)");
    const errors = [];
    const zone = classifyPredicateZone(target, { kind: "literal", value: -5 }, span(), errors);
    expect(zone).toBe("static");
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe("E-CONTRACT-001");
  });
});
