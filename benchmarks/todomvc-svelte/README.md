# TodoMVC - Svelte 5 (Benchmark)

Minimal Svelte 5 TodoMVC for apples-to-apples comparison with scrml's TodoMVC.

## Features (matching scrml TodoMVC)

- Add todos (form submit)
- Toggle individual todo (checkbox)
- Toggle all (checkbox)
- Delete todo (button)
- Clear completed (button)
- Filter: All / Active / Completed
- Item count display
- localStorage persistence

## Build & Run

```bash
npm install
npm run build     # production build to dist/
npm run dev       # dev server
```

## Benchmark Metrics

| Metric | Value |
|--------|-------|
| Source lines (App.svelte only) | ~230 |
| Dependencies (direct) | 3 (svelte, vite, @sveltejs/vite-plugin-svelte) |
| Bundle size (minified+gzipped) | TBD (run `npm run build`, check `dist/assets/`) |

To measure gzipped bundle size after build:

```bash
npm run build
gzip -k dist/assets/*.js
ls -lh dist/assets/*.js.gz
```
