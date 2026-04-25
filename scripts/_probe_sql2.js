// Probe sql.array and other helpers
import { SQL } from "bun";
const sql = new SQL(":memory:");

console.log("sql.array.toString:", sql.array.toString().slice(0, 300));

await sql`CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)`;
await sql`INSERT INTO users (id, name) VALUES (1, 'a'), (2, 'b'), (3, 'c'), (4, 'd')`;

const ids = [1, 3];
// Try sql.array(ids)
try {
  const r = await sql`SELECT * FROM users WHERE id IN (${sql.array(ids)})`;
  console.log("sql.array IN:", JSON.stringify(r));
} catch (e) {
  console.log("sql.array err:", e?.message?.slice(0, 200));
}
// Try IN (${ids.join(',')}) - won't work but let's confirm
try {
  // Spread args isn't a thing in tagged templates. Best practice for IN list
  // in Bun.SQL is the dynamic-template form. Let's see.
  // ANOTHER approach: spread placeholders manually with sql.unsafe
  const placeholders = ids.map((_, i) => `?${i + 1}`).join(",");
  console.log("would use unsafe with placeholders:", placeholders);
} catch (e) {
  console.log(e);
}

// Try fragment-style array binding via "dynamic IN"
// Per Bun docs: sql`... IN ${sql.array(ids)}`  (no parens)
try {
  const r = await sql`SELECT * FROM users WHERE id IN ${sql.array(ids)}`;
  console.log("sql.array no-parens IN:", JSON.stringify(r));
} catch (e) {
  console.log("sql.array no-parens err:", e?.message?.slice(0, 200));
}

// Multi-row insert via sql.array of objects?
try {
  const rows = [{id: 5, name: "e"}, {id: 6, name: "f"}];
  await sql`INSERT INTO users ${sql(rows)}`;
  const all = await sql`SELECT * FROM users`;
  console.log("multi insert:", JSON.stringify(all));
} catch (e) {
  console.log("multi insert err:", e?.message?.slice(0, 200));
}

// Single-row helper? Try sql.first or .one
console.log("sql.first:", typeof sql.first);
console.log("sql.one:", typeof sql.one);

// Check toString of begin
console.log("begin signature:", sql.begin.toString().slice(0, 300));
