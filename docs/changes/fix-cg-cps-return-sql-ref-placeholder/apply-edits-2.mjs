// Fix the JSDoc comment in ast-builder.js — the inner `/* sql-ref:N */`
// terminates the outer JSDoc comment early. Replace with `/_* sql-ref:N *_/`
// (escape with underscores) so the comment is still readable but doesn't
// prematurely close the JSDoc.

import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

const ROOT = resolve(import.meta.dir, "../../../");

function patch(file, before, after, label) {
  const path = resolve(ROOT, file);
  const src = readFileSync(path, "utf8");
  const occ = src.split(before).length - 1;
  if (occ !== 1) {
    throw new Error(`[${label}] BEFORE found ${occ} times — expected 1`);
  }
  writeFileSync(path, src.replace(before, after));
  console.log(`OK  ${label}  ${file}`);
}

patch(
  "compiler/src/ast-builder.js",
  `   * structured form instead of the broken \`/* sql-ref:N */\` placeholder
   * that \`safeParseExprToNode\` would otherwise produce.`,
  `   * structured form instead of the broken sql-ref placeholder comment
   * that \`safeParseExprToNode\` would otherwise produce
   * (the placeholder shape is "(slash-star) sql-ref:N (star-slash)" — written
   * out longhand here so this JSDoc comment doesn't close prematurely).`,
  "fix-jsdoc-comment-termination",
);

console.log("\nJSDoc comment fix applied.");
