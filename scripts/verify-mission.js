#!/usr/bin/env bun
import { readFileSync } from "fs";

const files = [
  "samples/compilation-tests/dist/reactive-001-basic-decl.client.js",
  "samples/compilation-tests/dist/func-003-onclick.client.js",
  "samples/compilation-tests/dist/control-001-if-basic.client.js",
  "samples/compilation-tests/dist/lift-001-basic.client.js",
  "samples/compilation-tests/dist/sql-001-basic-select.client.js",
  "samples/compilation-tests/dist/combined-001-counter.client.js",
];

for (const file of files) {
  const code = readFileSync(file, "utf8");
  try {
    new Function(code);
    console.log("VALID: " + file);
  } catch (e) {
    console.error("SYNTAX ERROR in " + file + ": " + e.message);
  }
}
