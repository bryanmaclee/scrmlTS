/**
 * resolveDbDriver — driver URI prefix classification (SPEC §44.2)
 *
 * Tests:
 *   §A  SQLite forms — file paths, sqlite: prefix, :memory:
 *   §B  PostgreSQL forms — postgres:// and postgresql://
 *   §C  MySQL forms — mysql:// (Phase 3 — recognized but not yet runtime)
 *   §D  Unsupported / negative — empty, MongoDB, typo'd schemes
 *   §E  Connection string passthrough (no mutation)
 */

import { describe, test, expect } from "bun:test";
import { resolveDbDriver, isSupportedDbUri } from "../../src/codegen/db-driver.ts";

describe("§A SQLite driver resolution", () => {
  test(":memory: → sqlite", () => {
    const r = resolveDbDriver(":memory:");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.info.driver).toBe("sqlite");
      expect(r.info.connectionString).toBe(":memory:");
    }
  });

  test("sqlite: prefix → sqlite", () => {
    const r = resolveDbDriver("sqlite:./app.db");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.info.driver).toBe("sqlite");
      expect(r.info.connectionString).toBe("sqlite:./app.db");
    }
  });

  test("relative path ./app.db → sqlite", () => {
    const r = resolveDbDriver("./app.db");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.info.driver).toBe("sqlite");
  });

  test("parent-relative path ../db.sqlite → sqlite", () => {
    const r = resolveDbDriver("../db.sqlite");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.info.driver).toBe("sqlite");
  });

  test("absolute path /tmp/app.db → sqlite", () => {
    const r = resolveDbDriver("/tmp/app.db");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.info.driver).toBe("sqlite");
  });

  test("bare filename app.db → sqlite (heuristic)", () => {
    const r = resolveDbDriver("app.db");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.info.driver).toBe("sqlite");
  });

  test("leading/trailing whitespace trimmed", () => {
    const r = resolveDbDriver("  ./app.db  ");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.info.driver).toBe("sqlite");
      expect(r.info.connectionString).toBe("./app.db");
    }
  });
});

describe("§B PostgreSQL driver resolution", () => {
  test("postgres:// → postgres", () => {
    const r = resolveDbDriver("postgres://user:pass@localhost:5432/mydb");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.info.driver).toBe("postgres");
      expect(r.info.connectionString).toBe("postgres://user:pass@localhost:5432/mydb");
    }
  });

  test("postgresql:// alias → postgres", () => {
    const r = resolveDbDriver("postgresql://user:pass@localhost:5432/mydb");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.info.driver).toBe("postgres");
      expect(r.info.connectionString).toBe("postgresql://user:pass@localhost:5432/mydb");
    }
  });

  test("postgres:// with no credentials", () => {
    const r = resolveDbDriver("postgres://localhost/mydb");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.info.driver).toBe("postgres");
  });

  test("postgres:// with query params preserved", () => {
    const uri = "postgres://user@localhost/mydb?sslmode=require";
    const r = resolveDbDriver(uri);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.info.connectionString).toBe(uri);
  });
});

describe("§C MySQL driver resolution (Phase 3 — recognized only)", () => {
  test("mysql:// → mysql", () => {
    const r = resolveDbDriver("mysql://user:pass@localhost:3306/mydb");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.info.driver).toBe("mysql");
      expect(r.info.connectionString).toBe("mysql://user:pass@localhost:3306/mydb");
    }
  });
});

describe("§D Unsupported prefixes — E-SQL-005", () => {
  test("empty string → E-SQL-005", () => {
    const r = resolveDbDriver("");
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe("E-SQL-005");
      expect(r.error.message).toContain("E-SQL-005");
    }
  });

  test("non-string input → E-SQL-005", () => {
    // Defensive guard for upstream bugs that might pass a non-string.
    // @ts-expect-error — intentionally passing wrong type.
    const r = resolveDbDriver(null);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("E-SQL-005");
  });

  test("mongodb:// → E-SQL-005 (use ^{} instead)", () => {
    const r = resolveDbDriver("mongodb://localhost:27017/mydb");
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe("E-SQL-005");
      expect(r.error.message).toContain("MongoDB");
      expect(r.error.message).toContain("^{}");
    }
  });

  test("mongo:// → E-SQL-005", () => {
    const r = resolveDbDriver("mongo://localhost/mydb");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("E-SQL-005");
  });

  test("typo'd postgres scheme (postgress://) → E-SQL-005", () => {
    const r = resolveDbDriver("postgress://localhost/mydb");
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe("E-SQL-005");
      expect(r.error.message).toContain("postgress://");
      expect(r.error.message).toContain("Supported schemes");
    }
  });

  test("redis:// → E-SQL-005", () => {
    const r = resolveDbDriver("redis://localhost:6379");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("E-SQL-005");
  });

  test("http:// → E-SQL-005", () => {
    const r = resolveDbDriver("http://example.com/db");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("E-SQL-005");
  });
});

describe("§E Connection string passthrough", () => {
  test("postgres:// — no mutation of credentials/host/port", () => {
    const uri = "postgres://admin:Secret123!@db.example.com:5433/production";
    const r = resolveDbDriver(uri);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.info.connectionString).toBe(uri);
  });

  test("sqlite path — no mutation", () => {
    const uri = "./data/users.sqlite3";
    const r = resolveDbDriver(uri);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.info.connectionString).toBe(uri);
  });
});

describe("§F isSupportedDbUri convenience", () => {
  test("supported URIs return true", () => {
    expect(isSupportedDbUri(":memory:")).toBe(true);
    expect(isSupportedDbUri("./app.db")).toBe(true);
    expect(isSupportedDbUri("postgres://localhost/db")).toBe(true);
    expect(isSupportedDbUri("postgresql://localhost/db")).toBe(true);
    expect(isSupportedDbUri("mysql://localhost/db")).toBe(true);
  });

  test("unsupported URIs return false", () => {
    expect(isSupportedDbUri("")).toBe(false);
    expect(isSupportedDbUri("mongodb://localhost/db")).toBe(false);
    expect(isSupportedDbUri("redis://localhost")).toBe(false);
  });
});
