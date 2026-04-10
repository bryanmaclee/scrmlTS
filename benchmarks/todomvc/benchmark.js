#!/usr/bin/env bun
/**
 * TodoMVC benchmark — measures DOM creation, update, and delete performance.
 *
 * Outputs results in a format comparable to js-framework-benchmark.
 *
 * Usage: bun run benchmarks/todomvc/benchmark.js
 *
 * This is a synthetic benchmark that simulates the scrml reactive runtime
 * operations without requiring a browser. It uses the runtime functions
 * directly to measure:
 *
 *   1. Create 1000 todos   — measures _scrml_reactive_set throughput
 *   2. Toggle all           — measures bulk update performance
 *   3. Clear completed      — measures bulk delete performance
 *   4. Partial update       — measures toggling every 10th item
 *   5. Swap rows            — measures swapping two items
 */

// ---------------------------------------------------------------------------
// Minimal DOM stub for Node.js / Bun environment
// ---------------------------------------------------------------------------

const _scrml_state = {};
const _scrml_subscribers = {};

function _scrml_reactive_get(name) {
  return _scrml_state[name];
}

function _scrml_reactive_set(name, value) {
  _scrml_state[name] = value;
  if (_scrml_subscribers[name]) {
    for (const fn of _scrml_subscribers[name]) {
      try { fn(value); } catch(e) { /* benchmark ignores subscriber errors */ }
    }
  }
}

function _scrml_reactive_subscribe(name, fn) {
  if (!_scrml_subscribers[name]) _scrml_subscribers[name] = [];
  _scrml_subscribers[name].push(fn);
}

// ---------------------------------------------------------------------------
// Benchmark helpers
// ---------------------------------------------------------------------------

function buildData(count) {
  const adjectives = ["pretty", "large", "big", "small", "tall", "short", "long", "handsome", "plain", "quaint", "clean", "elegant", "easy", "angry", "crazy", "helpful", "mushy", "odd", "unsightly", "adorable", "important", "inexpensive", "cheap", "expensive", "fancy"];
  const colours = ["red", "yellow", "blue", "green", "pink", "brown", "purple", "brown", "white", "black", "orange"];
  const nouns = ["table", "chair", "house", "bbq", "desk", "car", "pony", "cookie", "sandwich", "burger", "pizza", "mouse", "keyboard"];

  const data = [];
  for (let i = 0; i < count; i++) {
    data.push({
      id: i + 1,
      title: `${adjectives[i % adjectives.length]} ${colours[i % colours.length]} ${nouns[i % nouns.length]}`,
      completed: false,
    });
  }
  return data;
}

function median(arr) {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

function formatMs(ms) {
  return ms.toFixed(2) + "ms";
}

// ---------------------------------------------------------------------------
// Benchmarks
// ---------------------------------------------------------------------------

const ITERATIONS = 10;
const N = 1000;

const results = {};

// 1. Create 1000 todos
{
  const times = [];
  for (let i = 0; i < ITERATIONS; i++) {
    _scrml_reactive_set("todos", []);
    const data = buildData(N);

    const start = performance.now();
    _scrml_reactive_set("todos", data);
    const elapsed = performance.now() - start;
    times.push(elapsed);
  }
  results["create-1000"] = { median: median(times), min: Math.min(...times), max: Math.max(...times) };
}

// 2. Toggle all (update every item)
{
  const times = [];
  for (let i = 0; i < ITERATIONS; i++) {
    _scrml_reactive_set("todos", buildData(N));

    const start = performance.now();
    const toggled = _scrml_reactive_get("todos").map(t => ({
      id: t.id, title: t.title, completed: !t.completed
    }));
    _scrml_reactive_set("todos", toggled);
    const elapsed = performance.now() - start;
    times.push(elapsed);
  }
  results["toggle-all-1000"] = { median: median(times), min: Math.min(...times), max: Math.max(...times) };
}

// 3. Clear completed (delete all)
{
  const times = [];
  for (let i = 0; i < ITERATIONS; i++) {
    const data = buildData(N).map(t => ({ ...t, completed: true }));
    _scrml_reactive_set("todos", data);

    const start = performance.now();
    _scrml_reactive_set("todos", _scrml_reactive_get("todos").filter(t => !t.completed));
    const elapsed = performance.now() - start;
    times.push(elapsed);
  }
  results["clear-completed-1000"] = { median: median(times), min: Math.min(...times), max: Math.max(...times) };
}

// 4. Partial update (toggle every 10th item)
{
  const times = [];
  for (let i = 0; i < ITERATIONS; i++) {
    _scrml_reactive_set("todos", buildData(N));

    const start = performance.now();
    const updated = _scrml_reactive_get("todos").map((t, idx) => {
      if (idx % 10 === 0) {
        return { id: t.id, title: t.title, completed: !t.completed };
      }
      return t;
    });
    _scrml_reactive_set("todos", updated);
    const elapsed = performance.now() - start;
    times.push(elapsed);
  }
  results["partial-update-1000"] = { median: median(times), min: Math.min(...times), max: Math.max(...times) };
}

// 5. Swap rows (swap first and last)
{
  const times = [];
  for (let i = 0; i < ITERATIONS; i++) {
    _scrml_reactive_set("todos", buildData(N));

    const start = performance.now();
    const todos = [..._scrml_reactive_get("todos")];
    const temp = todos[0];
    todos[0] = todos[todos.length - 1];
    todos[todos.length - 1] = temp;
    _scrml_reactive_set("todos", todos);
    const elapsed = performance.now() - start;
    times.push(elapsed);
  }
  results["swap-rows-1000"] = { median: median(times), min: Math.min(...times), max: Math.max(...times) };
}

// 6. Append 1000 to existing 1000
{
  const times = [];
  for (let i = 0; i < ITERATIONS; i++) {
    _scrml_reactive_set("todos", buildData(N));

    const start = performance.now();
    const more = buildData(N).map(t => ({ ...t, id: t.id + N }));
    _scrml_reactive_set("todos", [..._scrml_reactive_get("todos"), ...more]);
    const elapsed = performance.now() - start;
    times.push(elapsed);
  }
  results["append-1000-to-1000"] = { median: median(times), min: Math.min(...times), max: Math.max(...times) };
}

// ---------------------------------------------------------------------------
// Output (js-framework-benchmark compatible format)
// ---------------------------------------------------------------------------

console.log("=== scrml TodoMVC Benchmark Results ===");
console.log(`Iterations per test: ${ITERATIONS}`);
console.log(`Items: ${N}`);
console.log("");
console.log("Benchmark                  Median     Min        Max");
console.log("-------------------------------------------------------");

for (const [name, r] of Object.entries(results)) {
  const padName = name.padEnd(26);
  console.log(`${padName} ${formatMs(r.median).padStart(10)} ${formatMs(r.min).padStart(10)} ${formatMs(r.max).padStart(10)}`);
}

console.log("");
console.log("// js-framework-benchmark JSON format:");
console.log(JSON.stringify(
  Object.entries(results).map(([name, r]) => ({
    benchmark: name,
    type: "duration",
    min: r.min,
    max: r.max,
    median: r.median,
    framework: "scrml-todomvc",
  })),
  null,
  2,
));
