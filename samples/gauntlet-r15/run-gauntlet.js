#!/usr/bin/env bun
/**
 * Gauntlet R15 — compile all files and report results.
 */
import { compileScrml } from "../../compiler/src/api.js";
import { readdirSync, readFileSync, writeFileSync, existsSync } from "fs";
import { resolve, join, basename } from "path";
import { execSync } from "child_process";

const R14_DIR = resolve(import.meta.dir, "../gauntlet-r14");
const R15_DIR = resolve(import.meta.dir);
const META_DIR = resolve(import.meta.dir, "../compilation-tests");
const OUTPUT_DIR = resolve(R15_DIR, "dist");

// Collect all files to compile
const r14Files = readdirSync(R14_DIR)
  .filter(f => f.endsWith(".scrml"))
  .map(f => ({ name: f, path: join(R14_DIR, f), group: "R14-devs" }));

const stressFiles = readdirSync(R15_DIR)
  .filter(f => f.endsWith(".scrml"))
  .map(f => ({ name: f, path: join(R15_DIR, f), group: "R15-stress" }));

const metaNames = [
  "meta-component-gen.scrml",
  "meta-conditional-markup.scrml",
  "meta-loop-gen.scrml",
  "meta-style-gen.scrml",
  "meta-data-table.scrml",
];
const metaFiles = metaNames
  .filter(f => existsSync(join(META_DIR, f)))
  .map(f => ({ name: f, path: join(META_DIR, f), group: "Meta-R2" }));

const allFiles = [...r14Files, ...stressFiles, ...metaFiles];

console.log(`\n=== GAUNTLET R15 ===`);
console.log(`Total files: ${allFiles.length}`);
console.log(`  R14 dev personas: ${r14Files.length}`);
console.log(`  R15 stress tests: ${stressFiles.length}`);
console.log(`  Meta R2 files: ${metaFiles.length}`);
console.log("");

const results = [];

for (const file of allFiles) {
  const result = {
    name: file.name,
    group: file.group,
    compiled: false,
    errors: [],
    warnings: [],
    validJs: null,
    outputFiles: [],
    durationMs: 0,
  };

  try {
    const out = compileScrml({
      inputFiles: [file.path],
      outputDir: OUTPUT_DIR,
      verbose: false,
      write: true,
    });

    result.compiled = true;
    result.errors = out.errors || [];
    result.warnings = out.warnings || [];
    result.durationMs = out.durationMs;
    result.fileCount = out.fileCount;

    // Check which output files were created
    const base = basename(file.name, ".scrml");
    const possibleOutputs = [
      `${base}.client.js`,
      `${base}.server.js`,
      `${base}.html`,
      `${base}.css`,
    ];
    for (const pf of possibleOutputs) {
      const fullPath = join(OUTPUT_DIR, pf);
      if (existsSync(fullPath)) {
        result.outputFiles.push(pf);
      }
    }

    // node --check on JS files
    result.validJs = true;
    for (const of of result.outputFiles) {
      if (of.endsWith(".js")) {
        try {
          execSync(`node --check "${join(OUTPUT_DIR, of)}"`, { stdio: "pipe" });
        } catch (e) {
          result.validJs = false;
          result.jsCheckError = `${of}: ${e.stderr?.toString().trim() || e.message}`;
        }
      }
    }
  } catch (e) {
    result.compiled = false;
    result.errors = [{ code: "CRASH", message: e.message }];
  }

  results.push(result);

  // Print per-file
  const status = result.compiled ? "OK" : "FAIL";
  const errCount = result.errors.length;
  const warnCount = result.warnings.length;
  const jsStatus = result.validJs === true ? "PASS" : result.validJs === false ? "FAIL" : "N/A";
  console.log(
    `[${status}] ${file.group.padEnd(12)} ${file.name.padEnd(40)} ` +
    `errs=${errCount} warns=${warnCount} js=${jsStatus} ${result.durationMs}ms`
  );
  if (result.errors.length > 0) {
    for (const e of result.errors) {
      console.log(`    ERROR: ${e.code || "?"} ${e.message || ""}`);
    }
  }
  if (result.validJs === false && result.jsCheckError) {
    console.log(`    JS-CHECK-FAIL: ${result.jsCheckError}`);
  }
}

// Summary
console.log("\n=== SUMMARY ===");
const compiled = results.filter(r => r.compiled).length;
const noErrors = results.filter(r => r.compiled && r.errors.length === 0).length;
const dbOnlyErrors = results.filter(r => r.compiled && r.errors.every(e => e.code === "E-PA-001" || e.code === "E-CG-006")).length;
const validJs = results.filter(r => r.validJs === true).length;
const totalWithJs = results.filter(r => r.validJs !== null).length;

console.log(`Compiled (no crash): ${compiled}/${results.length}`);
console.log(`No errors: ${noErrors}/${results.length}`);
console.log(`No errors (excl DB): ${noErrors + dbOnlyErrors}/${results.length}`);
console.log(`Valid JS (node --check): ${validJs}/${totalWithJs}`);

// Error breakdown
const errorCodes = {};
for (const r of results) {
  for (const e of r.errors) {
    const code = e.code || "UNKNOWN";
    errorCodes[code] = (errorCodes[code] || 0) + 1;
  }
}
if (Object.keys(errorCodes).length > 0) {
  console.log("\nError code frequency:");
  for (const [code, count] of Object.entries(errorCodes).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${code}: ${count}`);
  }
}

// Warning breakdown
const warnCodes = {};
for (const r of results) {
  for (const w of r.warnings) {
    const code = w.code || "UNKNOWN";
    warnCodes[code] = (warnCodes[code] || 0) + 1;
  }
}
if (Object.keys(warnCodes).length > 0) {
  console.log("\nWarning code frequency:");
  for (const [code, count] of Object.entries(warnCodes).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${code}: ${count}`);
  }
}
