// Compile every sample in samples/compilation-tests/ and check that the
// resulting server.js + client.js parse cleanly (Bun.Transpiler.scan).
// Print a summary of pass/fail and any sql-ref leaks.
//
// Usage: bun run docs/changes/fix-cg-cps-return-sql-ref-placeholder/gauntlet-check.mjs

import { readdirSync, readFileSync, existsSync, mkdirSync, rmSync } from "fs";
import { resolve } from "path";
import { compileScrml } from "../../../compiler/src/api.js";

const ROOT = resolve(import.meta.dir, "../../../");
const SAMPLES = resolve(ROOT, "samples/compilation-tests");
const DIST = resolve(ROOT, "/tmp/gauntlet-check-fixrdsql");

mkdirSync(DIST, { recursive: true });

const files = readdirSync(SAMPLES)
  .filter((f) => f.endsWith(".scrml"))
  .map((f) => resolve(SAMPLES, f));

let totalSamples = 0;
let compileOk = 0;
let compileFail = 0;
let serverParseOk = 0;
let clientParseOk = 0;
let serverParseFail = 0;
let clientParseFail = 0;
let sqlRefLeaks = 0;
const failures = [];
const sqlRefFiles = [];

for (const f of files) {
  totalSamples++;
  const tag = f.split("/").pop().replace(".scrml", "");
  try {
    const result = compileScrml({
      inputFiles: [f],
      write: false,
      outputDir: DIST,
    });
    if (result.errors && result.errors.length > 0) {
      const errCodes = new Set(result.errors.map(e => e.code));
      // Errors are not necessarily fatal — some samples are EXPECTED to fail
      // (e.g., E-* tests). But syntax errors in compiled output are.
      // We still attempt to parse the output.
    }
    let serverOk = true;
    let clientOk = true;
    let hadSqlRef = false;
    for (const [, output] of result.outputs) {
      if (output.serverJs) {
        if (output.serverJs.includes("sql-ref:")) {
          hadSqlRef = true;
        }
        try {
          new Bun.Transpiler({ loader: "js" }).scan(output.serverJs);
        } catch (e) {
          serverOk = false;
          failures.push(`${tag} server.js parse: ${e.message}`);
        }
      }
      if (output.clientJs) {
        if (output.clientJs.includes("sql-ref:")) {
          hadSqlRef = true;
        }
        try {
          new Bun.Transpiler({ loader: "js" }).scan(output.clientJs);
        } catch (e) {
          clientOk = false;
          failures.push(`${tag} client.js parse: ${e.message}`);
        }
      }
    }
    if (serverOk) serverParseOk++; else serverParseFail++;
    if (clientOk) clientParseOk++; else clientParseFail++;
    if (hadSqlRef) {
      sqlRefLeaks++;
      sqlRefFiles.push(tag);
    }
    compileOk++;
  } catch (e) {
    compileFail++;
    failures.push(`${tag} compile: ${e.message}`);
  }
}

console.log("Total samples:        ", totalSamples);
console.log("Compile OK:           ", compileOk);
console.log("Compile FAIL:         ", compileFail);
console.log("Server.js parse OK:   ", serverParseOk);
console.log("Server.js parse FAIL: ", serverParseFail);
console.log("Client.js parse OK:   ", clientParseOk);
console.log("Client.js parse FAIL: ", clientParseFail);
console.log("Files with sql-ref:   ", sqlRefLeaks);
if (sqlRefFiles.length > 0) {
  console.log("\nFiles still containing sql-ref leaks:");
  for (const f of sqlRefFiles) console.log("  -", f);
}
if (failures.length > 0) {
  console.log("\nFailures:");
  for (const f of failures.slice(0, 20)) console.log("  -", f);
  if (failures.length > 20) console.log(`  ... and ${failures.length - 20} more`);
}

rmSync(DIST, { recursive: true, force: true });
