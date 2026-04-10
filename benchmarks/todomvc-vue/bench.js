#!/usr/bin/env bun
/**
 * Vue 3 TodoMVC runtime benchmark.
 *
 * Uses Vue's createApp + nextTick to drive state changes through Vue's
 * reactivity system and DOM patching in a happy-dom environment.
 *
 * Outputs JSON to stdout.
 */

import { GlobalRegistrator } from "@happy-dom/global-registrator";

// Must register before Vue imports, since Vue caches document at module load
GlobalRegistrator.register();

const { createApp, ref, computed, nextTick, h } = await import("vue");

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

async function bench(name, setup, fn, iters = ITERATIONS) {
  for (let i = 0; i < WARMUP; i++) { await setup(); await fn(); }
  const times = [];
  for (let i = 0; i < iters; i++) {
    await setup();
    const start = performance.now();
    await fn();
    times.push(performance.now() - start);
  }
  return { benchmark: name, median: median(times), mean: mean(times), p95: p95(times), min: Math.min(...times), max: Math.max(...times) };
}

// ---------------------------------------------------------------------------
// Vue App with exposed API for benchmarking
// ---------------------------------------------------------------------------

let app = null;
let appInstance = null;

function mountApp() {
  if (app) {
    app.unmount();
  }
  document.body.innerHTML = '<div id="app"></div>';

  let exposedApi = null;

  app = createApp({
    setup() {
      const todos = ref([]);
      const filter = ref("all");
      let nextId = 1;

      const activeCount = computed(() => todos.value.filter(t => !t.completed).length);
      const visibleTodos = computed(() => {
        if (filter.value === "active") return todos.value.filter(t => !t.completed);
        if (filter.value === "completed") return todos.value.filter(t => t.completed);
        return todos.value;
      });

      const api = {
        createRows(n) {
          const newTodos = [];
          for (let i = 0; i < n; i++) {
            newTodos.push({ id: nextId++, title: buildTitle(i), completed: false });
          }
          todos.value = [...todos.value, ...newTodos];
        },
        clearRows() {
          todos.value = [];
        },
        updateEvery10th() {
          todos.value = todos.value.map((t, i) =>
            i % 10 === 0 ? { ...t, title: t.title + " !!!" } : t
          );
        },
        selectRow(idx) {
          filter.value = filter.value; // trigger minimal re-render
        },
        swapRows(a, b) {
          const next = [...todos.value];
          if (next[a] && next[b]) {
            const tmp = next[a]; next[a] = next[b]; next[b] = tmp;
            todos.value = next;
          }
        },
        removeRow(idx) {
          if (idx >= 0 && idx < todos.value.length) {
            todos.value = todos.value.filter((_, i) => i !== idx);
          }
        },
        deleteEvery10th() {
          todos.value = todos.value.filter((_, i) => i % 10 !== 0);
        },
        reset() {
          todos.value = [];
          nextId = 1;
        },
      };

      exposedApi = api;

      return { todos, filter, visibleTodos, activeCount };
    },
    render() {
      const todos = this.visibleTodos;
      const activeCount = this.activeCount;

      return h("div", { class: "todoapp" }, [
        h("header", { class: "header" }, [h("h1", "todos")]),
        this.todos.length > 0 ? h("section", { class: "main" }, [
          h("ul", { class: "todo-list" },
            todos.map(todo =>
              h("li", { key: todo.id, class: "todo-item" }, [
                h("div", { class: "view" }, [
                  h("input", { class: "toggle", type: "checkbox", checked: todo.completed }),
                  h("label", todo.title),
                  h("button", { class: "destroy" }),
                ]),
              ])
            )
          ),
        ]) : null,
        this.todos.length > 0 ? h("footer", { class: "footer" }, [
          h("span", { class: "todo-count" }, [
            h("strong", String(activeCount)),
            activeCount === 1 ? " item left" : " items left",
          ]),
        ]) : null,
      ]);
    },
  });

  app.mount("#app");
  appInstance = exposedApi;
}

// ---------------------------------------------------------------------------
// Async wrappers that flush Vue's DOM updates
// ---------------------------------------------------------------------------

async function resetApp() {
  mountApp();
  await nextTick();
}

async function createRowsAndFlush(n) {
  appInstance.createRows(n);
  await nextTick();
}

async function clearRowsAndFlush() {
  appInstance.clearRows();
  await nextTick();
}

async function updateEvery10thAndFlush() {
  appInstance.updateEvery10th();
  await nextTick();
}

async function selectRowAndFlush(idx) {
  appInstance.selectRow(idx);
  await nextTick();
}

async function swapRowsAndFlush(a, b) {
  appInstance.swapRows(a, b);
  await nextTick();
}

async function removeRowAndFlush(idx) {
  appInstance.removeRow(idx);
  await nextTick();
}

async function deleteEvery10thAndFlush() {
  appInstance.deleteEvery10th();
  await nextTick();
}

// ---------------------------------------------------------------------------
// Run benchmarks
// ---------------------------------------------------------------------------

mountApp();
await nextTick();

const results = [];

results.push(await bench("initial-render",
  async () => {},
  async () => { await resetApp(); },
));

results.push(await bench("create-1000",
  async () => { await resetApp(); },
  async () => { await createRowsAndFlush(1000); },
));

results.push(await bench("replace-1000",
  async () => { await resetApp(); await createRowsAndFlush(1000); },
  async () => { await clearRowsAndFlush(); await createRowsAndFlush(1000); },
));

results.push(await bench("partial-update",
  async () => { await resetApp(); await createRowsAndFlush(1000); },
  async () => { await updateEvery10thAndFlush(); },
));

results.push(await bench("delete-every-10th",
  async () => { await resetApp(); await createRowsAndFlush(1000); },
  async () => { await deleteEvery10thAndFlush(); },
));

results.push(await bench("clear-all",
  async () => { await resetApp(); await createRowsAndFlush(1000); },
  async () => { await clearRowsAndFlush(); },
));

results.push(await bench("select-row",
  async () => { await resetApp(); await createRowsAndFlush(1000); },
  async () => { await selectRowAndFlush(500); },
));

results.push(await bench("swap-rows",
  async () => { await resetApp(); await createRowsAndFlush(1000); },
  async () => { await swapRowsAndFlush(1, 998); },
));

results.push(await bench("remove-row",
  async () => { await resetApp(); await createRowsAndFlush(1000); },
  async () => { await removeRowAndFlush(500); },
));

results.push(await bench("create-10000",
  async () => { await resetApp(); },
  async () => { await createRowsAndFlush(10000); },
  3,
));

results.push(await bench("append-1000",
  async () => { await resetApp(); await createRowsAndFlush(1000); },
  async () => { await createRowsAndFlush(1000); },
));

console.log(JSON.stringify({ framework: "Vue 3", results }));
