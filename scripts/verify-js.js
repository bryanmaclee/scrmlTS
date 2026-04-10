#!/usr/bin/env bun
// Verify that generated JS files are syntactically valid
import { readFileSync } from "fs";

const file = process.argv[2];
if (!file) { console.error("Usage: bun run scripts/verify-js.js <file.js>"); process.exit(1); }

const code = readFileSync(file, "utf8");
try {
  // Use Function constructor to check syntax without executing
  new Function(code);
  console.log("VALID: " + file);
} catch (e) {
  console.error("SYNTAX ERROR in " + file + ": " + e.message);
  process.exit(1);
}
