// ---------------------------------------------------------------------------
// Lin Batch A test additions
// To apply: append this file content to compiler/tests/unit/type-system.test.js
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Lin-A1: lift-as-move — lift consumes a lin variable
// ---------------------------------------------------------------------------

describe("Lin-A1: lift-expr consumes lin variable", () => {
  test("lift x where x is lin — x is consumed (no E-LIN-001)", () => {
    const errors = [];
    checkLinear([
      { kind: "lin-decl", name: "token", span: span(0) },
      // lift-expr with expr: { kind: "expr", expr: "token" }
      { kind: "lift-expr", expr: { kind: "expr", expr: "token" }, span: span(10) },
    ], errors);
    // token consumed by lift — no errors expected
    expect(errors.filter(e => e.code === "E-LIN-001")).toHaveLength(0);
    expect(errors.filter(e => e.code === "E-LIN-002")).toHaveLength(0);
  });

  test("lift x then use x again — E-LIN-002 fires", () => {
    const errors = [];
    checkLinear([
      { kind: "lin-decl", name: "token", span: span(0) },
      { kind: "lift-expr", expr: { kind: "expr", expr: "token" }, span: { file: "/test/app.scrml", start: 10, end: 20, line: 3, col: 1 } },
      { kind: "lin-ref",   name: "token", span: { file: "/test/app.scrml", start: 30, end: 40, line: 5, col: 1 } },
    ], errors);
    const e = errors.filter(e => e.code === "E-LIN-002");
    expect(e.length).toBeGreaterThan(0);
    expect(e[0].message).toContain("token");
  });

  test("E-LIN-002 message mentions lift site line number", () => {
    const errors = [];
    checkLinear([
      { kind: "lin-decl", name: "tok", span: span(0) },
      { kind: "lift-expr", expr: { kind: "expr", expr: "tok" }, span: { file: "/test/app.scrml", start: 10, end: 20, line: 7, col: 1 } },
      { kind: "lin-ref",   name: "tok", span: { file: "/test/app.scrml", start: 30, end: 40, line: 9, col: 1 } },
    ], errors);
    const e = errors.filter(e => e.code === "E-LIN-002");
    expect(e.length).toBeGreaterThan(0);
    // The message must mention the lift site line number (7)
    expect(e[0].message).toContain("lift");
    expect(e[0].message).toContain("7");
  });

  test("lift x (non-lin) — no effect on lin tracking, no errors", () => {
    const errors = [];
    // No lin-decl for 'result' — lift of non-lin var should produce no errors
    checkLinear([
      { kind: "lift-expr", expr: { kind: "expr", expr: "result" }, span: span(0) },
    ], errors);
    expect(errors.filter(e => e.code === "E-LIN-001" || e.code === "E-LIN-002")).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Lin-A2: tilde double-obligation — investigation result
// ---------------------------------------------------------------------------
// Finding: The existing TildeTracker already handles ~ double-obligation via
// E-TILDE-002 (re-init without consumption). The hand-off-134.md description
// ("~ double-obligation trap when lifting lin values") is covered by:
//   1. E-TILDE-002 for the `~` accumulator side (already tested in §41)
//   2. Lin-A1 fix for the lift-of-lin-var side (tested above in Lin-A1)
// The combination of both is the complete fix.
//
// Verification test: lift a lin variable into ~ context (simulate the trap).
describe("Lin-A2: tilde + lin double-obligation investigation", () => {
  test("tilde reinit without consumption still produces E-TILDE-002 (existing behavior verified)", () => {
    // This verifies the existing E-TILDE-002 behavior is not regressed.
    const errors = [];
    checkLinear([
      { kind: "tilde-init", span: span(0) },   // ~ = firstValue
      { kind: "tilde-init", span: span(5) },   // ~ = secondValue (overwrites without consuming)
      { kind: "tilde-ref",  span: span(10) },  // consume ~ to avoid E-TILDE-002 at scope exit
    ], errors);
    const e = errors.filter(e => e.code === "E-TILDE-002");
    expect(e.length).toBeGreaterThan(0);
  });

  test("lift lin-var consumed once via lift, then used again — E-LIN-002 with lift note (Lin-A2 + Lin-A1 integration)", () => {
    // This is the double-obligation trap: developer lifts a lin variable thinking
    // lift returns a value, then tries to use the lin variable again.
    const errors = [];
    checkLinear([
      { kind: "lin-decl", name: "payment", span: span(0) },
      { kind: "lift-expr", expr: { kind: "expr", expr: "payment" }, span: { file: "/test/app.scrml", start: 10, end: 20, line: 3, col: 5 } },
      { kind: "lin-ref",   name: "payment", span: { file: "/test/app.scrml", start: 30, end: 40, line: 5, col: 5 } },
    ], errors);
    const e = errors.filter(e => e.code === "E-LIN-002");
    expect(e.length).toBeGreaterThan(0);
    // Message should explain that lift consumed the variable
    expect(e[0].message).toMatch(/lift/i);
    expect(e[0].message).toContain("payment");
  });
});

// ---------------------------------------------------------------------------
// Lin-A3: Loop-body carve-out — lin declared-and-consumed within one iteration
// ---------------------------------------------------------------------------

describe("Lin-A3: loop-body carve-out — lin declared and consumed in same iteration", () => {
  test("lin declared and consumed within a for-loop body — no error (carve-out)", () => {
    const errors = [];
    checkLinear([
      {
        kind: "for-loop",
        span: span(0),
        body: [
          { kind: "lin-decl", name: "token", span: span(5) },
          { kind: "lin-ref",  name: "token", span: span(10) }, // consumed in same iteration
        ],
      },
    ], errors);
    // Both declared and consumed within the loop — no errors expected
    expect(errors.filter(e => e.code === "E-LIN-001" || e.code === "E-LIN-002")).toHaveLength(0);
  });

  test("lin declared outside loop, used inside — E-LIN-002 (existing rejection preserved)", () => {
    const errors = [];
    checkLinear([
      { kind: "lin-decl", name: "token", span: span(0) },
      {
        kind: "for-loop",
        span: span(5),
        body: [
          { kind: "lin-ref", name: "token", span: span(10) }, // outer lin var used inside loop
        ],
      },
    ], errors);
    const e = errors.filter(e => e.code === "E-LIN-002");
    expect(e.length).toBeGreaterThan(0);
    expect(e[0].message).toContain("token");
    expect(e[0].message).toContain("loop");
  });

  test("lin declared in loop body but NOT consumed — E-LIN-001", () => {
    const errors = [];
    checkLinear([
      {
        kind: "for-loop",
        span: span(0),
        body: [
          { kind: "lin-decl", name: "token", span: span(5) },
          // No lin-ref — token declared but never consumed
        ],
      },
    ], errors);
    const e = errors.filter(e => e.code === "E-LIN-001");
    expect(e.length).toBeGreaterThan(0);
    expect(e[0].message).toContain("token");
  });

  test("lin declared in loop body, consumed twice — E-LIN-002", () => {
    const errors = [];
    checkLinear([
      {
        kind: "for-loop",
        span: span(0),
        body: [
          { kind: "lin-decl", name: "token", span: span(5) },
          { kind: "lin-ref",  name: "token", span: span(10) },
          { kind: "lin-ref",  name: "token", span: span(15) }, // second use in same iteration
        ],
      },
    ], errors);
    const e = errors.filter(e => e.code === "E-LIN-002");
    expect(e.length).toBeGreaterThan(0);
    expect(e[0].message).toContain("token");
  });

  test("while-loop body with lin declared and consumed — no error (carve-out applies to while too)", () => {
    const errors = [];
    checkLinear([
      {
        kind: "while-loop",
        span: span(0),
        body: [
          { kind: "lin-decl", name: "tok", span: span(5) },
          { kind: "lin-ref",  name: "tok", span: span(10) },
        ],
      },
    ], errors);
    expect(errors.filter(e => e.code === "E-LIN-001" || e.code === "E-LIN-002")).toHaveLength(0);
  });
});
