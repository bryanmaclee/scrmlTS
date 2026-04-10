# TodoMVC Benchmark Results — 2026-04-05

## Runtime Performance — Real Browser (headless Chrome, medians in ms)

All four frameworks measured in headless Chrome via Puppeteer. Each framework's
production build is served locally, state manipulation via exposed `__bench` API,
timing with `performance.now()` + forced layout (`offsetHeight`). Lower is better.

| Operation | scrml | React 19 | Svelte 5 | Vue 3 | Best |
|---|---|---|---|---|---|
| create-1000 | 19.3 | **18.4** | 26.5 | 23.4 | React |
| replace-1000 | 20.5 | **19.7** | 28.4 | 24.4 | React |
| partial-update | **0.4** | 3.3 | 2.9 | 9.4 | **scrml** |
| delete-every-10th | **1.4** | 3.1 | 2.1 | 6.5 | **scrml** |
| clear-all | 2.7 | 2.4 | **1.9** | 2.6 | Svelte |
| select-row | **0.0** | 0.3 | 0.0 | 0.0 | **scrml** |
| swap-rows | **1.3** | 17.7 | 2.2 | 6.1 | **scrml** |
| remove-row | **1.1** | 2.7 | 2.1 | 6.6 | **scrml** |
| create-10000 | 201.6 | **183.6** | 532.1 | 230.8 | React |
| append-1000 | **19.1** | 20.3 | 34.1 | 28.0 | **scrml** |

**scrml wins: 5/10** — partial-update, delete-every-10th, select-row, swap-rows, remove-row, append-1000
**React wins: 3/10** — create-1000, replace-1000, create-10000
**Svelte wins: 1/10** — clear-all
**Vue wins: 0/10**

### Key findings

- scrml dominates fine-grained updates — partial-update is 8x faster than React, swap-rows is 14x faster
- React narrowly wins bulk creation (5% faster on create-1000) — VDOM batching helps for large inserts
- Svelte is surprisingly slow in real Chrome — `tick()` async flush adds 26ms to create-1000 (vs 0.3ms when unmeasured)
- Vue's `nextTick()` batching adds significant latency to every operation
- scrml's LIS reconciler makes swap-rows 14x faster than React's VDOM diffing
- scrml wins append-1000 — the only framework faster than React at bulk operations

### happy-dom vs real Chrome

The happy-dom results (below) differ significantly from real Chrome. Key differences:
- Svelte/Vue appeared faster in happy-dom because their async rendering wasn't being flushed
- happy-dom's `cloneNode(true)` and `innerHTML` are slower than `createElement` (opposite of real browsers)
- Chrome is 1.2-2x faster than happy-dom at DOM creation

## Runtime Performance — happy-dom (medians in ms)

Included for reference. These numbers are less reliable than the Chrome results above.

| Operation | scrml | React 19 | Svelte 5 | Vue 3 |
|---|---|---|---|---|
| create-1000 | 26.1 | 42.6 | 18.2 | 33.4 |
| replace-1000 | 28.5 | 39.8 | 23.2 | 32.8 |
| partial-update | 0.7 | 20.1 | 9.4 | 2.5 |
| delete-every-10th | 1.4 | 16.7 | 8.6 | 2.5 |
| clear-all | 5.3 | 3.0 | 5.4 | 3.9 |
| select-row | 0.0 | 2.9 | 0.0 | 0.0 |
| swap-rows | 0.8 | 27.1 | 14.3 | 2.0 |
| remove-row | 0.8 | 18.0 | 8.6 | 1.9 |
| create-10000 | 249 | 430 | 218 | 295 |
| append-1000 | 27.4 | 45.5 | 22.5 | 26.5 |

## Bundle Size (gzipped)

| Framework | JS (gzip) | CSS (gzip) | Total (gzip) | Raw JS | Dependencies | node_modules |
|---|---|---|---|---|---|---|
| **scrml** | **13.4 KB** | 1.1 KB | **14.5 KB** | 55 KB | **0** | **0 bytes** |
| Svelte 5 | 15.9 KB | 1.1 KB | 17.0 KB | 41 KB | 41 | 29 MB |
| Vue 3 | 26.8 KB | 1.1 KB | 27.9 KB | 67 KB | ~30 | ~25 MB |
| React 19 | 62.2 KB | 1.1 KB | 63.3 KB | 198 KB | 65 | 46 MB |

scrml is the smallest gzipped JS (1.2x smaller than Svelte, 2x smaller than Vue, 4.6x smaller than React).

## Build Performance — TodoMVC (10 runs, median)

| Framework | Build Tool | Build Time | vs scrml |
|---|---|---|---|
| **scrml** | Built-in compiler | **30.9 ms** | — |
| Svelte 5 | Vite 6.4 | 330 ms | 10.7x slower |
| Vue 3 | Vite 6.4 | 359 ms | 11.6x slower |
| React 19 | Vite 6.4 | 473 ms | 15.3x slower |

## Build Performance — Full-Stack Comparison (contact form app)

Identical app (form with validation, data display, filtering, styling).
scrml vs the typical React production stack.

| Stack | Build Time | JS (gzip) | CSS (gzip) | Dependencies |
|---|---|---|---|---|
| **scrml** | **26 ms** | **14.5 KB** | 0.9 KB | **0** |
| React + TS + Tailwind + Zod | 102 ms | 75.8 KB | 3.2 KB | ~100+ |

scrml is **3.9x faster** to build and produces **5.2x smaller JS output** with **zero dependencies**.

The React stack requires TypeScript (type checking), Vite (bundling), Tailwind (CSS utility compilation),
and Zod (runtime validation). scrml handles types, styling, and validation as built-in language features.

## Source Lines of Code

| Framework | Total | Without CSS |
|---|---|---|
| React 19 (App.jsx) | 161 | 161 |
| scrml (app.scrml) | 417 | ~187 |
| Svelte 5 (App.svelte) | 384 | ~230 |

## Feature Parity

All TodoMVC implementations cover the same features:
- Add, toggle, delete, clear completed, toggle all
- Filter: All / Active / Completed
- Item count display, localStorage persistence

## Methodology

- Same CSS across all TodoMVC implementations (TodoMVC standard styles)
- React/Svelte/Vue built with Vite 6.4 in production mode
- scrml compiled with `bun compiler/src/index.js`
- Browser benchmarks: Puppeteer + headless Chrome, 5 warmup + 10 iterations, median reported
- happy-dom benchmarks: Bun runtime, 3 warmup + 10 iterations, median reported
- Build times: 10 consecutive runs, median reported
- Gzip sizes measured with `gzip -c | wc -c`
- Framework state manipulation via exposed `window.__bench` API with synchronous flush
  (React: `flushSync`, Svelte: `tick()`, Vue: `nextTick()`, scrml: synchronous by default)

## Notes

- scrml has zero runtime dependencies — the runtime is compiler-generated
- React's 198 KB includes React DOM (the virtual DOM diffing engine)
- Svelte 5 compiles away the framework but still includes a runtime (~15 KB)
- Vue 3 uses a Proxy-based reactivity system similar to scrml's
- scrml's reconciler uses LIS (Longest Increasing Subsequence) diffing to minimize DOM moves
- The full-stack comparison (React+TS+Tailwind+Zod) represents a typical modern React project setup
