import { splitBlocks } from '../../../compiler/src/block-splitter.js';
import { buildAST } from '../../../compiler/src/ast-builder.js';

function probe(label, src) {
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
  walk(ast, n => { if (n.kind === 'function-decl') foundFn = n; });
  console.log(`\n=== ${label} ===`);
  if (foundFn) {
    console.log(JSON.stringify(foundFn.body, (k, v) => k === "span" ? undefined : v, 2));
  }
}

probe(".all() (no params)", `<program>\${
  server function f() {
    lift ?{\`SELECT 1\`}.all()
  }
}</program>`);

probe(".get() (no params)", `<program>\${
  server function f() {
    lift ?{\`SELECT 1\`}.get()
  }
}</program>`);

probe(".run() (no params)", `<program>\${
  server function f() {
    lift ?{\`DELETE FROM x\`}.run()
  }
}</program>`);

probe(".get() (with param)", `<program>\${
  server function f(id) {
    lift ?{\`SELECT * FROM users WHERE id = \${id}\`}.get()
  }
}</program>`);
