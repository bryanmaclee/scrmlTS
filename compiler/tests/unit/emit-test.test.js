import { describe, it, expect } from "bun:test";
import { generateTestJs } from "../../src/codegen/emit-test.ts";

// ---------------------------------------------------------------------------
// generateTestJs — empty / null cases
// ---------------------------------------------------------------------------

describe("generateTestJs — empty testGroups returns null", () => {
  it("returns null when testGroups array is empty", () => {
    const result = generateTestJs("/src/app.scrml", []);
    expect(result).toBeNull();
  });

  it("returns null when called with default empty scopeSnapshot", () => {
    const result = generateTestJs("/src/app.scrml", [], []);
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// generateTestJs — single test group with one test case
// ---------------------------------------------------------------------------

describe("generateTestJs — single test group structure", () => {
  it("produces outer describe with filename", () => {
    const groups = [
      {
        name: null,
        line: 5,
        tests: [
          {
            name: "basic",
            line: 6,
            body: ["assert 1 == 1"],
            asserts: [{ raw: "1 == 1", op: "==", lhs: "1", rhs: "1" }],
          },
        ],
        before: null,
        after: null,
      },
    ];
    const result = generateTestJs("/src/counter.scrml", groups);
    expect(result).toContain('describe("counter.scrml", () => {');
  });

  it("produces inner describe with line number when group name is null", () => {
    const groups = [
      {
        name: null,
        line: 10,
        tests: [],
        before: null,
        after: null,
      },
    ];
    const result = generateTestJs("/src/app.scrml", groups);
    expect(result).toContain('describe("(line 10)", () => {');
  });

  it("produces inner describe with name and line number when group has name", () => {
    const groups = [
      {
        name: "counter logic",
        line: 3,
        tests: [],
        before: null,
        after: null,
      },
    ];
    const result = generateTestJs("/src/app.scrml", groups);
    expect(result).toContain('describe("counter logic (line 3)", () => {');
  });

  it("produces test() with case name", () => {
    const groups = [
      {
        name: null,
        line: 1,
        tests: [
          {
            name: "increments correctly",
            line: 2,
            body: [],
            asserts: [],
          },
        ],
        before: null,
        after: null,
      },
    ];
    const result = generateTestJs("/src/app.scrml", groups);
    expect(result).toContain('test("increments correctly", () => {');
  });

  it("uses (anonymous) as fallback case name for empty string name", () => {
    const groups = [
      {
        name: null,
        line: 1,
        tests: [
          {
            name: "",
            line: 2,
            body: [],
            asserts: [],
          },
        ],
        before: null,
        after: null,
      },
    ];
    const result = generateTestJs("/src/app.scrml", groups);
    expect(result).toContain('test("(anonymous)", () => {');
  });
});

// ---------------------------------------------------------------------------
// generateTestJs — assert compilation operators
// ---------------------------------------------------------------------------

describe("generateTestJs — assert operator compilation", () => {
  function makeGroupWithAssert(op, lhs, rhs) {
    return [
      {
        name: null,
        line: 1,
        tests: [
          {
            name: "test",
            line: 2,
            body: [`assert ${lhs} ${op} ${rhs}`],
            asserts: [{ raw: `${lhs} ${op} ${rhs}`, op, lhs, rhs }],
          },
        ],
        before: null,
        after: null,
      },
    ];
  }

  it("assert a == b → expect(a).toEqual(b)", () => {
    const result = generateTestJs("/src/app.scrml", makeGroupWithAssert("==", "x", "5"));
    expect(result).toContain("expect(x).toEqual(5);");
  });

  it("assert a != b → expect(a).not.toEqual(b)", () => {
    const result = generateTestJs("/src/app.scrml", makeGroupWithAssert("!=", "x", "0"));
    expect(result).toContain("expect(x).not.toEqual(0);");
  });

  it("assert a > b → expect(a).toBeGreaterThan(b)", () => {
    const result = generateTestJs("/src/app.scrml", makeGroupWithAssert(">", "count", "0"));
    expect(result).toContain("expect(count).toBeGreaterThan(0);");
  });

  it("assert a >= b → expect(a).toBeGreaterThanOrEqual(b)", () => {
    const result = generateTestJs("/src/app.scrml", makeGroupWithAssert(">=", "count", "1"));
    expect(result).toContain("expect(count).toBeGreaterThanOrEqual(1);");
  });

  it("assert a < b → expect(a).toBeLessThan(b)", () => {
    const result = generateTestJs("/src/app.scrml", makeGroupWithAssert("<", "count", "10"));
    expect(result).toContain("expect(count).toBeLessThan(10);");
  });

  it("assert a <= b → expect(a).toBeLessThanOrEqual(b)", () => {
    const result = generateTestJs("/src/app.scrml", makeGroupWithAssert("<=", "count", "5"));
    expect(result).toContain("expect(count).toBeLessThanOrEqual(5);");
  });

  it("bare assert expr (no op) → expect(expr).toBeTruthy()", () => {
    const groups = [
      {
        name: null,
        line: 1,
        tests: [
          {
            name: "check",
            line: 2,
            body: ["assert isValid"],
            asserts: [{ raw: "isValid", op: null, lhs: null, rhs: null }],
          },
        ],
        before: null,
        after: null,
      },
    ];
    const result = generateTestJs("/src/app.scrml", groups);
    expect(result).toContain("expect(isValid).toBeTruthy();");
  });
});

// ---------------------------------------------------------------------------
// generateTestJs — scope isolation with beforeEach
// ---------------------------------------------------------------------------

describe("generateTestJs — scope isolation with beforeEach", () => {
  it("emits let declarations for scope vars", () => {
    const groups = [
      {
        name: null,
        line: 1,
        tests: [{ name: "t", line: 2, body: [], asserts: [] }],
        before: null,
        after: null,
      },
    ];
    const scopeSnapshot = [
      { name: "_scrml_s_count", initValue: "0" },
      { name: "_scrml_s_label", initValue: '""' },
    ];
    const result = generateTestJs("/src/app.scrml", groups, scopeSnapshot);
    expect(result).toContain("let _scrml_s_count = 0;");
    expect(result).toContain('let _scrml_s_label = "";');
  });

  it("emits beforeEach with scope var resets when scopeSnapshot is provided", () => {
    const groups = [
      {
        name: null,
        line: 1,
        tests: [{ name: "t", line: 2, body: [], asserts: [] }],
        before: null,
        after: null,
      },
    ];
    const scopeSnapshot = [{ name: "count", initValue: "0" }];
    const result = generateTestJs("/src/app.scrml", groups, scopeSnapshot);
    expect(result).toContain("beforeEach(() => {");
    expect(result).toContain("count = 0;");
  });

  it("emits beforeEach with before{} statements when group has before block", () => {
    const groups = [
      {
        name: null,
        line: 1,
        tests: [{ name: "t", line: 2, body: [], asserts: [] }],
        before: ["const db = setupTestDb()", "db.seed()"],
        after: null,
      },
    ];
    const result = generateTestJs("/src/app.scrml", groups);
    expect(result).toContain("beforeEach(() => {");
    expect(result).toContain("const db = setupTestDb()");
    expect(result).toContain("db.seed()");
  });

  it("does NOT emit beforeEach when no scope vars and no before block", () => {
    const groups = [
      {
        name: null,
        line: 1,
        tests: [{ name: "t", line: 2, body: [], asserts: [] }],
        before: null,
        after: null,
      },
    ];
    const result = generateTestJs("/src/app.scrml", groups);
    expect(result).not.toContain("beforeEach");
  });

  it("does NOT emit beforeEach for empty before array", () => {
    const groups = [
      {
        name: null,
        line: 1,
        tests: [{ name: "t", line: 2, body: [], asserts: [] }],
        before: [],
        after: null,
      },
    ];
    const result = generateTestJs("/src/app.scrml", groups);
    expect(result).not.toContain("beforeEach");
  });
});

// ---------------------------------------------------------------------------
// generateTestJs — multiple test groups
// ---------------------------------------------------------------------------

describe("generateTestJs — multiple test groups", () => {
  it("emits multiple inner describe blocks for multiple groups", () => {
    const groups = [
      {
        name: "increment",
        line: 5,
        tests: [{ name: "adds one", line: 6, body: [], asserts: [{ raw: "count == 1", op: "==", lhs: "count", rhs: "1" }] }],
        before: null,
        after: null,
      },
      {
        name: "decrement",
        line: 15,
        tests: [{ name: "subtracts one", line: 16, body: [], asserts: [{ raw: "count == -1", op: "==", lhs: "count", rhs: "-1" }] }],
        before: null,
        after: null,
      },
    ];
    const result = generateTestJs("/src/counter.scrml", groups);
    expect(result).toContain('describe("increment (line 5)", () => {');
    expect(result).toContain('describe("decrement (line 15)", () => {');
    expect(result).toContain("expect(count).toEqual(1);");
    expect(result).toContain("expect(count).toEqual(-1);");
  });

  it("all groups wrapped in a single outer describe", () => {
    const groups = [
      { name: "a", line: 1, tests: [], before: null, after: null },
      { name: "b", line: 2, tests: [], before: null, after: null },
    ];
    const result = generateTestJs("/src/app.scrml", groups);
    // Should be exactly one outer describe
    const outerDescribeCount = (result.match(/^describe\(/gm) || []).length;
    expect(outerDescribeCount).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// generateTestJs — import statement
// ---------------------------------------------------------------------------

describe("generateTestJs — import statement", () => {
  it("always imports test, expect, describe from bun:test", () => {
    const groups = [
      { name: null, line: 1, tests: [], before: null, after: null },
    ];
    const result = generateTestJs("/src/app.scrml", groups);
    expect(result).toContain('from "bun:test"');
    expect(result).toContain("test");
    expect(result).toContain("expect");
    expect(result).toContain("describe");
  });

  it("includes beforeEach in import when group has before block", () => {
    const groups = [
      {
        name: null,
        line: 1,
        tests: [{ name: "t", line: 2, body: [], asserts: [] }],
        before: ["setup()"],
        after: null,
      },
    ];
    const result = generateTestJs("/src/app.scrml", groups);
    expect(result).toContain("beforeEach");
    expect(result).toMatch(/import \{[^}]*beforeEach[^}]*\} from "bun:test"/);
  });

  it("does NOT include beforeEach in import when no before blocks or scope vars", () => {
    const groups = [
      {
        name: null,
        line: 1,
        tests: [{ name: "t", line: 2, body: [], asserts: [] }],
        before: null,
        after: null,
      },
    ];
    const result = generateTestJs("/src/app.scrml", groups);
    expect(result).not.toMatch(/import \{[^}]*beforeEach[^}]*\}/);
  });
});

// ---------------------------------------------------------------------------
// generateTestJs — non-assert body statements
// ---------------------------------------------------------------------------

describe("generateTestJs — non-assert body statements", () => {
  it("emits non-assert setup statements before assert calls", () => {
    const groups = [
      {
        name: null,
        line: 1,
        tests: [
          {
            name: "with setup",
            line: 2,
            body: ["const x = compute()", "assert x == 42"],
            asserts: [{ raw: "x == 42", op: "==", lhs: "x", rhs: "42" }],
          },
        ],
        before: null,
        after: null,
      },
    ];
    const result = generateTestJs("/src/app.scrml", groups);
    expect(result).toContain("const x = compute()");
    expect(result).toContain("expect(x).toEqual(42);");
    // Setup should come before assert in the output
    const setupIdx = result.indexOf("const x = compute()");
    const assertIdx = result.indexOf("expect(x).toEqual(42)");
    expect(setupIdx).toBeLessThan(assertIdx);
  });
});

// ---------------------------------------------------------------------------
// generateTestJs — filename extraction
// ---------------------------------------------------------------------------

describe("generateTestJs — filename extraction", () => {
  it("uses basename only for the outer describe label", () => {
    const groups = [
      { name: null, line: 1, tests: [], before: null, after: null },
    ];
    const result = generateTestJs("/very/long/path/to/my-component.scrml", groups);
    expect(result).toContain('describe("my-component.scrml", () => {');
    expect(result).not.toContain("/very/long/path");
  });
});
