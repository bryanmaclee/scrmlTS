import { compileScrml } from "../compiler/src/api.js";
import { writeFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";

// Source → dist target mapping. Sources at compiler/self-host/*.scrml plus
// stdlib/compiler/{module-resolver,meta-checker}.scrml; dist at
// compiler/dist/self-host/*.js (for compiler-internal consumers) and
// compiler/self-host/dist/*.js (for tab.js — kept in a sibling dist for
// historical reasons; consolidating later is a separate cleanup).
const TARGETS = [
  { src: "compiler/self-host/bs.scrml", dist: "compiler/dist/self-host/bs.js" },
  { src: "compiler/self-host/tab.scrml", dist: "compiler/dist/self-host/tab.js", siblingDist: "compiler/self-host/dist/tab.js" },
  { src: "compiler/self-host/bpp.scrml", dist: "compiler/dist/self-host/bpp.js" },
  { src: "compiler/self-host/pa.scrml", dist: "compiler/dist/self-host/pa.js" },
  { src: "compiler/self-host/ri.scrml", dist: "compiler/dist/self-host/ri.js" },
  { src: "compiler/self-host/ts.scrml", dist: "compiler/dist/self-host/ts.js" },
  { src: "compiler/self-host/dg.scrml", dist: "compiler/dist/self-host/dg.js" },
  { src: "compiler/self-host/cg.scrml", dist: "compiler/dist/self-host/cg.js" },
  { src: "compiler/self-host/ast.scrml", dist: "compiler/dist/self-host/ast.js" },
  { src: "stdlib/compiler/module-resolver.scrml", dist: "compiler/dist/self-host/module-resolver.js" },
  { src: "stdlib/compiler/meta-checker.scrml", dist: "compiler/dist/self-host/meta-checker.js" },
];

let total = 0;
let failed = 0;
for (const { src, dist, siblingDist } of TARGETS) {
  const result = compileScrml({ inputFiles: [src], mode: "library", write: false });
  const entry = result.outputs?.values()?.next()?.value as any;
  if (entry?.libraryJs) {
    mkdirSync(dirname(dist), { recursive: true });
    writeFileSync(dist, entry.libraryJs);
    if (siblingDist) {
      mkdirSync(dirname(siblingDist), { recursive: true });
      writeFileSync(siblingDist, entry.libraryJs);
    }
    console.log(`✓ ${src.padEnd(48)} → ${dist} (${entry.libraryJs.length} bytes)`);
    total++;
  } else {
    failed++;
    console.log(`✗ ${src} — no libraryJs`);
    const errs = (result.errors ?? []).filter((e: any) => e.severity !== "warning");
    for (const e of errs.slice(0, 3)) console.log(`    ${e.code}: ${e.message?.slice(0, 100)}`);
  }
}
console.log(`\n${total}/${TARGETS.length} regenerated, ${failed} failed`);
