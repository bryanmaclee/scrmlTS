// Follow-up edit: change `expr: refTok.text` -> `expr: ""` for return-stmt with sqlNode.
// Reason: refTok.text is the raw ?{...} source, which the batch-planner string scanner
// counts as a SECOND SQL site (the structured walk via sqlNode already counts the first).

import { readFileSync, writeFileSync } from "node:fs";

function replaceAll(file, find, replace, label) {
  const src = readFileSync(file, "utf8");
  const count = src.split(find).length - 1;
  if (count === 0) {
    console.error("FAIL [" + label + "]: no anchors found in " + file);
    process.exit(1);
  }
  const next = src.split(find).join(replace);
  writeFileSync(file, next);
  console.log("OK   [" + label + "]: " + file + " (" + count + " replacements)");
}

const find = '            expr: refTok.text,\n            sqlNode: childNode,';
const replace = '            // raw ?{...} source intentionally NOT stored in `expr` — batch-planner\n            // string scanner would otherwise double-count the SQL site (structured walk\n            // via sqlNode already counts it once). Empty expr matches the bare-return shape.\n            expr: "",\n            sqlNode: childNode,';

replaceAll("compiler/src/ast-builder.js", find, replace, "ast-builder both return-stmt sites");

console.log("DONE");
