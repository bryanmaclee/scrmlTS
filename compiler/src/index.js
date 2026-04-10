#!/usr/bin/env bun
/**
 * scrml compiler — CLI entry point (thin wrapper).
 *
 * Usage: bun run src/index.js <file.scrml|directory> [--output <dir>] [--verbose]
 *
 * Delegates all pipeline logic to api.js. This file exists only to parse
 * CLI arguments and call compileScrml(), preserving backward compatibility
 * with `bun run compiler/src/index.js`.
 */

import { statSync } from "fs";
import { dirname, join } from "path";
import { compileScrml, scanDirectory } from "./api.js";

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const inputFiles = [];
let outputDir = null;
let verbose = false;
let convertLegacyCss = false;
let embedRuntime = false;

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--output" || args[i] === "-o") {
    outputDir = args[++i];
  } else if (args[i] === "--verbose" || args[i] === "-v") {
    verbose = true;
  } else if (args[i] === "--convert-legacy-css") {
    convertLegacyCss = true;
  } else if (args[i] === "--embed-runtime") {
    embedRuntime = true;
  } else if (args[i].endsWith(".scrml")) {
    inputFiles.push(args[i]);
  } else {
    // Check if it's a directory — file-based routing mode
    try {
      const stat = statSync(args[i]);
      if (stat.isDirectory()) {
        const dirFiles = scanDirectory(args[i]);
        inputFiles.push(...dirFiles);
        continue;
      }
    } catch { /* not a directory */ }
    console.error(`Unknown argument: ${args[i]}`);
    process.exit(1);
  }
}

if (inputFiles.length === 0) {
  console.error("Usage: bun run src/index.js <file.scrml|directory> [--output <dir>] [--verbose]");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Compile
// ---------------------------------------------------------------------------

console.log(`scrml compiler — compiling ${inputFiles.length} file(s)...`);

const result = compileScrml({
  inputFiles,
  outputDir,
  verbose,
  convertLegacyCss,
  embedRuntime,
  write: true,
  log: console.log,
});

// ---------------------------------------------------------------------------
// Output summary
// ---------------------------------------------------------------------------

console.log(`\nCompiled ${inputFiles.length} file(s) in ${result.durationMs}ms`);
console.log(`Output: ${result.fileCount} files → ${result.outputDir}/`);
if (result.errors.length > 0) console.log(`Errors: ${result.errors.length}`);
if (result.warnings.length > 0) console.log(`Warnings: ${result.warnings.length}`);

if (result.errors.length > 0) {
  console.log("\nErrors:");
  for (const e of result.errors) {
    console.log(`  [${e.stage}] ${e.code}: ${e.message?.slice(0, 120)}`);
  }
  process.exit(1);
}
