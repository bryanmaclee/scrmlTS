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
  // S81 strictness gate: dist is emitted ONLY when there are zero
  // non-warning errors. Pre-S81 this script wrote libraryJs whenever the
  // output was truthy, ignoring the errors[] array — which let SPEC §42
  // (null/undefined → not) and other normative violations accumulate in
  // self-host source unnoticed for an unknown period. Bryan's S81 directive:
  // "null and undefined will not ever exist in any context in scrml in any
  // way ... library mode inclusive." The gate honors that — the host
  // compiler's E-SYNTAX-042 / E-EQ-004 / E-ERROR-007 / etc. firings prevent
  // the dist write.
  //
  // Self-host source-side cleanup is deferred (orthogonal to v0.2.0 ship).
  // Files with current debt (ast/ts/ri/pa/dg) will fail this rebuild script
  // until swept. The pre-commit hook excludes compiler/tests/self-host/
  // so this gate failing does not block compiler-side work. Full inventory
  // + sweep plan in docs/audits/self-host-spec-conformance-2026-05-11.md.
  const errs = (result.errors ?? []).filter((e: any) => e.severity !== "warning");
  if (entry?.libraryJs && errs.length === 0) {
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
    if (!entry?.libraryJs) {
      console.log(`✗ ${src} — no libraryJs`);
    } else {
      console.log(`✗ ${src} — ${errs.length} non-warning error(s); dist NOT written`);
    }
    // Group by code so a 200-occurrence single-code violation reports compactly.
    const byCode = new Map<string, number>();
    for (const e of errs) byCode.set(e.code, (byCode.get(e.code) ?? 0) + 1);
    for (const [code, count] of byCode.entries()) console.log(`    ${code}: ${count}`);
    for (const e of errs.slice(0, 3)) console.log(`    [first] ${e.code}: ${e.message?.slice(0, 100)}`);
  }
}
console.log(`\n${total}/${TARGETS.length} regenerated, ${failed} failed`);
// Non-zero exit so CI / future hooks / `bun run` callers detect rebuild failure.
if (failed > 0) process.exit(1);
