#!/usr/bin/env bun
// Gauntlet S19 PA-verified compilation sweep.
// Compiles every .scrml fixture in a phase dir and compares
// actual diag codes against .expected.json. Dev self-reports are NOT trusted.
import { readdirSync, readFileSync, existsSync } from "fs";
import { spawnSync } from "child_process";
import { join, basename } from "path";

const phaseDir = process.argv[2];
if (!phaseDir) {
  console.error("usage: verify.mjs <phase-dir>");
  process.exit(2);
}

const files = readdirSync(phaseDir)
  .filter(f => f.endsWith(".scrml") && !f.startsWith("_"))
  .sort();

const results = [];
const CLI = "compiler/src/cli.js";

for (const f of files) {
  const full = join(phaseDir, f);
  const expPath = full.replace(/\.scrml$/, ".expected.json");
  let expected = null;
  if (existsSync(expPath)) {
    try { expected = JSON.parse(readFileSync(expPath, "utf8")); }
    catch (e) { expected = { _parseError: e.message }; }
  }

  const r = spawnSync("bun", [CLI, full], {
    encoding: "utf8",
    timeout: 30000,
  });
  const out = (r.stdout || "") + (r.stderr || "");
  // Extract error/warning codes like E-FOO-001, W-BAR-002, D-BAZ-003
  const codesAll = [...new Set((out.match(/\b[EWD]-[A-Z]+-\d+/g) || []))];
  // Filter out "boilerplate" warnings the fixtures intentionally omit: W-PROGRAM-001 (no <program>), W-AUTH-001 (no session config)
  const BOILERPLATE = new Set(["W-PROGRAM-001", "W-AUTH-001"]);
  const codes = codesAll.filter(c => !BOILERPLATE.has(c));
  const hasRealError = /\berror\s+\[/i.test(out) || r.status !== 0;
  // Recompute warning/error excluding boilerplate
  const nonBoilerWarning = codes.some(c => c.startsWith("W-"));
  const hasError = hasRealError;
  const hasWarning = nonBoilerWarning;
  const hasCrash = /TypeError|ReferenceError|Cannot read|undefined is not|Error: at|node_modules/.test(out) && !/\berror\s+\[/i.test(out);

  let actualOutcome;
  if (hasCrash) actualOutcome = "crash";
  else if (hasError) actualOutcome = "error";
  else if (hasWarning) actualOutcome = "warning";
  else actualOutcome = "clean";

  const expectedOutcome = expected?.expectedOutcome || "MISSING";
  const expectedCodes = expected?.expectedCodes || [];
  let verdict;
  if (!expected) verdict = "NO_EXPECTED";
  else if (expected._parseError) verdict = "BAD_EXPECTED";
  else if (actualOutcome === "crash") verdict = "CRASH";
  else if (expectedOutcome === actualOutcome) {
    // outcome matches — now check codes
    if (expectedCodes.length === 0 || expectedCodes.includes("UNKNOWN")) {
      verdict = "MATCH";
    } else {
      const missing = expectedCodes.filter(c => !codes.includes(c));
      const unexpected = codes.filter(c => !expectedCodes.includes(c) && c.startsWith("E"));
      if (missing.length === 0 && unexpected.length === 0) verdict = "MATCH";
      else if (missing.length === 0) verdict = "EXTRA_CODES";
      else verdict = "WRONG_CODES";
    }
  } else {
    verdict = "OUTCOME_MISMATCH";
  }

  results.push({
    file: f,
    expectedOutcome,
    expectedCodes,
    actualOutcome,
    actualCodes: codes,
    exitCode: r.status,
    verdict,
    snippet: hasCrash ? out.slice(0, 400) : undefined,
  });
}

// Summary counts
const summary = {};
for (const r of results) summary[r.verdict] = (summary[r.verdict] || 0) + 1;
console.log("=== SUMMARY ===");
console.log(JSON.stringify(summary, null, 2));
console.log("\n=== NON-MATCH RESULTS ===");
for (const r of results) {
  if (r.verdict !== "MATCH") {
    console.log(`\n[${r.verdict}] ${r.file}`);
    console.log(`  expected: ${r.expectedOutcome} ${JSON.stringify(r.expectedCodes)}`);
    console.log(`  actual:   ${r.actualOutcome} ${JSON.stringify(r.actualCodes)} (exit ${r.exitCode})`);
    if (r.snippet) console.log(`  crash: ${r.snippet.replace(/\n/g, "\n  ")}`);
  }
}
console.log(`\ntotal: ${results.length}`);
