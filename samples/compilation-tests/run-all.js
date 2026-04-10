#!/usr/bin/env bun
/**
 * Compile all .scrml files in this directory and report results.
 */
import { readdirSync } from "fs";
import { resolve, join } from "path";
import { spawnSync } from "child_process";

const dir = resolve(import.meta.dir);
const files = readdirSync(dir).filter(f => f.endsWith(".scrml")).sort();

let pass = 0;
let fail = 0;
const failures = [];

for (const file of files) {
  const filePath = join(dir, file);
  const result = spawnSync("bun", ["run", "src/index.js", filePath], {
    cwd: resolve(dir, "../.."),
    stdio: ["pipe", "pipe", "pipe"],
  });
  const stdout = result.stdout?.toString() || "";
  const stderr = result.stderr?.toString() || "";
  const output = stdout + stderr;

  if (result.status === 0) {
    pass++;
  } else {
    fail++;
    // Extract error line
    const errorLine = output.split("\n").find(l => l.includes("Error") || l.includes("error")) || "Unknown error";
    failures.push({ file, error: errorLine.trim() });
  }
}

console.log(`\n=== COMPILATION RESULTS ===`);
console.log(`Total samples: ${files.length}`);
console.log(`Pass: ${pass}`);
console.log(`Fail: ${fail}`);

if (failures.length > 0) {
  console.log(`\nFailed files:`);
  for (const f of failures) {
    console.log(`  ${f.file}: ${f.error}`);
  }
}

console.log(`\nSuccess rate: ${((pass / files.length) * 100).toFixed(1)}%`);
