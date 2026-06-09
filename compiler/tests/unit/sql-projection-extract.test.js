/**
 * sql-projection-extract.test.js — SELECT-projection extraction (SPEC §14.8.7).
 *
 * Unit-level coverage of `extractSelectProjection` (compiler/src/sql-projection.ts):
 * explicit/qualified columns, AS aliases, FROM/JOIN alias maps, and graceful
 * degradation for the deferred long tail (CTE / UNION / subquery-in-FROM /
 * expression columns / SELECT *).
 */

import { describe, test, expect } from "bun:test";
import { extractSelectProjection } from "../../src/sql-projection.ts";

describe("extractSelectProjection — explicit column lists", () => {
  test("single-table bare columns resolve to that table", () => {
    const p = extractSelectProjection("SELECT id, email, role FROM users WHERE id = 1");
    expect(p.resolvable).toBe(true);
    expect(p.fromTables).toEqual(["users"]);
    expect(p.columns.map((c) => [c.outputName, c.kind, c.table, c.column])).toEqual([
      ["id", "column", "users", "id"],
      ["email", "column", "users", "email"],
      ["role", "column", "users", "role"],
    ]);
  });

  test("qualified columns resolve via the FROM/JOIN alias map", () => {
    const q = `
      SELECT
        l.id, l.customer_id, l.origin_city,
        c.name AS customer_name
      FROM loads l
      LEFT JOIN customers c ON c.id = l.customer_id
      ORDER BY l.pickup_at ASC
    `;
    const p = extractSelectProjection(q);
    expect(p.resolvable).toBe(true);
    expect(p.aliasMap.get("l")).toBe("loads");
    expect(p.aliasMap.get("c")).toBe("customers");
    expect(p.fromTables).toEqual(["loads", "customers"]);
    const byName = Object.fromEntries(p.columns.map((c) => [c.outputName, c]));
    expect(byName["id"].kind).toBe("column");
    expect(byName["id"].table).toBe("loads");
    expect(byName["id"].column).toBe("id");
    // AS alias: output field `customer_name`, sourced from customers.name.
    expect(byName["customer_name"].kind).toBe("column");
    expect(byName["customer_name"].table).toBe("customers");
    expect(byName["customer_name"].column).toBe("name");
  });

  test("AS alias is case-insensitive and trims interpolations", () => {
    const p = extractSelectProjection(
      "SELECT id, email FROM users WHERE id = ${userId}",
    );
    expect(p.resolvable).toBe(true);
    expect(p.columns.map((c) => c.outputName)).toEqual(["id", "email"]);
  });

  test("FROM table AS alias form", () => {
    const p = extractSelectProjection("SELECT u.email FROM users AS u");
    expect(p.resolvable).toBe(true);
    expect(p.aliasMap.get("u")).toBe("users");
    expect(p.columns[0].table).toBe("users");
    expect(p.columns[0].column).toBe("email");
  });
});

describe("extractSelectProjection — graceful degradation", () => {
  test("expression column is opaque; rest of the row stays typed", () => {
    const p = extractSelectProjection(
      "SELECT id, (SELECT COUNT(1) FROM assignments WHERE load_id = l.id) AS n FROM loads l",
    );
    expect(p.resolvable).toBe(true);
    const byName = Object.fromEntries(p.columns.map((c) => [c.outputName, c]));
    expect(byName["id"].kind).toBe("column");
    expect(byName["n"].kind).toBe("opaque");
  });

  test("function-call column is opaque", () => {
    const p = extractSelectProjection("SELECT id, COUNT(*) AS total FROM loads");
    expect(p.resolvable).toBe(true);
    const byName = Object.fromEntries(p.columns.map((c) => [c.outputName, c]));
    expect(byName["id"].kind).toBe("column");
    expect(byName["total"].kind).toBe("opaque");
  });

  test("SELECT * single-table → star with resolved table", () => {
    const p = extractSelectProjection("SELECT * FROM users WHERE id = 1");
    expect(p.resolvable).toBe(true);
    expect(p.columns.length).toBe(1);
    expect(p.columns[0].kind).toBe("star");
    expect(p.fromTables).toEqual(["users"]);
  });

  test("ambiguous bare column under a JOIN is opaque", () => {
    const p = extractSelectProjection("SELECT name FROM loads l JOIN customers c ON c.id = l.customer_id");
    expect(p.resolvable).toBe(true);
    expect(p.columns[0].kind).toBe("opaque");
  });

  test("CTE / WITH is whole-row unresolvable", () => {
    const p = extractSelectProjection("WITH x AS (SELECT 1) SELECT * FROM x");
    expect(p.resolvable).toBe(false);
    expect(p.unresolvableReason).toMatch(/SELECT/);
  });

  test("UNION is whole-row unresolvable", () => {
    const p = extractSelectProjection("SELECT id FROM a UNION SELECT id FROM b");
    expect(p.resolvable).toBe(false);
    expect(p.unresolvableReason).toMatch(/UNION/);
  });

  test("subquery-in-FROM is whole-row unresolvable", () => {
    const p = extractSelectProjection("SELECT t.id FROM (SELECT id FROM users) t");
    expect(p.resolvable).toBe(false);
    expect(p.unresolvableReason).toMatch(/subquery/);
  });

  test("INSERT / UPDATE / DELETE are unresolvable", () => {
    expect(extractSelectProjection("INSERT INTO users (email) VALUES (${e})").resolvable).toBe(false);
    expect(extractSelectProjection("UPDATE users SET email = ${e} WHERE id = ${i}").resolvable).toBe(false);
    expect(extractSelectProjection("DELETE FROM users WHERE id = ${i}").resolvable).toBe(false);
  });

  test("empty query is unresolvable", () => {
    expect(extractSelectProjection("").resolvable).toBe(false);
    expect(extractSelectProjection("   ").resolvable).toBe(false);
  });
});
