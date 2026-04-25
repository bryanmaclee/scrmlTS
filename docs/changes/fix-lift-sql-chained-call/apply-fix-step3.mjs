// Step 3: extend consumeSqlChainedCalls to accept KEYWORD method names.
//
// `get` and `set` are tokenized as KEYWORD (not IDENT) per tokenizer.ts:62.
// The original `if (peek().kind === "IDENT")` check would skip `.get()` (and
// `.set()`) — leaving them orphan in the parent stream just like the original
// bug. The pattern at lines ~1918 and ~3421 has the same bug; example 03 only
// uses `.all()` and `.run()` (both IDENT) so it never surfaced.
//
// Run from worktree root:
//   bun docs/changes/fix-lift-sql-chained-call/apply-fix-step3.mjs

import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(import.meta.dir, '../../..');

function patchFile(file, edits) {
  let src = fs.readFileSync(file, 'utf8');
  for (const { find, replace, label } of edits) {
    if (!src.includes(find)) {
      console.error(`PATCH FAILED: '${label}' — find string not present in ${file}`);
      console.error("---FIND---\n" + find + "\n---END FIND---");
      process.exit(1);
    }
    const before = src;
    src = src.replace(find, replace);
    if (src === before) {
      console.error(`PATCH NO-OP: '${label}'`);
      process.exit(1);
    }
    console.log(`Applied: ${label}`);
  }
  fs.writeFileSync(file, src);
}

const astBuilderPath = path.join(repoRoot, 'compiler/src/ast-builder.js');

// Update the helper to accept both IDENT and KEYWORD method names. `get` and
// `set` are KEYWORDs per tokenizer.ts.
const findStr = `  function consumeSqlChainedCalls(sqlNode) {
    if (!sqlNode || sqlNode.kind !== "sql" || !sqlNode.chainedCalls) return;
    while (peek().kind === "PUNCT" && peek().text === ".") {
      consume(); // dot
      if (peek().kind === "IDENT") {
        const methodTok = consume();`;

const replaceStr = `  function consumeSqlChainedCalls(sqlNode) {
    if (!sqlNode || sqlNode.kind !== "sql" || !sqlNode.chainedCalls) return;
    while (peek().kind === "PUNCT" && peek().text === ".") {
      consume(); // dot
      // Accept IDENT or KEYWORD as the method name. \`get\` and \`set\` are
      // tokenized as KEYWORD per tokenizer.ts:62 — without this, \`.get()\`
      // would be left orphan in the parent token stream.
      if (peek().kind === "IDENT" || peek().kind === "KEYWORD") {
        const methodTok = consume();`;

patchFile(astBuilderPath, [
  { find: findStr, replace: replaceStr, label: "ast-builder: consumeSqlChainedCalls — accept KEYWORD method names" },
]);

console.log("\nast-builder.js patched.");
