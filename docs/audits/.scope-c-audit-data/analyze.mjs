// Deeper analysis: explore "unknown" buckets and check sample files for negative-test signals
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

const buckets = { clean: [], warn: [], fail: [] };
for (const r of rows) {
  if (r.exit !== 0) buckets.fail.push(r);
  else if (r.warn_codes.length > 0) buckets.warn.push(r);
  else buckets.clean.push(r);
}

// Look for top-of-file comment indicating intentionally negative
function readTop(file) {
  const p = join(ROOT, "samples/compilation-tests", file);
  if (!existsSync(p)) return "";
  try {
    return readFileSync(p, "utf8").slice(0, 600);
  } catch {
    return "";
  }
}

console.log("=== FAIL (24) ===");
for (const r of buckets.fail) {
  const top = readTop(r.file).replace(/\n/g, " | ").slice(0, 200);
  console.log(`${r.file} | err=${r.err_codes.join(",")} | TOP: ${top}`);
}

console.log("\n=== WARN-only without W-PROGRAM-001-only (potential interesting) ===");
const interesting = buckets.warn.filter(r =>
  !(r.warn_codes.length === 1 && r.warn_codes[0] === "W-PROGRAM-001")
);
console.log(`count=${interesting.length}`);
for (const r of interesting) {
  console.log(`${r.file} | warns=${r.warn_codes.join(",")}`);
}

console.log("\n=== Warn code freq across warn-only ===");
const freq = new Map();
for (const r of buckets.warn) for (const w of r.warn_codes) freq.set(w, (freq.get(w) || 0) + 1);
for (const [k, v] of [...freq.entries()].sort((a, b) => b[1] - a[1])) console.log(`${k}\t${v}`);
