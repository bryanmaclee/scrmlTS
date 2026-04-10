/**
 * Nested <program db="..."> — Scoped DB Context (§4.12.6)
 *
 * Tests:
 *   §A  rewriteSqlRefs accepts dbVar parameter
 *   §B  emitLogicNode SQL uses scoped dbVar from opts
 *   §C  emitLogicNode transaction-block uses scoped dbVar
 *   §D  Default dbVar is _scrml_db (backward compat)
 */

import { describe, test, expect } from "bun:test";
import { rewriteSqlRefs } from "../../src/codegen/rewrite.ts";
import { emitLogicNode } from "../../src/codegen/emit-logic.ts";

describe("§A rewriteSqlRefs with dbVar parameter (§4.12.6)", () => {
  test("default dbVar produces _scrml_db", () => {
    const result = rewriteSqlRefs("?{`SELECT * FROM users`}.all()");
    expect(result).toContain("_scrml_db.query");
  });

  test("custom dbVar produces scoped variable", () => {
    const result = rewriteSqlRefs("?{`SELECT * FROM metrics`}.all()", "_scrml_db_1");
    expect(result).toContain("_scrml_db_1.query");
    expect(result).not.toContain("_scrml_db.query");
  });

  test("custom dbVar works with .prepare()", () => {
    const result = rewriteSqlRefs("?{`INSERT INTO logs (msg) VALUES (?1)`}.prepare()", "_scrml_db_2");
    expect(result).toContain("_scrml_db_2.prepare");
  });
});

describe("§B emitLogicNode SQL with scoped dbVar (§4.12.6)", () => {
  test("sql node uses default _scrml_db", () => {
    const node = {
      kind: "sql",
      query: "SELECT * FROM users",
      chainedCalls: [{ method: "all" }],
      span: { file: "test.scrml", start: 0, end: 20, line: 1, col: 1 },
    };
    const result = emitLogicNode(node);
    expect(result).toContain("_scrml_db.query");
  });

  test("sql node uses scoped dbVar from opts", () => {
    const node = {
      kind: "sql",
      query: "SELECT * FROM metrics",
      chainedCalls: [{ method: "all" }],
      span: { file: "test.scrml", start: 0, end: 20, line: 1, col: 1 },
    };
    const result = emitLogicNode(node, { dbVar: "_scrml_db_1" });
    expect(result).toContain("_scrml_db_1.query");
    expect(result).not.toContain("_scrml_db.query");
  });

  test("sql node inherits _dbVar annotation from node", () => {
    const node = {
      kind: "sql",
      query: "SELECT * FROM events",
      chainedCalls: [{ method: "first" }],
      span: { file: "test.scrml", start: 0, end: 20, line: 1, col: 1 },
      _dbVar: "_scrml_db_3",
    };
    const result = emitLogicNode(node);
    expect(result).toContain("_scrml_db_3.query");
  });
});

describe("§C transaction-block with scoped dbVar (§4.12.6)", () => {
  test("transaction uses scoped dbVar for BEGIN/COMMIT/ROLLBACK", () => {
    const node = {
      kind: "transaction-block",
      body: [],
      span: { file: "test.scrml", start: 0, end: 20, line: 1, col: 1 },
    };
    const result = emitLogicNode(node, { dbVar: "_scrml_db_2" });
    expect(result).toContain('_scrml_db_2.exec("BEGIN")');
    expect(result).toContain('_scrml_db_2.exec("COMMIT")');
    expect(result).toContain('_scrml_db_2.exec("ROLLBACK")');
    expect(result).not.toContain("_scrml_db.exec");
  });
});

describe("§D backward compatibility", () => {
  test("no dbVar parameter defaults to _scrml_db everywhere", () => {
    const sqlResult = rewriteSqlRefs("?{`SELECT 1`}.all()");
    expect(sqlResult).toContain("_scrml_db");

    const node = {
      kind: "sql",
      query: "SELECT 1",
      chainedCalls: [{ method: "all" }],
      span: { file: "test.scrml", start: 0, end: 10, line: 1, col: 1 },
    };
    const emitResult = emitLogicNode(node);
    expect(emitResult).toContain("_scrml_db");
  });
});
