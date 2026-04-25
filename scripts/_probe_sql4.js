// Final probe — confirm Array.isArray + .length + spread for our codegen needs
import { SQL } from "bun";
const sql = new SQL(":memory:");
await sql`CREATE TABLE u (id INTEGER, name TEXT)`;
await sql`INSERT INTO u VALUES (1, 'a'), (2, 'b')`;

const r = await sql`SELECT * FROM u`;
console.log("isArray:", Array.isArray(r));
console.log("length:", r.length);
console.log("[0]:", JSON.stringify(r[0]));
console.log("[0] ?? null on empty:");
const empty = await sql`SELECT * FROM u WHERE id = 99`;
console.log("empty isArray:", Array.isArray(empty), "length:", empty.length);
console.log("empty[0] ?? null:", empty[0] ?? null);

// Confirm INSERT result usable
const insRes = await sql`INSERT INTO u (id, name) VALUES (3, 'c')`;
console.log("INSERT result:", JSON.stringify(insRes));
console.log("lastInsertRowid:", insRes.lastInsertRowid);
console.log("affectedRows:", insRes.affectedRows);

// Confirm await on .unsafe
const u1 = await sql.unsafe("SELECT * FROM u");
console.log("unsafe results count:", u1.length);

// Can we close the in-memory connection cleanly?
await sql.close();
console.log("closed OK");
