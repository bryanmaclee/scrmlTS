#!/usr/bin/env bun
/**
 * Svelte 5 TodoMVC runtime benchmark.
 *
 * Simulates Svelte's compiled output behavior: direct imperative DOM manipulation
 * with keyed reconciliation. This is what Svelte compiles down to — there is no
 * virtual DOM layer.
 *
 * Uses happy-dom GlobalRegistrator for DOM environment.
 * Outputs JSON to stdout.
 */

import { GlobalRegistrator } from "@happy-dom/global-registrator";

if (!globalThis.document) GlobalRegistrator.register();

// ---------------------------------------------------------------------------
// Benchmark utilities
// ---------------------------------------------------------------------------

const WARMUP = 2;
const ITERATIONS = 5;

function median(arr) {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function mean(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function buildTitle(i) {
  const adj = ["pretty","large","big","small","tall","short","long","handsome","plain","quaint","clean","elegant","easy","angry","crazy","helpful","mushy","odd","unsightly","adorable","important","inexpensive","cheap","expensive","fancy"];
  const col = ["red","yellow","blue","green","pink","brown","purple","brown","white","black","orange"];
  const noun = ["table","chair","house","bbq","desk","car","pony","cookie","sandwich","burger","pizza","mouse","keyboard"];
  return `${adj[i % adj.length]} ${col[i % col.length]} ${noun[i % noun.length]}`;
}

function p95(arr) {
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil(sorted.length * 0.95) - 1;
  return sorted[Math.min(idx, sorted.length - 1)];
}

function bench(name, setup, fn, iters = ITERATIONS) {
  for (let i = 0; i < WARMUP; i++) { setup(); fn(); }
  const times = [];
  for (let i = 0; i < iters; i++) {
    setup();
    const start = performance.now();
    fn();
    times.push(performance.now() - start);
  }
  return { benchmark: name, median: median(times), mean: mean(times), p95: p95(times), min: Math.min(...times), max: Math.max(...times) };
}

// ---------------------------------------------------------------------------
// Svelte-equivalent DOM operations
//
// Svelte compiles {#each todos as todo (todo.id)} into imperative keyed DOM
// reconciliation. This benchmark replicates that exact pattern: keyed list
// reconciliation with direct DOM node creation/removal/reordering.
// ---------------------------------------------------------------------------

let nextId = 1;
let todos = [];
let todoListEl = null;
let mainSection = null;
let footer = null;
let countEl = null;

function createDOM() {
  document.body.innerHTML = `
    <div class="todoapp">
      <header class="header"><h1>todos</h1></header>
      <section class="main" style="display:none">
        <ul class="todo-list"></ul>
      </section>
      <footer class="footer" style="display:none">
        <span class="todo-count"><strong>0</strong> items left</span>
      </footer>
    </div>
  `;
  todoListEl = document.querySelector(".todo-list");
  mainSection = document.querySelector(".main");
  footer = document.querySelector(".footer");
  countEl = document.querySelector(".todo-count strong");
}

/**
 * Keyed reconciliation — equivalent to Svelte's compiled {#each} output.
 * This uses the same keyed diffing algorithm Svelte generates.
 */
function syncDOM() {
  // Update section visibility (Svelte {#if} equivalent)
  if (todos.length > 0) {
    mainSection.style.display = "";
    footer.style.display = "";
  } else {
    mainSection.style.display = "none";
    footer.style.display = "none";
  }

  // Keyed list reconciliation
  const existingNodes = new Map();
  for (const child of [...todoListEl.children]) {
    existingNodes.set(child._key, child);
  }

  const newIds = new Set(todos.map(t => t.id));

  // Remove deleted nodes
  for (const [id, node] of existingNodes) {
    if (!newIds.has(id)) {
      todoListEl.removeChild(node);
    }
  }

  // Add/reorder/update nodes
  let prevNode = null;
  for (let i = 0; i < todos.length; i++) {
    const todo = todos[i];
    let node = existingNodes.get(todo.id);

    if (!node) {
      // Create new node (Svelte's create_fragment equivalent)
      node = document.createElement("li");
      node.className = "todo-item";
      node._key = todo.id;

      const view = document.createElement("div");
      view.className = "view";

      const toggle = document.createElement("input");
      toggle.className = "toggle";
      toggle.type = "checkbox";
      toggle.checked = todo.completed;

      const label = document.createElement("label");
      label.textContent = todo.title;

      const destroy = document.createElement("button");
      destroy.className = "destroy";

      view.appendChild(toggle);
      view.appendChild(label);
      view.appendChild(destroy);
      node.appendChild(view);
    } else {
      // Update existing node (Svelte's update equivalent)
      const label = node.querySelector("label");
      if (label.textContent !== todo.title) label.textContent = todo.title;
      const toggle = node.querySelector(".toggle");
      if (toggle.checked !== todo.completed) toggle.checked = todo.completed;
    }

    // Position: insert after previous node, or at start
    const nextSibling = prevNode ? prevNode.nextSibling : todoListEl.firstChild;
    if (node !== nextSibling) {
      todoListEl.insertBefore(node, nextSibling);
    }
    prevNode = node;
  }

  // Update count
  const activeCount = todos.filter(t => !t.completed).length;
  countEl.textContent = String(activeCount);
}

// ---------------------------------------------------------------------------
// Operations
// ---------------------------------------------------------------------------

function resetApp() {
  todos = [];
  nextId = 1;
  createDOM();
  syncDOM();
}

function createRowsOp(n) {
  const newTodos = [];
  for (let i = 0; i < n; i++) {
    newTodos.push({ id: nextId++, title: buildTitle(i), completed: false });
  }
  todos = [...todos, ...newTodos];
  syncDOM();
}

function clearRowsOp() {
  todos = [];
  syncDOM();
}

function updateEvery10thOp() {
  todos = todos.map((t, i) =>
    i % 10 === 0 ? { ...t, title: t.title + " !!!" } : t
  );
  syncDOM();
}

function selectRowOp(idx) {
  // Svelte would add a 'selected' class via class: directive
  if (todos[idx]) {
    const nodes = todoListEl.children;
    if (nodes[idx]) nodes[idx].className = "todo-item selected";
  }
}

function swapRowsOp(a, b) {
  if (todos[a] && todos[b]) {
    const next = [...todos];
    const tmp = next[a]; next[a] = next[b]; next[b] = tmp;
    todos = next;
    syncDOM();
  }
}

function removeRowOp(idx) {
  if (idx >= 0 && idx < todos.length) {
    todos = todos.filter((_, i) => i !== idx);
    syncDOM();
  }
}

function deleteEvery10thOp() {
  todos = todos.filter((_, i) => i % 10 !== 0);
  syncDOM();
}

// ---------------------------------------------------------------------------
// Run benchmarks
// ---------------------------------------------------------------------------

createDOM();

const results = [];

results.push(bench("initial-render", () => {}, () => { createDOM(); syncDOM(); }));
results.push(bench("create-1000", () => resetApp(), () => createRowsOp(1000)));
results.push(bench("replace-1000", () => { resetApp(); createRowsOp(1000); }, () => { clearRowsOp(); createRowsOp(1000); }));
results.push(bench("partial-update", () => { resetApp(); createRowsOp(1000); }, () => updateEvery10thOp()));
results.push(bench("delete-every-10th", () => { resetApp(); createRowsOp(1000); }, () => deleteEvery10thOp()));
results.push(bench("clear-all", () => { resetApp(); createRowsOp(1000); }, () => clearRowsOp()));
results.push(bench("select-row", () => { resetApp(); createRowsOp(1000); }, () => selectRowOp(500)));
results.push(bench("swap-rows", () => { resetApp(); createRowsOp(1000); }, () => swapRowsOp(1, 998)));
results.push(bench("remove-row", () => { resetApp(); createRowsOp(1000); }, () => removeRowOp(500)));
results.push(bench("create-10000", () => resetApp(), () => createRowsOp(10000), 3));
results.push(bench("append-1000", () => { resetApp(); createRowsOp(1000); }, () => createRowsOp(1000)));

console.log(JSON.stringify({ framework: "Svelte 5", results }));
