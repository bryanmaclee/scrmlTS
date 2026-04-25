#!/usr/bin/env bun
// Compile every .scrml in samples/compilation-tests/ via the CLI.
// Used to refresh dist/ after the fix lands.

import { readdirSync } from "fs";
import { spawnSync } from "child_process";

const dir = process.argv[2] ?? "samples/compilation-tests";
const out = process.argv[3] ?? "samples/compilation-tests/dist";
const files = readdirSync(dir).filter((f) => f.endsWith(".scrml"));

let ok = 0, fail = 0;
const failed = [];
for (const f of files) {
  const r = spawnSync("bun", ["run", "compiler/src/cli.js", "compile", `${dir}/${f}`, "-o", `${out}/`], { stdio: "pipe" });
  if (r.status === 0) ok++;
  else { fail++; failed.push(f); }
}

console.log(`ok=${ok} fail=${fail} total=${files.length}`);
if (failed.length) console.log("FAILED:\n" + failed.map((f) => "  " + f).join("\n"));
