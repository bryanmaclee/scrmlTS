/**
 * SQL Write Operations — Unit Tests (§8.5)
 *
 * Tests for write-operation codegen: INSERT, UPDATE, DELETE via .run(),
 * .prepare() compiled to db.prepare(), and transaction block emission.
 *
 * Coverage:
 *   §1  INSERT with .run() — params parameterized, method preserved
 *   §2  UPDATE with .run() — multi-param
 *   §3  DELETE with .run() — single param
 *   §4  Static DDL with no chained call — falls through to _scrml_sql_exec
 *   §5  .prepare() — emits db.prepare(sql) WITHOUT bound params
 *   §6  .prepare() static SQL — no params in SQL, no params at call site
 *   §7  .prepare() with params — sql has ?N placeholders but no args passed
 *   §8  .run() return value — compiler does not wrap (passthrough)
 *   §9  emitLogicNode sql node — INSERT .run() codegen
 *   §10 emitLogicNode sql node — .prepare() codegen
 *   §11 transaction-block emit — BEGIN / COMMIT / ROLLBACK structure
 *   §12 transaction-block emit — write stmts inside are parameterized
 *   §13 rewriteExpr integration — .run() and .prepare() in full pipeline
 *   §14 route inference — sql node triggers server escalation
 */

import { describe, test, expect } from "bun:test";
import { rewriteSqlRefs, rewriteExpr, rewriteServerExpr, serverRewriteEmitted } from "../../src/codegen/rewrite.js";
import { emitLogicNode } from "../../src/codegen/emit-logic.js";

// ---------------------------------------------------------------------------
// §1  INSERT with .run()
// ---------------------------------------------------------------------------

describe("§1 INSERT with .run() — parameterized", () => {
  test("INSERT with two params", () => {
    const input = "?{`INSERT INTO users (name, email) VALUES (${name}, ${email})`}.run()";
    const output = rewriteSqlRefs(input);
    expect(output).toBe('_scrml_db.query("INSERT INTO users (name, email) VALUES (?1, ?2)").run(name, email)');
  });

  test("INSERT with one param", () => {
    const input = "?{`INSERT INTO sessions (token) VALUES (${token})`}.run()";
    const output = rewriteSqlRefs(input);
    expect(output).toBe('_scrml_db.query("INSERT INTO sessions (token) VALUES (?1)").run(token)');
  });

  test("INSERT output does not contain raw ${}", () => {
    const input = "?{`INSERT INTO logs (msg) VALUES (${msg})`}.run()";
    const output = rewriteSqlRefs(input);
    expect(output).not.toContain("${");
    expect(output).not.toContain("${msg}");
  });

  test("INSERT static (no params) — no args in .run() call", () => {
    const input = "?{`INSERT INTO defaults (key, val) VALUES ('lang', 'en')`}.run()";
    const output = rewriteSqlRefs(input);
    expect(output).toBe("_scrml_db.query(\"INSERT INTO defaults (key, val) VALUES ('lang', 'en')\").run()");
  });
});

// ---------------------------------------------------------------------------
// §2  UPDATE with .run()
// ---------------------------------------------------------------------------

describe("§2 UPDATE with .run() — multi-param", () => {
  test("UPDATE with two params", () => {
    const input = "?{`UPDATE users SET email = ${email} WHERE id = ${id}`}.run()";
    const output = rewriteSqlRefs(input);
    expect(output).toBe('_scrml_db.query("UPDATE users SET email = ?1 WHERE id = ?2").run(email, id)');
  });

  test("UPDATE with three params", () => {
    const input = "?{`UPDATE posts SET title = ${title}, body = ${body} WHERE id = ${id}`}.run()";
    const output = rewriteSqlRefs(input);
    expect(output).toBe('_scrml_db.query("UPDATE posts SET title = ?1, body = ?2 WHERE id = ?3").run(title, body, id)');
  });
});

// ---------------------------------------------------------------------------
// §3  DELETE with .run()
// ---------------------------------------------------------------------------

describe("§3 DELETE with .run() — single param", () => {
  test("DELETE by primary key", () => {
    const input = "?{`DELETE FROM users WHERE id = ${userId}`}.run()";
    const output = rewriteSqlRefs(input);
    expect(output).toBe('_scrml_db.query("DELETE FROM users WHERE id = ?1").run(userId)');
  });

  test("DELETE by token string", () => {
    const input = "?{`DELETE FROM sessions WHERE token = ${tok}`}.run()";
    const output = rewriteSqlRefs(input);
    expect(output).toBe('_scrml_db.query("DELETE FROM sessions WHERE token = ?1").run(tok)');
  });
});

// ---------------------------------------------------------------------------
// §4  Static DDL — no chained call — falls through to _scrml_sql_exec
// ---------------------------------------------------------------------------

describe("§4 static DDL without method call — _scrml_sql_exec", () => {
  test("bare DDL statement routes to _scrml_sql_exec", () => {
    const input = "?{`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY)`}";
    const output = rewriteSqlRefs(input);
    expect(output).toBe('_scrml_sql_exec("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY)")');
  });

  test("bare DDL does not use _scrml_db.query()", () => {
    const input = "?{`CREATE INDEX idx_email ON users (email)`}";
    const output = rewriteSqlRefs(input);
    expect(output).not.toContain("_scrml_db.query");
    expect(output).toContain("_scrml_sql_exec");
  });
});

// ---------------------------------------------------------------------------
// §5  .prepare() — emits db.prepare(sql) WITHOUT bound params
// ---------------------------------------------------------------------------

describe("§5 .prepare() — no params at call site", () => {
  test("INSERT with params — .prepare() omits params", () => {
    const input = "?{`INSERT INTO users (n, e) VALUES (${n}, ${e})`}.prepare()";
    const output = rewriteSqlRefs(input);
    // .prepare() should produce db.prepare(sql) — NO bound params at prepare time
    expect(output).toBe('_scrml_db.prepare("INSERT INTO users (n, e) VALUES (?1, ?2)")');
  });

  test("SELECT with param — .prepare() omits params", () => {
    const input = "?{`SELECT * FROM users WHERE id = ${id}`}.prepare()";
    const output = rewriteSqlRefs(input);
    expect(output).toBe('_scrml_db.prepare("SELECT * FROM users WHERE id = ?1")');
  });

  test(".prepare() output is db.prepare() — exact match verifies no args leaked", () => {
    // Use variables 'x' and 'y' that don't appear in the SQL column list
    const input = "?{`INSERT INTO t (a, b) VALUES (${x}, ${y})`}.prepare()";
    const output = rewriteSqlRefs(input);
    // Exact match: if x or y appeared in the call, the output would differ
    expect(output).toBe('_scrml_db.prepare("INSERT INTO t (a, b) VALUES (?1, ?2)")');
    // Confirm the param variables do not appear anywhere after the closing quote
    const afterQuote = output.slice(output.lastIndexOf('"') + 1);
    expect(afterQuote).toBe(")");
  });

  test(".prepare() uses db.prepare(), not db.query()", () => {
    const input = "?{`UPDATE users SET x = ${x} WHERE id = ${id}`}.prepare()";
    const output = rewriteSqlRefs(input);
    expect(output).toContain("_scrml_db.prepare(");
    expect(output).not.toContain("_scrml_db.query(");
  });
});

// ---------------------------------------------------------------------------
// §6  .prepare() static SQL — no params at all
// ---------------------------------------------------------------------------

describe("§6 .prepare() with static SQL — no ?N placeholders", () => {
  test("static SELECT — prepare with no placeholders", () => {
    const input = "?{`SELECT * FROM config WHERE active = 1`}.prepare()";
    const output = rewriteSqlRefs(input);
    expect(output).toBe('_scrml_db.prepare("SELECT * FROM config WHERE active = 1")');
  });
});

// ---------------------------------------------------------------------------
// §7  .prepare() — SQL has ?N placeholders, no params passed at prepare time
// ---------------------------------------------------------------------------

describe("§7 .prepare() positional placeholders in output SQL", () => {
  test("three params produce ?1, ?2, ?3 in the prepared SQL string", () => {
    const input = "?{`UPDATE posts SET a = ${a}, b = ${b}, c = ${c}`}.prepare()";
    const output = rewriteSqlRefs(input);
    expect(output).toBe('_scrml_db.prepare("UPDATE posts SET a = ?1, b = ?2, c = ?3")');
  });
});

// ---------------------------------------------------------------------------
// §8  .run() return value — passthrough (no compiler wrapping)
// ---------------------------------------------------------------------------

describe("§8 .run() return value is driver passthrough", () => {
  test(".run() output does not have extra wrapper call", () => {
    const input = "?{`INSERT INTO users (nm) VALUES (${nm})`}.run()";
    const output = rewriteSqlRefs(input);
    // Output must end with .run(nm) — no extra wrapping
    expect(output).toMatch(/\.run\(nm\)$/);
    // Must not wrap in a helper like _scrml_run_result()
    expect(output).not.toContain("_scrml_run_result");
    expect(output).not.toContain("_scrml_wrap");
  });
});

// ---------------------------------------------------------------------------
// §9  emitLogicNode sql node — INSERT .run() codegen
// ---------------------------------------------------------------------------

describe("§9 emitLogicNode — INSERT sql node with .run() chained call", () => {
  test("sql node with .run() chained call emits parameterized run", () => {
    const node = {
      kind: "sql",
      query: "INSERT INTO users (name, email) VALUES (${name}, ${email})",
      chainedCalls: [{ method: "run" }],
    };
    const output = emitLogicNode(node);
    expect(output).toBe('_scrml_db.query("INSERT INTO users (name, email) VALUES (?1, ?2)").run(name, email);');
  });

  test("sql node with .run() — output has no ${}", () => {
    const node = {
      kind: "sql",
      query: "UPDATE posts SET title = ${title} WHERE id = ${id}",
      chainedCalls: [{ method: "run" }],
    };
    const output = emitLogicNode(node);
    expect(output).not.toContain("${");
    expect(output).toBe('_scrml_db.query("UPDATE posts SET title = ?1 WHERE id = ?2").run(title, id);');
  });

  test("sql node without chained call and with params defaults to .run()", () => {
    const node = {
      kind: "sql",
      query: "DELETE FROM sessions WHERE tok = ${tok}",
      chainedCalls: [],
    };
    const output = emitLogicNode(node);
    // No chained call + params → default to .run() per existing behavior
    expect(output).toContain(".run(tok)");
    expect(output).toBe('_scrml_db.query("DELETE FROM sessions WHERE tok = ?1").run(tok);');
  });
});

// ---------------------------------------------------------------------------
// §10  emitLogicNode sql node — .prepare() codegen
// ---------------------------------------------------------------------------

describe("§10 emitLogicNode — sql node with .prepare() chained call", () => {
  test(".prepare() emitted as db.query().prepare() — current behavior", () => {
    // Note: emitLogicNode uses the chained call directly via db.query().method()
    // The .prepare() special-casing only applies in rewriteSqlRefs (inline expressions).
    // emitLogicNode always uses db.query() for all chained calls.
    const node = {
      kind: "sql",
      query: "INSERT INTO users (name) VALUES (?1)",
      chainedCalls: [{ method: "prepare" }],
    };
    const output = emitLogicNode(node);
    expect(output).toContain("_scrml_db.query(");
    expect(output).toContain(".prepare(");
  });
});

// ---------------------------------------------------------------------------
// §11  transaction-block emit — BEGIN / COMMIT / ROLLBACK
// ---------------------------------------------------------------------------

describe("§11 transaction-block — BEGIN/COMMIT/ROLLBACK structure", () => {
  test("empty transaction block emits BEGIN and COMMIT", () => {
    const node = {
      kind: "transaction-block",
      body: [],
    };
    const output = emitLogicNode(node);
    expect(output).toContain('_scrml_db.exec("BEGIN")');
    expect(output).toContain('_scrml_db.exec("COMMIT")');
    expect(output).toContain('_scrml_db.exec("ROLLBACK")');
  });

  test("transaction block has try/catch structure", () => {
    const node = {
      kind: "transaction-block",
      body: [],
    };
    const output = emitLogicNode(node);
    expect(output).toContain("try {");
    expect(output).toContain("} catch (");
    expect(output).toContain("throw _scrml_txn_err");
  });

  test("ROLLBACK is in the catch block, not the try block", () => {
    const node = {
      kind: "transaction-block",
      body: [],
    };
    const output = emitLogicNode(node);
    const lines = output.split("\n");
    const rollbackLine = lines.findIndex(l => l.includes("ROLLBACK"));
    const catchLine = lines.findIndex(l => l.includes("} catch ("));
    const commitLine = lines.findIndex(l => l.includes("COMMIT"));
    // ROLLBACK must come after catch
    expect(rollbackLine).toBeGreaterThan(catchLine);
    // COMMIT must come before catch
    expect(commitLine).toBeLessThan(catchLine);
  });
});

// ---------------------------------------------------------------------------
// §12  transaction-block — write stmts inside are parameterized
// ---------------------------------------------------------------------------

describe("§12 transaction-block — inner SQL stmts parameterized", () => {
  test("two sql nodes inside transaction both parameterized", () => {
    const node = {
      kind: "transaction-block",
      body: [
        {
          kind: "sql",
          query: "UPDATE accounts SET balance = balance - ${amt} WHERE id = ${fromId}",
          chainedCalls: [{ method: "run" }],
        },
        {
          kind: "sql",
          query: "UPDATE accounts SET balance = balance + ${amt} WHERE id = ${toId}",
          chainedCalls: [{ method: "run" }],
        },
      ],
    };
    const output = emitLogicNode(node);
    expect(output).not.toContain("${");
    expect(output).toContain("?1");
    expect(output).toContain(".run(");
    expect(output).toContain('_scrml_db.exec("BEGIN")');
    expect(output).toContain('_scrml_db.exec("COMMIT")');
  });
});

// ---------------------------------------------------------------------------
// §13  rewriteExpr integration
// ---------------------------------------------------------------------------

describe("§13 rewriteExpr integration — write ops in full pipeline", () => {
  test("INSERT .run() passes through rewriteExpr correctly", () => {
    const input = "?{`INSERT INTO users (nm) VALUES (${nm})`}.run()";
    const output = rewriteExpr(input);
    expect(output).toBe('_scrml_db.query("INSERT INTO users (nm) VALUES (?1)").run(nm)');
  });

  test(".prepare() in rewriteExpr — exact output matches, no param variables after closing quote", () => {
    // Use variables p1, p2 that don't appear in the SQL column/table names
    const input = "const stmt = ?{`INSERT INTO t (a, b) VALUES (${p1}, ${p2})`}.prepare()";
    const output = rewriteExpr(input);
    expect(output).toBe('const stmt = _scrml_db.prepare("INSERT INTO t (a, b) VALUES (?1, ?2)")');
  });

  test("DELETE .run() with reactive ref param", () => {
    const input = "?{`DELETE FROM sessions WHERE user_id = ${@userId}`}.run()";
    const output = rewriteExpr(input);
    // @userId should be rewritten to reactive get, sql should be parameterized
    expect(output).toContain('_scrml_db.query("DELETE FROM sessions WHERE user_id = ?1")');
    expect(output).toContain('.run(');
    expect(output).not.toContain("${@userId}");
  });
});

// ---------------------------------------------------------------------------
// §14  route inference — sql node triggers server escalation
// ---------------------------------------------------------------------------

import { isServerOnlyNode } from "../../src/codegen/collect.js";

describe("§14 route inference — sql nodes are server-only", () => {
  test("sql node with .run() is server-only", () => {
    const node = { kind: "sql", query: "INSERT INTO users (name) VALUES (?1)", chainedCalls: [{ method: "run" }] };
    expect(isServerOnlyNode(node)).toBe(true);
  });

  test("sql node with .prepare() is server-only", () => {
    const node = { kind: "sql", query: "INSERT INTO users (name) VALUES (?1)", chainedCalls: [{ method: "prepare" }] };
    expect(isServerOnlyNode(node)).toBe(true);
  });

  test("sql node with no chained call is server-only", () => {
    const node = { kind: "sql", query: "DELETE FROM sessions WHERE id = ?1", chainedCalls: [] };
    expect(isServerOnlyNode(node)).toBe(true);
  });

  test("transaction-block is server-only", () => {
    const node = { kind: "transaction-block", body: [] };
    expect(isServerOnlyNode(node)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// §15  @var rewriting in SQL params — server path (fix-sql-param-rewrite)
// ---------------------------------------------------------------------------


describe("§15 @var in SQL template params — server path (rewriteServerExpr)", () => {
  test("@var in INSERT template params is rewritten to _scrml_body on server path", () => {
    const input = "?{`INSERT INTO tasks (title, cat) VALUES (${@newTask}, ${@selectedCat})`}.run()";
    const output = rewriteServerExpr(input);
    expect(output).toBe('_scrml_db.query("INSERT INTO tasks (title, cat) VALUES (?1, ?2)").run(_scrml_body["newTask"], _scrml_body["selectedCat"])');
  });

  test("@var in SELECT template param is rewritten on server path — .all()", () => {
    const input = "?{`SELECT * FROM posts WHERE author = ${@userId}`}.all()";
    const output = rewriteServerExpr(input);
    expect(output).toBe('_scrml_db.query("SELECT * FROM posts WHERE author = ?1").all(_scrml_body["userId"])');
  });

  test("@var in SELECT template param is rewritten on server path — .get()", () => {
    const input = "?{`SELECT * FROM users WHERE id = ${@userId}`}.get()";
    const output = rewriteServerExpr(input);
    expect(output).toBe('_scrml_db.query("SELECT * FROM users WHERE id = ?1").get(_scrml_body["userId"])');
  });

  test("@var in UPDATE template params is rewritten on server path", () => {
    const input = "?{`UPDATE users SET email = ${@email} WHERE id = ${@id}`}.run()";
    const output = rewriteServerExpr(input);
    expect(output).toBe('_scrml_db.query("UPDATE users SET email = ?1 WHERE id = ?2").run(_scrml_body["email"], _scrml_body["id"])');
  });

  test("@var in DELETE template param is rewritten on server path", () => {
    const input = "?{`DELETE FROM sessions WHERE token = ${@token}`}.run()";
    const output = rewriteServerExpr(input);
    expect(output).toBe('_scrml_db.query("DELETE FROM sessions WHERE token = ?1").run(_scrml_body["token"])');
  });

  test("output does not contain raw @var after server rewrite", () => {
    const input = "?{`INSERT INTO t (a, b) VALUES (${@x}, ${@y})`}.run()";
    const output = rewriteServerExpr(input);
    expect(output).not.toContain("@x");
    expect(output).not.toContain("@y");
    expect(output).toContain('_scrml_body["x"]');
    expect(output).toContain('_scrml_body["y"]');
  });
});

// ---------------------------------------------------------------------------
// §16  explicit call.args @var rewriting — emitLogicNode (fix-sql-param-rewrite)
// ---------------------------------------------------------------------------

describe("§16 call.args @var rewriting — emitLogicNode with explicit .run(@var) args", () => {
  test("sql node with bare ? placeholder and @var in call.args — args not dropped", () => {
    const node = {
      kind: "sql",
      query: "SELECT * FROM users WHERE id = ?",
      chainedCalls: [{ method: "run", args: "@userId" }],
    };
    const output = emitLogicNode(node);
    // @userId should be rewritten by rewriteExpr → _scrml_reactive_get("userId")
    expect(output).toContain("userId");
    expect(output).not.toBe('_scrml_db.query("SELECT * FROM users WHERE id = ?").run();');
  });

  test("sql node with bare ? and @var call.args — serverRewriteEmitted converts to body lookup", () => {
    const node = {
      kind: "sql",
      query: "DELETE FROM sessions WHERE id = ?",
      chainedCalls: [{ method: "run", args: "@sessionId" }],
    };
    const emitted = emitLogicNode(node);
    const serverOut = serverRewriteEmitted(emitted);
    expect(serverOut).toContain('_scrml_body["sessionId"]');
    expect(serverOut).not.toContain("@sessionId");
  });

  test("sql node with template params takes precedence over empty call.args", () => {
    // When SQL has ${} params AND call.args is empty, template params are used
    const node = {
      kind: "sql",
      query: "INSERT INTO t (a) VALUES (${val})",
      chainedCalls: [{ method: "run", args: "" }],
    };
    const output = emitLogicNode(node);
    expect(output).toBe('_scrml_db.query("INSERT INTO t (a) VALUES (?1)").run(val);');
  });

  test("sql node with empty call.args and no template params — empty argList", () => {
    const node = {
      kind: "sql",
      query: "DELETE FROM logs WHERE done = 1",
      chainedCalls: [{ method: "run", args: "" }],
    };
    const output = emitLogicNode(node);
    expect(output).toBe('_scrml_db.query("DELETE FROM logs WHERE done = 1").run();');
  });
});
