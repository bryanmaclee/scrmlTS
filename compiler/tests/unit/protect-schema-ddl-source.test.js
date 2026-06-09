/**
 * protect-schema-ddl-source.test.js — F-SCHEMA-001: `< schema>` DDL as the third
 * ColumnDef source (SPEC §39, §14.8).
 *
 * A DDL-first app declares its tables in a `< schema>` block and points its
 * `< db src=>` at a database file that does NOT exist yet (and writes no
 * `CREATE TABLE` in a `?{}` block). Before this change, PA emitted E-PA-002 and
 * generated NO table types — defeating the schema-is-code promise of §39. Now PA
 * synthesizes a CREATE TABLE from the `< schema>` DDL, builds a shadow DB, and
 * produces the generated table types.
 *
 * PRECEDENCE: live DB file > `?{}`-harvested CREATE TABLE > `< schema>` DDL.
 */

import { describe, test, expect } from "bun:test";
import { runPA } from "../../src/protect-analyzer.ts";
import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";
import { resolve } from "path";

function paFor(scrmlSource, filePath) {
  const fp = resolve(filePath);
  const bs = splitBlocks(fp, scrmlSource);
  const ast = buildAST(bs).ast;
  return runPA({ files: [{ filePath: fp, nodes: ast.nodes }] });
}

describe("F-SCHEMA-001 — < schema> DDL as a ColumnDef source", () => {
  test("DDL-first app with no materialized DB still gets generated table types", () => {
    const src = `<program db="./nope-ddl.db">
<schema>
    users {
        id:             integer primary key
        email:          text not null unique
        password_hash:  text not null
        created_at:     timestamp
    }
</>
<db src="./nope-ddl.db" protect="password_hash" tables="users">
  \${
    function _noop() { }
  }
</>
</>`;
    const { protectAnalysis, errors } = paFor(src, "/tmp/_ddlfirst/app.scrml");
    // No E-PA-002 — the schema DDL filled the missing-DB gap.
    expect(errors.some((e) => e.code === "E-PA-002")).toBe(false);
    // Generated views exist for `users` with the full schema columns.
    const view = [...protectAnalysis.views.values()][0];
    expect(view).toBeDefined();
    const users = view.tables.get("users");
    expect(users).toBeDefined();
    const fullCols = users.fullSchema.map((c) => c.name).sort();
    expect(fullCols).toEqual(["created_at", "email", "id", "password_hash"]);
    // protect= excludes password_hash from the client schema.
    const clientCols = users.clientSchema.map((c) => c.name);
    expect(clientCols).not.toContain("password_hash");
    expect(clientCols).toContain("email");
  });

  test("a `?{}`-harvested CREATE TABLE wins over the `< schema>` DDL (precedence)", () => {
    // The schema declares `users` with only `id`; the ?{} CREATE TABLE declares
    // `users` with id + email. The harvested CREATE TABLE must win.
    const src = `<program db="./nope-prec.db">
<schema>
    users {
        id:  integer primary key
    }
</>
<db src="./nope-prec.db" tables="users">
  \${
    function _boot() {
      ?{\`CREATE TABLE users (id INTEGER PRIMARY KEY, email TEXT NOT NULL)\`}.run()
    }
  }
</>
</>`;
    const { protectAnalysis, errors } = paFor(src, "/tmp/_prec/app.scrml");
    expect(errors.some((e) => e.code === "E-PA-002")).toBe(false);
    const view = [...protectAnalysis.views.values()][0];
    const users = view.tables.get("users");
    const cols = users.fullSchema.map((c) => c.name).sort();
    // email present -> the ?{} CREATE TABLE (2 cols) won over the schema DDL (1 col).
    expect(cols).toEqual(["email", "id"]);
  });
});
