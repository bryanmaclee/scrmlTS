# TodoMVC - React (Benchmark)

Minimal React TodoMVC for apples-to-apples comparison with scrml's TodoMVC.

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
npm run build      # production build → dist/
npm run dev        # dev server
```

## Benchmark Metrics

| Metric | Value |
|--------|-------|
| Source lines (App.jsx only) | ~120 |
| Config/boilerplate files | 4 (package.json, index.html, main.jsx, app.css) |
| Dependencies (runtime) | 2 (react, react-dom) |
| Dependencies (dev) | 2 (vite, @vitejs/plugin-react) |
| Bundle size (minified+gzip) | _run `npm run build` and check dist/_ |

### How to measure bundle size

```bash
npm run build
# Vite prints asset sizes. For gzipped:
gzip -k dist/assets/*.js
ls -lh dist/assets/*.js.gz
```

## Comparison notes

- The scrml TodoMVC is a single 417-line file (markup + logic + styles).
- This React version splits into App.jsx (~120 lines of component code) + app.css (identical styles) + 3 config files.
- React requires explicit event handler wiring (`onChange`, `onSubmit`), JSX className, and `useEffect` for persistence. scrml uses `bind:value`, `@reactive`, and `#{}` inline styles.
