#!/usr/bin/env bun
/**
 * Real-browser TodoMVC benchmark using Puppeteer + headless Chrome.
 *
 * Serves each framework's dist/ via a local HTTP server, opens in Chrome,
 * injects benchmark operations, and measures with performance.now() inside
 * the browser. Results are comparable to js-framework-benchmark.
 *
 * Usage: bun benchmarks/browser/bench-browser.js
 */

import puppeteer from "puppeteer";
import { createServer } from "http";
import { readFileSync, existsSync } from "fs";
import { resolve, join, extname } from "path";

const ROOT = resolve(import.meta.dir, "..");

// ---------------------------------------------------------------------------
// Tiny static file server
// ---------------------------------------------------------------------------

const MIME = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
};

function serve(dir) {
  return new Promise((res) => {
    const server = createServer((req, resp) => {
      const url = req.url === "/" ? "/index.html" : req.url;
      const filePath = join(dir, url);
      if (!existsSync(filePath)) {
        resp.writeHead(404);
        resp.end("Not found");
        return;
      }
      const ext = extname(filePath);
      resp.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
      resp.end(readFileSync(filePath));
    });
    server.listen(0, () => res({ server, port: server.address().port }));
  });
}

// ---------------------------------------------------------------------------
// Benchmark config per framework
// ---------------------------------------------------------------------------

function buildTitle(i) {
  const adj = ["pretty","large","big","small","tall","short","long","handsome","plain","quaint","clean","elegant","easy","angry","crazy","helpful","mushy","odd","unsightly","adorable","important","inexpensive","cheap","expensive","fancy"];
  const col = ["red","yellow","blue","green","pink","brown","purple","brown","white","black","orange"];
  const noun = ["table","chair","house","bbq","desk","car","pony","cookie","sandwich","burger","pizza","mouse","keyboard"];
  return `${adj[i % adj.length]} ${col[i % col.length]} ${noun[i % noun.length]}`;
}

// Pre-build todo data
const TODOS_1000 = JSON.stringify(
  Array.from({ length: 1000 }, (_, i) => ({
    id: i + 1,
    title: buildTitle(i),
    completed: false,
  }))
);

const TODOS_10000 = JSON.stringify(
  Array.from({ length: 10000 }, (_, i) => ({
    id: i + 1,
    title: buildTitle(i),
    completed: false,
  }))
);

const frameworks = [
  {
    name: "scrml",
    dist: resolve(ROOT, "todomvc/dist"),
    index: "app.html",
    setup: `
      window.__bench = {
        createRows(n) {
          const adj = ["pretty","large","big","small","tall","short","long","handsome","plain","quaint","clean","elegant","easy","angry","crazy","helpful","mushy","odd","unsightly","adorable","important","inexpensive","cheap","expensive","fancy"];
          const col = ["red","yellow","blue","green","pink","brown","purple","brown","white","black","orange"];
          const noun = ["table","chair","house","bbq","desk","car","pony","cookie","sandwich","burger","pizza","mouse","keyboard"];
          const existing = _scrml_reactive_get("todos") || [];
          const maxId = existing.length > 0 ? Math.max(...existing.map(t => t.id)) : 0;
          const newTodos = [];
          for (let i = 0; i < n; i++) newTodos.push({ id: maxId + i + 1, title: adj[i%adj.length]+" "+col[i%col.length]+" "+noun[i%noun.length], completed: false });
          _scrml_reactive_set("todos", [...existing, ...newTodos]);
        },
        clearRows() { _scrml_reactive_set("todos", []); },
        updateEvery10th() {
          _scrml_reactive_set("todos", _scrml_reactive_get("todos").map((t, i) =>
            i % 10 === 0 ? { ...t, title: t.title + " !!!" } : t
          ));
        },
        deleteEvery10th() {
          _scrml_reactive_set("todos", _scrml_reactive_get("todos").filter((_, i) => i % 10 !== 0));
        },
        swapRows(a, b) {
          const todos = [..._scrml_reactive_get("todos")];
          if (todos[a] && todos[b]) { const tmp = todos[a]; todos[a] = todos[b]; todos[b] = tmp; _scrml_reactive_set("todos", todos); }
        },
        removeRow(idx) {
          const todos = _scrml_reactive_get("todos");
          if (todos[idx]) _scrml_reactive_set("todos", todos.filter((_, i) => i !== idx));
        },
        selectRow(idx) {
          const todos = _scrml_reactive_get("todos");
          if (todos[idx]) _scrml_reactive_set("editingId", todos[idx].id);
        },
        reset() { _scrml_reactive_set("todos", []); _scrml_reactive_set("nextId", 1); },
      };
      window.__benchFlush = () => Promise.resolve(); // scrml is synchronous
    `,
  },
  {
    name: "React 19",
    dist: resolve(ROOT, "todomvc-react/dist"),
    index: "index.html",
    // Bench API exposed by App.jsx via window.__bench with flushSync
    setup: ``, // Already set up by the app
  },
  {
    name: "Svelte 5",
    dist: resolve(ROOT, "todomvc-svelte/dist"),
    index: "index.html",
    // Bench API exposed by App.svelte via window.__bench
    setup: ``,
  },
  {
    name: "Vue 3",
    dist: resolve(ROOT, "todomvc-vue/dist"),
    index: "index.html",
    // Bench API exposed by App.vue via window.__bench
    setup: ``,
  },
];

// ---------------------------------------------------------------------------
// Benchmark runner
// ---------------------------------------------------------------------------

const WARMUP = 5;
const ITERATIONS = 10;

function median(arr) {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

async function runBenchmark(page, name, setupCode, benchCode, iters = ITERATIONS) {
  // Warmup
  for (let i = 0; i < WARMUP; i++) {
    await page.evaluate(setupCode);
    await page.evaluate(benchCode);
  }

  const times = [];
  for (let i = 0; i < iters; i++) {
    await page.evaluate(setupCode);
    // Force GC and settle before measuring
    await page.evaluate(() => { if (typeof gc === "function") gc(); });
    await page.evaluate(() => new Promise(r => setTimeout(r, 50)));
    const elapsed = await page.evaluate(`
      (async () => {
        const start = performance.now();
        ${benchCode}
        // Flush framework async updates (Vue nextTick, Svelte tick)
        if (window.__benchFlush) await window.__benchFlush();
        // Force synchronous layout to include reflow cost
        document.body.offsetHeight;
        return performance.now() - start;
      })()
    `);
    times.push(elapsed);
  }
  return { benchmark: name, median: median(times), min: Math.min(...times), max: Math.max(...times) };
}

// ---------------------------------------------------------------------------
// Main — run scrml benchmarks first, then frameworks as available
// ---------------------------------------------------------------------------

async function main() {
  const browser = await puppeteer.launch({
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-gpu",
      "--enable-precise-memory-info",
      "--js-flags=--expose-gc",
    ],
  });

  const results = {};

  for (const fw of frameworks) {
    console.log(`\n=== ${fw.name} ===`);

    const { server, port } = await serve(fw.dist);
    const page = await browser.newPage();

    const url = `http://localhost:${port}/${fw.index}`;
    await page.goto(url, { waitUntil: "networkidle0" });

    // Inject setup if needed (scrml needs manual API injection)
    if (fw.setup) await page.evaluate(fw.setup);

    // Wait for app to mount + bench API to be ready
    await page.evaluate(() => new Promise(r => setTimeout(r, 200)));

    // Verify bench API exists
    const hasApi = await page.evaluate(() => typeof window.__bench !== "undefined");
    if (!hasApi) {
      console.log("  SKIP: __bench API not available");
      server.close();
      await page.close();
      continue;
    }

    const fwResults = [];
    const benchmarks = [
      ["create-1000",      `window.__bench.reset();`,                                           `window.__bench.createRows(1000);`],
      ["replace-1000",     `window.__bench.reset(); window.__bench.createRows(1000);`,          `window.__bench.clearRows(); window.__bench.createRows(1000);`],
      ["partial-update",   `window.__bench.reset(); window.__bench.createRows(1000);`,          `window.__bench.updateEvery10th();`],
      ["delete-every-10th",`window.__bench.reset(); window.__bench.createRows(1000);`,          `window.__bench.deleteEvery10th();`],
      ["clear-all",        `window.__bench.reset(); window.__bench.createRows(1000);`,          `window.__bench.clearRows();`],
      ["select-row",       `window.__bench.reset(); window.__bench.createRows(1000);`,          `window.__bench.selectRow(500);`],
      ["swap-rows",        `window.__bench.reset(); window.__bench.createRows(1000);`,          `window.__bench.swapRows(1, 998);`],
      ["remove-row",       `window.__bench.reset(); window.__bench.createRows(1000);`,          `window.__bench.removeRow(500);`],
      ["create-10000",     `window.__bench.reset();`,                                           `window.__bench.createRows(10000);`, 5],
      ["append-1000",      `window.__bench.reset(); window.__bench.createRows(1000);`,          `window.__bench.createRows(1000);`],
    ];

    for (const [name, setup, bench, iters] of benchmarks) {
      const result = await runBenchmark(page, name, setup, bench, iters);
      fwResults.push(result);
      console.log(`  ${name}: ${result.median.toFixed(2)}ms`);
    }

    results[fw.name] = fwResults;
    await page.close();
    server.close();
  }

  await browser.close();

  // Print summary table
  console.log("\n=== SUMMARY (medians, ms) ===");
  const names = Object.keys(results);
  const ops = results[names[0]].map(r => r.benchmark);
  const pad = (s, n) => s.padEnd(n);
  console.log(pad("Operation", 22) + names.map(n => pad(n, 12)).join(""));
  for (const op of ops) {
    let line = pad(op, 22);
    for (const name of names) {
      const r = results[name].find(r => r.benchmark === op);
      line += pad(r ? r.median.toFixed(2) : "—", 12);
    }
    console.log(line);
  }

  console.log("\n=== JSON ===");
  console.log(JSON.stringify(results, null, 2));
}

main().catch(console.error);
