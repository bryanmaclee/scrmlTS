#!/usr/bin/env bun
/**
 * M1 Runtime Performance Benchmark — scrml vs React 19 vs Svelte 5 vs Vue 3
 *
 * Unified runner that executes each framework's benchmark in a subprocess
 * (to avoid global DOM pollution between frameworks), collects results,
 * and produces a comparison table + JSON output.
 *
 * Each framework benchmark runs in happy-dom and measures:
 *   1. Create 1000 rows       — bulk insert
 *   2. Replace 1000 rows      — clear + recreate
 *   3. Partial update          — update every 10th row
 *   4. Select row              — highlight single row
 *   5. Swap rows               — swap two rows
 *   6. Remove row              — delete single row
 *   7. Create 10,000 rows      — stress test
 *   8. Append 1000 rows        — add to existing 1000
 *
 * Usage: bun benchmarks/runtime-benchmark.js
 */

import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { writeFileSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Run a framework benchmark as a subprocess
// ---------------------------------------------------------------------------

async function runFrameworkBench(name, scriptPath, cwd) {
  console.log(`  Running ${name}...`);
  const proc = Bun.spawn(["bun", scriptPath], {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
  });

  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  await proc.exited;

  if (proc.exitCode !== 0) {
    console.error(`  ${name} FAILED (exit ${proc.exitCode}):`);
    if (stderr) console.error(`    ${stderr.trim().split("\n").slice(0, 5).join("\n    ")}`);
    return null;
  }

  try {
    const data = JSON.parse(stdout.trim());
    if (data.error) {
      console.error(`  ${name} ERROR: ${data.error}`);
      return null;
    }
    return data;
  } catch (e) {
    console.error(`  ${name} FAILED to parse output: ${e.message}`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Format helpers
// ---------------------------------------------------------------------------

function formatMs(ms) {
  if (ms < 0.1) return ms.toFixed(3);
  if (ms < 10) return ms.toFixed(2);
  return ms.toFixed(1);
}

function ratio(a, b) {
  if (!a || !b || b === 0) return "N/A";
  return (b / a).toFixed(1) + "x";
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const rootDir = resolve(__dirname, "..");

  console.log("=== M1 Runtime Performance Benchmark ===");
  console.log(`Runtime: Bun ${Bun.version}`);
  console.log(`DOM: happy-dom (simulated browser)`);
  console.log(`Date: ${new Date().toISOString().split("T")[0]}`);
  console.log("");

  // Run each framework
  const scrmlResult = await runFrameworkBench(
    "scrml",
    resolve(__dirname, "bench-scrml.js"),
    rootDir,
  );

  const reactResult = await runFrameworkBench(
    "React 19",
    resolve(__dirname, "todomvc-react/bench.js"),
    resolve(__dirname, "todomvc-react"),
  );

  const svelteResult = await runFrameworkBench(
    "Svelte 5",
    resolve(__dirname, "todomvc-svelte/bench.js"),
    resolve(__dirname, "todomvc-svelte"),
  );

  const vueResult = await runFrameworkBench(
    "Vue 3",
    resolve(__dirname, "todomvc-vue/bench.js"),
    resolve(__dirname, "todomvc-vue"),
  );

  // Collect results
  const frameworks = [];
  const allResults = {};

  if (scrmlResult) { frameworks.push("scrml"); allResults["scrml"] = scrmlResult.results; }
  if (reactResult) { frameworks.push("React 19"); allResults["React 19"] = reactResult.results; }
  if (svelteResult) { frameworks.push("Svelte 5"); allResults["Svelte 5"] = svelteResult.results; }
  if (vueResult) { frameworks.push("Vue 3"); allResults["Vue 3"] = vueResult.results; }

  if (frameworks.length === 0) {
    console.error("\nNo frameworks completed successfully.");
    process.exit(1);
  }

  // ---------------------------------------------------------------------------
  // Markdown table output
  // ---------------------------------------------------------------------------

  const benchmarkNames = [
    "initial-render", "create-1000", "replace-1000", "partial-update",
    "delete-every-10th", "clear-all", "select-row",
    "swap-rows", "remove-row", "create-10000", "append-1000",
  ];

  console.log("\n\n## Runtime Performance (median ms, lower is better)\n");

  // Header
  const fwHeaders = frameworks.map(fw => `**${fw}**`);
  if (frameworks.includes("scrml") && frameworks.length > 1) {
    fwHeaders.push("**scrml vs React**");
    fwHeaders.push("**scrml vs Svelte**");
    fwHeaders.push("**scrml vs Vue**");
  }
  console.log(`| Benchmark | ${fwHeaders.join(" | ")} |`);
  console.log(`|---|${fwHeaders.map(() => "---:").join("|")}|`);

  for (const benchName of benchmarkNames) {
    const cells = frameworks.map(fw => {
      const r = allResults[fw]?.find(r => r.benchmark === benchName);
      return r ? `${formatMs(r.median)}` : "N/A";
    });

    // Add ratio columns
    if (frameworks.includes("scrml") && frameworks.length > 1) {
      const scrmlR = allResults["scrml"]?.find(r => r.benchmark === benchName);
      const reactR = allResults["React 19"]?.find(r => r.benchmark === benchName);
      const svelteR = allResults["Svelte 5"]?.find(r => r.benchmark === benchName);
      const vueR = allResults["Vue 3"]?.find(r => r.benchmark === benchName);

      cells.push(scrmlR && reactR ? ratio(scrmlR.median, reactR.median) : "N/A");
      cells.push(scrmlR && svelteR ? ratio(scrmlR.median, svelteR.median) : "N/A");
      cells.push(scrmlR && vueR ? ratio(scrmlR.median, vueR.median) : "N/A");
    }

    console.log(`| ${benchName} | ${cells.join(" | ")} |`);
  }

  // Summary
  if (frameworks.includes("scrml") && allResults["scrml"]) {
    console.log("\n### Summary\n");

    const scrmlResults = allResults["scrml"];

    for (const otherFw of ["React 19", "Svelte 5", "Vue 3"]) {
      const otherResults = allResults[otherFw];
      if (!otherResults) continue;

      const ratios = [];
      for (const benchName of benchmarkNames) {
        const scrmlR = scrmlResults.find(r => r.benchmark === benchName);
        const otherR = otherResults.find(r => r.benchmark === benchName);
        if (scrmlR && otherR && scrmlR.median > 0.01) {
          ratios.push(otherR.median / scrmlR.median);
        }
      }

      if (ratios.length > 0) {
        const avgRatio = ratios.reduce((a, b) => a + b, 0) / ratios.length;
        const fasterCount = ratios.filter(r => r > 1).length;
        console.log(`- scrml is **${avgRatio.toFixed(1)}x faster** than ${otherFw} on average (faster in ${fasterCount}/${ratios.length} benchmarks)`);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Methodology note
  // ---------------------------------------------------------------------------

  console.log("\n### Methodology\n");
  console.log("- **scrml**: Loads compiled output (runtime + client JS) into happy-dom, drives state via `_scrml_reactive_set()` which triggers DOM reconciliation through `_scrml_reconcile_list()`.");
  console.log("- **React 19**: Uses `createRoot` + `flushSync` with a benchmark component exposing imperative state operations. Measures React's actual virtual DOM diffing and DOM reconciliation.");
  console.log("- **Svelte 5**: Simulates Svelte's compiled output pattern (direct imperative DOM manipulation with keyed reconciliation). This is representative because Svelte compiles away its framework into direct DOM operations.");
  console.log("- **Vue 3**: Uses `createApp` with Composition API (`ref`, `computed`) + `nextTick` flush. Measures Vue's reactivity system and virtual DOM patching.");
  console.log("- All benchmarks run in happy-dom (simulated browser), not a real browser. Relative comparisons are meaningful; absolute numbers will differ from real browsers.");
  console.log("- Each benchmark: 2-3 warmup iterations, then 5-10 measured iterations. Median reported.");

  // ---------------------------------------------------------------------------
  // JSON output
  // ---------------------------------------------------------------------------

  const jsonOutput = {
    timestamp: new Date().toISOString(),
    environment: {
      runtime: `Bun ${Bun.version}`,
      dom: "happy-dom",
    },
    frameworks: {},
  };

  for (const fw of frameworks) {
    jsonOutput.frameworks[fw] = {};
    for (const r of (allResults[fw] || [])) {
      jsonOutput.frameworks[fw][r.benchmark] = {
        median: r.median,
        mean: r.mean,
        p95: r.p95,
        min: r.min,
        max: r.max,
      };
    }
  }

  const jsonPath = resolve(__dirname, "runtime-results.json");
  writeFileSync(jsonPath, JSON.stringify(jsonOutput, null, 2));
  console.log(`\nJSON results: benchmarks/runtime-results.json`);
}

main().catch(e => {
  console.error("Benchmark failed:", e);
  process.exit(1);
});
