#!/usr/bin/env bun
import { readdirSync, statSync } from "fs";
import { resolve, join } from "path";
import { spawnSync } from "child_process";

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

function testFiles(label, files) {
  let pass = 0, total = files.length;
  const fails = [];
  for (const f of files) {
    const result = spawnSync("bun", ["run", "src/index.js", f], { cwd, stdio: ["pipe", "pipe", "pipe"] });
    const output = (result.stdout?.toString() || "") + (result.stderr?.toString() || "");
    if (output.includes("Compiled")) {
      pass++;
    } else {
      fails.push(f);
    }
  }
  console.log(`${label}: ${pass}/${total}`);
  if (fails.length > 0) {
    for (const f of fails) console.log(`  FAIL: ${f}`);
  }
}

// New samples
const sampleDir = resolve(cwd, "samples/compilation-tests");
const newPrefixes = ["state-", "test-", "ref-", "modern-"];
const newSamples = readdirSync(sampleDir)
  .filter(f => f.endsWith(".scrml") && newPrefixes.some(p => f.startsWith(p)))
  .map(f => join(sampleDir, f));
testFiles("New samples", newSamples);

// Round 3
const r3Dir = resolve(cwd, "gauntlet/round3");
testFiles("Round 3", findScrml(r3Dir));

// Original samples
console.log("\n=== Original samples (regression) ===");
const origResult = spawnSync("bun", ["run", "samples/compilation-tests/run-all.js"], { cwd, stdio: ["pipe", "pipe", "pipe"] });
const origOutput = (origResult.stdout?.toString() || "") + (origResult.stderr?.toString() || "");
const lines = origOutput.trim().split("\n");
for (const l of lines.slice(-5)) console.log(l);
