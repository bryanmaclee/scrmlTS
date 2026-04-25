/**
 * protect-analyzer — Postgres URI src= support (SPEC §44.2, Phase 2)
 *
 * Coverage:
 *   §A  postgres:// in src= → skips file resolution, uses shadow DB
 *   §B  postgresql:// alias → same
 *   §C  mysql:// in src= → also skips file resolution (Phase 3 symmetry)
 *   §D  Driver URI without CREATE TABLE → E-PA-002 with Phase-2 message
 *   §E  Driver URI with CREATE TABLE in ?{} block → schema validated
 *   §F  Multiple tables across multiple ?{} blocks under one Postgres URI
 *   §G  protect= still works against driver-URI shadow DB
 *
 * No real Postgres is touched. The shadow DB uses bun:sqlite per Phase 1
 * scope decision. Real connection-time introspection is deferred.
 */

import { describe, test, expect } from "bun:test";
import { runPA } from "../../src/protect-analyzer.ts";

// ---------------------------------------------------------------------------
// Local helpers — minimal AST construction (mirrors protect-analyzer.test.js)
// ---------------------------------------------------------------------------

function makeSqlNode(filePath, query, spanStart = 2000) {
  const span = { file: filePath, start: spanStart, end: spanStart + query.length + 4, line: 3, col: 1 };
  return { id: 999, kind: "sql", query, chainedCalls: [], span };
}

function makeDbFileAST(filePath, attrMap, spanStart = 0, extraNodes = []) {
  const attrs = [];
  const dummySpan = { file: filePath, start: spanStart, end: spanStart + 20, line: 1, col: 1 };
  for (const [name, value] of Object.entries(attrMap)) {
    attrs.push({ name, value: { kind: "string-literal", value }, span: dummySpan });
  }
  const blockSpan = { file: filePath, start: spanStart, end: spanStart + 100, line: 1, col: 1 };
  return {
    filePath,
    nodes: [
      ...extraNodes,
      { id: 1, kind: "state", stateType: "db", attrs, children: [], span: blockSpan },
    ],
  };
}

const FAKE_FILE = "/tmp/scrml-fake-pa-pg.scrml";

describe("§A postgres:// src= — shadow DB validation", () => {
  test("postgres:// URI with CREATE TABLE compiles cleanly", () => {
    const sqlNode = makeSqlNode(
      FAKE_FILE,
      "CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT)",
    );
    const ast = makeDbFileAST(FAKE_FILE, {
      src: "postgres://user:pass@localhost:5432/mydb",
      tables: "users",
    }, 0, [sqlNode]);

    const { protectAnalysis, errors } = runPA({ files: [ast] });

    expect(errors.filter(e => e.code !== "E-PA-007")).toHaveLength(0);
    expect(protectAnalysis.views.size).toBe(1);
    const view = protectAnalysis.views.values().next().value;
    expect(view.tables.get("users")).toBeDefined();
  });

  test("schema columns are accessible via shadow DB introspection", () => {
    const sqlNode = makeSqlNode(
      FAKE_FILE,
      "CREATE TABLE users (id INTEGER PRIMARY KEY, email TEXT NOT NULL, created_at TEXT)",
    );
    const ast = makeDbFileAST(FAKE_FILE, {
      src: "postgres://localhost:5432/mydb",
      tables: "users",
    }, 0, [sqlNode]);

    const { protectAnalysis, errors } = runPA({ files: [ast] });
    expect(errors).toHaveLength(0);
    const view = protectAnalysis.views.values().next().value;
    const usersTable = view.tables.get("users");
    const colNames = usersTable.fullSchema.map(c => c.name);
    expect(colNames).toContain("id");
    expect(colNames).toContain("email");
    expect(colNames).toContain("created_at");
  });
});

describe("§B postgresql:// alias", () => {
  test("postgresql:// (alias) routes through the same shadow path", () => {
    const sqlNode = makeSqlNode(
      FAKE_FILE,
      "CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)",
    );
    const ast = makeDbFileAST(FAKE_FILE, {
      src: "postgresql://localhost/mydb",
      tables: "users",
    }, 0, [sqlNode]);

    const { protectAnalysis, errors } = runPA({ files: [ast] });
    expect(errors).toHaveLength(0);
    expect(protectAnalysis.views.size).toBe(1);
  });
});

describe("§C mysql:// — same treatment as postgres:// (Phase 3 symmetry)", () => {
  test("mysql:// URI with CREATE TABLE compiles cleanly", () => {
    const sqlNode = makeSqlNode(
      FAKE_FILE,
      "CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)",
    );
    const ast = makeDbFileAST(FAKE_FILE, {
      src: "mysql://user:pass@localhost:3306/mydb",
      tables: "users",
    }, 0, [sqlNode]);

    const { protectAnalysis, errors } = runPA({ files: [ast] });
    expect(errors).toHaveLength(0);
    expect(protectAnalysis.views.size).toBe(1);
  });
});

describe("§D Driver URI without CREATE TABLE — E-PA-002 with Phase-2 message", () => {
  test("postgres:// without any CREATE TABLE emits E-PA-002", () => {
    const ast = makeDbFileAST(FAKE_FILE, {
      src: "postgres://localhost/mydb",
      tables: "users",
    }, 0, []);

    const { protectAnalysis, errors } = runPA({ files: [ast] });
    const e = errors.find(err => err.code === "E-PA-002");
    expect(e).toBeDefined();
    expect(e.message).toContain("E-PA-002");
    expect(e.message).toContain("postgres://localhost/mydb");
    // Phase-2-specific phrasing
    expect(e.message).toMatch(/Driver URI|introspect|Phase 2/i);
    expect(protectAnalysis.views.size).toBe(0);
  });

  test("mysql:// without CREATE TABLE emits E-PA-002", () => {
    const ast = makeDbFileAST(FAKE_FILE, {
      src: "mysql://localhost/mydb",
      tables: "products",
    }, 0, []);

    const { errors } = runPA({ files: [ast] });
    expect(errors.some(e => e.code === "E-PA-002")).toBe(true);
  });

  test("postgres:// with CREATE TABLE for one of two tables → E-PA-002", () => {
    const sqlNode = makeSqlNode(
      FAKE_FILE,
      "CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)",
    );
    const ast = makeDbFileAST(FAKE_FILE, {
      src: "postgres://localhost/mydb",
      tables: "users, orders",
    }, 0, [sqlNode]);

    const { errors } = runPA({ files: [ast] });
    const e = errors.find(err => err.code === "E-PA-002");
    expect(e).toBeDefined();
    expect(e.message).toContain("orders");
  });
});

describe("§E Driver URI does not touch the filesystem", () => {
  test("postgres:// with a path-like host doesn't accidentally hit the FS", () => {
    // If the implementation accidentally treats postgres://nonexistent/mydb
    // as a file, existsSync would return false and we would fall through to
    // the shadow path anyway — but the diagnostic message would be
    // file-oriented, not driver-oriented. Verify the message is driver-aware.
    const ast = makeDbFileAST(FAKE_FILE, {
      src: "postgres://nonexistent-host/mydb",
      tables: "users",
    }, 0, []);

    const { errors } = runPA({ files: [ast] });
    const e = errors.find(err => err.code === "E-PA-002");
    expect(e).toBeDefined();
    // Driver-aware phrasing — NOT "file does not exist"
    expect(e.message).toMatch(/Driver URI/i);
    expect(e.message).not.toMatch(/file .* does not exist/i);
  });
});

describe("§F Multiple tables across multiple ?{} blocks", () => {
  test("two CREATE TABLE statements in different ?{} blocks both enter shadow DB", () => {
    const usersNode = makeSqlNode(
      FAKE_FILE,
      "CREATE TABLE users (id INTEGER PRIMARY KEY, email TEXT)",
      2000,
    );
    const ordersNode = makeSqlNode(
      FAKE_FILE,
      "CREATE TABLE orders (id INTEGER PRIMARY KEY, user_id INTEGER, total INTEGER)",
      3000,
    );
    const ast = makeDbFileAST(FAKE_FILE, {
      src: "postgres://localhost/mydb",
      tables: "users, orders",
    }, 0, [usersNode, ordersNode]);

    const { protectAnalysis, errors } = runPA({ files: [ast] });
    expect(errors).toHaveLength(0);
    const view = protectAnalysis.views.values().next().value;
    expect(view.tables.get("users")).toBeDefined();
    expect(view.tables.get("orders")).toBeDefined();
    const orderCols = view.tables.get("orders").fullSchema.map(c => c.name);
    expect(orderCols).toContain("user_id");
    expect(orderCols).toContain("total");
  });
});

describe("§G protect= against driver-URI shadow DB", () => {
  test("protect= excludes fields from clientSchema for postgres:// src", () => {
    const sqlNode = makeSqlNode(
      FAKE_FILE,
      "CREATE TABLE users (id INTEGER PRIMARY KEY, email TEXT, passwordHash TEXT)",
    );
    const ast = makeDbFileAST(FAKE_FILE, {
      src: "postgres://localhost/mydb",
      tables: "users",
      protect: "passwordHash",
    }, 0, [sqlNode]);

    const { protectAnalysis, errors } = runPA({ files: [ast] });
    expect(errors).toHaveLength(0);
    const view = protectAnalysis.views.values().next().value;
    const t = view.tables.get("users");
    expect(t.protectedFields.has("passwordHash")).toBe(true);
    expect(t.clientSchema.map(c => c.name)).not.toContain("passwordHash");
    expect(t.fullSchema.map(c => c.name)).toContain("passwordHash");
  });
});
