import { readFileSync, writeFileSync } from "fs";

const SPEC = readFileSync("compiler/SPEC.md", "utf8");
const INDEX_PATH = "compiler/SPEC-INDEX.md";
const INDEX = readFileSync(INDEX_PATH, "utf8");

type Section = { line: number; key: string };
const lines = SPEC.split("\n");
const sections: Section[] = [];
for (let i = 0; i < lines.length; i++) {
  const ln = lines[i];
  let raw: string | null = null;
  if (ln.startsWith("## ")) {
    raw = ln.slice(3).trim();
    // Skip ## subheadings (49.1, §53.1, etc.)
    if (raw.match(/^\d+\.\d+\s/)) continue;
    if (raw.startsWith("§")) continue;
  } else if (ln.startsWith("# §")) {
    // Single-# section header with § prefix, e.g. `# §49. ...`
    raw = ln.slice(2).trim();
  } else {
    continue;
  }
  let key = "";
  let m = raw.match(/^§?(\d+)\.\s/);
  if (m) {
    key = m[1];
  } else if (raw.startsWith("Appendix ")) {
    const am = raw.match(/^Appendix ([A-Z]):/);
    if (am) key = am[1];
  } else if (raw.startsWith("Table of Contents")) {
    key = "TOC";
  } else {
    continue;
  }
  sections.push({ line: i + 1, key });
}

// Compute ranges.
const totalLines = lines.length;
const ranges = new Map<string, { start: number; end: number; size: number }>();
for (let i = 0; i < sections.length; i++) {
  const start = sections[i].line;
  const end = i + 1 < sections.length ? sections[i + 1].line - 1 : totalLines;
  ranges.set(sections[i].key, { start, end, size: end - start + 1 });
}

console.log("Sections in SPEC.md (key @ start line, size):");
for (const s of sections) {
  const r = ranges.get(s.key)!;
  console.log(`  ${s.key.padEnd(4)} @ ${s.line}  range=${r.start}-${r.end} size=${r.size}`);
}

const indexLines = INDEX.split("\n");
let inSectionsTable = false;
let updated = 0;
const missing: string[] = [];
const out: string[] = [];

for (const line of indexLines) {
  if (line.startsWith("| § | Section ")) { inSectionsTable = true; out.push(line); continue; }
  if (inSectionsTable && line.startsWith("|---")) { out.push(line); continue; }
  if (inSectionsTable && !line.startsWith("|")) { inSectionsTable = false; out.push(line); continue; }
  if (!inSectionsTable) { out.push(line); continue; }

  const m = line.match(/^\| (.+?) \| (.+?) \| (\d+(?:-\d+)?|—) \| (\d+|—) \| /);
  if (!m) { out.push(line); continue; }
  const key = m[1].trim();
  const name = m[2];
  const oldRange = m[3];
  const oldSize = m[4];
  const summary = line.slice(m[0].length);

  const lookupKey = key === "—" ? "TOC" : key;
  const r = ranges.get(lookupKey);
  if (!r) {
    missing.push(`row key="${key}" name="${name}"`);
    out.push(line); continue;
  }
  const newRange = `${r.start}-${r.end}`;
  const newLine = `| ${key} | ${name} | ${newRange} | ${r.size} | ${summary}`;
  if (newRange !== oldRange || String(r.size) !== oldSize) updated++;
  out.push(newLine);
}

writeFileSync(INDEX_PATH, out.join("\n"));
console.log(`\nUpdated ${updated} rows; missing ${missing.length}`);
for (const m of missing) console.log(`  ${m}`);
