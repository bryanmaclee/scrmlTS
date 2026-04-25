// Throwaway probe — check Bun.SQL surface
import { SQL } from "bun";
console.log("typeof SQL:", typeof SQL);
console.log("SQL has prototype:", "prototype" in SQL);

// Try construction with SQLite path
try {
  const sql = new SQL(":memory:");
  console.log("constructed OK, typeof sql:", typeof sql);
  console.log("instance proto methods:", Object.getOwnPropertyNames(Object.getPrototypeOf(sql)).slice(0, 40));
  console.log("has begin:", typeof sql.begin);
  console.log("has unsafe:", typeof sql.unsafe);
  console.log("has end:", typeof sql.end);
  console.log("has close:", typeof sql.close);
  console.log("has reserve:", typeof sql.reserve);

  // Tagged template smoke
  const r = await sql`SELECT 1 AS one`;
  console.log("query result type:", typeof r, "isArray:", Array.isArray(r));
  console.log("query result:", JSON.stringify(r).slice(0, 200));

  // Param smoke
  const id = 42;
  const r2 = await sql`SELECT ${id} AS x`;
  console.log("param result:", JSON.stringify(r2).slice(0, 200));

  // IN list smoke (known important for Bun.SQL)
  const ids = [1, 2, 3];
  try {
    const r3 = await sql`SELECT ${ids} AS arr`;
    console.log("array param result:", JSON.stringify(r3).slice(0, 200));
  } catch (e) {
    console.log("array param error:", e?.message?.slice(0, 200));
  }

  // CREATE + INSERT + SELECT pipeline
  await sql`CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)`;
  await sql`INSERT INTO users (id, name) VALUES (1, 'alice'), (2, 'bob'), (3, 'carol')`;
  const inIds = [1, 3];
  try {
    const inResult = await sql`SELECT * FROM users WHERE id IN ${inIds}`;
    console.log("IN ${arr}:", JSON.stringify(inResult).slice(0, 300));
  } catch (e) {
    console.log("IN ${arr} error:", e?.message?.slice(0, 200));
  }
  // Try the alternative — IN (${arr})
  try {
    const inResult2 = await sql`SELECT * FROM users WHERE id IN (${inIds})`;
    console.log("IN (${arr}):", JSON.stringify(inResult2).slice(0, 300));
  } catch (e) {
    console.log("IN (${arr}) error:", e?.message?.slice(0, 200));
  }
  // Helper functions for IN?
  console.log("sql.array:", typeof sql.array);
  console.log("sql.in:", typeof sql.in);

  // Single-row helper?
  const single = await sql`SELECT * FROM users WHERE id = ${1}`;
  console.log("single match returns array of len:", single.length);

  // Transaction surface
  await sql.begin(async (tx) => {
    await tx`INSERT INTO users (id, name) VALUES (4, 'dave')`;
  });
  const after = await sql`SELECT COUNT(*) as c FROM users`;
  console.log("after begin:", JSON.stringify(after));

  // unsafe
  console.log("unsafe DDL works:");
  try {
    await sql.unsafe("CREATE TABLE _t (x INTEGER)");
    console.log("unsafe OK");
  } catch (e) {
    console.log("unsafe error:", e?.message?.slice(0, 200));
  }
} catch (e) {
  console.log("FATAL:", e?.message);
  console.log(e);
}
