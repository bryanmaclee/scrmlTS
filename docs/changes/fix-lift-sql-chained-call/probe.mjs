// Probe: dump the AST shape produced by lift+SQL bug for a given .scrml file.
// Usage: bun docs/changes/fix-lift-sql-chained-call/probe.mjs [path]
import { splitBlocks } from '../../../compiler/src/block-splitter.js';
import { buildAST } from '../../../compiler/src/ast-builder.js';
import fs from 'node:fs';
import path_lib from 'node:path';

const repoRoot = path_lib.resolve(import.meta.dir, '../../..');
const path = process.argv[2] ?? path_lib.join(repoRoot, 'examples/03-contact-book.scrml');
const src = fs.readFileSync(path, 'utf8');
const bs = splitBlocks(path, src);
const { ast } = buildAST(bs);
const ast2 = ast ?? [];

function walk(node, fn) {
  if (!node || typeof node !== 'object') return;
  fn(node);
  for (const k of Object.keys(node)) {
    if (k === 'span' || k === 'parent') continue;
    const v = node[k];
    if (Array.isArray(v)) v.forEach(c => walk(c, fn));
    else if (v && typeof v === 'object') walk(v, fn);
  }
}

let foundFn = null;
walk(ast2, n => {
  if (n.kind === 'function-decl' && n.name === 'loadContacts') foundFn = n;
});

if (foundFn) {
  console.log("loadContacts body:");
  console.log(JSON.stringify(foundFn.body, (k, v) => k === "span" ? undefined : v, 2));
} else {
  console.log("Not found, dumping all lift-exprs...");
  let count = 0;
  walk(ast2, n => {
    if (n.kind === 'lift-expr' && count < 3) {
      console.log("LIFT-EXPR:");
      console.log(JSON.stringify(n, (k, v) => k === "span" ? undefined : v, 2));
      count++;
    }
  });
  console.log(`Total lift-exprs found: ${count}+`);
}
