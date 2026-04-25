// Probe dynamic IN-list patterns for SQLite Bun.SQL
import { SQL } from "bun";
const sql = new SQL(":memory:");
await sql`CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)`;
await sql`INSERT INTO users (id, name) VALUES (1, 'a'), (2, 'b'), (3, 'c'), (4, 'd')`;

// Dynamic IN list pattern 1: build placeholders + spread
const ids = [1, 3];
const placeholders = ids.map((_, i) => `?${i + 1}`).join(", ");
console.log("Dynamic SQL string:", `SELECT * FROM users WHERE id IN (${placeholders})`);

// Try sql.unsafe with array of bind values
try {
  const r = await sql.unsafe(`SELECT * FROM users WHERE id IN (${placeholders})`, ids);
  console.log("unsafe approach:", JSON.stringify(r));
} catch (e) {
  console.log("unsafe err:", e?.message);
}

// Try sql.unsafe without bound params (raw - dangerous)
try {
  const r = await sql.unsafe(`SELECT * FROM users WHERE id IN (1, 3)`);
  console.log("unsafe no-bind:", JSON.stringify(r));
} catch (e) {
  console.log("unsafe no-bind err:", e?.message);
}

// Try template-spread style: sql`... IN (${id1}, ${id2})`
try {
  const [a, b] = ids;
  const r = await sql`SELECT * FROM users WHERE id IN (${a}, ${b})`;
  console.log("template multi-param IN:", JSON.stringify(r));
} catch (e) {
  console.log("template multi-param err:", e?.message);
}

// Try fragment composition - sql.fragment? sql.raw?
console.log("sql.fragment:", typeof sql.fragment);
console.log("sql.raw:", typeof sql.raw);

// Try sql() - is it a function-tag? Use with template literal
const ssql = sql`SELECT * FROM users WHERE name = ${"a"}`;
console.log("query thenable:", typeof ssql, "has then:", typeof ssql.then);
console.log("query proto:", Object.getOwnPropertyNames(Object.getPrototypeOf(ssql)).slice(0, 30));

// Can we pass dynamic SQL via sql() — is sql tag callable with non-template args?
try {
  const r = await sql("SELECT 1 AS one");
  console.log("sql(string):", JSON.stringify(r));
} catch (e) {
  console.log("sql(string) err:", e?.message?.slice(0, 200));
}

// sql.simple()? sql.values()?
console.log("sql.simple:", typeof sql.simple);
console.log("sql.values:", typeof sql.values);
console.log("sql.run:", typeof sql.run);
console.log("sql.get:", typeof sql.get);
console.log("sql.all:", typeof sql.all);

// Check if return value has .values() / .raw() / similar method per Postgres-style
const q = sql`SELECT 1 AS one, 2 AS two`;
console.log("query thenable methods:", Object.getOwnPropertyNames(Object.getPrototypeOf(q)));
const result = await q;
console.log("result props:", Object.keys(result));
console.log("result has .count:", "count" in result);
console.log("result.count:", result.count);
