/**
 * Tier 2 N+1 Loop Hoist — Detection Tests (§8.10.1, Slice 4)
 *
 * Verifies the Batch Planner detects the §8.10.1 syntactic template:
 *   for (let x of xs) { ... ?{... WHERE col = ${x.field} ...}.get()/.all() ... }
 *
 * Near-miss shapes emit D-BATCH-001 (§8.10, Slice 4 scope is detection
 * only; rewrite lands in Slice 5, protect-column verification in Slice 5+).
 *
 * Coverage — positive:
 *   §1  for-of + WHERE col = ${x.id} + .get() → LoopHoist emitted
 *   §2  .all() terminator also hoistable
 *   §3  key field flows through (keyExpr = "x.<field>")
 *   §4  key column flows through (keyColumn matches SQL)
 *
 * Coverage — near-miss diagnostics:
 *   §5  .run() inside loop → D-BATCH-001 (v1 excludes writes, §8.10.5)
 *   §6  multiple SQL sites in loop body → D-BATCH-001
 *   §7  tuple WHERE (`a = ${x.a} AND b = ${x.b}`) → D-BATCH-001 (§8.10.4)
 *   §8  SQL but no WHERE = ${x.field} pattern → D-BATCH-001
 *
 * Coverage — silent exclusions (no LoopHoist, no diagnostic):
 *   §9  .nobatch() on the loop query → silent exclusion (user asked)
 *   §10 .prepare() — no round trip to hoist, silent
 */

import { describe, test, expect } from "bun:test";
import { runBatchPlanner } from "../../src/batch-planner.ts";

// Hand-built ASTs — sidesteps parser gaps around certain forms.
function forLoopFile(loopBodyStmts, variable = "x") {
  return {
    ast: {
      nodes: [
        {
          kind: "for-stmt",
          id: "loop-1",
          variable,
          iterable: "xs",
          body: loopBodyStmts,
        },
      ],
    },
  };
}

function letDeclWithSql(sqlStr) {
  return { kind: "let-decl", name: "row", init: sqlStr };
}

// ---------------------------------------------------------------------------
// §1
// ---------------------------------------------------------------------------

describe("§1 for-of + `WHERE col = ${x.id}`.get() → LoopHoist emitted", () => {
  test("plan.loopHoists contains one entry", () => {
    const file = forLoopFile([
      letDeclWithSql("?{`SELECT * FROM users WHERE id = ${x.id}`}.get()"),
    ]);
    const { batchPlan } = runBatchPlanner({ files: [file], depGraph: null });
    expect(batchPlan.loopHoists.length).toBe(1);
    const h = batchPlan.loopHoists[0];
    expect(h.loopNode).toBe("loop-1");
    expect(h.terminator).toBe("get");
    expect(batchPlan.diagnostics.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// §2
// ---------------------------------------------------------------------------

describe("§2 `.all()` terminator is also hoistable", () => {
  test("LoopHoist terminator = 'all'", () => {
    const file = forLoopFile([
      letDeclWithSql("?{`SELECT * FROM posts WHERE user_id = ${x.id}`}.all()"),
    ]);
    const { batchPlan } = runBatchPlanner({ files: [file], depGraph: null });
    expect(batchPlan.loopHoists.length).toBe(1);
    expect(batchPlan.loopHoists[0].terminator).toBe("all");
  });
});

// ---------------------------------------------------------------------------
// §3
// ---------------------------------------------------------------------------

describe("§3 key field flows through as keyExpr", () => {
  test("loopVar 'u', field 'authorId' → keyExpr = 'u.authorId'", () => {
    const file = forLoopFile([
      letDeclWithSql("?{`SELECT title FROM posts WHERE user_id = ${u.authorId}`}.all()"),
    ], "u");
    const { batchPlan } = runBatchPlanner({ files: [file], depGraph: null });
    expect(batchPlan.loopHoists.length).toBe(1);
    expect(batchPlan.loopHoists[0].keyExpr).toBe("u.authorId");
  });
});

// ---------------------------------------------------------------------------
// §4
// ---------------------------------------------------------------------------

describe("§4 key column flows through as keyColumn", () => {
  test("WHERE some_column = ${x.id} → keyColumn = 'some_column'", () => {
    const file = forLoopFile([
      letDeclWithSql("?{`SELECT * FROM t WHERE some_column = ${x.id}`}.get()"),
    ]);
    const { batchPlan } = runBatchPlanner({ files: [file], depGraph: null });
    expect(batchPlan.loopHoists.length).toBe(1);
    expect(batchPlan.loopHoists[0].keyColumn).toBe("some_column");
  });
});

// ---------------------------------------------------------------------------
// §5
// ---------------------------------------------------------------------------

describe("§5 `.run()` inside loop → D-BATCH-001 (§8.10.5, writes excluded v1)", () => {
  test("no LoopHoist; diagnostic mentions .run()", () => {
    const file = forLoopFile([
      {
        kind: "bare-expr",
        expr: "?{`UPDATE users SET seen = 1 WHERE id = ${x.id}`}.run()",
      },
    ]);
    const { batchPlan } = runBatchPlanner({ files: [file], depGraph: null });
    expect(batchPlan.loopHoists.length).toBe(0);
    const diag = batchPlan.diagnostics.find((d) => d.loopNode === "loop-1");
    expect(diag).toBeDefined();
    expect(diag.code).toBe("D-BATCH-001");
    expect(diag.reason).toContain(".run()");
  });
});

// ---------------------------------------------------------------------------
// §6
// ---------------------------------------------------------------------------

describe("§6 multiple SQL sites in loop body → D-BATCH-001", () => {
  test("two SQL sites → diagnostic, no hoist", () => {
    const file = forLoopFile([
      letDeclWithSql("?{`SELECT * FROM users WHERE id = ${x.id}`}.get()"),
      letDeclWithSql("?{`SELECT * FROM posts WHERE user_id = ${x.id}`}.all()"),
    ]);
    const { batchPlan } = runBatchPlanner({ files: [file], depGraph: null });
    expect(batchPlan.loopHoists.length).toBe(0);
    const diag = batchPlan.diagnostics.find((d) => d.loopNode === "loop-1");
    expect(diag).toBeDefined();
    expect(diag.reason).toContain("2 SQL queries");
  });
});

// ---------------------------------------------------------------------------
// §7
// ---------------------------------------------------------------------------

describe("§7 tuple WHERE → D-BATCH-001 (§8.10.4 out of v1 scope)", () => {
  test("WHERE a = ${x.a} AND b = ${x.b} → diagnostic, no hoist", () => {
    const file = forLoopFile([
      letDeclWithSql("?{`SELECT * FROM t WHERE a = ${x.aId} AND b = ${x.bId}`}.get()"),
    ]);
    const { batchPlan } = runBatchPlanner({ files: [file], depGraph: null });
    expect(batchPlan.loopHoists.length).toBe(0);
    const diag = batchPlan.diagnostics.find((d) => d.loopNode === "loop-1");
    expect(diag).toBeDefined();
    expect(diag.reason).toContain("tuple");
  });
});

// ---------------------------------------------------------------------------
// §8
// ---------------------------------------------------------------------------

describe("§8 SQL without `WHERE = ${x.field}` pattern → D-BATCH-001", () => {
  test("SELECT without matching WHERE predicate → diagnostic", () => {
    const file = forLoopFile([
      letDeclWithSql("?{`SELECT * FROM users`}.all()"),
    ]);
    const { batchPlan } = runBatchPlanner({ files: [file], depGraph: null });
    expect(batchPlan.loopHoists.length).toBe(0);
    const diag = batchPlan.diagnostics.find((d) => d.loopNode === "loop-1");
    expect(diag).toBeDefined();
    expect(diag.reason).toContain("WHERE");
  });
});

// ---------------------------------------------------------------------------
// §9
// ---------------------------------------------------------------------------

describe("§9 `.nobatch()` on loop query → silent exclusion", () => {
  test("no LoopHoist, no diagnostic — user opted out", () => {
    const file = forLoopFile([
      letDeclWithSql("?{`SELECT * FROM users WHERE id = ${x.id}`}.nobatch().get()"),
    ]);
    const { batchPlan } = runBatchPlanner({ files: [file], depGraph: null });
    expect(batchPlan.loopHoists.length).toBe(0);
    expect(batchPlan.diagnostics.find((d) => d.loopNode === "loop-1")).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// §10
// ---------------------------------------------------------------------------

describe("§10 `.prepare()` terminator → silent (no round trip to hoist)", () => {
  test("no LoopHoist, no diagnostic", () => {
    const file = forLoopFile([
      letDeclWithSql("?{`SELECT * FROM users WHERE id = ${x.id}`}.prepare()"),
    ]);
    const { batchPlan } = runBatchPlanner({ files: [file], depGraph: null });
    expect(batchPlan.loopHoists.length).toBe(0);
    expect(batchPlan.diagnostics.find((d) => d.loopNode === "loop-1")).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// §11 deterministic ordering in serialized plan
// ---------------------------------------------------------------------------

describe("§11 loopHoists serialized deterministically by loopNode id", () => {
  test("two loops → sorted output", () => {
    const file = {
      ast: {
        nodes: [
          {
            kind: "for-stmt",
            id: "z-loop",
            variable: "x",
            body: [letDeclWithSql("?{`SELECT * FROM a WHERE id = ${x.id}`}.get()")],
          },
          {
            kind: "for-stmt",
            id: "a-loop",
            variable: "x",
            body: [letDeclWithSql("?{`SELECT * FROM b WHERE id = ${x.id}`}.get()")],
          },
        ],
      },
    };
    const { batchPlan } = runBatchPlanner({ files: [file], depGraph: null });
    expect(batchPlan.loopHoists.length).toBe(2);
    // Serialized form is sorted
    const { serializeBatchPlan } = require("../../src/batch-planner.ts");
    const parsed = JSON.parse(serializeBatchPlan(batchPlan));
    expect(parsed.loopHoists.map((h) => h.loopNode)).toEqual(["a-loop", "z-loop"]);
  });
});
