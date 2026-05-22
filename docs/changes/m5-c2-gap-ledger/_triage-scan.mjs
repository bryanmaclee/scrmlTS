// _triage-scan.mjs — Phase 4 back-half triage scan. Read-only.
// Walks the corpus through classifyDivergence, collects per-class members,
// and emits structured detail for root-cause bucketing.
import { readFileSync } from "node:fs";
import { enumerateScrmlCorpus } from "../../../compiler/tests/parser-conformance/corpus-enumerator.js";
import {
  classifyDivergence, summarizeDetail,
} from "../../../compiler/tests/parser-conformance/dual-pipeline-canary.js";

const files = enumerateScrmlCorpus();
const byClass = {};
for (const e of files) {
  const f = e.path;
  let src;
  try { src = readFileSync(f, "utf8"); } catch { continue; }
  let v;
  try { v = classifyDivergence(f, src); }
  catch (e) { v = { class: "SCAN-THROW", explained: false, detail: String(e) }; }
  (byClass[v.class] = byClass[v.class] || []).push({ f, v });
}

const order = Object.keys(byClass).sort((a, b) => byClass[b].length - byClass[a].length);
console.log("=== LEDGER HISTOGRAM ===");
for (const c of order) console.log(`${c}\t${byClass[c].length}`);

const focus = process.argv[2];
if (focus && byClass[focus]) {
  console.log(`\n=== ${focus} (${byClass[focus].length}) ===`);
  for (const { f, v } of byClass[focus]) {
    const name = f.replace(/.*scrmlTS\//, "");
    const d = v.detail;
    let line = `${name}  ::  ${summarizeDetail(v)}`;
    if (d && d.liveTop) {
      line += `\n   liveTop=[${d.liveTop.join(",")}]`;
      line += `\n   natTop =[${d.nativeTop.join(",")}]`;
    }
    if (d && d.deepFirstDivergence) {
      const fd = d.deepFirstDivergence;
      line += `\n   deepDiv i=${fd.index} live=${fd.liveKind} nat=${fd.nativeKind} (Llen=${d.liveDeep.length} Nlen=${d.nativeDeep.length})`;
    }
    console.log(line);
  }
}
