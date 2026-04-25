#!/usr/bin/env bun
// Smoke: Bun.Transpiler.scan parse check on every dist .client.js / .server.js.
// Used to make sure the fix did not introduce a syntax error.

import { readdirSync, readFileSync } from "fs";
import { join } from "path";

const root = process.argv[2] ?? "samples/compilation-tests/dist";
const files = readdirSync(root).filter((f) => f.endsWith(".client.js") || f.endsWith(".server.js"));

let pass = 0, fail = 0;
const fails = [];
const transpiler = new Bun.Transpiler({ loader: "js" });
for (const f of files.sort()) {
  const path = join(root, f);
  const src = readFileSync(path, "utf8");
  try {
    transpiler.scan(src);
    pass++;
  } catch (e) {
    fail++;
    fails.push({ f, err: String(e.message ?? e).split("\n")[0] });
  }
}

console.log(`pass=${pass} fail=${fail} total=${files.length}`);
if (fails.length) {
  console.log("FAIL:");
  for (const x of fails) console.log(`  ${x.f}: ${x.err}`);
}
