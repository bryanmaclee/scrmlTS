/**
 * Ext 1 M1.2 — body-DG builder fixture corpus.
 *
 * Verifies `buildBodyDG` (compiler/src/body-dg-builder.ts) — the statement-grain
 * dependency graph over a function body's `LogicStatement[]`. Each fixture
 * asserts the EXACT edge list against an expected DG; edge-direction errors are
 * caught here, not downstream in the M1.3 planner.
 *
 * Per EXT-1-IMPL-BRIEF.md §M1.2 + scope-dive §B.2. ~14 fixtures across the five
 * categories: trivial single-statement, reads/writes edges, control-flow
 * anchors, sql-invalidates, chained-awaits.
 *
 * Statement nodes are built synthetically (the standard analyzer-unit-test
 * pattern); embedded expressions go through the real `parseExprToNode` so
 * `forEachIdentInExprNode` and `emitStringFromTree` behave authentically.
 *
 * CLEAN at S1-S5 — DG construction is observation, not transformation.
 */

import { describe, test, expect } from "bun:test";
import { buildBodyDG } from "../../src/body-dg-builder.ts";
import { parseExprToNode } from "../../src/expression-parser.ts";

// ---------------------------------------------------------------------------
// Synthetic-AST fixture builders
// ---------------------------------------------------------------------------

let __off = 0;
function expr(src) {
  return parseExprToNode(src, "<m1.2-test>", (__off += 100));
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

/** `let <name> = <initSrc>`. */
function letDecl(name, initSrc) {
  return { kind: "let-decl", name, initExpr: initSrc ? expr(initSrc) : undefined };
}

/** `const <name> = <initSrc>`. */
function constDecl(name, initSrc) {
  return { kind: "const-decl", name, initExpr: initSrc ? expr(initSrc) : undefined };
}

/** A bare expression statement — `bareSrc` may be an assignment or a call. */
function bareExpr(bareSrc) {
  return { kind: "bare-expr", exprNode: expr(bareSrc) };
}

/** A bare `?{...}` SQL statement. */
function sqlStmt(query) {
  return { kind: "sql", query, chainedCalls: [] };
}

/** An `if (cond) {...}` statement. */
function ifStmt(condSrc) {
  return { kind: "if-stmt", condExpr: expr(condSrc), consequent: [], alternate: null };
}

/** A `for (x of xs) {...}` statement. */
function forStmt(iterSrc) {
  return { kind: "for-stmt", variable: "item", iterExpr: expr(iterSrc), body: [] };
}

/** A `return <expr>` statement. */
function returnStmt(src) {
  return { kind: "return-stmt", exprNode: expr(src) };
}

/** Normalise an edge list for order-independent comparison. */
function edgeKey(e) {
  return `${e.kind}:${e.from}->${e.to}:${e.via}`;
}
function edgeSet(edges) {
  return edges.map(edgeKey).sort();
}

// ---------------------------------------------------------------------------
// Category 1 — trivial single-statement bodies (no edges)
// ---------------------------------------------------------------------------

describe("M1.2 body-DG — trivial single-statement bodies", () => {
  test("F1: empty body — no nodes, no edges", () => {
    const dg = buildBodyDG([], { server: [], reactive: [] });
    expect(dg.nodes).toEqual([]);
    expect(dg.edges).toEqual([]);
  });

  test("F2: single client state-decl — one node, no edges", () => {
    const body = [stateDecl("count", "0")];
    const dg = buildBodyDG(body, { server: [], reactive: [] });
    expect(dg.nodes.length).toBe(1);
    expect(dg.nodes[0]).toEqual({ index: 0, tier: "client", stmtKind: "state-decl" });
    expect(dg.edges).toEqual([]);
  });

  test("F3: single server SQL statement — server tier, no edges", () => {
    const body = [sqlStmt("SELECT * FROM users")];
    const dg = buildBodyDG(body, { server: [0], reactive: [] });
    expect(dg.nodes[0]).toEqual({ index: 0, tier: "server", stmtKind: "sql" });
    expect(dg.edges).toEqual([]);
  });

  test("F4: single reactive-server state-decl — reactive tier", () => {
    const body = [stateDeclSql("rows", "SELECT * FROM orders")];
    const dg = buildBodyDG(body, { server: [0], reactive: [0] });
    // reactive-server appears in both sets — reported as `reactive`.
    expect(dg.nodes[0].tier).toBe("reactive");
    expect(dg.edges).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Category 2 — explicit reads / writes edges
// ---------------------------------------------------------------------------

describe("M1.2 body-DG — reads / writes edges", () => {
  test("F5: reads edge — later statement references an earlier-declared var", () => {
    // 0: const base = 10
    // 1: const total = base + 1   -> reads(1, 0) via "base"
    const body = [constDecl("base", "10"), constDecl("total", "base + 1")];
    const dg = buildBodyDG(body, { server: [], reactive: [] });
    expect(edgeSet(dg.edges)).toEqual(["reads:1->0:base"]);
  });

  test("F6: reads edge across reactive cell — @-prefix normalisation", () => {
    // 0: <count> = 0
    // 1: <total> = @count + 1   -> reads(1, 0) via "count" (NOT "@count")
    const body = [stateDecl("count", "0"), stateDecl("total", "@count + 1")];
    const dg = buildBodyDG(body, { server: [], reactive: [] });
    expect(edgeSet(dg.edges)).toEqual(["reads:1->0:count"]);
  });

  test("F7: write-write edge — two bare-exprs assign the same reactive cell", () => {
    // 0: @count = 1
    // 1: @count = 2   -> writes(1, 0) via "count"
    const body = [bareExpr("@count = 1"), bareExpr("@count = 2")];
    const dg = buildBodyDG(body, { server: [], reactive: [] });
    expect(edgeSet(dg.edges)).toEqual(["writes:1->0:count"]);
  });

  test("F8: no edge — independent declarations of distinct vars", () => {
    const body = [constDecl("a", "1"), constDecl("b", "2"), constDecl("c", "3")];
    const dg = buildBodyDG(body, { server: [], reactive: [] });
    expect(dg.edges).toEqual([]);
  });

  test("F9: chained reads — a -> b -> c each forms its own edge", () => {
    // 0: const a = 1
    // 1: const b = a + 1   -> reads(1,0):a
    // 2: const c = b + a   -> reads(2,1):b, reads(2,0):a
    const body = [
      constDecl("a", "1"),
      constDecl("b", "a + 1"),
      constDecl("c", "b + a"),
    ];
    const dg = buildBodyDG(body, { server: [], reactive: [] });
    expect(edgeSet(dg.edges)).toEqual([
      "reads:1->0:a",
      "reads:2->0:a",
      "reads:2->1:b",
    ]);
  });

  test("F10: compound-assign reads its own target", () => {
    // 0: <count> = 5
    // 1: @count += 1   -> reads(1,0):count (compound read) + writes(1,0):count
    const body = [stateDecl("count", "5"), bareExpr("@count += 1")];
    const dg = buildBodyDG(body, { server: [], reactive: [] });
    expect(edgeSet(dg.edges)).toEqual([
      "reads:1->0:count",
      "writes:1->0:count",
    ]);
  });
});

// ---------------------------------------------------------------------------
// Category 3 — control-flow anchors
// ---------------------------------------------------------------------------

describe("M1.2 body-DG — control-flow anchors", () => {
  test("F11: if-stmt anchors its predecessor and successor", () => {
    // 0: const a = 1
    // 1: if (a > 0) {}        -> control-anchors(1,0) + reads(1,0):a
    // 2: const b = 2          -> control-anchors(2,1)
    const body = [constDecl("a", "1"), ifStmt("a > 0"), constDecl("b", "2")];
    const dg = buildBodyDG(body, { server: [], reactive: [] });
    expect(dg.nodes[1].stmtKind).toBe("if-stmt");
    expect(edgeSet(dg.edges)).toEqual([
      "control-anchors:1->0:",
      "control-anchors:2->1:",
      "reads:1->0:a",
    ]);
  });

  test("F12: for-stmt at body head anchors only its successor", () => {
    // 0: for (item of xs) {}  -> control-anchors(1,0)
    // 1: const done = 1
    const body = [forStmt("xs"), constDecl("done", "1")];
    const dg = buildBodyDG(body, { server: [], reactive: [] });
    expect(edgeSet(dg.edges)).toEqual(["control-anchors:1->0:"]);
  });

  test("F13: two adjacent control-flow statements anchor each other (deduped)", () => {
    // 0: const a = 1
    // 1: if (a) {}        -> ctrl(1,0) + reads(1,0):a
    // 2: for (x of a) {}  -> ctrl(2,1) + reads(2,0):a
    // The (2,1) anchor is emitted by both stmt-1's successor rule and
    // stmt-2's predecessor rule — the DG dedups it to a single edge.
    const body = [constDecl("a", "1"), ifStmt("a"), forStmt("a")];
    const dg = buildBodyDG(body, { server: [], reactive: [] });
    expect(edgeSet(dg.edges)).toEqual([
      "control-anchors:1->0:",
      "control-anchors:2->1:",
      "reads:1->0:a",
      "reads:2->0:a",
    ]);
  });
});

// ---------------------------------------------------------------------------
// Category 4 — sql-invalidates (table-name match heuristic)
// ---------------------------------------------------------------------------

describe("M1.2 body-DG — sql-invalidates edges", () => {
  test("F14: write-then-select on the same table — invalidates edge", () => {
    // 0: ?{ INSERT INTO users ... }   write: users
    // 1: ?{ SELECT * FROM users }     read: users  -> invalidates(1,0):users
    const body = [
      sqlStmt("INSERT INTO users (name) VALUES ('x')"),
      sqlStmt("SELECT * FROM users"),
    ];
    const dg = buildBodyDG(body, { server: [0, 1], reactive: [] });
    expect(edgeSet(dg.edges)).toEqual(["invalidates:1->0:users"]);
  });

  test("F15: write and select on DIFFERENT tables — no invalidates edge", () => {
    const body = [
      sqlStmt("INSERT INTO orders (id) VALUES (1)"),
      sqlStmt("SELECT * FROM users"),
    ];
    const dg = buildBodyDG(body, { server: [0, 1], reactive: [] });
    expect(dg.edges).toEqual([]);
  });

  test("F16: two SELECTs on the same table — no invalidates (read-read)", () => {
    const body = [
      sqlStmt("SELECT id FROM users"),
      sqlStmt("SELECT name FROM users"),
    ];
    const dg = buildBodyDG(body, { server: [0, 1], reactive: [] });
    expect(dg.edges).toEqual([]);
  });

  test("F17: UPDATE then SELECT — case-insensitive table match", () => {
    const body = [
      sqlStmt("update Users set name = 'x' where id = 1"),
      sqlStmt("select * from USERS"),
    ];
    const dg = buildBodyDG(body, { server: [0, 1], reactive: [] });
    expect(edgeSet(dg.edges)).toEqual(["invalidates:1->0:users"]);
  });
});

// ---------------------------------------------------------------------------
// Category 5 — chained server calls (awaits edges)
// ---------------------------------------------------------------------------

describe("M1.2 body-DG — awaits edges (chained CPS)", () => {
  test("F18: server-init state-decl read downstream — awaits edge", () => {
    // 0: <rows> = ?{ SELECT * FROM orders }   server-init reactive
    // 1: <count> = @rows.length               -> awaits(1,0):rows + reads(1,0):rows
    const body = [
      stateDeclSql("rows", "SELECT * FROM orders"),
      stateDecl("count", "@rows.length"),
    ];
    const dg = buildBodyDG(body, { server: [0], reactive: [0] });
    expect(edgeSet(dg.edges)).toEqual([
      "awaits:1->0:rows",
      "reads:1->0:rows",
    ]);
  });

  test("F19: server-init NOT read downstream — no awaits edge", () => {
    const body = [
      stateDeclSql("rows", "SELECT * FROM orders"),
      stateDecl("other", "0"),
    ];
    const dg = buildBodyDG(body, { server: [0], reactive: [0] });
    expect(dg.edges).toEqual([]);
  });

  test("F20: two chained server-init cells — awaits chains", () => {
    // 0: <a> = ?{ SELECT id FROM t1 }
    // 1: <b> = ?{ SELECT x FROM t2 WHERE id = @a }  reads @a -> awaits(1,0)
    // 2: <c> = @b.x                                  reads @b -> awaits(2,1)
    const body = [
      stateDeclSql("a", "SELECT id FROM t1"),
      { kind: "state-decl", name: "b", initExpr: parseExprToNode("@a", "<t>", 9100),
        sqlNode: { kind: "sql", query: "SELECT x FROM t2 WHERE id = @a", chainedCalls: [] } },
      stateDecl("c", "@b.x"),
    ];
    const dg = buildBodyDG(body, { server: [0, 1], reactive: [0, 1] });
    expect(edgeSet(dg.edges)).toEqual([
      "awaits:1->0:a",
      "awaits:2->1:b",
      "reads:1->0:a",
      "reads:2->1:b",
    ]);
  });
});

// ---------------------------------------------------------------------------
// Node-shape + tier coverage
// ---------------------------------------------------------------------------

describe("M1.2 body-DG — node tier classification", () => {
  test("F21: mixed-tier body — each node carries the right tier", () => {
    // 0: <input> = 0                client
    // 1: ?{ SELECT * FROM t }        server
    // 2: <out> = ?{ INSERT INTO t }  reactive (seam-crossing)
    const body = [
      stateDecl("input", "0"),
      sqlStmt("SELECT * FROM t"),
      stateDeclSql("out", "INSERT INTO t (v) VALUES (1)"),
    ];
    const dg = buildBodyDG(body, { server: [1, 2], reactive: [2] });
    expect(dg.nodes.map((n) => n.tier)).toEqual(["client", "server", "reactive"]);
  });

  test("F22: return-stmt reading a declared var forms a reads edge", () => {
    const body = [constDecl("x", "42"), returnStmt("x + 1")];
    const dg = buildBodyDG(body, { server: [], reactive: [] });
    expect(edgeSet(dg.edges)).toEqual(["reads:1->0:x"]);
  });
});
