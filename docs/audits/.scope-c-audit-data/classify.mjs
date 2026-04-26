// Classify the audit results and emit summary stats + JSON for the report.
import { readFileSync, writeFileSync } from "node:fs";

const ROOT = "/home/bryan-maclee/scrmlMaster/scrmlTS";
const TSV = `${ROOT}/docs/audits/.scope-c-audit-data/results.tsv`;
const lines = readFileSync(TSV, "utf8").trim().split("\n");
const header = lines.shift();
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

// Negative-test heuristic: filename indicators
const negRegex = /(error-|invalid-|bad-|fail-|should-fail|negative|missing-|forbidden-|conflict-|duplicate-|broken-|wrong-|unsupported-)/i;

// Classify failing samples
function classifyFail(r) {
  if (negRegex.test(r.file)) return "negative-test";
  // If we don't have any error code AND no first_err, mark unknown
  return "unknown"; // human will refine; default to unknown if not obviously negative
}
const failCats = { "negative-test": [], "stale": [], "unknown": [] };
for (const r of buckets.fail) {
  const cat = classifyFail(r);
  failCats[cat].push(r);
}

// Warning code frequency
const warnFreq = new Map();
for (const r of buckets.warn) {
  for (const w of r.warn_codes) warnFreq.set(w, (warnFreq.get(w) || 0) + 1);
}
const warnFreqSorted = [...warnFreq.entries()].sort((a, b) => b[1] - a[1]);

// Classify warning samples
const totalWarn = buckets.warn.length;
const systemicCodes = new Set(
  warnFreqSorted.filter(([_, n]) => n >= 50).map(([c]) => c) // "many samples" threshold
);
const testWarnRegex = /(warning|warn-|w-|diagnostic|deprecat)/i;
function classifyWarn(r) {
  if (testWarnRegex.test(r.file)) return "testing-of-warnings";
  // If every warn code on this file is systemic, call it systemic-warning
  if (r.warn_codes.length > 0 && r.warn_codes.every(c => systemicCodes.has(c))) return "systemic-warning";
  return "unknown";
}
const warnCats = { "testing-of-warnings": [], "systemic-warning": [], "stale-shape": [], "unknown": [] };
for (const r of buckets.warn) {
  const cat = classifyWarn(r);
  warnCats[cat].push(r);
}

// Group systemic-warning by code (primary code = most-frequent code on the file)
const systemicByCode = new Map();
for (const r of warnCats["systemic-warning"]) {
  // Use sorted list of codes as the bucketing key for clarity
  const key = r.warn_codes.join("+");
  if (!systemicByCode.has(key)) systemicByCode.set(key, []);
  systemicByCode.get(key).push(r);
}

const summary = {
  total: rows.length,
  clean: buckets.clean.length,
  warn: buckets.warn.length,
  fail: buckets.fail.length,
  failCats: Object.fromEntries(Object.entries(failCats).map(([k, v]) => [k, v.length])),
  warnCats: Object.fromEntries(Object.entries(warnCats).map(([k, v]) => [k, v.length])),
  warnFreq: warnFreqSorted,
};
console.log(JSON.stringify(summary, null, 2));

writeFileSync(
  `${ROOT}/docs/audits/.scope-c-audit-data/classification.json`,
  JSON.stringify({ summary, buckets, failCats, warnCats, warnFreq: warnFreqSorted, systemicByCode: Object.fromEntries(systemicByCode) }, null, 2)
);
