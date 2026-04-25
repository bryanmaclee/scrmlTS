// Probe what AST the test source produces.
import { splitBlocks } from '../../../compiler/src/block-splitter.js';
import { buildAST } from '../../../compiler/src/ast-builder.js';

const src = `<program>
\${
  server function loadOne(id) {
    lift ?{\`SELECT id, name FROM users WHERE id = \${id}\`}.get()
  }
}
</program>`;

const bs = splitBlocks("test.scrml", src);
const { ast } = buildAST(bs);

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
walk(ast, n => { if (n.kind === 'function-decl' && n.name === 'loadOne') foundFn = n; });

if (foundFn) {
  console.log("loadOne body:");
  console.log(JSON.stringify(foundFn.body, (k, v) => k === "span" ? undefined : v, 2));
} else {
  console.log("loadOne not found");
  walk(ast, n => {
    if (n.kind === 'lift-expr') console.log("lift-expr:", JSON.stringify(n, (k, v) => k === "span" ? undefined : v, 2));
  });
}
