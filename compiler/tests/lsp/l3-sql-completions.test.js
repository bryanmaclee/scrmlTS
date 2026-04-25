// LSP L3.1 — SQL column completion driven by PA's `views` Map.
//
// Verifies that when the cursor is inside a `?{}` SQL context within a
// `<db>` state block, completions include column names from the schema
// of that block's tables.
//
// To get PA to populate `views` we need a real SQLite file. The fixture
// db is created in beforeAll(), populated with a couple of tables, then
// removed in afterAll(). The .scrml fixture references it via an
// absolute `src=` path so PA can introspect it via PRAGMA.

import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { mkdirSync, rmSync, existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { Database } from "bun:sqlite";

import { CompletionItemKind } from "vscode-languageserver/node";
import {
  analyzeText,
  buildCompletions,
  buildSqlColumnCompletions,
  detectContext,
  findEnclosingDbBlock,
  findEnclosingSqlBody,
  parseSqlAliases,
} from "../../../lsp/handlers.js";

let TMP;
let DB_PATH;
let SCRML_PATH;

beforeAll(() => {
  TMP = join(tmpdir(), `scrml-l3-sql-${Date.now()}`);
  mkdirSync(TMP, { recursive: true });
  DB_PATH = join(TMP, "test.db");
  SCRML_PATH = join(TMP, "page.scrml");

  // Create a real SQLite file with two tables so PA can introspect it.
  const db = new Database(DB_PATH, { create: true });
  try {
    db.run(`CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT)`);
    db.run(`CREATE TABLE posts (id INTEGER PRIMARY KEY, body TEXT, user_id INTEGER)`);
  } finally {
    db.close();
  }
});

afterAll(() => {
  try { rmSync(TMP, { recursive: true, force: true }); } catch {}
});

function makeFixture(extraInsideFn = "") {
  // Two tables — `users` and `posts` — with a server function inside the
  // <db> block. The cursor positions in tests reference offsets inside the
  // SELECT body of the function.
  return [
    `< db src="${DB_PATH}" tables="users,posts">`,
    "  ${",
    "    server function f() {",
    `      ${extraInsideFn}`,
    "    }",
    "  }",
    "</db>",
    "",
  ].join("\n");
}

describe("LSP L3.1 — findEnclosingDbBlock", () => {
  it("returns the db block whose span covers the cursor", () => {
    const src = makeFixture(`return ?{${"`"}SELECT id FROM users${"`"}}.all()`);
    const { analysis } = analyzeText(SCRML_PATH, src);
    const cursor = src.indexOf("server function") + 5;
    const dbBlock = findEnclosingDbBlock(analysis.stateBlocks, cursor);
    expect(dbBlock).not.toBeNull();
    expect(dbBlock.stateType).toBe("db");
  });

  it("returns null when the cursor is outside every db block", () => {
    const src = "<program>${ @x = 0 }</program>\n";
    const { analysis } = analyzeText("/test.scrml", src);
    const dbBlock = findEnclosingDbBlock(analysis.stateBlocks, 5);
    expect(dbBlock).toBeNull();
  });
});

describe("LSP L3.1 — findEnclosingSqlBody", () => {
  it("returns the body inside the deepest enclosing ?{...}", () => {
    const text = "${ @x = ?{`SELECT id `} }";
    const cursor = text.indexOf("`SELECT id ") + "`SELECT id ".length;
    const body = findEnclosingSqlBody(text, cursor);
    expect(body).not.toBeNull();
    expect(body.startsWith("`SELECT id")).toBe(true);
  });

  it("returns null when not inside a ?{}", () => {
    const text = "${ @x = 1 }";
    expect(findEnclosingSqlBody(text, text.length)).toBeNull();
  });
});

describe("LSP L3.1 — parseSqlAliases", () => {
  it("captures FROM with explicit alias (FROM users u)", () => {
    const { tables, aliases } = parseSqlAliases("SELECT u. FROM users u");
    expect(tables.has("users")).toBe(true);
    expect(aliases.get("u")).toBe("users");
  });

  it("captures FROM with AS alias (FROM users AS u)", () => {
    const { aliases } = parseSqlAliases("SELECT u. FROM users AS u");
    expect(aliases.get("u")).toBe("users");
  });

  it("captures multiple FROM tables (FROM users u, posts p)", () => {
    const { tables, aliases } = parseSqlAliases(
      "SELECT * FROM users u, posts p WHERE u.id = p.user_id"
    );
    expect(tables.has("users")).toBe(true);
    expect(tables.has("posts")).toBe(true);
    expect(aliases.get("u")).toBe("users");
    expect(aliases.get("p")).toBe("posts");
  });

  it("captures JOIN (FROM users u JOIN posts p)", () => {
    const { aliases } = parseSqlAliases(
      "SELECT * FROM users u JOIN posts p ON u.id = p.user_id"
    );
    expect(aliases.get("u")).toBe("users");
    expect(aliases.get("p")).toBe("posts");
  });

  it("captures bare table name as a self-alias (FROM users)", () => {
    const { aliases } = parseSqlAliases("SELECT * FROM users WHERE id = 1");
    expect(aliases.get("users")).toBe("users");
  });

  it("returns empty maps for empty input", () => {
    const { tables, aliases } = parseSqlAliases("");
    expect(tables.size).toBe(0);
    expect(aliases.size).toBe(0);
  });
});

describe("LSP L3.1 — buildSqlColumnCompletions (real SQLite db)", () => {
  it("emits column names from the ancestor <db> schema (no FROM yet)", () => {
    const src = makeFixture(`return ?{${"`"}SELECT ${"`"}}.all()`);
    const cursor = src.indexOf("`SELECT `") + "`SELECT ".length;
    const { analysis, diagnostics } = analyzeText(SCRML_PATH, src);
    // Sanity: PA must have populated views.
    expect(analysis.protectAnalysis.views.size).toBeGreaterThan(0);
    const items = buildSqlColumnCompletions(src, cursor, analysis);
    const names = items.map(i => i.label);
    // Without an alias prefix, columns from BOTH tables should appear.
    expect(names).toContain("id");
    expect(names).toContain("name");
    expect(names).toContain("email");
    expect(names).toContain("body");
    const idItem = items.find(i => i.label === "id");
    expect(idItem.kind).toBe(CompletionItemKind.Field);
    // detail should reference the SQL type and the table.
    expect(idItem.detail).toMatch(/users|posts/);
  });

  it("filters to alias-resolved table when cursor is after `<alias>.`", () => {
    const src = makeFixture(`return ?{${"`"}SELECT u. FROM users u${"`"}}.all()`);
    const cursor = src.indexOf("`SELECT u.") + "`SELECT u.".length;
    const { analysis } = analyzeText(SCRML_PATH, src);
    const items = buildSqlColumnCompletions(src, cursor, analysis);
    const names = items.map(i => i.label);
    expect(names).toContain("name");
    expect(names).toContain("email");
    // posts.body is NOT in scope when alias resolves to users.
    expect(names).not.toContain("body");
  });

  it("returns [] when not inside a <db> block", () => {
    const src = "<program>${ @x = ?{`SELECT 1`} }</program>\n";
    const cursor = src.indexOf("`SELECT 1`") + 1;
    const { analysis } = analyzeText("/test.scrml", src);
    expect(buildSqlColumnCompletions(src, cursor, analysis)).toEqual([]);
  });

  it("returns [] when the analysis has no protectAnalysis (degraded path)", () => {
    expect(buildSqlColumnCompletions("...", 0, {})).toEqual([]);
  });
});

describe("LSP L3.1 — buildCompletions integration (sql context)", () => {
  it("includes column names + SQL keywords in SQL context", () => {
    const src = makeFixture(`return ?{${"`"}SELECT ${"`"}}.all()`);
    const cursor = src.indexOf("`SELECT `") + "`SELECT ".length;
    const { analysis } = analyzeText(SCRML_PATH, src);
    expect(detectContext(src, cursor)).toBe("sql");
    const items = buildCompletions(src, cursor, analysis);
    const names = items.map(i => i.label);
    expect(names).toContain("id");
    expect(names).toContain("name");
    // SQL keywords still surface alongside column completions.
    expect(names).toContain("FROM");
    expect(names).toContain("WHERE");
  });
});
