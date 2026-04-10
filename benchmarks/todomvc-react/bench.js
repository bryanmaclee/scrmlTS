#!/usr/bin/env bun
/**
 * React 19 TodoMVC runtime benchmark.
 *
 * Uses React's own rendering API (createRoot + flushSync) to measure DOM
 * operations in a happy-dom environment. This drives state changes through
 * React's actual reconciliation engine (virtual DOM diffing).
 *
 * Uses happy-dom GlobalRegistrator for DOM environment.
 * Outputs JSON to stdout.
 */

import { GlobalRegistrator } from "@happy-dom/global-registrator";

if (!globalThis.document) GlobalRegistrator.register();

import React, { useState, useRef, useImperativeHandle, forwardRef } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";

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
// React TodoMVC component with imperative handle for benchmarking
// ---------------------------------------------------------------------------

const BenchApp = forwardRef(function BenchApp(props, ref) {
  const [todos, setTodos] = useState([]);
  const [filter, setFilter] = useState("all");
  const nextIdRef = useRef(1);

  useImperativeHandle(ref, () => ({
    createRows(n) {
      const newTodos = [];
      for (let i = 0; i < n; i++) {
        newTodos.push({
          id: nextIdRef.current++,
          title: buildTitle(i),
          completed: false,
        });
      }
      setTodos(prev => [...prev, ...newTodos]);
    },
    clearRows() {
      setTodos([]);
    },
    updateEvery10th() {
      setTodos(prev => prev.map((t, i) =>
        i % 10 === 0 ? { ...t, title: t.title + " !!!" } : t
      ));
    },
    selectRow(idx) {
      setFilter(f => f); // Trigger minimal re-render
    },
    swapRows(a, b) {
      setTodos(prev => {
        const next = [...prev];
        if (next[a] && next[b]) {
          const tmp = next[a]; next[a] = next[b]; next[b] = tmp;
        }
        return next;
      });
    },
    removeRow(idx) {
      setTodos(prev => idx >= 0 && idx < prev.length
        ? prev.filter((_, i) => i !== idx)
        : prev
      );
    },
    deleteEvery10th() {
      setTodos(prev => prev.filter((_, i) => i % 10 !== 0));
    },
    reset() {
      setTodos([]);
      nextIdRef.current = 1;
    },
  }));

  const activeCount = todos.filter(t => !t.completed).length;
  const visibleTodos = filter === "active"
    ? todos.filter(t => !t.completed)
    : filter === "completed"
      ? todos.filter(t => t.completed)
      : todos;

  return React.createElement("div", { className: "todoapp" },
    React.createElement("header", { className: "header" },
      React.createElement("h1", null, "todos"),
    ),
    todos.length > 0 && React.createElement("section", { className: "main" },
      React.createElement("ul", { className: "todo-list" },
        visibleTodos.map(todo =>
          React.createElement("li", { key: todo.id, className: "todo-item" },
            React.createElement("div", { className: "view" },
              React.createElement("input", {
                className: "toggle", type: "checkbox",
                checked: todo.completed, onChange: () => {},
              }),
              React.createElement("label", null, todo.title),
              React.createElement("button", { className: "destroy" }),
            ),
          )
        ),
      ),
    ),
    todos.length > 0 && React.createElement("footer", { className: "footer" },
      React.createElement("span", { className: "todo-count" },
        React.createElement("strong", null, activeCount),
        activeCount === 1 ? " item left" : " items left",
      ),
    ),
  );
});

// ---------------------------------------------------------------------------
// Mount and run benchmarks
// ---------------------------------------------------------------------------

document.body.innerHTML = '<div id="root"></div>';
const root = createRoot(document.getElementById("root"));
const appRef = React.createRef();

flushSync(() => {
  root.render(React.createElement(BenchApp, { ref: appRef }));
});

const api = appRef.current;
if (!api) {
  console.log(JSON.stringify({ framework: "React 19", error: "Failed to mount app" }));
  process.exit(1);
}

const results = [];

results.push(bench("initial-render",
  () => {},
  () => {
    document.body.innerHTML = '<div id="root"></div>';
    const newRoot = createRoot(document.getElementById("root"));
    const newRef = React.createRef();
    flushSync(() => { newRoot.render(React.createElement(BenchApp, { ref: newRef })); });
  },
));

results.push(bench("create-1000",
  () => flushSync(() => api.reset()),
  () => flushSync(() => api.createRows(1000)),
));

results.push(bench("replace-1000",
  () => { flushSync(() => api.reset()); flushSync(() => api.createRows(1000)); },
  () => { flushSync(() => api.clearRows()); flushSync(() => api.createRows(1000)); },
));

results.push(bench("partial-update",
  () => { flushSync(() => api.reset()); flushSync(() => api.createRows(1000)); },
  () => flushSync(() => api.updateEvery10th()),
));

results.push(bench("delete-every-10th",
  () => { flushSync(() => api.reset()); flushSync(() => api.createRows(1000)); },
  () => flushSync(() => api.deleteEvery10th()),
));

results.push(bench("clear-all",
  () => { flushSync(() => api.reset()); flushSync(() => api.createRows(1000)); },
  () => flushSync(() => api.clearRows()),
));

results.push(bench("select-row",
  () => { flushSync(() => api.reset()); flushSync(() => api.createRows(1000)); },
  () => flushSync(() => api.selectRow(500)),
));

results.push(bench("swap-rows",
  () => { flushSync(() => api.reset()); flushSync(() => api.createRows(1000)); },
  () => flushSync(() => api.swapRows(1, 998)),
));

results.push(bench("remove-row",
  () => { flushSync(() => api.reset()); flushSync(() => api.createRows(1000)); },
  () => flushSync(() => api.removeRow(500)),
));

results.push(bench("create-10000",
  () => flushSync(() => api.reset()),
  () => flushSync(() => api.createRows(10000)),
  3,
));

results.push(bench("append-1000",
  () => { flushSync(() => api.reset()); flushSync(() => api.createRows(1000)); },
  () => flushSync(() => api.createRows(1000)),
));

console.log(JSON.stringify({ framework: "React 19", results }));
