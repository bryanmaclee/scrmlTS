// Step 4: replace `new Function(serverJs)` parse-checks with Bun.Transpiler.scan().
// `new Function()` chokes on top-level `import`/`export` keywords (the server bundle
// is an ES module). Bun.Transpiler.scan() parses ES module syntax cleanly and throws
// on real syntax errors (verified via probe-transpiler.mjs).
//
// Run from worktree root:
//   bun docs/changes/fix-lift-sql-chained-call/apply-fix-step4.mjs

import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(import.meta.dir, '../../..');

function patchFile(file, edits) {
  let src = fs.readFileSync(file, 'utf8');
  for (const { find, replace, label } of edits) {
    if (!src.includes(find)) {
      console.error(`PATCH FAILED: '${label}' — find string not present`);
      console.error("---FIND---\n" + find + "\n---END FIND---");
      process.exit(1);
    }
    const before = src;
    src = src.split(find).join(replace);
    if (src === before) {
      console.error(`PATCH NO-OP: '${label}'`);
      process.exit(1);
    }
    console.log(`Applied: ${label}`);
  }
  fs.writeFileSync(file, src);
}

const testPath = path.join(repoRoot, 'compiler/tests/unit/lift-sql-chained-call.test.js');

// Add a parseServerJs helper after findFn.
const helperFind = `function findFn(ast, name) {
  function walk(nodes) {
    for (const n of nodes ?? []) {
      if (!n) continue;
      if (n.kind === "function-decl" && n.name === name) return n;
      for (const k of ["body", "consequent", "alternate", "children", "nodes"]) {
        const v = n[k];
        if (Array.isArray(v)) {
          const r = walk(v);
          if (r) return r;
        }
      }
    }
    return null;
  }
  return walk(ast.nodes);
}`;

const helperReplace = `function findFn(ast, name) {
  function walk(nodes) {
    for (const n of nodes ?? []) {
      if (!n) continue;
      if (n.kind === "function-decl" && n.name === name) return n;
      for (const k of ["body", "consequent", "alternate", "children", "nodes"]) {
        const v = n[k];
        if (Array.isArray(v)) {
          const r = walk(v);
          if (r) return r;
        }
      }
    }
    return null;
  }
  return walk(ast.nodes);
}

// Parse server JS as an ES module. \`new Function()\` rejects top-level
// import/export, so we use Bun.Transpiler.scan() — it parses ES module
// syntax and throws on real syntax errors (verified empirically).
function parseServerJs(js) {
  return new Bun.Transpiler({ loader: "js" }).scan(js);
}`;

// Replace the four `new Function(serverJs)` call sites with parseServerJs(serverJs).
const findThrow = `expect(() => new Function(serverJs)).not.toThrow();`;
const replaceThrow = `expect(() => parseServerJs(serverJs)).not.toThrow();`;

patchFile(testPath, [
  { find: helperFind, replace: helperReplace, label: "Add parseServerJs helper" },
  { find: findThrow, replace: replaceThrow, label: "Replace new Function() parse-check (occurs 4x)" },
]);

console.log("\nlift-sql-chained-call.test.js patched.");
