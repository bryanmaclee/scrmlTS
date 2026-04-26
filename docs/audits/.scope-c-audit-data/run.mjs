// Audit runner: compile every top-level *.scrml in samples/compilation-tests/
// and emit a TSV plus per-file logs.
import { readdirSync, mkdirSync, writeFileSync, appendFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, basename } from "node:path";

const ROOT = "/home/bryan-maclee/scrmlMaster/scrmlTS";
const SAMPLES = join(ROOT, "samples/compilation-tests");
const OUT = join(ROOT, "docs/audits/.scope-c-audit-data");
const LOGS = join(OUT, "logs");
mkdirSync(LOGS, { recursive: true });

const RESULTS = join(OUT, "results.tsv");
writeFileSync(RESULTS, "file\texit\twarn_codes\terr_codes\tfirst_err_line\n");

const files = readdirSync(SAMPLES)
  .filter(f => f.endsWith(".scrml"))
  .sort();

const reW = /W-[A-Z0-9]+-[0-9]+/g;
const reE = /E-[A-Z0-9]+-[0-9]+/g;

let i = 0;
for (const f of files) {
  i++;
  const full = join(SAMPLES, f);
  const res = spawnSync("bun", ["run", "compiler/src/cli.js", "compile", `samples/compilation-tests/${f}`], {
    cwd: ROOT,
    encoding: "utf8",
    timeout: 30_000,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const out = (res.stdout || "") + "\n" + (res.stderr || "");
  const log = join(LOGS, f + ".log");
  writeFileSync(log, out);
  let exitCode;
  if (res.error && res.error.code === "ETIMEDOUT") exitCode = 124;
  else exitCode = res.status ?? -1;
  const wset = new Set();
  const eset = new Set();
  for (const m of out.matchAll(reW)) wset.add(m[0]);
  for (const m of out.matchAll(reE)) eset.add(m[0]);
  const firstErr = (out.split("\n").find(l => /^(error|Error)/.test(l)) || "").slice(0, 200).replace(/\t/g, " ");
  appendFileSync(RESULTS, `${f}\t${exitCode}\t${[...wset].sort().join(",")}\t${[...eset].sort().join(",")}\t${firstErr}\n`);
  if (i % 25 === 0) console.log(`progress: ${i}/${files.length}`);
}
console.log(`DONE ${i} files`);
