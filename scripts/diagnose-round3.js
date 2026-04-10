#!/usr/bin/env bun
import { readdirSync, readFileSync, statSync } from "fs";
import { resolve, join } from "path";
import { spawnSync } from "child_process";

const root = resolve(import.meta.dir, "../gauntlet/round3");
const cwd = resolve(import.meta.dir, "..");

function findScrml(dir) {
  let files = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) files = files.concat(findScrml(full));
    else if (entry.endsWith(".scrml")) files.push(full);
  }
  return files;
}

const files = findScrml(root);

for (const f of files) {
  const result = spawnSync("bun", ["run", "src/index.js", f], { cwd, stdio: ["pipe", "pipe", "pipe"] });
  const output = (result.stdout?.toString() || "") + (result.stderr?.toString() || "");
  if (output.includes("BS error")) {
    const errLine = output.split("\n").find(l => l.includes("BS error")) || "";
    const rel = f.replace(root + "/", "");

    // Check if file has // double-closer patterns
    const content = readFileSync(f, "utf8");
    const lines = content.split("\n");
    const doubleCloserLines = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Look for // that appears after content (not at line start after whitespace)
      const trimmed = line.trimStart();
      if (trimmed.startsWith("//")) continue; // This is a legit comment
      if (line.includes("//") && !line.includes("://") && !line.includes("https://")) {
        // Check if // appears after a / closer
        const idx = line.indexOf("//");
        const before = line.slice(0, idx);
        if (before.includes(">") || before.includes("/")) {
          doubleCloserLines.push(i + 1);
        }
      }
    }

    console.log(`${rel}`);
    console.log(`  Error: ${errLine.split(": ").slice(1).join(": ").trim()}`);
    if (doubleCloserLines.length > 0) {
      console.log(`  Double-closer // on lines: ${doubleCloserLines.join(", ")}`);
    }
    console.log();
  }
}
