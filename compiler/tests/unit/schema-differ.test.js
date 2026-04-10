import { describe, test, expect } from "bun:test";
import { parseSchemaBlock, diffSchema } from "../../src/schema-differ.js";

// ==========================================================================
// §1 — parseSchemaBlock: basic table parsing
// ==========================================================================
describe("schema-differ §1: parseSchemaBlock basics", () => {
  test("parses a single table with columns", () => {
    const result = parseSchemaBlock(`
      users {
        id: integer primary key
        name: text not null
        email: text not null unique
      }
    `);
    expect(result.tables).toHaveLength(1);
    expect(result.tables[0].name).toBe("users");
    expect(result.tables[0].columns).toHaveLength(3);
  });

  test("parses column types correctly", () => {
    const result = parseSchemaBlock(`
      items {
        id: integer primary key
        name: text not null
        price: real
        data: blob
        active: boolean
        created: timestamp
      }
    `);
    const cols = result.tables[0].columns;
    expect(cols[0].type).toBe("INTEGER");
    expect(cols[1].type).toBe("TEXT");
    expect(cols[2].type).toBe("REAL");
    expect(cols[3].type).toBe("BLOB");
    expect(cols[4].type).toBe("INTEGER"); // boolean → INTEGER
    expect(cols[5].type).toBe("TEXT");     // timestamp → TEXT
  });

  test("parses multiple tables", () => {
    const result = parseSchemaBlock(`
      users { id: integer primary key }
      posts { id: integer primary key }
    `);
    expect(result.tables).toHaveLength(2);
    expect(result.tables[0].name).toBe("users");
    expect(result.tables[1].name).toBe("posts");
  });

  test("parses constraints: not null, unique, primary key", () => {
    const result = parseSchemaBlock(`
      users {
        id: integer primary key
        email: text not null unique
      }
    `);
    const [id, email] = result.tables[0].columns;
    expect(id.primaryKey).toBe(true);
    expect(email.notNull).toBe(true);
    expect(email.unique).toBe(true);
  });

  test("parses default values", () => {
    const result = parseSchemaBlock(`
      users {
        plan: text default('free')
        active: boolean default(1)
      }
    `);
    const [plan, active] = result.tables[0].columns;
    expect(plan.default).toBe("'free'");
    expect(active.default).toBe("1");
  });

  test("parses references", () => {
    const result = parseSchemaBlock(`
      posts {
        user_id: integer references users(id)
      }
    `);
    const col = result.tables[0].columns[0];
    expect(col.references).toEqual({ table: "users", column: "id" });
  });

  test("parses rename from", () => {
    const result = parseSchemaBlock(`
      users {
        display_name: text rename from name
      }
    `);
    const col = result.tables[0].columns[0];
    expect(col.renameFrom).toBe("name");
  });
});

// ==========================================================================
// §2 — diffSchema: new tables
// ==========================================================================
describe("schema-differ §2: diffSchema new tables", () => {
  test("generates CREATE TABLE for new table", () => {
    const desired = parseSchemaBlock(`
      users {
        id: integer primary key
        name: text not null
      }
    `);
    const actual = { tables: [] };
    const { sql } = diffSchema(desired, actual);
    expect(sql).toHaveLength(1);
    expect(sql[0]).toContain("CREATE TABLE");
    expect(sql[0]).toContain('"users"');
    expect(sql[0]).toContain('"id" INTEGER PRIMARY KEY');
    expect(sql[0]).toContain('"name" TEXT NOT NULL');
  });

  test("generates CREATE TABLE for multiple new tables", () => {
    const desired = parseSchemaBlock(`
      users { id: integer primary key }
      posts { id: integer primary key }
    `);
    const actual = { tables: [] };
    const { sql } = diffSchema(desired, actual);
    expect(sql).toHaveLength(2);
  });
});

// ==========================================================================
// §3 — diffSchema: add columns
// ==========================================================================
describe("schema-differ §3: diffSchema add columns", () => {
  test("generates ADD COLUMN for new nullable column", () => {
    const desired = parseSchemaBlock(`
      users {
        id: integer primary key
        name: text not null
        plan: text
      }
    `);
    const actual = {
      tables: [{
        name: "users",
        columns: [
          { name: "id", type: "INTEGER", primaryKey: true, notNull: false, default: null },
          { name: "name", type: "TEXT", primaryKey: false, notNull: true, default: null },
        ],
      }],
    };
    const { sql } = diffSchema(desired, actual);
    expect(sql.some(s => s.includes("ADD COLUMN") && s.includes('"plan"'))).toBe(true);
  });

  test("generates ADD COLUMN with default for NOT NULL column", () => {
    const desired = parseSchemaBlock(`
      users {
        id: integer primary key
        plan: text not null default('free')
      }
    `);
    const actual = {
      tables: [{
        name: "users",
        columns: [
          { name: "id", type: "INTEGER", primaryKey: true, notNull: false, default: null },
        ],
      }],
    };
    const { sql } = diffSchema(desired, actual);
    expect(sql.some(s => s.includes("ADD COLUMN") && s.includes("NOT NULL") && s.includes("DEFAULT"))).toBe(true);
  });
});

// ==========================================================================
// §4 — diffSchema: rename columns
// ==========================================================================
describe("schema-differ §4: diffSchema rename columns", () => {
  test("generates RENAME COLUMN when rename from is specified", () => {
    const desired = parseSchemaBlock(`
      users {
        id: integer primary key
        display_name: text rename from name
      }
    `);
    const actual = {
      tables: [{
        name: "users",
        columns: [
          { name: "id", type: "INTEGER", primaryKey: true, notNull: false, default: null },
          { name: "name", type: "TEXT", primaryKey: false, notNull: false, default: null },
        ],
      }],
    };
    const { sql } = diffSchema(desired, actual);
    expect(sql.some(s => s.includes("RENAME COLUMN") && s.includes('"name"') && s.includes('"display_name"'))).toBe(true);
  });
});

// ==========================================================================
// §5 — diffSchema: drop tables
// ==========================================================================
describe("schema-differ §5: diffSchema drop tables", () => {
  test("generates DROP TABLE for removed table", () => {
    const desired = parseSchemaBlock(`
      users { id: integer primary key }
    `);
    const actual = {
      tables: [
        { name: "users", columns: [{ name: "id", type: "INTEGER", primaryKey: true, notNull: false, default: null }] },
        { name: "legacy", columns: [{ name: "id", type: "INTEGER", primaryKey: true, notNull: false, default: null }] },
      ],
    };
    const { sql, warnings } = diffSchema(desired, actual);
    expect(sql.some(s => s.includes("DROP TABLE") && s.includes('"legacy"'))).toBe(true);
    expect(warnings.some(w => w.includes("W-SCHEMA-002"))).toBe(true);
  });
});

// ==========================================================================
// §6 — diffSchema: no changes needed
// ==========================================================================
describe("schema-differ §6: diffSchema no changes", () => {
  test("returns empty SQL when schemas match", () => {
    const desired = parseSchemaBlock(`
      users {
        id: integer primary key
        name: text not null
      }
    `);
    const actual = {
      tables: [{
        name: "users",
        columns: [
          { name: "id", type: "INTEGER", primaryKey: true, notNull: false, default: null },
          { name: "name", type: "TEXT", primaryKey: false, notNull: true, default: null },
        ],
      }],
    };
    const { sql } = diffSchema(desired, actual);
    expect(sql).toHaveLength(0);
  });
});

// ==========================================================================
// §7 — Full lifecycle: version 1 → version 2
// ==========================================================================
describe("schema-differ §7: full lifecycle v1 → v2", () => {
  test("handles the SPEC §38 worked example", () => {
    // Version 1: just users
    const v1 = parseSchemaBlock(`
      users {
        id: integer primary key
        name: text not null
        email: text not null unique
      }
    `);
    const emptyDb = { tables: [] };
    const { sql: v1Sql } = diffSchema(v1, emptyDb);
    expect(v1Sql).toHaveLength(1);
    expect(v1Sql[0]).toContain("CREATE TABLE");

    // Version 2: add plan to users, add posts table
    const v2 = parseSchemaBlock(`
      users {
        id: integer primary key
        name: text not null
        email: text not null unique
        plan: text default('free')
      }
      posts {
        id: integer primary key
        title: text not null
        author_id: integer not null references users(id)
        created_at: timestamp default(CURRENT_TIMESTAMP)
      }
    `);
    const afterV1 = {
      tables: [{
        name: "users",
        columns: [
          { name: "id", type: "INTEGER", primaryKey: true, notNull: false, default: null },
          { name: "name", type: "TEXT", primaryKey: false, notNull: true, default: null },
          { name: "email", type: "TEXT", primaryKey: false, notNull: true, default: null },
        ],
      }],
    };
    const { sql: v2Sql } = diffSchema(v2, afterV1);
    // Should ADD COLUMN plan to users + CREATE TABLE posts
    expect(v2Sql.some(s => s.includes("ADD COLUMN") && s.includes('"plan"'))).toBe(true);
    expect(v2Sql.some(s => s.includes("CREATE TABLE") && s.includes('"posts"'))).toBe(true);
  });
});
