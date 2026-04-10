#!/usr/bin/env bun
/**
 * Quick gauntlet round3 checker — counts pass/fail at BS stage.
 */
import { readdirSync, readFileSync, statSync } from "fs";
import { join, resolve } from "path";
import { splitBlocks } from "../src/block-splitter.js";

function walk(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) files.push(...walk(full));
    else if (entry.endsWith(".scrml")) files.push(full);
  }
  return files;
}

const root = resolve("gauntlet/round3");
const files = walk(root);
let pass = 0;
let fail = 0;
const errors = {};

for (const f of files) {
  const source = readFileSync(f, "utf8");
  try {
    splitBlocks(f, source);
    pass++;
  } catch (e) {
    fail++;
    const code = e.code || "UNKNOWN";
    errors[code] = (errors[code] || 0) + 1;
    // Get the line that caused the error
    const errLine = e.bsSpan?.line;
    let context = "";
    if (errLine) {
      const lines = source.split("\n");
      context = (lines[errLine - 1] || "").trim().slice(0, 80);
    }
    if (fail <= 30) {
      console.log(`FAIL [${e.code}] ${f.replace(root+'/', '')}: line ${errLine}: ${context}`);
    }
  }
}

console.log(`Total: ${files.length} | BS Pass: ${pass} | BS Fail: ${fail}`);
