#!/usr/bin/env bun
// Scan samples/compilation-tests/dist/ for:
//   - empty reactive_set args:  _scrml_reactive_set("name", )
//   - sql-ref placeholder comments: /* sql-ref:N */
// Reports counts + per-file lines. Used as before/after diff for this fix.

import { readdirSync, readFileSync } from "fs";
import { join } from "path";

const root = process.argv[2] ?? "samples/compilation-tests/dist";
const files = readdirSync(root).filter((f) => f.endsWith(".client.js") || f.endsWith(".server.js"));

const emptyArgRe = /_scrml_reactive_set\(\s*"[^"]*"\s*,\s*\)/g;
const sqlRefRe = /\/\*\s*sql-ref:[-0-9]+\s*\*\//g;

let totalEmpty = 0;
let totalSqlRef = 0;
const perFile = [];

for (const f of files.sort()) {
  const path = join(root, f);
  const src = readFileSync(path, "utf8");
  const lines = src.split("\n");
  let empty = 0, sqlRef = 0;
  const emptyHits = [];
  const sqlRefHits = [];
  lines.forEach((line, i) => {
    if (emptyArgRe.test(line)) { empty++; emptyHits.push([i + 1, line.trim()]); }
    if (sqlRefRe.test(line)) { sqlRef++; sqlRefHits.push([i + 1, line.trim()]); }
    emptyArgRe.lastIndex = 0;
    sqlRefRe.lastIndex = 0;
  });
  if (empty || sqlRef) {
    perFile.push({ f, empty, sqlRef, emptyHits, sqlRefHits });
  }
  totalEmpty += empty;
  totalSqlRef += sqlRef;
}

console.log(JSON.stringify({
  totals: { emptyReactiveSet: totalEmpty, sqlRefPlaceholder: totalSqlRef },
  files: perFile,
}, null, 2));
