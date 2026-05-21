/**
 * Ext 1 M1.3 — multi-batch CPS planner fixture corpus.
 *
 * Verifies `planMultiBatchCPS` (compiler/src/cps-batch-planner.ts) — the
 * substantive Ext 1 algorithm: a server-biased topological sort over the M1.2
 * body-DG, contiguous-server-run coalescing into batches, and the two static
 * reject paths (E-CPS-MULTIBATCH-REORDER + E-CPS-MULTIBATCH-MACHINE-CROSSING).
 *
 * Each fixture asserts EXACT batch membership; reject fixtures assert the exact
 * §34 code + the offending statement indices (and the offending edge where the
 * rejection is edge-mediated).
 *
 * Per EXT-1-IMPL-BRIEF.md §M1.3 + scope-dive §B.3. ~20 fixtures across the six
 * categories: single-batch, two-batch admissible, three-batch admissible,
 * cross-batch-dep reject, machine-crossing reject, parameter-passing forward.
 *
 * Fixtures build the body-DG with the real M1.2 `buildBodyDG` so the planner
 * consumes an authentic conservative DG; statement nodes are synthetic (the
 * standard analyzer-unit-test pattern) and embedded expressions go through the
 * real `parseExprToNode`.
 *
 * CLEAN at S1-S5 — S3 is load-bearing: the planner respects all five DG edge
 * kinds and never reorders across a `control-anchors` edge.
 */

import { describe, test, expect } from "bun:test";
import { planMultiBatchCPS } from "../../src/cps-batch-planner.ts";
import { buildBodyDG } from "../../src/body-dg-builder.ts";
import { parseExprToNode } from "../../src/expression-parser.ts";

// ---------------------------------------------------------------------------
// Synthetic-AST fixture builders (mirrors the M1.2 test conventions)
// ---------------------------------------------------------------------------

let __off = 0;
function expr(src) {
  return parseExprToNode(src, "<m1.3-test>", (__off += 100));
}

/** `<name> = <initSrc>` — a reactive state-decl. */
function stateDecl(name, initSrc) {
  return { kind: "state-decl", name, initExpr: initSrc ? expr(initSrc) : undefined };
}

/** `<name> = ?{...}.method()` — a reactive state-decl with a structured sqlNode. */
function stateDeclSql(name, query) {
  return {
    kind: "state-decl",
    name,
    initExpr: undefined,
    sqlNode: { kind: "sql", query, chainedCalls: [] },
  };
}

/** `const <name> = <initSrc>`. */
function constDecl(name, initSrc) {
  return { kind: "const-decl", name, initExpr: initSrc ? expr(initSrc) : undefined };
}

/** A bare expression statement — `bareSrc` may be an assignment or a call. */
function bareExpr(bareSrc) {
  return { kind: "bare-expr", exprNode: expr(bareSrc), span: { start: 0, end: 0 } };
}

/** A bare `?{...}` SQL statement. */
function sqlStmt(query) {
  return { kind: "sql", query, chainedCalls: [] };
}

/** Plan a body — build the DG with the real M1.2 builder, then plan. */
function plan(body, classification) {
  const dg = buildBodyDG(body, classification);
  return planMultiBatchCPS(dg, body);
}

/** A batch's indices, for terse assertions. */
function batchIndices(result) {
  return result.batches.map((b) => b.indices);
}

// ===========================================================================
// Category 1 — single-batch (current behaviour; planner returns 1 batch)
// ===========================================================================

describe("M1.3 planner — single-batch", () => {
  test("F1: empty body — zero batches", () => {
    const r = plan([], { server: [], reactive: [] });
    expect(r.status).toBe("ok");
    expect(r.batches).toEqual([]);
  });

  test("F2: one server statement — one batch", () => {
    const body = [sqlStmt("SELECT * FROM users")];
    const r = plan(body, { server: [0], reactive: [] });
    expect(r.status).toBe("ok");
    expect(batchIndices(r)).toEqual([[0]]);
  });

  test("F3: contiguous server run — one batch", () => {
    // 0,1,2 all server, no client between → one coalesced batch.
    const body = [
      sqlStmt("SELECT * FROM users"),
      sqlStmt("SELECT * FROM orders"),
      sqlStmt("SELECT * FROM items"),
    ];
    const r = plan(body, { server: [0, 1, 2], reactive: [] });
    expect(r.status).toBe("ok");
    expect(batchIndices(r)).toEqual([[0, 1, 2]]);
  });

  test("F4: server work then trailing client — still one batch", () => {
    // 0 server, 1 client. A client AFTER the only server run does not open a
    // second batch (no later server statement).
    const body = [sqlStmt("SELECT * FROM users"), stateDecl("ui", "1")];
    const r = plan(body, { server: [0], reactive: [] });
    expect(r.status).toBe("ok");
    expect(batchIndices(r)).toEqual([[0]]);
  });

  test("F5: reactive-server seam statement is server work — one batch", () => {
    // A reactive-tier state-decl IS server work; it belongs in a server batch.
    const body = [stateDeclSql("rows", "SELECT * FROM orders")];
    const r = plan(body, { server: [0], reactive: [0] });
    expect(r.status).toBe("ok");
    expect(batchIndices(r)).toEqual([[0]]);
  });
});

// ===========================================================================
// Category 2 — two-batch admissible (client statement forces a boundary)
// ===========================================================================

describe("M1.3 planner — two-batch admissible", () => {
  test("F6: server / client / server — two batches", () => {
    // 0 server, 1 client (independent), 2 server. The client between the two
    // server statements forces a batch boundary.
    const body = [
      sqlStmt("SELECT * FROM users"),
      stateDecl("flag", "true"),
      sqlStmt("SELECT * FROM orders"),
    ];
    const r = plan(body, { server: [0, 2], reactive: [] });
    expect(r.status).toBe("ok");
    expect(batchIndices(r)).toEqual([[0], [2]]);
  });

  test("F7: server run / client / server run — two multi-stmt batches", () => {
    const body = [
      sqlStmt("SELECT * FROM a"),
      sqlStmt("SELECT * FROM b"),
      stateDecl("flag", "true"),
      sqlStmt("SELECT * FROM c"),
      sqlStmt("SELECT * FROM d"),
    ];
    const r = plan(body, { server: [0, 1, 3, 4], reactive: [] });
    expect(r.status).toBe("ok");
    expect(batchIndices(r)).toEqual([[0, 1], [3, 4]]);
  });

  test("F8: leading client then server / client / server", () => {
    // 0 client, 1 server, 2 client, 3 server → two batches.
    const body = [
      stateDecl("init", "0"),
      sqlStmt("SELECT * FROM users"),
      stateDecl("mid", "1"),
      sqlStmt("SELECT * FROM orders"),
    ];
    const r = plan(body, { server: [1, 3], reactive: [] });
    expect(r.status).toBe("ok");
    expect(batchIndices(r)).toEqual([[1], [3]]);
  });

  test("F9: two reactive-server seam statements split by client", () => {
    const body = [
      stateDeclSql("users", "SELECT * FROM users"),
      stateDecl("display", "true"),
      stateDeclSql("orders", "SELECT * FROM orders"),
    ];
    const r = plan(body, { server: [0, 2], reactive: [0, 2] });
    expect(r.status).toBe("ok");
    expect(batchIndices(r)).toEqual([[0], [2]]);
  });
});

// ===========================================================================
// Category 3 — three-batch admissible
// ===========================================================================

describe("M1.3 planner — three-batch admissible", () => {
  test("F10: server / client / server / client / server — three batches", () => {
    const body = [
      sqlStmt("SELECT * FROM a"),
      stateDecl("c1", "1"),
      sqlStmt("SELECT * FROM b"),
      stateDecl("c2", "2"),
      sqlStmt("SELECT * FROM c"),
    ];
    const r = plan(body, { server: [0, 2, 4], reactive: [] });
    expect(r.status).toBe("ok");
    expect(batchIndices(r)).toEqual([[0], [2], [4]]);
  });

  test("F11: three multi-stmt batches", () => {
    const body = [
      sqlStmt("SELECT * FROM a"),
      sqlStmt("SELECT * FROM b"),
      stateDecl("c1", "1"),
      sqlStmt("SELECT * FROM c"),
      sqlStmt("SELECT * FROM d"),
      stateDecl("c2", "2"),
      sqlStmt("SELECT * FROM e"),
    ];
    const r = plan(body, { server: [0, 1, 3, 4, 6], reactive: [] });
    expect(r.status).toBe("ok");
    expect(batchIndices(r)).toEqual([[0, 1], [3, 4], [6]]);
  });

  test("F12: three batches with reactive-server seam statements", () => {
    const body = [
      stateDeclSql("a", "SELECT * FROM a"),
      stateDecl("c1", "1"),
      stateDeclSql("b", "SELECT * FROM b"),
      stateDecl("c2", "2"),
      stateDeclSql("c", "SELECT * FROM c"),
    ];
    const r = plan(body, { server: [0, 2, 4], reactive: [0, 2, 4] });
    expect(r.status).toBe("ok");
    expect(batchIndices(r)).toEqual([[0], [2], [4]]);
  });
});

// ===========================================================================
// Category 4 — cross-batch-dep reject (E-CPS-MULTIBATCH-REORDER)
// ===========================================================================

describe("M1.3 planner — cross-batch-dep reject", () => {
  test("F13: SQL write then client then SQL SELECT same table — REJECT", () => {
    // 0 server: INSERT INTO orders
    // 1 client
    // 2 server: SELECT FROM orders  -> invalidates(2,0) crosses batch boundary.
    const body = [
      sqlStmt("INSERT INTO orders (id) VALUES (1)"),
      stateDecl("flag", "true"),
      sqlStmt("SELECT * FROM orders"),
    ];
    const r = plan(body, { server: [0, 2], reactive: [] });
    expect(r.status).toBe("reject");
    expect(r.code).toBe("E-CPS-MULTIBATCH-REORDER");
    expect(r.offendingStmtIndices).toEqual([0, 2]);
    expect(r.offendingEdge.kind).toBe("invalidates");
    expect(r.offendingEdge.via).toBe("orders");
  });

  test("F14: UPDATE then client then SELECT same table — REJECT", () => {
    const body = [
      sqlStmt("UPDATE accounts SET balance = 0"),
      stateDecl("step", "1"),
      sqlStmt("SELECT balance FROM accounts"),
    ];
    const r = plan(body, { server: [0, 2], reactive: [] });
    expect(r.status).toBe("reject");
    expect(r.code).toBe("E-CPS-MULTIBATCH-REORDER");
    expect(r.offendingStmtIndices).toEqual([0, 2]);
    expect(r.offendingEdge.via).toBe("accounts");
  });

  test("F15: cross-batch SQL dep with multi-stmt batches — REJECT", () => {
    const body = [
      sqlStmt("SELECT * FROM users"),
      sqlStmt("DELETE FROM cart WHERE expired = 1"),
      stateDecl("c", "1"),
      sqlStmt("SELECT * FROM cart"),
    ];
    const r = plan(body, { server: [0, 1, 3], reactive: [] });
    expect(r.status).toBe("reject");
    expect(r.code).toBe("E-CPS-MULTIBATCH-REORDER");
    // offending: the DELETE at 1 and the SELECT at 3.
    expect(r.offendingStmtIndices).toEqual([1, 3]);
    expect(r.offendingEdge.via).toBe("cart");
  });

  test("F16: same-table SQL within ONE batch — admissible (no reject)", () => {
    // The write + SELECT are contiguous server statements → one batch → the
    // invalidates edge is satisfied inside one transactional envelope.
    const body = [
      sqlStmt("INSERT INTO orders (id) VALUES (1)"),
      sqlStmt("SELECT * FROM orders"),
    ];
    const r = plan(body, { server: [0, 1], reactive: [] });
    expect(r.status).toBe("ok");
    expect(batchIndices(r)).toEqual([[0, 1]]);
  });
});

// ===========================================================================
// Category 5 — machine-crossing reject (E-CPS-MULTIBATCH-MACHINE-CROSSING)
// ===========================================================================

describe("M1.3 planner — machine-crossing reject", () => {
  test("F17: .advance() in two different batches — REJECT", () => {
    // 0 server: door.advance(.Open)
    // 1 client
    // 2 server: door.advance(.Close)  -> crosses the batch boundary.
    const body = [
      bareExpr("door.advance(.Open)"),
      stateDecl("flag", "true"),
      bareExpr("door.advance(.Close)"),
    ];
    const r = plan(body, { server: [0, 2], reactive: [] });
    expect(r.status).toBe("reject");
    expect(r.code).toBe("E-CPS-MULTIBATCH-MACHINE-CROSSING");
    expect(r.offendingStmtIndices).toEqual([0, 2]);
    expect(r.offendingEdge).toBeUndefined();
  });

  test("F18: two advances in the SAME batch — admissible (no reject)", () => {
    // Open-question resolution (scope-dive §I): two .advance() calls inside
    // ONE batch's serial execution do NOT cross — no diagnostic.
    const body = [
      bareExpr("door.advance(.Open)"),
      bareExpr("door.advance(.Close)"),
    ];
    const r = plan(body, { server: [0, 1], reactive: [] });
    expect(r.status).toBe("ok");
    expect(batchIndices(r)).toEqual([[0, 1]]);
  });

  test("F19: advances on DIFFERENT machines across batches — no crossing", () => {
    // door.advance in batch 0, gate.advance in batch 1 — different receivers,
    // each machine's transitions stay within one batch. Admissible.
    const body = [
      bareExpr("door.advance(.Open)"),
      stateDecl("flag", "true"),
      bareExpr("gate.advance(.Lock)"),
    ];
    const r = plan(body, { server: [0, 2], reactive: [] });
    expect(r.status).toBe("ok");
    expect(batchIndices(r)).toEqual([[0], [2]]);
  });
});

// ===========================================================================
// Category 6 — parameter-passing forward (admissible cross-batch @reactive)
// ===========================================================================

describe("M1.3 planner — parameter-passing forward", () => {
  test("F20: reactive cell written then read in a later batch — admissible", () => {
    // 0 server: <token> = ?{...}  (reactive-server seam, writes @token)
    // 1 client: reads @token
    // 2 server: SELECT using @token interpolation — reads @token again.
    // The @token value forwards as a parameter to batch 1's stub; the
    // `reads` edge on the reactive cell is NOT a reject.
    const body = [
      stateDeclSql("token", "SELECT token FROM sessions"),
      bareExpr("@display = @token"),
      stateDecl("profile", "@token"),
    ];
    const r = plan(body, { server: [0, 2], reactive: [0] });
    expect(r.status).toBe("ok");
    // Two batches — the @token reads forward as a marshalled parameter.
    expect(batchIndices(r)).toEqual([[0], [2]]);
  });

  test("F21: reactive write-write across batches — admissible (param-forward)", () => {
    // A `writes` edge (shared @var) across a batch boundary is the reducible
    // case — the reactive cell forwards as a parameter; no reject.
    const body = [
      stateDeclSql("count", "SELECT COUNT(*) FROM hits"),
      stateDecl("ui", "1"),
      bareExpr("@count = @count + 1"),
    ];
    const r = plan(body, { server: [0], reactive: [0] });
    // Statement 2 is a client reactive assignment — only statement 0 is
    // server. One batch; the write-write edge does not cross a server batch
    // boundary. Admissible.
    expect(r.status).toBe("ok");
    expect(batchIndices(r)).toEqual([[0]]);
  });

  test("F22: chained-CPS awaits edge across batches — admissible", () => {
    // An `awaits` edge (later batch consumes an earlier batch's server result)
    // is exactly the chained-CPS pattern multi-batch CPS supports — never a
    // reject. 0 server produces @rows; 1 client reads it; 2 server reads it.
    const body = [
      stateDeclSql("rows", "SELECT id FROM jobs"),
      bareExpr("@view = @rows"),
      stateDecl("detail", "@rows"),
    ];
    const r = plan(body, { server: [0, 2], reactive: [0] });
    expect(r.status).toBe("ok");
    expect(batchIndices(r)).toEqual([[0], [2]]);
  });
});

// ===========================================================================
// Soundness — S3: the scheduler respects every DG edge kind
// ===========================================================================

describe("M1.3 planner — S3 soundness (edge-respecting schedule)", () => {
  test("F23: topoOrder is a legal topological order of every DG edge", () => {
    // A body mixing reads + invalidates-free SQL — assert the returned
    // topoOrder respects each edge (`to` precedes `from`).
    const body = [
      constDecl("base", "10"),
      sqlStmt("SELECT * FROM users"),
      stateDecl("total", "base + 1"),
    ];
    const dg = buildBodyDG(body, { server: [1], reactive: [] });
    const r = planMultiBatchCPS(dg, body);
    expect(r.status).toBe("ok");
    const pos = new Map(r.topoOrder.map((idx, p) => [idx, p]));
    for (const e of dg.edges) {
      // `e.to` must run before `e.from`.
      expect(pos.get(e.to)).toBeLessThan(pos.get(e.from));
    }
  });

  test("F24: control-anchors edge is never coalesced across", () => {
    // An if-stmt (control flow) between two server statements: the
    // control-anchors fence forces a batch boundary — the planner never
    // coalesces a server run across the control-flow statement.
    const body = [
      sqlStmt("SELECT * FROM a"),
      { kind: "if-stmt", condExpr: expr("true"), consequent: [], alternate: null },
      sqlStmt("SELECT * FROM b"),
    ];
    const dg = buildBodyDG(body, { server: [0, 2], reactive: [] });
    const r = planMultiBatchCPS(dg, body);
    expect(r.status).toBe("ok");
    // The if-stmt is client-tier and forces a boundary → two batches.
    expect(batchIndices(r)).toEqual([[0], [2]]);
    // And the schedule respects every control-anchors edge.
    const pos = new Map(r.topoOrder.map((idx, p) => [idx, p]));
    for (const e of dg.edges) {
      expect(pos.get(e.to)).toBeLessThan(pos.get(e.from));
    }
  });
});
