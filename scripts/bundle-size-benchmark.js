#!/usr/bin/env bun
/**
 * Bundle Size Benchmark — TodoMVC comparison across scrml, React, Svelte, Vue.
 *
 * Measures raw and gzipped sizes for JS, CSS, HTML, and total bundle.
 * Writes results to docs/m1-benchmark-results.md and stdout.
 *
 * Usage: bun run scripts/bundle-size-benchmark.js
 */

import { resolve, join, extname } from "path";
import { readdirSync, statSync, readFileSync, existsSync, mkdirSync, writeFileSync } from "fs";
import { execSync } from "child_process";
import { gzipSync } from "bun";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const ROOT = resolve(import.meta.dir, "..");
const BENCHMARKS = join(ROOT, "benchmarks");

const FRAMEWORKS = [
  {
    name: "scrml",
    dir: join(BENCHMARKS, "todomvc"),
    distDir: join(BENCHMARKS, "todomvc", "dist"),
    build: "scrml",
  },
  {
    name: "React",
    dir: join(BENCHMARKS, "todomvc-react"),
    distDir: join(BENCHMARKS, "todomvc-react", "dist"),
    build: "vite",
  },
  {
    name: "Svelte",
    dir: join(BENCHMARKS, "todomvc-svelte"),
    distDir: join(BENCHMARKS, "todomvc-svelte", "dist"),
    build: "vite",
  },
  {
    name: "Vue",
    dir: join(BENCHMARKS, "todomvc-vue"),
    distDir: join(BENCHMARKS, "todomvc-vue", "dist"),
    build: "vite",
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Recursively collect all files in a directory. */
function walkDir(dir) {
  const results = [];
  if (!existsSync(dir)) return results;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      results.push(...walkDir(full));
    } else {
      results.push(full);
    }
  }
  return results;
}

/** Categorize a file by extension. */
function fileCategory(filePath) {
  const ext = extname(filePath).toLowerCase();
  if ([".js", ".mjs", ".cjs"].includes(ext)) return "js";
  if (ext === ".css") return "css";
  if ([".html", ".htm"].includes(ext)) return "html";
  return "other";
}

/** Measure sizes for all files in a dist directory. */
function measureDist(distDir) {
  const files = walkDir(distDir);
  const sizes = {
    js:    { raw: 0, gzip: 0 },
    css:   { raw: 0, gzip: 0 },
    html:  { raw: 0, gzip: 0 },
    total: { raw: 0, gzip: 0 },
  };

  for (const file of files) {
    const content = readFileSync(file);
    const raw = content.length;
    const gz = gzipSync(content).length;
    const cat = fileCategory(file);

    if (sizes[cat]) {
      sizes[cat].raw += raw;
      sizes[cat].gzip += gz;
    }
    sizes.total.raw += raw;
    sizes.total.gzip += gz;
  }

  return sizes;
}

/** Format bytes as KB string with 1 decimal. */
function kb(bytes) {
  return (bytes / 1024).toFixed(1) + " KB";
}

// ---------------------------------------------------------------------------
// Build functions
// ---------------------------------------------------------------------------

async function buildScrml(fw) {
  console.log(`  Building scrml via compiler API...`);

  // Ensure compiler dependencies are installed
  const compilerDir = join(ROOT, "compiler");
  if (!existsSync(join(compilerDir, "node_modules"))) {
    console.log(`  Installing compiler deps...`);
    execSync("bun install", { cwd: compilerDir, stdio: "pipe" });
  }

  const { compileScrml } = await import(join(ROOT, "compiler", "src", "api.js"));
  const inputFile = join(fw.dir, "app.scrml");

  if (!existsSync(inputFile)) {
    throw new Error(`Source file not found: ${inputFile}`);
  }

  const outputDir = fw.distDir;
  compileScrml({
    inputFiles: [inputFile],
    outputDir,
    write: true,
    verbose: false,
    log: () => {},
  });
  console.log(`  scrml build complete -> ${outputDir}`);
}

function buildVite(fw) {
  console.log(`  Building ${fw.name} with vite...`);

  if (!existsSync(join(fw.dir, "package.json"))) {
    throw new Error(`No package.json found at ${fw.dir}`);
  }

  // Install deps if node_modules missing
  if (!existsSync(join(fw.dir, "node_modules"))) {
    console.log(`  Installing deps for ${fw.name}...`);
    execSync("bun install", { cwd: fw.dir, stdio: "pipe" });
  }
  execSync("bun run build", { cwd: fw.dir, stdio: "pipe" });
  console.log(`  ${fw.name} build complete -> ${fw.distDir}`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("Bundle Size Benchmark — TodoMVC\n");

  const results = {};

  for (const fw of FRAMEWORKS) {
    console.log(`[${fw.name}]`);

    // Skip frameworks whose source directory doesn't exist
    if (!existsSync(fw.dir)) {
      console.log(`  SKIP: directory not found (${fw.dir})\n`);
      results[fw.name] = null;
      continue;
    }

    try {
      if (fw.build === "scrml") {
        await buildScrml(fw);
      } else {
        buildVite(fw);
      }

      if (!existsSync(fw.distDir)) {
        throw new Error(`Build produced no dist/ directory at ${fw.distDir}`);
      }

      results[fw.name] = measureDist(fw.distDir);
      console.log(`  Total (gzip): ${kb(results[fw.name].total.gzip)}\n`);
    } catch (err) {
      console.error(`  ERROR building ${fw.name}: ${err.message}\n`);
      results[fw.name] = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Build markdown table
  // ---------------------------------------------------------------------------

  const names = FRAMEWORKS.map((f) => f.name);
  const cell = (name, cat, field) =>
    results[name] ? kb(results[name][cat][field]) : "N/A";

  const rows = [
    ["JS (raw)",    ...names.map((n) => cell(n, "js",    "raw"))],
    ["JS (gzip)",   ...names.map((n) => cell(n, "js",    "gzip"))],
    ["CSS (raw)",   ...names.map((n) => cell(n, "css",   "raw"))],
    ["CSS (gzip)",  ...names.map((n) => cell(n, "css",   "gzip"))],
    ["HTML (raw)",  ...names.map((n) => cell(n, "html",  "raw"))],
    ["Total (raw)", ...names.map((n) => cell(n, "total", "raw"))],
    ["Total (gzip)",...names.map((n) => cell(n, "total", "gzip"))],
  ];

  const header = `| Metric | ${names.join(" | ")} |`;
  const sep    = `|--------|${names.map(() => "------").join("|")}|`;
  const body   = rows.map((r) => `| ${r.join(" | ")} |`).join("\n");
  const table  = `${header}\n${sep}\n${body}`;

  const timestamp = new Date().toISOString().slice(0, 19).replace("T", " ");
  const markdown = `## Bundle Size Comparison — TodoMVC

_Generated: ${timestamp}_

${table}

### Notes
- All sizes measured from built \`dist/\` output
- Gzip measured with \`Bun.gzipSync()\` (default compression)
- scrml compiled via \`compileScrml\` API; React/Svelte/Vue built via Vite
`;

  // Print to stdout
  console.log("\n" + markdown);

  // ---------------------------------------------------------------------------
  // Write to docs/m1-benchmark-results.md
  // ---------------------------------------------------------------------------

  const outPath = join(ROOT, "docs", "m1-benchmark-results.md");
  mkdirSync(join(ROOT, "docs"), { recursive: true });

  let existing = "";
  if (existsSync(outPath)) {
    existing = readFileSync(outPath, "utf8");
  }

  const sectionRegex = /## Bundle Size Comparison — TodoMVC[\s\S]*?(?=\n## |\n# |$)/;

  let output;
  if (existing && sectionRegex.test(existing)) {
    output = existing.replace(sectionRegex, markdown.trim());
  } else if (existing) {
    output = existing.trimEnd() + "\n\n" + markdown;
  } else {
    output = `# M1 Benchmark Results\n\n${markdown}`;
  }

  writeFileSync(outPath, output);
  console.log(`Results written to ${outPath}`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
