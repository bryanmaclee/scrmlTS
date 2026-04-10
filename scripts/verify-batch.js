#!/usr/bin/env bun
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

const dir = "samples/compilation-tests/dist";
const files = readdirSync(dir).filter(f => f.endsWith(".client.js"));
let valid = 0;
let invalid = 0;
const errors = [];

for (const file of files) {
  const code = readFileSync(join(dir, file), "utf8");
  try {
    new Function(code);
    valid++;
  } catch (e) {
    invalid++;
    errors.push({ file, error: e.message });
  }
}

console.log(`Valid: ${valid}/${files.length}`);
console.log(`Invalid: ${invalid}/${files.length}`);
if (errors.length > 0) {
  console.log("\nSyntax errors:");
  for (const { file, error } of errors) {
    console.log(`  ${file}: ${error}`);
  }
}
