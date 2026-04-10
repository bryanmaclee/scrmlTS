#!/usr/bin/env bun
import { readdirSync, statSync } from "fs";
import { resolve, join } from "path";
import { spawnSync } from "child_process";

const root = resolve(import.meta.dir, "../gauntlet/round3");
const cwd = resolve(import.meta.dir, "..");

function findScrml(dir) {
  let files = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      files = files.concat(findScrml(full));
    } else if (entry.endsWith(".scrml")) {
      files.push(full);
    }
  }
  return files;
}

const files = findScrml(root);
let pass = 0, ctx003 = 0, ctx001 = 0, other = 0;
const ctx003Files = [], ctx001Files = [], otherFiles = [];

for (const f of files) {
  const result = spawnSync("bun", ["run", "src/index.js", f], { cwd, stdio: ["pipe", "pipe", "pipe"] });
  const output = (result.stdout?.toString() || "") + (result.stderr?.toString() || "");
  if (output.includes("BS error") && output.includes("E-CTX-003")) {
    ctx003++;
    ctx003Files.push(f.replace(root + "/", ""));
  } else if (output.includes("BS error") && output.includes("E-CTX-001")) {
    ctx001++;
    ctx001Files.push(f.replace(root + "/", ""));
  } else if (result.status !== 0 && output.includes("BS error")) {
    other++;
    const errLine = output.split("\n").find(l => l.includes("BS error")) || "";
    otherFiles.push(f.replace(root + "/", "") + " -- " + errLine.trim());
  } else if (result.status === 0) {
    pass++;
  } else {
    // Post-BS failures (still count as pass for our purposes)
    pass++;
  }
}

console.log(`Total: ${files.length}`);
console.log(`Pass (past BS): ${pass}`);
console.log(`E-CTX-003: ${ctx003}`);
console.log(`E-CTX-001: ${ctx001}`);
console.log(`Other BS: ${other}`);
console.log("\n--- E-CTX-003 files ---");
ctx003Files.forEach(f => console.log("  " + f));
console.log("\n--- E-CTX-001 files ---");
ctx001Files.forEach(f => console.log("  " + f));
if (otherFiles.length) {
  console.log("\n--- Other BS ---");
  otherFiles.forEach(f => console.log("  " + f));
}
