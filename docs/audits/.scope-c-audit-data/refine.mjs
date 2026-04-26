// Refine FAIL classification by reading top-of-file comments for "should fail" / "rejects" / "demonstrates ... constraint" signals.
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = "/home/bryan-maclee/scrmlMaster/scrmlTS";
const TSV = `${ROOT}/docs/audits/.scope-c-audit-data/results.tsv`;
const lines = readFileSync(TSV, "utf8").trim().split("\n");
lines.shift();
const rows = lines.map(l => {
  const parts = l.split("\t");
  return {
    file: parts[0],
    exit: parseInt(parts[1], 10),
    warn_codes: parts[2] ? parts[2].split(",").filter(Boolean) : [],
    err_codes: parts[3] ? parts[3].split(",").filter(Boolean) : [],
    first_err: parts[4] || "",
  };
});

const fails = rows.filter(r => r.exit !== 0);

const negFnameRe = /(error-|invalid-|bad-|fail-|should-fail|negative|broken-|wrong-|unsupported-|forbidden-|conflict-)/i;
// Top-of-file negative-test signals
const negTopRe = /(should\s+(fail|reject|error)|compiler\s+should\s+reject|demonstrates?\s+the\s+(\w+\s+)?constraint|negative\s+test|expects?\s+E-|expected\s+E-|raises?\s+E-|rejects?\s+at\s+compile)/i;

function readTop(file) {
  const p = join(ROOT, "samples/compilation-tests", file);
  if (!existsSync(p)) return "";
  try {
    return readFileSync(p, "utf8").slice(0, 1200);
  } catch {
    return "";
  }
}

const out = { negative: [], stale: [], unknown: [] };
for (const r of fails) {
  const top = readTop(r.file);
  const isNegFname = negFnameRe.test(r.file);
  const isNegTop = negTopRe.test(top);
  if (isNegFname || isNegTop) {
    out.negative.push({ ...r, reason: isNegFname ? "filename" : "top-comment", topSnippet: top.slice(0, 240).replace(/\n/g, " ") });
  } else {
    // Heuristic: stale if it looks like an honest-attempt sample that just failed scope/sigil rules
    // (those got stricter post-S20). The first_err line will hint.
    out.unknown.push({ ...r, topSnippet: top.slice(0, 240).replace(/\n/g, " ") });
  }
}

console.log("=== Negative tests (signal found): " + out.negative.length + " ===");
for (const r of out.negative) console.log(`  ${r.file} [${r.reason}] err=${r.err_codes.join(",")}`);

console.log("\n=== Unknown / candidate-stale: " + out.unknown.length + " ===");
for (const r of out.unknown) console.log(`  ${r.file} err=${r.err_codes.join(",")} :: ${r.topSnippet.slice(0, 140)}`);
