/**
 * SQL Parameterization — Unit Tests
 *
 * Tests for:
 *   - rewriteSqlRefs() (src/codegen/rewrite.js)
 *
 * Security context: rewriteSqlRefs must never emit string-interpolated SQL.
 * All ?{} SQL blocks with ${expr} interpolations must be compiled to
 * positional parameters (?1, ?2, ...) passed as bound arguments to the
 * bun:sqlite method call. This prevents SQL injection.
 *
 * Coverage:
 *   §1  Static query — no interpolations — .all() — no parameters in output
 *   §2  Single parameter — .all()
 *   §3  Single parameter — .first()
 *   §4  Single parameter — .get()
 *   §5  Single parameter — .run()
 *   §6  Multiple parameters — .all()
 *   §7  Duplicate expression — each occurrence gets its own parameter number
 *   §8  Nested expression in parameter — ${obj.method()} — braces handled correctly
 *   §9  Expression with no SQL context — passes through unchanged
 *   §10 Null input — returns unchanged
 *   §11 Empty string — returns unchanged
 *   §12 rewriteExpr integration — SQL rewrite runs as part of full pipeline
 */

import { describe, test, expect } from "bun:test";
import { rewriteSqlRefs, rewriteExpr } from "../../src/codegen/rewrite.js";

// ---------------------------------------------------------------------------
// §1  Static query — no interpolations
// ---------------------------------------------------------------------------

describe("§1 static query — no interpolations", () => {
  test("SELECT with no params produces .all() with no arguments", () => {
    const input = "?{`SELECT * FROM users`}.all()";
    const output = rewriteSqlRefs(input);
    expect(output).toBe('_scrml_db.query("SELECT * FROM users").all()');
  });

  test("static query does not contain any ${} in output", () => {
    const input = "?{`SELECT id, name FROM posts ORDER BY created_at DESC`}.all()";
    const output = rewriteSqlRefs(input);
    expect(output).not.toContain("${");
    expect(output).toBe('_scrml_db.query("SELECT id, name FROM posts ORDER BY created_at DESC").all()');
  });
});

// ---------------------------------------------------------------------------
// §2–5  Single parameter — all method variants
// ---------------------------------------------------------------------------

describe("§2 single parameter — .all()", () => {
  test("single interpolation becomes ?1 with param as argument", () => {
    const input = "?{`SELECT * FROM users WHERE id = ${userId}`}.all()";
    const output = rewriteSqlRefs(input);
    expect(output).toBe('_scrml_db.query("SELECT * FROM users WHERE id = ?1").all(userId)');
  });

  test("output does not contain raw ${userId}", () => {
    const input = "?{`SELECT * FROM users WHERE id = ${userId}`}.all()";
    const output = rewriteSqlRefs(input);
    expect(output).not.toContain("${userId}");
    expect(output).not.toContain("${");
  });
});

describe("§3 single parameter — .first()", () => {
  test("single interpolation with .first() method", () => {
    const input = "?{`SELECT * FROM users WHERE email = ${email}`}.first()";
    const output = rewriteSqlRefs(input);
    expect(output).toBe('_scrml_db.query("SELECT * FROM users WHERE email = ?1").first(email)');
  });
});

describe("§4 single parameter — .get()", () => {
  test("single interpolation with .get() method", () => {
    const input = "?{`SELECT * FROM sessions WHERE token = ${token}`}.get()";
    const output = rewriteSqlRefs(input);
    expect(output).toBe('_scrml_db.query("SELECT * FROM sessions WHERE token = ?1").get(token)');
  });
});

describe("§5 single parameter — .run()", () => {
  test("single interpolation with .run() method (mutations)", () => {
    const input = "?{`DELETE FROM sessions WHERE token = ${token}`}.run()";
    const output = rewriteSqlRefs(input);
    expect(output).toBe('_scrml_db.query("DELETE FROM sessions WHERE token = ?1").run(token)');
  });

  test("INSERT with .run() parameterizes all values", () => {
    const input = "?{`INSERT INTO users (name, email) VALUES (${name}, ${email})`}.run()";
    const output = rewriteSqlRefs(input);
    expect(output).toBe('_scrml_db.query("INSERT INTO users (name, email) VALUES (?1, ?2)").run(name, email)');
  });
});

// ---------------------------------------------------------------------------
// §6  Multiple parameters
// ---------------------------------------------------------------------------

describe("§6 multiple parameters", () => {
  test("two parameters assigned ?1, ?2 in order", () => {
    const input = "?{`SELECT * FROM users WHERE id = ${userId} AND role = ${role}`}.all()";
    const output = rewriteSqlRefs(input);
    expect(output).toBe('_scrml_db.query("SELECT * FROM users WHERE id = ?1 AND role = ?2").all(userId, role)');
  });

  test("three parameters assigned ?1, ?2, ?3 in order", () => {
    const input = "?{`SELECT * FROM posts WHERE author = ${author} AND status = ${status} AND year = ${year}`}.all()";
    const output = rewriteSqlRefs(input);
    expect(output).toBe('_scrml_db.query("SELECT * FROM posts WHERE author = ?1 AND status = ?2 AND year = ?3").all(author, status, year)');
  });

  test("no string interpolation appears in the output SQL", () => {
    const input = "?{`SELECT * FROM users WHERE id = ${userId} AND role = ${role}`}.all()";
    const output = rewriteSqlRefs(input);
    expect(output).not.toContain("${");
  });
});

// ---------------------------------------------------------------------------
// §7  Duplicate expression — each occurrence gets its own parameter number
// ---------------------------------------------------------------------------

describe("§7 duplicate expression — separate parameter numbers", () => {
  test("same expression used twice gets ?1 and ?2", () => {
    const input = "?{`SELECT * FROM logs WHERE start_id > ${id} AND end_id < ${id}`}.all()";
    const output = rewriteSqlRefs(input);
    // Each occurrence of ${id} should get its own positional parameter
    expect(output).toBe('_scrml_db.query("SELECT * FROM logs WHERE start_id > ?1 AND end_id < ?2").all(id, id)');
  });
});

// ---------------------------------------------------------------------------
// §8  Nested expression — ${obj.method()} and ${arr[0]}
// ---------------------------------------------------------------------------

describe("§8 nested expression — braces handled correctly", () => {
  test("method call in interpolation — nested braces resolved", () => {
    const input = "?{`SELECT * FROM users WHERE id = ${req.params.id}`}.first()";
    const output = rewriteSqlRefs(input);
    expect(output).toBe('_scrml_db.query("SELECT * FROM users WHERE id = ?1").first(req.params.id)');
  });

  test("object method call with braces — ${obj.method()} captured whole", () => {
    const input = "?{`SELECT * FROM items WHERE category = ${getCategory()}`}.all()";
    const output = rewriteSqlRefs(input);
    expect(output).toBe('_scrml_db.query("SELECT * FROM items WHERE category = ?1").all(getCategory())');
  });

  test("array access in interpolation", () => {
    const input = "?{`SELECT * FROM users WHERE id = ${ids[0]}`}.first()";
    const output = rewriteSqlRefs(input);
    expect(output).toBe('_scrml_db.query("SELECT * FROM users WHERE id = ?1").first(ids[0])');
  });

  test("ternary expression in interpolation", () => {
    const input = "?{`SELECT * FROM users WHERE active = ${isActive ? 1 : 0}`}.all()";
    const output = rewriteSqlRefs(input);
    expect(output).toBe('_scrml_db.query("SELECT * FROM users WHERE active = ?1").all(isActive ? 1 : 0)');
  });
});

// ---------------------------------------------------------------------------
// §9  No SQL context — passes through unchanged
// ---------------------------------------------------------------------------

describe("§9 no SQL context — passes through unchanged", () => {
  test("plain JS expression unchanged", () => {
    const input = "console.log(userId)";
    expect(rewriteSqlRefs(input)).toBe("console.log(userId)");
  });

  test("reactive ref unchanged", () => {
    const input = "@users.filter(u => u.active)";
    expect(rewriteSqlRefs(input)).toBe("@users.filter(u => u.active)");
  });

  test("navigate call unchanged", () => {
    const input = "navigate('/dashboard')";
    expect(rewriteSqlRefs(input)).toBe("navigate('/dashboard')");
  });

  test("string containing question mark unchanged", () => {
    const input = 'const msg = "Is this ok?"';
    expect(rewriteSqlRefs(input)).toBe('const msg = "Is this ok?"');
  });
});

// ---------------------------------------------------------------------------
// §10 Null input
// ---------------------------------------------------------------------------

describe("§10 null/undefined input — returns unchanged", () => {
  test("null returns null", () => {
    expect(rewriteSqlRefs(null)).toBe(null);
  });

  test("undefined returns undefined", () => {
    expect(rewriteSqlRefs(undefined)).toBe(undefined);
  });

  test("number returns number", () => {
    expect(rewriteSqlRefs(42)).toBe(42);
  });
});

// ---------------------------------------------------------------------------
// §11 Empty string
// ---------------------------------------------------------------------------

describe("§11 empty string — returns empty string", () => {
  test("empty string input produces empty string output", () => {
    expect(rewriteSqlRefs("")).toBe("");
  });
});

// ---------------------------------------------------------------------------
// §12 rewriteExpr integration
// ---------------------------------------------------------------------------

describe("§12 rewriteExpr integration — SQL rewrite in full pipeline", () => {
  test("SQL rewrite runs when passed through rewriteExpr", () => {
    const input = "?{`SELECT * FROM users WHERE id = ${userId}`}.first()";
    const output = rewriteExpr(input);
    expect(output).toBe('_scrml_db.query("SELECT * FROM users WHERE id = ?1").first(userId)');
  });

  test("SQL rewrite and reactive ref rewrite coexist", () => {
    // A line that has both a reactive ref and a SQL block should handle both
    const input = "const q = ?{`SELECT * FROM users WHERE id = ${userId}`}.first()";
    const output = rewriteExpr(input);
    expect(output).toContain('_scrml_db.query("SELECT * FROM users WHERE id = ?1").first(userId)');
    expect(output).not.toContain("${userId}");
  });

  test("static SQL through rewriteExpr produces no parameters", () => {
    const input = "?{`SELECT COUNT(*) FROM users`}.first()";
    const output = rewriteExpr(input);
    expect(output).toBe('_scrml_db.query("SELECT COUNT(*) FROM users").first()');
  });
});

// ---------------------------------------------------------------------------
// §13 BUG-R14-009: emitLogicNode — SQL without .run() must still parameterize
// ---------------------------------------------------------------------------

import { emitLogicNode } from "../../src/codegen/emit-logic.js";

describe("§13 BUG-R14-009: SQL without explicit .run() — parameterized", () => {
  test("SQL with interpolations but no chained call emits parameterized .run()", () => {
    const node = {
      kind: "sql",
      query: "INSERT INTO messages (name, email) VALUES (${@name}, ${@email})",
      chainedCalls: [],
    };
    const output = emitLogicNode(node);
    expect(output).toContain("_scrml_db.query(");
    expect(output).toContain(".run(");
    expect(output).not.toContain("_scrml_sql_exec");
    expect(output).not.toContain("${");
  });

  test("SQL with interpolations but no chained call uses positional params", () => {
    const node = {
      kind: "sql",
      query: "INSERT INTO users (name) VALUES (${userName})",
      chainedCalls: [],
    };
    const output = emitLogicNode(node);
    expect(output).toBe('_scrml_db.query("INSERT INTO users (name) VALUES (?1)").run(userName);');
  });

  test("SQL with multiple interpolations but no chained call parameterizes all", () => {
    const node = {
      kind: "sql",
      query: "UPDATE users SET name = ${name}, email = ${email} WHERE id = ${id}",
      chainedCalls: [],
    };
    const output = emitLogicNode(node);
    expect(output).toBe('_scrml_db.query("UPDATE users SET name = ?1, email = ?2 WHERE id = ?3").run(name, email, id);');
  });

  test("static SQL without chained call still uses _scrml_sql_exec", () => {
    const node = {
      kind: "sql",
      query: "CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY)",
      chainedCalls: [],
    };
    const output = emitLogicNode(node);
    expect(output).toContain("_scrml_sql_exec");
    expect(output).not.toContain("_scrml_db.query");
  });

  test("SQL with chained call and interpolations still works as before", () => {
    const node = {
      kind: "sql",
      query: "SELECT * FROM users WHERE id = ${userId}",
      chainedCalls: [{ method: "get" }],
    };
    const output = emitLogicNode(node);
    expect(output).toBe('_scrml_db.query("SELECT * FROM users WHERE id = ?1").get(userId);');
  });
});
